function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('▶ ランキング整形')
    .addItem('今日分を作成', 'createTodaySheet')
    .addToUi();
}

function createTodaySheet() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const raw = ss.getSheetByName('修正前');
  if (!raw) return SpreadsheetApp.getUi().alert('「修正前」が無いよ');

  const today = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd');
  const ui = SpreadsheetApp.getUi();
  const old = ss.getSheetByName(today);
  if (old && ui.alert(`${today} 既にあるよ、上書きする？`, ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  if (old) ss.deleteSheet(old);

  /** ─ ① シート全体 → 1 配列 ─ */
  const lines = raw.getDataRange().getValues()
                   .flatMap(r => r)             // 2D → 1D
                   .map(v => String(v).trim())
                   .filter(Boolean);

  /** ─ ② ランキング開始行 ─ */
  const head = lines.findIndex(s => /^(?:ランキング\s*)?\d{1,3}位/.test(s));
  if (head < 0) return ui.alert('ランキング行が見つからないよ');
  const target = lines.slice(head);

  /** ─ ③ パース ─ */
  const recs = [];
  let rec = {};
  target.forEach(line => {
    if (/^(?:ランキング\s*)?\d{1,3}位/.test(line)) {
      if (rec['作品タイトル']) recs.push(rec);   // ← タイトル無ければ捨てる
      rec = { 'ランキング': line };
      return;
    }
    if (/作家：/.test(line))              rec['作家']           = line.split('：')[1].trim();
    else if (/ジャンル：/.test(line))      rec['ジャンル']       = line.split('：')[1].trim();
    else if (/雑誌・レーベル：/.test(line)) rec['雑誌・レーベル'] = line.split('：')[1].trim();
    else if (/巻数：/.test(line) && /価格：/.test(line)) {
      rec['巻数'] = line.match(/巻数：\s*([^\s]+)/)[1];
      rec['価格'] = line.match(/価格：([^\s]+)/)[1];
    }
    else if (/（[\d.]+） 投稿数\d+件/.test(line)) {
      const m = line.match(/（([\d.]+)） 投稿数(\d+)件/);
      rec['評価']    = m[1];
      rec['レビュー'] = m[2];
    }
    else if (!rec['作品タイトル'] &&
             !/作家：|ジャンル：|雑誌・レーベル：|巻数：|価格：/.test(line)) {
      rec['作品タイトル'] = line;
    }
  });
  if (rec['作品タイトル']) recs.push(rec);      // 最後のレコードも同条件で

  /** ─ ④ 出力 ─ */
  const headers = ['ランキング','作品タイトル','作家','ジャンル',
                   '雑誌・レーベル','巻数','価格','評価','レビュー'];
  const baseIdx = raw.getIndex();                       // 「修正前」の位置
  const out = ss.insertSheet(today, baseIdx + 1);       // その右隣へ
  out.appendRow(headers);
  recs.forEach(r => out.appendRow(headers.map(h => r[h] || '')));
  out.getRange(1,1,out.getLastRow(),headers.length).createFilter();
  out.autoResizeColumns(1, headers.length);

  ui.alert(`${today} シートを作成：${recs.length} 作品`);
  // raw.clear(); // 仕事後に空にしたいときはコメントアウト外す
}


function 集計実行() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  const targetGenres = ["少年マンガ", "青年マンガ", "少女マンガ", "女性マンガ", "BLマンガ", "TLマンガ"];
  const excludedGenres = ["ライトノベル", "実用書", "ジャンル不明", "マンガ雑誌"];
  const sheetName = "集計シート";
  const output = [];

  // 並び順の優先リスト
  const orderList = [
    "10代女性", "20代女性", "30代女性", "40代女性", "50代～女性",
    "10代男性", "20代男性", "30代男性", "40代男性", "50代～男性"
  ];

  sheets.forEach(sheet => {
    const name = sheet.getName();
    if (!/^20\d{2}-\d{2}-\d{2}/.test(name)) return;

    const date = name.slice(0, 10);
    const ageMatch = name.match(/(10代|20代|30代|40代|50代[～代]?)/);
    const gender = name.includes("女性") ? "女性" : "男性";
    const age = ageMatch ? ageMatch[1] : "";
    const label = age + gender;

    const data = sheet.getDataRange().getValues();
    const header = data[0];
    const genreIndex = header.indexOf("ジャンル");
    if (genreIndex === -1) return;

    let counts = {};
    targetGenres.forEach(g => counts[g] = 0);

    for (let i = 1; i < data.length; i++) {
      const genre = data[i][genreIndex];
      if (!excludedGenres.includes(genre) && targetGenres.includes(genre)) {
        counts[genre]++;
      }
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    output.push([date, label, ...targetGenres.map(g => counts[g]), total]);
  });

  // 並び順でソート
  output.sort((a, b) => {
    const dateCompare = a[0].localeCompare(b[0]); // 日付昇順
    if (dateCompare !== 0) return dateCompare;
    return orderList.indexOf(a[1]) - orderList.indexOf(b[1]); // 年代順
  });

  // シートに書き出し
  const headers = ["日付", "年代", ...targetGenres, "合計"];
  const targetSheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
  targetSheet.clearContents();
  targetSheet.appendRow(headers);
  output.forEach(row => targetSheet.appendRow(row));
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('▶ ランキング整形')
    .addItem('今日分を作成', 'createTodaySheet')
    .addItem('集計実行', '集計実行')   // ← ここを追加
    .addToUi();
}
