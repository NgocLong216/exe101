import { useState } from "react";
import { getAuth } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

export default function CreateGroupPage() {

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [groupPhotoFile, setGroupPhotoFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // 📸 chọn ảnh
  const handlePhotoChange = (e) => {

    const file = e.target.files[0];
    if (!file) return;

    setGroupPhotoFile(file);

    // preview ảnh
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
  };

  // 🚀 create group
  const handleCreateGroup = async () => {

    const user = getAuth().currentUser;
    if (!user) return;

    const token = await user.getIdToken();

    try {

      setLoading(true);

      const formData = new FormData();

      formData.append("title", title);
      formData.append("description", description);

      if (groupPhotoFile) {
        formData.append("groupPhoto", groupPhotoFile);
      }

      const res = await fetch(`${API_URL}/api/groups`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
          // ❌ KHÔNG set Content-Type
        },
        body: formData
      });

      if (!res.ok) throw new Error("Create group failed");

      const data = await res.json();

      navigate(`/groups/${data.id}`);

    } catch (err) {
      console.error(err);
      alert("Không tạo được group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 420, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            marginRight: 12,
            border: "none",
            background: "none",
            fontSize: 20,
            cursor: "pointer",
          }}
        >
          ←
        </button>

        <h2 style={{ margin: 0 }}>Create New Group</h2>
      </div>

      {/* Avatar */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>

        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "#d4a764",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 40,
            color: "white",
            overflow: "hidden",
          }}
        >
          {preview ? (
            <img
              src={preview}
              alt="preview"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            "👥"
          )}
        </div>

        {/* 🔥 input file */}
        <input
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          style={{ marginTop: 12 }}
        />

        <p style={{ color: "#22c55e", marginTop: 8 }}>
          Upload Group Photo
        </p>
      </div>

      {/* Group Name */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontWeight: 600 }}>Group Name</label>

        <input
          type="text"
          placeholder="e.g., Weekend Hikers"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 10,
            border: "1px solid #ddd",
            marginTop: 6,
          }}
        />
      </div>

      {/* Description */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontWeight: 600 }}>Group Description</label>

        <textarea
          placeholder="What is this group for?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 10,
            border: "1px solid #ddd",
            marginTop: 6,
            minHeight: 80,
          }}
        />
      </div>

      {/* Button */}
      <button
        onClick={handleCreateGroup}
        disabled={loading || !title}
        style={{
          width: "100%",
          padding: 14,
          background: "#22c55e",
          color: "white",
          border: "none",
          borderRadius: 12,
          fontSize: 16,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {loading ? "Creating..." : "Create Group"}
      </button>

    </div>
  );
}