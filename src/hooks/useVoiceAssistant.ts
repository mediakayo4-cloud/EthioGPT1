import { useCallback, useEffect, useRef, useState } from 'react';
import { LANGUAGES } from '../i18n/translations';
import type { LanguageCode, VoiceMode } from '../types/chat';

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

function stripMarkdownForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' code block omitted ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~|-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function useVoiceAssistant(language: LanguageCode, voiceMode: VoiceMode) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isLoadingSpeech, setIsLoadingSpeech] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopRecording = useCallback(() => {
    clearTimer();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore stop errors
      }
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsRecording(false);
    setRecordingSeconds(0);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.src = '';
      audioPlayerRef.current = null;
    }
    setSpeakingMessageId(null);
    setIsLoadingSpeech(false);
  }, []);

  useEffect(() => {
    return () => {
      stopRecording();
      stopSpeaking();
    };
  }, [stopRecording, stopSpeaking]);

  const startVoiceInput = useCallback(
    async (onTranscript: (text: string) => void) => {
      setVoiceNotice(null);

      if (isRecording) {
        stopRecording();
        return;
      }

      const langConfig = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[3];
      const SpeechCtor = getSpeechRecognitionCtor();

      // Web Speech API supports English reliably; for Afaan Oromo/Amharic/Tigrinya/Somali or browsers without SpeechRecognition,
      // MediaRecorder + Gemini transcription gives far superior accuracy!
      const preferBrowserSpeech =
        voiceMode === 'browser' || (voiceMode === 'auto' && language === 'en' && Boolean(SpeechCtor));

      if (preferBrowserSpeech && SpeechCtor) {
        try {
          const recognition = new SpeechCtor();
          recognition.lang = langConfig.bcp47;
          recognition.interimResults = false;
          recognition.continuous = false;

          recognition.onresult = (event) => {
            const transcripts: string[] = [];
            for (let i = 0; i < event.results.length; i++) {
              transcripts.push(event.results[i][0]?.transcript ?? '');
            }
            const joined = transcripts.join(' ').trim();
            if (joined) {
              onTranscript(joined);
            }
          };

          recognition.onerror = (event) => {
            if (event.error === 'language-not-supported') {
              setVoiceNotice(
                `Browser speech recognition does not support ${langConfig.name} directly. Switching to AI audio transcription.`
              );
            } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
              setVoiceNotice(`Microphone error: ${event.error}`);
            }
            stopRecording();
          };

          recognition.onend = () => {
            clearTimer();
            setIsRecording(false);
            setRecordingSeconds(0);
          };

          recognitionRef.current = recognition;
          setIsRecording(true);
          setRecordingSeconds(0);
          timerRef.current = window.setInterval(() => {
            setRecordingSeconds((s) => s + 1);
          }, 1000);
          recognition.start();
          return;
        } catch {
          // Fall through to MediaRecorder
        }
      }

      // Fallback or AI Voice mode: MediaRecorder -> /api/transcribe
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        setVoiceNotice(
          `Voice input is not supported in this browser for ${langConfig.name}. Please type your message.`
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : '';
        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = async () => {
          stream.getTracks().forEach((track) => track.stop());
          clearTimer();
          setIsRecording(false);
          setRecordingSeconds(0);

          const blob = new Blob(audioChunksRef.current, {
            type: recorder.mimeType || 'audio/webm',
          });
          if (blob.size < 400) {
            return;
          }

          setIsTranscribing(true);
          try {
            const formData = new FormData();
            formData.append('audio', blob, 'recording.webm');
            formData.append('language', language);
            const res = await fetch('/api/transcribe', {
              method: 'POST',
              body: formData,
            });
            const data = await res.json();
            if (!res.ok) {
              setVoiceNotice(data.error || 'Could not transcribe voice recording.');
            } else if (data.text) {
              onTranscript(data.text);
            } else {
              setVoiceNotice('No speech was detected in the recording.');
            }
          } catch {
            setVoiceNotice('Network error while transcribing voice recording.');
          } finally {
            setIsTranscribing(false);
          }
        };

        mediaRecorderRef.current = recorder;
        setIsRecording(true);
        setRecordingSeconds(0);
        timerRef.current = window.setInterval(() => {
          setRecordingSeconds((s) => s + 1);
        }, 1000);
        recorder.start();
      } catch {
        setVoiceNotice('Microphone access was denied. Enable microphone permission to use voice input.');
      }
    },
    [isRecording, language, stopRecording, voiceMode]
  );

  const speakMessage = useCallback(
    async (messageId: string, rawText: string) => {
      setVoiceNotice(null);

      if (speakingMessageId === messageId) {
        stopSpeaking();
        return;
      }

      stopSpeaking();
      const cleanText = stripMarkdownForSpeech(rawText);
      if (!cleanText) return;

      const langConfig = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[3];
      const hasSpeechSynth = typeof window !== 'undefined' && 'speechSynthesis' in window;
      const voices = hasSpeechSynth ? window.speechSynthesis.getVoices() : [];
      const prefix = langConfig.bcp47.split('-')[0].toLowerCase();
      const matchingVoice = voices.find((v) => v.lang.toLowerCase().startsWith(prefix));

      const useBrowserTTS =
        hasSpeechSynth &&
        (voiceMode === 'browser' || (voiceMode === 'auto' && Boolean(matchingVoice)));

      if (useBrowserTTS) {
        try {
          const utterance = new SpeechSynthesisUtterance(cleanText.slice(0, 3000));
          utterance.lang = matchingVoice?.lang || langConfig.bcp47;
          if (matchingVoice) {
            utterance.voice = matchingVoice;
          }
          utterance.onend = () => setSpeakingMessageId(null);
          utterance.onerror = () => {
            setSpeakingMessageId(null);
            setVoiceNotice(
              `Device speech synthesis could not read ${langConfig.name} aloud.`
            );
          };
          setSpeakingMessageId(messageId);
          window.speechSynthesis.speak(utterance);
          return;
        } catch {
          setSpeakingMessageId(null);
        }
      }

      // Fallback to AI TTS via Gemini when browser lacks an Ethiopian language voice
      setIsLoadingSpeech(true);
      setSpeakingMessageId(messageId);
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: cleanText.slice(0, 2000), language }),
        });
        const data = await res.json();
        if (!res.ok || !data.audioBase64) {
          if (hasSpeechSynth) {
            const fallbackUtterance = new SpeechSynthesisUtterance(cleanText.slice(0, 3000));
            fallbackUtterance.lang = langConfig.bcp47;
            fallbackUtterance.onend = () => setSpeakingMessageId(null);
            fallbackUtterance.onerror = () => setSpeakingMessageId(null);
            window.speechSynthesis.speak(fallbackUtterance);
            setVoiceNotice(
              `AI voice is unavailable; reading with device speech (${langConfig.name} voice support depends on your device).`
            );
            return;
          }
          setVoiceNotice(
            data.error ||
              `Text-to-speech for ${langConfig.name} is unavailable on this device right now.`
          );
          setSpeakingMessageId(null);
          return;
        }

        const audio = new Audio(`data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`);
        audioPlayerRef.current = audio;
        audio.onended = () => {
          setSpeakingMessageId(null);
          audioPlayerRef.current = null;
        };
        audio.onerror = () => {
          setSpeakingMessageId(null);
          audioPlayerRef.current = null;
          setVoiceNotice('Could not play generated voice audio.');
        };
        await audio.play();
      } catch {
        setSpeakingMessageId(null);
        setVoiceNotice(
          `Voice playback is unavailable for ${langConfig.name} right now.`
        );
      } finally {
        setIsLoadingSpeech(false);
      }
    },
    [language, speakingMessageId, stopSpeaking, voiceMode]
  );

  return {
    isRecording,
    isTranscribing,
    recordingSeconds,
    speakingMessageId,
    isLoadingSpeech,
    voiceNotice,
    clearVoiceNotice: () => setVoiceNotice(null),
    startVoiceInput,
    stopRecording,
    speakMessage,
    stopSpeaking,
  };
}
