import { useEffect, useState } from 'react';
import { PiSlidersHorizontal } from 'react-icons/pi';
import RotatingQuote from '../components/RotatingQuote.jsx';
import { groupReports } from '../lib/reportsStore.js';
import { useRouter } from '../state/RouterContext.jsx';
import { useAnalysis } from '../state/AnalysisContext.jsx';
import { deleteRelationshipReport, fetchRelationshipReports } from '../lib/supabaseDataService.js';

export default function ReportsPage() {
  const { navigate } = useRouter();
  const { updateFlow } = useAnalysis();
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState('');
  const [relation, setRelation] = useState('');
  const [month, setMonth] = useState('');
  const [sort, setSort] = useState('newest');
  const [openChain, setOpenChain] = useState('');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [notice, setNotice] = useState('');
  // Four dropdowns sat in a row before any report ever loaded — a lot of
  // controls for what is usually a handful of reports. They now stay tucked
  // behind a "Filters" toggle, and only earn a place on screen once there is
  // enough history (5+ reports) to actually need filtering.
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchRelationshipReports().then((items) => {
      if (!mounted) return;
      setReports(items);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = reports
    .filter((report) => !query || report.personName.toLowerCase().includes(query.toLowerCase()))
    .filter((report) => !platform || report.platform === platform)
    .filter((report) => !relation || report.relationshipType === relation)
    .filter((report) => !month || report.dateAnalysed.slice(0, 7) === month)
    .sort((a, b) => sort === 'newest' ? new Date(b.dateAnalysed) - new Date(a.dateAnalysed) : new Date(a.dateAnalysed) - new Date(b.dateAnalysed));

  const chains = [...groupReports(filtered).values()];
  const platforms = [...new Set(reports.map((report) => report.platform))];
  const relations = [...new Set(reports.map((report) => report.relationshipType))];
  const months = [...new Set(reports.map((report) => report.dateAnalysed.slice(0, 7)))];

  function openReport(report) {
    updateFlow({
      analysisResult: report.analysisJson,
      preparedConversation: report.preparedConversation,
      platform: report.platform,
      relationshipType: report.relationshipType,
      personName: report.personName,
      reportSource: report.analysisId,
    });
    navigate(report.analysisId ? `/reports/${encodeURIComponent(report.analysisId)}` : '/analysis/result');
  }

  async function removeReport(report) {
    setDeletingId(report.analysisId);
    setNotice('');
    try {
      await deleteRelationshipReport(report.analysisId);
      setReports((current) => current.filter((item) => item.analysisId !== report.analysisId));
      setConfirmDeleteId('');
      setNotice(`Report for ${report.personName} was deleted, along with the personality card it created.`);
    } catch (error) {
      setNotice(error.message || 'We could not delete this report. Please try again.');
    } finally {
      setDeletingId('');
    }
  }

  return (
    <section className="relative min-h-screen overflow-hidden px-4 pb-16 pt-28 sm:px-8">
      <div className="relative mx-auto max-w-[1320px]">
        <div className="hud-frame corner-frame accent-panel p-6 sm:p-10">
          <span className="hud-corner hud-corner-tl" aria-hidden="true" />
          <span className="hud-corner hud-corner-br" aria-hidden="true" />
          <p className="tech-label text-smoke">Relationship Reports</p>
          <h1 className="serif-title mt-4 text-5xl leading-tight sm:text-7xl">Conversation History</h1>
          <p className="mt-5 max-w-3xl text-sm leading-8 text-smoke">
            Revisit your relationship intelligence reports, compare emotional trends, and follow how each analysis chain changes over time.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search person"
            aria-label="Search reports by person"
            className="min-h-[48px] flex-1 rounded-sm border border-line bg-well px-4 text-sm outline-none focus:border-signal/35"
          />
          {reports.length > 4 && (
            <button
              type="button"
              onClick={() => setFiltersOpen((current) => !current)}
              aria-expanded={filtersOpen}
              className={`flex min-h-[48px] items-center justify-center gap-2 rounded-sm border px-5 text-xs transition ${
                filtersOpen || platform || relation || month || sort !== 'newest'
                  ? 'border-signal/35 bg-signal/10 text-bone'
                  : 'border-line bg-paper text-smoke hover:border-signal/35'
              }`}
            >
              <PiSlidersHorizontal aria-hidden="true" />
              Filters
            </button>
          )}
        </div>

        {reports.length > 4 && filtersOpen && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select value={platform} onChange={(event) => setPlatform(event.target.value)} aria-label="Filter by app" className="min-h-[48px] rounded-sm border border-line bg-well px-4 text-sm outline-none">
              <option value="">All apps</option>
              {platforms.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={relation} onChange={(event) => setRelation(event.target.value)} aria-label="Filter by relationship type" className="min-h-[48px] rounded-sm border border-line bg-well px-4 text-sm outline-none">
              <option value="">All relations</option>
              {relations.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={month} onChange={(event) => setMonth(event.target.value)} aria-label="Filter by month" className="min-h-[48px] rounded-sm border border-line bg-well px-4 text-sm outline-none">
              <option value="">All months</option>
              {months.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort order" className="min-h-[48px] rounded-sm border border-line bg-well px-4 text-sm outline-none">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        )}

        {notice && (
          <p className="mt-4 rounded-2xl border border-signal/35 bg-signal/10 p-4 text-sm leading-7 text-smoke">{notice}</p>
        )}

        {loading ? (
          <div className="mt-8 thin-panel p-8 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-signal/35 border-t-transparent" />
            <p className="mt-5 text-xs text-smoke">Loading relationship reports…</p>
          </div>
        ) : !chains.length ? (
          <div className="mt-8 thin-panel p-8 text-center">
            <h2 className="serif-title text-4xl">Your relationship reports will appear here after your first analysis.</h2>
            <button onClick={() => navigate('/analysis/new')} className="glass-button mt-7 px-5 py-4 text-xs text-bone">
              Start a conversation analysis
            </button>
            <div className="mx-auto mt-7 max-w-md border-t border-line pt-6">
              <RotatingQuote />
            </div>
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            {chains.map((chain) => {
              const latest = chain.reports[0];
              const open = openChain === chain.chainId;
              return (
                <article key={chain.chainId} className="thin-panel p-5">
                  <button onClick={() => setOpenChain(open ? '' : chain.chainId)} className="flex w-full flex-wrap items-start justify-between gap-5 text-left">
                    <div>
                      <p className="tech-label text-signal">Analysis Chain</p>
                      <h2 className="serif-title mt-2 text-4xl">{chain.personName}</h2>
                      <p className="mt-2 text-sm text-smoke">{chain.platform} • {chain.relationshipType} • {chain.reports.length} report{chain.reports.length === 1 ? '' : 's'}</p>
                    </div>
                    <div className="grid gap-2 text-sm text-smoke sm:text-right">
                      <span>Latest Insight: {latest.mainDynamic}</span>
                      <span>Emotional Trend: {latest.emotionalTrend}</span>
                      <span>Compatibility Movement: {latest.compatibilityScore}/100</span>
                    </div>
                  </button>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      onClick={() => navigate(`/reports/${encodeURIComponent(chain.chainId)}/coach`)}
                      className="rounded-sm border border-you/35 bg-you/10 px-5 py-3 text-xs text-you transition hover:border-you/35"
                    >
                      Open AI Relationship Coach
                    </button>
                    <button
                      onClick={() => setOpenChain(open ? '' : chain.chainId)}
                      className="rounded-sm border border-line bg-paper px-5 py-3 text-xs text-smoke transition hover:border-signal/35"
                    >
                      {open ? 'Hide reports' : 'View reports'}
                    </button>
                  </div>
                  {open && (
                    <div className="mt-5 grid gap-3">
                      {chain.reports.map((report) => (
                        <div key={report.analysisId} className="border border-line bg-well p-4 transition hover:border-signal/35">
                          <button onClick={() => openReport(report)} className="w-full text-left">
                            <div className="flex flex-wrap justify-between gap-3">
                              <span className="text-bone">{new Date(report.dateAnalysed).toLocaleString()}</span>
                              <span className=" text-xs text-ash">{report.dateRange}</span>
                            </div>
                            <p className="mt-3 text-sm leading-7 text-smoke">{report.mainDynamic}</p>
                          </button>
                          <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3">
                            {confirmDeleteId === report.analysisId ? (
                              <>
                                <span className="mr-auto text-xs leading-5 text-smoke">Delete this report permanently? This cannot be undone.</span>
                                <button
                                  onClick={() => removeReport(report)}
                                  disabled={deletingId === report.analysisId}
                                  className="rounded-sm border border-risk/35 bg-risk/10 px-4 py-2 text-xs text-risk transition hover:border-risk/35 disabled:opacity-60"
                                >
                                  {deletingId === report.analysisId ? 'Deleting…' : 'Yes, delete'}
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId('')}
                                  className="rounded-sm border border-line bg-paper px-4 py-2 text-xs text-smoke transition hover:border-lineStrong"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(report.analysisId)}
                                className="rounded-sm border border-line bg-paper px-4 py-2 text-xs text-smoke transition hover:border-risk/35 hover:text-risk"
                              >
                                Delete report
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
