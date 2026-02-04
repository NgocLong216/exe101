import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { useParams } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

export default function GroupDetailPage() {
  const { groupId } = useParams();
  const [keyword, setKeyword] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const searchUsers = async () => {
    if (!keyword) return;

    const token = await getAuth().currentUser.getIdToken();
    setLoading(true);

    try {
      const res = await fetch(
        `${API_URL}/api/users/search?keyword=${keyword}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();
      setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const inviteUser = async (firebaseUid) => {
    const token = await getAuth().currentUser.getIdToken();

    try {
      const res = await fetch(
        `${API_URL}/api/groups/${groupId}/invite`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ firebaseUid }),
        }
      );

      if (!res.ok) throw new Error(await res.text());
      alert("Đã gửi invite ✅");
    } catch (e) {
      alert("Invite thất bại ❌");
      console.error(e);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Invite thành viên</h2>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          placeholder="Nhập tên người dùng..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button onClick={searchUsers}>Search</button>
      </div>

      {loading && <p>Đang tìm...</p>}

      <ul>
        {users.map((u) => (
          <li key={u.firebaseUid} style={{ marginTop: 8 }}>
            {u.name}
            <button
              style={{ marginLeft: 12 }}
              onClick={() => inviteUser(u.firebaseUid)}
            >
              Invite
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
