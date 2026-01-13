import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, off } from "firebase/database";

// Firebase設定（Vite環境変数から取得）
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

/**
 * 設定データを保存（単一設定）
 * @param {object} data - 保存データ { text, style }
 */
export async function saveSettings(data) {
  try {
    const settingsRef = ref(database, "settings");
    await set(settingsRef, {
      ...data,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error("Firebase save error:", error);
    throw error;
  }
}

/**
 * 設定データをリアルタイム監視（単一設定）
 * @param {function} callback - データ変更時のコールバック
 * @returns {function} unsubscribe関数
 */
export function subscribeSettings(callback) {
  const settingsRef = ref(database, "settings");

  onValue(
    settingsRef,
    (snapshot) => {
      const data = snapshot.val();
      callback(data);
    },
    (error) => {
      console.error("Firebase subscribe error:", error);
    },
  );

  return () => off(settingsRef);
}

export { database };
