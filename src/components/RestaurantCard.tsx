import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, MapPin, Navigation, Info } from 'lucide-react';
import { Restaurant } from '../types';
import { DISH_TYPES, CLOTHING_TYPES } from '../constants';
import { motion } from 'motion/react';
import RestaurantDetailsModal from './RestaurantDetailsModal';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onAddReview?: () => void;
  key?: string;
  selectedDishes?: string[];
  customDish?: string;
  selectedCategory: 'food' | 'clothes';
}

export default function RestaurantCard({ restaurant, onAddReview, selectedDishes = [], customDish, selectedCategory }: RestaurantCardProps) {
  const { t } = useTranslation();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const getPriceColor = (price: number) => {
    if (selectedCategory === 'clothes') {
      if (price < 100000) return 'text-green-600 bg-green-50 border-green-100';
      if (price <= 170000) return 'text-amber-600 bg-amber-50 border-amber-100';
      return 'text-red-600 bg-red-50 border-red-100';
    }
    if (price < 40000) return 'text-green-600 bg-green-50 border-green-100';
    if (price <= 70000) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-red-600 bg-red-50 border-red-100';
  };

  const themeColor = selectedCategory === 'food' ? '#1D9E75' : '#6366F1';
  const themeBg = selectedCategory === 'food' ? 'bg-[#1D9E75]' : 'bg-indigo-500';
  const themeText = selectedCategory === 'food' ? 'text-[#1D9E75]' : 'text-indigo-500';
  const themeBorder = selectedCategory === 'food' ? 'border-[#1D9E75]' : 'border-indigo-500';
  const themeBorderLight = selectedCategory === 'food' ? 'border-[#1D9E75]/20' : 'border-indigo-500/20';
  const themeBgLight = selectedCategory === 'food' ? 'bg-[#1D9E75]/10' : 'bg-indigo-500/10';

  // Find the most relevant dish to display info for
  const activeDishId = useMemo(() => {
    if (selectedDishes.length === 0) return null;
    
    // If 'custom' is selected, the customDish string is the target ID for stats
    if (selectedDishes.includes('custom') && customDish) {
      const normalizedSearch = customDish.toLowerCase();
      // Find a key in dishStats that matches (case-insensitive)
      const matchingKey = Object.keys(restaurant.dishStats || {}).find(k => k.toLowerCase() === normalizedSearch);
      return matchingKey || customDish;
    }
    
    // Otherwise find the first selected dish that has a comment
    const foundId = selectedDishes.find(id => {
      const normalizedId = id.toLowerCase();
      const matchingKey = Object.keys(restaurant.dishStats || {}).find(k => k.toLowerCase() === normalizedId);
      return matchingKey && restaurant.dishStats[matchingKey]?.bestComment;
    });

    if (foundId) {
      const normalizedId = foundId.toLowerCase();
      return Object.keys(restaurant.dishStats || {}).find(k => k.toLowerCase() === normalizedId) || foundId;
    }

    const firstId = selectedDishes[0];
    const normalizedFirstId = firstId.toLowerCase();
    return Object.keys(restaurant.dishStats || {}).find(k => k.toLowerCase() === normalizedFirstId) || firstId;
  }, [selectedDishes, customDish, restaurant.dishStats]);

  const displayPrice = activeDishId && restaurant.dishStats?.[activeDishId] 
    ? restaurant.dishStats[activeDishId].avgPrice 
    : (restaurant.avgPrice || restaurant.price);

  const displayDescription = activeDishId && restaurant.dishStats?.[activeDishId]?.bestComment
    ? `"${restaurant.dishStats[activeDishId].bestComment}"`
    : restaurant.description;

  const isReview = !!(activeDishId && restaurant.dishStats?.[activeDishId]?.bestComment);

  // Calculate popularity: if a dish is active, use its stats. 
  // Otherwise, use the most popular dish's stats for this restaurant.
  const popularityPercent = useMemo(() => {
    if (restaurant.reviewCount === 0 || !restaurant.dishStats) return null;
    
    let targetDishId = activeDishId;
    if (!targetDishId) {
      // Find most popular dish by review count
      let maxReviews = -1;
      Object.entries(restaurant.dishStats).forEach(([id, stats]) => {
        if (stats.reviewCount > maxReviews) {
          maxReviews = stats.reviewCount;
          targetDishId = id;
        }
      });
    }

    if (targetDishId && restaurant.dishStats[targetDishId]) {
      return Math.round((restaurant.dishStats[targetDishId].reviewCount / restaurant.reviewCount) * 100);
    }
    return null;
  }, [activeDishId, restaurant.dishStats, restaurant.reviewCount]);

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-5 flex flex-col gap-4 group relative"
      >
        <div 
          className="w-full h-40 rounded-xl overflow-hidden mb-1 relative bg-gray-100 cursor-pointer"
          onClick={() => setIsDetailsOpen(true)}
        >
          {restaurant.photoUrl ? (
            <img 
              src={restaurant.photoUrl} 
              alt={restaurant.name} 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
              referrerPolicy="no-referrer" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <Star size={32} />
            </div>
          )}
          
          {/* Overlay Info Icon */}
          <div 
            className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none"
          >
            <div className="bg-white/20 backdrop-blur-md p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <Info size={20} className="text-white drop-shadow-md" />
            </div>
          </div>
        </div>

        <div className="flex justify-between items-start gap-3">
          <div className="flex-1">
            <h3 
              id="restaurant-name"
              onClick={() => setIsDetailsOpen(true)}
              className={`font-black text-gray-900 text-xl leading-tight cursor-pointer hover:${themeText} transition-colors inline-block tracking-tight`}
            >
              {restaurant.name}
            </h3>
            <div className="flex items-center gap-1.5 text-gray-400 text-xs mt-1.5 font-medium">
              <MapPin size={12} className={themeText} />
              <span className="line-clamp-1">{restaurant.address}</span>
            </div>
          </div>
          <div className={`px-3 py-1.5 rounded-xl border text-sm font-black whitespace-nowrap shadow-sm transition-all group-hover:scale-105 ${getPriceColor(displayPrice)}`}>
            {Math.round(displayPrice).toLocaleString()} {t('som')}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {restaurant.dishes.map(dishId => {
            const currentTypes = selectedCategory === 'food' ? DISH_TYPES : CLOTHING_TYPES;
            const dish = currentTypes.find(d => d.id === dishId);
            // Highlight if exact match with dishId OR if it's a custom dish and matches activeDishId (case-insensitive)
            const isSelected = selectedDishes.includes(dishId) || 
              (selectedDishes.includes('custom') && customDish && dishId.toLowerCase() === customDish.toLowerCase());
            
            return (
              <span 
                key={dishId} 
                className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                  isSelected 
                    ? `${themeBg} text-white` 
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {dish ? t(dish.label) : (restaurant.dishStats?.[dishId]?.displayName || dishId)}
              </span>
            );
          })}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              {isReview ? t('mostLikedReview') : t('about')}
            </span>
          </div>
          <p className={`text-gray-600 text-xs line-clamp-2 leading-relaxed italic ${isReview ? `${themeText} border-l-2 ${themeBorderLight} pl-2` : ''}`}>
            {displayDescription}
          </p>
        </div>

        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
          <div className="flex items-center gap-3">
            <div 
              className="flex items-center gap-1 cursor-pointer hover:bg-gray-50 px-1.5 py-0.5 rounded-md transition-colors"
              onClick={() => setIsDetailsOpen(true)}
            >
              <Star size={14} className="text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-bold text-gray-900">{restaurant.rating.toFixed(1)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-bold">
                {restaurant.reviewCount}
              </span>
              <span className="text-[8px] text-gray-300 uppercase font-black leading-none">{t('reviewsCount')}</span>
            </div>
            
            {popularityPercent !== null && (
               <div className={`${themeBgLight} ${themeText} px-2 py-1 rounded-lg flex flex-col items-start leading-tight border ${themeBorderLight}`}>
                 <span className="text-[8px] font-black uppercase tracking-tighter">{t('popularity')}:</span>
                 <span className="text-xs font-black">{popularityPercent}%</span>
               </div>
            )}
          </div>
          
          <a 
            href={`https://www.google.com/maps/dir/?api=1&destination=${restaurant.location.lat},${restaurant.location.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex flex-col items-center gap-0.5 ${themeText} hover:opacity-80 transition-opacity`}
          >
            <Navigation size={14} className={selectedCategory === 'food' ? "fill-[#1D9E75]/10" : "fill-indigo-500/10"} />
            <span className="text-[9px] font-black uppercase leading-none text-center">{t('getDirections')}</span>
          </a>
        </div>
      </motion.div>

      <RestaurantDetailsModal 
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        restaurant={restaurant}
        onAddReview={onAddReview}
        selectedDishes={selectedDishes}
        selectedCategory={selectedCategory}
      />
    </>
  );
}
