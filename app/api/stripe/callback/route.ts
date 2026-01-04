import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';

// Initialize Stripe (using the same secret key as actions.ts)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-15.clover',
});

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // This is the providerId
    const error = searchParams.get('error');
    const error_description = searchParams.get('error_description');

    if (error) {
        return NextResponse.json({ error, description: error_description }, { status: 400 });
    }

    if (!code || !state) {
        return NextResponse.json({ error: 'Missing code or state (providerId)' }, { status: 400 });
    }

    try {
        // Exchange authorization code for access token
        const response = await stripe.oauth.token({
            grant_type: 'authorization_code',
            code,
        });

        const connectedAccountId = response.stripe_user_id;
        const providerId = state;

        console.log(`Stripe Connected: Provider ${providerId} -> Account ${connectedAccountId}`);

        // Update Firestore via Admin SDK
        const userRef = adminDb.collection('users').doc(providerId);

        // Check if user exists first to be safe (optional, but good practice)
        // For onboarding, we assume the user might already exist or we are creating a stub.
        // But requirement says "update".
        await userRef.set({
            stripe_account_id: connectedAccountId,
            updatedAt: new Date().toISOString(),
        }, { merge: true });

        // Success Response
        return new NextResponse(`
            <html>
                <head><title>Connection Successful</title></head>
                <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                    <h1 style="color: #4caf50;">連携完了！</h1>
                    <p>Stripeアカウントの接続が完了しました。</p>
                    <p>Provider ID: <strong>${providerId}</strong></p>
                    <p>Stripe Account: <strong>${connectedAccountId}</strong></p>
                    <p>このタブを閉じてください。</p>
                </body>
            </html>
        `, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });

    } catch (err: any) {
        console.error('Stripe OAuth Error:', err);
        return NextResponse.json({ error: 'OAuth Failed', details: err.message }, { status: 500 });
    }
}
