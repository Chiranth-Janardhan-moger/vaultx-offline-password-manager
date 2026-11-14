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
  unlock: (vault: VaultData, vaultKey: string) => void;
  lock: () => void;
  setVault: (updater: (prev: VaultData) => VaultData) => void;
  resetAutoLockTimer: () => void;
  activeWorkspace: string;
  setActiveWorkspace: (workspace: string) => Promise<void>;
};

const SessionContext = createContext<SessionValue | undefined>(undefined);

export const SessionProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [vault, setVaultState] = useState<VaultData | null>(null);
  const [vaultKey, setVaultKey] = useState<string | null>(null);
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(0); // 0 = disabled
  const [activeWorkspace, setActiveWorkspaceState] = useState<string>('Personal');
  const autoLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActiveTimeRef = useRef<number>(Date.now());
  const router = useRouter();

  // Load auto-lock and workspace settings
  useEffect(() => {
    (async () => {
      try {
        const setting = await SecureStore.getItemAsync(AUTO_LOCK_TIMER_KEY);
        if (setting) {
          setAutoLockMinutes(parseInt(setting, 10));
        }
        const wsSetting = await SecureStore.getItemAsync(ACTIVE_WORKSPACE_KEY);
        if (wsSetting) {
          setActiveWorkspaceState(wsSetting);
        }
      } catch {}
    })();
  }, []);

  const updateAutoLockMinutes = async (minutes: number) => {
    setAutoLockMinutes(minutes);
    await SecureStore.setItemAsync(AUTO_LOCK_TIMER_KEY, minutes.toString());
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
    purgeSessionMemory(vault);
    setVaultState(null);
    setVaultKey(null);
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
    
    if (autoLockMinutes > 0 && vault && vaultKey) {
      const timeoutMs = autoLockMinutes * 60 * 1000;
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

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App going to background - record time
        lastActiveTimeRef.current = Date.now();
        clearAutoLockTimer();
      } else if (nextAppState === 'active') {
        // App coming to foreground - check if should lock
        if (vault && vaultKey && autoLockMinutes > 0) {
          const inactiveTime = Date.now() - lastActiveTimeRef.current;
          const lockThreshold = autoLockMinutes * 60 * 1000;
          
          if (inactiveTime >= lockThreshold) {
            // Lock immediately
            performLock();
            try {
              router.replace('/login');
            } catch (e) {
              // Router might not be ready
            }
          } else {
            // Restart timer with remaining time
            startAutoLockTimer();
          }
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [vault, vaultKey, autoLockMinutes, router]);

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
    unlock: (v, k) => {
      setVaultState(v);
      setVaultKey(k);
      lastActiveTimeRef.current = Date.now();
    },
    lock: () => {
      performLock();
    },
    setVault: (updater) => {
      if (!vault) return;
      setVaultState(updater(vault));
    },
    resetAutoLockTimer,
    activeWorkspace,
    setActiveWorkspace,
  }), [vault, vaultKey, autoLockMinutes, activeWorkspace]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
};
