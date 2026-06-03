import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";

const API_URL = import.meta.env.VITE_API_URL;

export default function InvitationsPage() {
  const [invites, setInvites] = useState([]);

  const fetchInvites = async () => {
    const token = await getAuth().currentUser.getIdToken();

    const res = await fetch(`${API_URL}/api/groups/invitations`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    setInvites(data);
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  const respond = async (id, accept) => {
    const token = await getAuth().currentUser.getIdToken();

    await fetch(
      `${API_URL}/api/groups/invitations/${id}/${accept ? "accept" : "reject"}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    fetchInvites();
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Lời mời tham gia group</h2>

      {invites.length === 0 && <p>Không có lời mời nào</p>}

      {invites.map((i) => (
        <div
          key={i.memberId}
          style={{
            border: "1px solid #ddd",
            padding: 12,
            marginBottom: 8,
            borderRadius: 8,
          }}
        >
          <div>📌 Group: {i.groupTitle}</div>

          <button onClick={() => respond(i.memberId, true)}>✅ Accept</button>
          <button
            onClick={() => respond(i.memberId, false)}
            style={{ marginLeft: 8 }}
          >
            ❌ Reject
          </button>
        </div>
      ))}
    </div>
  );
}
