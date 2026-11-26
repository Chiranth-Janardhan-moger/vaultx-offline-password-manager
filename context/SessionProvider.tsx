import { runAutoBackup } from '@/lib/auto-backup';
import { isLockOnBackgroundEnabled, setLockOnBackgroundEnabled } from '@/lib/secure';
import { VaultData } from '@/lib/vault';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

const AUTO_LOCK_TIMER_KEY = 'auto_lock_timer';
const ACTIVE_WORKSPACE_KEY = 'vaultx_active_workspace';

type SessionValue = {
  unlocked: boolean;
  vault: VaultData | null;
  vaultKey: string | null;
  autoLockMinutes: number;
  updateAutoLockMinutes: (minutes: number) => Promise<void>;
  lockOnBackground: boolean;
  updateLockOnBackground: (enabled: boolean) => Promise<void>;
  unlock: (vault: VaultData, vaultKey: string) => void;
  lock: () => void;
  setVault: (updater: (prev: VaultData) => VaultData) => void;
  resetAutoLockTimer: () => void;
  runWithBackgroundLockSuppressed: <T>(fn: () => Promise<T>) => Promise<T>;
  activeWorkspace: string;
  setActiveWorkspace: (workspace: string) => Promise<void>;
};

const SessionContext = createContext<SessionValue | undefined>(undefined);

