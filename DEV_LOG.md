## [2026-03-14] 全局一致性與雙向同步強化 (Horizontal Expansion v4.2)

### 背景 (Background)
為確保全系統具備最高等級的邏輯嚴密性，執行了「水平展開檢查」。發現部分欄位（如 ECR/ECN Date, Cloud Link）雖可匯入且在 UI 呈現，但在「編輯屬性」後無法正確推送到雲端，且 UI 層級仍存有魔術字串。

### 核心變更 (Key Changes)
- **雙向數據完整性 (Bidirectional Integrity)**:
  - 修正 `googleSheetsService.ts`。現在「ECR 日期」、「ECN 日期」與「雲端資料連結」在寫回 Master Sheet 時均具備完整的索引對應。
- **全局選單常數化 (Menu SSoT)**:
  - **專案類型**: 統一使用 `PROJECT_TYPES` (設變、新模、移模、修模)。
  - **優先度**: 統一使用 `PRIORITY_LABELS` (1~4 映射至文字)。
  - **模態視窗重構**: 徹底移除 `CreateProjectModal` 與 `EditProjectModal` 中的硬編碼 `<option>`，確保未來類型增減只需修改 `constants.ts` 一處。
- **強健性修復 (Robustness)**:
  - 修復了重構過程中導致的數個 JSX 結構損壞 (Redundant Div) 與型別初始化錯誤。

---

## [2026-03-14] 權責部門不連動修復與數據鏈條建立 (v4.1)

### 背景 (Background)
使用者回報「權責部門」在大數據流轉中發生斷裂，建案與編輯視窗的欄位定義不一致，導致數據無法跨層級連動。

### 核心變更 (Key Changes)
- **架構擴展**:
  - 在 `ProjectData` 中新增 `dept` (權責部門) 核心欄位。
  - `googleSheetsService.ts`: 實作「權責部門」的雙向映射，支援從總表抓取與回傳。
- **UI 對齊**:
  - `CreateProjectModal`: 偵測到案號時自動抓取總表部門資訊並預填。
  - `EditProjectModal` & `TaskModal`: 清理所有硬編碼部門文字，改為引用全域常數。

---

## [2026-03-14] 全局邏輯架構與單一事實來源 (SSoT) 優化 (v4.0)

### 背景 (Background)
為解決跨組件邏輯斷裂與跑馬燈同步滯後問題，將分散各處的業務邏輯、魔術字串 (Magic Strings) 與副作用更新重構為「單一事實來源」與「衍生數據模式」。

### 核心變更 (Key Changes)
- **單一事實來源 (SSoT)**:
  - 建立 `src/lib/constants.ts`。所有任務狀態 (`TASK_STATUS`)、專案狀態 (`PROJECT_STATUS`) 與部門名單 (`DEPARTMENTS`) 均由該檔案統一定義，確保 UI 顯示與邏輯判斷完全對齊。
- **衍生數據模式 (Derived Data Pattern)**:
  - **即時通知引擎**: 重構 `page.tsx`。跑馬燈通知不再儲存於 `ProjectData.notifications` 資料庫，而是改用 `useMemo` 基於現有任務列表即時生成的「衍生數據」。
  - **無感同步**: 任何任務內容、日期或狀態的變動，都會立即使跑馬燈通知在毫秒級別完成更新，徹底解決手動更新的延遲與邏輯斷層。
- **類型安全性 (Type Safety)**: 導入嚴格的 TypeScript 型別限制狀態流轉，杜絕因拼字錯誤或未定義狀態導致的系統異常。

---

## [2026-03-14] 專案詳情編輯與 Master Sheet 實時同步強化 (v3.6)

### 背景 (Background)

使用者指出系統核心本質為「多專案管理工具」，需要更強大的編輯與數據同步能力。先前版本中，專案細節與 WBS 任務一旦建立即難以更改，且與雲端「總表 (Master Sheet)」的連動僅限於初次匯入。

### 核心變更 (Key Changes)

- **跑馬燈實時同步優化 (Ticker Sync v3.8)**:
  - **智慧更新邏輯**: 在 `page.tsx` 中重構 `refreshAutoReminders`。現在會動態偵測任務名稱、負責部門、預計日期的變動，並自動更新或刪除對應的通知，解決資訊滯後 (Sync Lag) 與數據不一致問題。
  - **狀態連動清除**: 當任務標記為「已完成」或日期延後至提醒窗口外時，系統會自動移除相關的跑馬燈提醒。
- **Master Sheet 數據定義對齊 (Field Alignment v3.7)**:
- **Master Sheet 實時連動引擎 (Sync Engine v3.6)**:
  - `projectService.ts`: 升級 `findByProjectNo` 邏輯。現在當使用者在「新增專案」輸入模具號碼時，系統會優先穿透至雲端總表進行資料預填 (Pre-fill)，確保數據一致性。
- **全功能編輯套件 (Editing Suite)**:
  - **`EditProjectModal.tsx`**: 實作專案基本屬性編輯，包含：模具號碼、品號、版次、負責人、ECR/ECN 資訊及雲端連結。
  - **`TaskModal.tsx`**: 實作 WBS 任務管理，支援「新增任務」與「修改現有任務」，包含權責單位、計畫日期、開始日期、交付物與進度百分比。
  - **詳情頁整合 (`page.tsx`)**: 完整對接上述 Modal，並復原了因工具操作失誤導致的代碼損壞（處理了 401 Session 與 403 權限防禦邏輯）。
- **多專案管理與數據鍊條 (Data Integrity & Logical Chain)**:
  - **數據可追溯性**: 在 `ProjectData` Schema 中標準化 `master_sheet_id` 與 `last_master_sync` 欄位，確保每筆資料皆具備清晰的來源證明。
  - **詳情頁「Source Chain」指示器**: 在專案細節頁面 header 增加 Master Sheet 直連圖標與同步時間顯示，實作「邏輯鍊條」的可視化。
  - **建立流程鎖定**: 強化 `CreateProjectModal.tsx`，確保在自動預填 (Auto-fill) 時同步鎖定來源 ID，防止數據鍊條在中途斷裂。
- **UI/UX 魯棒性強化**:
  - 全面清理 `TaskModal` 與 `EditProjectModal` 中的 Tailwind Lint 錯誤（修復 `flex`/`block` 渲染衝突）。
  - 修復 `page.tsx` 因佈局重構導致的 JSX 結構損壞，確保在 4k 與手機螢幕下皆具備極致的穩定性。

