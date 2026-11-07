/**
 * UOOC 弹题机器人 quiz-bot.js (v3)
 *
 * 作用：视频播放中途弹出的"小测"窗口自动答题——
 *   - 单选题：从第一个选项开始逐个试答并点"确定"，直到弹窗关闭（答对）；
 *   - 无选项的通知类弹窗：直接点"确定"关闭；
 *   - 四个选项全部试完仍未通过：停止尝试，闪烁标签页标题提醒人工处理；
 *   - 每道题的尝试记录保存在 window.__quizLog。
 *
 * 注意：错误选项的提交可能被平台记录，章节测试等大考请自行作答。
 * 单独使用：粘贴整段到课程页面控制台回车。
 * 停止：clearInterval(window.__quizBot)
 */
(function () {
  if (window.__quizBot) clearInterval(window.__quizBot);
  window.__quizLog = window.__quizLog || [];
  const lastTitle = document.title;
  const qs = { busy: false, key: null, tried: 0, stuck: false };

  // layui 弹窗是 position:fixed，offsetParent 恒为 null，必须用尺寸判断可见性
  const visible = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };

  window.__quizBot = setInterval(() => {
    if (qs.busy) return;
    const layer = document.querySelector('.layui-layer.reset_layer_confirm');
    if (!layer || !visible(layer)) {
      if (qs.key !== null && document.title !== lastTitle) document.title = lastTitle;
      qs.key = null; qs.tried = 0; qs.stuck = false;
      return;
    }
    const radios = [...layer.querySelectorAll('input[type=radio]')];
    const btn = [...layer.querySelectorAll('button')].find(b => /确定|提交|回答/.test(b.innerText || ''));
    if (!radios.length) { // 通知类弹窗，直接关闭
      if (btn) { qs.busy = true; btn.click(); setTimeout(() => { qs.busy = false; }, 1000); }
      return;
    }
    // 题目 key 只取题干（第一个选项之前），避免答错提示文字改变 key 导致计数重置
    const full = layer.innerText.trim();
    const stem = full.split('A.')[0].trim().slice(0, 120);
    if (qs.key !== stem) {
      qs.key = stem; qs.tried = 0; qs.stuck = false;
      window.__quizLog.push({ q: stem, attempts: [] });
    }
    if (qs.stuck) { // 全部试过还不对 → 闪标题提醒人工
      document.title = document.title.includes('【弹题卡住】') ? lastTitle : '【弹题卡住】' + lastTitle;
      return;
    }
    if (qs.tried >= radios.length) { qs.stuck = true; return; }
    qs.busy = true;
    const label = (radios[qs.tried].closest('label,div') || radios[qs.tried].parentElement).innerText.trim().slice(0, 30);
    radios[qs.tried].click();
    if (btn) btn.click();
    window.__quizLog[window.__quizLog.length - 1].attempts.push(label);
    qs.tried++;
    setTimeout(() => { qs.busy = false; }, 1800);
  }, 2000);
  console.log('[UOOC助手] 弹题机器人已启动');
})();
