// スプレッドシートのID を指定
const SPREADSHEET_ID = '1OLnjllLjb4Y_Idd1U-tk6QDlMpxMOCDKnfp6LPfYqLU';

/**
 * 汎用RSS/Atom/RDF フィード取得・当日分フィルタ
 */
function fetchCategoryRSS(sheet, platformName, rssUrl, today) {
  console.log('fetchCategoryRSS args:', platformName, rssUrl, today);
  let res;
  try {
    res = UrlFetchApp.fetch(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      muteHttpExceptions: true
    });
  } catch (e) {
    console.warn(`Failed to fetch ${platformName}: ${e}`);
    return;
  }
  if (res.getResponseCode() !== 200) {
    console.warn(`Failed to fetch ${platformName}: ${res.getResponseCode()}`);
    return;
  }
  const xml = res.getContentText();
  const doc = XmlService.parse(xml);
  const root = doc.getRootElement();

  const ns = root.getNamespace(); // Atom/RSS2.0
  const dcNs = XmlService.getNamespace('dc', 'http://purl.org/dc/elements/1.1/');
  const defaultNs = XmlService.getNamespace('', 'http://purl.org/rss/1.0/'); // RSS1.0

  let items = [];
  const name = root.getName();
  if (name === 'rss') {
    items = root.getChild('channel').getChildren('item');
  } else if (name === 'RDF') {
    items = root.getChildren('item', defaultNs);
  } else if (name === 'feed') {
    items = root.getChildren('entry', ns);
  } else {
    console.warn(`Unknown feed format: <${name}> for ${platformName}`);
    return;
  }

  const start = new Date(Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd') + 'T00:00:00+09:00');
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  items.forEach(item => {
    let title, link, raw;
    if (name === 'feed') {
      title = item.getChildText('title', ns);
      link = item.getChild('link', ns).getAttribute('href').getValue();
      raw = item.getChildText('updated', ns) || item.getChildText('published', ns);
    } else if (name === 'RDF') {
      title = item.getChildText('title', defaultNs);
      link = item.getChildText('link', defaultNs);
      raw = item.getChildText('date', dcNs) || item.getChildText('dc:date', dcNs);
    } else {
      title = item.getChildText('title');
      link = item.getChildText('link');
      raw = item.getChildText('pubDate');
    }
    const pubDate = new Date(raw);
    if (pubDate >= start && pubDate < end) {
      // 引用元を取得
      let source = '';
      if (name === 'rss') {
        source = item.getChildText('source') || '';
      } else {
        try {
          const detailHtml = UrlFetchApp.fetch(link, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            muteHttpExceptions: true
          }).getContentText();
          const m = detailHtml.match(
            /\d{4}年\d{1,2}月\d{1,2}日\s*\d{1,2}時\d{1,2}分\s*([^<\s]+)/
          );
          if (m) source = m[1].trim();
        } catch (e) {
          console.warn(`引用元取得失敗: ${link}`, e);
        }
      }
      // データを５列目（引用元）まで

if (pubDate >= start && pubDate < end) {
  // 引用元を取得（省略）
  // ちゃんと source に何が入っているかを出力
  console.log(`【引用元チェック】 ${platformName}｜${link} → "${source}"`);

  sheet.appendRow([platformName, title, link, pubDate, source]);
}
    }
  });
}

/**
 * メイン：まとめ用シートに当日分を取得・日ごと集計を追記
 */