### 成果 (Outcome)

- [x] 成功將系統從「唯讀/有限編輯」轉型為「全生命週期多專案管理工具」。
- [x] **建立即還原 (Create-as-Restore)**：升級 `CreateProjectModal.tsx`，在輸入案號時自動觸發 `onBlur` 查詢，補完所有 Master Sheet 欄位 (ECR/ECN Date, Cloud Link, Start Date)，實現「總表數據實時恢復」。
- [x] 解決了 401/403 等 Google API 穩定性問題，確保 Session 過期時能自動引導重新授權。
- [x] 完成 WBS 任務的實時更新邏輯，支援進度回報與狀態切換。

---

## [2026-03-14] Google Drive Browser 實作與 UI 閱讀體感優化 (v3.5)

### 背景 (Background)

使用者反映在同步至唯讀 Master Sheet 時出現 `403 Forbidden` 錯誤，且希望能有更直覺的方式「另存/選擇路徑」。同時指出「連線設定」介面部分字體過小（10px/12px），在深色背景下難以識別。

### 核心變更 (Key Changes)

- **UI 閱讀性與導引強化 (UX Optimization)**:
  - 根據全域規範，將 `ConnectionSettingsModal` 中所有低於 14px 的字體提升至 `text-sm` (14px) 或 `text-xs` (12px, 用於次要標籤)。
  - 放大 Icon 尺寸（從 14px 提升至 16px/18px/24px），增加點擊精確度。
  - **新增「如何使用？」導引按鈕**：在設定標題旁加入 `Info` 圖標，點擊後會展開互動式操作教學。
  - **體系化結構導引 (Structured Logic)**：將「連線設定」重構為 3 個邏輯步驟：1. 基礎認證、2. 個人存檔空間、3. 團隊報表匯出，並加入數字指標與視覺卡片區隔。
  - **佈局防呆 (Layout Protection)**：修正「說明按鈕」與「關閉按鈕」位置衝突重疊的問題。
- **Google Drive 瀏覽器實作**:
  - `googleDriveService.ts`: 新增 `listFiles` 與 `getFileMetadata`，支援遞迴列出資料夾內容與檔案類型過濾。
  - `ConnectionSettingsModal.tsx`: 深度重構，整合「雲端瀏覽器」介面。
    - 支援多層級資料夾導航、麵包屑路徑顯示。
    - 針對「資料夾 ID」與「試算表 ID」分別提供專屬的挑選器，自動填入所選 ID。
- **403 錯誤引導強化**:
  - `googleSheetsService.ts`: 針對 403 錯誤新增具體中文導引，提示使用者 Master Sheet 權限不足，並引導使用「另存副本」功能。
- **類型系統優化**:
  - 修正 `GoogleDriveFile` 介面，補齊 `mimeType` 定義，消除 IDE 型別報錯。

### 成果 (Outcome)

- [x] 成功實作 GUI 挑選雲端路徑功能，大幅降低配置難度。
- [x] 為 403 權限問題提供明確的解決路徑，減少用戶挫折感。
- [x] 保持與 Deep Sea 主題的高一致性視覺體驗。

---

## [2026-03-13] Remote Sync & Update (v2.7)

### 背景 (Background)

執行例行性遠端同步，將本地環境更新至最新版本 (`a9a82fe`)。

### 核心變更 (Key Changes)

- **遠端同步 (GitHub Sync)**:
  - 成功執行 `git pull`，包含 `googleSheetsService.ts` 與 `googleDriveService.ts` 等核心服務的更新。
  - 解決了 `DEV_LOG.md` 的合併衝突。
- **環境狀態**:
  - 本地倉庫現已與 `origin/main` 保持一致。

### 成果 (Outcome)

- [x] 成功套用 6 個遠端 Commit。
- [x] 解決檔案衝突，確保開發日誌完整性。

---

## [2026-03-13] JSON 還原流程優化 - 非同步雲端備份 (v3.4)

### 背景 (Background)

使用者反映在執行「JSON 還原」時，若雲端資料夾權限不足，會導致整個還原流程失敗報錯。雖然本機資料可能已寫入 LocalStorage，但 UI 會顯示錯誤，且阻斷後續操作。

### 核心變更 (Key Changes)

- **還原流程容錯**:
  - `projectService.ts`: 將 `importData` 中的 `syncWithCloud` 調用放入 `try-catch` 區塊。
  - **邏輯調整**: JSON 還原現在以「本機成功」為最高優先。即便雲端備份因權限 (403) 失敗，系統僅會在 Console 紀錄警告，不再向用戶拋出錯誤中斷流程。

### 成果 (Outcome)

- [x] 確保「本機還原」不再被「雲端權限」綁架。
- [x] 使用者可以先完成本機還原，再悠閒地去設定個人雲端路徑。

---

## [2026-03-13] 個人存檔資料夾功能與資料夾 403 修復 (v3.3)

### 背景 (Background)

使用者反映在同步至他人分享的資料夾時出現 `403 Forbidden (Insufficient permissions for the specified parent)`。這是因為預設資料夾對使用者只有「檢視」權限，無法寫入新的同步 JSON。

### 核心變更 (Key Changes)

- **資料夾建立功能**:
  - `googleDriveService.ts`: 新增 `createFolder()` 方法。
  - `ConnectionSettingsModal.tsx`: 為「專案儲存資料夾 ID」新增「建立我的存檔資料夾」按鈕。點擊後會在使用者根目錄建立專屬資料夾並自動綁定。
- **文檔指引優化**:
  - `Google/google_setup_guide.md`: 新增專章說明資料夾權限與 Sheet 權限的差異，並指引如何建立個人存檔路徑。

### 成果 (Outcome)

- [x] 提供解決方案讓使用者即便在唯讀共享環境下也能擁有自己的同步存檔空間。
- [x] 完成 v3.3 打包與推送。

---

## [2026-03-13] Google Auth 初始化穩定性優化 (v3.1)

### 背景 (Background)

使用者反映 `Popup window closed` 錯誤持續發生。經診斷，原先在點擊時才初始化 Google Client 的做法不夠穩定，容易受到瀏覽器異步載入或安全策略干擾。

### 核心變更 (Key Changes)

- **初始化邏輯重構**:
  - `GoogleAuthButton.tsx`: 改為在 `useEffect` 中僅初始化一次 `tokenClient`，點擊僅觸發 `requestAccessToken`。這符合 Google 官方最佳實踐，能顯著提升彈窗通訊的穩定性。
