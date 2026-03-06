# 射出成型確效管理系統 (Validation Management System) - 任務清單

## 1. 需求分析與規劃 (Planning)

- [x] 尋找並解析「射出成型之製程變更、確效專案之管理.xlsx」檔案內容與邏輯。
- [x] 撰寫詳細的實作計畫 (Implementation Plan)，包含架構、資料庫映射、前端 UI/UX 設計與後端 API 設計。
- [x] 與使用者確認實作計畫。

## 2. 系統基礎建設 (Infrastructure)

- [x] 初始化 Next.js 專案 (已完成，部分手動設定)。
- [x] 建立基礎 Prisma Schema (已完成初版)。
- [x] 完善基礎 UI 元件庫 (Tailwind CSS, Framer Motion)。

## 3. 資料庫與後端 API 開發 (Backend & API)

- [x] 根據 Excel 解析結果優化 Prisma Schema。
- [x] 建立 Excel 資料匯入/解析腳本或 API。
- [x] 建立 Projects CRUD API。
- [x] 建立 Tasks/Phases CRUD API 及狀態自動連動邏輯。

## 4. 前端介面開發 (Frontend UI/UX)

- [x] 實作 Dashboard 專案管線視圖 (真實資料串接)。
- [x] 實作專案詳細頁面 (WBS 任務清單與權責分配)。
- [x] 實作資料匯入介面與成功/錯誤提示。

## UI 配色重構 (FatPandaVision Palette Implementation)

- [x] 制定配色與對比度對應清單 (Mapping & Contrast Audit).
- [x] 更新 `tailwind.config.ts` 定義新色標系統.
- [x] 修改 `globals.css` 改為淺色底色與高對比文字變數.
- [x] 重構 Dashboard (Cards, Table) 以適配新配色.
- [x] 重構專案詳細頁 (Project Detail, WBS, Gantt) 以適配新配色.
- [x] 狀態燈號 (Status Tags) 與進度條比例尺優化.
- [x] 執行對比度驗證 (Contrast Check - WCAG AA).
- [x] 更新 `DEV_LOG.md` 紀錄配色變更.
