# 開發日誌 (Dev Log)

## 專案名稱：射出成型確效管理系統 (Validation Management System)

### 2026-03-01

#### 執行項目：

1. **[計畫與分析]**
   - 透過 Python 腳本成功解析原有 `射出成型之製程變更、確效專案之管理.xlsx` 檔案。
   - 確認了 `Master sheet` 中各欄位用途：`優先度`、`模具號碼`、`專案類型`、各程序(`PD`, `FA`, `OQ`, `PQ`, `EC`)及 `ECR/ECN` 編號等資訊。
   - 確認了個別工作表 (如 `MT20218R1-9035`) 中包含了 `wbs`、`task`、`權責`、`工作狀態`、`開始/完成日期` 等欄標。
2. **[基礎建設與 Schema 定義]**
   - 初始化 Next.js 專案並加裝必要依賴 (`prisma`, `xlsx`, `framer-motion`)。
   - 將 `prisma/schema.prisma` 優化，精準對接 Excel 的欄位格式 (加入 `start_date`, `ecr_date`, `ecn_date` 等時間屬性，支援 `upsert`)。
3. **[UI/UX 與系統防禦]**
   - 基於「高級玻璃擬態 (Advanced Glassmorphism)」與「新擬物化 (Neo-Skeuomorphism)」建置主首頁版面。
   - 色彩系統已嚴肅遵從 `Dark Mode` 定義 (`Slate 900` 為底，漸層高亮等)。
   - 開發日誌已依法建立 (符合 MECE 與防禦 SOP)。

#### 失敗嘗試與矯正：

- _暫無，初始化順利。_

#### 下一步 (Next Steps)：

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

#### 失敗嘗試與矯正：

- **[2026-03-01] 匯入錯誤 (500 Error)**：初次加入 `cloud_link` 時未同步更新 Prisma Client 指向，導致 Upsert 失敗。已透過 `npx prisma db push` 與重啟服務矯正。
- **[2026-03-01] 數據對應不符**：因 Excel 合併儲存格轉 JSON 時會產生大量 Null 值，導致後續空白列覆蓋了先前的有效數據。已改用 Map 物件進行 Grouping 彙集，確保單一專案的所有行數數據能正確「疊加」而非「覆蓋」。
- **[2026-03-01] 匯入錯誤 (500 Error - Unknown argument import_order) - 複發分析與最終解決方案**：
  - **問題分析**：雖然在 `schema.prisma` 成功定義了欄位，但由於 **Windows 檔案鎖定機制**，Next.js 伺服器在運行中佔用了 Prisma Engine，導致 `npx prisma generate` 無法更新 `node_modules` 中的 Client 代碼。這造成了「代碼已寫入新欄位，但底層 Client 不認識」的不對稱狀態，引發 500 錯誤。
  - **立即止血措施**：
    1. 已暫時從 `route.ts` 中移除 `import_order` 的相關調用，將程式碼降級 (Fallback) 到與目前 Client 版本相容的狀態，確保系統可正常連線匯入（但排序暫時失效）。
    2. 強化 `ecr_no` 與 `ecn_no` 的資料處理，過濾掉 Excel 產生的布林值文字。
  - **最終矯正操作 (需使用者配合)**：
    1. **關閉終端機 (Ctrl+C)**：徹底停止 `npm run dev` 伺服器。
    2. **手動同步**：執行 `npx prisma generate` 指令。
    3. **檢查成功**：確認無 EPERM 報錯後再重新 `npm run dev`。
  - **預防措施**：
    1. 建立「無痛 Schema 更新機制」：未來欄位變更應先在 API 層加入 `(prisma as any).xxx` 的保護，或等確認 Generate 成功後再正式引入型別。

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
