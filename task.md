# 射出成型確效管理系統 (Validation Management System) - 任務清單

## 1. 需求分析與規劃 (Planning)

- [/] 尋找並解析「射出成型之製程變更、確效專案之管理.xlsx」檔案內容與邏輯。
- [ ] 撰寫詳細的實作計畫 (Implementation Plan)，包含架構、資料庫映射、前端 UI/UX 設計與後端 API 設計。
- [ ] 與使用者確認實作計畫。

## 2. 系統基礎建設 (Infrastructure)

- [x] 初始化 Next.js 專案 (已完成，部分手動設定)。
- [x] 建立基礎 Prisma Schema (已完成初版)。
- [ ] 完善基礎 UI 元件庫 (Tailwind CSS, Framer Motion)。

## 3. 資料庫與後端 API 開發 (Backend & API)

- [ ] 根據 Excel 解析結果優化 Prisma Schema。
- [ ] 建立 Excel 資料匯入/解析腳本或 API。
- [ ] 建立 Projects CRUD API。
- [ ] 建立 Tasks/Phases CRUD API 及狀態自動連動邏輯。

## 4. 前端介面開發 (Frontend UI/UX)

- [ ] 實作 Dashboard 專案管線視圖 (真實資料串接)。
- [ ] 實作專案詳細頁面 (WBS 任務清單與權責分配)。
- [ ] 實作資料匯入介面與成功/錯誤提示。

## UI 透明度移除優化 (Transparency Removal Optimization)

- [x] 更新 `tailwind.config.ts` 定義不透明色標 (Surface, Border)。
- [x] 修改 `globals.css` 移除磨砂玻璃效果與透明背景。
- [/] 重構 Dashboard (`page.tsx`) 移除 `backdrop-blur` 與透明色階。
- [ ] 重構專案詳細頁 (`projects/view/page.tsx`) 移除透明效果。
- [/] 重構彈窗元件 (`ImportModal.tsx`, `CreateProjectModal.tsx`)。
- [ ] 執行魯棒性測試，確認對比度與視覺一致性。
- [ ] 更新 `DEV_LOG.md` 記錄變更。
