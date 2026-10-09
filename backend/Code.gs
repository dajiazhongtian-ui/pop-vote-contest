/**
 * POPコンテスト投票バックエンド（Google Apps Script）
 * 投票数はこのスクリプトの共有プロパティに保存します。スプレッドシートは使いません。
 */
const RESULTS_PASSWORD = 'ここに関係者用パスワードを設定';
const COUNTS_KEY = 'ichinomiya_pop_vote_counts_v1';

function doGet(e) {
  const p = e && e.parameter ? e.parameter : {};
  const callback = String(p.callback || '');
  if (!/^[A-Za-z_$][A-Za-z0-9_$]{0,100}$/.test(callback)) {
    return ContentService.createTextOutput('Invalid callback').setMimeType(ContentService.MimeType.TEXT);
  }
  let result;
  try {
    if (p.action === 'vote') result = recordVote_(Number(p.no));
    else if (p.action === 'results') result = readResults_(String(p.password || ''));
    else result = { ok: false, error: 'invalid_action' };
  } catch (err) {
    result = { ok: false, error: 'server_error' };
  }
  return ContentService.createTextOutput(callback + '(' + JSON.stringify(result) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function recordVote_(no) {
  if (!Number.isInteger(no) || no < 1 || no > 15) return { ok: false, error: 'invalid_vote' };
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const properties = PropertiesService.getScriptProperties();
    const counts = readCounts_(properties);
    counts[no - 1]++;
    properties.setProperty(COUNTS_KEY, JSON.stringify(counts));
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function readResults_(password) {
  if (!RESULTS_PASSWORD || RESULTS_PASSWORD.indexOf('ここに') === 0 || password !== RESULTS_PASSWORD) {
    return { ok: false, error: 'unauthorized' };
  }
  const counts = readCounts_(PropertiesService.getScriptProperties());
  return { ok: true, total: counts.reduce((sum, n) => sum + n, 0), counts };
}

function readCounts_(properties) {
  const stored = properties.getProperty(COUNTS_KEY);
  if (!stored) return Array(15).fill(0);
  try {
    const values = JSON.parse(stored);
    if (Array.isArray(values) && values.length === 15 && values.every(n => Number.isInteger(n) && n >= 0)) return values;
  } catch (err) {}
  return Array(15).fill(0);
}
