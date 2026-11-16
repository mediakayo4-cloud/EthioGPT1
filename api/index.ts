import { GoogleGenAI } from '@google/genai';
import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';

export type SupportedLanguage = 'om' | 'am' | 'ti' | 'en' | 'so';

const DEFAULT_CHAT_MODEL = process.env.GEMINI_MODEL || 'gemini-4-hydrogen';
const TRANSCRIBE_MODEL = process.env.GEMINI_TRANSCRIBE_MODEL || DEFAULT_CHAT_MODEL;
const TTS_MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-lite-tts';

const LANGUAGE_LABELS: Record<
  SupportedLanguage,
  { name: string; nativeName: string; scriptNote: string }
> = {
  om: {
    name: 'Afaan Oromo',
    nativeName: 'Afaan Oromoo',
    scriptNote:
      'Standard Qubee (Latin) orthography with accurate vowel length (a/aa, e/ee, i/ii, o/oo, u/uu) and gemination (e.g., ch, dh, ny, ph, sh).',
  },
  am: {
    name: 'Amharic',
    nativeName: 'አማርኛ',
    scriptNote: "Standard Ge'ez (Ethiopic fidel) script.",
  },
  ti: {
    name: 'Tigrinya',
    nativeName: 'ትግርኛ',
    scriptNote: "Standard Ge'ez (Ethiopic fidel) script with accurate Tigrinya vocabulary and grammar.",
  },
  en: {
    name: 'English',
    nativeName: 'English',
    scriptNote: 'Clear, natural English with strong Ethiopian cultural and regional literacy.',
  },
  so: {
    name: 'Somali',
    nativeName: 'Af-Soomaali',
    scriptNote:
      'Standard Somali Latin orthography with accurate grammar and Ethiopian Somali regional context.',
  },
};

function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY?.trim();
  return Boolean(key && key !== 'MY_GEMINI_API_KEY');
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildSystemInstruction(language: SupportedLanguage): string {
  const langMeta = LANGUAGE_LABELS[language] ?? LANGUAGE_LABELS.en;

  const oromoGuidance =
    language === 'om'
      ? `
SPECIAL AFAAN OROMO PRECISION RULES:
- Write naturally, fluently, and idiomatically in Afaan Oromo using standard Qubee orthography.
- Pay strict attention to vowel length (e.g., "barnoota" vs "barnota", "lafti", "galatoomaa", "nagaa", "dhugaa") and consonant digraphs (ch, dh, ny, ph, sh) as well as glottal stops (hudhaa / apostrophe like "bu'aa", "har'a", "waa'ee").
- Do NOT mix Amharic, Somali, or unnecessary English words into Afaan Oromo sentences unless explaining a specific technical term (in which case provide the English term in parentheses).
- Use respectful and culturally natural Oromo phrasing (e.g., "Akkam jirtu", "Galatoomaa", "Hayyee").`
      : '';

  return `You are EthioGPT ("Your Ethiopian AI Assistant"), an independent, knowledgeable, respectful, and accurate AI assistant built specifically for Ethiopia, Ethiopian languages, and the global Ethiopian diaspora.

IDENTITY:
- Always introduce yourself as **EthioGPT** ("Your Ethiopian AI Assistant"). Never refer to yourself by underlying model names or third-party AI engine names.

PRIMARY RESPONSE LANGUAGE:
- Respond in ${langMeta.name} (${langMeta.nativeName}) by default.
- Script & Orthography: ${langMeta.scriptNote}
- If the user explicitly asks to translate between languages or write code/technical terms, keep explanations in ${langMeta.name} while accurately preserving requested target-language text or code.
${oromoGuidance}

CULTURAL & KNOWLEDGE PRINCIPLES:
- Demonstrate deep, accurate familiarity with Ethiopian history, geography, calendars (Ge'ez / Ethiopian calendar vs Gregorian when relevant), agriculture, education, literature, business, technology, and regional cultures across all regions of Ethiopia.
- Help thoughtfully with education, studying, writing, translation, coding, research, document analysis, image interpretation, and everyday practical questions.
- Format responses clearly with Markdown (headings, bullet lists, numbered steps, tables, and fenced code blocks where helpful).

HONESTY & EPISTEMIC INTEGRITY:
- Never invent facts, historical dates, legal citations, statistics, proverbs, or translations when uncertain.
- If a question asks for real-time facts you cannot verify, or if an uploaded image/document is unclear or incomplete, say so transparently in ${langMeta.name} and explain what can be verified.`;
}

