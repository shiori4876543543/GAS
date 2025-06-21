/* ① 収集元スプレッドシート ID を並べる */
const SRC_BOOK_IDS = [
  '1XQtvK2YaZRn15vVb8PmMkDgUQq30slEMnQVgcNtmUYk', // 都道府県
  '1OLnjllLjb4Y_Idd1U-tk6QDlMpxMOCDKnfp6LPfYqLU', // プラットフォーム
  '1p86smIYYXgJGdRxh1-PbcL0X0xXkpRpq1GlTsFBf3YQ', // 全国紙 
  '12LV-jyI0VvKgEgGyzmVlsZY4aA5D2fK1M3KpGo6dTcY', // 地方紙
]; // ← ★ここで配列を閉じる！

/* ② 抽出結果保存ブック ID */
const DST_BOOK_ID = '1Y9m9YHGHARNAP5iU2c4sSK0Akxbh6RdrBeUvG8wewAE';

/* ③ キーワード */
const KEYWORDS = [
  /経済/i, /国際/i, /労働/, /表現/, /働き方/,
];

/* ---------- 1) 今日のニュースを各ブックへ ---------- */
function fetchAllPlatforms_ALL_BOOKS() {
  SRC_BOOK_IDS.map(id => id.trim()).filter(Boolean).forEach(id => {
    try { fetchAllPlatforms(id); }
    catch (e) { console.warn('fetch skip: ' + id + ' / ' + e); }
  });
}

function fetchAllPlatforms(spreadsheetId) {
  const ss    = SpreadsheetApp.openById(spreadsheetId);
  const today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
  let sheet   = ss.getSheetByName(today);
  if (!sheet) {
    sheet = ss.insertSheet(today);
    sheet.appendRow(['プラットフォーム', '見出し', 'URL', '取得日時']);
  } else if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).clearContent();
  }

  fetchCategoryRSS(
    sheet,
    'NHK 主要ニュース',
    'https://www.nhk.or.jp/rss/news/cat0.xml',
    today
  );
}

/* ---------- RSS 取得 ---------- */
function fetchCategoryRSS(sheet, platform, url, today) {
  let res;
  try {
    res = UrlFetchApp.fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (res.getResponseCode() !== 200) return;
  } catch (_) { return; }

  const xml  = res.getContentText();
  const doc  = XmlService.parse(xml);
  const root = doc.getRootElement();
  const ns   = root.getNamespace();
  const dc   = XmlService.getNamespace('dc','http://purl.org/dc/elements/1.1/');
  const def  = XmlService.getNamespace('','http://purl.org/rss/1.0/');

  const items =
    root.getName() === 'rss'  ? root.getChild('channel').getChildren('item') :
    root.getName() === 'RDF'  ? root.getChildren('item', def)               :
    root.getName() === 'feed' ? root.getChildren('entry', ns)               : [];

  const start = new Date(`${today}T00:00:00+09:00`);
  const end   = new Date(start.getTime() + 86400000); // 24h

  items.forEach(it => {
    let title, link, raw;
    if (root.getName() === 'feed') {
      title = it.getChildText('title', ns);
      link  = it.getChild('link', ns).getAttribute('href').getValue();
      raw   = it.getChildText('updated', ns) || it.getChildText('published', ns);
    } else if (root.getName() === 'RDF') {
      title = it.getChildText('title', def);
      link  = it.getChildText('link',  def);
      raw   = it.getChildText('date', dc) || it.getChildText('dc:date', dc);
    } else {
      title = it.getChildText('title');
      link  = it.getChildText('link');
      raw   = it.getChildText('pubDate');
    }
    const pub = new Date(raw);
    if (pub >= start && pub < end) sheet.appendRow([platform, title, link, pub]);
  });
}

/* ---------- 2) 今日だけ抽出 ---------- */
function filterSexCrime_TODAY_ALL_BOOKS() {
  const today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
  filterSexCrimeCore(false, today);
}

/* ---------- 3) 過去すべて抽出 ---------- */
function filterSexCrime_ALL_DATES_ALL_BOOKS() {
  filterSexCrimeCore(true, null);
}

/* ---------- 共通抽出ロジック ---------- */
function filterSexCrimeCore(allDates, targetDate) {
  const dstSS   = SpreadsheetApp.openById(DST_BOOK_ID);
  const dateRe  = /^\d{4}-\d{2}-\d{2}$/;
  let totalHits = 0;

  SRC_BOOK_IDS.forEach(id => {
    let srcSS;
    try { srcSS = SpreadsheetApp.openById(id.trim()); }
    catch (e) { console.warn('open skip: ' + id + ' / ' + e); return; }

    const sheets = allDates
      ? srcSS.getSheets().filter(sh => dateRe.test(sh.getName()))
      : [srcSS.getSheetByName(targetDate)];

    sheets.forEach(sh => {
      if (!sh) return;
      if (sh.getLastRow() < 2) return;
      const date = sh.getName();
      const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues();
      const hits = rows.filter(r => {
        const t = r[1] || '';
        return KEYWORDS.some(k => k.test ? k.test(t) : t.includes(k));
      });
      if (!hits.length) return;

      let dst = dstSS.getSheetByName(date);
      if (!dst) {
        dst = dstSS.insertSheet(date);
        dst.appendRow(['プラットフォーム', '見出し', 'URL', '取得日時']);
      }
      dst.getRange(dst.getLastRow() + 1, 1, hits.length, 4).setValues(hits);
      totalHits += hits.length;
    });
  });

  SpreadsheetApp.getUi().alert(`抽出完了：${totalHits} 件`);
}

/* ---------- メニュー ---------- */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('NewsTools')
    .addItem('① 全ブックで今日のニュース取得', 'fetchAllPlatforms_ALL_BOOKS')
    .addItem('② 今日だけ抽出 → 保存',          'filterSexCrime_TODAY_ALL_BOOKS')
    .addItem('③ 過去すべて抽出 → 保存',        'filterSexCrime_ALL_DATES_ALL_BOOKS')
    .addToUi();
}
