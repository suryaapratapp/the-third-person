const PROFILE_KEY = 'thirdperson_user_profile_v1';

export const emptyProfile = {
  firstName: '',
  lastName: '',
  email: '',
  genderIdentity: 'Prefer not to say',
  dateOfBirth: '',
  preferredLanguageTone: 'Warm Hinglish / English',
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
