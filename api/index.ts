import { GoogleGenAI } from '@google/genai';
import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';

export type SupportedLanguage = 'om' | 'am' | 'ti' | 'en' | 'so';

export const DEFAULT_CHAT_MODEL = 'gemini-2.5-flash';
export const DEFAULT_TRANSCRIBE_MODEL = 'gemini-2.5-flash';

const FALLBACK_STABLE_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.8-flash',
  'gemini-4-hydrogen',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
];
const MODEL_CHECK_CACHE_TTL_MS = 5 * 60_000;

const MAX_429_RETRIES = 2;
const MAX_503_RETRIES = 2;
const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 12_000;

const UNSUPPORTED_MODEL_PATTERNS = [
  /^gemini-1\./i,
  /^gemini-2\.0/i,
  /^gemini-pro$/i,
  /-exp\b/i,
  /-preview\b/i,
  /experimental/i,
];

function normalizeModelName(raw: string): string {
  return raw.trim().replace(/^models\//i, '');
}

export function isUnsupportedAlias(modelName: string): boolean {
  const clean = normalizeModelName(modelName);
  return UNSUPPORTED_MODEL_PATTERNS.some((pattern) => pattern.test(clean));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function extractHttpStatus(error: unknown): number | undefined {
  if (error && typeof error === 'object') {
    const status = (error as { status?: unknown }).status;
    if (typeof status === 'number' && status >= 100 && status < 600) {
      return status;
    }
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'number' && code >= 100 && code < 600) {
      return code;
    }
  }

  const raw = error instanceof Error ? error.message : String(error);
  try {
    const parsed = JSON.parse(raw) as { error?: { code?: number; status?: string } };
    if (typeof parsed?.error?.code === 'number') {
      return parsed.error.code;
    }
    if (parsed?.error?.status === 'RESOURCE_EXHAUSTED') return 429;
    if (parsed?.error?.status === 'UNAVAILABLE') return 503;
    if (parsed?.error?.status === 'NOT_FOUND') return 404;
    if (parsed?.error?.status === 'PERMISSION_DENIED') return 403;
    if (parsed?.error?.status === 'INVALID_ARGUMENT') return 400;
  } catch {
    // Non-JSON message; inspect tokens below
  }

  if (/\bRESOURCE_EXHAUSTED\b/.test(raw) || /\b429\b/.test(raw)) return 429;
  if (/\bUNAVAILABLE\b/.test(raw) || /\b503\b/.test(raw)) return 503;
  if (/\bNOT_FOUND\b/.test(raw) || /\b404\b/.test(raw)) return 404;
  if (/\bPERMISSION_DENIED\b/.test(raw) || /\bAPI_KEY_INVALID\b/.test(raw)) return 403;
  return undefined;
}

export function parseRetryAfterMs(
  retryAfterHeader: string | null | undefined,
  errorMessage?: string
): number | null {
  if (retryAfterHeader) {
    const trimmed = retryAfterHeader.trim();
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const sec = Number(trimmed);
      if (Number.isFinite(sec) && sec >= 0) {
        return Math.ceil(sec * 1000);
      }
    }
    const parsedDate = Date.parse(trimmed);
    if (Number.isFinite(parsedDate)) {
      const delta = parsedDate - Date.now();
      return delta > 0 ? Math.ceil(delta) : 0;
    }
  }

  if (errorMessage) {
    const match = errorMessage.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/i);
    if (match) {
      const sec = Number(match[1]);
      if (Number.isFinite(sec) && sec >= 0) {
        return Math.ceil(sec * 1000);
      }
    }
  }

  return null;
}

export interface GeminiRetryOptions {
  max429Retries?: number;
  max503Retries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  getRetryAfterHeader?: () => string | null;
  clearRetryAfterHeader?: () => void;
  sleepFn?: (ms: number) => Promise<void>;
}

export class GeminiHttpError extends Error {
  status: number;
  code: string;
  retryAfterSeconds?: number;

