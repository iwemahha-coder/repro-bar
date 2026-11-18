'use strict';

// 日程は index.html の #sfl-schedule を更新。日本時間の翌日から終了分を非表示。
const tokyoDate = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit'
});
function updateSflNotice(now = new Date()) {
  const notice = document.getElementById('next-event');
  if (!notice) return;
  const today = tokyoDate.format(now);
  const activeMonths = new Set();
  let next = null;
  document.querySelectorAll('[data-sfl-month]').forEach(group => {
    let hasUpcoming = false;
    group.querySelectorAll('li').forEach(row => {
      const time = row.querySelector('time[datetime]');
      if (!time) return;
      const day = time.dateTime.slice(0, 10);
      row.hidden = day < today;
      row.classList.remove('isNext');
      row.querySelector('.eventState')?.remove();
      if (row.hidden) return;
      hasUpcoming = true;
      if (!next || day < next.day) next = {row, time, day};
    });
    group.hidden = !hasUpcoming;
    if (hasUpcoming) activeMonths.add(group.dataset.sflMonth);
  });
  document.querySelectorAll('[data-sfl-jump]').forEach(link => {
    link.hidden = !activeMonths.has(link.dataset.sflJump);
  });
  const posters = document.querySelector('.sflPosters');
  if (posters) {
    posters.querySelectorAll('[data-sfl-poster]').forEach(poster => {
      poster.hidden = !activeMonths.has(poster.dataset.sflPoster);
    });
    const visible = posters.querySelectorAll('figure:not([hidden])').length;
    posters.style.setProperty('--poster-columns', visible || 1);
  }
  const status = document.getElementById('sfl-schedule-status');
  if (status) status.hidden = Boolean(next);
  const scheduleUpdate = document.getElementById('sfl-schedule-update');
  if (scheduleUpdate) scheduleUpdate.hidden = !next;
  if (next) {
    next.row.classList.add('isNext');
    const state = document.createElement('span');
    state.className = 'eventState';
    state.textContent = next.day === today ? '本日の開催予定' : '次回の開催予定';
    next.row.append(state);
    notice.textContent = (next.day === today ? '本日 ' : '次回 ') + next.time.textContent;
  } else {
    notice.textContent = '次回の開催予定はInstagramでご確認ください';
  }
}
updateSflNotice();
document.addEventListener('visibilitychange', () => { if (!document.hidden && tokyoDate.format() !== lastVisibleSflDay) refreshSflDay(); });
// 日付をまたいで表示し続けた場合も反映する。
window.setInterval(() => {
  if (!document.hidden && tokyoDate.format() !== lastVisibleSflDay) refreshSflDay();
}, 60 * 1000);
let lastVisibleSflDay = tokyoDate.format();
function refreshSflDay() {
  lastVisibleSflDay = tokyoDate.format();
  updateSflNotice();
}

// native dialog でフォーカスを保持。画像は拡大ボタンと別画面表示にも対応。
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightbox-image');
let zoom = 1;
let fittedWidth = 0;
let opener = null;
function resetZoom() {
  zoom = 1;
  lightboxImage.classList.remove('isZoomed');
  lightboxImage.style.width = '';
  const viewport = lightbox.querySelector('.lightboxViewport');
  viewport.scrollTop = 0;
  viewport.scrollLeft = 0;
}
document.addEventListener('click', event => {
  const link = event.target.closest('a[data-lightbox]');
  if (!link || !lightbox || typeof lightbox.showModal !== 'function') return;
  event.preventDefault();
  opener = link;
  resetZoom();
  lightboxImage.alt = link.querySelector('img')?.alt || '拡大画像';
  lightboxImage.src = link.href;
  document.getElementById('lightbox-original').href = link.href;
  document.body.classList.add('lightbox-open');
  lightbox.showModal();
  document.getElementById('lightbox-close').focus();
});
lightboxImage.addEventListener('load', () => { fittedWidth = lightboxImage.getBoundingClientRect().width; });
document.getElementById('lightbox-close').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', event => { if (event.target === lightbox) lightbox.close(); });
lightbox.addEventListener('close', () => { document.body.classList.remove('lightbox-open'); resetZoom(); opener?.focus(); });
document.querySelectorAll('[data-zoom]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.zoom === 'reset') { resetZoom(); return; }
  if (!lightboxImage.complete || !lightboxImage.naturalWidth) return;
  if (zoom === 1) fittedWidth = lightboxImage.getBoundingClientRect().width;
  zoom = Math.max(1, Math.min(3, zoom + (button.dataset.zoom === 'in' ? 0.5 : -0.5)));
  lightboxImage.classList.toggle('isZoomed', zoom > 1);
  lightboxImage.style.width = zoom > 1 ? `${fittedWidth * zoom}px` : '';
}));

// 外部の埋め込みは開いた時のみ読み込む。失敗時も元投稿へのリンクは残す。
const instagramDetails = document.querySelector('.instagramDetails');
let instagramRequested = false;
instagramDetails?.addEventListener('toggle', () => {
  if (!instagramDetails.open || instagramRequested) return;
  instagramRequested = true;
  const script = document.createElement('script');
  script.src = 'https://www.instagram.com/embed.js';
  script.async = true;
  script.addEventListener('error', () => { instagramRequested = false; script.remove(); });
  document.body.append(script);
});

// ボタンのクリック操作を記録する。
document.addEventListener('click', event => {
  const link = event.target.closest('a[data-action]');
  if (!link || typeof window.gtag !== 'function') return;

  // 既存のGA4への送信
  window.gtag('event', 'site_action', {
    action_name: link.dataset.action,
    placement: link.dataset.placement || 'body',
    transport_type: 'beacon'
  });

  // 地図ボタンを押したときだけGoogle広告へ送信
  if (link.dataset.action === 'open_map') {
    window.gtag('event', 'conversion', {
      send_to: 'AW-18415992816/xTvoCI-9-PwcEPD_ts1E'
    });
  }
});
