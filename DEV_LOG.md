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