function formatGeminiError(error: unknown): {
  status: number;
  code: string;
  message: string;
} {
  const raw = error instanceof Error ? error.message : String(error);

  if (raw === 'GEMINI_API_KEY_MISSING') {
    return {
      status: 503,
      code: 'API_KEY_MISSING',
      message:
        'Gemini API key is not configured on the server. Add GEMINI_API_KEY in your Vercel Environment Variables (or local .env).',
    };
  }
  if (raw.includes('API_KEY_INVALID') || raw.includes('PERMISSION_DENIED') || raw.includes('403')) {
    return {
      status: 403,
      code: 'API_KEY_INVALID',
      message:
        'The server Gemini API key was rejected or lacks permission. Please verify GEMINI_API_KEY.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      code: 'RATE_LIMITED',
      message: 'AI rate limit or quota was reached. Please wait a moment and try again.',
    };
  }
  if (raw.includes('NOT_FOUND') || raw.includes('404')) {
    return {
      status: 404,
      code: 'MODEL_NOT_FOUND',
      message: 'Configured AI model was not found. Check your GEMINI_MODEL environment variable.',
    };
  }

  return {
    status: 500,
    code: 'AI_REQUEST_FAILED',
    message: 'Unable to complete the AI request right now. Please try again shortly.',
  };
}

function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message: string;
}) {
  const buckets = new Map<string, number[]>();

  const timer = setInterval(() => {
    const cutoff = Date.now() - options.windowMs;
    for (const [key, timestamps] of buckets.entries()) {
      const active = timestamps.filter((t) => t > cutoff);
      if (active.length === 0) {
        buckets.delete(key);
      } else {
        buckets.set(key, active);
      }
    }
  }, options.windowMs);
  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip =
      (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined) ||
      req.ip ||
      'unknown';

    const now = Date.now();
    const cutoff = now - options.windowMs;
    const active = (buckets.get(ip) ?? []).filter((t) => t > cutoff);

    if (active.length >= options.maxRequests) {
      res.status(429).json({
        error: options.message,
        code: 'TOO_MANY_REQUESTS',
      });
      return;
    }

    active.push(now);
    buckets.set(ip, active);
    next();
  };
}

interface ChatAttachmentInput {
  type: 'image' | 'document';
  name: string;
  mimeType: string;
  data?: string;
  extractedText?: string;
}

interface ChatMessageInput {
  role: 'user' | 'assistant';
  content: string;
  attachments?: ChatAttachmentInput[];
}

const ALLOWED_LANGUAGES = new Set<SupportedLanguage>(['om', 'am', 'ti', 'en', 'so']);
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
]);
const ALLOWED_DOC_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
]);
const ALLOWED_AUDIO_MIME_TYPES = new Set([
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/x-m4a',
]);

// Stay comfortably under Vercel Serverless 4.5 MB body limit
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1,
  },
});

function sanitizeLanguage(lang: unknown): SupportedLanguage {
  if (typeof lang === 'string' && ALLOWED_LANGUAGES.has(lang as SupportedLanguage)) {
    return lang as SupportedLanguage;
  }
  return 'en';
}

