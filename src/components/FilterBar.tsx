import { useTranslation } from 'react-i18next';
import { DISH_TYPES, PRICE_RANGES } from '../constants';
import { cn } from '../lib/utils';

interface FilterBarProps {
  selectedDishes: string[];
  setSelectedDishes: (dishes: string[]) => void;
  selectedPriceRange: string;
  setSelectedPriceRange: (range: string) => void;
  customPrice: number;
  setCustomPrice: (price: number) => void;
}

export default function FilterBar({
  selectedDishes,
  setSelectedDishes,
  selectedPriceRange,
  setSelectedPriceRange,
  customPrice,
  setCustomPrice
}: FilterBarProps) {
  const { t } = useTranslation();

  const toggleDish = (id: string) => {
    if (selectedDishes.includes(id)) {
      setSelectedDishes(selectedDishes.filter(d => d !== id));
    } else {
      setSelectedDishes([...selectedDishes, id]);
    }
  };

  return (
    <div className="bg-white border-b border-gray-100 px-4 py-4 space-y-4">
      <div className="max-w-7xl mx-auto overflow-x-auto no-scrollbar">
        <div className="flex gap-2 pb-1">
          {DISH_TYPES.map((dish) => (
            <button
              key={dish.id}
              onClick={() => toggleDish(dish.id)}
              className={cn(
                "whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium border transition-all",
                selectedDishes.includes(dish.id)
                  ? "bg-[#1D9E75] text-white border-[#1D9E75] shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-[#1D9E75] hover:text-[#1D9E75]"
              )}
            >
              {t(dish.label)}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {PRICE_RANGES.map((range) => (
            <button
              key={range.id}
              onClick={() => setSelectedPriceRange(range.id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-bold border transition-all",
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
              className="w-32 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <span className="text-xs font-bold text-gray-500">{t('som')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
