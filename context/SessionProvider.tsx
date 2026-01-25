import { VaultData } from '@/lib/vault';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

const AUTO_LOCK_TIMER_KEY = 'auto_lock_timer';

type SessionValue = {
  unlocked: boolean;
  vault: VaultData | null;
  vaultKey: string | null;
  unlock: (vault: VaultData, vaultKey: string) => void;
  lock: () => void;
  setVault: (updater: (prev: VaultData) => VaultData) => void;
  resetAutoLockTimer: () => void;
};

const SessionContext = createContext<SessionValue | undefined>(undefined);

export const SessionProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [vault, setVaultState] = useState<VaultData | null>(null);
  const [vaultKey, setVaultKey] = useState<string | null>(null);
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(0); // 0 = disabled
  const autoLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActiveTimeRef = useRef<number>(Date.now());
  const router = useRouter();

  // Load auto-lock setting
  useEffect(() => {
    (async () => {
      const setting = await SecureStore.getItemAsync(AUTO_LOCK_TIMER_KEY);
      if (setting) {
        setAutoLockMinutes(parseInt(setting, 10));
      }
    })();
  }, []);

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
        setVaultState(null);
        setVaultKey(null);
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
            setVaultState(null);
            setVaultKey(null);
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
    unlock: (v, k) => {
      setVaultState(v);
      setVaultKey(k);
      lastActiveTimeRef.current = Date.now();
    },
    lock: () => {
      setVaultState(null);
      setVaultKey(null);
      clearAutoLockTimer();
    },
    setVault: (updater) => {
      if (!vault) return;
      setVaultState(updater(vault));
    },
    resetAutoLockTimer,
  }), [vault, vaultKey]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
};
