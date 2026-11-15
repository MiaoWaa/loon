// Loon 节点订阅资源解析器：仅给已识别地区的节点名称添加国旗。
// 对不支持的订阅格式原样返回，避免损坏连接参数。
(function () {
  var source = typeof $resource === "string" ? $resource : "";
  if (typeof $resourceType !== "undefined" && $resourceType !== 1) {
    $done(source);
    return;
  }
  var regions = [
    ["🇭🇰", /香港|hong[ -]?kong|\bHK\b/i],
    ["🇨🇳", /台湾|臺灣|taiwan|taipei|\bTW\b/i],
    ["🇯🇵", /日本|东京|東京|大阪|japan|tokyo|osaka|\bJP\b/i],
    ["🇸🇬", /新加坡|狮城|singapore|\bSG\b/i],
    ["🇺🇸", /美国|美國|洛杉矶|洛杉磯|纽约|紐約|united[ -]?states|los[ -]?angeles|new[ -]?york|\bUS\b|\bUSA\b/i],
    ["🇰🇷", /韩国|韓國|首尔|首爾|korea|seoul|\bKR\b/i],
    ["🇬🇧", /英国|英國|伦敦|倫敦|united[ -]?kingdom|britain|london|\bUK\b|\bGB\b/i],
    ["🇩🇪", /德国|德國|法兰克福|法蘭克福|germany|frankfurt|\bDE\b/i],
    ["🇫🇷", /法国|法國|巴黎|france|paris|\bFR\b/i],
    ["🇨🇦", /加拿大|多伦多|多倫多|canada|toronto|\bCA\b/i],
    ["🇦🇺", /澳大利亚|澳洲|悉尼|雪梨|australia|sydney|\bAU\b/i],
    ["🇳🇱", /荷兰|荷蘭|阿姆斯特丹|netherlands|amsterdam|\bNL\b/i]
  ];
  function flagFor(name) {
    for (var i = 0; i < regions.length; i++) {
      if (regions[i][1].test(name)) return regions[i][0];
    }
    return "";
  }
  function rename(name) {
    var flag = flagFor(name);
    if (!flag) return name;
    var cleaned = name.replace(/^\s*(?:[\u{1F1E6}-\u{1F1FF}]{2}|[☒☐☑□■▣]|\uFFFD)\s*/u, "").trim();
    return flag + " " + cleaned;
  }
  function transform(line) {
    var m = /^(\s*)([^#=\r\n][^=\r\n]*?)(\s*=\s*)([^\r\n]+)$/.exec(line);
    if (m && /^(ss|ssr|vmess|vless|trojan|hysteria2|hysteria|tuic|wireguard|anytls|http|https|socks5|shadowsocks)\s*,/i.test(m[4])) {
      return m[1] + rename(m[2].trim()) + m[3] + m[4];
    }
    // URI 节点：只替换 # 后的节点名，保留其余内容。
    if (/^(ss|ssr|vmess|vless|trojan|hysteria2|hysteria|tuic|anytls):\/\//i.test(line)) {
      var hash = line.lastIndexOf("#");
      if (hash < 0) return line;
      var part = line.slice(hash + 1);
      try {
        var name = decodeURIComponent(part);
        var changed = rename(name);
        return changed === name ? line : line.slice(0, hash + 1) + encodeURIComponent(changed);
      } catch (_) { return line; }
    }
    return line;
  }
  function detectFormat(text) {
    var t = text.trim();
    if (!t) return "empty";
    if (/^proxies\s*:/m.test(t)) return "clash-yaml";
    if (/^\s*\[Proxy\]/mi.test(t)) return "loon-proxy";
    if (/^(ss|ssr|vmess|vless|trojan|hysteria2|hysteria|tuic|anytls):\/\//mi.test(t)) return "uri-list";
    if (/^[A-Za-z0-9+/_=\s-]+$/.test(t) && t.length > 24) return "base64-candidate";
    return "unknown-text";
  }
  console.log("[节点国旗 Emoji] 资源类型=" + (typeof $resourceType === "undefined" ? "unknown" : $resourceType) + "，输入长度=" + source.length + "，格式=" + detectFormat(source));
  try {
    var lines = source.split(/(\r\n|\n|\r)/);
    var section = "";
    var changed = 0;
    for (var i = 0; i < lines.length; i += 2) {
      var line = lines[i];
      var header = /^\s*\[([^\]]+)\]\s*$/.exec(line);
      if (header) { section = header[1].toLowerCase(); continue; }
      if (section && section !== "proxy") continue;
      var updated = transform(line);
      if (updated !== line) { lines[i] = updated; changed++; }
    }
    console.log("[节点国旗 Emoji] 已处理 " + changed + " 个节点名称");
    $done(lines.join(""));
  } catch (e) {
    console.log("[节点国旗 Emoji] 解析失败，保留原始订阅：" + e);
    $done(source);
  }
})();