- **錯誤引導精準化**:
  - 更新錯誤訊息與 `google_setup_guide.md`，將「封鎖第三方 Cookie (Third-party Cookies)」列為優先排除項，這是導致 GIS 彈窗自動關閉的最常見原因。

### 成果 (Outcome)

- [x] 提升 Google 登入元件的強健度。
- [x] 完成 v3.1 打包與推送。

---

## [2026-03-13] Google Auth 彈窗攔截診斷與 COOP 優化 (v3.0)

### 背景 (Background)

使用者反映在登入時遇到 `Popup window closed` 以及 `Cross-Origin-Opener-Policy` 錯誤。這通常是因為瀏覽器安全性設定（如廣告攔截器或無痕模式）封鎖了 Google 驗證視窗與主程式的通訊。

### 核心變更 (Key Changes)

- **自動診斷優化**:
  - `GoogleAuthButton.tsx`: 在 `error_callback` 中新增 `popup_closed` 專屬處理邏輯。當彈窗被攔截或非手動關閉時，主動提示使用者檢查「廣告攔截器」與「無痕模式」。
- **文檔指引強化**:
  - `Google/google_setup_guide.md`: 新增「COOP 與彈窗錯誤」專章，提供針對 Chrome、Edge 與 Brave 瀏覽器的排除建議。

### 成果 (Outcome)

- [x] 提供更友善的錯誤引導，減少使用者因瀏覽器環境設定導致的連線挫折。
- [x] 完成 v3.0 代碼打包並推送至 GitHub。

---

## [2026-03-13] Google Drive 存取範圍升級與 403 熱修復 (v2.9)

### 背景 (Background)

使用者反映在存取同仁分享的資料夾時出現 `403 Forbidden (Request had insufficient authentication scopes)`。經診斷，原先使用的 `drive.file` 權限限制過大，無法搜尋非本應用程式建立的外部共用資料夾。

### 核心變更 (Key Changes)

- **存取範圍升級**:
  - `GoogleAuthButton.tsx`: 將 OAuth Scope 從 `drive.file` 升級為 `https://www.googleapis.com/auth/drive` (完整存取)。
  - `googleDriveService.ts`: 同步更新內部 `SCOPES` 常量。
- **引導文檔更新**:
  - `Google/google_setup_guide.md`: 新增 403 錯誤診斷，引導使用者重新登入並勾選「存取所有檔案」權限。

### 成果 (Outcome)

- [x] 成功解決無法在他人分享的資料夾中搜尋/建立 `vms_data.json` 的權限瓶頸。
- [x] 完成代碼打包並準備推送至 GitHub 觸發自動部署。

---

## [2026-03-13] Google API 權限修復與「另存副本」功能實作 (v2.8)

### 背景 (Background)

使用者在同步 Google Sheets 時遇到 `403 Forbidden (Insufficient Scopes)` 錯誤，且因 Master Sheet 權限屬於他人，導致無法直接寫入。需要一種機制讓使用者能快速建立自己的存檔副本。

### 核心變更 (Key Changes)

- **權限引導優化**:
  - `GoogleAuthButton.tsx`: 新增 `prompt: 'consent'` 參數，強制 Google 彈出授權視窗，確保使用者能看到並手動勾選新權限。
  - 優化錯誤提示，引導使用者處理 403 範圍不足的問題。
- **「另存個人副本」功能實作**:
  - `googleDriveService.ts`: 新增 `copyFile` 服務，支援跨帳號複製試算表。
  - `ConnectionSettingsModal.tsx`: 為 Master Sheet ID 加入「另存我的副本」按鈕，實作一鍵備份並自動切換同步路徑。
- **文件更新**: 
  - 更新 `google_setup_guide.md`，加入針對 `403 Forbidden` 與 `access_denied` 的詳細故障排除步驟。

### 成果 (Outcome)

- [x] 解決了 Google Sheets API 權限範圍不足導致的同步失敗問題。
- [x] 提供「另存副本」解決方案，讓無原始檔案編輯權的使用者也能擁有自己的雲端資料庫。
- [x] 通過本地 Build 驗證，功能與 UI 完全相容。

---

## [2026-03-13] Auto-Pilot & Connection Settings Refinement (v2.6)

### 背景 (Background)

為了進一步簡化團隊使用門檻，使用者希望能達成「登入即用」的自動駕駛體驗。系統需預設好公司共用的 Master Sheet 與雲端資料夾路徑，同時保留「開放編輯」的彈性，讓管理者能在 UI 中直接修改這些連線參數，而無需透過 URL 參數或修改代碼。

### 核心變更 (Key Changes)

- **自動駕駛模式 (Auto-Pilot Flow)**:
  - 在 `googleDriveService.ts` 與 `googleSheetsService.ts` 中置入系統預設 ID。
  - 當預設 ID 存在時，匯出與匯入功能將不再彈窗詢問，實現真正的「一鍵同步」。
- **連線設定中心 (Connection Settings UI)**:
  - 實作 `ConnectionSettingsModal.tsx`: 整合 Google Client ID、儲存資料夾 ID 與 Master Sheet ID 的統一配置介面。
  - **持久化覆蓋 (Persistent Overrides)**: 使用者在設定面板中修改的路徑會儲存於 `LocalStorage`，優先級高於系統預設值，解決了「預設路徑需可開放編輯」的需求。
- **Dashboard UI 優化**:
  - 新增「連線設定」齒輪按鈕。
  - 優化「匯入 Master」按鈕組，新增「在新分頁開啟總表」快捷圖標，方便使用者編輯後直接回傳。
  - 簡化 `GoogleAuthButton`: 移除冗餘的 Reset 邏輯與 Prompt，將配置功能收納至設定中心。

### 成果 (Outcome)

- [x] 達成「登入 Google 帳號後即可直接編輯與同步」的極簡化體驗。
- [x] 保留了路徑的可自定義性，滿足特殊專案切換不同資料庫的需求。
- [x] 成功通過建置驗證與靜態部署相容性測試。

---

## [2026-03-13] Google Auth Client ID Hotfix (v2.3)

### 背景 (Background)

在 GitHub Pages 部署後，發現因環境變數 `NEXT_PUBLIC_GOOGLE_CLIENT_ID` 未在建置時嵌入，導致 Google Identity Services 初始化時報錯 `Missing required parameter client_id`。

