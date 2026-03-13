// src/components/GoogleAuthButton.tsx
"use client";

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    // 優先從環境變數讀取，若無則從 LocalStorage 讀取手動設置的 ID
    const envId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const storedId = localStorage.getItem('vms_google_client_id');
    setRuntimeClientId(envId || storedId);

    // 檢查 LocalStorage 是否已有 Token
    const savedToken = localStorage.getItem('google_access_token');
    if (savedToken) {
      googleDriveService.setAccessToken(savedToken);
      googleSheetsService.setAccessToken(savedToken);
      setIsLoggedIn(true);
      fetchUserInfo(savedToken);
    }
  }, []);

  const fetchUserInfo = async (token: string) => {
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
  };

  const handleLogin = () => {
    const clientId = runtimeClientId;

    if (!clientId) {
      alert("找不到 Google Client ID。請先點擊齒輪圖標進行「連線設定」。");
      return;
    }

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
            alert('登入視窗已被關閉。如果您沒有手動關閉視窗，這可能是因為瀏覽器外掛（如 AdBlock）攔截了彈窗，或是您正在使用無痕分頁。請關閉攔截器後重試。');
          } else {
            alert(`驗證失敗: ${err.message || '未知錯誤'}。如果是權限不足(403)，請嘗試先「登出」後再重新連接。`);
          }
        }
      });
      // 強制彈出授權視窗，確保使用者看到新權限的勾選框
      client.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      console.error('Failed to initialize Google Auth:', err);
      alert('初始化 Google 驗證失敗。請確認您的 Client ID 是否正確，且已將此網址加入授權來源。');
    }
  };

  const handleLogout = () => {
    googleDriveService.setAccessToken('');
    googleSheetsService.setAccessToken('');
    localStorage.removeItem('google_access_token');
    setIsLoggedIn(false);
    setUser(null);
  };

  const handleSync = async () => {
    if (!isLoggedIn) return;
    setSyncing(true);
    try {
      await projectService.syncWithCloud();
    } finally {
      setSyncing(false);
    }
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
              <img 
                src={user.picture} 
                alt="User" 
                className="w-7 h-7 rounded-full border border-border" 
                referrerPolicy="no-referrer"
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
          <img 
            src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" 
            width={16} 
            height={16} 
            alt="Google" 
          />
          連接 Google Drive
        </button>
      )}
    </div>
  );
}
