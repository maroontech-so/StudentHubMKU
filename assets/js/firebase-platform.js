(function () {
    'use strict';

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
    const imgbbKey = "24c0ab84b20619a5561351290a28c121";
    const sdkUrls = [
        "https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js",
        "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js",
        "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js",
        "https://www.gstatic.com/firebasejs/10.12.5/firebase-database-compat.js"
    ];

    let app;
    let auth;
    let db;
    let rtdb;
    let currentUser = null;
    let currentProfile = null;

    function getFriendlyErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
        const messages = {
            'auth/email-already-in-use': 'That email is already registered. Please sign in instead.',
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/invalid-credential': 'The email or password is incorrect.',
            'auth/user-not-found': 'No account exists for that email yet.',
            'auth/wrong-password': 'The email or password is incorrect.',
            'auth/weak-password': 'Use a stronger password with at least 6 characters.',
            'auth/popup-closed-by-user': 'The sign-in window was closed before finishing.',
            'auth/network-request-failed': 'Network error. Please check your connection and try again.',
            permission_denied: 'You do not have permission to do that.',
            'permission-denied': 'You do not have permission to do that.',
            unauthenticated: 'Please sign in and try again.',
            unavailable: 'The service is temporarily unavailable. Please try again shortly.',
            'deadline-exceeded': 'The request took too long. Please check your connection and try again.',
            'failed-precondition': 'This action needs an index or setup change before it can complete.',
            'storage/unauthorized': 'You do not have permission to upload this file.'
        };
        return messages[error?.code] || messages[error?.message] || error?.userMessage || error?.message || fallback;
    }

    function logError(context, error, details = {}) {
        console.error(`[TMG Platform] ${context}`, {
            code: error?.code || null,
            message: error?.message || String(error),
            details,
            error
        });
    }

    function logInfo(context, details = {}) {
        console.info(`[TMG Platform] ${context}`, details);
    }

    function showUserError(message, target = null) {
        const friendlyMessage = message || 'Something went wrong. Please try again.';
        if (target) {
            let errorBox = target.querySelector?.('[data-form-error]');
            if (!errorBox && target.appendChild) {
                errorBox = document.createElement('p');
                errorBox.dataset.formError = '';
                errorBox.className = 'rounded-xl border border-gavel-danger/20 bg-gavel-danger/10 px-4 py-3 text-sm text-gavel-danger';
                target.appendChild(errorBox);
            }
            if (errorBox) {
                errorBox.textContent = friendlyMessage;
                return;
            }
        }
        alert(friendlyMessage);
    }

    function wrapAsync(context, fn, target = null) {
        return async function (...args) {
            try {
                return await fn.apply(this, args);
            } catch (error) {
                logError(`${context} failed`, error);
                showUserError(getFriendlyErrorMessage(error), target);
                throw error;
            }
        };
    }

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if ([...document.scripts].some(script => script.src === src)) return resolve();
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                logInfo('Firebase SDK loaded', { src });
                resolve();
            };
            script.onerror = () => reject(new Error(`Could not load ${src}`));
            document.head.appendChild(script);
        });
    }

    async function ready() {
        try {
            logInfo('Firebase initialization started');
            
            // Try fetching the local configuration
            try {
                const configRes = await fetch('/firebase-applet-config.json');
                if (configRes.ok) {
                    const localConfig = await configRes.json();
                    Object.assign(firebaseConfig, localConfig);
                    logInfo('Loaded local Firebase configuration dynamically', firebaseConfig);
                }
            } catch (e) {
                logInfo('No dynamic config found or fetched, using default config', e);
            }

            if (window.firebase?.apps?.length) {
                app = window.firebase.app();
            } else {
                for (const url of sdkUrls) await loadScript(url);
                app = window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(firebaseConfig);
            }
            auth = window.firebase.auth();
            await auth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL);
            
            try {
                db = firebaseConfig.firestoreDatabaseId 
                    ? window.firebase.app().firestore(firebaseConfig.firestoreDatabaseId)
                    : window.firebase.firestore();
            } catch (e) {
                logError('Firestore initialization with custom databaseId failed, falling back to default db', e);
                db = window.firebase.firestore();
            }

            try {
                rtdb = window.firebase.database();
            } catch (e) {
                logError('Realtime Database initialization failed, using mocked RTDB', e);
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
            
            logInfo('Firebase initialization completed');
            return { app, auth, db, rtdb };
        } catch (error) {
            logError('Firebase initialization failed', error);
            throw error;
        }
    }

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>"']/g, char => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[char]));
    }

    function toDate(value) {
        if (!value) return null;
        if (typeof value.toDate === 'function') return value.toDate();
        return new Date(value);
    }

    function formatDate(value) {
        const date = toDate(value);
        if (!date || Number.isNaN(date.getTime())) return 'Date TBA';
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function formatTime(value) {
        const date = toDate(value);
        if (!date || Number.isNaN(date.getTime())) return 'Time TBA';
        return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    }

    async function getUserProfile(uid) {
        const doc = await db.collection('users').doc(uid).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    }

    async function ensureUserDoc(user, defaults = {}) {
        const ref = db.collection('users').doc(user.uid);
        const doc = await ref.get();
        const base = {
            uid: user.uid,
            name: user.displayName || defaults.name || '',
            email: user.email || defaults.email || '',
            avatar: user.photoURL || '',
            course: defaults.course || '',
            year: defaults.year || '',
            createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
            lastActive: window.firebase.firestore.FieldValue.serverTimestamp(),
            role: 'student',
            active: true
        };
        if (!doc.exists) await ref.set(base);
        else await ref.set({
            email: user.email || doc.data().email || '',
            lastActive: window.firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        return getUserProfile(user.uid);
    }

    async function uploadToImgBB(file) {
        const formData = new FormData();
        formData.append('image', file);
        try {
            logInfo('Image upload started', { fileName: file?.name, size: file?.size });
            const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, { method: 'POST', body: formData });
            let json = {};
            try {
                json = await res.json();
            } catch (parseError) {
                throw new Error('The image service returned an unreadable response.');
            }
            if (!res.ok || !json.success) throw new Error(json.error?.message || 'Image upload failed');
            logInfo('Image upload completed', { fileName: file?.name });
            return json.data.url;
        } catch (error) {
            logError('Image upload failed', error, { fileName: file?.name });
            throw error;
        }
    }

    function listenCollection(name, callback, options = {}) {
        let query = db.collection(name);
        (options.where || []).forEach(args => { query = query.where(...args); });
        if (options.orderBy) query = query.orderBy(...options.orderBy);
        if (options.limit) query = query.limit(options.limit);
        logInfo('Firestore listener attached', { collection: name, options });
        return query.onSnapshot(snapshot => {
            try {
                callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) {
                logError(`Rendering ${name} snapshot failed`, error);
                showUserError('We loaded the data, but could not display it. Please refresh the page.');
            }
        }, error => {
            logError(`Firestore listener for ${name} failed`, error, { options });
            showUserError(getFriendlyErrorMessage(error, `Could not load ${name}. Please try again.`));
        });
    }

    async function countCollection(name, where = []) {
        try {
            let query = db.collection(name);
            where.forEach(args => { query = query.where(...args); });
            const snap = await query.get();
            return snap.docs.length;
        } catch (error) {
            logError('countCollection', error);
            return 0;
        }
    }

    async function logActivity(action, details) {
        await rtdb.ref('activityFeed').push({
            action,
            details,
            userId: currentUser?.uid || 'anonymous',
            userName: currentProfile?.name || currentUser?.displayName || 'Anonymous',
            timestamp: window.firebase.database.ServerValue.TIMESTAMP
        });
    }

    async function createNotification(entry) {
        await db.collection('notifications').add({
            title: entry.title || 'New event update',
            message: entry.message || '',
            type: entry.type || 'event',
            eventId: entry.eventId || null,
            broadcast: {
                emailReady: true,
                newsletterReady: true,
                sent: false
            },
            createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
            read: false,
            active: true
        });
    }

    function normalizeEvent(event) {
        return {
            ...event,
            featured: !!event.featured,
            published: !!event.published,
            status: event.status || 'active',
            capacity: Number(event.capacity || 0),
            registeredCount: Number(event.registeredCount || 0),
            attendanceCount: Number(event.attendanceCount || 0),
            goingCount: Number(event.goingCount || 0),
            interestedCount: Number(event.interestedCount || 0)
        };
    }

    function eventIsPublic(event) {
        return event && event.status === 'active' && event.published === true;
    }

    function eventIsUpcoming(event) {
        const start = toDate(event.startDate);
        return start && start.getTime() >= Date.now() && eventIsPublic(event);
    }

    function eventIsPast(event) {
        const end = toDate(event.endDate || event.startDate);
        return end && end.getTime() < Date.now();
    }

    function eventRegistrationOpen(event) {
        if (!eventIsPublic(event)) return false;
        const deadline = toDate(event.registrationDeadline);
        if (deadline && deadline.getTime() < Date.now()) return false;
        if (event.capacity > 0 && (event.registeredCount || 0) >= event.capacity) return false;
        return true;
    }

    function getEventRegistrationMessage(event) {
        if (!currentUser) return 'Please sign in before registering.';
        if (!event?.published || event?.status !== 'active') return 'Registration is only available for published active events.';
        const deadline = toDate(event.registrationDeadline);
        if (deadline && deadline.getTime() < Date.now()) return 'Registration has closed for this event.';
        if (event.capacity > 0 && (event.registeredCount || 0) >= event.capacity) return 'This event is full.';
        return '';
    }

    function parseDateTime(value) {
        return value ? window.firebase.firestore.Timestamp.fromDate(new Date(value)) : null;
    }

    function buildEventPayload(form) {
        const queryField = selector => form.querySelector(selector) || document.querySelector(selector);
        const title = queryField('[name="title"]').value.trim();
        const category = queryField('[name="category"]').value.trim();
        const organizer = queryField('[name="organizer"]').value.trim();
        const location = queryField('[name="location"]').value.trim();
        const description = queryField('[name="description"]').value.trim();
        const featured = queryField('#event-featured')?.checked || false;
        const published = queryField('#event-published')?.checked || false;
        const status = queryField('#event-status')?.value || 'active';
        const capacity = Number(queryField('#event-capacity')?.value || 0);
        const bannerUrl = queryField('#event-banner-url')?.value.trim() || '';
        const startDate = parseDateTime(queryField('[name="startDateTime"]').value);
        const endDate = parseDateTime(queryField('[name="endDateTime"]').value) || startDate;
        const registrationDeadline = parseDateTime(queryField('[name="registrationDeadline"]').value);

        return {
            title,
            category,
            organizer,
            location,
            description,
            featured,
            published,
            status,
            capacity,
            bannerUrl,
            startDate,
            endDate,
            registrationDeadline,
            registeredCount: Number(queryField('#event-registered-count')?.value || 0)
        };
    }

    async function saveEventToFirestore(eventId, payload) {
        const required = [
            [payload.title, 'Event title is required.'],
            [payload.description, 'Event description is required.'],
            [payload.category, 'Event category is required.'],
            [payload.location, 'Event location is required.'],
            [payload.organizer, 'Event organizer is required.'],
            [payload.bannerUrl, 'Event banner is required.'],
            [payload.startDate, 'Start date/time is required.'],
            [payload.endDate, 'End date/time is required.'],
            [payload.registrationDeadline, 'Registration deadline is required.']
        ];
        const missing = required.find(([value]) => !value);
        if (missing) throw new Error(missing[1]);
        if (payload.capacity < 1) throw new Error('Maximum capacity must be at least 1.');
        if (toDate(payload.endDate).getTime() < toDate(payload.startDate).getTime()) {
            throw new Error('End date/time must be after the start date/time.');
        }
        if (toDate(payload.registrationDeadline).getTime() > toDate(payload.startDate).getTime()) {
            throw new Error('Registration deadline must be before the event starts.');
        }
        const planner = {
            ...payload,
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        };
        if (!eventId) {
            planner.createdAt = window.firebase.firestore.FieldValue.serverTimestamp();
            planner.createdBy = currentUser?.uid || 'system';
            planner.registeredCount = 0;
            planner.attendanceCount = 0;
            planner.goingCount = 0;
            planner.interestedCount = 0;
            const ref = db.collection('events').doc();
            await ref.set({ id: ref.id, ...planner });
            await createNotification({
                title: `New event: ${payload.title}`,
                message: `${payload.title} has been created${payload.published ? ' and published' : ''}.`,
                type: payload.published ? 'event_published' : 'event_created',
                eventId: ref.id
            });
            return ref.id;
        }
        const before = await db.collection('events').doc(eventId).get();
        await db.collection('events').doc(eventId).set(planner, { merge: true });
        const wasPublished = before.exists && before.data().published === true;
        const notificationType = payload.status === 'canceled'
            ? 'event_cancelled'
            : payload.published && !wasPublished
                ? 'event_published'
                : 'event_updated';
        await createNotification({
            title: `${notificationType === 'event_published' ? 'Published' : notificationType === 'event_cancelled' ? 'Cancelled' : 'Updated'}: ${payload.title}`,
            message: `${payload.title} was ${notificationType === 'event_cancelled' ? 'cancelled' : notificationType === 'event_published' ? 'published' : 'updated'}.`,
            type: notificationType,
            eventId
        });
        return eventId;
    }

    async function setEventRSVP(event, status) {
        if (!currentUser) throw new Error('Please sign in before RSVPing.');
        if (!eventIsPublic(event)) throw new Error('RSVP is only available for published active events.');
        if (!['going', 'interested'].includes(status)) throw new Error('Choose Going or Interested.');
        const rsvpId = `${event.id}_${currentUser.uid}`;
        const rsvpRef = db.collection('eventRSVPs').doc(rsvpId);
        const eventRef = db.collection('events').doc(event.id);
        await db.runTransaction(async tx => {
            const rsvpSnap = await tx.get(rsvpRef);
            const previousStatus = rsvpSnap.exists ? rsvpSnap.data().status : null;
            const increments = {};
            if (previousStatus === 'going') increments.goingCount = window.firebase.firestore.FieldValue.increment(-1);
            if (previousStatus === 'interested') increments.interestedCount = window.firebase.firestore.FieldValue.increment(-1);
            if (status === 'going') increments.goingCount = window.firebase.firestore.FieldValue.increment(1);
            if (status === 'interested') increments.interestedCount = window.firebase.firestore.FieldValue.increment(1);
            tx.set(rsvpRef, {
                eventId: event.id,
                userId: currentUser.uid,
                status,
                createdAt: rsvpSnap.exists ? rsvpSnap.data().createdAt : window.firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            tx.set(eventRef, increments, { merge: true });
        });
    }

    async function cancelEventRSVP(event) {
        if (!currentUser) throw new Error('Please sign in before changing RSVP.');
        const rsvpId = `${event.id}_${currentUser.uid}`;
        const rsvpRef = db.collection('eventRSVPs').doc(rsvpId);
        const eventRef = db.collection('events').doc(event.id);
        await db.runTransaction(async tx => {
            const rsvpSnap = await tx.get(rsvpRef);
            if (!rsvpSnap.exists) return;
            const status = rsvpSnap.data().status;
            const increments = {};
            if (status === 'going') increments.goingCount = window.firebase.firestore.FieldValue.increment(-1);
            if (status === 'interested') increments.interestedCount = window.firebase.firestore.FieldValue.increment(-1);
            tx.delete(rsvpRef);
            tx.set(eventRef, increments, { merge: true });
        });
    }

    async function registerForEvent(event) {
        const message = getEventRegistrationMessage(event);
        if (message) throw new Error(message);
        const regId = `${event.id}_${currentUser.uid}`;
        const eventRef = db.collection('events').doc(event.id);
        const regRef = db.collection('eventRegistrations').doc(regId);
        await db.runTransaction(async tx => {
            const eventSnap = await tx.get(eventRef);
            const regSnap = await tx.get(regRef);
            if (!eventSnap.exists) throw new Error('This event could not be found.');
            const liveEvent = normalizeEvent({ id: eventSnap.id, ...eventSnap.data() });
            const liveMessage = getEventRegistrationMessage(liveEvent);
            if (liveMessage) throw new Error(liveMessage);
            if (regSnap.exists) throw new Error('You are already registered for this event.');
            tx.set(regRef, {
                eventId: event.id,
                userId: currentUser.uid,
                fullName: currentProfile?.name || currentUser.displayName || currentUser.email || 'Student',
                email: currentUser.email || '',
                registeredAt: window.firebase.firestore.FieldValue.serverTimestamp(),
                attendanceStatus: 'pending'
            });
            tx.update(eventRef, { registeredCount: window.firebase.firestore.FieldValue.increment(1) });
        });
    }

    async function cancelEventRegistration(event) {
        if (!currentUser) throw new Error('Please sign in before changing registration.');
        const regId = `${event.id}_${currentUser.uid}`;
        const eventRef = db.collection('events').doc(event.id);
        const regRef = db.collection('eventRegistrations').doc(regId);
        await db.runTransaction(async tx => {
            const regSnap = await tx.get(regRef);
            if (!regSnap.exists) throw new Error('You are not registered for this event.');
            const updates = { registeredCount: window.firebase.firestore.FieldValue.increment(-1) };
            if (regSnap.data().attendanceStatus === 'attended') {
                updates.attendanceCount = window.firebase.firestore.FieldValue.increment(-1);
            }
            tx.delete(regRef);
            tx.update(eventRef, updates);
        });
    }

    async function updateAttendanceStatus(eventId, registrationId, nextStatus) {
        if (!['pending', 'attended', 'absent'].includes(nextStatus)) throw new Error('Invalid attendance status.');
        const regRef = db.collection('eventRegistrations').doc(registrationId);
        const eventRef = db.collection('events').doc(eventId);
        await db.runTransaction(async tx => {
            const regSnap = await tx.get(regRef);
            if (!regSnap.exists) throw new Error('This registration could not be found.');
            const previousStatus = regSnap.data().attendanceStatus || 'pending';
            const updates = {
                attendanceStatus: nextStatus,
                attendanceUpdatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
                attendanceUpdatedBy: currentUser?.uid || 'system'
            };
            let attendanceDelta = 0;
            if (previousStatus !== 'attended' && nextStatus === 'attended') attendanceDelta = 1;
            if (previousStatus === 'attended' && nextStatus !== 'attended') attendanceDelta = -1;
            tx.update(regRef, updates);
            if (attendanceDelta !== 0) {
                tx.update(eventRef, { attendanceCount: window.firebase.firestore.FieldValue.increment(attendanceDelta) });
            }
        });
    }

    function downloadCsv(filename, rows) {
        const csv = rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    async function requireAuth() {
        await ready();
        return new Promise(resolve => {
            auth.onAuthStateChanged(async user => {
                try {
                    currentUser = user;
                    currentProfile = user ? await ensureUserDoc(user) : null;
                    resolve({ user, profile: currentProfile });
                } catch (error) {
                    logError('Auth state handling failed', error);
                    showUserError(getFriendlyErrorMessage(error, 'We could not load your profile. Please refresh the page.'));
                    resolve({ user: null, profile: null });
                }
            });
        });
    }

    async function requireAdmin() {
        const session = await requireAuth();
        if (!session.user || session.profile?.role !== 'admin' || session.profile?.active === false) {
            window.location.href = '../login.html';
            return null;
        }
        return session;
    }

    function bindLogoutButtons() {
        document.querySelectorAll('button').forEach(button => {
            if (button.textContent.trim().toLowerCase() === 'logout') {
                button.addEventListener('click', wrapAsync('Logout', async () => {
                    await auth.signOut();
                    location.reload();
                }));
            }
        });
    }

    function initAuthForms() {
        window.TMG_login = async (email, password) => {
            try {
                const cred = await auth.signInWithEmailAndPassword(email, password);
                await ensureUserDoc(cred.user);
                return cred.user;
            } catch (error) {
                logError('Login failed', error);
                error.userMessage = getFriendlyErrorMessage(error, 'Could not sign you in. Please try again.');
                throw error;
            }
        };
        window.TMG_signup = async (name, email, password) => {
            try {
                const cred = await auth.createUserWithEmailAndPassword(email, password);
                await cred.user.updateProfile({ displayName: name });
                await cred.user.sendEmailVerification();
                await ensureUserDoc(cred.user, { name, email });
                return cred.user;
            } catch (error) {
                logError('Signup failed', error);
                error.userMessage = getFriendlyErrorMessage(error, 'Could not create your account. Please try again.');
                throw error;
            }
        };
        window.TMG_google = async () => {
            try {
                const provider = new window.firebase.auth.GoogleAuthProvider();
                const cred = await auth.signInWithPopup(provider);
                await ensureUserDoc(cred.user);
                return cred.user;
            } catch (error) {
                logError('Google sign-in failed', error);
                error.userMessage = getFriendlyErrorMessage(error, 'Could not complete Google sign-in. Please try again.');
                throw error;
            }
        };
        window.TMG_resetPassword = async email => {
            try {
                await auth.sendPasswordResetEmail(email);
            } catch (error) {
                logError('Password reset failed', error);
                error.userMessage = getFriendlyErrorMessage(error, 'Could not send the reset email. Please try again.');
                throw error;
            }
        };
    }

    function getAuthErrorMessage(error) {
        const messages = {
            'auth/email-already-in-use': 'That email is already registered. Please sign in instead.',
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/invalid-credential': 'The email or password is incorrect.',
            'auth/user-not-found': 'No account exists for that email yet.',
            'auth/wrong-password': 'The email or password is incorrect.',
            'auth/weak-password': 'Use a stronger password with at least 6 characters.',
            'auth/network-request-failed': 'Network error. Please check your connection and try again.'
        };
        return messages[error?.code] || error?.message || 'Authentication failed. Please try again.';
    }

    function showFormError(form, message) {
        let errorBox = form.querySelector('[data-form-error]');
        if (!errorBox) {
            errorBox = document.createElement('p');
            errorBox.dataset.formError = '';
            errorBox.className = 'rounded-xl border border-gavel-danger/20 bg-gavel-danger/10 px-4 py-3 text-sm text-gavel-danger';
            form.appendChild(errorBox);
        }
        errorBox.textContent = message;
    }

    function renderHomepage() {
        const counters = document.querySelectorAll('.counter');
        const featuredContainer = document.getElementById('homepage-featured-event');
        const listContainer = document.getElementById('homepage-event-list');
        const metaText = document.querySelector('#homepage-event-meta');
        const notificationButton = document.getElementById('notification-button');
        const notificationPanel = document.getElementById('notification-panel');
        const notificationItems = document.getElementById('notification-items');

        if (counters.length) {
            Promise.all([
                countCollection('users', [['active', '==', true]]),
                countCollection('marketplaceListings', [['status', '==', 'active']]),
                countCollection('gallery', [['visible', '==', true]]),
                countCollection('clubs', [['active', '==', true]]),
                countCollection('events', [['status', '==', 'active'], ['published', '==', true]])
            ]).then(([users, listings, gallery, clubs, events]) => {
                [users, listings, gallery].forEach((value, index) => {
                    if (counters[index]) {
                        counters[index].dataset.target = value;
                        counters[index].textContent = value;
                    }
                });
                const activityCard = document.querySelector('#hero .hero-activity');
                if (activityCard) activityCard.textContent = `${events} live events and ${clubs} active organizations`;
                if (metaText) metaText.innerHTML = `<span class="text-gavel-yellow">${listings}</span> live marketplace listings`;
            });
        }

        function renderHomepageEvents(events) {
            if (!featuredContainer || !listContainer) return;
            const upcoming = events
                .map(normalizeEvent)
                .filter(eventIsUpcoming)
                .sort((a, b) => (toDate(a.startDate)?.getTime() || 0) - (toDate(b.startDate)?.getTime() || 0));

            if (!upcoming.length) {
                featuredContainer.innerHTML = `
                    <div class="border border-gavel-border bg-gavel-card rounded-3xl p-8 text-center text-gavel-muted">
                        <p class="text-xl font-bold text-white">No upcoming events yet</p>
                        <p class="mt-3">Admins can create and publish events from the dashboard.</p>
                    </div>`;
                listContainer.innerHTML = '<div class="col-span-full text-center text-gavel-muted font-mono text-sm py-12">No upcoming events available.</div>';
                return;
            }

            const featured = upcoming.find(event => event.featured) || upcoming[0];
            const nextEvents = upcoming.filter(event => event.id !== featured.id).slice(0, 3);
            const seats = featured.capacity > 0 ? `${featured.registeredCount}/${featured.capacity}` : `${featured.registeredCount}/∞`;
            const remainingSeats = featured.capacity > 0 ? Math.max(0, featured.capacity - featured.registeredCount) : 'Unlimited';
            featuredContainer.innerHTML = `
                <article class="relative rounded-[2rem] border border-gavel-border bg-gavel-card overflow-hidden group hover:border-gavel-yellow/50 transition-colors duration-500">
                    <div class="absolute inset-0 bg-gradient-to-r from-black/70 via-black/10 to-black/70"></div>
                    <div class="relative p-8 lg:p-10 grid gap-6 lg:grid-cols-[1.5fr_1fr] items-start">
                        <div class="space-y-4">
                            <span class="inline-flex items-center gap-2 text-gavel-yellow text-xs font-mono uppercase tracking-widest">${featured.category || 'Event'}</span>
                            <h3 class="text-4xl font-bold text-white">${escapeHtml(featured.title)}</h3>
                            <p class="text-gavel-muted text-sm leading-relaxed max-w-2xl">${escapeHtml(featured.description)}</p>
                            <div class="flex flex-wrap gap-3 text-sm text-gavel-muted">
                                <span class="flex items-center gap-1.5"><i data-lucide="calendar" class="w-4 h-4"></i>${formatDate(featured.startDate)}</span>
                                <span class="flex items-center gap-1.5"><i data-lucide="clock" class="w-4 h-4"></i>${formatTime(featured.startDate)} - ${formatTime(featured.endDate)}</span>
                                <span class="flex items-center gap-1.5"><i data-lucide="map-pin" class="w-4 h-4"></i>${escapeHtml(featured.location)}</span>
                            </div>
                            <div class="flex flex-wrap gap-3 items-center">
                                <span class="rounded-full bg-white/10 px-3 py-2 text-xs text-white uppercase tracking-widest">${featured.featured ? 'Featured' : 'Upcoming'}</span>
                                <span class="rounded-full bg-white/10 px-3 py-2 text-xs text-gavel-yellow uppercase tracking-widest">${seats} registered</span>
                                <span class="rounded-full bg-white/10 px-3 py-2 text-xs text-gavel-muted uppercase tracking-widest">${featured.goingCount} going • ${featured.interestedCount} interested</span>
                                <span class="rounded-full bg-white/10 px-3 py-2 text-xs text-white uppercase tracking-widest">${remainingSeats} seats left</span>
                            </div>
                        </div>
                        <div class="rounded-[2rem] overflow-hidden bg-[#111] border border-gavel-border">
                            <img src="${escapeHtml(featured.bannerUrl || 'https://images.unsplash.com/photo-1519337265831-281ec6cc8514?auto=format&fit=crop&w=1200&q=80')}" alt="${escapeHtml(featured.title)}" class="w-full h-full object-cover min-h-[260px]">
                        </div>
                    </div>
                </article>`;
            listContainer.innerHTML = nextEvents.map(event => `
                <article class="border border-gavel-border bg-gavel-card rounded-3xl p-6 hover:border-gavel-yellow transition-colors">
                    <div class="flex flex-col sm:flex-row sm:justify-between gap-4">
                        <div>
                            <h4 class="text-xl font-semibold text-white">${escapeHtml(event.title)}</h4>
                            <p class="text-gavel-muted text-sm mt-2">${escapeHtml(event.location)} • ${escapeHtml(event.organizer || 'Organizer')}</p>
                        </div>
                        <span class="text-xs uppercase tracking-widest text-gavel-muted">${formatDate(event.startDate)}</span>
                    </div>
                    <div class="mt-5 flex flex-wrap items-center gap-3 text-sm text-gavel-muted">
                        <span class="flex items-center gap-1.5"><i data-lucide="clock" class="w-4 h-4"></i>${formatTime(event.startDate)}</span>
                        <span class="flex items-center gap-1.5"><i data-lucide="users" class="w-4 h-4"></i>${event.registeredCount}/${event.capacity || '∞'} registered</span>
                        <span class="flex items-center gap-1.5"><i data-lucide="thumbs-up" class="w-4 h-4"></i>${event.goingCount} going • ${event.interestedCount} interested</span>
                    </div>
                </article>
            `).join('');
            window.lucide?.createIcons();
        }

        listenCollection('events', events => {
            const liveEvents = events.map(normalizeEvent).filter(eventIsPublic);
            renderHomepageEvents(liveEvents);
        }, { where: [['status', '==', 'active'], ['published', '==', true]], orderBy: ['startDate', 'asc'] });

        if (notificationButton && notificationPanel && notificationItems) {
            notificationButton.addEventListener('click', () => {
                notificationPanel.classList.toggle('hidden');
            });
            document.addEventListener('click', event => {
                if (!notificationPanel.contains(event.target) && !notificationButton.contains(event.target)) {
                    notificationPanel.classList.add('hidden');
                }
            });
            listenCollection('notifications', items => {
                if (!notificationItems) return;
                notificationItems.innerHTML = items.length ? items.map(notification => `
                    <div class="border-b border-gavel-border/50 px-4 py-3">
                        <p class="text-sm text-white font-semibold">${escapeHtml(notification.title)}</p>
                        <p class="text-gavel-muted text-xs mt-1">${escapeHtml(notification.message)}</p>
                    </div>
                `).join('') : '<div class="px-4 py-6 text-center text-gavel-muted">No notifications yet.</div>';
            }, { where: [['active', '==', true]], orderBy: ['createdAt', 'desc'], limit: 5 });
        }
    }

    function renderGallery() {
        const grid = document.querySelector('.grid-dense');
        if (!grid) return;
        grid.innerHTML = '<div class="col-span-full text-gavel-muted font-mono text-sm py-16">Loading live gallery...</div>';
        listenCollection('gallery', items => {
            const visible = items.filter(item => item.visible !== false);
            grid.innerHTML = visible.length ? visible.map((item, index) => `
                <div class="gallery-item ${index === 0 ? 'lg:col-span-2 lg:row-span-2 sm:col-span-2 sm:row-span-2' : ''} spotify-card relative rounded-3xl overflow-hidden cursor-pointer border border-white/5 bg-gavel-card animate-fade-in-up"
                    data-category="${escapeHtml((item.category || 'general').toLowerCase())}"
                    onclick="openLightbox('${escapeHtml(item.imageUrl)}', '${escapeHtml(item.title)}', '${escapeHtml(item.category || 'Gallery').toUpperCase()}')">
                    <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover filter brightness-75 img-zoom">
                    <div class="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/30 to-transparent opacity-90"></div>
                    <div class="card-content absolute bottom-0 left-0 w-full p-6">
                        <span class="inline-block text-gavel-yellow font-mono text-[10px] tracking-widest uppercase mb-2">${escapeHtml(item.category || 'Gallery')}</span>
                        <h3 class="text-white font-bold text-2xl leading-tight">${escapeHtml(item.title)}</h3>
                        <p class="text-gavel-muted text-sm mt-2 line-clamp-2">${escapeHtml(item.description)}</p>
                    </div>
                </div>
            `).join('') : '<div class="col-span-full text-center text-gavel-muted font-mono text-sm py-16">No gallery uploads yet.</div>';
            window.lucide?.createIcons();
        }, { where: [['visible', '==', true]], orderBy: ['uploadedAt', 'desc'] });
    }

    function renderEvents() {
        const main = document.querySelector('main.max-w-4xl');
        if (!main) return;

        main.innerHTML = `
            <section class="space-y-6">
                <div class="flex flex-col md:flex-row justify-between gap-8">
                    <div class="space-y-4">
                        <h1 class="text-5xl md:text-6xl font-black text-white tracking-tight">Events</h1>
                        <p class="text-gavel-muted max-w-2xl">Browse live and past events powered directly from Firestore. Register, cancel, and track your event attendance in real time.</p>
                    </div>
                    <div class="flex flex-col gap-4">
                        <button id="event-search-toggle" class="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-gavel-border bg-gavel-card text-sm text-white hover:border-gavel-yellow transition-colors">Search events</button>
                    </div>
                </div>
                <div class="grid gap-4 lg:grid-cols-[1fr_auto] items-end">
                    <div class="grid gap-4 sm:grid-cols-2">
                        <div class="bg-gavel-card border border-gavel-border rounded-3xl p-5 text-white">
                            <p class="text-sm uppercase tracking-widest text-gavel-yellow font-mono">Upcoming events</p>
                            <p id="event-count-upcoming" class="mt-4 text-3xl font-bold">0</p>
                        </div>
                        <div class="bg-gavel-card border border-gavel-border rounded-3xl p-5 text-white">
                            <p class="text-sm uppercase tracking-widest text-gavel-yellow font-mono">Past events</p>
                            <p id="event-count-past" class="mt-4 text-3xl font-bold">0</p>
                        </div>
                    </div>
                    <div class="grid gap-4 sm:grid-cols-2">
                        <div class="bg-gavel-card border border-gavel-border rounded-3xl p-5 text-white">
                            <p class="text-sm uppercase tracking-widest text-gavel-yellow font-mono">Your registrations</p>
                            <p id="event-count-registered" class="mt-4 text-3xl font-bold">0</p>
                        </div>
                        <div class="bg-gavel-card border border-gavel-border rounded-3xl p-5 text-white">
                            <p class="text-sm uppercase tracking-widest text-gavel-yellow font-mono">Live events</p>
                            <p id="event-count-live" class="mt-4 text-3xl font-bold">0</p>
                        </div>
                    </div>
                </div>
            </section>

            <section class="grid gap-4 lg:grid-cols-[1fr_320px]">
                <div class="space-y-4">
                    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div class="relative w-full md:w-[460px]">
                            <input id="event-search" type="search" placeholder="Search events, location, organizer..."
                                class="w-full rounded-3xl border border-gavel-border bg-[#0e0e0e] px-5 py-4 text-white placeholder:text-gavel-muted focus:outline-none focus:border-gavel-yellow" />
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <select id="event-category-filter" class="rounded-3xl border border-gavel-border bg-[#0e0e0e] px-4 py-4 text-white focus:outline-none">
                                <option value="all">All categories</option>
                                <option value="social">Socials</option>
                                <option value="academic">Academic</option>
                                <option value="career">Career</option>
                                <option value="workshop">Workshop</option>
                                <option value="general">General</option>
                            </select>
                            <select id="event-time-filter" class="rounded-3xl border border-gavel-border bg-[#0e0e0e] px-4 py-4 text-white focus:outline-none">
                                <option value="upcoming">Upcoming</option>
                                <option value="past">Past</option>
                                <option value="all">All events</option>
                            </select>
                        </div>
                    </div>
                    <div id="event-featured" class="hidden"></div>
                    <div id="section-upcoming" class="space-y-6"></div>
                    <div id="section-past" class="hidden space-y-6"></div>
                    <div id="section-registered" class="hidden space-y-6"></div>
                </div>
                <aside class="space-y-4">
                    <div class="bg-gavel-card border border-gavel-border rounded-3xl p-5">
                        <p class="text-xs uppercase tracking-widest text-gavel-yellow font-mono">Filters</p>
                        <div class="mt-4 space-y-4">
                            <div>
                                <label class="text-sm text-gavel-muted">Category</label>
                                <select id="sidebar-category-filter" class="mt-2 w-full rounded-2xl border border-gavel-border bg-[#0e0e0e] px-4 py-3 text-white focus:outline-none">
                                    <option value="all">All categories</option>
                                    <option value="social">Socials</option>
                                    <option value="academic">Academic</option>
                                    <option value="career">Career</option>
                                    <option value="workshop">Workshop</option>
                                    <option value="general">General</option>
                                </select>
                            </div>
                            <div>
                                <label class="text-sm text-gavel-muted">Status</label>
                                <select id="sidebar-status-filter" class="mt-2 w-full rounded-2xl border border-gavel-border bg-[#0e0e0e] px-4 py-3 text-white focus:outline-none">
                                    <option value="all">All statuses</option>
                                    <option value="active">Published</option>
                                    <option value="archived">Archived</option>
                                    <option value="canceled">Canceled</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="bg-gavel-card border border-gavel-border rounded-3xl p-5">
                        <p class="text-xs uppercase tracking-widest text-gavel-yellow font-mono">Notifications</p>
                        <div id="notification-items-sidebar" class="mt-4 space-y-3 text-sm text-gavel-muted">Live event notifications will appear here.</div>
                    </div>
                </aside>
            </section>
        `;

        const sectionUpcoming = document.getElementById('section-upcoming');
        const sectionPast = document.getElementById('section-past');
        const sectionRegistered = document.getElementById('section-registered');
        const searchInput = document.getElementById('event-search');
        const categoryFilter = document.getElementById('event-category-filter');
        const timeFilter = document.getElementById('event-time-filter');
        const sidebarCategory = document.getElementById('sidebar-category-filter');
        const sidebarStatus = document.getElementById('sidebar-status-filter');
        const eventCountUpcoming = document.getElementById('event-count-upcoming');
        const eventCountPast = document.getElementById('event-count-past');
        const eventCountRegistered = document.getElementById('event-count-registered');
        const eventCountLive = document.getElementById('event-count-live');
        const eventFeatured = document.getElementById('event-featured');
        const notificationSidebar = document.getElementById('notification-items-sidebar');

        let allEvents = [];
        let registrationMap = new Map();
        let rsvpMap = new Map();
        let currentView = 'upcoming';

        function renderEventCards(events, type = 'upcoming') {
            if (!events.length) {
                return `<div class="text-center py-16 text-gavel-muted font-mono text-sm border border-gavel-border rounded-3xl">No ${type} events found.</div>`;
            }
            return events.map(event => {
                const registered = registrationMap.has(event.id);
                const rsvp = rsvpMap.get(event.id)?.status || '';
                const open = eventRegistrationOpen(event);
                const seats = event.capacity > 0 ? `${event.registeredCount}/${event.capacity}` : `${event.registeredCount}/∞`;
                const remaining = event.capacity > 0 ? Math.max(0, event.capacity - event.registeredCount) : 'Unlimited';
                const dayText = formatDate(event.startDate).split(' ')[0];
                return `
                    <article class="luma-card gap-6 p-6 rounded-3xl border border-gavel-border bg-gavel-card/50 group">
                        <div class="date-block shrink-0">
                            <span>${dayText}</span>
                            <span>${toDate(event.startDate)?.getDate() || '--'}</span>
                        </div>
                        <div class="flex-grow space-y-3 min-w-0">
                            <div class="flex flex-wrap gap-2 items-center">
                                <span class="inline-block text-xs text-gavel-muted font-mono uppercase tracking-wider">${escapeHtml(event.category || 'General')}</span>
                                ${event.featured ? '<span class="inline-block text-[10px] px-2 py-1 rounded-full bg-gavel-yellow/10 text-gavel-yellow font-bold uppercase tracking-wide">Featured</span>' : ''}
                                ${event.status !== 'active' ? `<span class="inline-block text-[10px] px-2 py-1 rounded-full ${event.status === 'canceled' ? 'bg-gavel-danger/10 text-gavel-danger' : 'bg-white/5 text-gavel-muted'} font-bold uppercase tracking-wide">${event.status}</span>` : ''}
                            </div>
                            <h3 class="text-xl font-bold text-white group-hover:text-gavel-yellow transition-colors line-clamp-2">${escapeHtml(event.title)}</h3>
                            <p class="text-sm text-gavel-muted line-clamp-2">${escapeHtml(event.description)}</p>
                            <div class="flex flex-wrap gap-5 text-sm text-gavel-muted pt-1">
                                <span class="flex items-center gap-1.5 whitespace-nowrap"><i data-lucide="clock" class="w-4 h-4"></i>${formatTime(event.startDate)}</span>
                                <span class="flex items-center gap-1.5 whitespace-nowrap truncate"><i data-lucide="map-pin" class="w-4 h-4 shrink-0"></i><span class="truncate">${escapeHtml(event.location)}</span></span>
                                <span class="flex items-center gap-1.5 whitespace-nowrap"><i data-lucide="thumbs-up" class="w-4 h-4"></i>${event.goingCount} going • ${event.interestedCount} interested</span>
                            </div>
                        </div>
                        <div class="flex flex-col items-end justify-between gap-4 shrink-0">
                            <span class="text-xs text-gavel-muted font-mono">${seats} registered • ${remaining} left</span>
                            <div class="flex gap-2">
                                <button data-event-rsvp="going" data-event-id="${event.id}" class="px-3 py-2 rounded-xl text-xs font-semibold border ${rsvp === 'going' ? 'border-gavel-yellow bg-gavel-yellow text-black' : 'border-gavel-border bg-white/5 text-gavel-muted hover:text-white'}">Going</button>
                                <button data-event-rsvp="interested" data-event-id="${event.id}" class="px-3 py-2 rounded-xl text-xs font-semibold border ${rsvp === 'interested' ? 'border-gavel-yellow bg-gavel-yellow text-black' : 'border-gavel-border bg-white/5 text-gavel-muted hover:text-white'}">Interested</button>
                                ${rsvp ? `<button data-event-rsvp="cancel" data-event-id="${event.id}" class="px-3 py-2 rounded-xl text-xs font-semibold border border-gavel-danger/40 text-gavel-danger bg-gavel-danger/10">Cancel RSVP</button>` : ''}
                            </div>
                            <button data-event-register="${event.id}" class="px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${registered ? 'bg-gavel-danger/20 text-gavel-danger border border-gavel-danger hover:bg-gavel-danger hover:text-white' : open ? 'bg-gavel-yellow/10 text-gavel-yellow border border-gavel-yellow/30 hover:bg-gavel-yellow hover:text-black' : 'bg-white/5 text-gavel-muted border border-white/10 cursor-not-allowed'}">${registered ? 'Cancel' : open ? 'Register' : event.status !== 'active' ? 'Unavailable' : event.capacity > 0 && event.registeredCount >= event.capacity ? 'Full' : 'Closed'}</button>
                        </div>
                    </article>`;
            }).join('');
        }

        function renderFeaturedEvent(events) {
            if (!eventFeatured) return;
            const upcoming = events.filter(eventIsUpcoming);
            const featured = upcoming.find(event => event.featured) || upcoming[0];
            if (!featured) {
                eventFeatured.className = 'border border-gavel-border bg-gavel-card rounded-3xl p-12 text-center text-gavel-muted';
                eventFeatured.innerHTML = '<p class="text-2xl font-bold text-white">No featured event available</p><p class="mt-3 text-sm">Create a featured event in the Admin Dashboard to highlight it here.</p>';
                return;
            }
            eventFeatured.className = 'border border-gavel-border bg-gavel-card rounded-3xl overflow-hidden group hover:border-gavel-yellow/50 transition-all';
            eventFeatured.innerHTML = `
                <div class="relative overflow-hidden">
                    <img src="${escapeHtml(featured.bannerUrl || 'https://images.unsplash.com/photo-1519337265831-281ec6cc8514?auto=format&fit=crop&w=1200&q=80')}" alt="${escapeHtml(featured.title)}" class="w-full h-96 object-cover group-hover:brightness-50 transition-all duration-500">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent"></div>
                    <div class="absolute bottom-0 left-0 right-0 p-8 space-y-4">
                        <div class="flex items-center gap-2">
                            <span class="inline-block w-2 h-2 rounded-full bg-gavel-yellow"></span>
                            <span class="text-gavel-yellow text-xs font-mono uppercase tracking-widest font-bold">Featured Event</span>
                        </div>
                        <h2 class="text-3xl sm:text-4xl font-bold text-white leading-tight">${escapeHtml(featured.title)}</h2>
                        <p class="text-white/80 max-w-2xl text-sm sm:text-base">${escapeHtml(featured.description)}</p>
                        <div class="flex flex-wrap gap-5 text-sm text-white/70 pt-2">
                            <span class="flex items-center gap-2"><i data-lucide="calendar" class="w-4 h-4"></i>${formatDate(featured.startDate)}</span>
                            <span class="flex items-center gap-2"><i data-lucide="clock" class="w-4 h-4"></i>${formatTime(featured.startDate)}</span>
                            <span class="flex items-center gap-2"><i data-lucide="map-pin" class="w-4 h-4"></i>${escapeHtml(featured.location)}</span>
                        </div>
                    </div>
                </div>`;
            window.lucide?.createIcons();
        }

        function renderDashboard(events) {
            const normalized = events.map(normalizeEvent).sort((a, b) => (toDate(a.startDate)?.getTime() || 0) - (toDate(b.startDate)?.getTime() || 0));
            const upcoming = normalized.filter(eventIsUpcoming);
            const past = normalized.filter(eventIsPast);
            const registered = normalized.filter(event => registrationMap.has(event.id));

            if (eventCountUpcoming) eventCountUpcoming.textContent = upcoming.length;
            if (eventCountPast) eventCountPast.textContent = past.length;
            if (eventCountRegistered) eventCountRegistered.textContent = registered.length;
            if (eventCountLive) eventCountLive.textContent = normalized.filter(eventIsPublic).length;

            if (sectionUpcoming) sectionUpcoming.innerHTML = renderEventCards(upcoming, 'upcoming');
            if (sectionPast) sectionPast.innerHTML = renderEventCards(past, 'past');
            if (sectionRegistered) sectionRegistered.innerHTML = renderEventCards(registered, 'registered');
            renderFeaturedEvent(normalized);
            window.lucide?.createIcons();

            document.querySelectorAll('[data-event-register]').forEach(button => {
                button.addEventListener('click', async () => {
                    try {
                        const eventId = button.dataset.eventRegister;
                        const event = normalized.find(item => item.id === eventId);
                        if (!event) return;
                        button.disabled = true;
                        if (registrationMap.has(eventId)) {
                            await cancelEventRegistration(event);
                            alert('Your registration has been canceled.');
                            return;
                        }
                        await registerForEvent(event);
                        await logActivity('event_registration', `${currentProfile?.name || 'A student'} registered for ${event.title}`);
                        alert('You are registered for this event.');
                    } catch (error) {
                        logError('Event registration action failed', error, { eventId: button.dataset.eventRegister });
                        showUserError(getFriendlyErrorMessage(error, 'Could not update your registration. Please try again.'));
                    } finally {
                        button.disabled = false;
                    }
                });
            });
            document.querySelectorAll('[data-event-rsvp]').forEach(button => {
                button.addEventListener('click', async () => {
                    try {
                        const event = normalized.find(item => item.id === button.dataset.eventId);
                        if (!event) return;
                        button.disabled = true;
                        if (button.dataset.eventRsvp === 'cancel') {
                            await cancelEventRSVP(event);
                        } else {
                            await setEventRSVP(event, button.dataset.eventRsvp);
                        }
                    } catch (error) {
                        logError('Event RSVP action failed', error, { eventId: button.dataset.eventId, status: button.dataset.eventRsvp });
                        showUserError(getFriendlyErrorMessage(error, 'Could not update your RSVP. Please try again.'));
                    } finally {
                        button.disabled = false;
                    }
                });
            });
        }

        function applyFilters() {
            const searchTerm = searchInput?.value.toLowerCase() || '';
            const category = categoryFilter?.value || 'all';
            const time = timeFilter?.value || 'upcoming';
            const sidebarCategoryValue = sidebarCategory?.value || 'all';
            const sidebarStatusValue = sidebarStatus?.value || 'all';
            let filtered = allEvents;
            if (searchTerm) {
                filtered = filtered.filter(event => `${event.title} ${event.description} ${event.location} ${event.organizer} ${event.category}`.toLowerCase().includes(searchTerm));
            }
            if (category !== 'all') {
                filtered = filtered.filter(event => (event.category || '').toLowerCase() === category);
            }
            if (sidebarCategoryValue !== 'all') {
                filtered = filtered.filter(event => (event.category || '').toLowerCase() === sidebarCategoryValue);
            }
            if (sidebarStatusValue !== 'all') {
                filtered = filtered.filter(event => event.status === sidebarStatusValue);
            }
            if (time === 'upcoming') {
                filtered = filtered.filter(eventIsUpcoming);
            } else if (time === 'past') {
                filtered = filtered.filter(eventIsPast);
            }
            renderDashboard(filtered);
        }

        function attachFilters() {
            [searchInput, categoryFilter, timeFilter, sidebarCategory, sidebarStatus].forEach(control => {
                if (!control) return;
                control.addEventListener('input', applyFilters);
                control.addEventListener('change', applyFilters);
            });
        }

        function watchNotifications() {
            listenCollection('notifications', items => {
                if (!notificationSidebar) return;
                notificationSidebar.innerHTML = items.length ? items.slice(0, 3).map(notification => `
                    <div class="rounded-3xl border border-gavel-border bg-[#0f0f0f] p-4">
                        <p class="text-sm text-white font-semibold">${escapeHtml(notification.title)}</p>
                        <p class="text-xs text-gavel-muted mt-2">${escapeHtml(notification.message)}</p>
                    </div>
                `).join('') : '<div class="text-sm text-gavel-muted">No event notifications yet.</div>';
            }, { where: [['active', '==', true]], orderBy: ['createdAt', 'desc'], limit: 3 });
        }

        let eventUnsub = null;
        let registrationUnsub = null;
        let rsvpUnsub = null;

        function watchEvents() {
            if (eventUnsub) eventUnsub();
            eventUnsub = listenCollection('events', events => {
                allEvents = events.map(normalizeEvent).sort((a, b) => (toDate(a.startDate)?.getTime() || 0) - (toDate(b.startDate)?.getTime() || 0));
                applyFilters();
            }, { where: [['status', '==', 'active'], ['published', '==', true]], orderBy: ['startDate', 'asc'] });
        }

        function watchRegistrations() {
            if (registrationUnsub) registrationUnsub();
            if (rsvpUnsub) rsvpUnsub();
            if (!currentUser) {
                registrationMap = new Map();
                rsvpMap = new Map();
                applyFilters();
                return;
            }
            registrationUnsub = listenCollection('eventRegistrations', regs => {
                registrationMap = new Map(regs.filter(reg => reg.userId === currentUser.uid).map(reg => [reg.eventId, reg]));
                applyFilters();
            }, { where: [['userId', '==', currentUser.uid]], orderBy: ['registeredAt', 'desc'] });
            rsvpUnsub = listenCollection('eventRSVPs', rsvps => {
                rsvpMap = new Map(rsvps.filter(rsvp => rsvp.userId === currentUser.uid).map(rsvp => [rsvp.eventId, rsvp]));
                applyFilters();
            }, { where: [['userId', '==', currentUser.uid]], orderBy: ['updatedAt', 'desc'] });
        }

        auth.onAuthStateChanged(async user => {
            try {
                currentUser = user;
                currentProfile = user ? await ensureUserDoc(user) : null;
                watchRegistrations();
            } catch (error) {
                logError('Events auth state handling failed', error);
                currentUser = null;
                currentProfile = null;
                showUserError(getFriendlyErrorMessage(error, 'We could not load your event profile. Please refresh the page.'));
            }
        });

        attachFilters();
        watchNotifications();
        watchEvents();
    }

    function renderSocieties() {
        const grid = document.querySelector('.society-card')?.parentElement;
        const search = document.querySelector('input[placeholder="Search clubs..."]');
        if (!grid) return;
        let clubs = [];
        const paint = () => {
            const term = (search?.value || '').toLowerCase();
            const filtered = clubs.filter(club => `${club.name} ${club.description} ${club.category}`.toLowerCase().includes(term));
            grid.innerHTML = filtered.length ? filtered.map(club => `
                <article class="society-card bg-gavel-card border border-white/5 rounded-3xl p-8 flex flex-col justify-between group relative overflow-hidden hover:border-gavel-yellow/50">
                    <div>
                        <div class="flex justify-between items-start mb-6">
                            <div class="w-14 h-14 rounded-2xl bg-[#1a1a1a] border border-white/10 flex items-center justify-center overflow-hidden">
                                ${club.logo ? `<img src="${escapeHtml(club.logo)}" alt="${escapeHtml(club.name)}" class="w-full h-full object-cover">` : '<i data-lucide="users" class="w-6 h-6 text-gavel-yellow"></i>'}
                            </div>
                            <span class="text-[10px] bg-white/5 border border-white/10 text-white px-2 py-1 rounded font-mono uppercase tracking-widest">${escapeHtml(club.category || 'Society')}</span>
                        </div>
                        <h3 class="text-2xl font-bold text-white mb-2">${escapeHtml(club.name)}</h3>
                        <p class="text-gavel-muted text-sm leading-relaxed mb-6">${escapeHtml(club.description)}</p>
                    </div>
                    <div class="flex items-center justify-between pt-4 border-t border-white/5">
                        <span class="text-xs font-mono text-gavel-muted uppercase tracking-widest">${club.featured ? 'Featured' : 'Open Membership'}</span>
                        <button data-join-club="${club.id}" class="px-4 py-2 rounded-xl bg-white/5 text-white text-sm hover:bg-gavel-yellow hover:text-black transition-colors">Join</button>
                    </div>
                </article>`).join('') : '<div class="col-span-full text-center text-gavel-muted font-mono py-16">No active clubs or societies found.</div>';
            document.querySelectorAll('[data-join-club]').forEach(button => button.addEventListener('click', async () => {
                try {
                    if (!currentUser) return alert('Please sign in before joining.');
                    button.disabled = true;
                    await db.collection('clubMemberships').doc(`${button.dataset.joinClub}_${currentUser.uid}`).set({
                        clubId: button.dataset.joinClub,
                        userId: currentUser.uid,
                        userName: currentProfile?.name || currentUser.email,
                        joinedAt: window.firebase.firestore.FieldValue.serverTimestamp()
                    });
                    button.textContent = 'Joined';
                    await logActivity('club_join', `${currentProfile?.name || 'A student'} joined a society`);
                } catch (error) {
                    logError('Society join failed', error, { clubId: button.dataset.joinClub });
                    button.disabled = false;
                    showUserError(getFriendlyErrorMessage(error, 'Could not join this society. Please try again.'));
                }
            }));
            window.lucide?.createIcons();
        };
        search?.addEventListener('input', paint);
        listenCollection('clubs', items => { clubs = items; paint(); }, { where: [['active', '==', true]], orderBy: ['name', 'asc'] });
    }

    function renderMarketplace() {
        const grid = document.querySelector('.marketplace-grid, #marketplace-grid') || document.querySelector('[data-marketplace-grid]');
        const cards = document.querySelectorAll('[data-desc]');
        const search = document.querySelector('input[placeholder*="Search"]');
        const target = grid || cards[0]?.parentElement;
        if (!target) return;
        let listings = [];
        const paint = () => {
            const term = (search?.value || '').toLowerCase();
            const filtered = listings.filter(item => `${item.title} ${item.description} ${item.category}`.toLowerCase().includes(term));
            target.innerHTML = filtered.length ? filtered.map(item => `
                <article class="vendor-card group rounded-[2rem] overflow-hidden bg-gavel-card border border-gavel-border hover:border-gavel-yellow/50 transition-colors">
                    <div class="aspect-[4/3] bg-black overflow-hidden"><img src="${escapeHtml(item.imageUrl || item.image || '')}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"></div>
                    <div class="p-6 space-y-3">
                        <div class="flex items-center justify-between"><span class="text-gavel-yellow font-mono text-xs uppercase">${escapeHtml(item.category || 'Listing')}</span><span class="text-white font-bold">${escapeHtml(item.price)}</span></div>
                        <h3 class="text-xl font-bold text-white">${escapeHtml(item.title)}</h3>
                        <p class="text-gavel-muted text-sm line-clamp-3">${escapeHtml(item.description)}</p>
                    </div>
                </article>`).join('') : '<div class="col-span-full text-center text-gavel-muted font-mono py-16">No active marketplace listings found.</div>';
            window.lucide?.createIcons();
        };
        search?.addEventListener('input', paint);
        listenCollection('marketplaceListings', items => { listings = items; paint(); }, { where: [['status', '==', 'active']], orderBy: ['createdAt', 'desc'] });
    }

    function renderVault() {
        const feed = document.getElementById('vault-feed');
        const input = document.getElementById('vault-input');
        const button = document.getElementById('submit-btn');
        if (!feed || !input) return;
        const submit = async event => {
            event.preventDefault();
            event.stopImmediatePropagation();
            try {
                if (!currentUser) return alert('Please sign in before submitting.');
                const content = input.value.trim();
                if (!content) return;
                if (button) button.disabled = true;
                const ref = rtdb.ref('vault').push();
                await ref.set({
                    title: content.slice(0, 80),
                    content,
                    authorId: currentUser.uid,
                    authorName: currentProfile?.name || 'Anonymous Comrade',
                    timestamp: window.firebase.database.ServerValue.TIMESTAMP,
                    supportCount: 0
                });
                await logActivity('vault_submission', 'New Vault submission received');
                input.value = '';
                input.dispatchEvent(new Event('input'));
            } catch (error) {
                logError('Vault submission failed', error);
                showUserError(getFriendlyErrorMessage(error, 'Could not submit your Vault post. Please try again.'));
            } finally {
                if (button) button.disabled = false;
            }
        };
        input.closest('form')?.addEventListener('submit', submit, true);
        button?.addEventListener('click', submit, true);
        rtdb.ref('vault').orderByChild('timestamp').limitToLast(50).on('value', snap => {
            const posts = Object.entries(snap.val() || {}).map(([id, post]) => ({ id, ...post })).sort((a, b) => b.timestamp - a.timestamp);
            feed.innerHTML = posts.length ? posts.map(post => `
                <article class="border border-gavel-border bg-gavel-card rounded-3xl p-5">
                    <p class="text-white leading-relaxed">${escapeHtml(post.content)}</p>
                    <div class="flex items-center justify-between mt-5 pt-4 border-t border-gavel-border/50">
                        <span class="text-xs text-gavel-muted font-mono">${escapeHtml(post.authorName || 'Anonymous Comrade')}</span>
                        <button data-support="${post.id}" class="text-gavel-yellow text-sm font-bold flex items-center gap-2"><i data-lucide="heart" class="w-4 h-4"></i>${post.supportCount || 0}</button>
                    </div>
                </article>`).join('') : '<div class="text-center text-gavel-muted font-mono py-12">No Vault submissions yet.</div>';
            document.querySelectorAll('[data-support]').forEach(button => button.addEventListener('click', async () => {
                try {
                    if (!currentUser) return alert('Please sign in before supporting.');
                    button.disabled = true;
                    const supportRef = rtdb.ref(`vaultSupports/${button.dataset.support}/${currentUser.uid}`);
                    if ((await supportRef.once('value')).exists()) return;
                    await supportRef.set(true);
                    await rtdb.ref(`vault/${button.dataset.support}/supportCount`).transaction(count => (count || 0) + 1);
                } catch (error) {
                    logError('Vault support failed', error, { postId: button.dataset.support });
                    showUserError(getFriendlyErrorMessage(error, 'Could not support this post. Please try again.'));
                } finally {
                    button.disabled = false;
                }
            }));
            window.lucide?.createIcons();
        });
    }

    async function init() {
        try {
            await ready();
            initAuthForms();
            auth.onAuthStateChanged(async user => {
                try {
                    currentUser = user;
                    currentProfile = user ? await ensureUserDoc(user) : null;
                    bindLogoutButtons();
                } catch (error) {
                    logError('Global auth state handling failed', error);
                    showUserError(getFriendlyErrorMessage(error, 'We could not load your account details. Please refresh the page.'));
                }
            });
            const path = location.pathname;
            if (path.includes('/admin/pages/')) requireAdmin().then(session => { if (session) renderAdminDashboard(); }).catch(error => {
                logError('Admin dashboard authorization failed', error);
                showUserError(getFriendlyErrorMessage(error, 'Could not verify admin access. Please sign in again.'));
            });
            if (path.endsWith('/admin/login.html')) initAdminLogin();
            if (path.endsWith('/gallery.html')) renderGallery();
            if (path.endsWith('/events.html')) renderEvents();
            if (path.endsWith('/societies.html')) renderSocieties();
            if (path.endsWith('/vault.html')) renderVault();
            if (path.endsWith('/marketplace.html')) renderMarketplace();
            if (path.endsWith('/vender-login.html') || path.endsWith('/vender-auth.html') || path.endsWith('/vender-account.html')) initVendorAuth();
            if (path.endsWith('/index.html') || path.endsWith('/homepage.html') || path === '/') renderHomepage();
        } catch (error) {
            logError('Application initialization failed', error);
            showUserError(getFriendlyErrorMessage(error, 'The app could not start. Please check your connection and refresh.'));
        }
    }

    function initVendorAuth() {
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', async event => {
                event.preventDefault();
                event.stopImmediatePropagation();
                const submitButton = form.querySelector('button[type="submit"]');
                const originalButtonHtml = submitButton?.innerHTML;
                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Please wait...';
                    window.lucide?.createIcons();
                }
                const inputs = [...form.querySelectorAll('input')];
                const email = inputs.find(input => input.type === 'email')?.value.trim();
                const password = inputs.find(input => input.type === 'password')?.value;
                const name = document.getElementById('reg-name')?.value.trim()
                    || inputs.find(input => input.placeholder?.toLowerCase().includes('name'))?.value.trim()
                    || '';
                const business = document.getElementById('reg-business')?.value.trim()
                    || inputs.find(input => input.placeholder?.toLowerCase().includes('shop'))?.value.trim()
                    || name;
                try {
                    if (!email || !password) throw new Error('Email and password are required.');
                    let cred;
                    if (name || business) {
                        cred = await auth.createUserWithEmailAndPassword(email, password);
                        await cred.user.updateProfile({ displayName: name || business });
                        await cred.user.sendEmailVerification();
                    } else {
                        cred = await auth.signInWithEmailAndPassword(email, password);
                    }
                    await ensureUserDoc(cred.user, { name: name || business, email });
                    await db.collection('marketplaceProfiles').doc(cred.user.uid).set({
                        uid: cred.user.uid,
                        displayName: business || name || cred.user.displayName || email,
                        phone: '',
                        bio: '',
                        avatar: cred.user.photoURL || ''
                    }, { merge: true });
                    await logActivity('marketplace_profile', `${business || name || 'A seller'} joined the marketplace`);
                    window.location.href = 'marketplace.html';
                } catch (error) {
                    showFormError(form, getAuthErrorMessage(error));
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.innerHTML = originalButtonHtml;
                        window.lucide?.createIcons();
                    }
                }
            }, true);
        });
    }

    function renderAdminDashboard() {
        renderAdminOverview();
        renderAdminEvents();
        renderAdminVendors();
        renderAdminGallery();
    }

    async function renderAdminOverview() {
        try {
            const cards = document.querySelectorAll('#section-overview h3.text-3xl');
            if (!cards.length) return;
            const [users, listings, publishedEvents, clubs, registrations, rsvps, subscribers, vault, eventsSnapshot] = await Promise.all([
                countCollection('users', [['active', '==', true]]),
                countCollection('marketplaceListings', [['status', '==', 'active']]),
                countCollection('events', [['status', '==', 'active'], ['published', '==', true]]),
                countCollection('clubs', [['active', '==', true]]),
                countCollection('eventRegistrations'),
                countCollection('eventRSVPs'),
                countCollection('newsletterSubscribers', [['active', '==', true]]),
                rtdb.ref('vault').once('value').then(snap => Object.keys(snap.val() || {}).length),
                db.collection('events').get()
            ]);

            [users, listings, publishedEvents].forEach((value, index) => {
                if (cards[index]) cards[index].textContent = value;
            });

            const events = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const upcoming = events.filter(normalizeEvent).filter(eventIsUpcoming).length;
            const past = events.filter(normalizeEvent).filter(eventIsPast).length;
            const averageFill = events.filter(event => event.capacity > 0).reduce((sum, event) => sum + (((event.registeredCount || 0) / event.capacity) * 100), 0);
            const fillRate = events.filter(event => event.capacity > 0).length ? Math.round(averageFill / events.filter(event => event.capacity > 0).length) : 0;
            const totalAttendance = events.reduce((sum, event) => sum + Number(event.attendanceCount || 0), 0);
            const attendanceRate = registrations ? Math.round((totalAttendance / registrations) * 100) : 0;
            const topEvents = [...events].sort((a, b) => (b.registeredCount || 0) - (a.registeredCount || 0)).slice(0, 3);

            const overview = document.getElementById('section-overview');
            let analytics = document.getElementById('firebase-analytics-grid');
            if (!analytics && overview) {
                analytics = document.createElement('div');
                analytics.id = 'firebase-analytics-grid';
                analytics.className = 'grid grid-cols-1 md:grid-cols-4 gap-4';
                overview.appendChild(analytics);
            }
            if (analytics) {
                analytics.innerHTML = [
                    ['Clubs', clubs],
                    ['Event Registrations', registrations],
                    ['Event RSVPs', rsvps],
                    ['Attendance rate', `${attendanceRate}%`],
                    ['Upcoming events', upcoming],
                    ['Past events', past],
                    ['Published events', publishedEvents],
                    ['Average fill rate', `${fillRate}%`],
                    ['Active notifications', await countCollection('notifications', [['active', '==', true]])],
                    ['Vault Submissions', vault]
                ].map(([label, value]) => `
                <div class="bg-gavel-card border border-gavel-border rounded-2xl p-5">
                    <p class="text-gavel-muted text-xs font-mono uppercase tracking-widest">${label}</p>
                    <p class="text-2xl font-bold text-white mt-2">${value}</p>
                </div>`).join('');
            }

            let popular = document.getElementById('firebase-popular-events');
            if (!popular && overview) {
                popular = document.createElement('div');
                popular.id = 'firebase-popular-events';
                popular.className = 'grid grid-cols-1 gap-4';
                overview.appendChild(popular);
            }
            if (popular) {
                popular.innerHTML = `
                <div class="bg-gavel-card border border-gavel-border rounded-2xl p-5">
                    <p class="text-gavel-muted text-xs font-mono uppercase tracking-widest">Most popular events</p>
                    ${topEvents.length ? topEvents.map(event => `
                        <div class="mt-4 border-t border-gavel-border pt-4">
                            <p class="text-white font-semibold">${escapeHtml(event.title)}</p>
                            <p class="text-gavel-muted text-xs mt-1">${event.registeredCount || 0} registrations • ${event.goingCount || 0} going • ${event.attendanceCount || 0} attended</p>
                        </div>
                    `).join('') : '<p class="text-gavel-muted text-sm mt-4">No event registrations yet.</p>'}
                </div>`;
            }
        } catch (error) {
            logError('Admin overview render failed', error);
            showUserError(getFriendlyErrorMessage(error, 'Could not load admin overview stats. Please refresh.'));
        }
    }

    function renderAdminEvents() {
        const section = document.getElementById('section-events');
        const form = section?.querySelector('#event-form');
        const saveButton = section?.querySelector('#save-event-btn');
        const resetButton = section?.querySelector('#reset-event-btn');
        const bannerInput = section?.querySelector('#event-banner');
        const bannerUrlInput = section?.querySelector('#event-banner-url');
        const bannerPreview = section?.querySelector('#banner-preview');
        const eventTableBody = section?.querySelector('#admin-event-list-body');
        const registrationModal = document.getElementById('registration-modal');
        const registrationList = document.getElementById('registration-list');
        const registrationTitle = document.getElementById('registration-title');
        const createButton = saveButton;
        if (!section || !form || !saveButton || !eventTableBody) return;

        saveButton.addEventListener('click', event => {
            if (event.target.type === 'submit' && event.target.form !== form) {
                event.preventDefault();
                form.requestSubmit();
            }
        });

        let selectedEventId = null;

        function clearForm() {
            form.reset();
            selectedEventId = null;
            bannerUrlInput.value = '';
            form.querySelector('#event-registered-count').value = '0';
            bannerPreview.style.backgroundImage = '';
            bannerPreview.classList.add('skeleton', 'skeleton-card');
            if (saveButton) saveButton.textContent = 'Create Event';
        }

        function populateForm(event) {
            selectedEventId = event.id;
            form.querySelector('[name="title"]').value = event.title || '';
            form.querySelector('[name="category"]').value = event.category || '';
            form.querySelector('[name="organizer"]').value = event.organizer || '';
            form.querySelector('[name="location"]').value = event.location || '';
            form.querySelector('[name="description"]').value = event.description || '';
            form.querySelector('[name="startDateTime"]').value = event.startDate ? new Date(toDate(event.startDate)).toISOString().slice(0, 16) : '';
            form.querySelector('[name="endDateTime"]').value = event.endDate ? new Date(toDate(event.endDate)).toISOString().slice(0, 16) : '';
            form.querySelector('[name="registrationDeadline"]').value = event.registrationDeadline ? new Date(toDate(event.registrationDeadline)).toISOString().slice(0, 16) : '';
            form.querySelector('#event-capacity').value = event.capacity || 0;
            form.querySelector('#event-featured').checked = !!event.featured;
            form.querySelector('#event-published').checked = !!event.published;
            form.querySelector('#event-status').value = event.status || 'active';
            form.querySelector('#event-registered-count').value = Number(event.registeredCount || 0);
            bannerUrlInput.value = event.bannerUrl || '';
            if (event.bannerUrl) {
                bannerPreview.classList.remove('skeleton', 'skeleton-card');
                bannerPreview.style.backgroundImage = `url('${escapeHtml(event.bannerUrl)}')`;
            } else {
                bannerPreview.classList.add('skeleton', 'skeleton-card');
                bannerPreview.style.backgroundImage = '';
            }
            if (saveButton) saveButton.textContent = 'Update Event';
        }

        async function renderEventTable(events) {
            if (!eventTableBody) return;
            eventTableBody.innerHTML = events.length ? events.sort((a, b) => (toDate(a.startDate)?.getTime() || 0) - (toDate(b.startDate)?.getTime() || 0)).map(event => `
                <tr class="hover:bg-[#1a1a1a]/50 transition-colors">
                    <td class="p-4">
                        <div class="font-semibold text-white">${escapeHtml(event.title)}</div>
                        <div class="text-gavel-muted text-xs">${escapeHtml(event.category || 'General')}</div>
                    </td>
                    <td class="p-4 text-gavel-muted text-sm">${formatDate(event.startDate)} ${formatTime(event.startDate)}</td>
                    <td class="p-4 text-sm"><span class="px-2 py-1 rounded-full bg-[#111] text-xs uppercase tracking-wider ${event.status === 'active' ? 'text-gavel-success' : event.status === 'canceled' ? 'text-gavel-danger' : 'text-gavel-muted'}">${escapeHtml(event.status)}</span></td>
                    <td class="p-4 text-sm"><span class="px-2 py-1 rounded-full bg-[#111] text-xs uppercase tracking-wider ${event.published ? 'text-gavel-yellow' : 'text-gavel-muted'}">${event.published ? 'Published' : 'Hidden'}</span></td>
                    <td class="p-4 text-sm">${event.registeredCount || 0}/${event.capacity || '∞'}</td>
                    <td class="p-4 text-right space-x-2 whitespace-nowrap">
                        <button data-edit-event="${event.id}" class="text-gavel-yellow text-xs font-semibold">Edit</button>
                        <button data-view-registrations="${event.id}" class="text-gavel-muted text-xs font-semibold">View</button>
                        <button data-toggle-publish="${event.id}" class="text-gavel-success text-xs font-semibold">${event.published ? 'Unpublish' : 'Publish'}</button>
                        <button data-delete-event="${event.id}" class="text-gavel-danger text-xs font-semibold">Delete</button>
                    </td>
                </tr>
            `).join('') : '<tr><td colspan="6" class="p-8 text-center text-gavel-muted font-mono">No events available in Firebase.</td></tr>';

            eventTableBody.querySelectorAll('[data-edit-event]').forEach(button => {
                button.addEventListener('click', async () => {
                    try {
                        const eventId = button.dataset.editEvent;
                        const doc = await db.collection('events').doc(eventId).get();
                        if (!doc.exists) return alert('This event could not be found.');
                        populateForm({ id: doc.id, ...doc.data() });
                    } catch (error) {
                        logError('Admin event edit load failed', error, { eventId: button.dataset.editEvent });
                        showUserError(getFriendlyErrorMessage(error, 'Could not load this event for editing.'));
                    }
                });
            });
            eventTableBody.querySelectorAll('[data-delete-event]').forEach(button => {
                button.addEventListener('click', async () => {
                    try {
                        if (!confirm('Delete this event permanently?')) return;
                        if (window.TMG_Data && typeof window.TMG_Data.deleteEvent === 'function') {
                            await window.TMG_Data.deleteEvent(button.dataset.deleteEvent);
                        } else {
                            await db.collection('events').doc(button.dataset.deleteEvent).delete();
                        }
                        await logActivity('event_deleted', `Admin deleted an event`);
                    } catch (error) {
                        logError('Admin event delete failed', error, { eventId: button.dataset.deleteEvent });
                        showUserError(getFriendlyErrorMessage(error, 'Could not delete this event. Please try again.'));
                    }
                });
            });
            eventTableBody.querySelectorAll('[data-toggle-publish]').forEach(button => {
                button.addEventListener('click', async () => {
                    try {
                        const eventId = button.dataset.togglePublish;
                        const doc = await db.collection('events').doc(eventId).get();
                        if (!doc.exists) return alert('This event could not be found.');
                        const published = !doc.data().published;
                        if (window.TMG_Data && typeof window.TMG_Data.updateEvent === 'function') {
                            await window.TMG_Data.updateEvent(eventId, { published });
                        } else {
                            await db.collection('events').doc(eventId).set({ published }, { merge: true });
                        }
                        await logActivity('event_updated', `Admin ${published ? 'published' : 'unpublished'} ${doc.data().title}`);
                    } catch (error) {
                        logError('Admin event publish toggle failed', error, { eventId: button.dataset.togglePublish });
                        showUserError(getFriendlyErrorMessage(error, 'Could not update event publishing. Please try again.'));
                    }
                });
            });
            eventTableBody.querySelectorAll('[data-view-registrations]').forEach(button => {
                button.addEventListener('click', async () => {
                    try {
                        const eventId = button.dataset.viewRegistrations;
                        const eventDoc = await db.collection('events').doc(eventId).get();
                        const regs = await db.collection('eventRegistrations').where('eventId', '==', eventId).orderBy('registeredAt', 'desc').get();
                        const rows = regs.docs.map(reg => ({ id: reg.id, ...reg.data() }));
                        if (!registrationModal || !registrationList || !registrationTitle) return;
                        registrationTitle.textContent = eventDoc.exists ? eventDoc.data().title : 'Event registrations';
                        const attended = rows.filter(reg => reg.attendanceStatus === 'attended').length;
                        registrationList.innerHTML = `
                            <div class="rounded-2xl border border-gavel-border bg-[#101010] p-4 flex flex-wrap items-center justify-between gap-3">
                                <div class="text-sm text-gavel-muted">
                                    <span class="text-white font-bold">${rows.length}</span> registered •
                                    <span class="text-gavel-yellow font-bold">${attended}</span> attended •
                                    <span class="text-white font-bold">${rows.length ? Math.round((attended / rows.length) * 100) : 0}%</span> attendance
                                </div>
                                <button data-export-attendees="${eventId}" class="px-4 py-2 rounded-xl bg-gavel-yellow text-black text-sm font-bold">Export CSV</button>
                            </div>
                            ${rows.length ? rows.map(reg => `
                                <div class="border border-gavel-border/60 rounded-2xl p-4">
                                    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                        <div>
                                            <p class="text-white font-semibold">${escapeHtml(reg.fullName || reg.userName || reg.email || reg.userId)}</p>
                                            <p class="text-gavel-muted text-xs mt-1">${escapeHtml(reg.email || '')} • ${formatDate(reg.registeredAt)} • ${escapeHtml(reg.attendanceStatus || 'pending')}</p>
                                        </div>
                                        <div class="flex flex-wrap gap-2">
                                            <button data-attendance-status="attended" data-registration-id="${reg.id}" data-event-id="${eventId}" class="px-3 py-2 rounded-xl text-xs font-bold ${reg.attendanceStatus === 'attended' ? 'bg-gavel-yellow text-black' : 'bg-white/5 text-gavel-muted border border-gavel-border'}">Attended</button>
                                            <button data-attendance-status="absent" data-registration-id="${reg.id}" data-event-id="${eventId}" class="px-3 py-2 rounded-xl text-xs font-bold ${reg.attendanceStatus === 'absent' ? 'bg-gavel-danger text-white' : 'bg-white/5 text-gavel-muted border border-gavel-border'}">Absent</button>
                                            <button data-attendance-status="pending" data-registration-id="${reg.id}" data-event-id="${eventId}" class="px-3 py-2 rounded-xl text-xs font-bold ${reg.attendanceStatus === 'pending' || !reg.attendanceStatus ? 'bg-white text-black' : 'bg-white/5 text-gavel-muted border border-gavel-border'}">Pending</button>
                                        </div>
                                    </div>
                                </div>
                            `).join('') : '<p class="text-gavel-muted text-sm">No registrations yet.</p>'}`;
                        registrationList.querySelector('[data-export-attendees]')?.addEventListener('click', () => {
                            downloadCsv(`${eventId}-attendees.csv`, [
                                ['Full name', 'Email', 'User ID', 'Registered at', 'Attendance status'],
                                ...rows.map(reg => [
                                    reg.fullName || reg.userName || '',
                                    reg.email || '',
                                    reg.userId || '',
                                    toDate(reg.registeredAt)?.toISOString() || '',
                                    reg.attendanceStatus || 'pending'
                                ])
                            ]);
                        });
                        registrationList.querySelectorAll('[data-attendance-status]').forEach(statusButton => {
                            statusButton.addEventListener('click', async () => {
                                try {
                                    statusButton.disabled = true;
                                    await updateAttendanceStatus(statusButton.dataset.eventId, statusButton.dataset.registrationId, statusButton.dataset.attendanceStatus);
                                    button.click();
                                } catch (error) {
                                    logError('Admin attendance update failed', error, { registrationId: statusButton.dataset.registrationId });
                                    showUserError(getFriendlyErrorMessage(error, 'Could not update attendance. Please try again.'));
                                } finally {
                                    statusButton.disabled = false;
                                }
                            });
                        });
                        registrationModal.classList.remove('hidden');
                    } catch (error) {
                        logError('Admin registrations load failed', error, { eventId: button.dataset.viewRegistrations });
                        showUserError(getFriendlyErrorMessage(error, 'Could not load registrations for this event.'));
                    }
                });
            });
        }

        form.addEventListener('submit', async event => {
            event.preventDefault();
            if (!saveButton) return;
            // Clear previous form errors
            const existingError = form.querySelector('[data-form-error]');
            if (existingError) existingError.remove();

            const originalText = saveButton.innerHTML;
            saveButton.disabled = true;
            saveButton.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Saving...';
            window.lucide?.createIcons();

            try {
                logInfo('Admin event form submit triggered');
                // Build payload and do client-side validation
                const payload = buildEventPayload(form);
                // Basic client-side checks for faster feedback
                const missing = [];
                if (!payload.title) missing.push('Title');
                if (!payload.description) missing.push('Description');
                if (!payload.category) missing.push('Category');
                if (!payload.location) missing.push('Location');
                if (!payload.organizer) missing.push('Organizer');
                if (!payload.startDate) missing.push('Start date/time');
                if (!payload.endDate) missing.push('End date/time');
                if (!payload.registrationDeadline) missing.push('Registration deadline');
                if (payload.capacity < 1) missing.push('Capacity (should be at least 1 or left as unlimited)');
                if (missing.length) throw new Error('Missing or invalid: ' + missing.join(', '));

                // If a new banner file was selected but not yet uploaded, upload it now
                if (bannerInput?.files?.length) {
                    const file = bannerInput.files[0];
                    // If bannerUrlInput already has the uploaded url, skip
                    if (!bannerUrlInput.value) {
                        const url = await uploadToImgBB(file);
                        bannerUrlInput.value = url;
                        bannerPreview.classList.remove('skeleton', 'skeleton-card');
                        bannerPreview.style.backgroundImage = `url('${escapeHtml(url)}')`;
                        payload.bannerUrl = url;
                    } else {
                        payload.bannerUrl = bannerUrlInput.value;
                    }
                } else if (bannerUrlInput?.value) {
                    payload.bannerUrl = bannerUrlInput.value;
                }

                let id;
                if (window.TMG_Data && typeof window.TMG_Data.createEvent === 'function') {
                    if (selectedEventId) {
                        await window.TMG_Data.updateEvent(selectedEventId, payload);
                        id = selectedEventId;
                    } else {
                        id = await window.TMG_Data.createEvent(payload);
                    }
                } else {
                    // Fallback to local implementation
                    id = await saveEventToFirestore(selectedEventId, payload);
                }

                await logActivity(selectedEventId ? 'event_updated' : 'event_created', `Admin saved event ${payload.title}`);
                showFormError(form, `Event ${selectedEventId ? 'updated' : 'created'} successfully.`);
                clearForm();
                // Keep icons updated
                window.lucide?.createIcons();
                return id;
            } catch (error) {
                const msg = getFriendlyErrorMessage(error) || (error.message || 'Unable to save event.');
                showFormError(form, msg);
                logError('Admin event save failed', error, { title: form.querySelector('[name="title"]').value });
            } finally {
                saveButton.disabled = false;
                saveButton.innerHTML = originalText;
                window.lucide?.createIcons();
            }
        });

        resetButton?.addEventListener('click', event => {
            event.preventDefault();
            clearForm();
        });

        bannerInput?.addEventListener('change', async () => {
            if (!bannerInput.files?.length) return;
            const file = bannerInput.files[0];
            try {
                const url = await uploadToImgBB(file);
                bannerUrlInput.value = url;
                bannerPreview.classList.remove('skeleton', 'skeleton-card');
                bannerPreview.style.backgroundImage = `url('${escapeHtml(url)}')`;
            } catch (error) {
                showFormError(form, getFriendlyErrorMessage(error, 'Banner upload failed.'));
            }
        });

        document.querySelectorAll('[data-close-registration-modal]').forEach(btn => btn.addEventListener('click', () => {
            registrationModal?.classList.add('hidden');
        }));

        listenCollection('events', events => {
            renderEventTable(events.map(normalizeEvent));
            renderAdminOverview();
        }, { orderBy: ['startDate', 'desc'] });

        // Initialize the premium event form
        if (typeof window.initPremiumEventForm === 'function') {
            window.initPremiumEventForm();
        }
    }

    function renderAdminVendors() {
        const tbody = document.querySelector('#section-vendors tbody');
        if (!tbody) return;
        listenCollection('marketplaceListings', listings => {
            tbody.innerHTML = listings.length ? listings.map(item => `
                <tr class="hover:bg-[#1a1a1a]/50 transition-colors">
                    <td class="p-4">
                        <div class="flex items-center gap-3">
                            <img src="${escapeHtml(item.imageUrl || 'https://ui-avatars.com/api/?name=Listing&background=121212&color=FFDE00')}" class="w-8 h-8 rounded-full object-cover">
                            <div>
                                <p class="text-white font-bold text-sm">${escapeHtml(item.title)}</p>
                                <p class="text-gavel-muted text-xs">${escapeHtml(item.sellerId)}</p>
                            </div>
                        </div>
                    </td>
                    <td class="p-4 text-gavel-muted text-sm">${escapeHtml(item.category)}</td>
                    <td class="p-4 text-center text-white text-sm">1</td>
                    <td class="p-4"><span class="text-xs font-mono px-2 py-1 rounded bg-white/5 text-gavel-yellow">${escapeHtml(item.status || 'active')}</span></td>
                    <td class="p-4 text-right">
                        <button data-admin-sold="${item.id}" class="text-gavel-muted hover:text-white text-sm">Mark Sold</button>
                    </td>
                </tr>`).join('') : '<tr><td colspan="5" class="p-8 text-center text-gavel-muted font-mono">No marketplace listings in Firebase.</td></tr>';
            document.querySelectorAll('[data-admin-sold]').forEach(button => button.addEventListener('click', async () => {
                try {
                    await db.collection('marketplaceListings').doc(button.dataset.adminSold).set({ status: 'sold' }, { merge: true });
                } catch (error) {
                    logError('Admin marketplace status update failed', error, { listingId: button.dataset.adminSold });
                    showUserError(getFriendlyErrorMessage(error, 'Could not update this listing. Please try again.'));
                }
            }));
        }, { orderBy: ['createdAt', 'desc'] });
    }

    function renderAdminGallery() {
        const grid = document.getElementById('gallery-grid');
        const dropzone = grid?.previousElementSibling;
        if (!grid || !dropzone) return;
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.hidden = true;
        document.body.appendChild(fileInput);
        dropzone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async () => {
            try {
                const file = fileInput.files?.[0];
                if (!file) return;
                const title = prompt('Image title') || file.name;
                const category = prompt('Category', 'general') || 'general';
                const imageUrl = await uploadToImgBB(file);
                await db.collection('gallery').add({
                    title,
                    description: '',
                    imageUrl,
                    category,
                    featured: false,
                    visible: true,
                    uploadedBy: currentUser.uid,
                    uploadedAt: window.firebase.firestore.FieldValue.serverTimestamp()
                });
                await logActivity('gallery_upload', `Admin uploaded ${title}`);
                fileInput.value = '';
            } catch (error) {
                logError('Admin gallery upload failed', error);
                showUserError(getFriendlyErrorMessage(error, 'Could not upload this image. Please try again.'));
            }
        });
        listenCollection('gallery', items => {
            grid.innerHTML = items.length ? items.map(item => `
                <div class="draggable-item relative group rounded-xl overflow-hidden border border-gavel-border bg-black aspect-square transition-all hover:border-gavel-yellow">
                    <img src="${escapeHtml(item.imageUrl)}" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity">
                    <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                        <span class="bg-gavel-yellow text-black text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase">${escapeHtml(item.category)}</span>
                        <div class="flex gap-2 mt-1">
                            <button data-gallery-toggle="${item.id}" class="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-white/10 text-white flex items-center justify-center hover:bg-gavel-yellow hover:text-black transition-colors" title="Hide or show"><i data-lucide="${item.visible === false ? 'eye' : 'eye-off'}" class="w-4 h-4"></i></button>
                            <button data-gallery-delete="${item.id}" class="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-white/10 text-white flex items-center justify-center hover:bg-gavel-danger transition-colors" title="Delete"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                        </div>
                    </div>
                </div>`).join('') : '<div class="col-span-full text-center text-gavel-muted font-mono p-8">No gallery images in Firebase.</div>';
            document.querySelectorAll('[data-gallery-toggle]').forEach(button => button.addEventListener('click', async () => {
                try {
                    const item = items.find(row => row.id === button.dataset.galleryToggle);
                    await db.collection('gallery').doc(button.dataset.galleryToggle).set({ visible: item?.visible === false }, { merge: true });
                } catch (error) {
                    logError('Admin gallery visibility toggle failed', error, { galleryId: button.dataset.galleryToggle });
                    showUserError(getFriendlyErrorMessage(error, 'Could not update this image. Please try again.'));
                }
            }));
            document.querySelectorAll('[data-gallery-delete]').forEach(button => button.addEventListener('click', async () => {
                try {
                    if (confirm('Delete this image record?')) await db.collection('gallery').doc(button.dataset.galleryDelete).delete();
                } catch (error) {
                    logError('Admin gallery delete failed', error, { galleryId: button.dataset.galleryDelete });
                    showUserError(getFriendlyErrorMessage(error, 'Could not delete this image. Please try again.'));
                }
            }));
            window.lucide?.createIcons();
        }, { orderBy: ['uploadedAt', 'desc'] });
    }

    function initAdminLogin() {
        window.handleAdminAuth = async event => {
            event.preventDefault();
            try {
                const [emailInput, passwordInput] = event.target.querySelectorAll('input');
                const cred = await auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value);
                const profile = await ensureUserDoc(cred.user);
                if (profile.role !== 'admin') {
                    await auth.signOut();
                    alert('This account is not an admin.');
                    return;
                }
                window.location.href = 'pages/admin.html';
            } catch (error) {
                logError('Admin login failed', error);
                showUserError(getFriendlyErrorMessage(error, 'Could not sign in as admin. Please check your details.'), event.target);
            }
        };
    }

    window.TMG = { ready, requireAuth, requireAdmin, uploadToImgBB, logActivity, countCollection, listenCollection };
    document.addEventListener('DOMContentLoaded', init);
})();
