import { useEffect, useState, useRef } from "react";
import goongjs from "@goongmaps/goong-js";
import "@goongmaps/goong-js/dist/goong-js.css";

import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { ref, set, onValue, onDisconnect } from "firebase/database";
import { db } from "../../firebase";
import { Link } from "react-router-dom";

const FALLBACK_CENTER = [106.660172, 10.762622];

export default function HomePage() {
  const mapRef = useRef(null);
  const mapContainer = useRef(null);
  const GOONG_KEY = import.meta.env.VITE_GOONG_MAP_KEY;
  const [authUser, setAuthUser] = useState(null);

  const [allowedUids, setAllowedUids] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const markersRef = useRef({});

  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([]);

  // gửi message đến backend để gợi ý địa điểm
  const handleSendMessage = async () => {
    if (!message.trim() || !authUser) return;

    const token = await authUser.getIdToken();

    // Hiển thị tin nhắn user trước
    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: message },
    ]);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/groups/97e5e779-79ba-4ea4-a75a-001b3b677859/suggest-place`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            keyword: message,
          }),
        }
      );

      if (!res.ok) {
        console.error("API error:", res.status);
        return;
      }
      const data = await res.json();

      console.log("Suggest result:", data);

      // Hiển thị kết quả trong chat
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Here are some suggested places:",
          places: data.places,
        },
      ]);

      setMessage("");

    } catch (err) {
      console.error("Suggest error:", err);
    }
  };

  // hiện thị marker trên goongmap
  useEffect(() => {
    if (!mapRef.current) return;

    const currentUids = groupMembers.map((m) => m.firebaseUid);

    groupMembers.forEach((member) => {
      if (markersRef.current[member.firebaseUid]) {
        markersRef.current[member.firebaseUid].setLngLat([
          member.lng,
          member.lat,
        ]);
      } else {
        const marker = new goongjs.Marker({ color: "#22c55e" })
          .setLngLat([member.lng, member.lat])
          .addTo(mapRef.current);

        markersRef.current[member.firebaseUid] = marker;
      }
    });

    // remove marker nếu không còn tồn tại
    Object.keys(markersRef.current).forEach((uid) => {
      if (!currentUids.includes(uid)) {
        markersRef.current[uid].remove();
        delete markersRef.current[uid];
      }
    });

  }, [groupMembers]);

  // listen firebase realtime
  useEffect(() => {
    if (!allowedUids.length) return;

    const locationsRef = ref(db, "live_locations");

    const unsubscribe = onValue(locationsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      const members = Object.values(data)
        .filter((loc: any) => allowedUids.includes(loc.firebaseUid));

      console.log("Group Members Locations:", members);

      setGroupMembers(members);
    });

    return () => {
      unsubscribe(); // 🔥 QUAN TRỌNG
    };

  }, [allowedUids]);

  // lấy member uid
  useEffect(() => {
    if (!authUser) return;

    const fetchMembers = async () => {
      const token = await authUser.getIdToken();

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/groups/97e5e779-79ba-4ea4-a75a-001b3b677859/members/uids`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();

      console.log("Allowed UIDs:", data);

      setAllowedUids(data);
    };

    fetchMembers();
  }, [authUser]);

  // lắng nghe login
  useEffect(() => {
    const auth = getAuth();

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        setAuthUser(null);
      }
    });

    return unsub;
  }, []);

  // gửi vị trí lên firebase
  useEffect(() => {
    if (!authUser) return;

    const locationRef = ref(db, `live_locations/${authUser.uid}`);

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const loc = {
          firebaseUid: authUser.uid,
          name: authUser.displayName || "Anonymous",
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          updatedAt: Date.now(),
        };

        // gửi lên firebase
        set(locationRef, loc);

        console.log("📡 Location sent:", loc);
      },
      (error) => {
        console.log("Geolocation error:", error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
      }
    );

    // tự xoá khi user offline
    onDisconnect(locationRef).remove();

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [authUser]);

  useEffect(() => {
    if (!GOONG_KEY) return;

    goongjs.accessToken = GOONG_KEY;

    mapRef.current = new goongjs.Map({
      container: mapContainer.current,
      style:
        "https://tiles.goong.io/assets/goong_map_web.json?api_key=" +
        GOONG_KEY,
      center: FALLBACK_CENTER,
      zoom: 13,
    });

    // Lấy vị trí hiện tại
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { longitude, latitude } = position.coords;

          mapRef.current.flyTo({
            center: [longitude, latitude],
            zoom: 15,
          });
        },
        (error) => {
          console.log("Geolocation error:", error);
        }
      );
    }

    return () => mapRef.current?.remove();
  }, [GOONG_KEY]);

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 overflow-hidden h-screen flex flex-col">

      {/* HEADER */}
      <header className="flex h-16 items-center justify-between border-b border-primary/10 bg-white dark:bg-background-dark/50 px-6 shrink-0 z-20">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
              <span className="material-symbols-outlined text-2xl">
                explore
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">
              WeGo
            </h2>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <a className="flex items-center gap-2 text-primary font-semibold border-b-2 border-primary px-1 py-4">
              <span className="material-symbols-outlined text-[20px]">
                map
              </span>
              Map
            </a>
            <a className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors px-1 py-4">
              <span className="material-symbols-outlined text-[20px]">
                calendar_today
              </span>
              Schedule
            </a>
            <Link
              to="/groups"
              className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors px-1 py-4"
            >
              <span className="material-symbols-outlined text-[20px]">
                group
              </span>
              Groups
            </Link>
            <Link
              to="/invitations"
              className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors px-1 py-4"
            >
              <span className="material-symbols-outlined text-[20px]">
                group
              </span>
              Invite
            </Link>
            <a className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors px-1 py-4">
              <span className="material-symbols-outlined text-[20px]">
                settings
              </span>
              Settings
            </a>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              search
            </span>
            <input
              className="h-10 w-64 rounded-full bg-primary/5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
              placeholder="Find a destination..."
            />
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex flex-1 overflow-hidden h-full">

        {/* MAP SECTION */}
        <section className="relative flex-1 h-full">

          {/* Goong Map */}
          <div
            ref={mapContainer}
            className="absolute inset-0 h-full"
          />

          {/* Overlay Buttons */}
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-10">
            <div className="flex justify-between items-start pointer-events-auto">
              <div className="bg-white/90 backdrop-blur-md p-2 rounded-xl shadow-xl border border-primary/10 flex gap-2">
                <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">
                    local_cafe
                  </span>
                  Coffee
                </button>

                <button className="px-4 py-2 hover:bg-primary/10 rounded-lg text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">
                    restaurant
                  </span>
                  Restaurants
                </button>

                <button className="px-4 py-2 hover:bg-primary/10 rounded-lg text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">
                    hotel
                  </span>
                  Hotels
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* AI CHAT SIDEBAR */}
        <aside className="w-[420px] bg-white dark:bg-background-dark border-l border-primary/10 flex flex-col shrink-0 z-30 shadow-2xl">

          {/* Sidebar Header */}
          <div className="p-6 border-b border-primary/10 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-base">
                smart_toy
              </span>
            </div>
            <div>
              <h3 className="font-bold text-lg">Map Assistant</h3>
              <p className="text-slate-500 text-sm">
                Powered by WeGo · Always here to help
              </p>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {chatMessages.map((msg, index) => (
              <div
                key={index}
                className={`p-4 rounded-2xl text-sm ${msg.role === "user"
                  ? "bg-primary text-white self-end"
                  : "bg-primary/5"
                  }`}
              >
                {msg.content}

                {Array.isArray(msg.places) &&
                  msg.places.map((p) => (
                    <div
                      key={p.placeId}
                      className="bg-white rounded-2xl shadow-md overflow-hidden mt-3 border border-slate-200"
                    >
                      {/* Thumbnail */}
                      <img
                        src={`${p.thumbnail}=w600-h400`}
                        alt={p.name}
                        className="w-full h-40 object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "https://placehold.co/600x400?text=No+Image";
                        }}
                      />

                      {/* Content */}
                      <div className="p-4">
                        <h4 className="font-semibold text-base">{p.name}</h4>

                        {/* Rating */}
                        <div className="flex items-center gap-1 text-sm text-slate-600 mt-1">
                          <span className="material-symbols-outlined text-amber-500 text-[18px]">
                            star
                          </span>
                          {p.rating}
                        </div>

                        {/* Travel time */}
                        <div className="text-sm text-slate-500 mt-1">
                          {Math.round(p.travelTime / 60)} min away
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-6 border-t border-primary/10">
            <div className="flex items-center gap-3 bg-primary/5 p-2 rounded-2xl">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendMessage();
                }}
                className="flex-1 bg-transparent outline-none text-sm"
                placeholder="Ask about places, directions..."
              />

              <button
                onClick={handleSendMessage}
                className="w-10 h-10 bg-primary text-white rounded-xl"
              >
                ➤
              </button>
            </div>
          </div>

        </aside>
      </main>
    </div>
  );
}