# 射出成型確效管理系統 (Validation Management System) - 實作預定畫

## 專案目標與背景 (Goal Description)
此專案旨在將現有的 Excel 管理模式 (`射出成型之製程變更、確效專案之管理.xlsx`) 轉換為具有高質感 UI/UX (Advanced Glassmorphism) 的現代化網頁應用程式。
根據對 Excel 檔案的解析，系統核心區分為兩大層級：
1. **Master sheet (專案總覽)**：控管所有專案的代碼、品號、優先度、確效階段 (PD/FA/OQ/PQ/EC/圖面進版) 及 ECR/ECN 資訊。
2. **個別專案工作表 (WBS 任務)**：如 `MT20218R1-9035`，包含具體工作序 (1.1, 1.2...)、任務名稱、權責單位 (工程/製造/品管)、狀態、排程 (開始/完成日) 及交付物。

## User Review Required
> [!IMPORTANT]
> - **資料庫結構微調**：當前 Prisma Schema 已涵蓋絕大部分欄位，但我們需要確認是否預設保留舊版 Excel 中的「備註」或歷史包袱欄位。
> - **Excel 匯入邏輯**：初步計畫撰寫一個 API Route `POST /api/import` 接收上傳的 Excel 檔。匯入時若遇到已存在的專案號碼，採「覆蓋/更新 (Upsert)」還是「略過 (Ignore)」？建議採 Update 更新狀態。
> - **UI 流動**：登入/身份驗證 (Auth) 是否納入本次開發範圍？目前計畫先以假定角色處理權限切換。

## Proposed Changes

### 資料庫與後端架構
- **Prisma Schema 更新**：
  - 微調 [schema.prisma](file:///c:/Users/3kids/Downloads/Self-developed_Apps/ValidationManagementSystem/prisma/schema.prisma) 以完全對應 Excel 解析出的欄位名稱與選項。
- **資料匯入模組 (API)**：
  - 開發 Excel Parser (使用 [xlsx](file:///c:/Users/3kids/Downloads/Self-developed_Apps/ValidationManagementSystem/%E5%B0%84%E5%87%BA%E6%88%90%E5%9E%8B%E4%B9%8B%E8%A3%BD%E7%A8%8B%E8%AE%8A%E6%9B%B4%E3%80%81%E7%A2%BA%E6%95%88%E5%B0%88%E6%A1%88%E4%B9%8B%E7%AE%A1%E7%90%86.xlsx) 或 `exceljs` library)
  - #### [NEW] `src/app/api/import/route.ts`
    實作上傳端點與資料轉換邏輯。解析 `Master sheet` 寫入 `Project` 表；解析其他分頁寫入 `Task` 表。
- **CRUD API endpoints**：
  - #### [NEW] `src/app/api/projects/route.ts`
  - #### [NEW] `src/app/api/tasks/route.ts`

### 前端介面 (Frontend UI/UX)
- **基礎設計系統 (Design Tokens)**：
  - #### [MODIFY] `tailwind.config.ts` 與 `src/app/globals.css`
    依據「卓越的玻璃擬態 (Advanced Glassmorphism)」與深色主題制定變數。
- **專案管線視圖 (Pipeline Dashboard)**：
  - #### [MODIFY] [src/app/page.tsx](file:///c:/Users/3kids/Downloads/Self-developed_Apps/ValidationManagementSystem/src/app/page.tsx)
    優化動畫細節，連接後端 API 動態渲染列表。
- **專案詳細內容 (Project Details & WBS)**：
  - #### [NEW] `src/app/projects/[id]/page.tsx`
    展示 WBS 清單、權責編輯與狀態切換 UI。
- **資料匯入介面**：
  - #### [NEW] `src/components/ImportModal.tsx`
    提供拖曳上傳 Excel 檔案的彈窗。

## Verification Plan

### Automated / API Tests
- 開發完成 API 後，撰寫一隻腳本 (Node.js) 直接呼叫上傳端點，將真實的「射出成型之製程變更、確效專案之管理.xlsx」丟入測試。
- 測試回傳結果的成功計數與失敗日誌，確保關聯建立正確。

### Manual Verification
1. 啟動 `npm run dev`。
2. 進入首頁 Dashboard，確認基礎排版與 Hover 光影效果是否符合預期。
3. 透過 Import Modal 上傳 Excel，並觀察前端資料更新狀況。
4. 點擊進入單一專案，檢視其 WBS 任務是否能對應三大權責部門(工程/製造/品管)進行狀態切換。

Master Table 檔案路徑 https://docs.google.com/spreadsheets/d/1cj6qJdwtle-YxIhLAB4CjXZC3hnFfk7IE31nEpuRfmI/edit?usp=drive_link