export const SessionProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [vault, setVaultState] = useState<VaultData | null>(null);
  const [vaultKey, setVaultKey] = useState<string | null>(null);
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(5); // default 5 minutes
  const [lockOnBackground, setLockOnBackgroundState] = useState<boolean>(true); // default true: lock on app exit
  const [activeWorkspace, setActiveWorkspaceState] = useState<string>('Personal');
  const autoLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActiveTimeRef = useRef<number>(Date.now());
  const suppressBackgroundLockRef = useRef<boolean>(false);
  const router = useRouter();

  const vaultRef = useRef<VaultData | null>(vault);
  const vaultKeyRef = useRef<string | null>(vaultKey);
  const lockOnBackgroundRef = useRef<boolean>(lockOnBackground);
  const autoLockMinutesRef = useRef<number>(autoLockMinutes);

  useEffect(() => {
    vaultRef.current = vault;
  }, [vault]);
  useEffect(() => {
    vaultKeyRef.current = vaultKey;
  }, [vaultKey]);
  useEffect(() => {
    lockOnBackgroundRef.current = lockOnBackground;
  }, [lockOnBackground]);
  useEffect(() => {
    autoLockMinutesRef.current = autoLockMinutes;
  }, [autoLockMinutes]);

  // Load auto-lock, lock-on-background and workspace settings
  useEffect(() => {
    (async () => {
      try {
        const setting = await SecureStore.getItemAsync(AUTO_LOCK_TIMER_KEY);
        if (setting !== null) {
          setAutoLockMinutes(parseInt(setting, 10));
        }
        const lockBg = await isLockOnBackgroundEnabled();
        setLockOnBackgroundState(lockBg);
        const wsSetting = await SecureStore.getItemAsync(ACTIVE_WORKSPACE_KEY);
        if (wsSetting) {
          setActiveWorkspaceState(wsSetting);
        }
      } catch {}
    })();
  }, []);

  const updateAutoLockMinutes = async (minutes: number) => {
    setAutoLockMinutes(minutes);
    try {
      await SecureStore.setItemAsync(AUTO_LOCK_TIMER_KEY, minutes.toString());
    } catch {}
  };

  const updateLockOnBackground = async (enabled: boolean) => {
    setLockOnBackgroundState(enabled);
    await setLockOnBackgroundEnabled(enabled);
  };

  const setActiveWorkspace = async (workspace: string) => {
    setActiveWorkspaceState(workspace);
    try {
      await SecureStore.setItemAsync(ACTIVE_WORKSPACE_KEY, workspace);
    } catch {}
  };

  const purgeSessionMemory = (targetVault: VaultData | null) => {
    if (!targetVault) return;
    try {
      if (Array.isArray(targetVault.passwords)) {
        for (const item of targetVault.passwords) {
          item.password = '';
          item.username = '';
          item.service = '';
          if (item.notes) item.notes = '';
          if (item.loginPin) item.loginPin = '';
          if (item.transactionPin) item.transactionPin = '';
          if (item.otherPin) item.otherPin = '';
          if (item.totpSecret) item.totpSecret = '';
        }
        targetVault.passwords.length = 0;
      }
      if (Array.isArray(targetVault.cards)) {
        for (const card of targetVault.cards) {
          card.holderName = '';
          card.number = '';
          if (Array.isArray(card.fields)) {
            for (const f of card.fields) {
              f.value = '';
            }
            card.fields.length = 0;
          }
        }
        targetVault.cards.length = 0;
      }
      if (targetVault.user) {
        targetVault.user.email = '';
        targetVault.user.passwordHash = '';
        targetVault.user.passwordSaltHex = '';
      }
    } catch {}
  };

  const performLock = () => {
    purgeSessionMemory(vaultRef.current || vault);
    setVaultState(null);
    setVaultKey(null);
    vaultRef.current = null;
    vaultKeyRef.current = null;
    clearAutoLockTimer();
  };

  // Clear auto-lock timer
  const clearAutoLockTimer = () => {
    if (autoLockTimerRef.current) {
      clearTimeout(autoLockTimerRef.current);
      autoLockTimerRef.current = null;
    }
  };

  // Start auto-lock timer
  const startAutoLockTimer = () => {
    clearAutoLockTimer();
    
    if (autoLockMinutesRef.current > 0 && vaultRef.current && vaultKeyRef.current) {
      const timeoutMs = autoLockMinutesRef.current * 60 * 1000;
      autoLockTimerRef.current = setTimeout(() => {
        performLock();
        try {
          router.replace('/login');
        } catch (e) {
          // Router might not be ready
        }
      }, timeoutMs);
    }
  };

  // Reset auto-lock timer (called on user activity)
  const resetAutoLockTimer = () => {
    lastActiveTimeRef.current = Date.now();
    startAutoLockTimer();
  };

  // Suppress background auto-lock while external system pickers or the camera scanner are open
  const runWithBackgroundLockSuppressed = async <T,>(fn: () => Promise<T>): Promise<T> => {
    suppressBackgroundLockRef.current = true;
    try {
      return await fn();
    } finally {
      lastActiveTimeRef.current = Date.now();
      setTimeout(() => {
        suppressBackgroundLockRef.current = false;
        lastActiveTimeRef.current = Date.now();
      }, 600);
    }
  };

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background') {
        // App going to background - record time
        lastActiveTimeRef.current = Date.now();
        clearAutoLockTimer();
        if (
          !suppressBackgroundLockRef.current &&
          lockOnBackgroundRef.current &&
          vaultRef.current &&
          vaultKeyRef.current
        ) {
          performLock();
          try {
            router.replace('/login');
          } catch (e) {}
        }
      } else if (nextAppState === 'inactive') {
        clearAutoLockTimer();
      } else if (nextAppState === 'active') {
        // App coming to foreground
        if (!vaultRef.current || !vaultKeyRef.current) {
          try {
            router.replace('/login');
          } catch (e) {}
          return;
        }

        if (!suppressBackgroundLockRef.current && autoLockMinutesRef.current > 0) {
          const inactiveTime = Date.now() - lastActiveTimeRef.current;
          const lockThreshold = autoLockMinutesRef.current * 60 * 1000;
          
          if (inactiveTime >= lockThreshold) {
            // Lock immediately
            performLock();
            try {
              router.replace('/login');
            } catch (e) {}
            return;
          }
        }

        // Restart timer if still unlocked
        startAutoLockTimer();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  // Start timer when unlocked or settings change
  useEffect(() => {
    if (vault && vaultKey) {
      startAutoLockTimer();
    } else {
      clearAutoLockTimer();
    }

    return () => clearAutoLockTimer();
  }, [vault, vaultKey, autoLockMinutes]);

  const value = useMemo<SessionValue>(() => ({
    unlocked: !!vault && !!vaultKey,
    vault,
    vaultKey,
    autoLockMinutes,
    updateAutoLockMinutes,
    lockOnBackground,
    updateLockOnBackground,
    unlock: (v, k) => {
      setVaultState(v);
      setVaultKey(k);
      vaultRef.current = v;
      vaultKeyRef.current = k;
      lastActiveTimeRef.current = Date.now();
      runAutoBackup(v, { trigger: 'unlock' }).catch(() => {});
    },
    lock: () => {
      performLock();
    },
    setVault: (updater) => {
      if (!vaultRef.current) return;
      const updated = updater(vaultRef.current);
      setVaultState(updated);
      vaultRef.current = updated;
      runAutoBackup(updated, { trigger: 'change' }).catch(() => {});
    },
    resetAutoLockTimer,
    runWithBackgroundLockSuppressed,
    activeWorkspace,
    setActiveWorkspace,
  }), [vault, vaultKey, autoLockMinutes, lockOnBackground, activeWorkspace]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
};
