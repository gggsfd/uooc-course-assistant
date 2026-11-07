/**
 * UOOC 遮罩清理器 shade-cleaner.js
 *
 * 作用：小测弹窗关闭后，layui 的黑色遮罩层有时会残留不消失，
 *       每次弹题叠一层，叠多了整个页面全黑（视频其实还在正常播放）。
 *       本脚本每 5 秒检查一次，清除弹窗已消失但残留的黑色遮罩。
 *
 * 单独使用：粘贴整段到课程页面控制台回车。
 * 停止：clearInterval(window.__shadeCleaner)
 */
(function () {
  if (window.__shadeCleaner) clearInterval(window.__shadeCleaner);
  window.__shadeCleaner = setInterval(() => {
    document.querySelectorAll('.layui-layer-shade').forEach(s => {
      const t = s.getAttribute('times');
      // 遮罩带有 times 编号，对应的弹窗不存在了（或已关闭）就移除遮罩
      if (!t || !document.getElementById('layui-layer' + t)) s.remove();
    });
  }, 5000);
  console.log('[UOOC助手] 遮罩清理器已启动');
})();
