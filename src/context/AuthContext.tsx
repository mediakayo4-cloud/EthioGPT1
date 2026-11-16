import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
  type DocumentReference,
} from 'firebase/firestore';
import {
  auth,
  db,
  handleFirestoreError,
  isFirebaseConfigured,
  OperationType,
} from '../firebase';
import type { LanguageCode, ThemeMode, UserProfile, VoiceMode } from '../types/chat';

export type ProfileUpdateInput = Partial<
  Pick<
    UserProfile,
    | 'displayName'
    | 'username'
    | 'photoDataUrl'
    | 'bio'
    | 'country'
    | 'preferredLanguage'
    | 'theme'
    | 'voiceMode'
    | 'saveHistory'
  >
>;

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isConfigured: boolean;
  isVerified: boolean;
  providerIds: string[];
  authError: string | null;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<boolean>;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<boolean>;
  resendVerificationEmail: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  syncUserPreferences: (prefs: {
    preferredLanguage?: LanguageCode;
    theme?: ThemeMode;
    voiceMode?: VoiceMode;
    saveHistory?: boolean;
  }) => Promise<void>;
  updateUserProfile: (updates: ProfileUpdateInput) => Promise<void>;
  clearAllCloudChats: () => Promise<void>;
  deleteAccount: (password?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SUPPORTED_LANGS: LanguageCode[] = ['om', 'am', 'ti', 'en', 'so'];
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;
const PHOTO_DATA_URL_REGEX = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/;

function getStoredLang(): LanguageCode {
  const val = localStorage.getItem('ethiogpt_lang') as LanguageCode | null;
  return val && SUPPORTED_LANGS.includes(val) ? val : 'om';
}

function getStoredTheme(): ThemeMode {
  const val = localStorage.getItem('ethiogpt_theme');
  return val === 'light' || val === 'dark' ? val : 'dark';
}

function getStoredVoiceMode(): VoiceMode {
  const val = localStorage.getItem('ethiogpt_voice_mode');
  return val === 'auto' || val === 'ai' || val === 'browser' ? val : 'auto';
}

function getStoredSaveHistory(): boolean {
  const val = localStorage.getItem('ethiogpt_save_history');
  return val === null ? true : val !== 'false';
}

function deriveDefaultUsername(seed: string, uid: string): string {
  const cleaned = seed
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 22);
  if (cleaned.length >= 3 && USERNAME_REGEX.test(cleaned)) {
    return cleaned;
  }
  const uidSuffix = uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'ethio';
  return `user_${uidSuffix}`.slice(0, 30);
}

function validateProfileFields(candidate: UserProfile): void {
  if (!candidate.displayName.trim() || candidate.displayName.trim().length > 100) {
    throw new Error('Full name must be between 1 and 100 characters.');
  }
  if (!USERNAME_REGEX.test(candidate.username)) {
    throw new Error(
      'Username must be 3–30 characters using only letters, numbers, and underscores (_).'
    );
  }
  if (candidate.bio.length > 300) {
    throw new Error('Biography cannot exceed 300 characters.');
  }
  if (candidate.country.length > 80) {
    throw new Error('Country name cannot exceed 80 characters.');
  }
  if (!SUPPORTED_LANGS.includes(candidate.preferredLanguage)) {
    throw new Error('Please choose one of the supported languages.');
  }
  if (candidate.photoDataUrl) {
    if (candidate.photoDataUrl.length > 200000) {
      throw new Error('Profile image is too large after compression. Please choose a smaller image.');
    }
    if (!PHOTO_DATA_URL_REGEX.test(candidate.photoDataUrl)) {
      throw new Error('Profile image must be a valid JPEG, PNG, or WebP image.');
    }
  }
}

function mapFirebaseAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed before completing.';
    case 'auth/popup-blocked':
      return 'Popup was blocked by your browser. Please allow popups for this site and try again.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not yet enabled in the Firebase Console. Use Google Sign-In, or enable Email/Password under Firebase Console → Authentication → Sign-in method.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'auth/requires-recent-login':
      return 'For security, please confirm your current password or re-authenticate before deleting your account.';
    default:
      return error instanceof Error ? error.message : 'Authentication failed. Please try again.';
  }
}

