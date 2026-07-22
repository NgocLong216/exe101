import { getAuth } from 'firebase/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export async function deleteMyAccount() {
  const user = getAuth().currentUser;
  if (!user) throw new Error('You must be logged in.');
  const token = await user.getIdToken();
  const response = await fetch(`${API_URL}/api/users/me`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Could not delete your account.');
  }
}
