import { useTranslation } from 'react-i18next';
import { DISH_TYPES, CLOTHING_TYPES, PRICE_RANGES, CLOTHING_PRICE_RANGES } from '../constants';
import { cn } from '../lib/utils';
import { Utensils, Shirt } from 'lucide-react';

interface FilterBarProps {
  selectedCategory: 'food' | 'clothes';
  setSelectedCategory: (category: 'food' | 'clothes') => void;
  selectedDishes: string[];
  setSelectedDishes: (dishes: string[]) => void;
  selectedPriceRange: string;
  setSelectedPriceRange: (range: string) => void;
  customPrice: number;
  setCustomPrice: (price: number) => void;
  customDish: string;
  setCustomDish: (dish: string) => void;
}

export default function FilterBar({
  selectedCategory,
  setSelectedCategory,
  selectedDishes,
  setSelectedDishes,
  selectedPriceRange,
  setSelectedPriceRange,
  customPrice,
  setCustomPrice,
  customDish,
  setCustomDish
}: FilterBarProps) {
  const { t } = useTranslation();

  const toggleDish = (id: string) => {
    if (selectedDishes.includes(id)) {
      setSelectedDishes([]);
    } else {
      setSelectedDishes([id]);
    }
  };

  const currentItems = selectedCategory === 'food' ? DISH_TYPES : CLOTHING_TYPES;
  const currentPriceRanges = selectedCategory === 'food' ? PRICE_RANGES : CLOTHING_PRICE_RANGES;

  return (
    <div className="bg-white border-b border-gray-100 px-4 py-4 space-y-4">
      {/* Category Switcher */}
      <div className="max-w-7xl mx-auto flex gap-3">
        <button
          onClick={() => setSelectedCategory('food')}
          className={cn(
            "flex items-center gap-2 px-6 py-2 rounded-xl text-base font-bold border transition-all",
            selectedCategory === 'food'
              ? "bg-gray-900 text-white border-gray-900 shadow-lg"
              : "bg-white text-gray-600 border-gray-200 hover:border-gray-900"
          )}
        >
          <Utensils size={18} />
          {t('categoryFood')}
        </button>
        <button
          onClick={() => setSelectedCategory('clothes')}
          className={cn(
            "flex items-center gap-2 px-6 py-2 rounded-xl text-base font-bold border transition-all",
            selectedCategory === 'clothes'
              ? "bg-gray-900 text-white border-gray-900 shadow-lg"
              : "bg-white text-gray-600 border-gray-200 hover:border-gray-900"
          )}
        >
          <Shirt size={18} />
          {t('categoryClothes')}
        </button>
      </div>

      <div className="max-w-7xl mx-auto overflow-x-auto no-scrollbar">
        <div className="flex gap-2 pb-1">
          {currentItems.map((item) => (
            <button
              key={item.id}
              onClick={() => toggleDish(item.id)}
              className={cn(
                "whitespace-nowrap px-4 py-1.5 rounded-full text-base font-medium border transition-all",
                selectedDishes.includes(item.id)
                  ? (selectedCategory === 'food' ? "bg-[#1D9E75] text-white border-[#1D9E75] shadow-sm" : "bg-indigo-500 text-white border-indigo-500 shadow-sm")
                  : "bg-white text-gray-600 border-gray-200 hover:border-[#1D9E75] hover:text-[#1D9E75]"
              )}
            >
              {t(item.label)}
            </button>
          ))}
          <button
            onClick={() => {
              if (selectedDishes.includes('custom')) {
                setSelectedDishes([]);
                setCustomDish('');
              } else {
                setSelectedDishes(['custom']);
              }
            }}
            className={cn(
              "whitespace-nowrap px-4 py-1.5 rounded-full text-base font-medium border transition-all",
              selectedDishes.includes('custom')
                ? (selectedCategory === 'food' ? "bg-[#1D9E75] text-white border-[#1D9E75] shadow-sm" : "bg-indigo-500 text-white border-indigo-500 shadow-sm")
                : "bg-white text-gray-600 border-gray-200 hover:border-[#1D9E75] hover:text-[#1D9E75]"
            )}
          >
            {selectedCategory === 'food' ? t('customDish') : t('otherDishClothes')}
          </button>
        </div>
      </div>

      {selectedDishes.includes('custom') && (
        <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customDish}
              onChange={(e) => setCustomDish(e.target.value)}
              placeholder={selectedCategory === 'food' ? t('customDishPlaceholder') : t('customDishPlaceholderClothes')}
              className="w-full sm:w-64 px-4 py-2 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
            />
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {currentPriceRanges.map((range) => (
            <button
              key={range.id}
              onClick={() => setSelectedPriceRange(range.id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-bold border transition-all",
                selectedPriceRange === range.id
                  ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-orange-500 hover:text-orange-500"
              )}
            >
              {t(range.label)}
            </button>
          ))}
        </div>

        {selectedPriceRange === 'custom' && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
            <input
              type="number"
              value={customPrice || ''}
              onChange={(e) => setCustomPrice(Number(e.target.value))}
              placeholder={t('formPrice')}
              className="w-32 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <span className="text-sm font-bold text-gray-500">{t('som')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
