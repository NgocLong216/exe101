import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";


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
    </Routes>
  );
}

export default App;
