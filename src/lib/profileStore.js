import { defaultAnalysisLanguages } from './languages.js';

const PROFILE_KEY = 'thirdperson_user_profile_v1';

export const emptyProfile = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  genderIdentity: 'Prefer not to say',
  dateOfBirth: '',
  preferredLanguageTone: 'Warm Hinglish / English',
  preferredAnalysisLanguages: defaultAnalysisLanguages,
  profileImage: '',
};

export function getUserProfile() {
  if (typeof window === 'undefined') return emptyProfile;
  try {
    return { ...emptyProfile, ...(JSON.parse(window.localStorage.getItem(PROFILE_KEY) || '{}')) };
  } catch {
    return emptyProfile;
  }
}

export function saveUserProfile(profile) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...emptyProfile, ...profile }));
}

export function getInitials(profile = {}) {
  const first = profile.firstName?.trim()?.[0] || '';
  const last = profile.lastName?.trim()?.[0] || '';
  return `${first}${last}`.toUpperCase() || 'TP';
}

// Fields the analysis genuinely uses, and the reason each one is required.
//
// This is not a data grab. Every field here changes the output:
//   firstName/lastName  — identifies which participant is the reader, which
//                         drives every "you" in the report
//   genderIdentity      — how the coach and report refer to the reader
//   dateOfBirth         — the zodiac layer, and nothing else
//   languages           — whether a Hinglish chat is read as Hinglish
//
// `preferredLanguageTone` and phone/photo are deliberately NOT required: the
// first has a sensible default and the others change nothing about the report.
export const REQUIRED_PROFILE_FIELDS = [
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'genderIdentity', label: 'Gender' },
  { key: 'dateOfBirth', label: 'Date of birth' },
  { key: 'preferredAnalysisLanguages', label: 'Languages you chat in' },
];

export function missingProfileFields(profile = {}) {
  return REQUIRED_PROFILE_FIELDS.filter(({ key }) => {
    const value = profile[key];
    if (Array.isArray(value)) return value.length === 0;
    // "Prefer not to say" is the stored default, so it cannot count as an
    // answer — otherwise everyone is silently "complete" on day one.
    if (key === 'genderIdentity') return !value || value === 'Prefer not to say';
    return !String(value || '').trim();
  });
}

export function isProfileComplete(profile = {}) {
  return missingProfileFields(profile).length === 0;
}
