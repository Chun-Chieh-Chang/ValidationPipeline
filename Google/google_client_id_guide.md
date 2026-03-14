# Google Client ID 五分鐘設定指南

這份清單將引導您使用個人 Google 帳戶建立專屬的 **Client ID**，讓您的應用程式具備穩定的雲端連線能力。

## 第一步：進入管理後台
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)。
2. 在頂部工具列點擊「選取專案」，然後點擊「**新建專案**」。
3. 命名為 `Injection-Pipeline-System`，點擊「建立」。

## 第二步：設定同意畫面 (OAuth Consent Screen)
這是在使用者登入時看到的權限確認頁面。
1. 在左側選單點擊「**API 和服務**」>「**OAuth 同意畫面**」。
2. User Type 選擇「**外部 (External)**」，點擊「建立」。
3. **應用程式資訊**：
   - 應用程式名稱：`Injection Pipeline`
   - 使用者支援電子郵件：填您的個人信箱。
   - 開發人員聯絡資訊：同樣填您的信箱。
4. 點擊「儲存並繼續」。
5. **範圍 (Scopes)**：
   - 點擊「新增或移除範圍」。
   - 在底部過濾器搜尋並勾選以下三個：
     - `.../auth/drive.file` (只存取由本程式建立的檔案)
     - `.../auth/spreadsheets` (讀寫試算表)
     - `.../auth/userinfo.profile` (顯示使用者姓名與頭像)
   - 點擊「新增」後，點擊「儲存並繼續」。
6. **測試使用者 (Test Users)**：
   - 點擊「ADD USERS」，填入您自己與同仁的 Google E-mail。
   - 點擊「儲存並繼續」。

## 第三步：建立憑證 (Credentials)
這會產生最重要的「身分證字號」。
1. 在左側選單點擊「**憑證**」。
2. 點擊頂部的「**建立憑證**」>「**OAuth 客戶端 ID**」。
3. 應用程式類型選擇「**網頁應用程式 (Web application)**」。
4. 名稱：`VMS-Web-App`。
5. **已授權的 JavaScript 來源** (非常重要)：
   - 點擊「新增 URI」，填入您的正式網址：`https://chun-chieh-chang.github.io`
   - 再點擊「新增 URI」，填入本地測試網址（選填）：`http://localhost:3000`
6. 點擊「建立」。

## 第四步：取得並測試
1. 彈出視窗會顯示「您的客戶端 ID」(例如 `12345-abcde.apps.googleusercontent.com`)。
2. **複製這串 ID**。
3. 回到您的應用程式網頁：
   - 點擊「設定 Google 並連接」。
   - 將 ID 貼入彈出的輸入框中。
   - 點擊確定，完成連線！

---

> [!TIP]
> **如何讓大家都能用？**
> 如果您希望全公司的人不用加「測試使用者名單」就能登入，請回到「OAuth 同意畫面」頁面，點擊「發布應用程式 (PUBLISH APP)」。這會將應用程式狀態從 Testing 切換到 Production。
