# Google OAuth 2.0 Client ID 設置指引

為了讓 `ValidationPipeline` 能夠與 Google Drive 和 Sheets 進行雲端同步，您需要建立一個專屬的憑證身分。請按照以下步驟在 [Google Cloud Console](https://console.cloud.google.com/) 進行配置。

## 第一階段：建立專案與啟用 API

1.  **建立新專案**：
    *   點擊左上角的專案選單，選擇「**新增專案 (New Project)**」。
    *   輸入專案名稱（例如：`ValidationPipeline-Storage`），點擊「建立」。
2.  **啟用必要的 API**：
    *   進入「**API 和服務**」 > 「**程式庫 (Library)**」。
    *   搜尋並啟用以下兩項 API：
        *   `Google Drive API`
        *   `Google Sheets API`

---

## 第二階段：配置 Google 驗證平台 (OAuth 同意畫面)

1.  進入「**API 和服務**」 > 「**OAuth 同意畫面 (OAuth consent screen)**」。
2.  點擊中央藍色的 **「開始 (Get Started)」**（若介面不同，請選擇「外部 (External)」並點擊建立）。
3.  **應用程式資訊**：輸入 `ValidationPipeline` 並選擇您的信箱。
4.  **範圍 (Scopes)**：
    *   點擊「新增或移除範圍」。
    *   搜尋並勾選：`.../auth/drive.file` 與 `.../auth/spreadsheets`。
    *   點擊「更新」>「儲存並繼續」。
5.  **測試使用者 (Test Users) [極重要]**：
    *   點擊「新增使用者」。
    *   輸入 **您打算用來登入的 Gmail 地址**。
    *   *註：若未在此處加入，登入時會報錯 403: access_denied。*

---

## 第三階段：建立 OAuth 2.0 用戶端 ID

1.  進入選單中的「**憑證 (Credentials)**」或「**用戶端 (Clients)**」。
2.  點擊「**建立憑證**」 > 「**OAuth 用戶端 ID**」。
3.  **應用程式類型**：選擇「**網頁應用程式 (Web application)**」。
4.  **已授權的 JavaScript 來源**：
    *   新增 `http://localhost:3000` (開發用)
    *   新增 `https://chun-chieh-chang.github.io` (部署用)
5.  點擊「建立」後複製您的 **Client ID**。

---

## 團隊協作與權限 (Collaboration)

### 如果您沒有 Master Sheet 的編輯權限
*   如果您對共享檔案只有讀取權，同步寫入會失敗（403 Forbidden）。
*   **解決方案**：在系統的「連線設定」介面，點擊 **「另存我的副本」**。系統會自動建立一份副本到您的雲端硬碟，並將同步路徑切換為該副本 ID，您從此擁有完整讀寫權。

### 讓同仁也能登入
*   您必須在 GCP Console 的「測試使用者」名單中加入他們的 Gmail。
*   或者讓他們也建立一個自己的 Client ID 並貼入系統中使用。

---

## 故障排除 (Troubleshooting)

### 發生「403: Forbidden - Insufficient Scopes」
**原因**：目前的 `drive.file` 權限不足以讀取同仁分享給您的「現有資料夾」。
**解決方法**：
1.  我已將系統權限升級至 `https://www.googleapis.com/auth/drive` (完整存取權)。
2.  請在網頁上點擊 **「登出 (Logout)」**。
3.  重新點擊 **「連接 Google Drive」**，並在視窗中**務必勾選**「查看、編輯、建立及刪除您在 Google 雲端硬碟中的所有檔案」。
4.  點擊「繼續」後即可正常存取分享資料夾。

### 發生「403: access_denied」
代表登入的帳號未被列入「測試使用者」名單。請回到第二階段新增名單。
