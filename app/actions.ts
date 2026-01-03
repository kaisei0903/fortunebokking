'use server';

import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { Booking } from '@/types';

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
    bookingData: Omit<Booking, 'id' | 'status' | 'createdAt'>
): Promise<{ url: string | null; error?: string }> {
    console.log('--- createBookingAndPayment started ---');

    const apiKey = process.env.STRIPE_SECRET_KEY;
    console.log('Has Stripe Key:', !!apiKey);

    if (!apiKey) {
        console.error('Stripe Secret Key is missing in .env.local');
        return { url: null, error: 'Server Configuration Error: Stripe Key missing' };
    }

    // Initialize Stripe server-side (lazy init)
    const stripe = new Stripe(apiKey, {
        apiVersion: '2025-12-15.clover',
    });

    try {
        // 1. Save to Firestore with 'pending' status
        console.log('Saving to Firestore...');

        // Timeout wrapper for Firestore operation
        const saveToFirestore = async () => {
            const docRef = await addDoc(collection(db, 'bookings'), {
                ...bookingData,
                status: 'pending',
                createdAt: Timestamp.now(),
            });
            return docRef.id;
        };

        const timeout = new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error('Firestore operation timed out')), 5000)
        );

        let bookingId = 'unknown_id';
        try {
            bookingId = await Promise.race([saveToFirestore(), timeout]);
            console.log('Saved to Firestore ID:', bookingId);
        } catch (dbError) {
            console.error('Firestore Error (Non-fatal for payment):', dbError);
            // Fallback to mock ID to allow payment to proceed even if DB fails
            bookingId = 'backup_id_' + Date.now();
        }

        // Determine Base URL safe
        let baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim();
        if (!baseUrl || !baseUrl.startsWith('http')) {
            console.warn('Invalid or missing NEXT_PUBLIC_BASE_URL, falling back to localhost:3000');
            baseUrl = 'http://localhost:3000';
        }
        // Remove trailing slash if present
        if (baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
        }

        console.log(`Using Base URL: "${baseUrl}"`);

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
            // Hardcoded for debugging to ensure valid URL
            success_url: `http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingId}`,
            cancel_url: `http://localhost:3000?canceled=true`,
            metadata: {
                bookingId: bookingId,
                userId: bookingData.userId,
            },
        });

        console.log('Stripe Session Created:', session.url);
        return { url: session.url };
    } catch (error: any) {
        console.error('Error creating booking:', error);
        return { url: null, error: error.message };
    }
}
