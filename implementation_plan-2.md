# 系統內建專案建立與標準 WBS 範本生成計畫 (In-System Project Creation)

讓系統能夠完全獨立運作，取代 Excel 表格作為專案與確效任務流的主要入口。

## User Review Required
> [!IMPORTANT]
> - 本計畫包含對資料庫 Schema 的修改 ([Task](file:///c:/Users/3kids/Downloads/Self-developed_Apps/ValidationManagementSystem/src/app/projects/%5Bid%5D/page.tsx#133-142) 表格的 `depends_on` 欄位正式宣告)，這將會觸發 `npx prisma db push`。
> - 會新增一個標準 WBS 任務的範本產生器。由於不同的「專案類型」(如：設變專案、新模專案) 可能會有不同的標準任務流程，在此我們將會先實作一份**預設標準公版 WBS 流程** (包含 1.1~2.X 等常見步驟與預設 Depends On)，如果您有詳細的對照表，未來可再行擴充。

---

## Proposed Changes

### Database & Schema (Prisma)
#### [MODIFY] prisma/schema.prisma
- 將 `depends_on String?` 正式加入 [Task](file:///c:/Users/3kids/Downloads/Self-developed_Apps/ValidationManagementSystem/src/app/projects/%5Bid%5D/page.tsx#133-142) 模型中，確保資料庫層級的完整支援並避免隱含錯誤。
- 執行 `npx prisma db push` 同步至資料庫，並執行 `npx prisma generate` 更新 Client。

---

### Backend Components (API Routes)
#### [NEW] src/app/api/projects/route.ts
- 實作 [POST](file:///c:/Users/3kids/Downloads/Self-developed_Apps/ValidationManagementSystem/src/app/api/import-url/route.ts#6-105) 方法：接收前端表單的專案基本資料 (模具號碼、品號、版次、類型、發出者等)。
- 建立 [Project](file:///c:/Users/3kids/Downloads/Self-developed_Apps/ValidationManagementSystem/src/app/projects/%5Bid%5D/page.tsx#13-24) 主檔紀錄。
- **核心邏輯 (Task Template Engine)**：根據專案建立情況，**自動批量產生** 該專案預設的 WBS 任務清單 (Tasks)，並自動填入對應的 `wbs_code`、`task_name`、預設負責 `dept` 以及 `depends_on` (前置條件)。
- 將這批建立好的 Tasks 一次性寫入資料庫，完成新專案的初始化。

---

### Frontend Components (UI/UX)
#### [NEW] src/components/CreateProjectModal.tsx
- 新增一個專案建立的彈出式視窗組件 (Modal)。
- 包含表單欄位：模具號碼 (必填)、品號、工程版次、專案類型 (Dropdown)、變更目的、發出者 (Owner)、ECR 編號等。
- 表單送出時，透過 [fetch](file:///c:/Users/3kids/Downloads/Self-developed_Apps/ValidationManagementSystem/src/app/projects/%5Bid%5D/page.tsx#13-24) 呼叫 `POST /api/projects`，並在成功後關閉 Modal。

#### [MODIFY] src/app/page.tsx
- 在首頁標題右側（原「匯入/更新 Master Sheet」按鈕旁邊），新增一顆搶眼的「+ 建立新專案」主要操作按鈕 (Primary Button)。
- 引入並控制 `CreateProjectModal` 的開關狀態。
- 建立成功後自動重新 fetch 專案列表 `{ fetchProjects() }`。

---

## Verification Plan

### Manual Verification
1. 點擊首頁「+ 建立新專案」按鈕。
2. 在彈出的表單中填入假資料，送出。
3. 觀察首頁是否立即出現剛建立好的專案卡片。
4. 點擊進入該專案詳情頁，檢查預設的 WBS 任務 (如：1.1 評估、1.2 分派等) 是否成功生成，且**關鍵路徑 (Critical Path)** 與 **前置任務鎖定** 功能是否對這些系統自動生成的任務依然有效。
