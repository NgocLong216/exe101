import { useEffect, useState, useRef } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { GoogleMap, LoadScript, Marker, Polyline, Autocomplete } from "@react-google-maps/api";
import { ref, set, onValue, onDisconnect } from "firebase/database";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";

const USER_NAME = "Long";
const FALLBACK_CENTER = { lat: 10.762622, lng: 106.660172 }; // HCM

export default function HomePage() {
  const [authUser, setAuthUser] = useState(null);

  const [myLocation, setMyLocation] = useState(null);
  const [friends, setFriends] = useState([]);
  const [destination, setDestination] = useState(null);
  const [routes, setRoutes] = useState({});
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [autoComplete, setAutoComplete] = useState(null);
  const [creating, setCreating] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();
  const [currentGroupId, setCurrentGroupId] = useState(null);
  const [allowedUids, setAllowedUids] = useState([]);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [suggestCenter, setSuggestCenter] = useState(null);
  const [suggestedPlaces, setSuggestedPlaces] = useState([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const onPlaceChanged = () => {
    if (!autoComplete) return;

    const place = autoComplete.getPlace();


    // 👉 dùng text người dùng nhập làm keyword
    setSearchKeyword(place.name);

    // 👉 gọi backend suggest
    suggestPlace(place.name);
  };
  const suggestPlace = async (keyword) => {
    if (!currentGroupId || !keyword) return;

    setLoadingSuggest(true);
    setRoutes({});
    setNearbyPlaces([]);
    setDestination(null);

    try {
      const token = await getAuth().currentUser.getIdToken();

      const res = await fetch(
        `${API_URL}/api/groups/${currentGroupId}/suggest-place?keyword=${encodeURIComponent(
          keyword
        )}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();

      setSuggestCenter(data.centerPoint);
      setSuggestedPlaces(data.places);
    } catch (e) {
      console.error("Suggest place error:", e);
      alert("Không thể gợi ý địa điểm");
    } finally {
      setLoadingSuggest(false);
    }
  };
  const selectSuggestedPlace = (p) => {
    const dest = { lat: p.lat, lng: p.lng };
    setDestination(dest);
    setRoutes({});

    fetchRoute("you", myLocation, dest);
    friends.forEach((f) =>
      fetchRoute(f.uid, { lat: f.lat, lng: f.lng }, dest)
    );
  };



  const lastRouteTime = useRef({});

  useEffect(() => {
    const fetchMyGroups = async () => {
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) return;

      const res = await fetch(`${API_URL}/api/groups/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const groups = await res.json();
      if (groups.length > 0) {
        setCurrentGroupId(groups[0].id); // TEST: auto chọn group đầu
      }
    };

    fetchMyGroups();
  }, []);


  useEffect(() => {
    if (!currentGroupId) return;

    const fetchGroupMembers = async () => {
      const token = await getAuth().currentUser.getIdToken();
      const res = await fetch(
        `${API_URL}/api/groups/${currentGroupId}/members/uids`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      setAllowedUids(data);
    };

    fetchGroupMembers();
  }, [currentGroupId]);



  /* =========================
      AUTH
  ========================= */
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser({
          uid: user.uid,
          name: user.displayName || "Anonymous",
          email: user.email,
          avatar: user.photoURL,
        });
      } else {
        setAuthUser(null);
      }
    });
    return unsub;
  }, []);


  /* =========================
      SEND MY GPS
  ========================= */
  useEffect(() => {
    if (!authUser) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = {
          firebaseUid: authUser.uid,
          name: authUser.name,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          updatedAt: Date.now(),
        };

        setMyLocation({ lat: loc.lat, lng: loc.lng });
        set(ref(db, `live_locations/${authUser.uid}`), loc);
      },
      console.error,
      { enableHighAccuracy: true, maximumAge: 3000 }
    );

    onDisconnect(ref(db, `live_locations/${authUser.uid}`)).remove();
    return () => navigator.geolocation.clearWatch(watchId);
  }, [authUser]);


  /* =========================
      LISTEN FRIENDS GPS
  ========================= */
  useEffect(() => {
    if (!authUser) return;

    const locationsRef = ref(db, "live_locations");
    return onValue(locationsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      const users = Object.entries(data)
        .filter(([uid]) =>
          uid !== authUser.uid && allowedUids.includes(uid)
        )
        .map(([uid, u]) => ({
          uid,
          name: u.name,
          lat: u.lat,
          lng: u.lng,
        }));

      setFriends(users);
    });
  }, [authUser, allowedUids]);



  /* =========================
      DIRECTIONS
  ========================= */
  const createGroup = async () => {
    const token = await getAuth().currentUser?.getIdToken();
    if (!token) {
      alert("Chưa đăng nhập");
      return;
    }

    setCreating(true);

    try {
      const res = await fetch(`${API_URL}/api/groups`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: "Đi cafe cuối tuần",
          description: "Tạo nhanh từ bản đồ",
          meetingTime: null,
          lat: null,
          lng: null,
          placeId: null,
          memberIds: [],
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      alert("Tạo group thành công 🎉");

      //  chuyển sang trang chi tiết group
      // navigate(`/groups/${data.id}`);

    } catch (err) {
      console.error(err);
      alert("Tạo group thất bại");
    } finally {
      setCreating(false);
    }
  };


  const fetchRoute = (id, origin, destination) => {
    const now = Date.now();
    if (lastRouteTime.current[id] && now - lastRouteTime.current[id] < 15000)
      return;

    lastRouteTime.current[id] = now;

    const service = new window.google.maps.DirectionsService();
    service.route(
      {
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK") {
          const path = result.routes[0].overview_path.map((p) => ({
            lat: p.lat(),
            lng: p.lng(),
          }));
          setRoutes((prev) => ({ ...prev, [id]: path }));
        }
      }
    );
  };



  useEffect(() => {
    if (!myLocation || !destination) return;

    fetchRoute("you", myLocation, destination);
    friends.forEach((f) =>
  fetchRoute(f.uid, { lat: f.lat, lng: f.lng }, [destination, friends, myLocation])
);


  }, [destination]);

  /* =========================
      NEARBY SEARCH (FRONTEND TEST)
  ========================= */
  const searchNearby = (location, type = "restaurant") => {
    if (!window.google || !location) return;

    const service = new window.google.maps.places.PlacesService(
      document.createElement("div")
    );

    service.nearbySearch(
      {
        location,
        radius: 1500,
        type,
      },
      (results, status) => {
        console.log("Nearby status:", status);
        console.log("Nearby results:", results);

        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          setNearbyPlaces(
            results.map((p) => ({
              id: p.place_id,
              name: p.name,
              lat: p.geometry.location.lat(),
              lng: p.geometry.location.lng(),
            }))
          );
        }
      }
    );
  };

  /* =========================
      CLICK MAP
  ========================= */
  const handleMapClick = (e) => {
    const dest = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng(),
    };

    setDestination(dest);
    setRoutes({});
    setNearbyPlaces([]);
    searchNearby(dest, "restaurant");
  };

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
  
      // gọi backend revoke nếu có
      if (token) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
  
      // logout firebase
      await signOut(auth);
  
      // xoá token backend nếu bạn có lưu
      localStorage.removeItem("token");
  
      navigate("/");
  
    } catch (err) {
      console.error("Logout error:", err);
      alert("Logout thất bại");
    }
  };

  return (
    <LoadScript
      googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAP_KEY}
      libraries={["places"]}
    >
      {/* TEST BUTTON */}

      <button
        style={{
          position: "absolute",
          zIndex: 10,
          top: 10,
          left: 10,
          padding: "8px 12px",
          background: "#2e7d32",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
        onClick={() => navigate("/groups")}
      >
        👥 Group của tôi
      </button>

      <button
        style={{
          position: "absolute",
          zIndex: 10,
          top: 110,
          left: 10,
          padding: "8px 12px",
          background: "#f57c00",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
        onClick={() => navigate("/invitations")}
      >
        📩 Lời mời group
      </button>


      <button
        style={{
          position: "absolute",
          zIndex: 10,
          top: 60,
          left: 10,
          padding: "8px 12px",
          background: "#1976d2",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
        disabled={creating}
        onClick={createGroup}
      >
        {creating ? "Đang tạo..." : "➕ Tạo group"}
      </button>

      <button
  style={{
    position: "absolute",
    zIndex: 10,
    top: 210,
    left: 10,
    padding: "8px 12px",
    background: "#6a1b9a",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  }}
  onClick={() => navigate("/profile")}
>
  👤 Xem Profile
</button>

      <button
  style={{
    position: "absolute",
    zIndex: 10,
    top: 160,
    left: 10,
    padding: "8px 12px",
    background: "#d32f2f",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  }}
  onClick={handleLogout}
>
  🚪 Logout
</button>

      <Autocomplete
        onLoad={(ac) => setAutoComplete(ac)}
        onPlaceChanged={onPlaceChanged}
      >
        <input
          type="text"
          placeholder="Tìm địa điểm..."
          value={searchKeyword}
         onChange={(e) => setSearchKeyword(e.target.value)}
          style={{
            position: "absolute",
            top: 10,
            left: "50%",
            transform: "translateX(-50%)",
            width: "320px",
            height: "40px",
            padding: "0 12px",
            zIndex: 10,
            borderRadius: "6px",
            border: "1px solid #ccc",
            outline: "none",
          }}
        />
      </Autocomplete>

      <button
          style={{
            position: "absolute",
            top: 60,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
            padding: "6px 10px",
          }}
          onClick={() => suggestPlace(searchKeyword)}
        >
          🔍 Tìm địa điểm
        </button>


      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "500px" }}
        center={myLocation || FALLBACK_CENTER}
        zoom={13}
        onClick={handleMapClick}
      >
        {/* DESTINATION */}
        {destination && (
          <Marker
            position={destination}
            label="Điểm hẹn"
            icon="http://maps.google.com/mapfiles/ms/icons/red-dot.png"
          />
        )}

        {/* NEARBY PLACES */}
        {nearbyPlaces.map((p) => (
          <Marker
            key={p.id}
            position={{ lat: p.lat, lng: p.lng }}
            label={p.name}
            icon="http://maps.google.com/mapfiles/ms/icons/orange-dot.png"
          />
        ))}
        {suggestCenter && (
          <Marker
            position={suggestCenter}
            label="📍 Điểm hẹn tối ưu"
            icon="http://maps.google.com/mapfiles/ms/icons/red-dot.png"
          />
        )}
        {suggestedPlaces.map((p) => (
          <Marker
            key={p.placeId}
            position={{ lat: p.lat, lng: p.lng }}
            label={p.name}
            icon="http://maps.google.com/mapfiles/ms/icons/orange-dot.png"
            onClick={() => selectSuggestedPlace(p)}
          />
        ))}
        


        {/* YOU */}
        {myLocation && (
          <Marker
            position={myLocation}
            label="YOU"
            icon="http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
          />
        )}

        {/* YOU ROUTE */}
        {routes.you && (
          <Polyline
            path={routes.you}
            options={{ strokeColor: "#0000FF", strokeWeight: 4 }}
          />
        )}

        {/* FRIENDS */}
        {friends.map((f) => (
          <div key={f.uid}>
            <Marker
              position={{ lat: f.lat, lng: f.lng }}
              label={f.name}
              icon="http://maps.google.com/mapfiles/ms/icons/green-dot.png"
            />
            {routes[f.uid] && (
  <Polyline
    path={routes[f.uid]}
    options={{ strokeColor: "#00AA00", strokeWeight: 4 }}
  />
)}

          </div>
        ))}
      </GoogleMap>
    </LoadScript>
  );
}
