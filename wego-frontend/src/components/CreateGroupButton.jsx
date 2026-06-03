import { useNavigate } from "react-router-dom";

export default function CreateGroupButton() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/groups/create")}
      style={{
        background: "#22c55e",
        color: "white",
        border: "none",
        padding: "12px 20px",
        borderRadius: 10,
        cursor: "pointer",
        fontWeight: "600",
        marginBottom: 20,
      }}
    >
      + Create Group
    </button>
  );
}