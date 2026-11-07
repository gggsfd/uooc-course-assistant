/**
 * UOOC 网课助手 · 一键安装 install-all.js
 *
 * 把本文件完整内容粘贴到优课在线课程页面的浏览器控制台（F12 -> Console），
 * 回车即可同时启动四个模块：
 *   1. 防暂停守护    （切窗口/失焦自动恢复播放）
 *   2. 弹题机器人    （小测弹窗自动试答，卡住时闪标题提醒）
 *   3. 遮罩清理器    （清除弹窗残留的叠层黑幕）
 *   4. 自动下一节 v5 （播完自动进下一视频/三级小节/节/章）
 *
 * 停止全部：__stopQuizBot()
 * 答题记录：__quizLog
 * 刷新页面后需重新粘贴运行。
 */
(function () {
  'use strict';

  /* ==================== 1. 防暂停守护 ==================== */
  if (window.__keepPlayTimer) clearInterval(window.__keepPlayTimer);
  window.__keepPlayTimer = setInterval(() => {
    const v = document.querySelector('video');
    if (v && v.paused && !v.ended && v.currentTime > 0) {
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
    }
  }, 800);

  /* ==================== 2. 弹题机器人 v3 ==================== */
  if (window.__quizBot) clearInterval(window.__quizBot);
  window.__quizLog = window.__quizLog || [];
  const lastTitle = document.title;
  const qs = { busy: false, key: null, tried: 0, stuck: false };
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
    if (!radios.length) {
      if (btn) { qs.busy = true; btn.click(); setTimeout(() => { qs.busy = false; }, 1000); }
      return;
    }
    const full = layer.innerText.trim();
    const stem = full.split('A.')[0].trim().slice(0, 120);
    if (qs.key !== stem) {
      qs.key = stem; qs.tried = 0; qs.stuck = false;
      window.__quizLog.push({ q: stem, attempts: [] });
    }
    if (qs.stuck) {
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

  /* ==================== 3. 遮罩清理器 ==================== */
  if (window.__shadeCleaner) clearInterval(window.__shadeCleaner);
  window.__shadeCleaner = setInterval(() => {
    document.querySelectorAll('.layui-layer-shade').forEach(s => {
      const t = s.getAttribute('times');
      if (!t || !document.getElementById('layui-layer' + t)) s.remove();
    });
  }, 5000);

  /* ==================== 4. 自动下一节 v5 ==================== */
  if (window.__autoNext) clearInterval(window.__autoNext);
  let endAt = 0, failStreak = 0, lastL2 = null, lastL3 = null;
  const isVideoEnd = v => v.ended || (v.duration && v.currentTime > 0 && v.currentTime >= v.duration - 0.5);
  const isTestItem = el => /章节测试|单元测试|考前/.test((el.innerText || '').trim().slice(0, 25));
  const hasVideo = () => !!document.querySelector('video');

  function updateCurrent() {
    const a3 = document.querySelector('.level_3_resourcelist_item.active');
    if (a3) {
      lastL3 = a3.closest('li');
      const ul3 = lastL3.closest('ul.level_3');
      lastL2 = ul3 ? ul3.parentElement.closest('li') : null;
      failStreak = 0;
      return;
    }
    lastL3 = null;
    const a2 = document.querySelector('.level_2_resourcelist_item.active');
    if (a2) { lastL2 = a2.closest('li'); failStreak = 0; }
  }
  function nextL3(li) {
    let n = li && li.nextElementSibling;
    while (n) {
      if (n.querySelector && n.querySelector('.level_3_title') && !isTestItem(n)) return n;
      n = n.nextElementSibling;
    }
    return null;
  }
  function nextL2(li) {
    let n = li && li.nextElementSibling;
    while (n) {
      if (n.querySelector && n.querySelector('.level_2_title') && !isTestItem(n)) return n;
      n = n.nextElementSibling;
    }
    return null;
  }
  function firstL3of(li) {
    return [...(li ? li.querySelectorAll(':scope ul.level_3 > li') : [])]
      .find(n => n.querySelector('.level_3_title') && !isTestItem(n)) || null;
  }
  function navToL3(li) {
    const t = li && li.querySelector('.level_3_title');
    if (!t) return false;
    t.click();
    lastL3 = li;
    endAt = 0;
    setTimeout(() => {
      if (!hasVideo()) {
        const item = li.querySelector('.level_3_resourcelist_item');
        if (item) item.click();
        setTimeout(() => {
          if (!hasVideo()) {
            const nx = nextL3(li);
            if (nx) navToL3(nx);
            else { const up = nextL2(lastL2); if (up) navToL2(up); else failStreak++; }
          }
        }, 4000);
      }
    }, 3000);
    return true;
  }
  function navToL2(li) {
    const t = li && li.querySelector('.level_2_title');
    if (!t) return false;
    t.click();
    lastL2 = li;
    lastL3 = null;
    endAt = 0;
    setTimeout(() => {
      if (!hasVideo()) {
        const f3 = firstL3of(li);
        if (f3) { navToL3(f3); return; }
        const own = li.querySelector('.level_2_resourcelist_item');
        if (own) { own.click(); return; }
        setTimeout(() => {
          if (!hasVideo()) {
            const nx = nextL2(li);
            if (nx) navToL2(nx); else failStreak++;
          }
        }, 4000);
      }
    }, 3000);
    return true;
  }

  window.__autoNext = setInterval(() => {
    const v = document.querySelector('video');
    if (v && !isVideoEnd(v)) { endAt = 0; failStreak = 0; return; }
    if (failStreak >= 8) return;
    if (!endAt) { endAt = Date.now(); return; }
    const wait = Math.min(8000 * Math.pow(2, failStreak), 120000);
    if (Date.now() - endAt < wait) return;

    updateCurrent();

    const a3 = document.querySelector('.level_3_resourcelist_item.active');
    if (a3 && a3.nextElementSibling && a3.nextElementSibling.classList.contains('level_3_resourcelist_item') && !isTestItem(a3.nextElementSibling)) {
      a3.nextElementSibling.click(); endAt = 0; return;
    }
    const a2 = document.querySelector('.level_2_resourcelist_item.active');
    if (a2 && a2.nextElementSibling && a2.nextElementSibling.classList.contains('level_2_resourcelist_item') && !isTestItem(a2.nextElementSibling)) {
      a2.nextElementSibling.click(); endAt = 0; return;
    }
    if (!a3 && a2 && lastL2 && document.contains(lastL2)) {
      const f3 = firstL3of(lastL2);
      if (f3) { navToL3(f3); return; }
    }
    if (lastL3 && document.contains(lastL3)) {
      const nx3 = nextL3(lastL3);
      if (nx3) { navToL3(nx3); return; }
    }
    if (lastL2 && document.contains(lastL2)) {
      const nx2 = nextL2(lastL2);
      if (nx2) { navToL2(nx2); return; }
    }
    let ch = lastL2;
    while (ch && !(ch.querySelector && ch.querySelector('.level_1_title'))) ch = ch.parentElement && ch.parentElement.closest('li');
    let nextCh = ch && ch.nextElementSibling;
    while (nextCh) {
      if (nextCh.querySelector && nextCh.querySelector('.level_1_title') && !isTestItem(nextCh)) break;
      nextCh = nextCh.nextElementSibling;
    }
    if (nextCh) {
      const t = nextCh.querySelector('.level_1_title');
      if (t) t.click();
      lastL2 = null; lastL3 = null;
      endAt = 0;
      setTimeout(() => {
        if (!hasVideo()) {
          const first = [...nextCh.querySelectorAll('li.ng-scope')].find(n => n.querySelector('.level_2_title') && !isTestItem(n));
          if (first) navToL2(first);
        }
      }, 2000);
      return;
    }
    failStreak++;
  }, 2000);

  /* ==================== 统一控制 ==================== */
  window.__stopQuizBot = () => {
    clearInterval(window.__quizBot);
    clearInterval(window.__keepPlayTimer);
    clearInterval(window.__autoNext);
    clearInterval(window.__shadeCleaner);
    console.log('[UOOC助手] 全部脚本已停止');
  };

  console.log('[UOOC助手] 全部脚本已启动：防暂停 / 弹题机器人 / 遮罩清理 / 自动下一节 v5');
  console.log('[UOOC助手] 停止全部: __stopQuizBot()  答题记录: __quizLog');
})();
