import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { useParams, useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

export default function GroupDetailPage() {
  const { groupId } = useParams();
  const [keyword, setKeyword] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const navigate = useNavigate();
  const [currentUid, setCurrentUid] = useState(null);
  const [meetingTime, setMeetingTime] = useState("");

  useEffect(() => {
    const auth = getAuth();
    if (auth.currentUser) {
      setCurrentUid(auth.currentUser.uid);
    }
  }, []);

  const scheduleMeet = async () => {
    if (!meetingTime) {
      alert("Vui lòng chọn thời gian");
      return;
    }
  
    const token = await getAuth().currentUser.getIdToken();
  
    try {
      const res = await fetch(
        `${API_URL}/api/groups/${groupId}/schedule-meet`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            meetingTime: meetingTime,
          }),
        }
      );
  
      if (!res.ok) throw new Error(await res.text());
  
      alert("Đã đặt lịch Meet thành công 🎉");
    } catch (e) {
      alert("Đặt lịch thất bại ❌");
      console.error(e);
    }
  };

  const kickMember = async (firebaseUid) => {
    if (!window.confirm("Bạn chắc chắn muốn kick thành viên này?")) return;

    const token = await getAuth().currentUser.getIdToken();

    try {
      const res = await fetch(
        `${API_URL}/api/groups/${groupId}/members/${firebaseUid}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error(await res.text());

      alert("Đã kick thành viên ");

      // reload lại member list
      setMembers((prev) =>
        prev.filter((m) => m.firebaseUid !== firebaseUid)
      );

    } catch (e) {
      alert("Kick thất bại ");
      console.error(e);
    }
  };

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

  const deleteGroup = async () => {
    if (!window.confirm("Bạn chắc chắn muốn xoá group này?")) return;

    const token = await getAuth().currentUser.getIdToken();

    try {
      const res = await fetch(`${API_URL}/api/groups/${groupId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error(await res.text());

      alert("Đã xoá group");
      navigate("/groups");
    } catch (e) {
      alert("Xoá group thất bại");
      console.error(e);
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

  useEffect(() => {
    const fetchMembers = async () => {
      const token = await getAuth().currentUser.getIdToken();

      try {
        const res = await fetch(
          `${API_URL}/api/groups/${groupId}/members`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const data = await res.json();
        setMembers(data);
      } catch (e) {
        console.error("Fetch members failed", e);
      }
    };

    fetchMembers();
  }, [groupId]);

  const leaveGroup = async () => {
  if (!window.confirm("Bạn chắc chắn muốn rời nhóm?")) return;

  const token = await getAuth().currentUser.getIdToken();

  try {
    const res = await fetch(
      `${API_URL}/api/groups/${groupId}/leave`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) throw new Error(await res.text());

    alert("Đã rời nhóm");
    navigate("/groups");
  } catch (e) {
    alert("Rời nhóm thất bại");
    console.error(e);
  }
};


  return (
    <div style={{ padding: 24 }}>
      <h1>Group Detail</h1>

      {/* MEMBERS */}
      <h2>👥 Thành viên trong group</h2>
      <ul>
  {members.map((m) => (
    <li key={m.firebaseUid} style={{ marginBottom: 8 }}>
      {m.name}
      <span style={{ marginLeft: 8, color: "green" }}>✔</span>
      {m.host && <span style={{ marginLeft: 6 }}>👑</span>}

      {/* Không hiển thị nếu là host hoặc là chính mình */}
      {!m.host && m.firebaseUid !== currentUid && (
        <button
          style={{
            marginLeft: 12,
            background: "#ff5252",
            color: "white",
            border: "none",
            borderRadius: 4,
            padding: "4px 8px",
            cursor: "pointer",
          }}
          onClick={() => kickMember(m.firebaseUid)}
        >
          Kick
        </button>
      )}

{!m.host && m.firebaseUid === currentUid && (
  <button
    style={{
      marginLeft: 12,
      background: "#757575",
      color: "white",
      border: "none",
      borderRadius: 4,
      padding: "4px 8px",
      cursor: "pointer",
    }}
    onClick={leaveGroup}
  >
    Leave
  </button>
)}
    </li>
  ))}
</ul>


      <hr />

      {/* INVITE */}
      <h2>➕ Invite thành viên</h2>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          placeholder="Nhập tên người dùng..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button onClick={searchUsers}>Search</button>
      </div>

      <ul>
        {users.map((u) => (
          <li key={u.firebaseUid}>
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

      <hr />

<h2>⏰ Đặt giờ Meet</h2>

<div style={{ display: "flex", gap: 12, alignItems: "center" }}>
  <input
    type="datetime-local"
    value={meetingTime}
    onChange={(e) => setMeetingTime(e.target.value)}
    style={{
      padding: 6,
      borderRadius: 4,
      border: "1px solid #ccc",
    }}
  />

  <button
    onClick={scheduleMeet}
    style={{
      background: "#1976d2",
      color: "white",
      border: "none",
      borderRadius: 4,
      padding: "6px 12px",
      cursor: "pointer",
    }}
  >
    📅 Đặt lịch
  </button>
</div>

      {/* DELETE */}
      <button
        style={{
          background: "#d32f2f",
          color: "white",
          padding: "8px 12px",
          border: "none",
          borderRadius: 6,
          marginTop: 24,
          cursor: "pointer",
        }}
        onClick={deleteGroup}
      >
        🗑️ Xoá group
      </button>
    </div>

  );
}
