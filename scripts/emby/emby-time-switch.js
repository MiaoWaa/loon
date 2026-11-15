/*
 * Loon Emby 定时切换
 * 北京时间 02:00–19:00：EM-D
 * 北京时间 19:00–02:00：EM-P
 * Generic 手动执行返回结果；Cron 静默执行。
 */
const GROUP = "Emby";
const NORMAL = "EM-D";
const PREMIUM = "EM-P";
const now = new Date();
const hour = (now.getUTCHours() + 8) % 24;
const target = (hour >= 19 || hour < 2) ? PREMIUM : NORMAL;
const time = String(hour).padStart(2, "0") + ":" +
  String(now.getUTCMinutes()).padStart(2, "0");
const manual = typeof $script !== "undefined" &&
  $script.name === "Emby线路测试";

let title = "Emby 线路状态";
let message = "";
try {
  const current = $config.getSelectedPolicy(GROUP);
  if (!current) {
    title = "Emby 检查失败";
    message = "未找到策略组：" + GROUP;
  } else if (current === target) {
    title = "Emby 无需切换";
    message = "当前线路：" + target + "\n状态：已是目标线路";
  } else {
    const requested = $config.setSelectPolicy(GROUP, target);
    const selected = $config.getSelectedPolicy(GROUP);
    if (requested && selected === target) {
      title = "Emby 切换成功";
      message = "原线路：" + current + "\n当前线路：" + selected;
    } else {
      title = "Emby 切换失败";
      message = "原线路：" + current + "\n目标线路：" + target +
        "\n实际线路：" + String(selected);
    }
  }
} catch (error) {
  title = "Emby 执行异常";
  message = String(error);
}
message += "\n北京时间：" + time;
console.log("[Emby] " + title + "；" + message.replace(/\n/g, "；"));
if (manual) {
  $done({ title: title, content: message });
} else {
  $done();
}
