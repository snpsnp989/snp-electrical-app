import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, enableNetwork, disableNetwork } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyByVwAKGXswQxn4HKAq4elJ6yYS5gQ11qo",
  authDomain: "snpelect.firebaseapp.com",
  projectId: "snpelect",
  storageBucket: "snpelect.firebasestorage.app",
  messagingSenderId: "958236025535",
  appId: "1:958236025535:web:4b67480da78253ad475c0a"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Force long polling to avoid CORS issues with WebSockets
if (typeof window !== 'undefined') {
  // Only apply in browser environment
  try {
    // This helps with CORS issues by using HTTP instead of WebSockets
    (db as any).settings({ 
      experimentalForceLongPolling: true,
      ignoreUndefinedProperties: true
    });
    
    // Enable network and handle connection issues
    enableNetwork(db).catch((error) => {
      console.log('Network enable failed, trying to reconnect:', error);
      // Try to disable and re-enable network
      disableNetwork(db).then(() => {
        return enableNetwork(db);
      }).catch((retryError) => {
        console.log('Network retry failed:', retryError);
      });
    });
  } catch (error) {
    console.log('Long polling setting not available in this Firebase version');
  }
}

export const storage = getStorage(app);
export default app;
