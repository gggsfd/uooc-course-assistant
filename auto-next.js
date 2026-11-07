/**
 * UOOC 自动下一节 auto-next.js (v5)
 *
 * 作用：视频播完后自动前进，无需人工点选。导航优先级：
 *   1. 同小节内下一个视频
 *   2. 节自身的视频放完 -> 若该节有三级小节（2.4.1 这种），进入第一个小节
 *      （即：有三级的节自动跳过节自身的二级视频，只刷三级小节的视频）
 *   3. 下一个三级小节 -> 逐个小节刷完
 *   4. 下一个节 -> 无三级的节播放节自身的视频
 *   5. 本章刷完 -> 下一章
 *
 * 保护机制：
 *   - 自动跳过"章节测试"类无视频条目；
 *   - 失败退避：8s -> 16s -> 32s ... 最长 2 分钟重试一次，不会疯狂刷请求；
 *   - 连续失败 8 次自动歇手。
 *
 * 说明：只向前推进，不会回头补漏；刷新页面后需重新运行。
 * 单独使用：粘贴整段到课程页面控制台回车。
 * 停止：clearInterval(window.__autoNext)
 */
(function () {
  if (window.__autoNext) clearInterval(window.__autoNext);
  let endAt = 0, failStreak = 0, lastL2 = null, lastL3 = null;
  const isVideoEnd = v => v.ended || (v.duration && v.currentTime > 0 && v.currentTime >= v.duration - 0.5);
  const isTestItem = el => /章节测试|单元测试|考前/.test((el.innerText || '').trim().slice(0, 25));
  const hasVideo = () => !!document.querySelector('video');

  // 当前位置追踪：优先认三级小节的激活项，其次节的激活项
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

  // 进入某个三级小节：点小节标题 -> 若没加载视频则点资源项 -> 仍没有则跳下一个
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

  // 进入某个节：点节标题 -> 有三级的节直接进第一个小节（跳过节自身视频）
  //              -> 无三级才点节自身的视频资源
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

    // 1) 同小节/同节内下一个视频
    const a3 = document.querySelector('.level_3_resourcelist_item.active');
    if (a3 && a3.nextElementSibling && a3.nextElementSibling.classList.contains('level_3_resourcelist_item') && !isTestItem(a3.nextElementSibling)) {
      a3.nextElementSibling.click(); endAt = 0; return;
    }
    const a2 = document.querySelector('.level_2_resourcelist_item.active');
    if (a2 && a2.nextElementSibling && a2.nextElementSibling.classList.contains('level_2_resourcelist_item') && !isTestItem(a2.nextElementSibling)) {
      a2.nextElementSibling.click(); endAt = 0; return;
    }
    // 2) 节自身的视频放完 -> 有三级小节则继续进小节
    if (!a3 && a2 && lastL2 && document.contains(lastL2)) {
      const f3 = firstL3of(lastL2);
      if (f3) { navToL3(f3); return; }
    }
    // 3) 下一个三级小节
    if (lastL3 && document.contains(lastL3)) {
      const nx3 = nextL3(lastL3);
      if (nx3) { navToL3(nx3); return; }
    }
    // 4) 下一个节
    if (lastL2 && document.contains(lastL2)) {
      const nx2 = nextL2(lastL2);
      if (nx2) { navToL2(nx2); return; }
    }
    // 5) 下一章
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
  console.log('[UOOC助手] 自动下一节已启动 (v5)');
})();
