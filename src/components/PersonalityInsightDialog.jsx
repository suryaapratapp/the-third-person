import { useEffect, useState } from 'react';
import { PiSparkleFill, PiX } from 'react-icons/pi';
import { useRouter } from '../state/RouterContext.jsx';

const METERS = [
  { key: 'humourScore', label: 'Funnyness', color: '#fbbf24' },
  { key: 'calmnessScore', label: 'Calmness', color: '#34d399' },
  { key: 'egoScore', label: 'Ego Meter', color: '#fb923c' },
  { key: 'empathyScore', label: 'Empathy', color: '#fb7185' },
  { key: 'expressivenessScore', label: 'Expressiveness', color: '#e879f9' },
  { key: 'patienceScore', label: 'Patience', color: '#c084fc' },
];

function clampScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 50;
  return Math.max(0, Math.min(100, number));
}

function ScoreMeter({ label, score, color, animate }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="tech-label text-ash">{label}</p>
        <p className="font-mono text-xs text-bone">{score}</p>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: animate ? `${score}%` : '0%', background: color }}
        />
      </div>
    </div>
  );
}

export default function PersonalityInsightDialog({ item, onClose }) {
  const { navigate } = useRouter();
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setAnimate(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (!item) return null;

  const scores = item.card?.personalityScores || null;
  const hasCard = Boolean(item.card);

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/75 px-4 py-8 backdrop-blur"
      role="dialog"
      aria-modal="true"
      aria-labelledby="personality-dialog-heading"
      onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}
    >
      <div className={`glass-card glow-border relative max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6 transition duration-300 sm:p-8 ${animate ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-2xl leading-none ${item.iconClass}`}>{item.icon}</span>
            <div>
              <p className="tech-label text-smoke">{item.label}</p>
              <h2 id="personality-dialog-heading" className="serif-title text-3xl leading-tight text-bone">{item.personalityLabel !== 'Waiting for evidence' ? item.personalityLabel : item.label}</h2>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="glass-button flex h-9 w-9 items-center justify-center rounded-full p-0 text-bone">
            <PiX aria-hidden="true" />
          </button>
        </div>

        {!hasCard ? (
          <div className="mt-8 rounded-2xl border border-white/12 bg-white/[0.04] p-6 text-center">
            <PiSparkleFill className="mx-auto text-2xl text-purple-200" aria-hidden="true" />
            <p className="mt-3 text-sm leading-7 text-smoke">
              Analyse a chat {item.key === 'partner' ? 'with a partner' : item.key === 'ex' ? 'with an ex' : `with a ${item.key === 'family' ? 'family member' : item.key.replace(/s$/, '')}`} to unlock this ✨
            </p>
            <button
              onClick={() => navigate('/analysis/new')}
              className="btn btn-primary mt-5"
            >
              Start an analysis
            </button>
          </div>
        ) : (
          <>
            <p className="mt-6 text-sm leading-7 text-smoke">{item.summary}</p>

            <div className="mt-6 flex flex-wrap gap-2">
              {item.keywords.slice(0, 5).map((keyword) => (
                <span key={keyword} className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 font-mono text-[0.63rem] uppercase tracking-[0.1em] text-smoke">
                  {keyword}
                </span>
              ))}
            </div>

            {scores ? (
              <>
                <div className="mt-7 border-t border-white/10 pt-6">
                  <p className="tech-label text-purple-200">Speaking style</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="serif-title text-2xl text-bone">{scores.speakingStyle?.label || 'Still forming'}</p>
                    <p className="font-mono text-xs text-ash">{clampScore(scores.speakingStyle?.score)}/100</p>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: animate ? `${clampScore(scores.speakingStyle?.score)}%` : '0%', background: '#a78bfa' }}
                    />
                  </div>
                </div>

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  {METERS.map((meter) => (
                    <ScoreMeter key={meter.key} label={meter.label} score={clampScore(scores[meter.key])} color={meter.color} animate={animate} />
                  ))}
                </div>

                {scores.signatureBehaviours?.length > 0 && (
                  <div className="mt-7 border-t border-white/10 pt-6">
                    <p className="tech-label text-orange-100">Your signature behaviours</p>
                    <ul className="mt-4 space-y-2 text-sm leading-7 text-smoke">
                      {scores.signatureBehaviours.slice(0, 5).map((behaviour) => (
                        <li key={behaviour} className="flex gap-2">
                          <span className="text-purple-200">•</span>
                          {behaviour}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center text-sm leading-6 text-ash">
                Detailed score meters unlock after your next analysis in this category ✨
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
