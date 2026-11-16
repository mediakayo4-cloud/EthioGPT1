import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import {
  AlertTriangle,
  ChevronDown,
  Eraser,
  Globe,
  Info,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Scale,
  Settings,
  Sun,
  UserCheck,
  User as UserIcon,
  UserPlus,
  X,
} from 'lucide-react';
import { AboutView } from './components/AboutView';
import { AuthView } from './components/AuthView';
import { ChatInput } from './components/ChatInput';
import { ChatMessageItem } from './components/ChatMessageItem';
import { FounderView } from './components/FounderView';
import { LegalView } from './components/LegalView';
import { Logo } from './components/Logo';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ProfileView } from './components/ProfileView';
import { SettingsView } from './components/SettingsView';
import { Sidebar } from './components/Sidebar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { db, handleFirestoreError, OperationType } from './firebase';
import { useVoiceAssistant } from './hooks/useVoiceAssistant';
import { LANGUAGES, TRANSLATIONS } from './i18n/translations';
import type {
  AppView,
  AuthTab,
  ChatAttachment,
  ChatMessage,
  ChatSession,
  LanguageCode,
  ThemeMode,
  VoiceMode,
} from './types/chat';

const LOCAL_SESSIONS_KEY = 'ethiogpt_local_sessions_v1';
const LOCAL_MESSAGES_KEY = 'ethiogpt_local_messages_v1';

function createSafeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function loadLocalSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(LOCAL_SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as ChatSession[]) : [];
  } catch {
    return [];
  }
}

function loadLocalMessages(): Record<string, ChatMessage[]> {
  try {
    const raw = localStorage.getItem(LOCAL_MESSAGES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ChatMessage[]>) : {};
  } catch {
    return {};
  }
}

function deriveTitle(text: string, attachments: ChatAttachment[]): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length > 0) {
    return cleaned.length > 52 ? `${cleaned.slice(0, 52)}...` : cleaned;
  }
  if (attachments.length > 0) {
    return attachments[0].name.slice(0, 52);
  }
  return 'New Conversation';
}

