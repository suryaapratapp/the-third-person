import { useEffect, useMemo, useState } from 'react';
import ParticleBackground from '../components/ParticleBackground.jsx';
import { emptyProfile, getInitials, getUserProfile, saveUserProfile } from '../lib/profileStore.js';
import { fetchRemoteProfile, remoteProfileToLocal, upsertRemoteProfile } from '../lib/supabaseDataService.js';
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

  return (
    <section className="relative min-h-screen overflow-hidden px-4 pb-16 pt-28 sm:px-8">
      <ParticleBackground className="opacity-45" />
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
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-purple-200/40 bg-gradient-to-br from-purple-300/20 via-pink-300/15 to-orange-300/15 text-3xl text-bone">
                {profile.profileImage ? <img src={profile.profileImage} alt="Profile preview" className="h-full w-full object-cover" /> : getInitials(profile)}
              </div>
              {zodiac && <span className="font-mono text-xs uppercase tracking-[0.13em] text-purple-100">{getZodiacGlyph(zodiac)} {zodiac}</span>}
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
                  className="mt-2 w-full border border-white/12 bg-black/45 px-4 py-3 text-sm outline-none focus:border-purple-200/60"
                />
              </label>
            ))}
            <label>
              <span className="tech-label text-ash">Gender / identity</span>
              <select value={profile.genderIdentity} onChange={(event) => update('genderIdentity', event.target.value)} className="mt-2 w-full border border-white/12 bg-black/45 px-4 py-3 text-sm outline-none">
                {identityOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <div className="sm:col-span-2 rounded-[28px] border border-white/10 bg-white/[0.035] p-5">
              <p className="tech-label text-purple-100">Preferred analysis languages</p>
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
                      className={`rounded-full border px-3 py-2 font-mono text-[0.65rem] uppercase tracking-[0.11em] transition ${active ? 'border-purple-200/60 bg-purple-300/15 text-bone' : 'border-white/10 bg-black/25 text-ash hover:border-purple-200/40 hover:text-bone'}`}
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
            <label className="sm:col-span-2 flex cursor-pointer flex-col border border-dashed border-white/18 bg-black/35 p-5 transition hover:border-purple-200/50">
              <span className="tech-label text-smoke">Profile image</span>
              <span className="mt-3 text-sm text-ash">Upload JPG, PNG, or WebP under 2MB.</span>
              <input className="sr-only" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handleImage} />
            </label>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button onClick={save} className="glass-button px-5 py-4 font-mono text-xs uppercase tracking-[0.16em] text-bone">Save profile</button>
            {message && <p className="text-sm text-smoke">{message}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
