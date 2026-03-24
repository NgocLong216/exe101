import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) return;

      const res = await fetch(`${API_URL}/api/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Cannot fetch profile");

      const data = await res.json();
      setProfile(data);
      setName(data.name);
      setAvatar(data.avatar || "");

    } catch (err) {
      console.error(err);
      alert("Không thể tải profile");
    }
  };

  const handleUpdate = async () => {
    try {
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) return;

      const formData = new FormData();
      formData.append("name", name);

      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      const res = await fetch(`${API_URL}/api/users/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) throw new Error("Update failed");

      const updated = await res.json();

      setProfile(updated);
      setEditing(false);

      // reset preview
      setAvatarFile(null);
      setPreview(null);

      alert("Cập nhật thành công ✅");

    } catch (err) {
      console.error(err);
      alert("Cập nhật thất bại ❌");
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAvatarFile(file);

    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
  };

  if (!profile) return <div>Loading...</div>;

  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h2>👤 Thông tin cá nhân</h2>

      <div style={{ position: "relative", display: "inline-block" }}>
        <img
          src={preview || profile.avatar}
          alt="avatar"
          style={{
            width: "120px",
            height: "120px",
            borderRadius: "50%",
            objectFit: "cover",
            marginBottom: "10px",
          }}
        />

        {editing && (
          <input
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            style={{ display: "block", margin: "10px auto" }}
          />
        )}
      </div>

      <div style={{ marginTop: "10px" }}>
        <strong>Tên:</strong>{" "}
        {editing ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        ) : (
          profile.name
        )}
      </div>

      <p><strong>Email:</strong> {profile.email}</p>

      {!editing ? (
        <button
          onClick={() => setEditing(true)}
          style={buttonStyle("#f57c00")}
        >
          ✏️ Chỉnh sửa
        </button>
      ) : (
        <>
          <button
            onClick={handleUpdate}
            style={buttonStyle("#2e7d32")}
          >
            💾 Lưu
          </button>

          <button
            onClick={() => {
              setEditing(false);
              setName(profile.name);
              setAvatar(profile.avatar);
            }}
            style={buttonStyle("#d32f2f")}
          >
            ❌ Hủy
          </button>
        </>
      )}

      <br />

      <button
        onClick={() => navigate(-1)}
        style={{ ...buttonStyle("#1976d2"), marginTop: "20px" }}
      >
        ⬅ Quay lại
      </button>
    </div>
  );
}

function buttonStyle(color) {
  return {
    margin: "10px",
    padding: "8px 14px",
    borderRadius: "6px",
    border: "none",
    background: color,
    color: "white",
    cursor: "pointer",
  };
}