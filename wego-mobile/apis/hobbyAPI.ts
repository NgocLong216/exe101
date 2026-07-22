import { getAuth } from 'firebase/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export async function saveHobbyPreferences(
  destinations: string[],
  vibes: string[],
) {
  const token = await getAuth().currentUser?.getIdToken();
  if (!token) throw new Error('You must be logged in.');

  const response = await fetch(`${API_URL}/api/users/me/hobbies`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ destinations, vibes }),
  });

  if (!response.ok) throw new Error('Could not save your preferences.');
  return response.json();
}
