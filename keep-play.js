/**
 * UOOC 防暂停守护 keep-play.js
 *
 * 作用：鼠标离开播放器、窗口失焦、切换标签页导致视频被平台暂停时，
 *       每 0.8 秒检查一次并自动恢复播放。
 *
 * 单独使用：粘贴整段到课程页面控制台回车。
 * 停止：clearInterval(window.__keepPlayTimer)
 */
(function () {
  if (window.__keepPlayTimer) clearInterval(window.__keepPlayTimer);
  window.__keepPlayTimer = setInterval(() => {
    const v = document.querySelector('video');
    if (v && v.paused && !v.ended && v.currentTime > 0) {
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
    }
  }, 800);
  console.log('[UOOC助手] 防暂停守护已启动');
})();
