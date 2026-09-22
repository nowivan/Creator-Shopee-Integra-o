import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  writeBatch
} from 'firebase/firestore';
import { 
  auth, 
  db, 
  testConnection, 
  handleFirestoreError, 
  OperationType,
  isFirestoreQuotaExceeded
} from '../services/firebase';
import { 
  registerWithEmail as authRegister, 
  loginWithEmail as authLogin, 
  loginWithGoogle as authGoogle, 
  logoutUser as authLogout, 
  sendResetPassword as authReset, 
  sendVerificationEmail as authVerify 
} from '../services/authService';
import { DASH_TOOLS } from '../constants';

interface Bookmark {
  id: string;
  userId: string;
  toolId: string;
  toolLabel: string;
  toolIcon?: string;
  title: string;
  notes?: string;
  timestamp: number;
  state: any;
}

interface HistoryItem {
  id: string;
  userId: string;
  toolId: string;
  label: string;
  timestamp: number;
}

interface UserPreferences {
  userId: string;
  activeView: string;
  isSidebarOpen: boolean;
  updatedAt: number;
}

interface FirebaseContextType {
  user: User | null;
  authLoading: boolean;
  loading: boolean; // Backwards compatibility
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  isQuotaExceeded: boolean;
  
  loginWithEmail: (email: string, password: string) => Promise<User>;
  registerWithEmail: (email: string, password: string, displayName?: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  logoutUser: () => Promise<void>;
  sendResetPassword: (email: string) => Promise<void>;
  resendEmailVerification: () => Promise<void>;
  refreshVerificationStatus: () => Promise<void>;
  
  // Compat functions
  login: () => Promise<User>;
  logout: () => Promise<void>;
  
  // Bookmarks state & ops
  bookmarks: Bookmark[];
  addBookmark: (toolId: string, toolLabel: string, toolIcon: string, title: string, notes: string, state: any) => Promise<void>;
  deleteBookmark: (id: string) => Promise<void>;
  
  // History state & ops
  history: HistoryItem[];
  addHistory: (toolId: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  
  // Preferences
  preferences: UserPreferences | null;
  savePreferences: (activeView: string, isSidebarOpen: boolean) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

let firebaseProviderRenderCount = 0;

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authTrigger, setAuthTrigger] = useState(0); // Trigger local components reload on manual update
  const [quotaExceeded, setQuotaExceeded] = useState(isFirestoreQuotaExceeded);

  const hasResolvedInitialAuthRef = useRef(false);
  const lastVerificationCheckRef = useRef<number>(0);
  const migrationStartedRef = useRef<boolean>(false);
  const migrationCompletedRef = useRef<boolean>(false);
  const savePreferencesTimeoutRef = useRef<any>(null);

  if (process.env.NODE_ENV !== 'production') {
    firebaseProviderRenderCount++;
    console.log(`[DEBUG] FirebaseProvider render count: ${firebaseProviderRenderCount}`);
  }

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEBUG] authLoading changed to: ${authLoading}`);
    }
  }, [authLoading]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEBUG] isAuthenticated changed to: ${!!user}`);
    }
  }, [user]);

  useEffect(() => {
    const handleQuotaChanged = (e: any) => {
      setQuotaExceeded(e.detail);
    };
    window.addEventListener('firestore-quota-exceeded-changed', handleQuotaChanged);
    return () => {
      window.removeEventListener('firestore-quota-exceeded-changed', handleQuotaChanged);
    };
  }, []);

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  const isAuthenticated = !!user;
  const isEmailVerified = user ? user.emailVerified : false;

  // Initialize connection check on boot
  useEffect(() => {
    testConnection();
  }, []);

  // Sync existing local storage data to Cloud ONLY if email is verified
  const syncLocalToCloud = async (userId: string) => {
    if (quotaExceeded) {
      console.log('[SYNC] Skipping local-to-cloud sync due to Firestore Quota Exceeded.');
      return;
    }
    if (migrationStartedRef.current || migrationCompletedRef.current) {
      console.log('[SYNC] Local-to-cloud sync already in progress or completed.');
      return;
    }
    migrationStartedRef.current = true;
    try {
      const batch = writeBatch(db);
      let needsCommit = false;

      // 1. Sync Bookmarks
      const localBookmarksRaw = localStorage.getItem('robizin_bookmarks_v1');
      if (localBookmarksRaw) {
        try {
          const localBookmarks = JSON.parse(localBookmarksRaw);
          if (Array.isArray(localBookmarks) && localBookmarks.length > 0) {
            console.log(`[SYNC] Found ${localBookmarks.length} local bookmarks. Syncing to Firestore...`);
            for (const bm of localBookmarks) {
              if (!bm || typeof bm !== 'object') continue;
              const rawId = typeof bm.id === 'string' ? bm.id.replace('bmark_', '') : String(Date.now());
              const safeBookmarkId = `bm_${rawId}`.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 120);
              if (!safeBookmarkId) continue;
              
              const docRef = doc(db, 'users', userId, 'bookmarks', safeBookmarkId);
              
              let sanitizedState: Record<string, any> = {};
              try {
                if (bm.state && typeof bm.state === 'object' && !Array.isArray(bm.state)) {
                  sanitizedState = JSON.parse(JSON.stringify(bm.state));
                }
              } catch {
                sanitizedState = {};
              }

              const cloudBookmark: Bookmark = {
                id: safeBookmarkId,
                userId: userId,
                toolId: String(bm.toolId || 'general').slice(0, 64),
                toolLabel: String(bm.toolLabel || bm.label || 'Tool').slice(0, 128),
                toolIcon: String(bm.toolIcon || 'bookmark').slice(0, 64),
                title: String(bm.title || 'Bookmark').slice(0, 200),
                notes: String(bm.notes || '').slice(0, 2000),
                timestamp: typeof bm.timestamp === 'number' ? bm.timestamp : Date.now(),
                state: sanitizedState
              };
              batch.set(docRef, cloudBookmark);
              needsCommit = true;
            }
          }
        } catch (parseErr) {
          console.warn('[SYNC] Error reading local bookmarks JSON:', parseErr);
        }
      }

      // 2. Sync History
      const localHistoryRaw = localStorage.getItem('robizin_history_v1');
      if (localHistoryRaw) {
        try {
          const localHistory = JSON.parse(localHistoryRaw);
          if (Array.isArray(localHistory) && localHistory.length > 0) {
            console.log(`[SYNC] Found ${localHistory.length} local history items. Syncing to Firestore...`);
            for (const item of localHistory) {
              if (!item || typeof item !== 'object') continue;
              const ts = typeof item.ts === 'number' ? item.ts : (typeof item.timestamp === 'number' ? item.timestamp : Date.now());
              const hId = `hist_${ts}`.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 120);
              if (!hId) continue;
              
              const docRef = doc(db, 'users', userId, 'history', hId);
              
              const cloudHistory: HistoryItem = {
                id: hId,
                userId: userId,
                toolId: String(item.toolId || 'dashboard').slice(0, 64),
                label: String(item.label || item.toolId || 'Dashboard').slice(0, 128),
                timestamp: ts
              };
              batch.set(docRef, cloudHistory);
              needsCommit = true;
            }
          }
        } catch (parseErr) {
          console.warn('[SYNC] Error reading local history JSON:', parseErr);
        }
      }

      // 3. Sync Preferences
      const localActiveView = localStorage.getItem('robizin_active_view');
      const localSidebarOpen = localStorage.getItem('robizin_is_sidebar_open');
      if (localActiveView || localSidebarOpen !== null) {
        const docRef = doc(db, 'users', userId, 'preferences', 'settings');
        const cloudPreferences: UserPreferences = {
          userId: userId,
          activeView: String(localActiveView || 'dashboard').slice(0, 64),
          isSidebarOpen: localSidebarOpen === 'true',
          updatedAt: Date.now()
        };
        batch.set(docRef, cloudPreferences);
        needsCommit = true;
      }

      if (needsCommit) {
        try {
          await batch.commit();
          console.log('[SYNC] Successfully synced all local data to the Cloud!');
          // Clean local storages to avoid redundant sync on next loads
          localStorage.removeItem('robizin_bookmarks_v1');
          localStorage.removeItem('robizin_history_v1');
        } catch (commitErr) {
          console.warn('[SYNC] Batch commit encountered an issue, preserving local cache:', commitErr);
        }
      }
      migrationCompletedRef.current = true;
    } catch (e) {
      console.warn('[SYNC] Notice during local-to-cloud sync:', e);
      migrationStartedRef.current = false;
    }
  };

  // Auto-reload user profile on window focus to immediately detect email verification
  useEffect(() => {
    const handleFocus = () => {
      const now = Date.now();
      if (now - lastVerificationCheckRef.current < 10000) {
        return;
      }
      if (auth.currentUser && !auth.currentUser.emailVerified) {
        const wasVerified = auth.currentUser.emailVerified;
        lastVerificationCheckRef.current = now;
        auth.currentUser.reload().then(() => {
          const isVerifiedNow = auth.currentUser?.emailVerified;
          if (isVerifiedNow !== wasVerified) {
            setUser(auth.currentUser ? { ...auth.currentUser } : null);
            setAuthTrigger(prev => prev + 1);
          }
        }).catch(err => console.warn("Error background-reloading auth user:", err));
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Auth Listener
  useEffect(() => {
    let unsubBookmarks: (() => void) | null = null;
    let unsubHistory: (() => void) | null = null;
    let unsubPrefs: (() => void) | null = null;
    let localBookmarksCleanup: (() => void) | null = null;
    let localHistoryCleanup: (() => void) | null = null;

    const cleanupActiveListeners = () => {
      if (unsubBookmarks) {
        unsubBookmarks();
        unsubBookmarks = null;
      }
      if (unsubHistory) {
        unsubHistory();
        unsubHistory = null;
      }
      if (unsubPrefs) {
        unsubPrefs();
        unsubPrefs = null;
      }
      if (localBookmarksCleanup) {
        localBookmarksCleanup();
        localBookmarksCleanup = null;
      }
      if (localHistoryCleanup) {
        localHistoryCleanup();
        localHistoryCleanup = null;
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      // Clean up previous listeners before setting up new ones
      cleanupActiveListeners();
      
      if (currentUser && currentUser.emailVerified && !quotaExceeded) {
        console.log(`[AUTH] User authenticated & verified: ${currentUser.email} (${currentUser.uid})`);
        
        // Sync local to cloud
        await syncLocalToCloud(currentUser.uid);

        const bookmarksPath = `users/${currentUser.uid}/bookmarks`;
        const historyPath = `users/${currentUser.uid}/history`;
        const prefsPath = `users/${currentUser.uid}/preferences/settings`;

        // Listeners for Bookmark list
        const qBookmarks = query(collection(db, 'users', currentUser.uid, 'bookmarks'), orderBy('timestamp', 'desc'));
        unsubBookmarks = onSnapshot(qBookmarks, (snapshot) => {
          const loaded: Bookmark[] = [];
          snapshot.forEach((doc) => {
            loaded.push(doc.data() as Bookmark);
          });
          setBookmarks(loaded);
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, bookmarksPath);
          const rawBmarks = localStorage.getItem('robizin_bookmarks_v1');
          setBookmarks(rawBmarks ? JSON.parse(rawBmarks) : []);
        });

        // Listeners for History list
        const qHistory = query(collection(db, 'users', currentUser.uid, 'history'), orderBy('timestamp', 'desc'));
        unsubHistory = onSnapshot(qHistory, (snapshot) => {
          const loaded: HistoryItem[] = [];
          snapshot.forEach((doc) => {
            loaded.push(doc.data() as HistoryItem);
          });
          setHistory(loaded.slice(0, 12));
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, historyPath);
          const rawHist = localStorage.getItem('robizin_history_v1');
          const parsedHist = rawHist ? JSON.parse(rawHist) : [];
          setHistory(parsedHist.map((x: any, i: number) => ({
            id: `local_h_${i}_${x.ts}`,
            userId: '',
            toolId: x.toolId,
            label: x.label,
            timestamp: x.ts
          })));
        });

        // Listener for Preferences
        const unsubPrefsRef = onSnapshot(doc(db, 'users', currentUser.uid, 'preferences', 'settings'), (snapshot) => {
          if (snapshot.exists()) {
            const incoming = snapshot.data() as UserPreferences;
            setPreferences(prev => {
              if (prev && prev.activeView === incoming.activeView && prev.isSidebarOpen === incoming.isSidebarOpen) {
                return prev;
              }
              return incoming;
            });
          } else {
            setPreferences(null);
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, prefsPath);
          const localActiveView = localStorage.getItem('robizin_active_view') || 'dashboard';
          const localSidebarOpen = localStorage.getItem('robizin_is_sidebar_open') !== 'false';
          setPreferences(prev => {
            if (prev && prev.activeView === localActiveView && prev.isSidebarOpen === localSidebarOpen) {
              return prev;
            }
            return {
              userId: currentUser.uid,
              activeView: localActiveView,
              isSidebarOpen: localSidebarOpen,
              updatedAt: Date.now()
            };
          });
        });
        unsubPrefs = unsubPrefsRef;

        hasResolvedInitialAuthRef.current = true;
        setAuthLoading(false);
      } else {
        if (currentUser && !currentUser.emailVerified) {
          console.log('[AUTH] User is authenticated but email is unverified. Restricting Cloud access.');
        } else if (quotaExceeded) {
          console.log('[AUTH] Firestore Quota Limit Exceeded. Restricting Cloud access and falling back to Local Storage.');
        } else {
          console.log('[AUTH] User signed out. Loading local storage fallback.');
        }

        // Fallback to local storage
        const loadLocalData = () => {
          const rawBmarks = localStorage.getItem('robizin_bookmarks_v1');
          setBookmarks(rawBmarks ? JSON.parse(rawBmarks) : []);
          
          const rawHist = localStorage.getItem('robizin_history_v1');
          const parsedHist = rawHist ? JSON.parse(rawHist) : [];
          setHistory(parsedHist.map((x: any, i: number) => ({
            id: `local_h_${i}_${x.ts}`,
            userId: '',
            toolId: x.toolId,
            label: x.label,
            timestamp: x.ts
          })));
        };
        
        loadLocalData();

        const handleLocalUpdate = () => loadLocalData();
        window.addEventListener('local-bookmarks-updated', handleLocalUpdate);
        window.addEventListener('local-history-updated', handleLocalUpdate);
        
        localBookmarksCleanup = () => window.removeEventListener('local-bookmarks-updated', handleLocalUpdate);
        localHistoryCleanup = () => window.removeEventListener('local-history-updated', handleLocalUpdate);

        setPreferences(null);
        hasResolvedInitialAuthRef.current = true;
        setAuthLoading(false);
      }
    });

    return () => {
      unsubscribe();
      cleanupActiveListeners();
    };
  }, [authTrigger, quotaExceeded]);

  // Auth Operations
  const loginWithEmail = useCallback(async (email: string, password: string) => {
    const u = await authLogin(email, password);
    setUser(u);
    setAuthTrigger(prev => prev + 1);
    return u;
  }, []);

  const registerWithEmail = useCallback(async (email: string, password: string, displayName?: string) => {
    const u = await authRegister(email, password, displayName);
    setUser(u);
    setAuthTrigger(prev => prev + 1);
    return u;
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const u = await authGoogle();
    setUser(u);
    setAuthTrigger(prev => prev + 1);
    return u;
  }, []);

  const logoutUser = useCallback(async () => {
    await authLogout();
    setUser(null);
    setAuthTrigger(prev => prev + 1);
  }, []);

  const sendResetPassword = useCallback(async (email: string) => {
    await authReset(email);
  }, []);

  const resendEmailVerification = useCallback(async () => {
    if (auth.currentUser) {
      await authVerify(auth.currentUser);
    } else {
      throw new Error("Nenhum usuário logado.");
    }
  }, []);

  const refreshVerificationStatus = useCallback(async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setUser(auth.currentUser);
      setAuthTrigger(prev => prev + 1);
    }
  }, []);

  // Backwards compatibility bindings
  const login = loginWithGoogle;
  const logout = logoutUser;
  const loading = authLoading;

  // Add a new Bookmark (Redirects to local storage if user is unverified or offline)
  const addBookmark = useCallback(async (
    toolId: string, 
    toolLabel: string, 
    toolIcon: string, 
    title: string, 
    notes: string, 
    state: any
  ) => {
    if (!user || !user.emailVerified || quotaExceeded) {
      const existingRaw = localStorage.getItem('robizin_bookmarks_v1');
      const bmarks = existingRaw ? JSON.parse(existingRaw) : [];
      const newBmark = {
        id: `bmark_${Date.now()}`,
        toolId,
        toolLabel,
        toolIcon,
        title,
        notes,
        timestamp: Date.now(),
        state
      };
      localStorage.setItem('robizin_bookmarks_v1', JSON.stringify([newBmark, ...bmarks]));
      window.dispatchEvent(new Event('local-bookmarks-updated'));
      return;
    }

    const cleanId = `bm_${Date.now()}`;
    const path = `users/${user.uid}/bookmarks/${cleanId}`;
    let sanitizedState: Record<string, any> = {};
    try {
      if (state && typeof state === 'object' && !Array.isArray(state)) {
        sanitizedState = JSON.parse(JSON.stringify(state));
      }
    } catch {
      sanitizedState = {};
    }

    try {
      const docRef = doc(db, 'users', user.uid, 'bookmarks', cleanId);
      const newBookmark: Bookmark = {
        id: cleanId,
        userId: user.uid,
        toolId: String(toolId || 'general').slice(0, 64),
        toolLabel: String(toolLabel || 'Tool').slice(0, 128),
        toolIcon: String(toolIcon || 'bookmark').slice(0, 64),
        title: String(title || 'Bookmark').slice(0, 200),
        notes: String(notes || '').slice(0, 2000),
        timestamp: Date.now(),
        state: sanitizedState
      };
      await setDoc(docRef, newBookmark);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
      // Fallback
      const existingRaw = localStorage.getItem('robizin_bookmarks_v1');
      const bmarks = existingRaw ? JSON.parse(existingRaw) : [];
      const newBmark = {
        id: `bm_${Date.now()}`,
        toolId: String(toolId || 'general').slice(0, 64),
        toolLabel: String(toolLabel || 'Tool').slice(0, 128),
        toolIcon: String(toolIcon || 'bookmark').slice(0, 64),
        title: String(title || 'Bookmark').slice(0, 200),
        notes: String(notes || '').slice(0, 2000),
        timestamp: Date.now(),
        state: sanitizedState
      };
      localStorage.setItem('robizin_bookmarks_v1', JSON.stringify([newBmark, ...bmarks]));
      window.dispatchEvent(new Event('local-bookmarks-updated'));
    }
  }, [user, quotaExceeded]);

  // Delete Bookmark
  const deleteBookmark = useCallback(async (id: string) => {
    if (!user || !user.emailVerified || quotaExceeded) {
      const existingRaw = localStorage.getItem('robizin_bookmarks_v1');
      if (existingRaw) {
        const bmarks = JSON.parse(existingRaw);
        const filtered = bmarks.filter((b: any) => b.id !== id);
        localStorage.setItem('robizin_bookmarks_v1', JSON.stringify(filtered));
        window.dispatchEvent(new Event('local-bookmarks-updated'));
      }
      return;
    }

    const path = `users/${user.uid}/bookmarks/${id}`;
    try {
      const docRef = doc(db, 'users', user.uid, 'bookmarks', id);
      await deleteDoc(docRef);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
      // Fallback
      const existingRaw = localStorage.getItem('robizin_bookmarks_v1');
      if (existingRaw) {
        const bmarks = JSON.parse(existingRaw);
        const filtered = bmarks.filter((b: any) => b.id !== id);
        localStorage.setItem('robizin_bookmarks_v1', JSON.stringify(filtered));
        window.dispatchEvent(new Event('local-bookmarks-updated'));
      }
    }
  }, [user, quotaExceeded]);

  // Add History item
  const addHistory = useCallback(async (toolId: string) => {
    const tool = DASH_TOOLS.find(t => t.id === toolId);
    const label = tool?.label || toolId;

    if (!user || !user.emailVerified || quotaExceeded) {
      const localHistoryRaw = localStorage.getItem('robizin_history_v1');
      const localHistory = localHistoryRaw ? JSON.parse(localHistoryRaw) : [];
      const item = { toolId, label, ts: Date.now() };
      const next = [item, ...localHistory.filter((x: any) => x.toolId !== toolId)].slice(0, 12);
      localStorage.setItem('robizin_history_v1', JSON.stringify(next));
      window.dispatchEvent(new Event('local-history-updated'));
      return;
    }

    const hId = `hist_${Date.now()}`;
    const path = `users/${user.uid}/history/${hId}`;
    try {
      const docRef = doc(db, 'users', user.uid, 'history', hId);
      const newHistoryItem: HistoryItem = {
        id: hId,
        userId: user.uid,
        toolId: String(toolId || 'general').slice(0, 64),
        label: String(label || 'Dashboard').slice(0, 128),
        timestamp: Date.now()
      };
      await setDoc(docRef, newHistoryItem);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
      // Fallback
      const localHistoryRaw = localStorage.getItem('robizin_history_v1');
      const localHistory = localHistoryRaw ? JSON.parse(localHistoryRaw) : [];
      const item = { toolId, label, ts: Date.now() };
      const next = [item, ...localHistory.filter((x: any) => x.toolId !== toolId)].slice(0, 12);
      localStorage.setItem('robizin_history_v1', JSON.stringify(next));
      window.dispatchEvent(new Event('local-history-updated'));
    }
  }, [user, quotaExceeded]);

  // Clear History
  const clearHistory = useCallback(async () => {
    if (!user || !user.emailVerified || quotaExceeded) {
      localStorage.setItem('robizin_history_v1', JSON.stringify([]));
      window.dispatchEvent(new Event('local-history-updated'));
      return;
    }

    const path = `users/${user.uid}/history`;
    try {
      const batch = writeBatch(db);
      for (const item of history) {
        const docRef = doc(db, 'users', user.uid, 'history', item.id);
        batch.delete(docRef);
      }
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
      // Fallback
      localStorage.setItem('robizin_history_v1', JSON.stringify([]));
      window.dispatchEvent(new Event('local-history-updated'));
    }
  }, [user, quotaExceeded, history]);

  // Save Preferences
  const savePreferences = useCallback(async (activeView: string, isSidebarOpen: boolean) => {
    // 1. Always write to local storage immediately so UI feels fast
    try {
      localStorage.setItem('robizin_active_view', activeView);
      localStorage.setItem('robizin_is_sidebar_open', JSON.stringify(isSidebarOpen));
    } catch (e) {
      console.warn('[AUTOSAVE] Local storage write error:', e);
    }

    if (!user || !user.emailVerified || quotaExceeded) {
      return;
    }

    // 2. Debounce cloud writes by 500ms
    if (savePreferencesTimeoutRef.current) {
      clearTimeout(savePreferencesTimeoutRef.current);
    }

    savePreferencesTimeoutRef.current = setTimeout(async () => {
      const path = `users/${user.uid}/preferences/settings`;
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEBUG] Preference write triggered - activeView: ${activeView}, isSidebarOpen: ${isSidebarOpen}`);
      }
      try {
        const docRef = doc(db, 'users', user.uid, 'preferences', 'settings');
        const updatedPrefs: UserPreferences = {
          userId: user.uid,
          activeView,
          isSidebarOpen,
          updatedAt: Date.now()
        };
        await setDoc(docRef, updatedPrefs);
        console.log('[AUTOSAVE] Preferences saved to cloud successfully.');
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, path);
      }
    }, 500);
  }, [user, quotaExceeded]);

  const contextValue = useMemo(() => ({
    user,
    authLoading,
    loading,
    isAuthenticated,
    isEmailVerified,
    isQuotaExceeded: quotaExceeded,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    logoutUser,
    sendResetPassword,
    resendEmailVerification,
    refreshVerificationStatus,
    login,
    logout,
    bookmarks,
    addBookmark,
    deleteBookmark,
    history,
    addHistory,
    clearHistory,
    preferences,
    savePreferences
  }), [
    user,
    authLoading,
    loading,
    isAuthenticated,
    isEmailVerified,
    quotaExceeded,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    logoutUser,
    sendResetPassword,
    resendEmailVerification,
    refreshVerificationStatus,
    login,
    logout,
    bookmarks,
    addBookmark,
    deleteBookmark,
    history,
    addHistory,
    clearHistory,
    preferences,
    savePreferences
  ]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}
