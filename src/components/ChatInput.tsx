import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowUp,
  FileText,
  Image as ImageIcon,
  Loader2,
  Mic,
  Square,
  X,
} from 'lucide-react';
import type { UIStrings } from '../i18n/translations';
import type { ChatAttachment } from '../types/chat';

interface ChatInputProps {
  strings: UIStrings;
  isGenerating: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  recordingSeconds: number;
  onStartStopVoice: (onTranscript: (text: string) => void) => void;
  onSend: (text: string, attachments: ChatAttachment[]) => void;
  onStopGenerating: () => void;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // Pre-compression input cap
const MAX_DOC_BYTES = 4 * 1024 * 1024; // 4 MB limit compatible with Vercel Free serverless

function readFileAsBase64(file: File): Promise<{ base64: string; dataUrl: string; mimeType: string; sizeBytes: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const img = new Image();
      img.onload = () => {
        const maxDim = 1600;
        const needsResize = img.width > maxDim || img.height > maxDim || file.size > 1_200_000;
        if (!needsResize || file.type === 'image/gif') {
          const commaIdx = result.indexOf(',');
          resolve({
            dataUrl: result,
            base64: commaIdx >= 0 ? result.slice(commaIdx + 1) : result,
            mimeType: file.type,
            sizeBytes: file.size,
          });
          return;
        }
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const commaIdx = result.indexOf(',');
          resolve({
            dataUrl: result,
            base64: commaIdx >= 0 ? result.slice(commaIdx + 1) : result,
            mimeType: file.type,
            sizeBytes: file.size,
          });
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedUrl = canvas.toDataURL('image/jpeg', 0.85);
        const commaIdx = compressedUrl.indexOf(',');
        const base64 = commaIdx >= 0 ? compressedUrl.slice(commaIdx + 1) : compressedUrl;
        resolve({
          dataUrl: compressedUrl,
          base64,
          mimeType: 'image/jpeg',
          sizeBytes: Math.round((base64.length * 3) / 4),
        });
      };
      img.onerror = () => reject(new Error('Failed to decode image file.'));
      img.src = result;
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

export const ChatInput: React.FC<ChatInputProps> = ({
  strings,
  isGenerating,
  isRecording,
  isTranscribing,
  recordingSeconds,
  onStartStopVoice,
  onSend,
  onStopGenerating,
}) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WEBP, GIF).');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError('Image exceeds the 10 MB size limit.');
      return;
    }

    try {
      const { base64, dataUrl, mimeType, sizeBytes } = await readFileAsBase64(file);
      const attachment: ChatAttachment = {
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'image',
        name: file.name,
        mimeType,
        sizeBytes,
        previewUrl: dataUrl,
        data: base64,
      };
      setAttachments((prev) => [...prev.slice(0, 4), attachment]);
    } catch {
      setUploadError('Unable to read the selected image.');
    }
  };

  const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadError(null);
    if (file.size > MAX_DOC_BYTES) {
      setUploadError('Document exceeds the 4 MB size limit.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploadProgress(10);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload-document');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const pct = Math.min(85, Math.round((event.loaded / event.total) * 85));
        setUploadProgress(pct);
      }
    };

    xhr.onload = () => {
      setUploadProgress(null);
      try {
        const data = JSON.parse(xhr.responseText || '{}');
        if (xhr.status < 200 || xhr.status >= 300) {
          setUploadError(data.error || 'Document extraction failed.');
          return;
        }
        const attachment: ChatAttachment = {
          id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: 'document',
          name: data.name || file.name,
          mimeType: data.mimeType || file.type || 'text/plain',
          sizeBytes: file.size,
          extractedText: data.extractedText || '',
          pageCount: data.pageCount,
          charCount: data.charCount,
          isScannedPdf: Boolean(data.isScannedPdf),
          data: data.base64Data,
        };
        setAttachments((prev) => [...prev.slice(0, 4), attachment]);
      } catch {
        setUploadError('Unexpected response while processing document.');
      }
    };

    xhr.onerror = () => {
      setUploadProgress(null);
      setUploadError('Network error while uploading document.');
    };

    xhr.send(formData);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = () => {
    if (isGenerating || uploadProgress !== null) return;
    if (!text.trim() && attachments.length === 0) return;

    onSend(text.trim(), attachments);
    setText('');
    setAttachments([]);
    setUploadError(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleVoiceClick = () => {
    onStartStopVoice((transcript) => {
      setText((prev) => {
        const next = prev ? `${prev.trim()} ${transcript}` : transcript;
        return next;
      });
      window.setTimeout(adjustHeight, 0);
    });
  };

  const canSend = (text.trim().length > 0 || attachments.length > 0) && uploadProgress === null;

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-6 pb-3 sm:pb-5 pt-2">
      {uploadError && (
        <div className="mb-2.5 flex items-center justify-between gap-2 rounded-xl border border-red-300 dark:border-red-900/70 bg-red-50 dark:bg-red-950/35 px-3.5 py-2 text-xs text-red-800 dark:text-red-200">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="truncate">{uploadError}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="p-1 hover:opacity-75"
            aria-label="Dismiss error"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {uploadProgress !== null && (
        <div className="mb-2.5 rounded-xl border border-stone-200 dark:border-emerald-950/70 bg-white dark:bg-[#121814] px-3.5 py-2.5">
          <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-300 mb-1.5">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
              Extracting document content...
            </span>
            <span className="font-mono tabular-nums">{uploadProgress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
            <div
              className="h-full bg-emerald-600 dark:bg-emerald-400 transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="relative flex items-center gap-2.5 rounded-xl border border-stone-200 dark:border-emerald-950/70 bg-white dark:bg-[#141B17] p-2 pr-8 shadow-sm"
            >
              {att.type === 'image' && att.previewUrl ? (
                <img
                  src={att.previewUrl}
                  alt={att.name}
                  className="h-11 w-11 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0 max-w-[170px]">
                <p className="truncate text-xs font-medium text-stone-900 dark:text-stone-100">
                  {att.name}
                </p>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 font-mono tabular-nums">
                  {att.type === 'image'
                    ? `${Math.max(1, Math.round(att.sizeBytes / 1024))} KB`
                    : att.isScannedPdf
                      ? `PDF · ${att.pageCount ?? 1}p (visual)`
                      : `${att.pageCount ?? 1}p · ${Math.round((att.charCount ?? 0) / 100) / 10}k chars`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeAttachment(att.id)}
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200"
                aria-label={`Remove ${att.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {(isRecording || isTranscribing) && (
        <div className="mb-2 flex items-center justify-between rounded-xl border border-emerald-600/30 bg-emerald-700/10 dark:bg-emerald-500/15 px-3.5 py-2 text-xs text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            {isTranscribing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{strings.transcribing}</span>
              </>
            ) : (
              <>
                <Mic className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>Listening...</span>
                <span className="font-mono tabular-nums">
                  0:{String(recordingSeconds).padStart(2, '0')}
                </span>
              </>
            )}
          </div>
          {isRecording && (
            <button
              type="button"
              onClick={handleVoiceClick}
              className="font-medium underline underline-offset-2"
            >
              {strings.stopVoice}
            </button>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-stone-200 dark:border-emerald-950/80 bg-white dark:bg-[#121815] shadow-sm focus-within:border-emerald-700 dark:focus-within:border-emerald-500/70 transition-colors">
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            adjustHeight();
          }}
          onKeyDown={handleKeyDown}
          placeholder={strings.inputPlaceholder}
          className="w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-[15px] text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none max-h-[168px]"
        />

        <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5 pt-1">
          <div className="flex items-center gap-1">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleImageSelect}
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              title={strings.attachImage}
              aria-label={strings.attachImage}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-emerald-950/50 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
            >
              <ImageIcon className="h-5 w-5" />
            </button>

            <input
              ref={docInputRef}
              type="file"
              accept=".pdf,.txt,.md,.csv,.json,application/pdf,text/plain"
              className="hidden"
              onChange={handleDocumentSelect}
            />
            <button
              type="button"
              onClick={() => docInputRef.current?.click()}
              title={strings.attachDocument}
              aria-label={strings.attachDocument}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-emerald-950/50 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
            >
              <FileText className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={handleVoiceClick}
              disabled={isTranscribing}
              title={isRecording ? strings.stopVoice : strings.voiceInput}
              aria-label={isRecording ? strings.stopVoice : strings.voiceInput}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-colors ${
                isRecording
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                  : 'text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-emerald-950/50 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              {isTranscribing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isRecording ? (
                <Square className="h-4 w-4 fill-current" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </button>
          </div>

          {isGenerating ? (
            <button
              type="button"
              onClick={onStopGenerating}
              title={strings.stopGenerating}
              aria-label={strings.stopGenerating}
              className="min-h-[44px] px-4 inline-flex items-center gap-2 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-semibold hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              <span>{strings.stopGenerating}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSend}
              title={strings.send}
              aria-label={strings.send}
              className={`min-h-[44px] min-w-[44px] px-3.5 inline-flex items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                canSend
                  ? 'bg-emerald-800 dark:bg-emerald-600 text-white hover:bg-emerald-900 dark:hover:bg-emerald-500 shadow-sm'
                  : 'bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed'
              }`}
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
