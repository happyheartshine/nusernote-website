'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getSessionFromStorage, saveSessionToStorage, removeSessionFromStorage } from '@/lib/sessionStorage';

export function useAuthProfile() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = async (userId) => {
    try {
      const { data, error: profileError } = await supabase.from('profiles').select('*').eq('id', userId).single();

      if (profileError) {
        throw profileError;
      }

      setProfile(data);
      setError(null);
    } catch (err) {
      setError(err);
      setProfile(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        // Get session from localStorage instead of Supabase
        const initialSession = getSessionFromStorage();

        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);

          if (initialSession?.user) {
            await fetchProfile(initialSession.user.id);
          }

          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err);
          setLoading(false);
        }
      }
    };

    initialize();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (mounted) {
        if (newSession) {
          // Save session to localStorage when auth state changes
          saveSessionToStorage(newSession);
        } else {
          // Remove session from localStorage when signed out
          removeSessionFromStorage();
        }
        
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          await fetchProfile(newSession.user.id);
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refetchProfile = async () => {
    if (user) {
      setLoading(true);
      await fetchProfile(user.id);
      setLoading(false);
    }
  };

  return {
    session,
    user,
    profile,
    loading,
    error,
    refetchProfile
  };
}