  constructor(options: {
    status: number;
    code: string;
    message: string;
    retryAfterSeconds?: number;
  }) {
    super(options.message);
    this.name = 'GeminiHttpError';
    this.status = options.status;
    this.code = options.code;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

export async function executeGeminiWithRetry<T>(
  operation: () => Promise<T>,
  options: GeminiRetryOptions = {}
): Promise<T> {
  const max429 = options.max429Retries ?? MAX_429_RETRIES;
  const max503 = options.max503Retries ?? MAX_503_RETRIES;
  const initialDelayMs = options.initialDelayMs ?? INITIAL_RETRY_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? MAX_RETRY_DELAY_MS;
  const wait = options.sleepFn ?? sleep;

  let retries429 = 0;
  let retries503 = 0;

  while (true) {
    options.clearRetryAfterHeader?.();
    try {
      return await operation();
    } catch (err) {
      const status = extractHttpStatus(err);
      const rawMessage = err instanceof Error ? err.message : String(err);
      const retryAfterHeader = options.getRetryAfterHeader?.() ?? null;
      const retryAfterMs = parseRetryAfterMs(retryAfterHeader, rawMessage);

      if (status === 429) {
        // Respect Retry-After: if server requests waiting longer than maxDelayMs, do not hang or retry indefinitely
        if (retries429 >= max429 || (retryAfterMs !== null && retryAfterMs > maxDelayMs)) {
          const retryAfterSeconds =
            retryAfterMs !== null ? Math.max(1, Math.ceil(retryAfterMs / 1000)) : undefined;
          throw new GeminiHttpError({
            status: 429,
            code: 'RATE_LIMITED',
            retryAfterSeconds,
            message: retryAfterSeconds
              ? `Gemini API quota or rate limit reached (HTTP 429). Retry after ${retryAfterSeconds}s.`
              : 'Gemini API quota or rate limit reached (HTTP 429). Please wait a moment before trying again.',
          });
        }

        const backoffMs = Math.min(
          maxDelayMs,
          Math.round(initialDelayMs * Math.pow(2, retries429) * (0.85 + Math.random() * 0.3))
        );
        const delayMs =
          retryAfterMs !== null ? Math.min(maxDelayMs, Math.max(retryAfterMs, backoffMs)) : backoffMs;
        retries429 += 1;
        await wait(delayMs);
        continue;
      }

      if (status === 503) {
        if (retries503 >= max503) {
          const retryAfterSeconds =
            retryAfterMs !== null ? Math.max(1, Math.ceil(retryAfterMs / 1000)) : undefined;
          throw new GeminiHttpError({
            status: 503,
            code: 'SERVICE_UNAVAILABLE',
            retryAfterSeconds,
            message:
              'Gemini AI service is temporarily unavailable (HTTP 503) after multiple attempts. Please try again shortly.',
          });
        }

        const backoffMs = Math.min(
          maxDelayMs,
          Math.round(initialDelayMs * Math.pow(2, retries503) * (0.85 + Math.random() * 0.3))
        );
        const delayMs =
          retryAfterMs !== null ? Math.min(maxDelayMs, Math.max(retryAfterMs, backoffMs)) : backoffMs;
        retries503 += 1;
        await wait(delayMs);
        continue;
      }

      throw err;
    }
  }
}

function ensurePdfPolyfills() {
  const g = globalThis as Record<string, unknown>;
  if (typeof g.DOMMatrix === 'undefined') {
    g.DOMMatrix = class DOMMatrix {
      a = 1;
      b = 0;
      c = 0;
      d = 1;
      e = 0;
      f = 0;
      constructor(init?: number[] | string) {
        if (Array.isArray(init) && init.length >= 6) {
          [this.a, this.b, this.c, this.d, this.e, this.f] = init;
        }
      }
      multiplySelf() {
        return this;
      }
      preMultiplySelf() {
        return this;
      }
      invertSelf() {
        return this;
      }
      translate() {
        return this;
      }
      scale() {
        return this;
      }
    };
  }
  if (typeof g.Path2D === 'undefined') {
    g.Path2D = class Path2D {};
  }
  if (typeof g.ImageData === 'undefined') {
    g.ImageData = class ImageData {
      data: Uint8ClampedArray;
      width: number;
      height: number;
      constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.data = new Uint8ClampedArray(width * height * 4);
      }
    };
  }
}

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

interface ScopedGeminiClient {
  ai: GoogleGenAI;
  getRetryAfterHeader: () => string | null;
  clearRetryAfterHeader: () => void;
}

function getGeminiClient(): ScopedGeminiClient {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY_MISSING');
  }

  let latestRetryAfterHeader: string | null = null;

  const instrumentedFetch: typeof fetch = async (input, init) => {
    const response = await fetch(input, init);
    if (!response.ok) {
      const retryAfterMs = response.headers.get('retry-after-ms');
      if (retryAfterMs) {
        const ms = Number(retryAfterMs);
        latestRetryAfterHeader = Number.isFinite(ms) ? String(Math.ceil(ms / 1000)) : null;
      } else {
        latestRetryAfterHeader = response.headers.get('retry-after');
      }
    }
    return response;
  };

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      fetch: instrumentedFetch,
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  return {
    ai,
    getRetryAfterHeader: () => latestRetryAfterHeader,
    clearRetryAfterHeader: () => {
      latestRetryAfterHeader = null;
    },
  };
}

let cachedResolvedChatModel: { model: string; checkedAt: number } | null = null;

