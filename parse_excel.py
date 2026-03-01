import pandas as pd
import sys
import json

def analyze_excel(file_path):
    out = {}
    xls = pd.ExcelFile(file_path)
    out["sheet_names"] = xls.sheet_names
    
    for sheet_name in xls.sheet_names:
        sheet_data = {}
        try:
            df = pd.read_excel(xls, sheet_name=sheet_name, nrows=10)
            df = df.astype(str) # convert all to string to avoid JSON errors
            sheet_data["columns"] = list(df.columns)
            sheet_data["head"] = df.head(10).to_dict(orient='records')
        except Exception as e:
            sheet_data["error"] = str(e)
        out[sheet_name] = sheet_data

    with open("excel_analysis.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    analyze_excel(sys.argv[1])
