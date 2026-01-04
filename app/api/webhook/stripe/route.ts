import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, setDoc, Timestamp } from 'firebase/firestore';

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

                // Update (or Create) Firestore Document
                const bookingRef = doc(db, 'bookings', bookingId);
                await setDoc(bookingRef, {
                    status: 'paid',
                    paidAt: Timestamp.now(),
                    stripeSessionId: session.id,
                }, { merge: true });
                console.log('Firestore updated/created to paid status.');

                // Send LINE Notification (Dynamic Provider)
                const userId = session.metadata?.userId;
                const providerId = session.metadata?.providerId;

                if (userId && providerId) {
                    try {
                        // Fetch Provider Config for LINE Token
                        const { getProviderConfig } = await import('@/utils/provider'); // Dynamic import to avoid circular dep if any
                        const config = await getProviderConfig(providerId);

                        const channelAccessToken = config?.lineAccessToken;

                        if (channelAccessToken) {
                            const messageResponse = await fetch('https://api.line.me/v2/bot/message/push', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${channelAccessToken}`,
                                },
                                body: JSON.stringify({
                                    to: userId,
                                    messages: [
                                        {
                                            type: 'text',
                                            text: 'ご予約・お支払いが完了しました！\n当日はお気をつけてお越しください。',
                                        },
                                    ],
                                }),
                            });

                            if (!messageResponse.ok) {
                                console.error('LINE API Error:', await messageResponse.text());
                            } else {
                                console.log(`LINE notification sent to user ${userId} for provider ${providerId}.`);
                            }
                        } else {
                            console.error(`LINE Access Token missing for provider ${providerId}`);
                        }

                    } catch (lineError) {
                        console.error('Failed to send LINE message:', lineError);
                    }
                } else {
                    console.log('Skipping LINE notification: Missing userId or providerId');
                }
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
