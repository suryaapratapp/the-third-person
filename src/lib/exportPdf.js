// PDF export, via the browser's own print pipeline.
//
// Deliberately NOT a PDF library. jsPDF + html2canvas is ~300kB of JavaScript
// that rasterises the page — the result is a picture of a report inside a PDF
// wrapper: blurry when zoomed, unsearchable, unselectable, and it does not
// reflow or paginate, so a long report becomes one absurdly tall page.
//
// `window.print()` costs nothing, and the browser's print engine already knows
// how to paginate, embed fonts, keep text selectable and searchable, and honour
// `break-inside: avoid`. Every platform this product runs on offers "Save as
// PDF" from the print sheet — including iOS Safari and Android Chrome, which is
// where most of these reports will be read.
//
// The one thing the browser cannot do is decide what to print. That is this
// module's job: isolate a single element by hiding every sibling on its path to
// the root, print, then put the DOM back exactly as it was.

const HIDE_CLASS = 'print-hide';
const KEEP_CLASS = 'print-keep';
const ROOT_CLASS = 'print-root';

// Safari does not always fire `afterprint`. Without a fallback the page would
// stay in its stripped-down print state — every other section still hidden —
// which looks exactly like the app crashing.
const RESTORE_FALLBACK_MS = 60000;

function isolate(node) {
  const hidden = [];
  const kept = [];

  let current = node;
  while (current && current !== document.body && current.parentElement) {
    for (const sibling of current.parentElement.children) {
      if (sibling === current) continue;
      if (sibling.classList.contains(HIDE_CLASS)) continue;
      sibling.classList.add(HIDE_CLASS);
      hidden.push(sibling);
    }
    current.classList.add(KEEP_CLASS);
    kept.push(current);
    current = current.parentElement;
  }

  node.classList.add(ROOT_CLASS);

  return () => {
    hidden.forEach((element) => element.classList.remove(HIDE_CLASS));
    kept.forEach((element) => element.classList.remove(KEEP_CLASS));
    node.classList.remove(ROOT_CLASS);
  };
}

/**
 * Opens the print dialog with only `elementId` on the page.
 *
 * @param {string} elementId  Element to print.
 * @param {string} [title]    Becomes the suggested PDF filename — browsers
 *                            derive it from document.title, so this is the only
 *                            control we have over what the file is called.
 */
export function exportElementAsPdf(elementId, title) {
  const node = document.getElementById(elementId);
  if (!node) throw new Error('Nothing to export.');

  const restoreDom = isolate(node);
  const previousTitle = document.title;
  if (title) document.title = title;

  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    window.clearTimeout(timer);
    window.removeEventListener('afterprint', restore);
    restoreDom();
    document.title = previousTitle;
  };

  const timer = window.setTimeout(restore, RESTORE_FALLBACK_MS);
  window.addEventListener('afterprint', restore);

  // The print dialog is modal and synchronous in most browsers, so `afterprint`
  // has usually fired by the time this returns. Where it is asynchronous
  // (Safari), the listener and the timeout cover it.
  window.print();

  // Chrome fires `afterprint` immediately on cancel; Safari may not fire at
  // all. A microtask-deferred check keeps the common case snappy without
  // waiting out the fallback.
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      if (!document.hasFocus()) return; // dialog still open
      restore();
    });
  });
}

export function pdfFileName(prefix) {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}`;
}
