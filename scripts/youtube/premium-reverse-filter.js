/*
 * YouTube Premium 反向筛选（手动）
 * YouTube Premium 地区限制检测思路参考：XIAO_KOP (KOP-XIAO)
 * 参考：https://raw.githubusercontent.com/KOP-XIAO/QuantumultX/master/Scripts/streaming-ui-check.js
 * Loon 适配、反向筛选与自动切换：MiaoWaa
 * 仅在 YouTube 页面明确提示 Premium 不可用时才作为候选。
 * 检测失败、HTTP 异常、页面无法识别一律不切换。
 */
const options = (typeof $argument !== "undefined" && $argument && typeof $argument === "object") ? $argument : {};
const GROUP = String(options.group || "YouTube").trim();
const URL = "https://www.youtube.com/premium";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const REQUEST_TIMEOUT = 6500;
const CONCURRENCY = 4;
const counts = { unsupported: 0, supported: 0, unknown: 0 };
const qualified = [];
let finished = false;

function finish(title, message) {
  if (finished) return;
  finished = true;
  console.log("[YouTube Premium] " + title + "；" + message.replace(/\n/g, "；"));
  $done({ title: title, content: message });
}
function extractName(entry) {
  if (typeof entry === "string") return entry;
  if (!entry || typeof entry !== "object") return "";
  return entry.name || entry.policy || entry.tag || entry.node || "";
}
function classify(error, response, body) {
  if (error || !response || Number(response.status) !== 200 || typeof body !== "string") return "unknown";
  const html = body.replace(/\\u0027/g, "'").replace(/\\u003d/g, "=");
  // Only explicit regional-unavailability messages count as non-Premium.
  if (/Premium is not available in your country|YouTube Premium is not available in your country|Premium isn't available in your country|Premium is not available in your region/i.test(html)) return "unsupported";
  // HTTP 200 alone is not evidence of Premium support.
  if (/youtube\.com|youtubei|ytInitialData|ytcfg\.set/.test(html)) return "supported";
  return "unknown";
}
function check(node) {
  return new Promise(function (resolve) {
    try {
      $httpClient.get({
        url: URL,
        node: node,
        timeout: REQUEST_TIMEOUT,
        headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
        "auto-redirect": true,
        "auto-cookie": false,
        insecure: false
      }, function (err, response, data) {
        const result = classify(err, response, data);
        console.log("[YouTube Premium] " + node + " => " + result + (err ? " (" + String(err) + ")" : ""));
        resolve({ node: node, result: result });
      });
    } catch (e) {
      console.log("[YouTube Premium] " + node + " => error " + String(e));
      resolve({ node: node, result: "unknown" });
    }
  });
}
async function scan(nodes) {
  let cursor = 0;
  async function worker() {
    while (cursor < nodes.length) {
      const index = cursor++;
      const item = await check(nodes[index]);
      counts[item.result]++;
      if (item.result === "unsupported") qualified.push({ index: index, node: item.node });
    }
  }
  const workers = [];
  for (let i = 0; i < Math.min(CONCURRENCY, nodes.length); i++) workers.push(worker());
  await Promise.all(workers);
  qualified.sort((a, b) => a.index - b.index);
  const before = $config.getSelectedPolicy(GROUP);
  let title = "YouTube 筛选完成";
  let selection = "未发现明确不支持 Premium 的节点，保持原选择";
  if (qualified.length) {
    const target = qualified[0].node;
    const accepted = $config.setSelectPolicy(GROUP, target);
    const actual = $config.getSelectedPolicy(GROUP);
    if (accepted && actual === target) selection = "已选中：" + target;
    else {
      title = "YouTube 切换失败";
      selection = "候选：" + target + "；实际：" + String(actual);
    }
  }
  finish(title, "━━━━━━━━━━━━━━" +
    "\n策略组  " + GROUP +
    "\n\nPremium 地区检测" +
    "\n  检测总数   " + nodes.length +
    "\n  ✓ 明确不支持  " + counts.unsupported +
    "\n  · 页面可访问  " + counts.supported +
    "\n  ? 无法判断    " + counts.unknown +
    "\n\n节点选择" +
    "\n  原选择  " + String(before) +
    "\n  " + selection +
    "\n\n注：页面可访问不代表支持 Premium" +
    "\n━━━━━━━━━━━━━━");
}
try {
  if (!GROUP) {
    finish("YouTube 配置错误", "策略组名称不能为空");
  } else {
    $config.getSubPolicies(GROUP, function (raw) {
      try {
        const list = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(list) || !list.length) {
          finish("YouTube 无可用节点", "未读取到策略组 " + GROUP + " 的候选节点");
          return;
        }
        const seen = {};
        const nodes = list.map(extractName).filter(function (name) {
          if (!name || name === GROUP || name === "DIRECT" || name === "REJECT" || seen[name]) return false;
          seen[name] = true;
          return true;
        });
        if (!nodes.length) {
          finish("YouTube 无可检测节点", "策略组中没有可检测的节点");
          return;
        }
        scan(nodes).catch(function (e) { finish("YouTube 执行异常", String(e)); });
      } catch (e) { finish("YouTube 解析失败", String(e)); }
    });
  }
} catch (e) { finish("YouTube 执行异常", String(e)); }
