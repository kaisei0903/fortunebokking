import { redirect } from 'next/navigation';

export default async function AdminConnectPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams;
    const providerId = searchParams.id as string;

    if (!providerId) {
        return (
            <div className="p-8 text-center text-red-600">
                Error: No Provider ID provided. Use ?id=tanaka
            </div>
        );
    }

    const clientId = process.env.STRIPE_CLIENT_ID;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/stripe/callback`;

    if (!clientId) {
        return (
            <div className="p-8 text-center text-red-600">
                Error: STRIPE_CLIENT_ID is not configured in environment variables.
            </div>
        );
    }

    // Construct Stripe OAuth URL
    const stripeConnectUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_write&state=${providerId}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
                <h1 className="text-2xl font-bold mb-6 text-gray-800">
                    Stripeアカウント連携
                </h1>
                <p className="text-gray-600 mb-8">
                    ID: <span className="font-mono font-bold text-gray-900">{providerId}</span><br />
                    下のボタンを押して、売上受け取り用のStripeアカウントを接続してください。
                </p>

                <a
                    href={stripeConnectUrl}
                    className="inline-block bg-[#635bff] text-white font-bold py-3 px-6 rounded-md hover:bg-[#544eef] transition shadow-md"
                >
                    Stripeと連携する
                </a>
            </div>
        </div>
    );
}
