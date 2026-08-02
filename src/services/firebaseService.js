/**
 * Firebase Cloud Storage & Firestore Service for Paramara Studio
 * Google Cloud Infrastructure for long-term screenshot & session persistence.
 */

import { initializeApp, getApps } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDtYbvbojs91MbCDHIevK3EdErOLFIYL2o",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "paramarastudio-8e01a.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "paramarastudio-8e01a",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "paramarastudio-8e01a.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "817496763137",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:817496763137:web:53e84627a55951e75d0900",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-8X6G4MSMCB"
};

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const storage = getStorage(app);
export const db = getFirestore(app);

/**
 * Upload screenshot file to Firebase Cloud Storage ('shopee-screenshots')
 */
export async function uploadScreenshotToFirebase(file) {
  if (!storage) return null;

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `shopee_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const storageRef = ref(storage, `shopee-screenshots/${fileName}`);

    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (err) {
    console.warn("Firebase Storage Upload Exception:", err.message);
    return null;
  }
}

/**
 * Save Shopee Live session record into Firestore collection 'shopee_sessions'
 */
export async function saveSessionToFirebase(sessionRecord) {
  if (!db) return null;

  try {
    const docRef = await addDoc(collection(db, 'shopee_sessions'), {
      ...sessionRecord,
      createdAt: new Date().toISOString()
    });

    return { id: docRef.id, ...sessionRecord };
  } catch (err) {
    console.warn("Firestore Insert Exception:", err.message);
    return null;
  }
}

/**
 * Fetch all sessions from Firestore collection 'shopee_sessions'
 */
export async function fetchSessionsFromFirebase() {
  if (!db) return null;

  try {
    const q = query(collection(db, 'shopee_sessions'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const list = [];
    querySnapshot.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() });
    });
    return list;
  } catch (err) {
    console.warn("Firestore Fetch Exception:", err.message);
    return null;
  }
}
