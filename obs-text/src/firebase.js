import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, off } from 'firebase/database';

// Firebase設定（プレースホルダー）
// 実際の使用時にこれらの値を置き換えてください
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
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
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error('Firebase save error:', error);
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
  
  onValue(sessionRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  }, (error) => {
    console.error('Firebase subscribe error:', error);
  });
  
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