export function createApiApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '4mb' }));

  const chatLimiter = createRateLimiter({
    windowMs: 60_000,
    maxRequests: 30,
    message: 'Too many chat requests. Please wait a minute before sending more messages.',
  });

  const uploadLimiter = createRateLimiter({
    windowMs: 60_000,
    maxRequests: 20,
    message: 'Too many file uploads. Please wait a moment before uploading again.',
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'EthioGPT API',
      geminiConfigured: isGeminiConfigured(),
      supportedLanguages: Object.keys(LANGUAGE_LABELS),
    });
  });

  app.post('/api/upload-document', uploadLimiter, (req, res) => {
    upload.single('file')(req, res, async (multerErr: unknown) => {
      if (multerErr) {
        const message =
          multerErr instanceof multer.MulterError && multerErr.code === 'LIMIT_FILE_SIZE'
            ? 'File exceeds the 4 MB maximum upload limit.'
            : 'Invalid file upload request.';
        res.status(400).json({ error: message });
        return;
      }

      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'No document file was provided.' });
        return;
      }

      const lowerName = file.originalname.toLowerCase();
      const isTextExt =
        lowerName.endsWith('.txt') ||
        lowerName.endsWith('.md') ||
        lowerName.endsWith('.csv') ||
        lowerName.endsWith('.json');
      const isPdf = file.mimetype === 'application/pdf' || lowerName.endsWith('.pdf');

      if (!ALLOWED_DOC_MIME_TYPES.has(file.mimetype) && !isTextExt && !isPdf) {
        res.status(400).json({
          error:
            'Unsupported document format. Please upload a PDF, TXT, Markdown, CSV, or JSON file.',
        });
        return;
      }

      try {
        if (isPdf) {
          const parser = new PDFParse({ data: file.buffer });
          try {
            const result = await parser.getText();
            const extractedText = (result.text ?? '').trim();
            const pageCount = result.total ?? result.pages?.length ?? 1;

            if (extractedText.length < 15) {
              res.json({
                name: file.originalname,
                mimeType: 'application/pdf',
                extractedText: '',
                pageCount,
                charCount: 0,
                isScannedPdf: true,
                base64Data: file.buffer.toString('base64'),
              });
              return;
            }

            const truncated = extractedText.slice(0, 120_000);
            res.json({
              name: file.originalname,
              mimeType: 'application/pdf',
              extractedText: truncated,
              pageCount,
              charCount: truncated.length,
              truncated: extractedText.length > 120_000,
              isScannedPdf: false,
            });
            return;
          } finally {
            await parser.destroy();
          }
        }

        const decoded = file.buffer.toString('utf-8').trim();
        if (!decoded) {
          res.status(400).json({ error: 'The uploaded document appears to be empty.' });
          return;
        }
        const truncated = decoded.slice(0, 120_000);
        res.json({
          name: file.originalname,
          mimeType: file.mimetype || 'text/plain',
          extractedText: truncated,
          pageCount: 1,
          charCount: truncated.length,
          truncated: decoded.length > 120_000,
          isScannedPdf: false,
        });
      } catch (err) {
        console.error('Document parse error:', err);
        res.status(422).json({
          error:
            'Could not extract text from this document. Ensure the PDF is not password-protected or corrupted.',
        });
      }
    });
  });

  app.post('/api/transcribe', uploadLimiter, (req, res) => {
    upload.single('audio')(req, res, async (multerErr: unknown) => {
      if (multerErr || !req.file) {
        res.status(400).json({ error: 'Invalid or missing audio recording.' });
        return;
      }

      const language = sanitizeLanguage(req.body?.language);
      const langMeta = LANGUAGE_LABELS[language];
      const rawMime = (req.file.mimetype || 'audio/webm').split(';')[0].trim();
      const mimeType = ALLOWED_AUDIO_MIME_TYPES.has(rawMime) ? rawMime : 'audio/webm';

      try {
        const ai = getGeminiClient();
        const response = await ai.models.generateContent({
          model: TRANSCRIBE_MODEL,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: req.file.buffer.toString('base64'),
                },
              },
              {
                text: `Transcribe this spoken audio accurately. The speaker is likely speaking ${langMeta.name} (${langMeta.nativeName}), or possibly English/another Ethiopian language. Return ONLY the clean transcription text without quotes or commentary.`,
              },
            ],
          },
        });

        res.json({
          text: (response.text ?? '').trim(),
          language,
        });
      } catch (err) {
        const formatted = formatGeminiError(err);
        res.status(formatted.status).json({ error: formatted.message, code: formatted.code });
      }
    });
  });

  app.post('/api/tts', chatLimiter, async (req, res) => {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const language = sanitizeLanguage(req.body?.language);
    if (!text) {
      res.status(400).json({ error: 'Text is required for speech generation.' });
      return;
    }

    const clippedText = text.slice(0, 2500);
    void language;

    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: TTS_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: clippedText,
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        res.status(502).json({ error: 'Speech service did not return audio data.' });
        return;
      }

      res.json({
        audioBase64: base64Audio,
        mimeType: 'audio/wav',
      });
    } catch (err) {
      console.error('TTS generation error:', err);
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message, code: formatted.code });
    }
  });

  app.post('/api/chat', chatLimiter, async (req, res) => {
    const rawMessages = Array.isArray(req.body?.messages) ? req.body.messages : null;
    const language = sanitizeLanguage(req.body?.language);

    if (!rawMessages || rawMessages.length === 0) {
      res.status(400).json({ error: 'Conversation messages are required.' });
      return;
    }

    if (rawMessages.length > 60) {
      res.status(400).json({ error: 'Conversation context exceeds 60 messages per request.' });
      return;
    }

    const contents: Array<{ role: 'user' | 'model'; parts: Array<Record<string, unknown>> }> = [];

    for (const item of rawMessages as ChatMessageInput[]) {
      if (!item || (item.role !== 'user' && item.role !== 'assistant')) {
        res.status(400).json({ error: 'Invalid message role in conversation history.' });
        return;
      }

      const parts: Array<Record<string, unknown>> = [];
      const textContent = typeof item.content === 'string' ? item.content.slice(0, 60_000) : '';

      if (Array.isArray(item.attachments)) {
        for (const att of item.attachments.slice(0, 5)) {
          if (att.type === 'image' && att.data && ALLOWED_IMAGE_MIME_TYPES.has(att.mimeType)) {
            parts.push({
              inlineData: {
                mimeType: att.mimeType,
                data: att.data,
              },
            });
          } else if (att.type === 'document') {
            if (att.extractedText) {
              parts.push({
                text: `[Attached Document: ${att.name}]\n\n${att.extractedText.slice(0, 80_000)}\n\n[End of Document]`,
              });
            } else if (att.data && att.mimeType === 'application/pdf') {
              parts.push({
                inlineData: {
                  mimeType: 'application/pdf',
                  data: att.data,
                },
              });
            }
          }
        }
      }

      if (textContent.trim().length > 0) {
        parts.push({ text: textContent });
      } else if (parts.length > 0 && item.role === 'user') {
        parts.push({ text: 'Please analyze the attached file(s).' });
      }

      if (parts.length > 0) {
        contents.push({
          role: item.role === 'assistant' ? 'model' : 'user',
          parts,
        });
      }
    }

    if (contents.length === 0) {
      res.status(400).json({ error: 'Cannot send an empty message.' });
      return;
    }

    let ai;
    try {
      ai = getGeminiClient();
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message, code: formatted.code });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendEvent = (payload: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    try {
      const stream = await ai.models.generateContentStream({
        model: DEFAULT_CHAT_MODEL,
        contents,
        config: {
          systemInstruction: buildSystemInstruction(language),
        },
      });

      for await (const chunk of stream) {
        const delta = chunk.text;
        if (delta) {
          sendEvent({ type: 'chunk', text: delta });
        }
      }

      sendEvent({ type: 'done' });
      res.end();
    } catch (err) {
      console.error('Gemini stream error:', err);
      const formatted = formatGeminiError(err);
      sendEvent({ type: 'error', error: formatted.message, code: formatted.code });
      res.end();
    }
  });

  app.use(
    '/api',
    (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('Unhandled API error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  );

  return app;
}

const app = createApiApp();

export default app;
