import { auth, db } from "./firebase";

import {
  onDisconnect,
  ref,
  set,
} from "firebase/database";

export const setupPresence = async () => {

  const user = auth.currentUser;

  if (!user) return;

  const userStatusRef = ref(
    db,
    `presence/${user.uid}`
  );

  await onDisconnect(userStatusRef).set({
    online: false,
    lastSeen: Date.now(),
  });

  await set(userStatusRef, {
    online: true,
    lastSeen: Date.now(),
  });
};