import { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  InfoWindow, 
  useMap,
  Pin
} from '@vis.gl/react-google-maps';
import { useTranslation } from 'react-i18next';
import { Restaurant } from '../types';
import { TASHKENT_CENTER, DISH_TYPES } from '../constants';
import { Navigation, Star, MapPin, Crosshair, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import RestaurantDetailsModal from './RestaurantDetailsModal';

interface MapContainerProps {
  restaurants: Restaurant[];
  onAddRestaurant: () => void;
  selectedDishes?: string[];
  customDish?: string;
  selectedCategory: 'food' | 'clothes';
}

const MapContent = ({ restaurants, onAddRestaurant, selectedDishes = [], customDish, selectedCategory }: MapContainerProps) => {
  const { t } = useTranslation();
  const map = useMap();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const selectedRestaurant = restaurants.find(r => r.id === selectedId);

  // Calculate info for selected restaurant
  const activeDishId = useMemo(() => {
    if (!selectedRestaurant || selectedDishes.length === 0) return null;
    
    if (selectedDishes.includes('custom') && customDish) {
      const normalizedSearch = customDish.toLowerCase();
      const matchingKey = Object.keys(selectedRestaurant.dishStats || {}).find(k => k.toLowerCase() === normalizedSearch);
      return matchingKey || customDish;
    }
    
    return selectedDishes.find(id => selectedRestaurant.dishStats?.[id]?.bestComment) || selectedDishes[0];
  }, [selectedRestaurant, selectedDishes, customDish]);

  const displayPrice = selectedRestaurant 
    ? (activeDishId && selectedRestaurant.dishStats?.[activeDishId] 
        ? selectedRestaurant.dishStats[activeDishId].avgPrice 
        : selectedRestaurant.price)
    : 0;

  const displayDescription = selectedRestaurant
    ? (activeDishId && selectedRestaurant.dishStats?.[activeDishId]?.bestComment
        ? `"${selectedRestaurant.dishStats[activeDishId].bestComment}"`
        : selectedRestaurant.description)
    : '';

  const isReview = !!(selectedRestaurant && activeDishId && selectedRestaurant.dishStats?.[activeDishId]?.bestComment);

  const handleFindMe = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(pos);
          map?.panTo(pos);
          map?.setZoom(15);
        },
        () => {
          console.error("Error: The Geolocation service failed.");
        }
      );
    }
  }, [map]);

  const getPinColor = (price: number) => {
    if (selectedCategory === 'clothes') {
      if (price <= 50000) return '#6366F1'; // Indigo
      if (price <= 100000) return '#8B5CF6'; // Violet
      return '#A855F7'; // Purple
    }
    if (price <= 25000) return '#1D9E75'; // Green
    if (price <= 35000) return '#F97316'; // Orange
    return '#EF4444'; // Red
  };

  return (
    <div className="relative w-full h-[400px] sm:h-[500px] rounded-2xl overflow-hidden shadow-inner border border-gray-100">
      <Map
        defaultCenter={TASHKENT_CENTER}
        defaultZoom={13}
        mapId="ARZONI_MAP_ID"
        disableDefaultUI={true}
        zoomControl={true}
        gestureHandling={'greedy'}
      >
        {restaurants.map((restaurant) => (
          <AdvancedMarker
            key={restaurant.id}
            position={restaurant.location}
            onClick={() => setSelectedId(restaurant.id || null)}
          >
            <Pin 
              background={getPinColor(restaurant.price)} 
              borderColor={'#ffffff'} 
              glyphColor={'#ffffff'}
              scale={1.2}
            />
          </AdvancedMarker>
        ))}

        {userLocation && (
          <AdvancedMarker position={userLocation}>
            <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
          </AdvancedMarker>
        )}

        {selectedRestaurant && (
          <InfoWindow
            position={selectedRestaurant.location}
            onCloseClick={() => setSelectedId(null)}
          >
            <div className="p-1 max-w-[200px]">
              <h3 
                className="font-bold text-sm text-gray-900 cursor-pointer hover:text-[#1D9E75] transition-colors"
                onClick={() => setIsDetailsOpen(true)}
              >
                {selectedRestaurant.name}
              </h3>
              {selectedRestaurant.photoUrl && (
                <div 
                  className="w-full h-20 rounded-lg overflow-hidden mt-1 cursor-pointer relative group"
                  onClick={() => setIsDetailsOpen(true)}
                >
                  <img src={selectedRestaurant.photoUrl} alt={selectedRestaurant.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <Info size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-1">
                <Star size={10} className="text-yellow-400 fill-yellow-400" />
                <span className="font-bold">{selectedRestaurant.rating}</span>
                <span>({selectedRestaurant.reviewCount})</span>
              </div>
              <p className={`text-[10px] text-gray-600 mt-1 line-clamp-2 leading-relaxed ${isReview ? 'italic text-[#1D9E75] border-l border-[#1D9E75]/20 pl-1.5' : ''}`}>
                {displayDescription}
              </p>
              <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center">
                <button 
                  onClick={() => setIsDetailsOpen(true)}
                  className="text-[10px] font-bold text-[#1D9E75] hover:underline"
                >
                  {Math.round(displayPrice).toLocaleString()} {t('som')}
                </button>
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedRestaurant.location.lat},${selectedRestaurant.location.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Navigation size={10} />
                  {t('getDirections')}
                </a>
              </div>
            </div>
          </InfoWindow>
        )}
      </Map>

      {/* Floating Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          onClick={handleFindMe}
          className="p-3 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-all text-[#1D9E75] border border-gray-100"
          title={selectedCategory === 'food' ? t('findNearMe') : t('findNearMeClothes')}
        >
          <Crosshair size={20} />
        </button>
      </div>

      <button
        onClick={onAddRestaurant}
        className="absolute bottom-6 left-6 px-6 py-3 bg-[#1D9E75] text-white rounded-full shadow-xl hover:bg-[#168a65] transition-all font-bold flex items-center gap-2 scale-100 active:scale-95 z-10"
      >
        <span className="text-xl">+</span>
        {selectedCategory === 'food' ? t('addRestaurant') : t('addShop')}
      </button>

      {selectedRestaurant && (
        <RestaurantDetailsModal 
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          restaurant={selectedRestaurant}
          selectedDishes={selectedDishes}
          customDish={customDish}
          selectedCategory={selectedCategory}
        />
      )}
    </div>
  );
};

export default function MapContainer(props: MapContainerProps) {
  const apiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';

  return (
    <APIProvider apiKey={apiKey}>
      <MapContent {...props} />
    </APIProvider>
  );
}
