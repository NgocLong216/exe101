import {
    getDatabase,
    ref,
    set,
    onDisconnect,
    serverTimestamp,
  } from "firebase/database";
  import { getAuth } from "firebase/auth";
  
  export const setupPresence = async () => {
    const user = getAuth().currentUser;
  
    if (!user) return;
  
    const db = getDatabase();
  
    const userStatusRef = ref(
      db,
      `presence/${user.uid}`
    );
  
    await set(userStatusRef, {
      online: true,
      lastSeen: serverTimestamp(),
    });
  
    await onDisconnect(userStatusRef).set({
      online: false,
      lastSeen: serverTimestamp(),
    });
  };