### 核心變更 (Key Changes)

- **動態設定機制實作**:
  - `GoogleAuthButton.tsx`: 新增執行時提示 (Runtime Prompt)。若偵測不到環境變數，則主動請求使用者輸入 Client ID 並儲存於 `LocalStorage`。
  - **持久化配置**: 支援跨頁面重新整理保留 Client ID，並提供重設按鈕以便更換 Project。
- **錯誤防禦**:
  - 增加 `initTokenClient` 的 try-catch 與自定義錯誤回報，防止全站崩潰。

### 成果 (Outcome)

- [x] 解決靜態部署環境下的環境變數缺失問題。
- [x] 提升系統在不同 Google Cloud Project 間切換的靈活性。

---

## [2026-03-13] Google Drive Backend & Team Collaboration Implementation

### 背景 (Background)

使用者要求將 Google Drive 作為應用程式的無伺服器後端 (Serverless Backend)，以解決 GitHub Pages 靜態部署無法持久化儲存資料的問題。此外，系統需支援「多人協作模式」，允許同仁在管理者授權下於同一份中央資料庫進行讀寫。

### 核心變更 (Key Changes)

- **Google API 服務層實作**:
  - `googleDriveService.ts`: 實作資料夾定位、JSON 檔案讀寫邏輯，支援 `targetFolderId` 參數鎖定。
  - `googleSheetsService.ts`: 實作數據映射邏輯，支援直接同步至指定試算表。
- **混合存儲與同步邏輯 (v2.1)**:
  - 更新 `projectService.ts`：當使用者連接 Google 帳戶後，系統會自動在每次保存/更新時將 LocalStorage 資料同步至雲端，達成跨裝置資料一致性。
- **多人協作架構 (v2.2 - Shared Mode)**:
  - **URL 參數定位**: 支援 `?folderId=...&sheetId=...`。當網址包含這些 ID 時，系統會自動切換為「Shared Team Mode」，所有同仁會讀寫同一個管理者分享的雲端目錄。
  - **權限與錯誤處理**: 針對「存取被拒 (403/404)」加入詳細提示，引導同仁向管理者確認資料夾共用權限。
- **UI/UX 雲端化**:
  - Dashboard 整合 `GoogleAuthButton`：使用 Google Identity Services (GIS) 進行 OAuth2 認證，顯示使用者資訊並提供手動同步按鈕。
  - 介面標示：當處於多人協作模式時，Header 會顯示 `Shared Team Mode` 標籤與 `Users` 圖示。
  - **匯出功能升級**: 原本的「匯出總表」在連線狀態下會變更為「雲端同步總表」，一鍵將資料寫入 Google Sheets。

### 成果 (Outcome)

- [x] 成功將應用程式轉型為以 Google Drive 為後端的「雲端 Web App」。
- [x] 成功通過 `npm run build` 驗證，完全符合 GitHub Pages 靜態導出標準。
- [x] 實作了靈活的多人協作架構，降低了團隊部署複雜度。

---

## [2026-03-13] GitHub Synchronization Verification

### 背景 (Background)

執行例行性遠端同步檢查，確保本地開發環境與 GitHub 倉庫 (`chun-chieh-chang/ValidationPipeline`) 保持一致。

### 核心變更 (Key Changes)

- **同步狀態確認**: 執行 `git fetch` 與 `git status` 驗證。
- **版本比對**: 
  - 本地 HEAD: `028880d59dfc446f99b53d5c7ce2225eaf338527`
  - 遠端 origin/main: `028880d59dfc446f99b53d5c7ce2225eaf338527`
- **結論**: 系統已處於最新狀態，無須執行 `git pull`。

### 成果 (Outcome)

- [x] 成功驗證本地與遠端同步狀態。
- [x] 確認系統穩定性與版本一致性。

---

## [2026-03-06] Deep Sea Theme Consolidation & Readability Overhaul

### 背景 (Background)

使用者要求進一步精煉介面，移除所有亮色主題，僅保留具備高對比度的 Deep Sea (深海) 主題。同時要求全站字體大小不得小於 14px，並移除所有交錯背景 (Zebra Striping) 以確保視覺高度一致。

### 核心變更 (Key Changes)

- **主題鎖定**: 更新 `globals.css`，將 Deep Sea 變數移至 `:root`，並移除 `pipeline-light` 與 `github-light` 定義。
- **組件清理**:
  - 刪除 `src/components/ThemeToggle.tsx` 元件。
  - 移除 Dashboard 與 Project View 中的 `ThemeToggle` 引用。
  - 移除 `layout.tsx` 中的主題初始化腳本，徹底規避亮色主題閃爍。
- **字體規範化**:
  - 執行全域掃描，將所有 `text-[10px]` 至 `text-[13px]` 及 `text-xs` (12px) 統一提升至 `text-sm` (14px)。
  - 特別針對淺灰色日期與標籤進行對比度強化。
- **佈局優化**: 移除甘特圖與 WBS 表格中的 `groupThemes` 交錯背景邏輯，改為純色深邃背景 (`bg-surface`)。

### 成果 (Outcome)

- [x] 成功鎖定 Deep Sea 單一主題。
- [x] 全站文字符合 14px 閱讀標準。
- [x] 介面視覺達成高度統一，移除所有視覺干擾（如交錯行）。
- [x] 建置測試 (`npm run build`) 成功通過，無型別或 Lint 錯誤。

---

## [2026-03-06] UI De-transparency Optimization

### 背景 (Background)

使用者要求移除所有介面元素的透明效果（Transparency/Backdrop-blur），改為純色背景與邊框，以提升視覺穩重感並符合 Color Master Palette。

### 核心變更 (Key Changes)

