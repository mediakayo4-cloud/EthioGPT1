import React, { useMemo, useState } from 'react';
import {
  Globe,
  LogIn,
  MessageSquarePlus,
  Moon,
  Search,
  Settings,
  Sun,
  Trash2,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LANGUAGES, type UIStrings } from '../i18n/translations';
import type { ChatSession, LanguageCode, ThemeMode } from '../types/chat';
import { Logo } from './Logo';
import { PWAInstallButton } from './PWAInstallButton';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  strings: UIStrings;
  sessions: ChatSession[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  language,
  onLanguageChange,
  theme,
  onToggleTheme,
  strings,
  sessions,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onOpenSettings,
  onOpenAuth,
}) => {
  const { user, profile, isVerified } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.lastMessagePreview.toLowerCase().includes(q)
    );
  }, [sessions, searchQuery]);

  const content = (
    <aside className="flex h-full w-[280px] flex-col border-r border-stone-200 dark:border-emerald-950/70 bg-[#F4F2EC] dark:bg-[#0D120F]">
      {/* Brand + Close on mobile */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-stone-200/80 dark:border-emerald-950/60">
        <Logo size="md" />
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-stone-500 hover:bg-stone-200/60 dark:hover:bg-emerald-950/40"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-3.5 pb-2">
        <button
          type="button"
          onClick={() => {
            onNewChat();
            onClose();
          }}
          className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-emerald-800 dark:bg-emerald-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-emerald-900 dark:hover:bg-emerald-500 transition-colors shadow-sm whitespace-nowrap"
        >
          <MessageSquarePlus className="h-4 w-4 shrink-0" />
          <span>{strings.newChat}</span>
        </button>
      </div>

      {/* Language Selector */}
      <div className="px-3.5 py-2.5 border-b border-stone-200/80 dark:border-emerald-950/60">
        <div className="flex items-center gap-1.5 text-xs font-medium text-stone-500 dark:text-stone-400 mb-2">
          <Globe className="h-3.5 w-3.5" />
          <span>{strings.languageLabel}</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {LANGUAGES.map((lang) => {
            const active = lang.code === language;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => onLanguageChange(lang.code)}
                className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-left transition-colors border ${
                  active
                    ? 'border-emerald-700/40 dark:border-amber-400/40 bg-white dark:bg-emerald-950/55 text-emerald-900 dark:text-amber-300 font-semibold shadow-xs'
                    : 'border-transparent hover:bg-stone-200/60 dark:hover:bg-emerald-950/30 text-stone-700 dark:text-stone-300'
                }`}
              >
                <div className="truncate text-xs leading-tight">{lang.nativeName}</div>
                <div className="truncate text-[10px] text-stone-500 dark:text-stone-400">
                  {lang.name}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* History Search + List */}
      <div className="flex-1 min-h-0 flex flex-col px-3.5 pt-3">
        <div className="flex items-center justify-between text-xs font-medium text-stone-500 dark:text-stone-400 mb-2">
          <span>{strings.history}</span>
          <span className="font-mono tabular-nums">{sessions.length}</span>
        </div>

        <div className="relative mb-2.5">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={strings.searchHistory}
            className="w-full min-h-[38px] rounded-xl border border-stone-200 dark:border-emerald-950/70 bg-white dark:bg-[#121815] pl-8 pr-3 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:border-emerald-700 dark:focus:border-emerald-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pb-3 pr-0.5">
          {filteredSessions.length === 0 ? (
            <p className="py-6 text-center text-xs text-stone-500 dark:text-stone-400">
              {strings.noHistory}
            </p>
          ) : (
            filteredSessions.map((session) => {
              const isActive = session.id === activeChatId;
              const langLabel =
                LANGUAGES.find((l) => l.code === session.language)?.nativeName ?? session.language;

              return (
                <div
                  key={session.id}
                  className={`group flex items-center gap-1 rounded-xl transition-colors ${
                    isActive
                      ? 'bg-white dark:bg-[#17211C] border border-stone-200 dark:border-emerald-900/70'
                      : 'hover:bg-stone-200/60 dark:hover:bg-emerald-950/30 border border-transparent'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelectChat(session.id);
                      onClose();
                    }}
                    className="min-w-0 flex-1 min-h-[44px] px-3 py-2 text-left"
                  >
                    <p className="truncate text-xs font-medium text-stone-900 dark:text-stone-100">
                      {session.title}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-stone-500 dark:text-stone-400 font-mono tabular-nums">
                      {langLabel} · {session.messageCount} {strings.messagesUnit}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChat(session.id);
                    }}
                    title={strings.deleteChat}
                    aria-label={strings.deleteChat}
                    className="mr-1.5 min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-stone-400 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-stone-200/80 dark:border-emerald-950/60 p-3 space-y-2">
        <PWAInstallButton label={strings.installApp} />

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={onToggleTheme}
            className="min-h-[40px] flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 dark:border-emerald-950/70 bg-white dark:bg-[#121815] px-2.5 text-xs font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-emerald-950/40 transition-colors whitespace-nowrap"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-3.5 w-3.5 text-amber-400" />
                <span>{strings.themeLight}</span>
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 text-emerald-700" />
                <span>{strings.themeDark}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenSettings();
              onClose();
            }}
            className="min-h-[40px] flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 dark:border-emerald-950/70 bg-white dark:bg-[#121815] px-2.5 text-xs font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-emerald-950/40 transition-colors whitespace-nowrap"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>{strings.settings}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            onOpenAuth();
            onClose();
          }}
          className="w-full min-h-[44px] flex items-center gap-2.5 rounded-xl border border-stone-200 dark:border-emerald-950/70 bg-white dark:bg-[#121815] px-3 py-2 text-left hover:bg-stone-50 dark:hover:bg-emerald-950/40 transition-colors"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden bg-emerald-800/10 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 shrink-0">
            {user && profile?.photoDataUrl ? (
              <img
                src={profile.photoDataUrl}
                alt={profile.displayName}
                className="h-full w-full object-cover"
              />
            ) : user ? (
              <UserIcon className="h-4 w-4" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-stone-900 dark:text-stone-100">
              {user ? profile?.displayName || user.email || strings.profile : strings.signIn}
            </p>
            <p className="truncate text-[11px] text-stone-500 dark:text-stone-400">
              {user
                ? isVerified
                  ? profile?.username
                    ? `@${profile.username}`
                    : strings.cloudSynced
                  : 'Verification pending'
                : strings.guestHint}
            </p>
          </div>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop persistent sidebar */}
      <div className="hidden lg:block h-full shrink-0">{content}</div>

      {/* Mobile slide-over drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full shadow-2xl">{content}</div>
        </div>
      )}
    </>
  );
};
