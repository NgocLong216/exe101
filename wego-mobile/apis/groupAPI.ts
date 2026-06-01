import { getAuth } from 'firebase/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL

export type GroupResponse = {
    id: string,
    title: string,
    description: string,
    groupPhoto: string,
    host: boolean,
    locationLat: any,
    locationLng: any,
    meetingTime: any,
    memberCount: number,
    status: any
}

export type GroupMember = {
    firebaseUid: string,
    name: string,
    host: boolean,
}

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
    if (!res.ok) throw new Error(await res.text());
    return res;
}

// ── existing ─────────────────────────────────────────────────────────────────

export async function getUserGroups(): Promise<GroupResponse[]> {
    try {
        const res = await apiFetch("/api/groups/my");
        return await res.json() as GroupResponse[];
    } catch (err) {
        console.error(err);
        return [];
    }
}

// ── GroupDetailPage APIs ──────────────────────────────────────────────────────

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
    try {
        const res = await apiFetch(`/api/groups/${groupId}/members`);
        return await res.json() as GroupMember[];
    } catch (err) {
        console.error("Fetch members failed", err);
        return [];
    }
}

export async function inviteUser(groupId: string, firebaseUid: string): Promise<void> {
    await apiFetch(`/api/groups/${groupId}/invite`, {
        method: "POST",
        body: JSON.stringify({ firebaseUid }),
    });
}

export async function kickMember(groupId: string, firebaseUid: string): Promise<void> {
    await apiFetch(`/api/groups/${groupId}/members/${firebaseUid}`, {
        method: "DELETE",
    });
}

export async function leaveGroup(groupId: string): Promise<void> {
    await apiFetch(`/api/groups/${groupId}/leave`, {
        method: "DELETE",
    });
}

export async function deleteGroup(groupId: string): Promise<void> {
    await apiFetch(`/api/groups/${groupId}`, {
        method: "DELETE",
    });
}

export async function scheduleMeet(groupId: string, meetingTime: string): Promise<void> {
    await apiFetch(`/api/groups/${groupId}/schedule-meet`, {
        method: "POST",
        body: JSON.stringify({ meetingTime }),
    });
}

export async function searchUsers(keyword: string): Promise<GroupMember[]> {
    try {
        const res = await apiFetch(`/api/users/search?keyword=${encodeURIComponent(keyword)}`);
        return await res.json() as GroupMember[];
    } catch (err) {
        console.error("Search users failed", err);
        return [];
    }
}

export async function createGroup(
    title: string,
    description: string,
    groupPhotoFile?: File | Blob
): Promise<GroupResponse> {
    const token = await getToken();

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    if (groupPhotoFile) {
        formData.append("groupPhoto", groupPhotoFile);
    }

    const res = await fetch(`${API_URL}/api/groups`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            // ❌ Don't set Content-Type — let the browser set multipart boundary
        },
        body: formData,
    });

    if (!res.ok) throw new Error(await res.text());
    return await res.json() as GroupResponse;
}