import React, { useState } from 'react';
import {
  Check,
  Copy,
  FileText,
  Image as ImageIcon,
  Loader2,
  RotateCcw,
  Square,
  Volume2,
} from 'lucide-react';
import type { UIStrings } from '../i18n/translations';
import type { ChatMessage } from '../types/chat';
import { Logo } from './Logo';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatMessageItemProps {
  message: ChatMessage;
  strings: UIStrings;
  isStreaming?: boolean;
  isLatestAssistant?: boolean;
  isSpeaking?: boolean;
  isLoadingSpeech?: boolean;
  onRegenerate?: () => void;
  onSpeak?: (messageId: string, content: string) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  strings,
  isStreaming = false,
  isLatestAssistant = false,
  isSpeaking = false,
  isLoadingSpeech = false,
  onRegenerate,
  onSpeak,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[88%] sm:max-w-[76%] space-y-2">
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap justify-end gap-2">
              {message.attachments.map((att) =>
                att.type === 'image' && att.previewUrl ? (
                  <div
                    key={att.id}
                    className="overflow-hidden rounded-2xl border border-stone-200 dark:border-emerald-950/70 bg-stone-100 dark:bg-stone-900"
                  >
                    <img
                      src={att.previewUrl}
                      alt={att.name}
                      className="max-h-56 w-auto object-cover"
                    />
                  </div>
                ) : (
                  <div
                    key={att.id}
                    className="inline-flex items-center gap-2 rounded-xl border border-stone-200 dark:border-emerald-950/70 bg-white dark:bg-[#141A16] px-3 py-2 text-xs text-stone-700 dark:text-stone-200"
                  >
                    <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="truncate max-w-[200px] font-medium">{att.name}</span>
                  </div>
                )
              )}
            </div>
          )}

          {(!message.attachments || message.attachments.length === 0) &&
            message.attachmentNames &&
            message.attachmentNames.length > 0 && (
              <div className="flex flex-wrap justify-end gap-2">
                {message.attachmentNames.map((name, idx) => (
                  <div
                    key={`${name}-${idx}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-emerald-950/70 bg-white dark:bg-[#141A16] px-3 py-1.5 text-xs text-stone-600 dark:text-stone-300"
                  >
                    {/\.(png|jpe?g|webp|gif)$/i.test(name) ? (
                      <ImageIcon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <FileText className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    )}
                    <span className="truncate max-w-[180px]">{name}</span>
                  </div>
                ))}
              </div>
            )}

          {message.content.trim().length > 0 && (
            <div className="rounded-2xl rounded-br-md bg-emerald-800 dark:bg-emerald-900/85 text-white px-4 py-3 text-[15px] leading-relaxed shadow-sm">
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 sm:gap-4 group">
      <div className="mt-0.5 shrink-0">
        <Logo size="sm" showWordmark={false} />
      </div>

      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
          <span className="font-display font-semibold text-stone-900 dark:text-stone-100">
            EthioGPT
          </span>
        </div>

        {message.isError ? (
          <div className="rounded-xl border border-red-300 dark:border-red-900/70 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-800 dark:text-red-200">
            {message.content}
          </div>
        ) : message.content.length === 0 && isStreaming ? (
          <div className="inline-flex items-center gap-1.5 py-2" aria-label="Generating response">
            <span className="ethio-dot h-2 w-2 rounded-full bg-emerald-700 dark:bg-emerald-400" />
            <span className="ethio-dot h-2 w-2 rounded-full bg-amber-600 dark:bg-amber-400" />
            <span className="ethio-dot h-2 w-2 rounded-full bg-emerald-700 dark:bg-emerald-400" />
          </div>
        ) : (
          <MarkdownRenderer content={message.content} />
        )}

        {!isStreaming && message.content.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 pt-0.5">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-medium text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-emerald-950/40 transition-colors whitespace-nowrap"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{strings.copied}</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>{strings.copy}</span>
                </>
              )}
            </button>

            {onSpeak && !message.isError && (
              <button
                type="button"
                onClick={() => onSpeak(message.id, message.content)}
                className={`inline-flex items-center gap-1.5 min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  isSpeaking
                    ? 'bg-emerald-700/15 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-emerald-950/40'
                }`}
              >
                {isLoadingSpeech && isSpeaking ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{strings.stopSpeaking}</span>
                  </>
                ) : isSpeaking ? (
                  <>
                    <Square className="h-3.5 w-3.5 fill-current" />
                    <span>{strings.stopSpeaking}</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>{strings.speak}</span>
                  </>
                )}
              </button>
            )}

            {isLatestAssistant && onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                className="inline-flex items-center gap-1.5 min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-medium text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-emerald-950/40 transition-colors whitespace-nowrap"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{strings.regenerate}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
