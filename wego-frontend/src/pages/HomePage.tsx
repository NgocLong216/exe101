import { useEffect, useState, useRef } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
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



  const lastRouteTime = useRef({});

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
        .filter(([uid]) => uid !== authUser.uid)
        .map(([uid, u]) => ({
          uid,
          name: u.name,
          lat: u.lat,
          lng: u.lng,
        }));

      setFriends(users);
    });
  }, [authUser]);


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

  const onPlaceChanged = () => {
    if (!autoComplete) return;

    const place = autoComplete.getPlace();
    if (!place.geometry) return;

    const loc = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    };

    setDestination(loc);
    setRoutes({});
    setNearbyPlaces([]);
    searchNearby(loc, "restaurant");
  };


  useEffect(() => {
    if (!myLocation || !destination) return;

    fetchRoute("you", myLocation, destination);
    friends.forEach((f) =>
      fetchRoute(f.id, { lat: f.lat, lng: f.lng }, destination)
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
        {creating ? "Đang tạo..." : "Tạo group"}
      </button>

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



      <Autocomplete
        onLoad={(ac) => setAutoComplete(ac)}
        onPlaceChanged={onPlaceChanged}
      >
        <input
          type="text"
          placeholder="Tìm địa điểm..."
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
          <div key={f.id}>
            <Marker
              position={{ lat: f.lat, lng: f.lng }}
              label={f.name}
              icon="http://maps.google.com/mapfiles/ms/icons/green-dot.png"
            />
            {routes[f.id] && (
              <Polyline
                path={routes[f.id]}
                options={{ strokeColor: "#00AA00", strokeWeight: 4 }}
              />
            )}
          </div>
        ))}
      </GoogleMap>
    </LoadScript>
  );
}
