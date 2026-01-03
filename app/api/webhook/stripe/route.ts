import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';

// Initialize Stripe directly to ensure we have the node functionality
// (Referencing the same key as actions.ts)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-15.clover',
});

export async function POST(req: Request) {
    const body = await req.text();
    const signature = (await headers()).get('stripe-signature') as string;

    let event: Stripe.Event;

    try {
        if (!process.env.STRIPE_WEBHOOK_SECRET) {
            console.error('Missing STRIPE_WEBHOOK_SECRET');
            return NextResponse.json({ error: 'Server Configuration Error' }, { status: 500 });
        }

        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err: any) {
        console.error(`Webhook Signature Verification Failed: ${err.message}`);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    try {
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
            const bookingId = session.metadata?.bookingId;

            if (bookingId) {
                console.log(`Payment successful for booking: ${bookingId}`);

                // Update Firestore
                const bookingRef = doc(db, 'bookings', bookingId);
                await updateDoc(bookingRef, {
                    status: 'paid',
                    paidAt: Timestamp.now(),
                    stripeSessionId: session.id,
                });
                console.log('Firestore updated to paid status.');
            } else {
                console.warn('No bookingId found in session metadata');
            }
        }
    } catch (error) {
        console.error('Error processing webhook:', error);
        return NextResponse.json({ error: 'Error processing event' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}