async function deleteRefsInBatches(refs: DocumentReference[]): Promise<void> {
  if (!db || refs.length === 0) return;
  const CHUNK_SIZE = 400;
  for (let i = 0; i < refs.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    refs.slice(i, i + CHUNK_SIZE).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [authError, setAuthError] = useState<string | null>(null);

  const ensureUserProfile = async (firebaseUser: User): Promise<UserProfile | null> => {
    if (!db || !firebaseUser.emailVerified) return null;
    const userPath = `users/${firebaseUser.uid}`;
    const userRef = doc(db, 'users', firebaseUser.uid);

    try {
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const raw = snap.data() as Partial<UserProfile> & { createdAt?: unknown };
        const hydrated: UserProfile = {
          uid: raw.uid || firebaseUser.uid,
          displayName: (raw.displayName || firebaseUser.displayName || 'EthioGPT User').slice(0, 100),
          username:
            raw.username && USERNAME_REGEX.test(raw.username)
              ? raw.username
              : deriveDefaultUsername(
                  raw.displayName || firebaseUser.email?.split('@')[0] || '',
                  firebaseUser.uid
                ),
          email: raw.email || firebaseUser.email || 'user@ethiogpt.local',
          photoDataUrl: typeof raw.photoDataUrl === 'string' ? raw.photoDataUrl : '',
          bio: typeof raw.bio === 'string' ? raw.bio.slice(0, 300) : '',
          country: typeof raw.country === 'string' ? raw.country.slice(0, 80) : 'Ethiopia',
          preferredLanguage:
            raw.preferredLanguage && SUPPORTED_LANGS.includes(raw.preferredLanguage)
              ? raw.preferredLanguage
              : getStoredLang(),
          theme: raw.theme === 'light' || raw.theme === 'dark' ? raw.theme : getStoredTheme(),
          voiceMode:
            raw.voiceMode === 'auto' || raw.voiceMode === 'ai' || raw.voiceMode === 'browser'
              ? raw.voiceMode
              : getStoredVoiceMode(),
          saveHistory: typeof raw.saveHistory === 'boolean' ? raw.saveHistory : getStoredSaveHistory(),
        };

        const needsBackfill =
          typeof raw.username !== 'string' ||
          !USERNAME_REGEX.test(raw.username) ||
          typeof raw.bio !== 'string' ||
          typeof raw.country !== 'string' ||
          typeof raw.voiceMode !== 'string' ||
          typeof raw.saveHistory !== 'boolean';

        if (needsBackfill) {
          await setDoc(
            userRef,
            {
              ...hydrated,
              createdAt: raw.createdAt ?? serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }

        setProfile(hydrated);
        return hydrated;
      }

      const displayName = (
        firebaseUser.displayName ||
        firebaseUser.email?.split('@')[0] ||
        'EthioGPT User'
      )
        .trim()
        .slice(0, 100);
      const username = deriveDefaultUsername(
        firebaseUser.email?.split('@')[0] || displayName,
        firebaseUser.uid
      );

      const newProfile: UserProfile = {
        uid: firebaseUser.uid,
        displayName,
        username,
        email: (firebaseUser.email || 'user@ethiogpt.local').slice(0, 254),
        photoDataUrl: '',
        bio: '',
        country: 'Ethiopia',
        preferredLanguage: getStoredLang(),
        theme: getStoredTheme(),
        voiceMode: getStoredVoiceMode(),
        saveHistory: getStoredSaveHistory(),
      };

      await setDoc(userRef, {
        ...newProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setProfile(newProfile);
      return newProfile;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, userPath);
      return null;
    }
  };

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        if (firebaseUser.emailVerified) {
          try {
            await ensureUserProfile(firebaseUser);
          } catch (err) {
            console.error('Failed to sync profile:', err);
          }
        } else {
          const displayName = (
            firebaseUser.displayName ||
            firebaseUser.email?.split('@')[0] ||
            'User'
          )
            .trim()
            .slice(0, 100);
          setProfile({
            uid: firebaseUser.uid,
            displayName,
            username: deriveDefaultUsername(displayName, firebaseUser.uid),
            email: firebaseUser.email || '',
            photoDataUrl: '',
            bio: '',
            country: 'Ethiopia',
            preferredLanguage: getStoredLang(),
            theme: getStoredTheme(),
            voiceMode: getStoredVoiceMode(),
            saveHistory: getStoredSaveHistory(),
          });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async (): Promise<boolean> => {
    if (!auth) {
      setAuthError('Firebase is not configured yet.');
      return false;
    }
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      return true;
    } catch (error) {
      setAuthError(mapFirebaseAuthError(error));
      return false;
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<boolean> => {
    if (!auth) {
      setAuthError('Firebase is not configured yet.');
      return false;
    }
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return true;
    } catch (error) {
      setAuthError(mapFirebaseAuthError(error));
      return false;
    }
  };

  const signUpWithEmail = async (
    name: string,
    email: string,
    password: string
  ): Promise<boolean> => {
    if (!auth) {
      setAuthError('Firebase is not configured yet.');
      return false;
    }
    setAuthError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim().slice(0, 100) });
      }
      await sendEmailVerification(cred.user);
      return true;
    } catch (error) {
      setAuthError(mapFirebaseAuthError(error));
      return false;
    }
  };

  const sendPasswordReset = async (email: string): Promise<boolean> => {
    if (!auth) {
      setAuthError('Firebase is not configured yet.');
      return false;
    }
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return true;
    } catch (error) {
      setAuthError(mapFirebaseAuthError(error));
      return false;
    }
  };

  const resendVerificationEmail = async (): Promise<boolean> => {
    if (!auth?.currentUser) return false;
    setAuthError(null);
    try {
      await sendEmailVerification(auth.currentUser);
      return true;
    } catch (error) {
      setAuthError(mapFirebaseAuthError(error));
      return false;
    }
  };

  const refreshUser = async () => {
    if (!auth?.currentUser) return;
    await reload(auth.currentUser);
    const updated = auth.currentUser;
    setUser(updated);
    if (updated.emailVerified) {
      await ensureUserProfile(updated);
    }
  };

  const logout = async () => {
    if (!auth) return;
    setAuthError(null);
    await signOut(auth);
  };

  const persistMergedProfile = async (next: UserProfile) => {
    validateProfileFields(next);

    localStorage.setItem('ethiogpt_lang', next.preferredLanguage);
    localStorage.setItem('ethiogpt_theme', next.theme);
    localStorage.setItem('ethiogpt_voice_mode', next.voiceMode);
    localStorage.setItem('ethiogpt_save_history', String(next.saveHistory));

    if (auth?.currentUser && next.displayName !== auth.currentUser.displayName) {
      try {
        await updateProfile(auth.currentUser, { displayName: next.displayName });
      } catch {
        // Ignore Auth displayName sync failure if offline; Firestore remains primary
      }
    }

    if (!db || !user || !user.emailVerified) {
      setProfile(next);
      return;
    }

    const userPath = `users/${user.uid}`;
    const userRef = doc(db, 'users', user.uid);
    try {
      const existingSnap = await getDoc(userRef);
      const createdAtValue = existingSnap.exists()
        ? existingSnap.data()?.createdAt ?? serverTimestamp()
        : serverTimestamp();

      const payload: Record<string, unknown> = {
        uid: user.uid,
        displayName: next.displayName.trim(),
        username: next.username.trim(),
        email: (existingSnap.data()?.email as string | undefined) || next.email,
        photoDataUrl: next.photoDataUrl ?? '',
        bio: next.bio.trim(),
        country: next.country.trim(),
        preferredLanguage: next.preferredLanguage,
        theme: next.theme,
        voiceMode: next.voiceMode,
        saveHistory: next.saveHistory,
        createdAt: createdAtValue,
        updatedAt: serverTimestamp(),
      };

      await setDoc(userRef, payload, { merge: true });
      setProfile({
        ...next,
        displayName: next.displayName.trim(),
        username: next.username.trim(),
        bio: next.bio.trim(),
        country: next.country.trim(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, userPath);
    }
  };

  const syncUserPreferences = async (prefs: {
    preferredLanguage?: LanguageCode;
    theme?: ThemeMode;
    voiceMode?: VoiceMode;
    saveHistory?: boolean;
  }) => {
    if (!user || !profile) return;
    const next: UserProfile = {
      ...profile,
      preferredLanguage: prefs.preferredLanguage ?? profile.preferredLanguage,
      theme: prefs.theme ?? profile.theme,
      voiceMode: prefs.voiceMode ?? profile.voiceMode,
      saveHistory: prefs.saveHistory ?? profile.saveHistory,
    };
    await persistMergedProfile(next);
  };

  const updateUserProfile = async (updates: ProfileUpdateInput) => {
    if (!user) {
      throw new Error('You must be signed in to update your profile.');
    }
    if (!user.emailVerified) {
      throw new Error('Please verify your email address before saving your cloud profile.');
    }

    const base: UserProfile = profile ?? {
      uid: user.uid,
      displayName: user.displayName || 'EthioGPT User',
      username: deriveDefaultUsername(user.email?.split('@')[0] || '', user.uid),
      email: user.email || '',
      photoDataUrl: '',
      bio: '',
      country: 'Ethiopia',
      preferredLanguage: getStoredLang(),
      theme: getStoredTheme(),
      voiceMode: getStoredVoiceMode(),
      saveHistory: getStoredSaveHistory(),
    };

    const merged: UserProfile = {
      ...base,
      ...updates,
      displayName: (updates.displayName ?? base.displayName).trim(),
      username: (updates.username ?? base.username).trim(),
      bio: (updates.bio ?? base.bio).trim(),
      country: (updates.country ?? base.country).trim(),
      photoDataUrl: updates.photoDataUrl !== undefined ? updates.photoDataUrl : base.photoDataUrl ?? '',
    };

    await persistMergedProfile(merged);
  };

  const clearAllCloudChats = async () => {
    if (!db || !user || !user.emailVerified) return;
    const chatsPath = `users/${user.uid}/chats`;
    try {
      const chatSnap = await getDocs(collection(db, chatsPath));
      const refsToDelete: DocumentReference[] = [];
      for (const chatDoc of chatSnap.docs) {
        const msgsSnap = await getDocs(collection(db, `${chatsPath}/${chatDoc.id}/messages`));
        msgsSnap.docs.forEach((m) => refsToDelete.push(m.ref));
        refsToDelete.push(chatDoc.ref);
      }
      await deleteRefsInBatches(refsToDelete);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, chatsPath);
    }
  };

  const deleteAccount = async (password?: string) => {
    if (!auth?.currentUser) {
      throw new Error('No authenticated user session found.');
    }
    const currentUser = auth.currentUser;
    const providers = currentUser.providerData.map((p) => p.providerId);
    const hasPasswordProvider = providers.includes('password');
    const hasGoogleProvider = providers.includes('google.com');

    // Step 1: Ensure recent login before erasing any Firestore data
    const lastSignInMs = currentUser.metadata.lastSignInTime
      ? Date.parse(currentUser.metadata.lastSignInTime)
      : 0;
    const isSessionStale = !lastSignInMs || Date.now() - lastSignInMs > 4 * 60 * 1000;

    try {
      if (hasPasswordProvider && password && currentUser.email) {
        const cred = EmailAuthProvider.credential(currentUser.email, password);
        await reauthenticateWithCredential(currentUser, cred);
      } else if (hasPasswordProvider && isSessionStale && !hasGoogleProvider) {
        throw new Error('Please enter your current password to confirm account deletion.');
      } else if (hasGoogleProvider && (isSessionStale || !hasPasswordProvider)) {
        await reauthenticateWithPopup(currentUser, new GoogleAuthProvider());
      }
    } catch (err) {
      const msg = mapFirebaseAuthError(err);
      setAuthError(msg);
      throw new Error(msg);
    }

    // Step 2: Erase Firestore data owned by this user before deleting the Auth account
    if (db) {
      if (currentUser.emailVerified) {
        await clearAllCloudChats();
      }
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const batch = writeBatch(db);
          batch.delete(userRef);
          await batch.commit();
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${currentUser.uid}`);
      }
    }

    // Step 3: Delete Firebase Auth user
    try {
      await deleteUser(currentUser);
      localStorage.removeItem('ethiogpt_local_sessions_v1');
      localStorage.removeItem('ethiogpt_local_messages_v1');
      setProfile(null);
      setUser(null);
    } catch (error) {
      const msg = mapFirebaseAuthError(error);
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const providerIds = user ? user.providerData.map((p) => p.providerId) : [];

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isConfigured: isFirebaseConfigured,
        isVerified: Boolean(user?.emailVerified),
        providerIds,
        authError,
        clearAuthError: () => setAuthError(null),
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        sendPasswordReset,
        resendVerificationEmail,
        refreshUser,
        logout,
        syncUserPreferences,
        updateUserProfile,
        clearAllCloudChats,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
