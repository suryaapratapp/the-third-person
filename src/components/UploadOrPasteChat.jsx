import { useMemo, useState } from 'react';
import JSZip from 'jszip';
import PrivacyNotice from './PrivacyNotice.jsx';
import { parseConversationText } from '../lib/conversationPreprocessor.js';
import { filterSensitiveData } from '../lib/sensitiveDataFilter.js';
import { scanUploadedFileContent } from '../lib/fileSafetyScanner.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_ZIP_ENTRY_SIZE = 10 * 1024 * 1024;
const allowedExtensions = ['txt', 'json', 'csv', 'zip', 'html'];
const blockedExtensions = ['exe', 'js', 'ts', 'py', 'php', 'sh', 'bat', 'cmd', 'jar', 'apk', 'dmg', 'app', 'scr', 'msi', 'dll', 'docm', 'xlsm'];
const allowedMimeTypes = [
  '',
  'text/plain',
  'application/json',
  'text/csv',
  'application/csv',
  'application/zip',
  'application/x-zip-compressed',
  'text/html',
];

function extensionOf(name = '') {
  return name.split('.').pop()?.toLowerCase() || '';
}

async function readSupportedFile(file) {
  const ext = extensionOf(file.name);
  if (blockedExtensions.includes(ext) || !allowedExtensions.includes(ext)) {
    throw new Error('This file type is not supported. Please upload a .txt, .json, or .csv conversation export.');
  }
  if (file.type && !allowedMimeTypes.includes(file.type)) {
    throw new Error('This file type is not supported. Please upload a standard conversation export.');
  }
  if (!file.size) throw new Error('This file appears to be empty. Please upload a readable conversation export.');
  if (file.size > MAX_FILE_SIZE) throw new Error('This file looks too large for browser analysis. Please upload a smaller export or paste the key conversation.');

  if (ext === 'zip') {
    const zip = await JSZip.loadAsync(file);
    const candidates = Object.values(zip.files).filter((entry) => {
      const innerExt = extensionOf(entry.name);
      const entryName = entry.name.toLowerCase();
      const entrySize = entry._data?.uncompressedSize || 0;
      return !entry.dir
        && !entryName.includes('__macosx/')
        && !entryName.includes('node_modules/')
        && ['txt', 'json', 'csv', 'html'].includes(innerExt)
        && !blockedExtensions.includes(innerExt)
        && entrySize <= MAX_ZIP_ENTRY_SIZE;
    });
    if (!candidates.length) throw new Error('We could not read this file safely. Please try a supported chat export file.');
    const best = candidates.sort((a, b) => {
      const aChat = /chat|message|conversation|whatsapp/i.test(a.name) ? 1 : 0;
      const bChat = /chat|message|conversation|whatsapp/i.test(b.name) ? 1 : 0;
      return bChat - aChat || (b._data?.uncompressedSize || 0) - (a._data?.uncompressedSize || 0);
    })[0];
    const content = await best.async('text');
    return { text: content, extractedFileName: best.name };
  }

  return { text: await file.text(), extractedFileName: '' };
}

function estimateMessages(text) {
  if (!text.trim()) return 0;
  const lineCount = text.split(/\r?\n/).filter(Boolean).length;
  const colonLines = text.split(/\r?\n/).filter((line) => /^[^:]{1,32}:\s+/.test(line)).length;
  return Math.max(colonLines, Math.ceil(lineCount * 0.75));
}

