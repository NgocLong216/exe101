import { getAuth, signOut } from "firebase/auth";

const API_URL = import.meta.env.VITE_API_URL;

async function getAuthHeader() {
    const user = getAuth().currentUser;

    if (!user) {
        throw new Error("User not authenticated");
    }

    const token = await user.getIdToken();

    return {
        Authorization: `Bearer ${token}`,
    };
}


export const getUserCount = async () => {
    const user = getAuth().currentUser;

    if (!user) {
        throw new Error("User not authenticated");
    }

    const token = await user.getIdToken();

    const res = await fetch(
        `${API_URL}/api/admin/users/count`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    if (!res.ok) {
        throw new Error("Failed to fetch user count");
    }

    return res.json();
};

export async function getAllUsers() {
    const headers = await getAuthHeader();

    const res = await fetch(`${API_URL}/api/admin/users`, {
        headers,
    });

    if (!res.ok) {
        throw new Error("Failed to fetch users");
    }

    return res.json();
}

export const getScheduleCount = async () => {
    const user = getAuth().currentUser;

    if (!user) {
        throw new Error("User not authenticated");
    }

    const token = await user.getIdToken();

    const res = await fetch(
        `${API_URL}/api/admin/schedules/count`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    if (!res.ok) {
        throw new Error("Failed to fetch schedule count");
    }

    return res.json();
};

export const getAllSchedules = async () => {
    const user = getAuth().currentUser;

    if (!user) {
        throw new Error("User not authenticated");
    }

    const token = await user.getIdToken();

    const res = await fetch(
        `${API_URL}/api/admin/schedules`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    if (!res.ok) {
        throw new Error("Failed to fetch schedules");
    }

    return res.json();
};

export const getQueryCount = async () => {
    const user = getAuth().currentUser;

    if (!user) {
        throw new Error("User not authenticated");
    }

    const token = await user.getIdToken();

    const res = await fetch(
        `${API_URL}/api/admin/queries/count`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    if (!res.ok) {
        throw new Error("Failed to fetch query count");
    }

    return res.json();
};

export const getAllQueries = async () => {
    const user = getAuth().currentUser;

    if (!user) {
        throw new Error("User not authenticated");
    }

    const token = await user.getIdToken();

    const res = await fetch(
        `${API_URL}/api/admin/queries`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    if (!res.ok) {
        throw new Error("Failed to fetch queries");
    }

    return res.json();
};

export const getInteractionHeatmap = async () => {
    const user = getAuth().currentUser;

    if (!user) {
        throw new Error("User not authenticated");
    }

    const token = await user.getIdToken();

    const res = await fetch(
        `${API_URL}/api/admin/queries/heatmap`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    return res.json();
};

export const logout = async () => {
    const user = getAuth().currentUser;

    if (!user) {
        throw new Error("User not authenticated");
    }

    const token = await user.getIdToken();

    const res = await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!res.ok) {
        throw new Error("Logout failed");
    }

    // logout phía client
    await signOut(getAuth());

    return res.text();
};

export const getRecentActivities = async () => {
    const headers = await getAuthHeader();

    const res = await fetch(
        `${API_URL}/api/admin/activities`,
        {
            headers,
        }
    );

    if (!res.ok) {
        throw new Error("Failed to fetch activities");
    }

    return res.json();
};

export const getScheduleTrend = async () => {
    const headers = await getAuthHeader();

    const res = await fetch(
        `${API_URL}/api/admin/schedules/trend`,
        {
            headers,
        }
    );

    if (!res.ok) {
        throw new Error("Failed to fetch trend");
    }

    return res.json();
};

export const getAvgResponseTime =
    async () => {

        const headers =
            await getAuthHeader();

        const res = await fetch(
            `${API_URL}/api/admin/queries/avg-response-time`,
            {
                headers,
            }
        );

        return res.json();
    };

export const getAvgTimeToFirstSchedule =
    async () => {

        const headers =
            await getAuthHeader();

        const res = await fetch(
            `${API_URL}/api/admin/schedules/avg-time-to-first`,
            {
                headers,
            }
        );

        if (!res.ok) {
            throw new Error(
                "Failed to fetch avg time"
            );
        }

        return res.json();
    };