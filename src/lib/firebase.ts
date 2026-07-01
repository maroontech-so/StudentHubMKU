import { initializeApp, getApp, getApps } from "firebase/app";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  User
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  FieldValue,
  serverTimestamp,
  increment,
  runTransaction,
  Timestamp
} from "firebase/firestore";
import { 
  getDatabase, 
  ref, 
  set, 
  push, 
  onValue, 
  get, 
  runTransaction as runRtdbTransaction,
  limitToLast,
  query as rtdbQuery,
  orderByChild,
  remove,
  serverTimestamp as rtdbServerTimestamp
} from "firebase/database";

// Configuration with hardcoded parameters provided by the user
const firebaseConfig = {
  apiKey: "AIzaSyBCtXweVFWpfQ1EhykSRcdqAhojpqBeJe4",
  authDomain: "studenthub-78991.firebaseapp.com",
  databaseURL: "https://studenthub-78991-default-rtdb.firebaseio.com",
  projectId: "studenthub-78991",
  storageBucket: "studenthub-78991.firebasestorage.app",
  messagingSenderId: "1029155836193",
  appId: "1:1029155836193:web:35d6337469e5cce58eee60",
  measurementId: "G-6HRWKWYFQD"
};

// Initialize App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore (using default Firestore database for the custom project)
export const db = getFirestore(app);

// Initialize Authentication
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(err => {
  console.error("Auth persistence setup failed", err);
});

// Initialize Realtime Database
export const rtdb = getDatabase(app, firebaseConfig.databaseURL);

// Re-exports
export { Timestamp, serverTimestamp, increment, runTransaction, FieldValue };
export { ref, set, push, onValue, get, runRtdbTransaction, remove };