async function resolveModelCandidates(
  ai: GoogleGenAI,
  envOverride: string | undefined,
  preferredDefault: string
): Promise<string[]> {
  if (envOverride && envOverride.trim()) {
    const clean = normalizeModelName(envOverride);
    if (isUnsupportedAlias(clean)) {
      throw new GeminiHttpError({
        status: 404,
        code: 'MODEL_NOT_FOUND',
        message: `Configured Gemini model "${clean}" is an unsupported preview, experimental, or deprecated alias. Use "${preferredDefault}".`,
      });
    }
    return [clean];
  }

  if (
    cachedResolvedChatModel &&
    Date.now() - cachedResolvedChatModel.checkedAt < MODEL_CHECK_CACHE_TTL_MS
  ) {
    return [cachedResolvedChatModel.model];
  }

  // Try models.list first to see which stable non-preview generateContent models this API key exposes
  try {
    const pager = await ai.models.list({ config: { pageSize: 50 } });
    const availableNames = new Set<string>();
    for await (const model of pager) {
      if (!model.name) continue;
      const clean = normalizeModelName(model.name);
      const supportsGenerate =
        !model.supportedActions || model.supportedActions.includes('generateContent');
      if (supportsGenerate && !isUnsupportedAlias(clean)) {
        availableNames.add(clean);
      }
    }

    const ordered = Array.from(new Set([preferredDefault, ...FALLBACK_STABLE_MODELS]));
    const discovered = ordered.filter((candidate) => availableNames.has(candidate));
    if (discovered.length > 0) {
      return discovered;
    }
  } catch {
    // Scoped keys (e.g. 403 ACCESS_TOKEN_SCOPE_INSUFFICIENT on models.list) fall through to direct candidate order
  }

  return Array.from(new Set([preferredDefault, 'gemini-3.8-flash', 'gemini-4-hydrogen', 'gemini-2.5-flash-lite']));
}

