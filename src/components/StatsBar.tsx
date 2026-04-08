import { useTranslation } from 'react-i18next';
import { Restaurant } from '../types';

interface StatsBarProps {
  restaurants: Restaurant[];
  selectedCategory: 'food' | 'clothes';
}

export default function StatsBar({ restaurants, selectedCategory }: StatsBarProps) {
  const { t } = useTranslation();

  const totalCount = restaurants.length;
  const cheapestPrice = restaurants.length > 0 
    ? Math.min(...restaurants.map(r => r.price)) 
    : 0;

  return (
    <div className="bg-[#1D9E75]/5 px-4 py-2 border-b border-[#1D9E75]/10">
      <div className="max-w-7xl mx-auto flex flex-wrap justify-between gap-4 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#1D9E75]">
        <div className="flex items-center gap-1.5">
          <span className="opacity-60">
            {selectedCategory === 'food' ? t('totalRestaurants') : t('totalShops')}:
          </span>
          <span className="text-gray-900">{totalCount}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="opacity-60">
            {selectedCategory === 'food' ? t('cheapestMeal') : t('cheapestClothes')}:
          </span>
          <span className="text-gray-900">{cheapestPrice.toLocaleString()} {t('som')}</span>
        </div>
      </div>
    </div>
  );
}
