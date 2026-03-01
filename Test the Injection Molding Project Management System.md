# Task: Test the Injection Molding Project Management System
## Plan:
- [x] Open http://localhost:3000
- [x] Click "匯入主表" (Import Master Sheet)
- [x] Input Google Sheets URL: `https://docs.google.com/spreadsheets/d/1cj6qJdwtle-YxIhLAB4CjXZC3hnFfk7IE31nEpuRfmI/edit?usp=drive_link`
- [x] Click the import button
- [x] Wait for success message -> **FAILED: "The uploaded file does not contain a 'Master' sheet."**
- [ ] Close the modal
- [ ] Verify project cards are listed
- [ ] Click a project card to view Gantt chart and tasks
- [ ] Click "開始執行" on the first task
- [ ] Click "標記完成 (觸發簽核/通知)" on the same task
- [ ] Verify the notification in the right pane
- [ ] Report progress and final outcome

## Findings:
1. The import failed with the message: `Error: The uploaded file does not contain a "Master" sheet.`
2. Verified the Google Sheet at the provided URL. The sheet name is actually "Master sheet" (with a space and lowercase 's'), while the application logic expects "Master".
3. Tried using the direct export URL (`export?format=xlsx`), but northern result as the sheet name inside the workbook is still "Master sheet".
4. This is a mismatch between the Excel template and the application's parsing logic.
