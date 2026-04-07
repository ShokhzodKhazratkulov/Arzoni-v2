import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';
import { Language } from '../types';

export default function Navbar() {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: Language) => {
    i18n.changeLanguage(lng);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm px-4 py-3">
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 items-center gap-3">
        {/* Logo - Left aligned */}
        <div className="flex items-center gap-2 justify-start">
          <div className="w-10 h-10 bg-[#1D9E75] rounded-lg flex items-center justify-center text-white shadow-md">
            <MapPin size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-none tracking-tight">
              {t('appName')}
            </h1>
            <p className="text-xs text-gray-500 font-medium mt-1">
              {t('tagline')}
            </p>
          </div>
        </div>

        {/* Language Selector - Center aligned */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-full border border-gray-200">
            <button
              onClick={() => changeLanguage('uz')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                i18n.language === 'uz' ? 'bg-white text-[#1D9E75] shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              UZ
            </button>
            <button
              onClick={() => changeLanguage('ru')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                i18n.language === 'ru' ? 'bg-white text-[#1D9E75] shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              RU
            </button>
            <button
              onClick={() => changeLanguage('en')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                i18n.language === 'en' ? 'bg-white text-[#1D9E75] shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              EN
            </button>
          </div>
        </div>

        {/* Right side - Empty for now or could add search/etc */}
        <div className="hidden sm:flex items-center justify-end">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {t('communityMap') || "Community Map"}
          </div>
        </div>
      </div>
    </nav>
  );
}
