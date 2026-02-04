import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import MyGroupsPage from "./pages/MyGroupsPage";
import GroupDetailPage from "./pages/GroupDetailPage";
import InvitationsPage from "./pages/InvitationsPage";

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


  return (
    <Routes>
        <Route path="/" element={<LoginPage setUser={setUser} />} /> 
        <Route path="/home" element={<HomePage/>} />
        <Route path="/groups" element={<MyGroupsPage />} />
        <Route path="/groups/:groupId" element={<GroupDetailPage />} />
        <Route path="/invitations" element={<InvitationsPage />} />

    </Routes>
  );
}

export default App;
