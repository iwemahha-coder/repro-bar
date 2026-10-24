'use strict';

// 日程は index.html の #sfl-schedule のみを編集。日本時間の当日は「本日」と表示。
function updateSflNotice(now = new Date()) {
  const notice = document.getElementById('next-event');
  const rows = Array.from(document.querySelectorAll('#sfl-schedule li'));
  if (!notice || !rows.length) return;
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  let next = null;
  rows.forEach(row => {
    const time = row.querySelector('time');
    const day = time.dateTime.slice(0, 10);
    row.classList.toggle('isPast', day < today);
    row.classList.remove('isNext');
    row.querySelector('.eventState')?.remove();
    if (!next && day >= today) next = { row, time, day };
  });
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
// 開きっぱなしのタブも日付変更後に更新。
document.addEventListener('visibilitychange', () => { if (!document.hidden) updateSflNotice(); });

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