export default function UploadOrPasteChat({ mode, fileName, fileSize, text, onChange }) {
  const [readError, setReadError] = useState('');
  const [showSensitive, setShowSensitive] = useState(false);
  const estimatedMessages = useMemo(() => estimateMessages(text), [text]);
  const prep = useMemo(() => {
    if (!text.trim()) return null;
    const sensitive = filterSensitiveData(text);
    const parsed = parseConversationText(sensitive.protectedText, mode === 'upload' ? 'Uploaded chat' : 'Pasted chat');
    return { sensitive, parsed };
  }, [text, mode]);

  function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setReadError('');
    onChange({ sourceMode: 'upload', fileName: file.name, fileSize: file.size });
    readSupportedFile(file)
      .then(({ text: content, extractedFileName }) => {
        const scan = scanUploadedFileContent({ fileName: extractedFileName || file.name, fileType: file.type, text: content });
        if (!scan.isAllowed) {
          setReadError(scan.userMessage);
          onChange({ chatText: '' });
          return;
        }
        setReadError(extractedFileName ? `Extracted ${extractedFileName} from the ZIP. ${scan.userMessage || ''}`.trim() : scan.userMessage || '');
        onChange({
          chatText: scan.cleanedText,
          fileSafety: { ...scan, extractedFileName },
          fileName: extractedFileName ? `${file.name} → ${extractedFileName}` : file.name,
        });
      })
      .catch((error) => {
        setReadError(error.message || 'We could not read this file safely. Please try a supported chat export file.');
        onChange({ chatText: '' });
      });
  }

  return (
    <div>
      <div className="mb-5 flex gap-2 border-b border-white/12">
        {['upload', 'paste'].map((tab) => (
          <button
            key={tab}
            onClick={() => onChange({ sourceMode: tab })}
            className={`px-4 py-3 font-mono text-xs uppercase tracking-[0.16em] ${mode === tab ? 'border-b border-bone text-bone' : 'text-ash'}`}
          >
            {tab === 'upload' ? 'Upload chat file' : 'Paste conversation'}
          </button>
        ))}
      </div>
      {mode === 'upload' ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <label className="flex min-h-72 cursor-pointer flex-col items-center justify-center border border-dashed border-white/24 bg-black/35 p-8 text-center transition hover:border-white/50">
            <span className="serif-title text-4xl">Drop in the conversation</span>
            <span className="mt-4 text-sm text-smoke">Accepts .txt, .json, .csv, .zip</span>
            <input className="sr-only" type="file" accept=".txt,.json,.csv,.zip,.html,text/plain,application/json,text/csv,application/zip" onChange={handleFile} />
          </label>
          <div className="thin-panel p-5">
            <p className="tech-label text-smoke">Selected file</p>
            <p className="mt-4 break-all text-bone">{fileName || 'No file selected yet'}</p>
            <p className="mt-3 font-mono text-sm text-ash">{fileSize ? `${(fileSize / 1024).toFixed(1)} KB estimated size` : 'Waiting for upload'}</p>
            <p className="mt-3 font-mono text-sm text-ash">{text ? `${text.length.toLocaleString()} characters read` : 'File content will be read in-browser where possible'}</p>
            {readError && <p className="mt-4 text-sm text-bone">{readError}</p>}
          </div>
        </div>
      ) : (
        <div>
          <textarea
            value={text}
            onChange={(event) => onChange({ chatText: event.target.value, sourceMode: 'paste' })}
            placeholder="[12/04/26, 9:21 PM] You: I just want to understand what changed..."
            className="min-h-80 w-full resize-y border border-white/18 bg-black/45 p-5 font-mono text-sm leading-7 text-bone outline-none placeholder:text-ash focus:border-white/55"
          />
          <div className="mt-3 flex flex-wrap gap-4 font-mono text-xs uppercase tracking-[0.13em] text-ash">
            <span>{text.length.toLocaleString()} characters</span>
            <span>{estimatedMessages.toLocaleString()} estimated messages</span>
          </div>
        </div>
      )}
      {prep && (
        <div className="mt-6 accent-panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="tech-label text-purple-200">Preparing your conversation safely</p>
              <p className="mt-3 text-sm leading-7 text-smoke">
                Your conversation is being structured and sensitive details are protected before analysis.
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-purple-200/35 bg-purple-300/10 text-xl">◈</div>
          </div>
          <div className="mt-5 h-1 bg-white/10">
            <div className="h-1 w-4/5 rounded-full bg-gradient-to-r from-purple-300 via-pink-300 to-orange-300" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ['Reading chat file', text ? 'Complete' : 'Waiting'],
              ['Detecting participants', prep.parsed.participants.join(', ') || 'Estimating'],
              ['Protecting sensitive details', `${prep.sensitive.findings.totalProtectedItems} protected`],
              ['Structuring messages by date', prep.parsed.dateRange],
              ['Preparing private analysis', `${prep.parsed.messageCount} messages`],
            ].map(([label, value]) => (
              <div key={label} className="border border-white/10 bg-black/35 p-3">
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-ash">{label}</p>
                <p className="mt-2 text-sm leading-5 text-bone">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-3xl border border-pink-200/15 bg-pink-300/[0.045] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="tech-label text-pink-100">Sensitive details protected</p>
                <p className="mt-2 text-sm leading-7 text-smoke">
                  {prep.sensitive.protectionSummary} Please still review your conversation yourself before uploading if it contains anything you would not want analysed.
                </p>
              </div>
              <button
                onClick={() => setShowSensitive((current) => !current)}
                className="rounded-full border border-white/10 px-4 py-2 font-mono text-[0.65rem] uppercase tracking-[0.13em] text-smoke transition hover:border-pink-200/50 hover:text-bone"
              >
                {showSensitive ? 'Hide details' : 'Show details'}
              </button>
            </div>
            {showSensitive && (
              <div className="mt-4 max-h-64 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-3">
                {prep.sensitive.protectedItems?.length ? (
                  <div className="grid gap-2">
                    {prep.sensitive.protectedItems.slice(0, 40).map((item, index) => (
                      <div key={`${item.type}-${item.value}-${index}`} className="grid gap-2 border border-white/10 bg-white/[0.035] p-3 text-xs sm:grid-cols-[150px_1fr_190px]">
                        <span className="font-mono uppercase tracking-[0.12em] text-pink-100">{item.type}</span>
                        <span className="break-all text-smoke">{item.value}</span>
                        <span className="font-mono text-ash">{item.replacement}</span>
                      </div>
                    ))}
                    {prep.sensitive.protectedItems.length > 40 && (
                      <p className="text-xs text-ash">Showing the first 40 protected details.</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-smoke">No obvious sensitive details needed protection.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="mt-6">
        <PrivacyNotice compact />
      </div>
    </div>
  );
}
