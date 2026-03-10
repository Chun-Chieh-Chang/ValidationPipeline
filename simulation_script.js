/**
 * 模擬腳本：建立新專案 (分流執行)
 * 此腳本模擬從「新增專案」按鈕建立一個獨立於總表的專案，並自動填充 WBS 任務與進度。
 * 用於比較與「總表同步」模式在即時性與靈活性上的差異。
 * 並遵循使用者要求，全數採用「繁體中文」顯示。
 */

const STORAGE_KEY = 'vms_projects_data';

const simulateSplitFlow = () => {
  const projectId = `sim-${Date.now()}`;
  const startD = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  const mockProject = {
    id: projectId,
    project_no: "M999 (模擬分流專案)",
    part_no: "SIM-LITE-001",
    rev: "A1",
    type: "新增確效",
    purpose: "測試「分流執行」與「即時追蹤」之數據流動效果",
    priority: 1,
    status: "IN_PROGRESS",
    owner: "確效工程師 (模擬員)",
    ecr_no: "ECR-2024-001",
    created_at: new Date().toISOString(),
    start_date: startD.toISOString(),
    phases: [
      { name: "P1: 模具發佈", status: "COMPLETED" },
      { name: "P2: 確效準備", status: "IN_PROGRESS" },
      { name: "P3: 數據採集", status: "PENDING" },
      { name: "P4: 結案量測", status: "PENDING" }
    ],
    tasks: [
      {
        id: `${projectId}-t1`,
        wbs_code: "1",
        task_name: "模具設計確認與正式發佈",
        dept: "模具部",
        status: "COMPLETED",
        planned_date: new Date(startD.getTime() + 2 * dayMs).toISOString(),
        start_date: startD.toISOString(),
        actual_date: new Date(startD.getTime() + 1 * dayMs).toISOString(),
        progress: 100
      },
      {
        id: `${projectId}-t2`,
        wbs_code: "1.1",
        task_name: "DFM 評核報告審核",
        dept: "模具部",
        status: "COMPLETED",
        progress: 100
      },
      {
        id: `${projectId}-t3`,
        wbs_code: "2",
        task_name: "T0 試模與現場準備",
        dept: "確效組",
        status: "IN_PROGRESS",
        planned_date: new Date(startD.getTime() + 5 * dayMs).toISOString(),
        start_date: new Date(startD.getTime() + 2 * dayMs).toISOString(),
        progress: 40
      },
      {
        id: `${projectId}-t4`,
        wbs_code: "2.1",
        task_name: "確效計畫書 (Protocol) 撰寫與簽核",
        dept: "確效組",
        status: "IN_PROGRESS",
        progress: 60
      },
      {
        id: `${projectId}-t5`,
        wbs_code: "3",
        task_name: "T1 試模生產與數據採集紀錄",
        dept: "射出部",
        status: "NOT_STARTED",
        planned_date: new Date(startD.getTime() + 10 * dayMs).toISOString(),
        progress: 0
      }
    ],
    notifications: [
      { id: 1, type: 'info', message: '模擬分流專案已成功建立，數據已注入。', timestamp: new Date().toISOString() }
    ]
  };

  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(STORAGE_KEY);
    const all = local ? JSON.parse(local) : [];
    
    // 移除舊的模擬資料，避免重複
    const filtered = all.filter(p => !p.project_no.includes("模擬"));
    filtered.push(mockProject);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    console.log("✅ 模擬專案 M999 已成功注入 LocalStorage");
    
    // 彈窗說明分流優點 (繁體中文)
    alert("【模擬完成】專案 M999 已建立！\n\n這展示了「分流執行」的核心優點：\n1. 即時性：無需等待 Master Sheet 週期性更新。\n2. 顆粒度：每個 WBS 任務都有獨立的百分比 (%) 與負責部門。\n3. 透明度：甘特圖與儀表板會立即反映真實的現場進度。");
    
    window.location.reload();
  }
};

// 立即執行模擬
simulateSplitFlow();
