export function initializePortfolio(root) {
  const dialog = root.querySelector('.image-viewer');
  const stage = root.querySelector('.viewer-stage');
  const enlarged = stage?.querySelector('img');
  const title = root.querySelector('#viewer-title');
  const zoom = root.querySelector('[data-viewer-zoom]');
  const close = root.querySelector('[data-viewer-close]');
  if (!dialog || !stage || !enlarged || !title || !zoom || !close) return () => {};
  let trigger = null;
  const setZoom = (active) => {
    stage.classList.toggle('zoomed', active);
    zoom.setAttribute('aria-pressed', String(active));
    zoom.setAttribute('aria-label', active ? 'Zoom out' : 'Zoom in');
    zoom.setAttribute('title', active ? 'Zoom out' : 'Zoom in');
    zoom.textContent = active ? '−' : '+';
    stage.scrollTop = 0;
    stage.scrollLeft = 0;
  };
  const toggleZoom = () => setZoom(!stage.classList.contains('zoomed'));
  const dismiss = () => dialog.close();
  const onClose = () => {
    document.body.classList.remove('viewer-open');
    setZoom(false);
    trigger?.focus({ preventScroll: true });
  };
  const onClick = (event) => {
    const link = event.target.closest?.('.screenshot-link');
    if (!link || !root.contains(link)) return;
    event.preventDefault();
    const image = link.querySelector('img');
    if (!image || !image.naturalWidth) return;
    trigger = link;
    enlarged.src = image.src;
    enlarged.alt = image.alt;
    title.textContent = image.alt;
    setZoom(false);
    dialog.showModal();
    document.body.classList.add('viewer-open');
    close.focus();
  };
  root.addEventListener('click', onClick);
  zoom.addEventListener('click', toggleZoom);
  enlarged.addEventListener('click', toggleZoom);
  close.addEventListener('click', dismiss);
  dialog.addEventListener('close', onClose);
  return () => {
    root.removeEventListener('click', onClick);
    zoom.removeEventListener('click', toggleZoom);
    enlarged.removeEventListener('click', toggleZoom);
    close.removeEventListener('click', dismiss);
    dialog.removeEventListener('close', onClose);
    if (dialog.open) dialog.close();
    document.body.classList.remove('viewer-open');
  };
}
