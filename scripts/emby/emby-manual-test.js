/* Loon Emby 手动测试：显示切换结果，不用于 Cron */
const GROUP = "Emby";
const hour = (new Date().getUTCHours() + 8) % 24;
const target = (hour >= 19 || hour < 2) ? "EM-P" : "EM-D";
const now = new Date();
const time = String(hour).padStart(2, "0") + ":" + String(now.getUTCMinutes()).padStart(2, "0");
let title = "Emby 线路检查";
let content = "";
try {
  const before = $config.getSelectedPolicy(GROUP);
  if (!before) {
    title = "Emby 检查失败";
    content = "未找到策略组 Emby";
  } else if (before === target) {
    title = "Emby 无需切换";
    content = "当前线路：" + before;
  } else {
    $config.setSelectPolicy(GROUP, target);
    const after = $config.getSelectedPolicy(GROUP);
    title = after === target ? "Emby 切换成功" : "Emby 切换失败";
    content = "原线路：" + before + "\n当前线路：" + after;
  }
} catch (e) {
  title = "Emby 执行异常";
  content = String(e);
}
content += "\n北京时间：" + time;
console.log("[Emby] " + title + " " + content);
$done({ title: title, content: content });
