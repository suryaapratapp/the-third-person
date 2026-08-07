import { useMemo, useState } from 'react';
import JSZip from 'jszip';
import { PiCheckCircle, PiFile, PiUploadSimple } from 'react-icons/pi';
import PrivacyAssurance from './PrivacyAssurance.jsx';
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
  const [dragging, setDragging] = useState(false);
  const estimatedMessages = useMemo(() => estimateMessages(text), [text]);
  const prep = useMemo(() => {
    if (!text.trim()) return null;
    const sensitive = filterSensitiveData(text);
    const parsed = parseConversationText(sensitive.protectedText, mode === 'upload' ? 'Uploaded chat' : 'Pasted chat');
    return { sensitive, parsed };
  }, [text, mode]);

  // The drop zone used to be a styled <label> that said "Drop in the
  // conversation" while only accepting clicks — dragging a file onto it made
  // the browser navigate away from the wizard and lose the flow state.
  function ingestFile(file) {
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

  function handleFile(event) {
    ingestFile(event.target.files?.[0]);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    ingestFile(event.dataTransfer?.files?.[0]);
  }

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-1.5 rounded-full border border-line bg-paper p-1.5">
        {['upload', 'paste'].map((tab) => (
          <button
            key={tab}
            onClick={() => onChange({ sourceMode: tab })}
            aria-pressed={mode === tab}
            className={`min-h-[44px] rounded-full text-xs transition ${
              mode === tab ? 'bg-paper text-bone' : 'text-ash hover:text-smoke'
            }`}
          >
            {tab === 'upload' ? 'Upload file' : 'Paste text'}
          </button>
        ))}
      </div>
      {mode === 'upload' ? (
        <div className="grid gap-4">
          <label
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-sm border border-dashed p-6 text-center transition sm:min-h-64 ${
              dragging
                ? 'border-purple-200 bg-purple-50'
                : 'border-line bg-well hover:border-purple-200 hover:bg-well'
            }`}
          >
            <PiUploadSimple className={`text-3xl transition ${dragging ? 'text-purple-700' : 'text-smoke'}`} aria-hidden="true" />
            <span className="mt-4 text-lg text-bone sm:text-xl">
              {dragging ? 'Drop it here' : 'Choose your chat export'}
            </span>
            <span className="mt-2 text-sm leading-6 text-smoke">
              Tap to browse<span className="hidden sm:inline">, or drag the file in</span>
            </span>
            <span className="mt-3 text-xs text-ash">
              .txt · .json · .csv · .zip
            </span>
            <input className="sr-only" type="file" accept=".txt,.json,.csv,.zip,.html,text/plain,application/json,text/csv,application/zip" onChange={handleFile} />
          </label>

          {(fileName || readError) && (
            <div className="rounded-sm border border-line bg-paper p-4">
              <div className="flex items-start gap-3">
                <PiFile className="mt-0.5 shrink-0 text-lg text-purple-700" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="break-all text-sm text-bone">{fileName || 'No file selected'}</p>
                  <p className="mt-1 font-mono text-xs text-ash">
                    {[
                      fileSize ? `${(fileSize / 1024).toFixed(1)} KB` : null,
                      text ? `${text.length.toLocaleString()} characters read` : null,
                    ].filter(Boolean).join(' · ') || 'Reading…'}
                  </p>
                </div>
              </div>
              {readError && <p className="mt-3 text-sm leading-6 text-orange-700">{readError}</p>}
            </div>
          )}
        </div>
      ) : (
        <div>
          <textarea
            value={text}
            onChange={(event) => onChange({ chatText: event.target.value, sourceMode: 'paste' })}
            placeholder="[12/04/26, 9:21 PM] You: I just want to understand what changed..."
            className="min-h-64 w-full resize-y rounded-sm border border-line bg-well p-4 font-mono text-sm leading-7 text-bone outline-none placeholder:text-ash focus:border-purple-200 sm:min-h-80 sm:p-5"
          />
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ash">
            <span>{text.length.toLocaleString()} characters</span>
            <span>{estimatedMessages.toLocaleString()} estimated messages</span>
          </div>
        </div>
      )}
      {prep && (
        <div className="mt-5 accent-panel p-4 sm:p-5">
          <div className="flex items-center gap-2.5">
            <PiCheckCircle className="shrink-0 text-lg text-emerald-700" aria-hidden="true" />
            <p className="tech-label text-emerald-700">Conversation read</p>
          </div>

          {/* Four facts in a row, replacing five stacked cards and a progress
              bar that was hard-coded to 80% and never moved. */}
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              ['Messages', prep.parsed.messageCount.toLocaleString()],
              ['Between', prep.parsed.participants.join(' & ') || 'Estimating'],
              ['Date range', prep.parsed.dateRange || 'Unknown'],
              ['Details hidden', `${prep.sensitive.findings.totalProtectedItems}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-sm border border-line bg-well p-3">
                <p className=" text-xs text-ash">{label}</p>
                <p className="mt-1.5 break-words text-sm leading-5 text-bone">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-sm border border-pink-200 bg-pink-50 p-4">
            <p className="tech-label text-pink-700">Sensitive details removed</p>
            <p className="mt-2 text-sm leading-6 text-smoke">
              {prep.sensitive.protectionSummary} Still worth a look yourself if the chat holds anything
              you would rather not have analysed.
            </p>
            <button
              onClick={() => setShowSensitive((current) => !current)}
              aria-expanded={showSensitive}
              className="mt-3 min-h-[44px] text-xs text-smoke underline decoration-white/25 underline-offset-4 transition hover:text-bone"
            >
              {showSensitive ? 'Hide what was removed' : 'Show what was removed'}
            </button>
            {showSensitive && (
              <div className="mt-2 max-h-64 overflow-y-auto rounded-sm border border-line bg-well p-2.5">
                {prep.sensitive.protectedItems?.length ? (
                  <div className="grid gap-2">
                    {prep.sensitive.protectedItems.slice(0, 40).map((item, index) => (
                      <div key={`${item.type}-${item.value}-${index}`} className="grid gap-1 rounded-sm border border-line bg-paper p-2.5 text-xs sm:grid-cols-[110px_1fr_150px] sm:gap-2">
                        <span className=" text-pink-700">{item.type}</span>
                        <span className="break-all text-smoke">{item.value}</span>
                        <span className="font-mono text-ash">{item.replacement}</span>
                      </div>
                    ))}
                    {prep.sensitive.protectedItems.length > 40 && (
                      <p className="p-1 text-xs text-ash">Showing the first 40 protected details.</p>
                    )}
                  </div>
                ) : (
                  <p className="p-1 text-sm text-smoke">No obvious sensitive details needed protection.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* One privacy block, not two. The old "Privacy reminder" said the same
          thing in vaguer words directly above these five concrete promises. */}
      <PrivacyAssurance compact className="mt-5" />
    </div>
  );
}
