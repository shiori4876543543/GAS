import pandas as pd, requests, time, traceback
from pathlib import Path

# ---------- 1. 設定 ----------
API_KEY = "AIzaSyCs9Y5RQJXJXnRjAHi9Wh7103qfC5C5aDI"     # ← 本物キーを''や""で包んで1行に!
input_file  = "許せない作品リスト - JKハルは異世界で娼婦になった.csv"
text_column = "レビュー本文"
output_file = Path(input_file).with_stem("negapozi_" + Path(input_file).stem)

# ---------- 以下は一切触らない ----------
url = f"https://language.googleapis.com/v1/documents:analyzeSentiment?key={API_KEY}"
headers = {"Content-Type": "application/json"}

print("[INFO] 読み込み:", input_file)
df = pd.read_csv(input_file, encoding="utf-8-sig")
print("[INFO] 行数:", len(df))
if text_column not in df.columns:
    raise KeyError(f"列 '{text_column}' がありません → {df.columns.tolist()}")

df["sentiment_score"] = None
df["sentiment_magnitude"] = None

for i, txt in enumerate(df[text_column].fillna("")):
    if not txt.strip():
        print(f"[SKIP] row {i} 空セル")
        continue
    # --- ここから追加 ---
    if i == 0:
        print("[DEBUG] 最初の本文プレビュー:", txt[:60].replace("\n","\\n"))
    # --- 追加ここまで ---
    payload = {
        "document":{"type":"PLAIN_TEXT","language":"ja","content":txt},
        "encodingType":"UTF8"
    }
    try:
        r = requests.post(url, json=payload, headers=headers, timeout=10)
        # --- ここから追加 ---
        if i == 0:                          # 最初の行だけ確認
            print("[DEBUG] HTTP:", r.status_code)
            print("[DEBUG] Body :", r.text[:160])
        # --- 追加ここまで ---
        if r.status_code != 200:
            print(f"[API ERROR] row {i} status {r.status_code} → {r.text[:80]}")
            continue
        s = r.json()["documentSentiment"]
        df.at[i, "sentiment_score"]     = s["score"]
        df.at[i, "sentiment_magnitude"] = s["magnitude"]
    except Exception as e:
        print(f"[EXCEPTION] row {i}: {e}")
        traceback.print_exc(limit=1)
    time.sleep(0.1)

df.to_csv(output_file, index=False, encoding="utf-8-sig")
print('✅ 完了:', output_file.resolve(), 'size =', output_file.stat().st_size, 'bytes')
