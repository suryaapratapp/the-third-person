import { toPng } from 'html-to-image';

function getExportBackground(node) {
  const custom = node?.dataset?.exportBg;
  if (custom) return custom;
  const style = window.getComputedStyle(node);
  if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent') {
    return style.backgroundColor;
  }
  return '#050505';
}

export async function exportElementAsDataUrl(elementId) {
  const node = document.getElementById(elementId);
  if (!node) throw new Error('Card not found.');
  return toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: getExportBackground(node),
    filter: (element) => !element?.dataset?.exportIgnore,
    style: {
      backgroundColor: getExportBackground(node),
    },
  });
}

export async function exportElementAsImage(elementId, filename) {
  const dataUrl = await exportElementAsDataUrl(elementId);
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

async function dataUrlToFile(dataUrl, filename) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type || 'image/png' });
}

export async function shareElementAsImage(elementId, title, text, filename) {
  const dataUrl = await exportElementAsDataUrl(elementId);
  const file = await dataUrlToFile(dataUrl, filename);
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ title, text, files: [file] });
    return 'shared';
  }
  if (navigator.share) {
    await navigator.share({ title, text });
    return 'shared';
  }
  await navigator.clipboard?.writeText(text);
  return 'copied';
}

export async function shareCardSummary(title, text) {
  if (navigator.share) {
    await navigator.share({ title, text });
    return 'shared';
  }
  await navigator.clipboard?.writeText(text);
  return 'copied';
}
