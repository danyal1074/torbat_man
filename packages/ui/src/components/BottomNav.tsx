import React from 'react';
import { Home, LayoutGrid, ClipboardList, Bell, User } from 'lucide-react';
export type NavTab = 'home' | 'services' | 'requests' | 'notifications' | 'profile';
export interface BottomNavProps {
    currentTab: NavTab;
    onTabChange: (tab: NavTab) => void;
    unreadNotifications?: number;
    className?: string;
}
export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange, unreadNotifications = 0, className = '', }) => {
    const tabs: Array<{
        id: NavTab;
        label: string;
        icon: React.ComponentType<{
            className?: string;
        }>;
    }> = [
        { id: 'home', label: 'خانه', icon: Home },
        { id: 'services', label: 'خدمات', icon: LayoutGrid },
        { id: 'requests', label: 'درخواست‌ها', icon: ClipboardList },
        { id: 'notifications', label: 'اعلان‌ها', icon: Bell },
        { id: 'profile', label: 'حساب من', icon: User },
    ];
    return (<nav className={`fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#E9E6EE] px-4 py-2 flex items-center justify-around z-50 shadow-lg ${className}`} style={{ maxWidth: '480px', margin: '0 auto' }}>
      {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (<button key={tab.id} type="button" onClick={() => onTabChange(tab.id)} className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 min-h-[44px] min-w-[56px] relative active:scale-95 ${isActive ? 'text-[#6F248E]' : 'text-slate-400 hover:text-slate-600'}`}>
            <div className="relative">
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`}/>
              {tab.id === 'notifications' && unreadNotifications > 0 && (<span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white"/>)}
            </div>
            <span className={`text-[10px] mt-1 ${isActive ? 'font-bold' : 'font-medium'}`}>
              {tab.label}
            </span>
          </button>);
        })}
    </nav>);
};
