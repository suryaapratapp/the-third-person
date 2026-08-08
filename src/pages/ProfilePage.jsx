import { useEffect, useMemo, useState } from 'react';
import { emptyProfile, getInitials, getUserProfile, saveUserProfile } from '../lib/profileStore.js';
import { deleteAllMyAnalysisData, fetchRemoteProfile, remoteProfileToLocal, upsertRemoteProfile } from '../lib/supabaseDataService.js';
import { getZodiacGlyph, getZodiacSign } from '../lib/zodiac.js';
import { useAuth } from '../state/AuthContext.jsx';
import { supportedAnalysisLanguages } from '../lib/languages.js';

const identityOptions = ['Female', 'Male', 'Transgender', 'Non-binary', 'Other', 'Prefer not to say'];

function readImage(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      reject(new Error('Please upload a JPG, PNG, or WebP image.'));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      reject(new Error('Please use an image under 2MB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('We could not read this image.'));
    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(() => ({ ...emptyProfile, ...getUserProfile() }));
  const [message, setMessage] = useState('');
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [wipeResult, setWipeResult] = useState('');
  const zodiac = useMemo(() => getZodiacSign(profile.dateOfBirth), [profile.dateOfBirth]);

  useEffect(() => {
    let mounted = true;
    fetchRemoteProfile().then((remote) => {
      if (!mounted || !remote) return;
      const next = { ...emptyProfile, ...getUserProfile(), ...remoteProfileToLocal(remote) };
      if (!next.email && user?.email) next.email = user.email;
      setProfile(next);
      saveUserProfile(next);
    });
    return () => {
      mounted = false;
    };
  }, [user?.email]);

  function update(field, value) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  function toggleLanguage(language) {
    setProfile((current) => {
      const selected = new Set(current.preferredAnalysisLanguages || []);
      if (selected.has(language)) selected.delete(language);
      else selected.add(language);
      return { ...current, preferredAnalysisLanguages: [...selected] };
    });
  }

  async function handleImage(event) {
    try {
      const image = await readImage(event.target.files?.[0]);
      update('profileImage', image);
      setMessage('Profile image added.');
    } catch (error) {
      setMessage(error.message || 'We could not read this image.');
    }
  }

  async function save() {
    const profileWithZodiac = { ...profile, zodiacSign: zodiac };
    saveUserProfile(profileWithZodiac);
    try {
      await upsertRemoteProfile(profileWithZodiac);
      setMessage('Profile saved securely.');
    } catch {
      setMessage('Profile saved on this device. We could not sync it right now.');
    }
  }

  async function wipeData() {
    setWiping(true);
    setWipeResult('');
    try {
      const counts = await deleteAllMyAnalysisData();
      const removed = [
        [counts.reports, 'report'],
        [counts.personalityCards, 'personality card'],
        [counts.coachMessages, 'coach message'],
      ]
        .filter(([count]) => Number(count) > 0)
        .map(([count, label]) => `${count} ${label}${Number(count) === 1 ? '' : 's'}`);
      setConfirmWipe(false);
      setWipeResult(
        removed.length
          ? `Deleted ${removed.join(', ')}, along with your personality profile and evolution history. Your paid credits are untouched.`
          : 'There was no analysis data left to delete. Your account is already clear.',
      );
    } catch (error) {
      setWipeResult(error.message || 'We could not delete your data right now. Please try again.');
    } finally {
      setWiping(false);
    }
  }

  return (
    <section className="relative min-h-screen overflow-hidden px-4 pb-16 pt-28 sm:px-8">
      <div className="relative mx-auto max-w-5xl">
        <div className="accent-panel p-6 sm:p-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="tech-label text-smoke">Profile</p>
              <h1 className="serif-title mt-4 text-5xl leading-none sm:text-7xl">Your ThirdPerson profile.</h1>
              <p className="mt-6 max-w-2xl text-sm leading-8 text-smoke">
                Your profile helps ThirdPerson AI personalise your relationship insights, guidance tone, zodiac reflection, and shareable cards.
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-signal text-3xl font-semibold text-[color:var(--on-solid)]">
                {profile.profileImage ? <img src={profile.profileImage} alt="Profile preview" className="h-full w-full object-cover" /> : getInitials(profile)}
              </div>
              {zodiac && <span className=" text-xs text-signal">{getZodiacGlyph(zodiac)} {zodiac}</span>}
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              ['First name', 'firstName', 'text'],
              ['Last name', 'lastName', 'text'],
              ['Email', 'email', 'email'],
              ['Phone number (optional)', 'phoneNumber', 'tel'],
              ['Date of birth', 'dateOfBirth', 'date'],
            ].map(([label, field, type]) => (
              <label key={field}>
                <span className="tech-label text-ash">{label}</span>
                <input
                  type={type}
                  value={profile[field]}
                  onChange={(event) => update(field, event.target.value)}
                  placeholder={label}
                  className="mt-2 w-full border border-line bg-well px-4 py-3 text-sm outline-none focus:border-signal/35"
                />
              </label>
            ))}
            <label>
              <span className="tech-label text-ash">Gender / identity</span>
              <select value={profile.genderIdentity} onChange={(event) => update('genderIdentity', event.target.value)} className="mt-2 w-full border border-line bg-well px-4 py-3 text-sm outline-none">
                {identityOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <div className="sm:col-span-2 rounded-sm border border-line bg-paper p-5">
              <p className="tech-label text-signal">Preferred analysis languages</p>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-smoke">
                Select the languages that commonly appear in your conversations. ThirdPerson AI will try to match the tone and language style in your reports and coach replies.
              </p>
              <div className="mt-5 flex max-h-72 flex-wrap gap-2 overflow-y-auto pr-1">
                {supportedAnalysisLanguages.map((language) => {
                  const active = profile.preferredAnalysisLanguages?.includes(language);
                  return (
                    <button
                      key={language}
                      type="button"
                      onClick={() => toggleLanguage(language)}
                      className={`rounded-sm border px-3 py-2 text-xs transition ${active ? 'border-signal/35 bg-signal/10 text-bone' : 'border-line bg-well text-ash hover:border-signal/35 hover:text-bone'}`}
                    >
                      {language}
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 text-xs leading-6 text-ash">
                Selected: {(profile.preferredAnalysisLanguages || []).join(', ') || 'None yet'}
              </p>
            </div>
            <label className="sm:col-span-2 flex cursor-pointer flex-col border border-dashed border-line bg-well p-5 transition hover:border-signal/35">
              <span className="tech-label text-smoke">Profile image</span>
              <span className="mt-3 text-sm text-ash">Upload JPG, PNG, or WebP under 2MB.</span>
              <input className="sr-only" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handleImage} />
            </label>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button onClick={save} className="glass-button px-5 py-4 text-xs text-bone">Save profile</button>
            {message && <p className="text-sm text-smoke">{message}</p>}
          </div>
        </div>

        <div className="thin-panel mt-6 p-6 sm:p-8">
          <p className="tech-label text-risk">Your data</p>
          <h2 className="serif-title mt-3 text-4xl leading-tight">Delete your analysis data.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-smoke">
            This permanently removes every Relationship Report, the personality cards and profile built from them,
            your evolution history, and all AI Relationship Coach messages. It cannot be undone.
          </p>
          <div className="mt-5 grid gap-2 rounded-sm border border-line bg-paper p-4 text-sm leading-7 text-smoke">
            <p><span className="text-bone">Kept:</span> any unused paid credits, so a cleanup never burns what you bought.</p>
            <p><span className="text-bone">Kept:</span> payment receipts, which we retain as financial records.</p>
            <p><span className="text-bone">Kept:</span> your profile details above — edit or clear those directly if you want them changed.</p>
          </div>

          {wipeResult ? (
            <p className="mt-5 rounded-2xl border border-good/35 bg-good/10 p-4 text-sm leading-7 text-smoke">{wipeResult}</p>
          ) : confirmWipe ? (
            <div className="mt-5 rounded-sm border border-risk/35 bg-risk/10 p-5">
              <p className="text-sm leading-7 text-bone">
                Delete all analysis data permanently? Your reports, personality profile, and coach history will be gone for good.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={wipeData}
                  disabled={wiping}
                  className="rounded-sm border border-risk/35 bg-risk/10 px-5 py-3 text-xs text-risk transition hover:border-risk/35 disabled:opacity-60"
                >
                  {wiping ? 'Deleting…' : 'Yes, delete everything'}
                </button>
                <button
                  onClick={() => setConfirmWipe(false)}
                  disabled={wiping}
                  className="rounded-sm border border-line bg-paper px-5 py-3 text-xs text-smoke transition hover:border-lineStrong disabled:opacity-60"
                >
                  Keep my data
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmWipe(true)}
              className="mt-5 rounded-sm border border-risk/35 bg-risk/10 px-5 py-4 text-xs text-risk transition hover:border-risk/35"
            >
              Delete all my analysis data
            </button>
          )}

          <p className="mt-5 text-xs leading-6 text-ash">
            To close your account entirely, contact support@thethirdperson.ai and we will remove the account itself.
          </p>
        </div>
      </div>
    </section>
  );
}
