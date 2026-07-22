import { getAuth } from 'firebase/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export type CurrentUserProfile = {
  firebaseUid: string;
  name?: string;
  email?: string;
  avatar?: string;
  plan?: string;
  planExpiresAt?: string | null;
};

export async function getCurrentUserProfile(): Promise<CurrentUserProfile> {
  const user = getAuth().currentUser;
  if (!user) throw new Error('You must be logged in.');
  const token = await user.getIdToken();
  const response = await fetch(`${API_URL}/api/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Could not load your membership.');
  return response.json();
}

export function hasActivePlus(profile?: CurrentUserProfile | null) {
  if (!profile || !['PLUS', 'PREMIUM'].includes((profile.plan || '').toUpperCase())) return false;
  if (!profile.planExpiresAt) return false;
  return new Date(profile.planExpiresAt).getTime() > Date.now();
}
