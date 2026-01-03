'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import liff from '@line/liff';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { createBookingAndPayment, checkServerConfig } from './actions';
import { MENUS, MenuOption } from '@/types';

type UserProfile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
};

export default function Home() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedMenu, setSelectedMenu] = useState<MenuOption | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize LIFF
  useEffect(() => {
    const initLiff = async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) {
          console.warn('LIFF ID is not set');
          return;
        }
        await liff.init({ liffId });
        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          setProfile({
            userId: profile.userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl,
          });
        } else {
          // Automatic login in LIFF browser, or manual trigger
          if (liff.isInClient()) {
            // Usually auto logged in
          }
        }
      } catch (e) {
        console.error('LIFF init failed', e);
      }
    };
    initLiff();
  }, []);

  const handleLogin = () => {
    // Development Mock Login
    if (process.env.NODE_ENV === 'development') {
      setProfile({
        userId: 'mock-user-id',
        displayName: 'テスト太郎',
        pictureUrl: undefined,
      });
      return;
    }

    if (!liff.isLoggedIn()) {
      liff.login();
    }
  };

  const handleBooking = async () => {
    if (!profile || !selectedDate || !selectedMenu) {
      alert('プロフィール、日付、メニューが正しく選択されていません。');
      setError('すべて入力してください');
      return;
    }

    // Debug: Check server connection first
    if (confirm('デバッグ: サーバー接続テストを実行しますか？')) {
      try {
        const serverStatus = await checkServerConfig();
        alert(`サーバー接続成功:\nStripeキー: ${serverStatus.hasStripe ? 'あり' : 'なし'}\nBase URL: ${serverStatus.baseUrl}\n${serverStatus.message}`);
        if (!serverStatus.hasStripe) return;
      } catch (e) {
        alert('サーバー接続失敗: ' + String(e));
        return;
      }
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('Resuesting booking...', {
        userId: profile.userId,
        menuId: selectedMenu.id,
        date: selectedDate
      });

      const result = await createBookingAndPayment({
        userId: profile.userId,
        userName: profile.displayName, // profile.displayName might be causing issues?
        menuId: selectedMenu.id,
        menuName: selectedMenu.name,
        date: selectedDate,
        price: selectedMenu.price,
      });

      console.log('Booking result:', result);

      if (result.error) {
        alert('Server returned error: ' + result.error);
        setError(result.error);
      } else if (result.url) {
        // Redirect to Stripe
        window.location.href = result.url;
      }
    } catch (e) {
      console.error(e);
      alert('Client Catch Error: ' + String(e));
      setError('予約処理中にエラーが発生しました: ' + String(e));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 pb-20">

      {/* Header */}
      <header className="bg-purple-900 text-white p-4 shadow-md sticky top-0 z-10">
        <h1 className="text-xl font-bold text-center">Fortune Booking</h1>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-8">

        {/* User Profile */}
        <section className="bg-white p-4 rounded-xl shadow-sm">
          <h2 className="text-sm text-gray-500 font-bold mb-3 uppercase tracking-wider">ご予約者様</h2>
          {profile ? (
            <div className="flex items-center gap-4">
              {profile.pictureUrl ? (
                <Image
                  src={profile.pictureUrl}
                  alt={profile.displayName}
                  width={48}
                  height={48}
                  className="rounded-full border-2 border-purple-100"
                />
              ) : (
                <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center text-purple-700 font-bold">
                  {profile.displayName[0]}
                </div>
              )}
              <div className="font-bold text-gray-800">{profile.displayName}</div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 mb-4">予約にはLINEログインが必要です</p>
              <button
                onClick={handleLogin}
                className="bg-[#06C755] text-white px-6 py-2 rounded-full font-bold hover:bg-[#05b34c] transition"
              >
                LINEでログイン
              </button>
            </div>
          )}
        </section>

        {/* Date Selection */}
        <section className="bg-white p-4 rounded-xl shadow-sm">
          <h2 className="text-sm text-gray-500 font-bold mb-3 uppercase tracking-wider">日程選択</h2>
          <input
            type="datetime-local"
            className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800"
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </section>

        {/* Menu Selection */}
        <section>
          <h2 className="text-sm text-gray-500 font-bold mb-3 uppercase tracking-wider ml-1">メニュー選択</h2>
          <div className="space-y-3">
            {MENUS.map((menu) => (
              <div
                key={menu.id}
                onClick={() => setSelectedMenu(menu)}
                className={`p-4 rounded-xl border-2 transition cursor-pointer bg-white relative overflow-hidden ${selectedMenu?.id === menu.id
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-transparent shadow-sm hover:border-gray-200'
                  }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-bold text-lg text-gray-800">{menu.name}</h3>
                  <span className="font-bold text-purple-700">¥{menu.price.toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-500">{menu.description}</p>
                {selectedMenu?.id === menu.id && (
                  <div className="absolute top-2 right-2 w-4 h-4 bg-purple-600 rounded-full" />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
            {error}
          </div>
        )}

      </div>

      {/* Footer / CTA */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 p-4 pb-8 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleBooking}
            disabled={isLoading || !profile}
            className={`w-full py-4 rounded-xl font-bold text-white text-lg transition shadow-lg ${isLoading || !profile
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-[0.98]'
              }`}
          >
            {isLoading ? '処理中...' : '予約して支払う'}
          </button>
        </div>
      </div>
    </main>
  );
}
