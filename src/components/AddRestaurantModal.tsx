import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check, MapPin, Camera, Star, Search, Loader2, AlertTriangle } from 'lucide-react';
import { DISH_TYPES, TASHKENT_CENTER } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { supabase } from '../supabase';
import { Restaurant } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface AddRestaurantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  onAddReview: (restaurantId: string, reviewData: any) => void;
  initialRestaurant?: Restaurant | null;
}

export default function AddRestaurantModal({ isOpen, onClose, onSubmit, onAddReview, initialRestaurant }: AddRestaurantModalProps) {
  const { t } = useTranslation();
  const apiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [mode, setMode] = useState<'search' | 'add' | 'review'>('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Restaurant[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    dishes: [] as string[],
    price: 0,
    description: '',
    submitter: '',
    location: TASHKENT_CENTER
  });

  const [reviewData, setReviewData] = useState({
    rating: 5,
    comment: '',
    submitter: '',
    priceSpent: 0,
    dishId: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (initialRestaurant) {
        setSelectedRestaurant(initialRestaurant);
        setMode('review');
      } else {
        setMode('search');
      }
    } else {
      setMode('search');
      setSearchTerm('');
      setSuggestions([]);
      setSelectedRestaurant(null);
      setPhoto(null);
      setPhotoFile(null);
      setFormData({
        name: '',
        address: '',
        dishes: [],
        price: 0,
        description: '',
        submitter: '',
        location: TASHKENT_CENTER
      });
      setReviewData({
        rating: 5,
        comment: '',
        submitter: '',
        priceSpent: 0,
        dishId: ''
      });
    }
  }, [isOpen, initialRestaurant]);

  useEffect(() => {
    const searchRestaurants = async () => {
      if (searchTerm.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsSearching(true);
      try {
        // Supabase search using ilike
        const { data, error } = await supabase
          .from('restaurants')
          .select('*')
          .ilike('name', `%${searchTerm}%`)
          .limit(5);

        if (error) throw error;
        setSuggestions(data as Restaurant[]);
      } catch (error) {
        console.error('Error searching restaurants:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchRestaurants, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setLocalError(t('imageTooLarge') || "Image is too large. Please select an image smaller than 5MB.");
        return;
      }
      setLocalError(null);
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleDish = (id: string) => {
    if (formData.dishes.includes(id)) {
      setFormData({ ...formData, dishes: formData.dishes.filter(d => d !== id) });
    } else {
      setFormData({ ...formData, dishes: [...formData.dishes, id] });
    }
  };

  const handleRecenter = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setFormData({
          ...formData,
          location: newLocation
        });
        if (mapRef.current) {
          mapRef.current.panTo(newLocation);
        }
      });
    }
  };

  const handleMapClick = (e: any) => {
    if (e.detail.latLng) {
      setFormData({
        ...formData,
        location: {
          lat: e.detail.latLng.lat,
          lng: e.detail.latLng.lng
        }
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'review' && selectedRestaurant?.id) {
      onAddReview(selectedRestaurant.id, {
        ...reviewData,
        restaurantId: selectedRestaurant.id,
        photoFile: photoFile, // Pass the file object
        createdAt: new Date().toISOString(),
        likes: 0,
        dislikes: 0
      });
    } else {
      onSubmit({
        ...formData,
        name: formData.name || searchTerm,
        rating: 0,
        reviewCount: 0,
        likes: 0,
        dislikes: 0,
        photoFile: photoFile, // Pass the file object
        createdAt: new Date().toISOString()
      });
    }
    
    onClose();
  };

  const renderSearch = () => (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('formName')}</label>
        <div className="relative">
          <input
            autoFocus
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 pl-11 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1D9E75] focus:outline-none"
            placeholder={t('searchRestaurantPlaceholder') || "Start typing restaurant name..."}
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          {isSearching && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1D9E75] animate-spin" size={18} />
          )}
        </div>
      </div>

      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
              {t('existingRestaurants') || "Existing Restaurants"}
            </p>
            <div className="space-y-2">
              {suggestions.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setSelectedRestaurant(r);
                    setMode('review');
                  }}
                  className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-100 transition-all text-left"
                >
                  <div>
                    <h4 className="font-bold text-gray-900">{r.name}</h4>
                    <p className="text-xs text-gray-500">{r.address}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[#1D9E75] font-bold text-sm">
                    <Star size={14} className="fill-[#1D9E75]" />
                    {r.rating.toFixed(1)}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {searchTerm.length >= 2 && !isSearching && (
        <button
          type="button"
          onClick={() => {
            setFormData({ ...formData, name: searchTerm });
            setMode('add');
          }}
          className="w-full p-4 flex items-center gap-3 bg-[#1D9E75]/5 text-[#1D9E75] rounded-xl border border-dashed border-[#1D9E75] hover:bg-[#1D9E75]/10 transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-[#1D9E75] text-white flex items-center justify-center font-bold text-xl">
            +
          </div>
          <div className="text-left">
            <p className="font-bold">{t('addNewRestaurant') || "Add as a new restaurant"}</p>
            <p className="text-xs opacity-70">"{searchTerm}" {t('notInList') || "is not in our list yet"}</p>
          </div>
        </button>
      )}
    </div>
  );

  const renderReview = () => (
    <div className="space-y-4">
      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
        <div>
          <h4 className="font-bold text-gray-900">{selectedRestaurant?.name}</h4>
          <p className="text-xs text-gray-500">{selectedRestaurant?.address}</p>
        </div>
        <button 
          type="button"
          onClick={() => setMode('search')}
          className="text-xs font-bold text-[#1D9E75] hover:underline"
        >
          {t('change') || "Change"}
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('yourRating') || "Your Rating"}</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setReviewData({ ...reviewData, rating: star })}
              className="p-1 transition-transform active:scale-90"
            >
              <Star 
                size={32} 
                className={cn(
                  "transition-colors",
                  star <= reviewData.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"
                )} 
              />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('whatDidYouEat') || "What did you eat?"}</label>
        <select
          value={reviewData.dishId}
          onChange={(e) => setReviewData({ ...reviewData, dishId: e.target.value })}
          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1D9E75] focus:outline-none bg-white"
        >
          <option value="">{t('selectDish') || "Select a dish..."}</option>
          {DISH_TYPES.map((dish) => (
            <option key={dish.id} value={dish.id}>
              {t(dish.label)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('yourComment') || "Your Comment"}</label>
        <textarea
          required
          value={reviewData.comment}
          onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1D9E75] focus:outline-none h-24 resize-none"
          placeholder={t('commentPlaceholder') || "Tell us about your experience..."}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('formSubmitter')}</label>
          <input
            required
            type="text"
            value={reviewData.submitter}
            onChange={(e) => setReviewData({ ...reviewData, submitter: e.target.value })}
            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1D9E75] focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('priceSpent')}</label>
          <input
            required
            type="number"
            min="0"
            value={reviewData.priceSpent || ''}
            onChange={(e) => setReviewData({ ...reviewData, priceSpent: Number(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1D9E75] focus:outline-none"
            placeholder="0"
          />
        </div>
      </div>

      {renderPhotoSection()}
    </div>
  );

  const renderPhotoSection = () => (
    <div className="space-y-2">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
        <Camera size={12} />
        {t('addPhoto') || "Add Photo (Camera Only)"}
      </label>
      <div className="flex gap-4 items-center">
        {photo ? (
          <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 group">
            <img src={photo} alt="Captured" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => {
                setPhoto(null);
                setPhotoFile(null);
              }}
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
            >
              <X size={20} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-[#1D9E75] hover:text-[#1D9E75] transition-all"
          >
            <Camera size={24} />
            <span className="text-[10px] font-bold mt-1 uppercase">{t('takePhoto') || "Take Photo"}</span>
          </button>
        )}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={fileInputRef}
          onChange={handleCapture}
          className="hidden"
        />
        {!photo && (
          <p className="text-[10px] text-gray-400 italic max-w-[150px]">
            {t('cameraOnlyHint') || "Tap to open camera and take a photo of the food or place"}
          </p>
        )}
      </div>
    </div>
  );

  const renderAdd = () => (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('formName')}</label>
        <input
          required
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1D9E75] focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('formAddress')}</label>
        <input
          required
          type="text"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1D9E75] focus:outline-none"
          placeholder={t('formAddressPlaceholder') || "Enter street address"}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
          <MapPin size={12} />
          {t('selectOnMap') || "Select Location on Map"}
        </label>
        <div className="h-[180px] w-full rounded-xl overflow-hidden border border-gray-200 relative">
          <APIProvider apiKey={apiKey}>
            <Map
              defaultCenter={formData.location}
              defaultZoom={13}
              mapId="ADD_RESTAURANT_MAP"
              onClick={handleMapClick}
              onIdle={(e) => {
                mapRef.current = e.map;
              }}
              disableDefaultUI={true}
              zoomControl={true}
              gestureHandling={'greedy'}
            >
              <AdvancedMarker position={formData.location}>
                <Pin background={'#1D9E75'} borderColor={'#ffffff'} glyphColor={'#ffffff'} />
              </AdvancedMarker>
            </Map>
          </APIProvider>
          <button
            type="button"
            onClick={handleRecenter}
            className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg border border-gray-200 text-[#1D9E75] hover:bg-gray-50 transition-all z-10"
            title={t('findNearMe')}
          >
            <MapPin size={20} />
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('formDescription')}</label>
        <textarea
          maxLength={200}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1D9E75] focus:outline-none h-20 resize-none"
        />
      </div>

      {renderPhotoSection()}
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[95vh]"
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#1D9E75] text-white">
              <h2 className="text-xl font-bold">
                {mode === 'search' ? t('addRestaurant') : 
                 mode === 'review' ? t('addReview') || "Add Review" : 
                 t('addNewRestaurant') || "Add New Restaurant"}
              </h2>
              <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-all">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
              {localError && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm">
                  <AlertTriangle size={18} className="shrink-0" />
                  <p>{localError}</p>
                </div>
              )}
              
              {mode === 'search' && renderSearch()}
              {mode === 'review' && renderReview()}
              {mode === 'add' && renderAdd()}

              {mode !== 'search' && (
                <div className="flex gap-3 pt-6">
                  <button
                    type="button"
                    onClick={() => setMode('search')}
                    className="flex-1 px-6 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all"
                  >
                    {t('back') || "Back"}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-[#1D9E75] text-white rounded-xl font-bold hover:bg-[#168a65] transition-all shadow-lg"
                  >
                    {t('submit')}
                  </button>
                </div>
              )}
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
