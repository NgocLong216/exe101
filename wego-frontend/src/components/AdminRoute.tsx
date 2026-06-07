import { Navigate } from "react-router-dom";

export default function AdminRoute({ children }: any) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (user?.role?.name !== "ADMIN") {
    return <Navigate to="/home" replace />;
  }

  return children;
}