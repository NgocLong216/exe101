import { getAuth } from 'firebase/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export type ScheduleResponse = {
    groupId: string;
    groupTitle: string;
    description: string;
    meetingTime: string;
    lat: number;
    lng: number;
    placeId: string;
    groupPhoto: string;
    attendeeCount: number;
    attendeePhotos: string[];
    status: 'ON_GOING' | 'ENDED' | 'UPCOMING';
    host: boolean;
};

export type ScheduleMeetRequest = {
    meetingTime: string; // ISO string e.g. "2026-07-15T18:30:00"
    locationLat: number;
    locationLng: number;
    placeId: string;
};

// ── helpers ──────────────────────────────────────────────────────────────────

async function getToken(): Promise<string> {
    const user = getAuth().currentUser;
    if (!user) throw new Error("Not authenticated");
    return user.getIdToken();
}

async function apiFetch(path: string, options: RequestInit = {}) {
    const token = await getToken();

    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...options.headers,
        },
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
    }

    return res;
}

// ── Schedule APIs ─────────────────────────────────────────────────────────────

export async function getMySchedules(): Promise<ScheduleResponse[]> {
    try {
        const res = await apiFetch("/api/groups/my-schedules");
        return await res.json();
    } catch (err) {
        console.error("Fetch schedules failed", err);
        return [];
    }
}

export async function scheduleMeet(
    groupId: string,
    data: ScheduleMeetRequest
): Promise<void> {
    await apiFetch(`/api/groups/${groupId}/schedule-meet`, {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function completeSchedule(
    groupId: string
  ): Promise<void> {
    await apiFetch(`/api/groups/${groupId}/complete`, {
      method: "POST",
    });
  }