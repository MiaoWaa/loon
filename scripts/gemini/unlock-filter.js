/*
 * Loon AI 服务节点筛选 - 手动版
 * 服务：Gemini
 * Gemini 检测、Loon 适配及策略组自动选择：MiaoWaa
 * 未直接引用第三方 Gemini 检测脚本。
 * 结果是网络/地区可用性初筛，不代表账号可登录或具备全部功能。
 */
const a = (typeof $argument !== "undefined" && $argument && typeof $argument === "object") ? $argument : {};
const GROUP = String(a.gemini_group || a.group || "Gemini").trim();
const SERVICE = "Gemini";
const TIMEOUT = 8000;
const CONCURRENCY = 3;
let ended = false;
function done(title, message) {
  if (ended) return;
  ended = true;
  console.log("[" + SERVICE + "] " + title + "；" + message.replace(/\n/g, "；"));
  $done({title: title, content: message});
}
function nameOf(x) { return typeof x === "string" ? x : x && (x.name || x.policy || x.tag || x.node) || ""; }
function request(node, url, headers) {
  return new Promise(resolve => {
    try {
      $httpClient.get({url, node, timeout: TIMEOUT, "auto-redirect": false,
        headers: Object.assign({"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36", "Accept-Language": "en-US,en;q=0.9"}, headers || {})},
        (err, res, body) => resolve({error: err, status: res && Number(res.status), headers: res && res.headers || {}, body: typeof body === "string" ? body : ""}));
    } catch (e) { resolve({error: String(e), status: 0, headers: {}, body: ""}); }
  });
}
async function test(node) {
  const page = await request(node, "https://gemini.google.com/app");
  if (page.error) return "unknown";
  const html = page.body || "";
  if (/Gemini isn't currently supported in your country|Gemini is not available in your country|Gemini isn't available in your country|Gemini is not supported in your country|not available in your region/i.test(html)) return "fail";
  // An unauthenticated landing page alone cannot prove Gemini access.
  // Require Gemini-specific page markers, not merely HTTP 200.
  if (page.status === 200 && /gemini/i.test(html) && /google/i.test(html) && html.length > 1000) return "pass";
  return "unknown";
}
async function scan(nodes) {
  const outcomes = new Array(nodes.length);
  let next = 0;
  async function worker() {
    while (next < nodes.length) {
      const i = next++;
      try { outcomes[i] = await test(nodes[i]); }
      catch (e) { outcomes[i] = "unknown"; }
      console.log("[" + SERVICE + "] " + nodes[i] + " => " + outcomes[i]);
    }
  }
  await Promise.all(Array.from({length: Math.min(CONCURRENCY, nodes.length)}, () => worker()));
  const passed = outcomes.map((v, i) => v === "pass" ? nodes[i] : null).filter(Boolean);
  const failed = outcomes.filter(v => v === "fail").length;
  const unknown = outcomes.filter(v => v === "unknown").length;
  const before = $config.getSelectedPolicy(GROUP);
  let title = SERVICE + " 筛选完成";
  let result = "无确认合格节点，保持原选择";
  if (passed.length) {
    const target = passed[0];
    const ok = $config.setSelectPolicy(GROUP, target);
    const after = $config.getSelectedPolicy(GROUP);
    if (ok && after === target) result = "已选中：" + target;
    else { title = SERVICE + " 切换失败"; result = "目标：" + target + "；实际：" + String(after); }
  }
  done(title, "策略组：" + GROUP + "\n检测：" + nodes.length + "\n通过初筛：" + passed.length +
    "\n明确受限：" + failed + "\n异常/不确定：" + unknown +
    "\n原选择：" + String(before) + "\n" + result);
}
try {
  $config.getSubPolicies(GROUP, function(raw) {
    try {
      const list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) return done(SERVICE + " 检测失败", "无法读取策略组节点：" + GROUP);
      const seen = new Set();
      const nodes = list.map(nameOf).filter(n => n && n !== GROUP && n !== "DIRECT" && n !== "REJECT" && !seen.has(n) && seen.add(n));
      if (!nodes.length) return done(SERVICE + " 无候选节点", "策略组：" + GROUP);
      scan(nodes).catch(e => done(SERVICE + " 执行异常", String(e)));
    } catch(e) { done(SERVICE + " 解析失败", String(e)); }
  });
} catch(e) { done(SERVICE + " 执行异常", String(e)); }