const EthioGPTWorkspace: React.FC = () => {
  const { user, profile, isVerified, logout, syncUserPreferences, clearAllCloudChats } =
    useAuth();

  const [language, setLanguage] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem('ethiogpt_lang') as LanguageCode | null;
    return saved && TRANSLATIONS[saved] ? saved : 'om';
  });
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('ethiogpt_theme') as ThemeMode | null;
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });
  const [voiceMode, setVoiceMode] = useState<VoiceMode>(() => {
    const saved = localStorage.getItem('ethiogpt_voice_mode') as VoiceMode | null;
    return saved === 'auto' || saved === 'ai' || saved === 'browser' ? saved : 'auto';
  });
  const [saveHistory, setSaveHistory] = useState<boolean>(() => {
    const saved = localStorage.getItem('ethiogpt_save_history');
    return saved === null ? true : saved !== 'false';
  });

  const [sessions, setSessions] = useState<ChatSession[]>(() => loadLocalSessions());
  const [messagesByChat, setMessagesByChat] = useState<Record<string, ChatMessage[]>>(() =>
    loadLocalMessages()
  );
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [activeView, setActiveView] = useState<AppView>('chat');
  const [authTab, setAuthTab] = useState<AuthTab>('login');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const [geminiConfigured, setGeminiConfigured] = useState<boolean | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const strings = TRANSLATIONS[language];
  const currentLangOption = useMemo(
    () => LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0],
    [language]
  );

  const voice = useVoiceAssistant(language, voiceMode);

  // Sync HTML .dark class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('ethiogpt_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('ethiogpt_lang', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('ethiogpt_voice_mode', voiceMode);
  }, [voiceMode]);

  useEffect(() => {
    localStorage.setItem('ethiogpt_save_history', String(saveHistory));
  }, [saveHistory]);

  // Apply profile preferences once loaded
  useEffect(() => {
    if (profile) {
      if (profile.preferredLanguage && TRANSLATIONS[profile.preferredLanguage]) {
        setLanguage(profile.preferredLanguage);
      }
      if (profile.theme === 'light' || profile.theme === 'dark') {
        setTheme(profile.theme);
      }
      if (
        profile.voiceMode === 'auto' ||
        profile.voiceMode === 'ai' ||
        profile.voiceMode === 'browser'
      ) {
        setVoiceMode(profile.voiceMode);
      }
      if (typeof profile.saveHistory === 'boolean') {
        setSaveHistory(profile.saveHistory);
      }
    }
  }, [profile?.uid]);

  // Check API health on mount
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setGeminiConfigured(Boolean(data.geminiConfigured));
      })
      .catch(() => {
        // Offline or server unreachable
      });
  }, []);

  // Persist local guest conversations safely (without large base64 attachment buffers)
  useEffect(() => {
    if ((user && isVerified) || !saveHistory) return;
    try {
      localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(sessions.slice(0, 40)));
      const compactMsgs: Record<string, ChatMessage[]> = {};
      for (const [cid, list] of Object.entries(messagesByChat)) {
        compactMsgs[cid] = list.map((m) => ({
          ...m,
          attachments: undefined,
        }));
      }
      localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(compactMsgs));
    } catch {
      // ignore quota errors
    }
  }, [sessions, messagesByChat, user, isVerified, saveHistory]);

  // Real-time Firestore sessions subscription for verified signed-in users
  useEffect(() => {
    if (!db || !user || !isVerified) {
      if (!user) {
        setSessions(loadLocalSessions());
        setMessagesByChat(loadLocalMessages());
      }
      return;
    }

    const chatsPath = `users/${user.uid}/chats`;
    const q = query(collection(db, chatsPath), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: ChatSession[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: data.id || d.id,
            userId: data.userId,
            title: data.title || 'Conversation',
            language: (data.language as LanguageCode) || 'om',
            messageCount: typeof data.messageCount === 'number' ? data.messageCount : 0,
            lastMessagePreview: data.lastMessagePreview || '',
            createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
            updatedAt: data.updatedAt?.toMillis?.() ?? Date.now(),
          };
        });
        setSessions(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, chatsPath);
      }
    );

    return () => unsubscribe();
  }, [user, isVerified]);

  // Real-time Firestore messages subscription for active chat
  useEffect(() => {
    if (!db || !user || !isVerified || !activeChatId) return;

    const msgsPath = `users/${user.uid}/chats/${activeChatId}/messages`;
    const q = query(collection(db, msgsPath), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: ChatMessage[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: data.id || d.id,
            chatId: data.chatId || activeChatId,
            role: data.role === 'assistant' ? 'assistant' : 'user',
            content: data.content || '',
            language: (data.language as LanguageCode) || 'om',
            attachmentNames: Array.isArray(data.attachmentNames) ? data.attachmentNames : undefined,
            createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
          };
        });
        setMessagesByChat((prev) => ({
          ...prev,
          [activeChatId]: loaded,
        }));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, msgsPath);
      }
    );

    return () => unsubscribe();
  }, [user, isVerified, activeChatId]);

  const activeMessages = useMemo(
    () => (activeChatId ? messagesByChat[activeChatId] ?? [] : []),
    [activeChatId, messagesByChat]
  );

  // Auto-scroll to bottom on new content
  useEffect(() => {
    if (activeView === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeMessages.length, isGenerating, activeView]);

  const handleLanguageChange = (nextLang: LanguageCode) => {
    setLanguage(nextLang);
    setLangMenuOpen(false);
    void syncUserPreferences({ preferredLanguage: nextLang });
  };

  const handleThemeChange = (nextTheme: ThemeMode) => {
    setTheme(nextTheme);
    void syncUserPreferences({ theme: nextTheme });
  };

  const handleVoiceModeChange = (nextMode: VoiceMode) => {
    setVoiceMode(nextMode);
    void syncUserPreferences({ voiceMode: nextMode });
  };

  const handleSaveHistoryChange = (enabled: boolean) => {
    setSaveHistory(enabled);
    void syncUserPreferences({ saveHistory: enabled });
  };

  const navigateTo = (view: AppView, nextAuthTab?: AuthTab) => {
    if (nextAuthTab) setAuthTab(nextAuthTab);
    setActiveView(view);
    setProfileMenuOpen(false);
    setLangMenuOpen(false);
  };

  const handleNewChat = () => {
    if (isGenerating) {
      abortControllerRef.current?.abort();
      setIsGenerating(false);
    }
    voice.stopSpeaking();
    setActiveChatId(null);
    setActiveView('chat');
  };

  const handleDeleteChat = async (chatId: string) => {
    if (activeChatId === chatId) {
      setActiveChatId(null);
    }

    if (db && user && isVerified) {
      const chatPath = `users/${user.uid}/chats/${chatId}`;
      const msgsPath = `${chatPath}/messages`;
      try {
        const snap = await getDocs(collection(db, msgsPath));
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.delete(d.ref));
        batch.delete(doc(db, 'users', user.uid, 'chats', chatId));
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, chatPath);
      }
      return;
    }

    setSessions((prev) => prev.filter((s) => s.id !== chatId));
    setMessagesByChat((prev) => {
      const copy = { ...prev };
      delete copy[chatId];
      return copy;
    });
  };

  const handleClearCurrentConversation = async () => {
    if (!activeChatId) return;
    await handleDeleteChat(activeChatId);
  };

  const handleClearAllConversations = async () => {
    localStorage.removeItem(LOCAL_SESSIONS_KEY);
    localStorage.removeItem(LOCAL_MESSAGES_KEY);
    if (user && isVerified) {
      await clearAllCloudChats();
    }
    setSessions([]);
    setMessagesByChat({});
    setActiveChatId(null);
  };

  const saveTurnToFirestore = async (params: {
    chatId: string;
    isNewSession: boolean;
    title: string;
    turnLanguage: LanguageCode;
    userMsg: ChatMessage;
    assistantMsg: ChatMessage;
    totalMessagesCount: number;
  }) => {
    if (!db || !user || !isVerified || !saveHistory) return;
    const {
      chatId,
      isNewSession,
      title,
      turnLanguage,
      userMsg,
      assistantMsg,
      totalMessagesCount,
    } = params;

    const chatRef = doc(db, 'users', user.uid, 'chats', chatId);
    const userMsgRef = doc(db, 'users', user.uid, 'chats', chatId, 'messages', userMsg.id);
    const assistantMsgRef = doc(
      db,
      'users',
      user.uid,
      'chats',
      chatId,
      'messages',
      assistantMsg.id
    );

    const preview = assistantMsg.content.replace(/\s+/g, ' ').trim().slice(0, 280);
    const batch = writeBatch(db);

    if (isNewSession) {
      batch.set(chatRef, {
        id: chatId,
        userId: user.uid,
        title: title.slice(0, 160),
        language: turnLanguage,
        messageCount: totalMessagesCount,
        lastMessagePreview: preview,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.update(chatRef, {
        title: title.slice(0, 160),
        language: turnLanguage,
        messageCount: totalMessagesCount,
        lastMessagePreview: preview,
        updatedAt: serverTimestamp(),
      });
    }

    const userPayload: Record<string, unknown> = {
      id: userMsg.id,
      chatId,
      userId: user.uid,
      role: 'user',
      content: userMsg.content.slice(0, 100000),
      language: turnLanguage,
      createdAt: serverTimestamp(),
    };
    if (userMsg.attachmentNames && userMsg.attachmentNames.length > 0) {
      userPayload.attachmentNames = userMsg.attachmentNames.slice(0, 5);
    }
    batch.set(userMsgRef, userPayload);

    batch.set(assistantMsgRef, {
      id: assistantMsg.id,
      chatId,
      userId: user.uid,
      role: 'assistant',
      content: assistantMsg.content.slice(0, 100000),
      language: turnLanguage,
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/chats/${chatId}`);
    }
  };

  const streamCompletion = useCallback(
    async (
      chatId: string,
      historyForApi: ChatMessage[],
      assistantPlaceholderId: string,
      onComplete: (finalText: string, failed: boolean) => void
    ) => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsGenerating(true);

      let accumulated = '';
      let hadError = false;

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            language,
            messages: historyForApi.map((m) => ({
              role: m.role,
              content: m.content,
              attachments: m.attachments?.map((a) => ({
                type: a.type,
                name: a.name,
                mimeType: a.mimeType,
                data: a.data,
                extractedText: a.extractedText,
              })),
            })),
          }),
        });

        if (!res.ok || !res.body) {
          let errMessage = 'Unable to reach EthioGPT AI service.';
          try {
            const errJson = await res.json();
            if (errJson.error) errMessage = errJson.error;
          } catch {
            // ignore
          }
          hadError = true;
          accumulated = errMessage;
          setMessagesByChat((prev) => ({
            ...prev,
            [chatId]: (prev[chatId] ?? []).map((m) =>
              m.id === assistantPlaceholderId
                ? { ...m, content: errMessage, isError: true }
                : m
            ),
          }));
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';

          for (const rawEvent of events) {
            const line = rawEvent.trim();
            if (!line.startsWith('data:')) continue;
            const jsonStr = line.slice(5).trim();
            if (!jsonStr) continue;

            try {
              const payload = JSON.parse(jsonStr) as {
                type: 'chunk' | 'done' | 'error';
                text?: string;
                error?: string;
              };

              if (payload.type === 'chunk' && payload.text) {
                accumulated += payload.text;
                const snapshot = accumulated;
                setMessagesByChat((prev) => ({
                  ...prev,
                  [chatId]: (prev[chatId] ?? []).map((m) =>
                    m.id === assistantPlaceholderId ? { ...m, content: snapshot } : m
                  ),
                }));
              } else if (payload.type === 'error') {
                hadError = true;
                accumulated = payload.error || 'AI generation failed.';
                setMessagesByChat((prev) => ({
                  ...prev,
                  [chatId]: (prev[chatId] ?? []).map((m) =>
                    m.id === assistantPlaceholderId
                      ? { ...m, content: accumulated, isError: true }
                      : m
                  ),
                }));
              }
            } catch {
              // ignore malformed SSE fragment
            }
          }
        }
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          hadError = true;
          accumulated = 'Network connection lost while waiting for EthioGPT.';
          setMessagesByChat((prev) => ({
            ...prev,
            [chatId]: (prev[chatId] ?? []).map((m) =>
              m.id === assistantPlaceholderId
                ? { ...m, content: accumulated, isError: true }
                : m
            ),
          }));
        } else if (!accumulated.trim()) {
          hadError = true;
          setMessagesByChat((prev) => ({
            ...prev,
            [chatId]: (prev[chatId] ?? []).filter((m) => m.id !== assistantPlaceholderId),
          }));
        }
      } finally {
        abortControllerRef.current = null;
        setIsGenerating(false);
        onComplete(accumulated, hadError);
      }
    },
    [language]
  );

  const handleSendMessage = async (text: string, attachments: ChatAttachment[]) => {
    setActiveView('chat');
    const isNewSession = !activeChatId;
    const chatId = activeChatId ?? createSafeId('chat');
    if (isNewSession) {
      setActiveChatId(chatId);
    }

    const existingMsgs = messagesByChat[chatId] ?? [];
    const userMsg: ChatMessage = {
      id: createSafeId('msg'),
      chatId,
      role: 'user',
      content: text,
      language,
      attachmentNames: attachments.map((a) => a.name),
      attachments,
      createdAt: Date.now(),
    };

    const assistantMsgId = createSafeId('msg');
    const assistantPlaceholder: ChatMessage = {
      id: assistantMsgId,
      chatId,
      role: 'assistant',
      content: '',
      language,
      createdAt: Date.now() + 1,
    };

    const nextHistory = [...existingMsgs, userMsg];
    const title = isNewSession
      ? deriveTitle(text, attachments)
      : sessions.find((s) => s.id === chatId)?.title || deriveTitle(text, attachments);

    setMessagesByChat((prev) => ({
      ...prev,
      [chatId]: [...nextHistory, assistantPlaceholder],
    }));

    setSessions((prev) => {
      const existingIdx = prev.findIndex((s) => s.id === chatId);
      const updatedSession: ChatSession = {
        id: chatId,
        userId: user?.uid,
        title,
        language,
        messageCount: nextHistory.length + 1,
        lastMessagePreview: text.slice(0, 120),
        createdAt: existingIdx >= 0 ? prev[existingIdx].createdAt : Date.now(),
        updatedAt: Date.now(),
      };
      if (existingIdx >= 0) {
        const next = [...prev];
        next.splice(existingIdx, 1);
        return [updatedSession, ...next];
      }
      return [updatedSession, ...prev];
    });

    await streamCompletion(chatId, nextHistory, assistantMsgId, (finalText, hadError) => {
      const totalCount = nextHistory.length + 1;
      setSessions((prev) =>
        prev.map((s) =>
          s.id === chatId
            ? {
                ...s,
                messageCount: totalCount,
                lastMessagePreview: finalText.replace(/\s+/g, ' ').trim().slice(0, 200),
                updatedAt: Date.now(),
              }
            : s
        )
      );

      if (!hadError && finalText.trim().length > 0 && user && isVerified && saveHistory) {
        void saveTurnToFirestore({
          chatId,
          isNewSession,
          title,
          turnLanguage: language,
          userMsg,
          assistantMsg: { ...assistantPlaceholder, content: finalText },
          totalMessagesCount: totalCount,
        });
      }
    });
  };

  const handleRegenerate = async () => {
    if (!activeChatId || isGenerating) return;
    const msgs = messagesByChat[activeChatId] ?? [];
    if (msgs.length < 2) return;

    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg.role !== 'assistant') return;

    const historyWithoutLast = msgs.slice(0, -1);
    const newAssistantId = createSafeId('msg');
    const placeholder: ChatMessage = {
      id: newAssistantId,
      chatId: activeChatId,
      role: 'assistant',
      content: '',
      language,
      createdAt: Date.now(),
    };

    setMessagesByChat((prev) => ({
      ...prev,
      [activeChatId]: [...historyWithoutLast, placeholder],
    }));

    if (db && user && isVerified && saveHistory) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'chats', activeChatId, 'messages', lastMsg.id));
      } catch {
        // continue
      }
    }

    await streamCompletion(activeChatId, historyWithoutLast, newAssistantId, async (finalText, hadError) => {
      if (!hadError && finalText.trim().length > 0 && db && user && isVerified && saveHistory) {
        const chatRef = doc(db, 'users', user.uid, 'chats', activeChatId);
        const msgRef = doc(db, 'users', user.uid, 'chats', activeChatId, 'messages', newAssistantId);
        const batch = writeBatch(db);
        batch.set(msgRef, {
          id: newAssistantId,
          chatId: activeChatId,
          userId: user.uid,
          role: 'assistant',
          content: finalText.slice(0, 100000),
          language,
          createdAt: serverTimestamp(),
        });
        batch.update(chatRef, {
          lastMessagePreview: finalText.replace(/\s+/g, ' ').trim().slice(0, 280),
          updatedAt: serverTimestamp(),
        });
        try {
          await batch.commit();
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/chats/${activeChatId}`);
        }
      }
    });
  };

  const latestAssistantIndex = useMemo(() => {
    for (let i = activeMessages.length - 1; i >= 0; i--) {
      if (activeMessages[i].role === 'assistant') return i;
    }
    return -1;
  }, [activeMessages]);

  const headerTitle = useMemo(() => {
    switch (activeView) {
      case 'profile':
        return strings.myProfile;
      case 'settings':
        return strings.settings;
      case 'about':
        return strings.aboutEthioGPT;
      case 'founder':
        return strings.aboutFounder;
      case 'legal':
        return strings.licenseLegal;
      case 'auth':
        return user ? strings.profile : authTab === 'signup' ? strings.createAccount : strings.signIn;
      default:
        return activeChatId
          ? sessions.find((s) => s.id === activeChatId)?.title || strings.newChat
          : strings.tagline;
    }
  }, [activeView, activeChatId, sessions, strings, user, authTab]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#FAF9F5] dark:bg-[#0A0D0B] text-stone-900 dark:text-stone-100">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        language={language}
        onLanguageChange={handleLanguageChange}
        theme={theme}
        onToggleTheme={() => handleThemeChange(theme === 'dark' ? 'light' : 'dark')}
        strings={strings}
        sessions={sessions}
        activeChatId={activeChatId}
        onSelectChat={(id) => {
          voice.stopSpeaking();
          setActiveChatId(id);
          setActiveView('chat');
        }}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onOpenSettings={() => navigateTo('settings')}
        onOpenAuth={() => navigateTo(user ? 'profile' : 'auth', 'login')}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 min-w-0 flex-col h-full">
        <OfflineIndicator message={strings.offlineNotice} />

        {/* Clean Top Header Bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 sm:gap-4 border-b border-stone-200/80 dark:border-emerald-950/70 bg-[#FAF9F5]/90 dark:bg-[#0A0D0B]/90 backdrop-blur-md px-2.5 sm:px-6 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-emerald-950/40 shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => navigateTo('chat')}
              className="lg:hidden shrink-0 text-left"
              aria-label="EthioGPT Home"
            >
              <Logo size="sm" />
            </button>

            <div className="hidden lg:flex items-center gap-2 min-w-0">
              <span className="truncate text-sm font-semibold text-stone-800 dark:text-stone-100">
                {headerTitle}
              </span>
            </div>
          </div>

          {/* Right controls: Quick Language Switcher + Clear + Theme + Top-Right Profile Menu */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setLangMenuOpen((o) => !o);
                  setProfileMenuOpen(false);
                }}
                className="min-h-[40px] max-w-[122px] sm:max-w-none inline-flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-emerald-950/70 bg-white dark:bg-[#121815] px-2.5 sm:px-3 text-xs font-semibold text-stone-800 dark:text-stone-100 hover:bg-stone-50 dark:hover:bg-emerald-950/40 transition-colors whitespace-nowrap"
              >
                <Globe className="h-3.5 w-3.5 text-emerald-700 dark:text-amber-400 shrink-0" />
                <span className="truncate">{currentLangOption.nativeName}</span>
              </button>

              {langMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setLangMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 mt-1.5 z-30 w-48 rounded-xl border border-stone-200 dark:border-emerald-950/80 bg-white dark:bg-[#121815] p-1.5 shadow-xl">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`w-full min-h-[38px] flex items-center justify-between rounded-lg px-3 py-1.5 text-left text-xs transition-colors ${
                          lang.code === language
                            ? 'bg-emerald-700/10 dark:bg-emerald-500/15 text-emerald-900 dark:text-amber-300 font-semibold'
                            : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-emerald-950/40'
                        }`}
                      >
                        <span>{lang.nativeName}</span>
                        <span className="text-[11px] text-stone-400">{lang.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {activeView === 'chat' && activeChatId && (
              <button
                type="button"
                onClick={handleClearCurrentConversation}
                title={strings.clearChat}
                aria-label={strings.clearChat}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-stone-500 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-emerald-950/40 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
              >
                <Eraser className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => handleThemeChange(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
              className="hidden sm:flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-stone-500 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-emerald-950/40 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-emerald-800" />
              )}
            </button>

            {/* Top-Right Profile Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen((o) => !o);
                  setLangMenuOpen(false);
                }}
                aria-label="Open profile menu"
                aria-expanded={profileMenuOpen}
                className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 dark:bg-emerald-600 text-white px-2.5 sm:px-3 text-xs font-semibold hover:bg-emerald-900 dark:hover:bg-emerald-500 transition-colors whitespace-nowrap"
              >
                {user && profile?.photoDataUrl ? (
                  <img
                    src={profile.photoDataUrl}
                    alt={profile.displayName}
                    className="h-5 w-5 rounded-md object-cover shrink-0"
                  />
                ) : (
                  <UserIcon className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="hidden sm:inline max-w-[100px] truncate">
                  {user ? profile?.displayName?.split(' ')[0] || strings.profile : strings.signIn}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-80 shrink-0" />
              </button>

              {profileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setProfileMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 mt-1.5 z-30 w-64 rounded-2xl border border-stone-200 dark:border-emerald-950/80 bg-white dark:bg-[#121815] p-1.5 shadow-xl">
                    {/* User Identity Summary */}
                    <div className="px-3 py-2.5 mb-1 border-b border-stone-200/80 dark:border-emerald-950/60">
                      {user ? (
                        <div className="space-y-0.5">
                          <p className="truncate text-xs font-bold text-stone-900 dark:text-white">
                            {profile?.displayName || user.displayName || 'EthioGPT User'}
                          </p>
                          <p className="truncate text-[11px] font-mono text-emerald-800 dark:text-amber-400">
                            {profile?.username ? `@${profile.username}` : user.email}
                          </p>
                          <p className="truncate text-[11px] text-stone-500 dark:text-stone-400">
                            {user.email}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-stone-900 dark:text-white">
                            {strings.guestLabel}
                          </p>
                          <p className="text-[11px] text-stone-500 dark:text-stone-400">
                            {strings.guestHint}
                          </p>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => navigateTo('profile')}
                      className="w-full min-h-[42px] flex items-center gap-2.5 rounded-xl px-3 text-left text-xs font-medium text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-emerald-950/40 transition-colors"
                    >
                      <UserIcon className="h-4 w-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                      <span>{strings.myProfile}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigateTo('settings')}
                      className="w-full min-h-[42px] flex items-center gap-2.5 rounded-xl px-3 text-left text-xs font-medium text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-emerald-950/40 transition-colors"
                    >
                      <Settings className="h-4 w-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                      <span>{strings.settings}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigateTo('about')}
                      className="w-full min-h-[42px] flex items-center gap-2.5 rounded-xl px-3 text-left text-xs font-medium text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-emerald-950/40 transition-colors"
                    >
                      <Info className="h-4 w-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                      <span>{strings.aboutEthioGPT}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigateTo('founder')}
                      className="w-full min-h-[42px] flex items-center gap-2.5 rounded-xl px-3 text-left text-xs font-medium text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-emerald-950/40 transition-colors"
                    >
                      <UserCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                      <span>{strings.aboutFounder}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigateTo('legal')}
                      className="w-full min-h-[42px] flex items-center gap-2.5 rounded-xl px-3 text-left text-xs font-medium text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-emerald-950/40 transition-colors"
                    >
                      <Scale className="h-4 w-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                      <span>{strings.licenseLegal}</span>
                    </button>

                    <div className="my-1 border-t border-stone-200/80 dark:border-emerald-950/60" />

                    {user ? (
                      <button
                        type="button"
                        onClick={async () => {
                          setProfileMenuOpen(false);
                          await logout();
                          setActiveView('chat');
                        }}
                        className="w-full min-h-[42px] flex items-center gap-2.5 rounded-xl px-3 text-left text-xs font-semibold text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/35 transition-colors"
                      >
                        <LogOut className="h-4 w-4 shrink-0" />
                        <span>{strings.logout}</span>
                      </button>
                    ) : (
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => navigateTo('auth', 'login')}
                          className="w-full min-h-[42px] flex items-center gap-2.5 rounded-xl px-3 text-left text-xs font-semibold text-emerald-800 dark:text-amber-300 hover:bg-emerald-700/10 dark:hover:bg-emerald-950/50 transition-colors"
                        >
                          <LogIn className="h-4 w-4 shrink-0" />
                          <span>{strings.signIn}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => navigateTo('auth', 'signup')}
                          className="w-full min-h-[42px] flex items-center gap-2.5 rounded-xl px-3 text-left text-xs font-semibold text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-emerald-950/40 transition-colors"
                        >
                          <UserPlus className="h-4 w-4 shrink-0" />
                          <span>{strings.createAccount}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Configuration / Voice Notices */}
        {geminiConfigured === false && activeView === 'chat' && (
          <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-center gap-2 text-center">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              {strings.modelMissing} — Set <code className="font-mono">GEMINI_API_KEY</code> in
              server environment variables or Settings &gt; Secrets to enable AI responses.
            </span>
          </div>
        )}

        {voice.voiceNotice && activeView === 'chat' && (
          <div className="border-b border-stone-200 dark:border-emerald-950/70 bg-stone-100 dark:bg-[#131A16] px-4 py-2 text-xs text-stone-700 dark:text-stone-300 flex items-center justify-between gap-3">
            <span className="mx-auto">{voice.voiceNotice}</span>
            <button
              type="button"
              onClick={voice.clearVoiceNotice}
              className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              aria-label="Dismiss notice"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Active Viewport */}
        <main className="flex-1 overflow-y-auto">
          {activeView === 'auth' ? (
            <AuthView
              initialTab={authTab}
              strings={strings}
              onBackToChat={() => setActiveView('chat')}
              onOpenProfile={() => setActiveView('profile')}
            />
          ) : activeView === 'profile' ? (
            <ProfileView
              strings={strings}
              onBackToChat={() => setActiveView('chat')}
              onOpenAuth={() => navigateTo('auth', 'login')}
              onLanguageChange={handleLanguageChange}
            />
          ) : activeView === 'settings' ? (
            <SettingsView
              language={language}
              onLanguageChange={handleLanguageChange}
              theme={theme}
              onThemeChange={handleThemeChange}
              voiceMode={voiceMode}
              onVoiceModeChange={handleVoiceModeChange}
              saveHistory={saveHistory}
              onSaveHistoryChange={handleSaveHistoryChange}
              sessions={sessions}
              messagesByChat={messagesByChat}
              geminiConfigured={geminiConfigured}
              strings={strings}
              onClearAllConversations={handleClearAllConversations}
              onBackToChat={() => setActiveView('chat')}
              onOpenAuth={() => navigateTo('auth', 'login')}
            />
          ) : activeView === 'about' ? (
            <AboutView
              strings={strings}
              onBackToChat={() => setActiveView('chat')}
              onOpenFounder={() => setActiveView('founder')}
              onOpenLegal={() => setActiveView('legal')}
            />
          ) : activeView === 'founder' ? (
            <FounderView
              strings={strings}
              onBackToChat={() => setActiveView('chat')}
              onOpenAbout={() => setActiveView('about')}
            />
          ) : activeView === 'legal' ? (
            <LegalView strings={strings} onBackToChat={() => setActiveView('chat')} />
          ) : activeMessages.length === 0 ? (
            <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center px-4 sm:px-6 py-8 sm:py-12">
              <div className="mb-8 space-y-4">
                <Logo size="lg" showWordmark={false} />
                <div className="space-y-2">
                  <p className="text-xs font-semibold tracking-wide text-emerald-800 dark:text-amber-400">
                    EthioGPT · {strings.tagline}
                  </p>
                  <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-stone-900 dark:text-white text-balance">
                    {strings.welcomeTitle}
                  </h1>
                  <p className="max-w-2xl text-sm sm:text-base leading-relaxed text-stone-600 dark:text-stone-300">
                    {strings.welcomeSubtitle}
                  </p>
                </div>

                {/* Quick Language Switcher Row */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {LANGUAGES.map((lang) => {
                    const active = lang.code === language;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap ${
                          active
                            ? 'border-emerald-700 dark:border-amber-400 bg-emerald-800 dark:bg-emerald-600 text-white'
                            : 'border-stone-200 dark:border-emerald-950/70 bg-white dark:bg-[#121815] text-stone-700 dark:text-stone-300 hover:border-emerald-700/40 dark:hover:border-emerald-600/50'
                        }`}
                      >
                        {lang.nativeName}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Starter Prompts Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {strings.starterPrompts.map((item, idx) => (
                  <button
                    key={`${language}-${idx}`}
                    type="button"
                    onClick={() => handleSendMessage(item.prompt, [])}
                    className="group rounded-2xl border border-stone-200 dark:border-emerald-950/70 bg-white dark:bg-[#111714] p-4 text-left hover:border-emerald-700/50 dark:hover:border-amber-400/50 transition-colors"
                  >
                    <p className="text-[11px] font-medium text-emerald-800 dark:text-amber-400 mb-1">
                      {item.category}
                    </p>
                    <h2 className="font-display text-sm font-semibold text-stone-900 dark:text-stone-100 group-hover:text-emerald-800 dark:group-hover:text-amber-300 transition-colors">
                      {item.title}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                      {item.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 space-y-6">
              {activeMessages.map((msg, idx) => (
                <ChatMessageItem
                  key={msg.id}
                  message={msg}
                  strings={strings}
                  isStreaming={
                    isGenerating && idx === activeMessages.length - 1 && msg.role === 'assistant'
                  }
                  isLatestAssistant={idx === latestAssistantIndex}
                  isSpeaking={voice.speakingMessageId === msg.id}
                  isLoadingSpeech={voice.isLoadingSpeech && voice.speakingMessageId === msg.id}
                  onRegenerate={handleRegenerate}
                  onSpeak={voice.speakMessage}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {/* Bottom Composer */}
        {activeView === 'chat' && (
          <footer className="shrink-0 bg-gradient-to-t from-[#FAF9F5] via-[#FAF9F5]/95 to-transparent dark:from-[#0A0D0B] dark:via-[#0A0D0B]/95">
            <ChatInput
              strings={strings}
              isGenerating={isGenerating}
              isRecording={voice.isRecording}
              isTranscribing={voice.isTranscribing}
              recordingSeconds={voice.recordingSeconds}
              onStartStopVoice={voice.startVoiceInput}
              onSend={handleSendMessage}
              onStopGenerating={() => abortControllerRef.current?.abort()}
            />
          </footer>
        )}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <EthioGPTWorkspace />
    </AuthProvider>
  );
}
