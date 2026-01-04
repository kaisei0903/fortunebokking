'use server';

import { headers } from 'next/headers';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import { Booking } from '@/types';
import { getProviderConfig } from '@/utils/provider';

// Debug action
export async function checkServerConfig() {
    console.log('--- checkServerConfig called ---');
    const hasStripe = !!process.env.STRIPE_SECRET_KEY;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    console.log('Server - Has Stripe:', hasStripe);
    console.log('Server - Base URL:', baseUrl);
    return {
        status: 'ok',
        hasStripe,
        baseUrl,
        message: 'Server connection successful'
    };
}

export async function createBookingAndPayment(
    bookingData: Omit<Booking, 'id' | 'status' | 'createdAt'> & { providerId: string }
): Promise<{ url: string | null; error?: string }> {
    console.log('--- createBookingAndPayment started ---');
    console.log(`Provider ID: ${bookingData.providerId}`);

    // fetch Provider Config
    const config = await getProviderConfig(bookingData.providerId);
    if (!config) {
        return { url: null, error: '占い師の設定が見つかりません。IDを確認してください。' };
    }

    // Dynamic Base URL resolution via Headers (Next.js 15+ compatible)
    let baseUrl = 'http://localhost:3000'; // Default fallback
    try {
        const headerList = await headers();
        const origin = headerList.get('origin');
        const host = headerList.get('host');
        const protocol = headerList.get('x-forwarded-proto') || 'http';

        if (origin) {
            baseUrl = origin;
        } else if (host) {
            baseUrl = `${protocol}://${host}`;
        }
        console.log(`Resolved Dynamic Base URL: "${baseUrl}"`);
    } catch (e) {
        console.warn('Failed to resolve headers, using fallback:', e);
    }

    // Validate BaseUrl sanity
    if (!baseUrl.startsWith('http')) {
        baseUrl = `http://${baseUrl}`;
    }

    const apiKey = process.env.STRIPE_SECRET_KEY;
    console.log('Has Stripe Key:', !!apiKey);

    if (!apiKey) {
        console.error('Stripe Secret Key is missing');
        return { url: null, error: 'Server configuration error' };
    }

    // Initialize Stripe server-side (lazy init)
    const stripe = new Stripe(apiKey, {
        apiVersion: '2025-12-15.clover',
    });

    // 1. Prepare Firestore Reference (Generate ID upfront)
    const bookingRef = doc(collection(db, 'bookings'));
    const bookingId = bookingRef.id;
    console.log('Generated Booking ID:', bookingId);

    // Timeout wrapper for Firestore operation
    const saveToFirestore = async () => {
        await setDoc(bookingRef, {
            ...bookingData,
            status: 'pending',
            createdAt: Timestamp.now(),
        });
        return bookingId;
    };

    const timeout = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore operation timed out')), 5000)
    );

    try {
        await Promise.race([saveToFirestore(), timeout]);
        console.log('Saved to Firestore successfully.');
    } catch (dbError) {
        console.error('Firestore Error (Non-fatal, proceeding to payment):', dbError);
        // We proceed with the SAME bookingId, so webhook can still recover the record
    }

    try {
        // 2. Create Stripe Checkout Session
        console.log('Creating Stripe Session...');
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'jpy',
                        product_data: {
                            name: bookingData.menuName,
                            metadata: {
                                menuId: bookingData.menuId,
                            },
                        },
                        unit_amount: bookingData.price,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingId}`,
            cancel_url: `${baseUrl}?canceled=true`,
            metadata: {
                bookingId: bookingId,
                userId: bookingData.userId,
                providerId: bookingData.providerId, // Save providerId for Webhook
            },
            payment_intent_data: {
                application_fee_amount: Math.floor(bookingData.price * 0.1), // 10% Platform Fee
                transfer_data: {
                    destination: config.stripeAccountId, // Dynamic destination
                },
            },
        });

        console.log('Stripe Session Created:', session.url);
        return { url: session.url };
    } catch (error) {
        console.error('Error creating booking:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { url: null, error: `Failed to create booking session: ${errorMessage}` };
    }
}
