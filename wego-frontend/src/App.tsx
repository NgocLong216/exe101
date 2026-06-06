import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { listenForegroundMessage } from "./firebase-messaging";
import { Toaster } from "react-hot-toast";

import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import MyGroupsPage from "./pages/MyGroupsPage";
import CreateGroupPage from "./pages/CreateGroupPage";
import GroupDetailPage from "./pages/GroupDetailPage";
import InvitationsPage from "./pages/InvitationsPage";
import ProfilePage from "./pages/ProfilePage";
import GroupChatPage from "./pages/GroupChatPage";
import GroupAIChatPage from "./pages/GroupAIChatPage";
import AdminPage from "./pages/AdminPage";
import AdminRoute from "./components/AdminRoute";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser && savedUser !== "undefined") {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Error parsing user from localStorage:", e);
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    listenForegroundMessage();
  }, []);

  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<LoginPage setUser={setUser} />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/groups" element={<MyGroupsPage />} />
        <Route path="/groups/create" element={<CreateGroupPage />} />
        <Route path="/groups/:groupId" element={<GroupDetailPage />} />
        <Route path="/invitations" element={<InvitationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/groups/:groupId/chat" element={<GroupChatPage />} />
        <Route path="/groups/:groupId/ai-chat" element={<GroupAIChatPage />} />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;
