import { getAuth } from 'firebase/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED';

async function authenticatedFetch(path: string, options: RequestInit = {}) {
  const user = getAuth().currentUser;
  if (!user) throw new Error('Please sign in before paying.');

  const token = await user.getIdToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Payment request failed.');
  }
  return response;
}

export async function createMomoPayment(): Promise<{ orderId: string; payUrl: string }> {
  const response = await authenticatedFetch('/api/payments/momo', { method: 'POST' });
  return response.json();
}

export async function getPaymentStatus(orderId: string): Promise<PaymentStatus> {
  const response = await authenticatedFetch(`/api/payments/${encodeURIComponent(orderId)}`);
  const body = await response.json();
  return body.status;
}
