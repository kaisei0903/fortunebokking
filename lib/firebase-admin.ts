import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

export function getAdminApp() {
    const apps = getApps();
    if (apps.length > 0) {
        return apps[0];
    }

    // Check if credentials are properly set
    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
        console.warn('Firebase Admin credentials are missing. Check environment variables.');
        // Return existing app or null to avoid crash during build
        return apps.length > 0 ? apps[0] : null;
    }

    try {
        return initializeApp({
            credential: cert(serviceAccount),
        });
    } catch (e) {
        console.error('Firebase Admin Init Error:', e);
        return null;
    }
}

const app = getAdminApp();
// Export services with null check/fallback if needed (though usually we want them to fail if no db)
// For build time safety, we cast or handle carefully.
export const adminDb = app ? getFirestore(app) : {} as FirebaseFirestore.Firestore;
export const adminAuth = app ? getAuth(app) : {} as import('firebase-admin/auth').Auth;