- **環境設定**: 更新 `tailwind.config.ts` 定義 `surface` (#1E293B), `background` (#0F172A), 與 `border` (#334155)。
- **全域樣式**: 修改 `globals.css` 移除磨砂玻璃效果與透明色標。
- **重構 Dashboard (`page.tsx`)**:
  - 移除所有 `backdrop-blur`、`bg-opacity` 與 `/[opacity]` 代碼。
  - 將專案卡片與表格行背景改為 `bg-[#1E293B]` 或 `bg-[#0F172A]`。
- **重構專案詳情頁 (`projects/view/page.tsx`)**:
  - 更新 Header、通知列、WBS 表格與甘特圖。
  - 甘特圖進度條改為飽和度較高之實色背景（如 `#064E3B`, `#0C4A6E`）。
- **重構彈窗元件 (`Modals`)**:
  - 遮罩層改為 `bg-[#020617]` (不透明) 或深色實色。
  - 修復因工具誤操作導致的 JSX 結構損壞。

### 成果 (Outcome)

- [x] 成功移除全站透明效果。
- [x] 介面對比度大幅提升，符合資深架構師與藝術總監之審美標準。
- [x] 解決了多處潛在的視覺回歸風險。
- [x] 1. 實作 Excel 解析與匯入 API (`POST /api/import`)，使用 `xlsx` 並支援 Transaction 以防部分失敗。
- [x] 4. **資料庫欄位擴充**：專案表需要能儲存更多 Master 資訊 (如：Purpose, Owner, ECR No. 等等)。
- [x] 5. **開發與跑通驗證**：確保所有的改動不破壞原有的專案卡片列表與任務詳情，同時新增的欄位能在前端正確呈現。
- [x] 6. **甘特圖與關鍵路徑 (Critical Path)**：解析 `depends_on` (前置任務) 欄位，以此為基礎建立任務間的關聯，並在前端計算並標示出「關鍵路徑 (Critical Path)」任務，同時透過卡控機制防止未達前置條件的任務被意外執行。
- [x] 8. **強健性優化 (Robustness Fixes)**：針對 Excel 匯入邏輯進行了「模糊匹配」優化，解決了因 Excel 分頁名稱包含後綴（如 `MT20218R1-9035`）或欄位名稱包含換行符號而導致匯入失敗的問題。
- [x] 9. **程序 (Phases) 導入與呈現**：完整對接 Master Sheet 中的 `PD`, `FA`, `OQ`, `PQ`, `EC`, `圖面進版` 六大程序指標，並在 Dashboard 與專案詳情頁面中以「狀態燈」形式直觀顯示各階段完成度。
- [x] 10. **全資訊完整顯示 (Complete Data Display)**：補齊了 `ECR 編號/日期`、`專案目的`、`交付物名稱` 及 `任務百分比進度` 等缺失資訊，確保 Web 介面能 100% 還原 Excel 檔案中的所有管理維度。
- [x] 11. **資料匯出 (Data Export)**：已完成。支援匯出單案詳細報表（含 WBS 與交付物）以及全系統專案清單總表。
- [x] 12. **管理流程優化 (Workflow Enhancements)**：支援手動切換程序狀態 (Phases Click-to-toggle)、手動結案/重啟專案，並預設 Google Sheet 匯入連結（減少重輸入）。
- [x] 13. **Master Sheet 同步引擎重構 (Engine v2)**：針對 Excel 合併儲存格 (Merged Cells) 進行重構，實作「雙行標題掃描」與「專案群組化 (Group-by-Project)」邏輯。此更新徹底解決了合併單元格匯入時的空列覆蓋問題，確保程序燈號 (PD, FA, OQ 等) 的核取狀態能 100% 準確對接。
- [x] 14. **介面原稿忠實度優化 (Layout Fidelity)**：全面還原 Master Sheet 欄位名稱（如「工程圖面版次」、「發出者」、「雲端資料 (連結)」等），移除自行添加的括號說明。
- [x] 15. **全表格格線系統 (Subtle Grid System)**：在 Dashboard 與 WBS 詳情頁面加入 `border-white/5` 微光格線，並優化欄位分配寬度，確保在「忠於原稿」的基礎上維持極致的高級感。
- [x] 16. **數據序位保存 (Order Preservation)**：新增 `import_order` 機制，確保首頁表格排序與 Master Sheet 載入順序完全一致。
- [x] 17. **全介面 14px 規範化 (Font Scale standard)**：移除全專案所有 `text-xs` (12px) 與小型字體，統一提升至 `text-sm` (14px)，解決閱讀疲勞問題。
- [x] 18. **混合存儲架構實作 (Hybrid Storage - Option B/A)**：為了支援 **GitHub Pages (靜態部署)**，實作了 `projectService.ts` 中介層。系統現在優先嘗試 API (方案 A)，失敗時自動切換至 `LocalStorage` (方案 B)，確保靜態部署下資料仍可持久化。
- [x] 19. **通知系統重構 (Notification Relocation)**：應使用者需求將「部門簽核與交接通知」從右側面板移至頂部 Header 紅框位置，並改為水平滾動高亮列，成功釋放側邊空間讓主內容寬度擴展至 `max-w-[98%]`。
- [x] 20. **自動化部署 (CI/CD)**：建立 `.github/workflows/nextjs.yml` 並配置 `output: 'export'`，支援透過 GitHub Actions 自動部署至 Pages。
- [x] 21. **靜態路由重構 (Static Route Bypass)**：將 `/projects/[id]` 徹底改為 `/projects/view?id=...` 格式。解決了 GitHub Pages 不支援動態路由的問題，並透過 `useSearchParams` 在客戶端完成資料注入。
- [x] 22. **API 路由完全隔離 (API Isolation Strategy)**：將 `src/app/api` 移除出 `app` 目錄（更名為 `_api_routes_backup`）。徹底規備了 Next.js 定義的 `export` 模式下禁止 API 路徑的限制，同時保留代碼供未來方案 A 切換。
- [x] 23. **純前端的 Excel 解析引擎 (Client-side Excel Parser)**：解決了靜態導出環境下無法使用 `/api/import` 導致的 404 與 500 錯誤。將後端的 WBS 解析邏輯無縫移植至 `src/lib/excelParser.ts`，實作了全瀏覽器端的直接匯入。
- [x] 24. **多層次 CORS 代理備援引擎 (Multi-Proxy Fallback Chain)**：針對 Google Sheets 的嚴格 CORS 跨來源存取限制，實作了包含 `api.codetabs.com`, `api.allorigins.win`, `corsproxy.io` 的自動遞補備援機制，確保在 GitHub Pages 模式下仍能以最快效率直接解析外部網址。
- [x] 25. **靜態環境環境變數防禦 (Static ENV Guard)**：導入 `USE_API` 檢查，徹底清除任何環境誤觸發生 404 或跳出 Unhandled Rejection 報測的可能，保持乾淨的主控台。
- [x] 26. **進度提示通知功能修復 (Progress Notification Restoration)**：修復了匯入功能中被隱藏的進度提示。在 `ImportModal.tsx` 中新增了 `currentCount` 與 `totalCount` 狀態，並在 `handleUpload` 與 `handleURLImport` 的迴圈中即時更新進度，確保使用者在匯入大量資料時能看到具體的百分比與筆數提示。UI 採用一致的玻璃擬態風格並加入動態進度條。
- [x] 27. **接手提醒通知系統移植 (Handover Notification Porting)**：將原屬於後端 API 的接手提醒邏輯移植至前端（Option B 下的 `view/page.tsx`）。現在當任務完成時，系統會自動生成下一階段的「準備接手」通知；同時新增 `refreshAutoReminders` 機制，根據 `planned_date` 主動產生 3 天內的「即將到來任務」提醒，大幅強化了跨部門協作效率。
- [x] 28. **Excel 匯入 Sheet 名稱相容性優化 (Excel Sheet Name Compatibility)**：修復了 Excel 匯入時因工作表名稱非精確 "Master"（如 "Master sheet"）導致失敗的問題。在 `excelParser.ts` 中改用不分大小寫且包含關鍵字的模糊匹配邏輯，並統一錯誤訊息為英文以符合系統情境。
- [x] 29. **記憶體釋放與一鍵清空機制 (Memory Release & Data Clearance)**：為了應對巨型 Excel 檔對瀏覽器端 `LocalStorage` 的壓力，在 Dashboard 與匯入介面中新增了帶有危險提示的「一鍵清空資料」與「清空欄位」按鈕 (`projectService.clearAll()`)，方便使用者隨時歸零並釋放暫存資源。
- [x] 30. **接手提醒系統擴增：逾期偵測 (Overdue Notification)**：強化原有的接手提醒系統 (`refreshAutoReminders`)，除了提前 3 天的「準備接手」通知外，當偵測到任務預計日期已超過且尚未標示為完成時（`diffDays < 0`），將會發送更為強烈的「🚨 逾期提醒」以敦促相關部門推進進度。

#### 失敗嘗試與矯正：

- **[2026-03-01] GitHub Actions 部署失敗 (Build Error - Static Export Constraints)**：
  - **原因**：Next.js 在 `output: 'export'` 模式下有兩大限制：(1) 禁止在 `app` 下存在任何 API Routes；(2) 雖然有 `generateStaticParams`，但在動態路徑下混合 `use client` 會導致編譯器混淆。
  - **矯正 (外科式處置方案)**：
    1. **路由降級**：捨棄動態路由 `[id]` 目錄，將專案詳情頁遷移至 `src/app/projects/view/page.tsx`，改採 `?id=xxx` 的查詢參數模式，使頁面路徑回歸純靜態。
    2. **API 脫鉤**：將整個 `api` 資料夾移出 `app` 目錄存檔，消滅所有 API Endpoint 以滿足靜態導出檢查。
    3. **客戶端資料獲取**：使用 `useSearchParams` + `Suspense` 確保在 GitHub Pages 載入後，由客戶端 LocalStorage 接手資料渲染。
  - **結果**：本地 `npm run build` 成功導出，GitHub Actions 正確完成部署。

#### 下一步 (Next Steps)：

- [ ] 1. **Vercel 遷移準備**：雖然目前走方案 B，但代碼已保留方案 A 接口。未來若資料量大，可一鍵切換回資料庫模式。
- [ ] 2. **LocalStorage 匯出功能**：新增功能讓使用者能手動備份 LocalStorage 中的數據為 JSON。
  - **[2026-03-01] 甘特圖數據顯示邏輯不完善分析 (Data Display Logic Failure Analysis)**：
    - **問題現象**：畫出的甘特圖進度條長度與表格日期不對等（如表格顯示 2/12 完成，圖面上卻只有一個點），且「今日標記」位置發生偏移。
    - **深度原因分析**：
      1. **權重取值單一**：原邏輯僅以 `planned_date` 為進度條終點。對已完成任務，若未填計畫日但有實際完成日，邏輯會因取不到計畫日而退回預設的「1 天」寬度。
      2. **開始日期缺失**：匯入引擎最初未抓取 WBS 層級的 `start_date` 欄位，導致所有任務盲目以「專案起始日」為起點。
      3. **比例尺計算偏差**：時間軸標頭（Header）與內容區域（Overlay）的座標系統未統一，造成 CSS 比例計算在不同螢幕寬度下產生累積位移。
    - **矯正措施**：
      1. **實施「最大值取樣 (Math.max)」**：重新定義任務終點 `tEnd = Math.max(planned_date, actual_date, start_date + buffer)`，確保「已完成」的任務長度能正確反映實際作業時間。
      2. **強化 WBS 匯入引擎**：新增 `start_date` 自動識別邏輯，支援 `開始日`、`Start Date` 等多組關鍵字。
      3. **座標系統統一化**：改用「絕對定位覆蓋層 (Gantt Overlay)」設計，將時間軸刻度與今日線鎖定在同一個 `relative` 父容器內。
    - **預防措施**：
      1. **資料對齊單元測試**：未來新增渲染邏輯時，需比對同一 ID 在 `Table` vs `Chart` 的輸出值。
      2. **視覺提示與 Tooltip**：在 Chart 層加入 `Hover Tooltip` 顯示原始數據，供使用者第一時間檢驗數據正確性。

## 📅 當前進度 (Current Progress)

系統已恢復穩定且功能模塊已大幅擴展，目前版本為 **功能完整穩定版 (Feature-Complete & Stable)**：

- ✅ **WBS 視覺階層 3.0 (Hierarchy & Color)**：主任務採用天藍色極粗體加底色，子任務具備 28px 縮排與樹狀符號，層次分明。
- ✅ **全視圖連結有效化 (Hyperlink Engine)**：支援從 Excel 公式/屬性中提取真實 URL，「交付物」欄位現在可直接點擊打開雲端文件。
- ✅ **事件冒泡修正**：Dashboard 下載圖示不再與列點擊衝突。
- ⚠️ 專案排序暫時回退至 `created_at`（待使用者重新 Generate Client 後即可恢復）。

**Master Table 預設路徑**: `https://docs.google.com/spreadsheets/d/1cj6qJdwtle-YxIhLAB4CjXZC3hnFfk7IE31nEpuRfmI/edit?usp=drive_link`

---

### [2026-03-01] WBS 連結失效與階層模糊分析 (Link & Hierarchy Failure Analysis)

**原因分析 (Root Cause Analysis)**：

1. **資料解析深度不足 (Data Depth Loss)**：原始 `xlsx` 匯入邏輯僅讀取儲存格 Value，忽略了 `l` (Link) 與 `f` (Formula) 屬性。當 Excel 從 Google Sheets 匯出時，超連結常以 `=HYPERLINK` 公式存在，系統未進行解析。
2. **視覺層次語意不明 (Visual Ambiguity)**：主任務與子任務在字體、縮排與顏色上的差異過小，導致長篇 WBS 難以快速掃視章節結構。
3. **前端渲染限制**：前端將「交付物」視為純文字，未實作網址解析與 `<a>` 標籤動態渲染。

**矯正措施 (Corrective Actions)**：

1. **實作「超連結提取引擎」**：新增 `extractUrl` 函數，同時向下相容 `l.Target` 與 `=HYPERLINK` 正則解析，確保從 Excel 格式中提取原始網址。
2. **數據結構升級 (Piped Data)**：將提取到的文字與網址以 `display||url` 格式存儲，保留元數據。
3. **WBS UI/UX 層次重塑**：
   - **主任務**：`Sky-400` 天藍色 + `font-black` + `bg-sky-500/[0.03]` 底色。
   - **子任務**：`28px` 階梯縮排 + `└─` 分支符號。
4. **全視圖連結激活**：前端新增 WBS 連結解析器，將交付物與雲端資料欄位轉換為具備 `ExternalLink` 圖示的可點擊元件。

**預防措施 (Preventive Measures)**：

1. **匯入日誌監控 (Import Logging)**：在 API 層加入 `console.log` 追蹤連結提取狀態，便於針對特殊 Excel 格式進行調校。
2. **多維度標題匹配 (Multi-key Matching)**：擴充標題識別關鍵字（如 `交付物`、`相關文件` 等），降低抓取失敗率。
3. **視覺階層規範化**：標準化 WBS 縮排與顏色 Design Tokens，確保未來介面擴充時的視覺一致性。

---

### [2026-03-01] 匯入日期溢出錯誤 (DateTime Overflow Analysis)

**原因分析 (Root Cause Analysis)**：
當 Excel 欄位包含極大數值或格式不正確的日期字串時，系統原有的 `parseExcelDate` 會將其解析為合法的 JS `Date` 物件，但年份可能超出資料庫可接受範圍（例如產生 **西元 46051 年**）。Prisma 在將此極端時間轉換為資料庫 `DateTime` 時會報錯 `Could not convert argument value`，導致整個匯入 API 回傳 500 錯誤。

**矯正措施 (Corrective Actions)**：

1. **強化日期範圍過濾器 (Date Range Sentry)**：在 `parseExcelDate` 中加入「合規年份檢查」，強制只接受 **1920 ~ 2100 年** 之間的日期。超出範圍的資料將被視為無效紀錄並回傳 `null`。
2. **多模式解析 (Fallback Parsing)**：改進解析邏輯，優先處理 Excel 序列號，並針對單純數字字串進行二次檢查，避免誤解析。

**預防措施 (Preventive Measures)**：

1. **髒資料防禦策略**：對於所有外部輸入的時間欄位，實施「白名單年份」策略，確保髒資料不影響系統穩定性。
2. **導入日誌警告**：在發生日期忽略時透過 `console.warn` 記錄原始問題值。

---

### [2026-03-06] 介面配色全面重構 (Teal-Blue Ocean Theme Implementation)

**原因分析 (Root Cause Analysis)**：
原有的深色模式與高亮配色在長時間使用下容易造成視覺疲勞，且在報表閱讀與 WBS 階層辨識上，對比度不足以支撐高效的數位協作。再者，介面上充斥玻璃模糊與透明漸層，降低了企業級應用的視覺穩重感。

**矯正措施 (Corrective Actions)**：

1. **語意化色彩系統 (Semantic Token System)**：更新 `tailwind.config.ts` 與 `globals.css`，捨棄舊版的亮彩顏色，改用深邃穩定的海洋色系：
   - Seafoam Bloom (`#9FE7E7`), Shallow Reef (`#6ECBD3`), Pelagic Blue (`#289FB7`), Abyss Teal (`#146B8C`), Foam White (`#E8FBFF`), Keel Black (`#0F1A1B`)
2. **極致對比度與去透明化 (Opaque & High Contrast)**：
   - 移除所有透明度設定 (`/10`, `/20`, `backdrop-blur`)，以純色取代。
   - 保證背景與字體顏色嚴格遵守高對比度規範。
   - 提示或警示部分採用高亮搭配紅色 (`text-red-500`, `bg-red-50` 等) 以強化警告作用。
3. **全模組視覺與語系同步**：
   - Dashboard (`page.tsx`) 與 專案列表：重構卡片與表格，移除所有玻璃效果，全面提升介面中文在地化（如"已完成", "進行中"）。
   - Project Detail (`projects/view/page.tsx`)：重塑 WBS 任務清單與甘特圖，主任務與子任務之間使用高對比邊框與純色背景區隔，強化狀態判讀。
   - 視窗 (`ImportModal`/`CreateProjectModal`)：修復破版並改用海洋主題色系與純色背景遮罩。

**預防措施 (Preventive Measures)**：

1. **設計規範文件化**：同步更新 `walkthrough.md` 與 `task.md`，定義未來的 UI 擴充必須遵循 `brand-*` 色標系統與 4px/8px 間距規範。
2. **自動化品質檢查**：修復 PowerShell 權限問題，確保每次 commit 前皆能順利執行 `npm run lint` 以防止樣式回歸。

---

### [2026-03-10] 系統同步與衝突解決 (System Sync & Conflict Resolution)

**原因分析 (Root Cause Analysis)**：
執行 `git pull` 時發現遠端倉庫已完成「Teal-Blue Ocean Theme」的主題重構，而本地存有實驗性質的「FatPandaVision」淺色模式修改，導致 `src/app/page.tsx` 與 `src/app/projects/view/page.tsx` 產生衝突。

**矯正措施 (Corrective Actions)**：
1. **衝突合併 (Conflict Resolution)**：手動合併衝突，決定以遠端（Upstream）的「Teal-Blue Ocean」高對比海洋色系為基礎，並保留本地對「卡片/表格視圖切換器」的 Layout 優化（如 `px-3` 與 `flex` 間距）。
2. **術語統一 (Terminology Standardization)**：將衝突部分的繁體中文術語統一為遠端版本（如使用「進行中」而非「執行中」），確保全系統語致性。
3. **環境清理 (Environment Cleanup)**：暫存（Stash）並彈回（Pop）修改後，確認所有衝突點皆已妥善處理並通過編譯檢查。

**預防措施 (Preventive Measures)**：
1. **頻繁同步計畫**：建議定期執行 `git pull` 以減少大規模 UI 重構時的衝突風險。
2. **主題分支規範**：未來重大色彩異動應先在獨立 Feature Branch 進行，待確定配色方案後再併入 `main`。

---

3. **甘特圖視覺校正 (Gantt Grid Fix)**：修正了縱向網格線斷裂問題，透過 Unified Grid Overlay 確保背景線條筆直貫通。

**矯正措施 (Corrective Actions)**：
- 針對 `browser_subagent` 在 Console 注入數據的編碼限制，改用暫時性的 `Simulated Seeder` 邏輯確保驗證數據穩定。
- 優化了 WBS 表格在模擬狀態下的響應式呈現。

---

## [2026-03-11] Deep Sea Theme Consolidation & JSON Backup Engine

### 背景 (Background)

進一步精煉全站 UI，確保所有元素（包括甘特圖 Tooltip 與 WBS 表格）皆符合 "Deep Sea" (深海) 主題規範，移除所有剩餘的亮色系與硬編碼 `slate` 顏色。同時為了解決靜態部署環境下的資料易失性，實作了全系統 JSON 備份與還原引擎。

### 核心變更 (Key Changes)

- **主題全面整合**:
  - 更新 `globals.css` 與 `tailwind.config.ts`，強化語意化 Token (`surface`, `seafoam`, `pelagic`) 的對比度。
  - 徹底移除全站透明效果與 `backdrop-blur`，改為導向專業感的深色實色背景 (#0F172A / #1E293B)。
  - 修正甘特圖 Tooltip，確保其具備不透明背景與清晰的陰影層次。
- **JSON 備份引擎實作**:
  - 在 `src/lib/projectService.ts` 新增 `exportData` 與 `importData` 邏輯，支援將 LocalStorage 資料封裝為專案格式 JSON 下載。
  - 在 Dashboard 介面新增「備份」與「還原」按鈕，實作檔案讀取與資料注入。
- **環境問題修復**:
  - 解決了本地執行權限導致的 `npm install` 失敗問題。
  - 導入了 `@types/node` 並修正了 `process` 未定義的型別錯誤。

### 成果 (Outcome)

- [x] 全站 UI 達成完全的 Deep Sea 主題一致性。
- [x] 成功實作 JSON 備份功能，大幅提升靜態部署下的數據韌性。
- [x] 通過瀏覽器自動化測試，確認在高對比度與去透明化下，視覺體驗更符合資深架構師標準。
- [x] 成功修復環境依賴與 Lint 錯誤，開發伺服器 (`npm run dev`) 正常運作。
- [x] **資料清空同步修復 (Data Clearance Sync)**：修正了 `ImportModal` 中「清空欄位與記憶體」按鈕僅清除局部狀態的問題。現在該按鈕會正確呼叫 `projectService.clearAll()` 並驅動 Dashboard 刷新，確保全站資料一致性。

---

## [2026-03-11] Deep Sea UI 網格邏輯與捲軸優化 (Grid & Scrollbar Refinement)

### 背景 (Background)

在 Deep Sea 主題實裝後，發現總表（Dashboard）與專案 WBS 表格的格線邏輯不一致，「直向線條」在暗色模式下幾乎不可見，且橫向滾動條呈現刺眼的預設白色，破壞了沉浸式體驗。同時，部分硬編碼的深色 Badge 在暗黑模式下產生對比度失效的問題。

### 核心變更 (Key Changes)

- **格線邏輯標準化 (Grid Logic Standardization)**:
  - 徹底移除總表與 WBS 表格中混用的 `divide-y` 與 `border-l`。
  - 全面實施 **`border-b border-r`** 的完整方格邏輯，確保表格結構穩定且具備 Excel 般的精確度。
- **邊框對比度校準 (Border Calibration)**:
  - 將 `--border-color` 從過暗的隱形狀態調優為 **`#2D4C52`**，使其在 Keel Black 背景上呈現出「微妙但清晰」的區隔感。
- **暗黑模式滾輪實作 (Deep Sea Scrollbar)**:
  - 在 `globals.css` 中導入自定義捲軸樣式，強制使用 `--border-color` 與 `--accent-secondary` 作為 thumb 顏色，消除白色滾輪的視覺衝突。
- **語意化對比度修復 (Semantic Contrast Fixes)**:
  - 搜尋並移除所有硬編碼的 `bg-neutral-800`（如專案類型 Badge、Modal Icon 背景）。
  - 統一映射至調色盤變數 `bg-foreground` 與 `text-background`，確保其在 Light/Dark Mode 均具備極高的可讀性。

### 成果 (Outcome)

- [x] **總表邏輯回歸**：表格呈現出高精密度的格線系統，符合國際藝術總監設定的平面化美學。
- [x] **視覺沉浸感提升**：自定義滾輪完美融入深海主題。
- [x] **全系統語意化**：成功消滅最後一條硬編碼顏色暗雷，系統具備完美的動態切換韌性。


---

## [2026-03-11] 權責單位高亮顯示優化 (Responsible Unit Highlighting)

### 背景 (Background)

使用者要求針對「進行中」的事項，其權責單位（負責人或部門）應該以特殊顏色高亮顯示，以便於管理與提示。

### 核心變更 (Key Changes)

- **全域樣式**: 在 `globals.css` 新增 `.animate-subtle-pulse` 以提供柔和的視覺提示。
- **Dashboard (`page.tsx`)**: 
  - 卡片視圖：當專案為「進行中」時，高亮顯示「負責人」。
  - 表格視圖：當專案為「進行中」時，高亮顯示「發出人員」。
- **專案詳情 (`view/page.tsx`)**:
  - 頁首：高亮顯示專案「負責人」。
  - WBS 表格：當任務狀態為「進行中」時，大幅強化「權責單位」的視覺權重（背景色、邊框、動畫與圖示）。
- **對比度校正 (Contrast Sentry)**:
  - 為了解決深色模式下 Seafoam 背景搭配白色文字對比度不足（僅約 1.4:1）的問題，新增了語意化變數 `--accent-brand-foreground`。
  - 在深色模式下，自動將高亮標籤文字切換為深色 (#0F1A1B)，顯著提升可讀性，符合 Color Master Palette 的嚴格對比度規範。

