import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import CreateGroupButton from "../components/CreateGroupButton";

const API_URL = import.meta.env.VITE_API_URL;

export default function MyGroupsPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGroups = async () => {
      const user = getAuth().currentUser;
      if (!user) return;

      const token = await user.getIdToken();

      try {
        const res = await fetch(`${API_URL}/api/groups/my`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error("Fetch groups failed");

        const data = await res.json();
        setGroups(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  if (loading) return <p>Đang tải group...</p>;

  return (
    <div style={{ padding: 24 }}>
      <h2>Group của tôi</h2>

      <CreateGroupButton />

      {groups.length === 0 && <p>Bạn chưa tham gia group nào</p>}

      <div style={{ display: "grid", gap: 16 }}>
        {groups.map((g) => (
          <div
            key={g.id}
            onClick={() => navigate(`/groups/${g.id}`)}
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 16,
              cursor: "pointer",
              display: "flex",
              gap: 16,
              alignItems: "flex-start",
            }}
          >
            <img
              src={
                g.groupPhoto ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(g.title)}`
              }
              alt="group"
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />

            <div style={{ flex: 1 }}>
              <h3 style={{ margin: "0 0 8px" }}>{g.title}</h3>

              <p style={{ margin: "0 0 8px", color: "#666" }}>
                {g.description}
              </p>

              <div style={{ fontSize: 14, color: "#444" }}>
                <div>👥 {g.memberCount} thành viên</div>

                <div>
                  📍 {g.lat && g.lng ? "Đã chọn địa điểm" : "Chưa chọn địa điểm"}
                </div>

                <div>
                  ⏰{" "}
                  {g.meetingTime
                    ? new Date(g.meetingTime).toLocaleString()
                    : "Chưa đặt lịch"}
                </div>

                <div>Trạng thái: {g.status}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
