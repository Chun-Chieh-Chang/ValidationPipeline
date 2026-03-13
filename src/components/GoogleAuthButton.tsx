// src/components/GoogleAuthButton.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { googleDriveService } from '@/lib/googleDriveService';
import { googleSheetsService } from '@/lib/googleSheetsService';
import { projectService } from '@/lib/projectService';
import { LogIn, LogOut, Cloud, CloudOff, RefreshCw, User } from 'lucide-react';

declare global {
  interface Window {
    google: any;
  }
}

import Image from 'next/image';

export default function GoogleAuthButton() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [runtimeClientId, setRuntimeClientId] = useState<string | null>(null);

  const [tokenClient, setTokenClient] = useState<any>(null);

  const handleSync = useCallback(async () => {
    if (!isLoggedIn) return;
    setSyncing(true);
    try {
      await projectService.syncWithCloud();
    } finally {
      setSyncing(false);
    }
  }, [isLoggedIn]);

  const fetchUserInfo = useCallback(async (token: string) => {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (e) {
      console.error('Failed to fetch user info', e);
    }
  }, []);

  useEffect(() => {
    // 優先從環境變數讀取，若無則從 LocalStorage 讀取手動設置的 ID
    const envId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const storedId = localStorage.getItem('vms_google_client_id');
    const clientId = envId || storedId;
    setRuntimeClientId(clientId);

    // 檢查 LocalStorage 是否已有 Token
    const savedToken = localStorage.getItem('google_access_token');
    if (savedToken) {
      googleDriveService.setAccessToken(savedToken);
      googleSheetsService.setAccessToken(savedToken);
      setIsLoggedIn(true);
      fetchUserInfo(savedToken);
    }

    // 初始化 Google Token Client
    if (clientId && window.google) {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.profile',
          callback: (response: any) => {
            if (response.access_token) {
              googleDriveService.setAccessToken(response.access_token);
              googleSheetsService.setAccessToken(response.access_token);
              localStorage.setItem('google_access_token', response.access_token);
              setIsLoggedIn(true);
              fetchUserInfo(response.access_token);
              handleSync();
            }
          },
          error_callback: (err: any) => {
            console.error('Google Auth Error:', err);
            if (err.type === 'access_denied') {
              alert('登入被拒絕。請確保已將您的帳號加入測試使用者名單。');
            } else if (err.type === 'popup_closed') {
              alert('登入視窗已被關閉。這通常是因為廣告攔截器攔截了彈窗，或者您在瀏覽器設定中「封鎖了第三方 Cookie」。請在瀏覽器設定中搜尋「Cookie」並允許 accounts.google.com。');
            } else {
              alert(`驗證失敗: ${err.message || '未知錯誤'}。如果是權限不足(403)，請嘗試先「登出」後再重新連接。`);
            }
          }
        });
        setTokenClient(client);
      } catch (err) {
        console.error('Failed to init Google client:', err);
      }
    }
  }, [runtimeClientId, handleSync, fetchUserInfo]);

  const handleLogin = () => {
    if (!runtimeClientId) {
      alert("找不到 Google Client ID。請先點擊齒輪圖標進行「連線設定」。");
      return;
    }

    if (!tokenClient) {
      alert("Google 驗證元件載入中或發生錯誤，請重新整理頁面。若持續發生，請檢查是否封鎖了 Google 腳本。");
      return;
    }

    try {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      console.error('Failed to request token:', err);
      alert('無法發起驗證請求。');
    }
  };

  const handleLogout = () => {
    googleDriveService.setAccessToken('');
    googleSheetsService.setAccessToken('');
    localStorage.removeItem('google_access_token');
    setIsLoggedIn(false);
    setUser(null);
  };

  return (
    <div className="flex items-center gap-2">
      {isLoggedIn ? (
        <div className="flex items-center gap-3 bg-surface p-1.5 rounded-xl border border-border">
          <button 
            onClick={handleSync}
            disabled={syncing}
            className={`p-2 rounded-lg hover:bg-background transition-all ${syncing ? 'text-pelagic animate-spin' : 'text-success'}`}
            title="手動同步雲端資料"
          >
            {syncing ? <RefreshCw size={18} /> : <Cloud size={18} />}
          </button>
          
          <div className="flex items-center gap-2 pr-2 border-r border-border/50 mr-1">
            {user?.picture ? (
              <Image 
                src={user.picture} 
                alt="Profile" 
                width={28}
                height={28}
                className="w-7 h-7 rounded-full border border-border" 
                unoptimized
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-pelagic/20 flex items-center justify-center text-pelagic">
                <User size={14} />
              </div>
            )}
            <span className="text-xs font-black text-foreground max-w-[80px] truncate">
              {user?.name || '已連接'}
            </span>
          </div>

          <button 
            onClick={handleLogout}
            className="p-2 text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
            title="登出 Google"
          >
            <LogOut size={18} />
          </button>
        </div>
      ) : (
        <button 
          onClick={handleLogin}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black font-black text-sm hover:bg-neutral-100 transition-all shadow-md border border-neutral-200"
        >
          <Image 
            src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" 
            width={16} 
            height={16} 
            alt="Google Logo" 
          />
          連接 Google Drive
        </button>
      )}
    </div>
  );
}
