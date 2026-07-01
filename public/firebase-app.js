(function () {
    const APP_NAME = 'TheModernGavel';
    
    // Firebase config for studenthub-78991 project as fallback
    const firebaseConfig = {
        apiKey: "AIzaSyBCtXweVFWpfQ1EhykSRcdqAhojpqBeJe4",
        authDomain: "studenthub-78991.firebaseapp.com",
        databaseURL: "https://studenthub-78991-default-rtdb.firebaseio.com",
        projectId: "studenthub-78991",
        storageBucket: "studenthub-78991.firebasestorage.app",
        messagingSenderId: "1029155836193",
        appId: "1:1029155836193:web:35d6337469e5cce58eee60"
    };

    const IMGBB_API_KEY = "24c0ab84b20619a5561351290a28c121";

    let app, auth, db, rtdb;

    function logFirebaseError(context, error) {
        console.error(`[TheModernGavel Firebase] ${context}`, {
            code: error?.code || null,
            message: error?.message || String(error),
            error
        });
    }

    async function loadConfigAndInit() {
        try {
            const configRes = await fetch('/firebase-applet-config.json');
            if (configRes.ok) {
                const localConfig = await configRes.json();
                Object.assign(firebaseConfig, localConfig);
                console.log('[TheModernGavel Firebase] Loaded dynamic configuration', firebaseConfig);
            }
        } catch (e) {
            console.warn('[TheModernGavel Firebase] Dynamic config not found, using hardcoded defaults.', e);
        }

        try {
            if (typeof firebase !== 'undefined') {
                app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
                auth = firebase.auth();
                
                try {
                    db = firebaseConfig.firestoreDatabaseId 
                        ? firebase.app().firestore(firebaseConfig.firestoreDatabaseId)
                        : firebase.firestore();
                } catch (e) {
                    logFirebaseError('Firestore init error, fallback default', e);
                    db = firebase.firestore();
                }

                try {
                    rtdb = firebase.database();
                } catch (e) {
                    logFirebaseError('RTDB init error, mocked fallback', e);
                    rtdb = {
                        ref: () => ({
                            push: () => ({ set: async () => {}, key: 'mock-key' }),
                            set: async () => {},
                            on: () => () => {},
                            once: async () => ({ val: () => ({}) }),
                            orderByChild: () => rtdb.ref(),
                            limitToLast: () => rtdb.ref(),
                            transaction: async (fn) => {
                                try { fn(0); } catch (_) {}
                            }
                        })
                    };
                }
            }
        } catch (e) {
            logFirebaseError('Firebase main init error', e);
        }
    }

    // Run dynamic config fetch & initialization sequence immediately
    loadConfigAndInit();

    function initFirebase(firebaseInstance) {
        // Fallback or explicit instruction if called from outside
        try {
            app = app || firebaseInstance.apps.length && firebaseInstance.app() || firebaseInstance.initializeApp(firebaseConfig);
            auth = firebaseInstance.auth();
            db = firebaseConfig.firestoreDatabaseId 
                ? firebaseInstance.app().firestore(firebaseConfig.firestoreDatabaseId)
                : firebaseInstance.firestore();
            try {
                rtdb = firebaseInstance.database();
            } catch (rtdbErr) {
                // Keep the existing rtdb mock if RTDB doesn't load
            }
        } catch (e) {
            logFirebaseError('Explicit initFirebase error', e);
        }
    }

    window.TheModernGavel = {
        getApp() { return app; },
        getAuth() { return auth; },
        getDB() { return db; },
        getRTDB() { return rtdb; },
        getConfig() { return firebaseConfig; },
        getImgBBKey() { return IMGBB_API_KEY; },
        isReady() { return !!(auth && db && rtdb); }
    };
})();