// Core Database Methods wrapped for the React SPA
// Core Database Methods wrapped for the React SPA with a seamless LocalStorage hybrid fallback
const getLocalCollection = (colName: string): any[] => {
  try {
    const data = localStorage.getItem(`local_fbfs_${colName}`);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

const setLocalCollection = (colName: string, items: any[]) => {
  try {
    localStorage.setItem(`local_fbfs_${colName}`, JSON.stringify(items));
  } catch (e) {
    console.error("Local storage sync error", e);
  }
};

export const fbfs = {
  // Collection listeners & queries
  async getCollection<T>(collectionName: string, filters: any[][] = [], orderField?: string, orderDir: "asc" | "desc" = "asc", limitCount?: number): Promise<T[]> {
    try {
      let q = query(collection(db, collectionName));
      for (const f of filters) {
        q = query(q, where(f[0], f[1], f[2]));
      }
      if (orderField) {
        q = query(q, orderBy(orderField, orderDir));
      }
      if (limitCount) {
        q = query(q, limit(limitCount));
      }
      const snap = await getDocs(q);
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as T));
      
      // Seed our localStorage backup with cloud images to stay synchronized
      if (items.length > 0) {
        setLocalCollection(collectionName, items);
      }
      return items;
    } catch (err: any) {
      console.warn(`Firestore targeted getCollection for "${collectionName}" errored (often due to missing index). Attempting raw online fallback with client-side filtering:`, err);
      
      try {
        // Fall back to fetching the raw online collection, then filtering/sorting client-side to bypass index requirement
        const rawSnap = await getDocs(collection(db, collectionName));
        let onlineItems = rawSnap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as T));
        
        if (onlineItems.length > 0) {
          setLocalCollection(collectionName, onlineItems);
        }
        
        // Apply filters client-side
        for (const f of filters) {
          const [field, op, val] = f;
          onlineItems = onlineItems.filter((item: any) => {
            if (!item) return false;
            const itemVal = item[field];
            if (op === "==") return itemVal === val;
            if (op === "!=") return itemVal !== val;
            if (op === ">") return itemVal > val;
            if (op === "<") return itemVal < val;
            return true;
          });
        }
        
        // Apply sorting client-side
        if (orderField) {
          onlineItems.sort((a: any, b: any) => {
            let valA = a ? a[orderField] : undefined;
            let valB = b ? b[orderField] : undefined;
            
            if (valA && typeof valA === "object" && valA.seconds !== undefined) {
              valA = valA.seconds * 1000;
            } else if (valA instanceof Date) {
              valA = valA.getTime();
            } else if (typeof valA === "string" && !isNaN(Date.parse(valA))) {
              valA = Date.parse(valA);
            }
            
            if (valB && typeof valB === "object" && valB.seconds !== undefined) {
              valB = valB.seconds * 1000;
            } else if (valB instanceof Date) {
              valB = valB.getTime();
            } else if (typeof valB === "string" && !isNaN(Date.parse(valB))) {
              valB = Date.parse(valB);
            }

            if (valA === valB) return 0;
            if (valA === undefined) return 1;
            if (valB === undefined) return -1;
            if (valA < valB) return orderDir === "asc" ? -1 : 1;
            return orderDir === "asc" ? 1 : -1;
          });
        }

        if (limitCount) {
          onlineItems = onlineItems.slice(0, limitCount);
        }

        return onlineItems;
      } catch (fallbackErr: any) {
        console.warn(`Firestore raw online backup for "${collectionName}" also failed (network/auth). Resorting to local storage hybrid backup:`, fallbackErr);
        let localItems = getLocalCollection(collectionName) as T[];
        
        // Apply filters client-side
        for (const f of filters) {
          const [field, op, val] = f;
          localItems = localItems.filter((item: any) => {
            if (!item) return false;
            const itemVal = item[field];
            if (op === "==") return itemVal === val;
            if (op === "!=") return itemVal !== val;
            if (op === ">") return itemVal > val;
            if (op === "<") return itemVal < val;
            return true;
          });
        }
        
        // Apply sorting client-side
        if (orderField) {
          localItems.sort((a: any, b: any) => {
            let valA = a ? a[orderField] : undefined;
            let valB = b ? b[orderField] : undefined;
            
            if (valA && typeof valA === "object" && valA.seconds !== undefined) {
              valA = valA.seconds * 1000;
            } else if (valA instanceof Date) {
              valA = valA.getTime();
            } else if (typeof valA === "string" && !isNaN(Date.parse(valA))) {
              valA = Date.parse(valA);
            }
            
            if (valB && typeof valB === "object" && valB.seconds !== undefined) {
              valB = valB.seconds * 1000;
            } else if (valB instanceof Date) {
              valB = valB.getTime();
            } else if (typeof valB === "string" && !isNaN(Date.parse(valB))) {
              valB = Date.parse(valB);
            }

            if (valA === valB) return 0;
            if (valA === undefined) return 1;
            if (valB === undefined) return -1;
            if (valA < valB) return orderDir === "asc" ? -1 : 1;
            return orderDir === "asc" ? 1 : -1;
          });
        }

        if (limitCount) {
          localItems = localItems.slice(0, limitCount);
        }

        return localItems;
      }
    }
  },

  listenCollection<T>(collectionName: string, filters: any[][], callback: (data: T[]) => void, orderField?: string, orderDir: "asc" | "desc" = "asc", limitCount?: number) {
    try {
      let q = query(collection(db, collectionName));
      for (const f of filters) {
        q = query(q, where(f[0], f[1], f[2]));
      }
      if (orderField) {
        q = query(q, orderBy(orderField, orderDir));
      }
      if (limitCount) {
        q = query(q, limit(limitCount));
      }
      
      let unsubscribeFallback: (() => void) | null = null;
      
      const unsubscribeMain = onSnapshot(q, (snap) => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as T));
        setLocalCollection(collectionName, items);
        callback(items);
      }, (error) => {
        console.warn(`Firestore targeted query listener for "${collectionName}" failed. Initiating online raw listener with client-side filtering fallback:`, error);
        
        try {
          const rawQuery = collection(db, collectionName);
          unsubscribeFallback = onSnapshot(rawQuery, (snap) => {
            let onlineItems = snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as T));
            
            if (onlineItems.length > 0) {
              setLocalCollection(collectionName, onlineItems);
            }
            
            // Client-side filtering
            for (const f of filters) {
              const [field, op, val] = f;
              onlineItems = onlineItems.filter((item: any) => {
                if (!item) return false;
                const itemVal = item[field];
                if (op === "==") return itemVal === val;
                if (op === "!=") return itemVal !== val;
                if (op === ">") return itemVal > val;
                if (op === "<") return itemVal < val;
                return true;
              });
            }
            
            // Client-side sorting
            if (orderField) {
              onlineItems.sort((a: any, b: any) => {
                let valA = a ? a[orderField] : undefined;
                let valB = b ? b[orderField] : undefined;
                
                if (valA && typeof valA === "object" && valA.seconds !== undefined) {
                  valA = valA.seconds * 1000;
                } else if (valA instanceof Date) {
                  valA = valA.getTime();
                } else if (typeof valA === "string" && !isNaN(Date.parse(valA))) {
                  valA = Date.parse(valA);
                }
                
                if (valB && typeof valB === "object" && valB.seconds !== undefined) {
                  valB = valB.seconds * 1000;
                } else if (valB instanceof Date) {
                  valB = valB.getTime();
                } else if (typeof valB === "string" && !isNaN(Date.parse(valB))) {
                  valB = Date.parse(valB);
                }

                if (valA === valB) return 0;
                if (valA === undefined) return 1;
                if (valB === undefined) return -1;
                if (valA < valB) return orderDir === "asc" ? -1 : 1;
                return orderDir === "asc" ? 1 : -1;
              });
            }
            
            if (limitCount) {
              onlineItems = onlineItems.slice(0, limitCount);
            }
            
            callback(onlineItems);
          }, (fallbackErr) => {
            console.warn(`Firestore raw online listener for "${collectionName}" also failed. Resorting to local cache listener:`, fallbackErr);
            callback(getLocalCollection(collectionName) as T[]);
          });
        } catch (innerErr) {
          callback(getLocalCollection(collectionName) as T[]);
        }
      });
      
      return () => {
        unsubscribeMain();
        if (unsubscribeFallback) {
          unsubscribeFallback();
        }
      };
    } catch (e) {
      callback(getLocalCollection(collectionName) as T[]);
      return () => { };
    }
  },

  // Document actions
  async getDocById<T>(collectionName: string, id: string): Promise<T | null> {
    try {
      const docRef = doc(db, collectionName, id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const item = { id: snap.id, ...snap.data() } as unknown as T;
        return item;
      }
      return null;
    } catch (err) {
      console.warn(`getDocById for ${collectionName}/${id} block. Loading from LocalStorage:`, err);
      const items = getLocalCollection(collectionName);
      const found = items.find(x => x.id === id);
      return found ? (found as T) : null;
    }
  },

  async setDocById(collectionName: string, id: string, data: any, merge: boolean = true) {
    // 1. Write to Local backup first to guarantee visual instant feedback
    const localItems = getLocalCollection(collectionName);
    const existingIdx = localItems.findIndex(x => x.id === id);
    const updatedModel = merge && existingIdx > -1 ? { ...localItems[existingIdx], ...data } : { id, ...data };
    
    if (existingIdx > -1) {
      localItems[existingIdx] = updatedModel;
    } else {
      localItems.push(updatedModel);
    }
    setLocalCollection(collectionName, localItems);

    // 2. Safely attempt Cloud Firestore sync
    try {
      const docRef = doc(db, collectionName, id);
      await setDoc(docRef, data, { merge });
    } catch (err) {
      console.warn(`Firestore setDocById ${collectionName}/${id} failed. Kept safe in Local Storage:`, err);
    }
  },

  async addDocInCollection(collectionName: string, data: any): Promise<string> {
    const freshId = `local_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
    const payload = { ...data, id: freshId };

    // 1. Write locally
    const localItems = getLocalCollection(collectionName);
    localItems.push(payload);
    setLocalCollection(collectionName, localItems);

    // 2. Cloud Sync
    try {
      const customRef = doc(collection(db, collectionName));
      await setDoc(customRef, { ...data, id: customRef.id });
      return customRef.id;
    } catch (err) {
      console.warn(`addDocInCollection in ${collectionName} failed. Visual state saved locally:`, err);
      return freshId;
    }
  },

  async updateDocById(collectionName: string, id: string, data: any) {
    // 1. Update locally
    const localItems = getLocalCollection(collectionName);
    const idx = localItems.findIndex(x => x.id === id);
    if (idx > -1) {
      localItems[idx] = { ...localItems[idx], ...data };
      setLocalCollection(collectionName, localItems);
    }

    // 2. Cloud Sync
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, data);
    } catch (err) {
      console.warn(`updateDocById in ${collectionName}/${id} offline bypass:`, err);
    }
  },

  async deleteDocById(collectionName: string, id: string) {
    // 1. Delete locally
    const localItems = getLocalCollection(collectionName);
    const filtered = localItems.filter(x => x.id !== id);
    setLocalCollection(collectionName, filtered);

    // 2. Cloud Sync
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn(`deleteDocById in ${collectionName}/${id} offline bypass:`, err);
    }
  }
};

// ImgBB Upload helper
const IMGBB_API_KEY = "24c0ab84b20619a5561351290a28c121";
export async function uploadToImgBB(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: "POST",
    body: formData
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || "Image upload failed");
  }
  return json.data.url;
}
