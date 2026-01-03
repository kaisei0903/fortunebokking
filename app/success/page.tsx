import Link from 'next/link';

export default function SuccessPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
            <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">予約完了</h1>
                <p className="text-gray-600 mb-6">
                    お支払いが完了しました。<br />
                    当日はお時間になりましたら所定の場所へお越しください。
                </p>
                <Link
                    href="/"
                    className="inline-block bg-purple-600 text-white px-6 py-2 rounded-full font-bold hover:bg-purple-700 transition"
                >
                    ホームに戻る
                </Link>
            </div>
        </div>
    );
}
