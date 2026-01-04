import { adminDb } from '@/lib/firebase-admin';

export interface ProviderConfig {
    displayName: string;
    lineChannelSecret: string;
    lineAccessToken: string;
    stripeAccountId: string;
    stripeWebhookSecret: string;
}

export async function getProviderConfig(providerId: string): Promise<ProviderConfig | null> {
    if (!providerId) return null;

    try {
        const docRef = adminDb.collection('users').doc(providerId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            console.warn(`Provider not found: ${providerId}`);
            return null;
        }

        const data = docSnap.data();
        if (!data) return null;

        // Ensure all required fields exist
        if (!data.line_channel_secret || !data.line_access_token || !data.stripe_account_id) {
            console.warn(`Provider ${providerId} is missing required config fields.`);
            // We might return partial or null, strict validation here:
            // Allow partial for now if some features aren't used, but typically we need them.
        }

        return {
            displayName: data.display_name || 'Unknown Fortune Teller',
            lineChannelSecret: data.line_channel_secret,
            lineAccessToken: data.line_access_token,
            stripeAccountId: data.stripe_account_id,
            stripeWebhookSecret: data.stripe_webhook_secret,
        };
    } catch (error) {
        console.error(`Error fetching provider config for ${providerId}:`, error);
        return null;
    }
}
