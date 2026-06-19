import { initializeApp } from 'firebase/app';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth';
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: 'AIzaSyCY95z91jd_OLCc9K-2wdRr2mHxqlunxZ8',
  authDomain: 'crested-drive-483712-e5.firebaseapp.com',
  databaseURL: "https://crested-drive-483712-e5-default-rtdb.firebaseio.com",
  projectId: 'crested-drive-483712-e5',
  storageBucket: 'crested-drive-483712-e5.firebasestorage.app',
  messagingSenderId: '604419916756',
  appId: '1:604419916756:web:e2fa42c0743e206da70c41',
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(
    AsyncStorage
  ),
});

export const db = getDatabase(app);