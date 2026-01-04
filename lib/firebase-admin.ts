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
        // In development without keys, this might be called but will fail on usage if not handled.
        // However, for this requirement, we assume keys are/will be set.
        console.warn('Firebase Admin credentials are missing. Check environment variables.');
    }

    return initializeApp({
        credential: cert(serviceAccount),
    });
}

const app = getAdminApp();
export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
