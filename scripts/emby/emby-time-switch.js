/* Loon Emby 定时切换：北京时间 02:00–19:00 EM-D；19:00–02:00 EM-P */
const GROUP = "Emby";
const NORMAL = "EM-D";
const PREMIUM = "EM-P";
const hour = (new Date().getUTCHours() + 8) % 24;
const target = (hour >= 19 || hour < 2) ? PREMIUM : NORMAL;
try {
  const current = $config.getSelectedPolicy(GROUP);
  if (!current) {
    console.log("[Emby] 未找到策略组：" + GROUP);
  } else if (current === target) {
    console.log("[Emby] 无需切换：" + target);
  } else {
    const success = $config.setSelectPolicy(GROUP, target);
    console.log("[Emby] " + (success ? "切换请求成功" : "切换请求失败") + "：" + current + " -> " + target);
  }
} catch (e) {
  console.log("[Emby] 执行错误：" + String(e));
}
$done();
