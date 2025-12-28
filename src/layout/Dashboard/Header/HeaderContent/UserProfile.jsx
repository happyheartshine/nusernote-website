'use client';

// next
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useRef } from 'react';

// project imports
import SimpleBarScroll from '@/components/third-party/SimpleBar';
import { useDetectOutsideClick } from '@/components/useDetectOutsideClick';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthProfile } from '@/hooks/useAuthProfile';
import { supabase } from '@/lib/supabase';

// assets
const Avatar2 = '/assets/images/user/avatar-2.png';

// ==============================|| HEADER CONTENT - USER PROFILE ||============================== //

export default function HeaderUserProfile() {
  const router = useRouter();
  const pathname = usePathname();
  const { ref, isOpen, setIsOpen } = useDetectOutsideClick(false);
  const { signOut } = useAuth();
  const { profile } = useAuthProfile();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const logoutInitiated = useRef(false);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = async () => {
    // Prevent multiple logout attempts
    if (logoutInitiated.current || isLoggingOut) {
      return;
    }

    logoutInitiated.current = true;
    setIsLoggingOut(true);

    try {
      // Sign out from Supabase
      await signOut();
      
      // Wait for auth state to actually clear
      // Check session is cleared before redirecting
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      // Only redirect if not already on login page
      if (pathname !== '/login') {
        router.push('/login');
        // Force a hard refresh to clear all state
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Even on error, redirect to login
      if (pathname !== '/login') {
        router.push('/login');
        window.location.href = '/login';
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getRoleBadge = () => {
    if (!profile) return null;

    if (profile.role === 'admin') {
      return <span className="inline-flex items-center rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">管理者</span>;
    }
    return <span className="inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">看護師</span>;
  };

  return (
    <li className={`dropdown pc-h-item header-user-profile ${isOpen ? 'drp-show' : ''}`} ref={ref}>
      <a className="pc-head-link dropdown-toggle arrow-none me-0" data-pc-toggle="dropdown" href="#" role="button" onClick={toggleDropdown}>
        <i className="ph ph-user-circle"></i>
      </a>

      {isOpen && (
        <div className="dropdown-menu dropdown-user-profile dropdown-menu-end pc-h-dropdown overflow-hidden p-2">
          <div className="dropdown-header bg-primary-500 flex items-center justify-between px-5 py-4">
            <div className="mb-1 flex items-center">
              <div className="shrink-0">
                <Image src={Avatar2} alt="user-image" className="rounded-full" width={40} height={40} />
              </div>
              <div className="ms-3 grow">
                <h6 className="mb-1 text-white">{profile?.name || 'ユーザー'}</h6>
                <span className="text-sm text-white">{profile?.email || ''}</span>
                <div className="mt-1">{getRoleBadge()}</div>
              </div>
            </div>
          </div>
          <div className="dropdown-body px-5 py-4">
            <SimpleBarScroll className="profile-notification-scroll position-relative" style={{ maxHeight: 'calc(100vh - 225px)' }}>
              <a href="#" className="dropdown-item">
                <span>
                  <i className="ph ph-gear me-2 align-middle"></i>
                  <span>設定</span>
                </span>
              </a>
              <a href="#" className="dropdown-item">
                <span>
                  <i className="ph ph-lock-key me-2 align-middle"></i>
                  <span>パスワード変更</span>
                </span>
              </a>
              <div className="my-3 grid">
                <button onClick={handleLogout} className="btn btn-primary flex items-center justify-center">
                  <i className="ph ph-sign-out me-2 align-middle"></i>
                  ログアウト
                </button>
              </div>
            </SimpleBarScroll>
          </div>
        </div>
      )}
    </li>
  );
}