function fetchAllPlatforms() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');

  // 当日シートの準備
  let sheet = ss.getSheetByName(today);
  if (!sheet) {
    sheet = ss.insertSheet(today);
    sheet.appendRow(['プラットフォーム', '見出し', 'URL', '取得日時', '引用元']);
  } else if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).clearContent();
  }

  // Yahoo! ニュース 各カテゴリ RSS
  fetchCategoryRSS(sheet, 'Yahoo! 主要',     'https://news.yahoo.co.jp/rss/topics/top-picks.xml',        today);
  fetchCategoryRSS(sheet, 'Yahoo! 国内',     'https://news.yahoo.co.jp/rss/topics/domestic.xml',         today);
  fetchCategoryRSS(sheet, 'Yahoo! 国際',     'https://news.yahoo.co.jp/rss/topics/world.xml',            today);
  fetchCategoryRSS(sheet, 'Yahoo! 経済',     'https://news.yahoo.co.jp/rss/topics/business.xml',         today);
  fetchCategoryRSS(sheet, 'Yahoo! エンタメ', 'https://news.yahoo.co.jp/rss/topics/entertainment.xml',    today);
  fetchCategoryRSS(sheet, 'Yahoo! スポーツ', 'https://news.yahoo.co.jp/rss/topics/sports.xml',           today);
  fetchCategoryRSS(sheet, 'Yahoo! IT',       'https://news.yahoo.co.jp/rss/topics/it.xml',               today);
  fetchCategoryRSS(sheet, 'Yahoo! 科学',     'https://news.yahoo.co.jp/rss/topics/science.xml',          today);
  fetchCategoryRSS(sheet, 'Yahoo! 地域',     'https://news.yahoo.co.jp/rss/topics/local.xml',            today);

  // livedoor ニュース各カテゴリ RSS
  fetchCategoryRSS(sheet, 'livedoor 主要ニュース',       'https://news.livedoor.com/topics/rss/top.xml',  today);
  fetchCategoryRSS(sheet, 'livedoor 国内ニュース',       'https://news.livedoor.com/topics/rss/dom.xml',  today);
  fetchCategoryRSS(sheet, 'livedoor 海外ニュース',       'https://news.livedoor.com/topics/rss/int.xml',  today);
  fetchCategoryRSS(sheet, 'livedoor IT・ネットニュース', 'https://news.livedoor.com/topics/rss/it.xml',   today);
  fetchCategoryRSS(sheet, 'livedoor 経済ニュース',       'https://news.livedoor.com/topics/rss/eco.xml',  today);
  fetchCategoryRSS(sheet, 'livedoor エンタメニュース',    'https://news.livedoor.com/topics/rss/ent.xml',  today);
  fetchCategoryRSS(sheet, 'livedoor スポーツニュース',    'https://news.livedoor.com/topics/rss/spo.xml',  today);

  // NHK NEWS WEB 各カテゴリ RSS
  fetchCategoryRSS(sheet, 'NHK 主要ニュース',   'https://www.nhk.or.jp/rss/news/cat0.xml',     today);
  fetchCategoryRSS(sheet, 'NHK 社会',           'https://www.nhk.or.jp/rss/news/cat1.xml',     today);
  fetchCategoryRSS(sheet, 'NHK 文化・エンタメ', 'https://www.nhk.or.jp/rss/news/cat2.xml',     today);
  fetchCategoryRSS(sheet, 'NHK 科学・医療',     'https://www.nhk.or.jp/rss/news/cat3.xml',     today);
  fetchCategoryRSS(sheet, 'NHK 政治',           'https://www.nhk.or.jp/rss/news/cat4.xml',     today);
  fetchCategoryRSS(sheet, 'NHK 経済',           'https://www.nhk.or.jp/rss/news/cat5.xml',     today);
  fetchCategoryRSS(sheet, 'NHK 国際',           'https://www.nhk.or.jp/rss/news/cat6.xml',     today);
  fetchCategoryRSS(sheet, 'NHK スポーツ',       'https://www.nhk.or.jp/rss/news/cat7.xml',     today);
  fetchCategoryRSS(sheet, 'NHK LIVEニュース',   'https://www.nhk.or.jp/rss/news/cat-live.xml', today);

  // ★ 日付シート完成 → キーワード抽出へ
// ★ 日付シート完成 → キーワード抽出へ
exportKeywordHits(today);


  // 日ごと集計数シートへ追記
  let totalSheet = ss.getSheetByName("日ごと集計数");
  if (!totalSheet) {
    totalSheet = ss.insertSheet("日ごと集計数");
    totalSheet.appendRow(['日付', '合計件数']);
  }
  const totalCount = sheet.getLastRow() - 1;  // ヘッダー行を除く
  totalSheet.appendRow([today, totalCount]);


}


/* ========= ユーザ設定 ========= */
const TARGET_SHEETS = [];           // 空配列 = 全シート対象
const MAKE_ZIP     = true;          // true: ZIP も作る
const SKIP_HIDDEN  = true;          // true: 非表示シートはスキップ
const FOLDER_ID    = '';            // 空ならスプレッドシートと同じフォルダ
/* ============================= */

function exportSheetsToCsvZip() {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const now  = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'yyyyMMdd_HHmmss_プラットフォーム');
  const base = getExportFolder_(ss, now);                       // 保存フォルダ

  const sheets = ss.getSheets().filter(sh => {
    if (SKIP_HIDDEN && sh.isSheetHidden()) return false;
    if (TARGET_SHEETS.length && !TARGET_SHEETS.includes(sh.getName())) return false;
    return true;
  });
  if (sheets.length === 0) {
    SpreadsheetApp.getUi().alert('対象シートがありません');
    return;
  }

  const files = sheets.map(sh => {
    const csv  = toCsv_(sh.getDataRange().getValues());
// スプレッドシート名を安全に（ / \ : などを _ に置換）
    const safeBookName = ss.getName().replace(/[\/\\\?\*\[\]:]/g, '_');
    const fileName     = `${sh.getName()}+${safeBookName}.csv`;   // yyyy-mm-dd+ブック名.csv
    const file         = base.createFile(fileName, csv, MimeType.CSV);
        return file;
  });

  if (MAKE_ZIP) {
    const blobArr = files.map(f => f.getBlob());
    const zipBlob = Utilities.zip(blobArr, ss.getName() + '_' + now + '.zip');
    base.createFile(zipBlob);
  }

  SpreadsheetApp.getUi().alert('✓ ' + sheets.length + ' シートを書き出しました！');
}

/* ---------- Helper ---------- */
function getExportFolder_(ss, stamp) {
  if (FOLDER_ID) return DriveApp.getFolderById(FOLDER_ID);
  const parents = DriveApp.getFileById(ss.getId()).getParents();
  const parent  = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  return parent.createFolder('CSV_' + stamp);
}

function toCsv_(values, sep = ',') {
  return values.map(r => r.map(escapeCsv_).join(sep)).join('\r\n');
}
function escapeCsv_(cell) {
  if (cell === null || cell === undefined) return '';
  const str = typeof cell === 'object' ? Utilities.formatString('%s', cell) : String(cell);
  return /[",\r\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
}

/* ---------- 自動メニュー ---------- */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('エクスポート')
    .addItem('シートを CSV + ZIP で保存', 'exportSheetsToCsvZip')
    .addToUi();
}
