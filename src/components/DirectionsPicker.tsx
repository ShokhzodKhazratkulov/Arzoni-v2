import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { X, Map as MapIcon, ExternalLink } from 'lucide-react';
import { Location } from '../types';

interface DirectionsPickerProps {
  isOpen: boolean;
  onClose: () => void;
  location: Location;
  name: string;
}

export default function DirectionsPicker({ isOpen, onClose, location, name }: DirectionsPickerProps) {
  const { t } = useTranslation();

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  const apps = {
    google: {
      id: 'google',
      name: t('openInGoogleMaps'),
      url: `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`,
      icon: 'input_file_2.png'
    },
    apple: {
      id: 'apple',
      name: t('openInAppleMaps'),
      url: `maps://?daddr=${location.lat},${location.lng}&q=${encodeURIComponent(name)}`,
      icon: 'input_file_1.png'
    },
    yandex: {
      id: 'yandex',
      name: t('openInYandexMaps'),
      url: `yandexmaps://maps.yandex.ru/?rtext=~${location.lat},${location.lng}`,
      fallbackUrl: `https://yandex.com/maps/?rtext=~${location.lat},${location.lng}`,
      icon: 'input_file_0.png'
    }
  };

  const mapApps = isIOS 
    ? [apps.yandex, apps.apple] 
    : [apps.google, apps.yandex];

  const handleOpenApp = (app: any) => {
    const start = Date.now();
    window.location.href = app.url;
    
    // Fallback for apps that might not be installed
    if (app.fallbackUrl) {
      setTimeout(() => {
        if (Date.now() - start < 2000) {
          window.open(app.fallbackUrl, '_blank');
        }
      }, 1500);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                    <MapIcon size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">{t('chooseMapApp')}</h3>
                    <p className="text-xs text-gray-400 font-medium">{name}</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid gap-3">
                {mapApps.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => handleOpenApp(app)}
                    className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-100 transition-all group active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl overflow-hidden border border-gray-200 p-1 shadow-sm">
                        <img src={app.icon} alt={app.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      </div>
                      <span className="font-bold text-gray-700">{app.name}</span>
                    </div>
                    <ExternalLink size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-center">
              <button
                onClick={onClose}
                className="text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
              >
                {t('cancel')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
