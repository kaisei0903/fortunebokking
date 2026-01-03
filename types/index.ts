export interface Booking {
    id?: string;
    userId: string;
    userName: string;
    menuId: 'tarot' | 'palm' | 'full';
    menuName: string;
    date: string;
    price: number;
    status: 'pending' | 'paid' | 'cancelled';
    createdAt: number; // timestamp
}

export type MenuOption = {
    id: 'tarot' | 'palm' | 'full';
    name: string;
    price: number;
    description: string;
};

export const MENUS: MenuOption[] = [
    { id: 'tarot', name: 'タロット占い', price: 3000, description: 'カードで現在と未来を占います' },
    { id: 'palm', name: '手相占い', price: 5000, description: '手のひらから運命を読み解きます' },
    { id: 'full', name: '総合鑑定', price: 10000, description: '多角的な視点で深く鑑定します' },
];
