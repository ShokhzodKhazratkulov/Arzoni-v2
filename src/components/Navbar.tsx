import { useTranslation } from 'react-i18next';
import { MapPin, LogIn, LogOut, ShieldCheck, User } from 'lucide-react';
import { Language } from '../types';
import { useAuth } from '../lib/AuthContext';

interface NavbarProps {
  onAdminClick?: () => void;
}

export default function Navbar({ onAdminClick }: NavbarProps) {
  const { t, i18n } = useTranslation();
  const { user, isAdmin, signInWithGoogle, signOut } = useAuth();

  const changeLanguage = (lng: Language) => {
    i18n.changeLanguage(lng);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm px-3 sm:px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo - Left aligned */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-10 h-10 bg-[#1D9E75] rounded-lg flex items-center justify-center text-white shadow-md shrink-0">
            <MapPin size={24} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center">
              <div className="flex flex-col items-center mr-2 leading-none">
                <span className="text-[10px] font-bold text-gray-900 leading-none">{t('categoryFood')}</span>
                <div className="w-full border-t border-gray-900 my-px" />
                <span className="text-[10px] font-bold text-gray-900 leading-none">{t('categoryClothes')}</span>
              </div>
              <h1 className="text-[26px] font-black text-gray-900 leading-none tracking-tighter">
                {t('appName')}
              </h1>
            </div>
            {/* Tagline */}
            <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium mt-0.5">
              <span className="whitespace-nowrap">{t('taglinePart1')}</span>
              <span className="font-bold text-gray-700">
                {t('foodItem')}/{t('clothesItem')}
              </span>
              <span className="whitespace-nowrap">{t('taglinePart2')}</span>
            </div>
          </div>
        </div>

        {/* Right side: Admin, Auth, and Language */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Admin Dashboard Link (Visible only to Admin) */}
          {isAdmin && (
            <button 
              onClick={onAdminClick}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 text-[10px] font-black uppercase tracking-wider hover:bg-amber-100 transition-colors"
            >
              <ShieldCheck size={14} />
              {t('adminDashboard')}
            </button>
          )}

          {/* Auth Button */}
          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col items-end leading-tight">
                  <span className="text-[10px] font-bold text-gray-900 line-clamp-1">{user.user_metadata?.full_name || user.email}</span>
                  {isAdmin && <span className="text-[8px] font-black text-amber-600 uppercase tracking-tighter">Admin</span>}
                </div>
                <button 
                  onClick={() => signOut()}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title={t('logout')}
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => signInWithGoogle()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-600 rounded-xl border border-gray-200 text-[10px] font-black uppercase tracking-wider hover:bg-gray-100 transition-colors"
              >
                <LogIn size={14} />
                <span className="hidden sm:inline">{t('login')}</span>
              </button>
            )}
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-1 bg-gray-50 p-0.5 rounded-full border border-gray-200">
            <button
              onClick={() => changeLanguage('uz')}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                i18n.language === 'uz' ? 'bg-white text-[#1D9E75] shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              UZ
            </button>
            <button
              onClick={() => changeLanguage('ru')}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                i18n.language === 'ru' ? 'bg-white text-[#1D9E75] shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              RU
            </button>
            <button
              onClick={() => changeLanguage('en')}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                i18n.language === 'en' ? 'bg-white text-[#1D9E75] shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
