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

- 成功移除全站透明效果。
- 介面對比度大幅提升，符合資深架構師與藝術總監之審美標準。
- 解決了多處潛在的視覺回歸風險。
