這是一份為你整理的**完整開發提示詞（Master Development Prompt）**。你可以將其存檔在 Notion、Obsidian 或直接作為開發筆記。

這份提示詞是針對 **Cursor、Windsurf 或 v0** 等 IDE 工具優化的，採用了「角色設定、系統架構、資料邏輯、技術規範」的結構，確保 AI 能精準理解這個**「射出成型確效管理系統」**的特殊需求。

---

# 🚀 專案開發提示詞：射出成型確效管理系統 (Validation Management System)

## 1. 角色設定 (Role)

你是一位資深的 **Full-stack 軟體架構師與系統分析師**，專精於製造業品質管理系統 (QMS) 與醫材確效 (Validation, IQ/OQ/PQ) 流程數位化。你擅長將複雜的 Excel 邏輯轉化為高效、可擴展的關聯式資料庫架構與現代化 Web 介面。

## 2. 專案背景與核心邏輯 (Context)

本專案目標是開發一個專門管理「射出成型製程變更與確效案件」的工具。系統邏輯需從現有的 Excel 試算表遷移，核心包含：

* **專案主檔 (Master Data)：** 追蹤模具號碼、品號、工程版次、ECR/ECN 編號及發出者。
* **確效階段管理：** 包含 PD (製程開發)、FA (首件檢驗)、OQ (操作確效)、PQ (性能確效)、EC (工程變更) 等階段的啟動開關與文件路徑。
* **WBS 任務追蹤：** 每個案件下屬多個工作序（如 1.1, 2.1...），涉及工程、製造、品管三個單位的權責分配、進度追蹤與交付物管理。

## 3. 資料庫架構需求 (Database Schema)

請基於以下結構設計 PostgreSQL / Prisma 模型：

### A. Projects (專案主表)

* `id` (UUID), `project_no` (模具號碼), `part_no` (品號), `rev` (版次)
* `type` (專案類型：製程變更/新模開發等), `purpose` (變更目的), `priority` (優先度 1-5)
* `status` (Enum: 進行中/結案), `ecr_no`, `ecn_no`, `owner` (發出者)
* `created_at`, `updated_at`

### B. ProjectPhases (確效程序開關)

* `project_id` (FK), `phase_name` (PD/FA/OQ/PQ/EC/圖面進版)
* `is_required` (Boolean), `cloud_link` (URL), `completion_status`

### C. Tasks / WBS (任務清單)

* `project_id` (FK), `wbs_code` (工作序), `task_name` (項目), `dept` (權責部門)
* `status` (尚未開始/進行中/已完成), `planned_date`, `actual_date`, `deliverable` (交付物)

## 4. 功能開發要求 (Functional Requirements)

1. **資料導入邏輯 (Data Migration)：** 需實作一個解析器，能讀取舊有的 CSV 格式，並根據「模具號碼」自動將主表資料與各專案分頁的 WBS 任務關聯。
2. **自動化狀態更新：** 當所有子任務 (Tasks) 狀態為「已完成」時，主專案狀態需自動標示為可結案。
3. **時間軸追蹤：** 需計算「預計完成日」與「實際完成日」的偏差，並在 UI 上以視覺化方式呈現延遲風險。
4. **權限邏輯：** 區分工程、製造、品管三個角色的檢視與編輯權限。

## 5. 前端 UI 與交互規範 (UI/UX)

* **視覺風格：** 採用 **Advanced Glassmorphism (玻璃擬態)**。
* 背景：`backdrop-filter: blur(15px)`，搭配柔和的色彩漸層。
* 邊框：極細微的白光描邊 (0.5px white opacity)。
* 質感：按鈕需有 **Neo-Skeuomorphism (新擬物化)** 的壓鑄質感，提供明確的操作反饋。


* **Dashboard 設計：** * 提供一個「專案管線 (Pipeline)」視圖，橫向展示專案在各階段 (PD/FA/OQ/PQ) 的即時進度。
* 卡片式介面，滑鼠懸停時需有高度抬升的動態效果。



## 6. 技術棧規範 (Tech Stack)

* **Framework:** Next.js (App Router)
* **Language:** TypeScript
* **Database:** Supabase / PostgreSQL
* **ORM:** Prisma
* **Styling:** Tailwind CSS + Framer Motion (用於流暢動畫)

---

**[指令結束]**
*請根據上述提示詞，先從撰寫 Prisma Schema 開始，並生成對應的初版專案主頁面代碼。*