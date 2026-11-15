/* Emby plugin scheduled task; parameters supplied by Loon [Argument]. */
const args = ($argument && typeof $argument === "object") ? $argument : {};
const group = args.group || "Emby";
const normal = args.normal || "EM-D";
const premium = args.premium || "EM-P";
const now = new Date();
const hour = (now.getUTCHours() + 8) % 24;
const target = (hour >= 19 || hour < 2) ? premium : normal;
let title = "Emby 线路检查", content = "";
try {
  const before = $config.getSelectedPolicy(group);
  if (!before) {
    title = "Emby 检查失败";
    content = "未找到主策略组：" + group;
  } else if (before === target) {
    title = "Emby 无需切换";
    content = "当前线路：" + before;
  } else {
    $config.setSelectPolicy(group, target);
    const after = $config.getSelectedPolicy(group);
    title = after === target ? "Emby 切换成功" : "Emby 切换失败";
    content = "原线路：" + before + "\n目标线路：" + target + "\n实际线路：" + String(after);
  }
} catch (e) {
  title = "Emby 执行异常";
  content = String(e);
}
content += "\n北京时间：" + String(hour).padStart(2, "0") + ":" + String(now.getUTCMinutes()).padStart(2, "0");
console.log("[Emby Plugin] " + title + "；" + content.replace(/\n/g, "；"));
$done();
