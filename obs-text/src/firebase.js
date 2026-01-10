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
 * セッションデータを保存
 * @param {string} sessionId - セッションID
 * @param {object} data - 保存データ { text, style }
 */
export async function saveSession(sessionId, data) {
  try {
    const sessionRef = ref(database, `sessions/${sessionId}`);
    await set(sessionRef, {
      ...data,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error("Firebase save error:", error);
    throw error;
  }
}

/**
 * セッションデータをリアルタイム監視
 * @param {string} sessionId - セッションID
 * @param {function} callback - データ変更時のコールバック
 * @returns {function} unsubscribe関数
 */
export function subscribeSession(sessionId, callback) {
  const sessionRef = ref(database, `sessions/${sessionId}`);

  onValue(
    sessionRef,
    (snapshot) => {
      const data = snapshot.val();
      callback(data);
    },
    (error) => {
      console.error("Firebase subscribe error:", error);
    },
  );

  return () => off(sessionRef);
}

/**
 * UUIDv4を生成（セッションID用）
 * @returns {string} UUID
 */
export function generateSessionId() {
  return crypto.randomUUID();
}

export { database };
