export type LanguageCode = 'om' | 'am' | 'ti' | 'en' | 'so';

export type ThemeMode = 'light' | 'dark';

export type VoiceMode = 'auto' | 'ai' | 'browser';

export type AppView = 'chat' | 'auth' | 'profile' | 'settings' | 'about' | 'founder' | 'legal';

export type AuthTab = 'login' | 'signup' | 'forgot';

export interface ChatAttachment {
  id: string;
  type: 'image' | 'document';
  name: string;
  mimeType: string;
  sizeBytes: number;
  previewUrl?: string; // Object URL or data URL for local image preview
  data?: string; // Base64 payload (without data:... prefix) for images or scanned PDFs
  extractedText?: string;
  pageCount?: number;
  charCount?: number;
  isScannedPdf?: boolean;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
  language: LanguageCode;
  attachmentNames?: string[];
  attachments?: ChatAttachment[]; // Transient in-memory attachments for immediate display/multimodal resend
  createdAt: number;
  isError?: boolean;
}

export interface ChatSession {
  id: string;
  userId?: string;
  title: string;
  language: LanguageCode;
  messageCount: number;
  lastMessagePreview: string;
  createdAt: number;
  updatedAt: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  username: string;
  email: string;
  photoDataUrl?: string;
  bio: string;
  country: string;
  preferredLanguage: LanguageCode;
  theme: ThemeMode;
  voiceMode: VoiceMode;
  saveHistory: boolean;
}