async function executeWithModelCandidates<T>(
  candidates: string[],
  cacheResolved: boolean,
  runForModel: (modelName: string) => Promise<T>,
  retryOptions: GeminiRetryOptions
): Promise<T> {
  let lastErr: unknown;
  const notFoundModels: string[] = [];
  for (const modelName of candidates) {
    try {
      const result = await executeGeminiWithRetry(() => runForModel(modelName), retryOptions);
      if (cacheResolved) {
        cachedResolvedChatModel = { model: modelName, checkedAt: Date.now() };
      }
      return result;
    } catch (err) {
      lastErr = err;
      if (extractHttpStatus(err) !== 404) {
        throw err;
      }
      notFoundModels.push(modelName);
    }
  }
  if (notFoundModels.length > 0 && extractHttpStatus(lastErr) === 404) {
    const detail = lastErr instanceof Error ? lastErr.message : String(lastErr);
    throw new GeminiHttpError({
      status: 404,
      code: 'MODEL_NOT_FOUND',
      message: `Gemini model (${notFoundModels.join(', ')}) was not found or is unsupported for this API key (HTTP 404). Verify GEMINI_MODEL is set to a supported model such as gemini-2.5-flash. Details: ${detail.slice(0, 240)}`,
    });
  }
  throw lastErr;
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

export function formatGeminiError(error: unknown): {
  status: number;
  code: string;
  message: string;
  retryAfterSeconds?: number;
} {
  if (error instanceof GeminiHttpError) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      retryAfterSeconds: error.retryAfterSeconds,
    };
  }

  const raw = error instanceof Error ? error.message : String(error);
  const status = extractHttpStatus(error);

  if (raw === 'GEMINI_API_KEY_MISSING') {
    return {
      status: 503,
      code: 'API_KEY_MISSING',
      message:
        'Gemini API key is not configured on the server. Add GEMINI_API_KEY in your Vercel Environment Variables (or local .env).',
    };
  }
  if (status === 401 || status === 403 || raw.includes('API_KEY_INVALID') || raw.includes('PERMISSION_DENIED')) {
    return {
      status: 403,
      code: 'API_KEY_INVALID',
      message:
        'The server Gemini API key was rejected or lacks permission. Please verify GEMINI_API_KEY.',
    };
  }
  if (status === 429) {
    const retryAfterMs = parseRetryAfterMs(null, raw);
    return {
      status: 429,
      code: 'RATE_LIMITED',
      retryAfterSeconds: retryAfterMs !== null ? Math.max(1, Math.ceil(retryAfterMs / 1000)) : undefined,
      message: 'Gemini API quota or rate limit was reached (HTTP 429). Please wait a moment and try again.',
    };
  }
  if (status === 503) {
    return {
      status: 503,
      code: 'SERVICE_UNAVAILABLE',
      message: 'Gemini AI service is temporarily unavailable (HTTP 503). Please try again shortly.',
    };
  }
  if (status === 404) {
    return {
      status: 404,
      code: 'MODEL_NOT_FOUND',
      message:
        'Requested Gemini model was not found or is unsupported for this API key (HTTP 404). Verify GEMINI_MODEL is set to a supported model such as gemini-2.5-flash.',
    };
  }
  if (status === 400) {
    return {
      status: 400,
      code: 'BAD_REQUEST',
      message: 'The AI request parameters were rejected (HTTP 400). Please check your input or attachment format.',
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
      model: cachedResolvedChatModel?.model ?? normalizeModelName(process.env.GEMINI_MODEL || DEFAULT_CHAT_MODEL),
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
          try {
            ensurePdfPolyfills();
            const { PDFParse } = await import('pdf-parse');
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
          } catch (pdfErr) {
            console.warn(
              'PDF text parser unavailable in this runtime, using direct AI PDF analysis:',
              pdfErr
            );
            res.json({
              name: file.originalname,
              mimeType: 'application/pdf',
              extractedText: '',
              pageCount: 1,
              charCount: 0,
              isScannedPdf: true,
              base64Data: file.buffer.toString('base64'),
            });
            return;
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
        const { ai, getRetryAfterHeader, clearRetryAfterHeader } = getGeminiClient();
        const envOverride = process.env.GEMINI_TRANSCRIBE_MODEL || process.env.GEMINI_MODEL;
        const candidates = await resolveModelCandidates(
          ai,
          envOverride,
          DEFAULT_TRANSCRIBE_MODEL
        );

        const response = await executeWithModelCandidates(
          candidates,
          !envOverride,
          (modelName) =>
            ai.models.generateContent({
              model: modelName,
              contents: {
                parts: [
                  {
                    inlineData: {
                      mimeType,
                      data: req.file!.buffer.toString('base64'),
                    },
                  },
                  {
                    text: `Transcribe this spoken audio accurately. The speaker is likely speaking ${langMeta.name} (${langMeta.nativeName}), or possibly English/another Ethiopian language. Return ONLY the clean transcription text without quotes or commentary.`,
                  },
                ],
              },
            }),
          { getRetryAfterHeader, clearRetryAfterHeader }
        );

        res.json({
          text: (response.text ?? '').trim(),
          language,
        });
      } catch (err) {
        const formatted = formatGeminiError(err);
        if (formatted.retryAfterSeconds) {
          res.setHeader('Retry-After', String(formatted.retryAfterSeconds));
        }
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

    const configuredTtsModel = process.env.GEMINI_TTS_MODEL?.trim();
    if (!configuredTtsModel) {
      res.status(404).json({
        error: 'Server Gemini TTS model is not configured; using device speech synthesis.',
        code: 'TTS_MODEL_NOT_CONFIGURED',
      });
      return;
    }

    const clippedText = text.slice(0, 2500);
    void language;

    try {
      const { ai, getRetryAfterHeader, clearRetryAfterHeader } = getGeminiClient();
      const [ttsModel] = await resolveModelCandidates(ai, configuredTtsModel, configuredTtsModel);
      const response = await executeGeminiWithRetry(
        () =>
          ai.models.generateContent({
            model: ttsModel,
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
          }),
        { getRetryAfterHeader, clearRetryAfterHeader }
      );

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
      if (formatted.retryAfterSeconds) {
        res.setHeader('Retry-After', String(formatted.retryAfterSeconds));
      }
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

    let client: ScopedGeminiClient;
    try {
      client = getGeminiClient();
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message, code: formatted.code });
      return;
    }

    const { ai, getRetryAfterHeader, clearRetryAfterHeader } = client;

    let stream: AsyncIterable<{ text?: string }>;
    try {
      const envOverride = process.env.GEMINI_MODEL;
      const candidates = await resolveModelCandidates(ai, envOverride, DEFAULT_CHAT_MODEL);

      stream = await executeWithModelCandidates(
        candidates,
        !envOverride,
        (modelName) =>
          ai.models.generateContentStream({
            model: modelName,
            contents,
            config: {
              systemInstruction: buildSystemInstruction(language),
            },
          }),
        { getRetryAfterHeader, clearRetryAfterHeader }
      );
    } catch (err) {
      console.error('Gemini request error:', err);
      const formatted = formatGeminiError(err);
      if (formatted.retryAfterSeconds) {
        res.setHeader('Retry-After', String(formatted.retryAfterSeconds));
      }
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

  app.use('/api', (req: express.Request, res: express.Response) => {
    res.status(404).json({
      error: `API endpoint "${req.originalUrl}" was not found.`,
      code: 'ENDPOINT_NOT_FOUND',
    });
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
