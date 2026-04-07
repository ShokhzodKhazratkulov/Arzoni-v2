import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Star, MapPin, Navigation, User, ThumbsUp, ThumbsDown, MoreVertical, Edit2, Camera, Check, X as CloseIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Restaurant, Review } from '../types';
import { supabase } from '../supabase';
import { DISH_TYPES } from '../constants';
import imageCompression from 'browser-image-compression';

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

interface RestaurantDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant: Restaurant;
  onAddReview?: () => void;
  selectedDishes?: string[];
}

export default function RestaurantDetailsModal({ isOpen, onClose, restaurant: initialRestaurant, onAddReview, selectedDishes = [] }: RestaurantDetailsModalProps) {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<Restaurant>(initialRestaurant);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(initialRestaurant.name);
  const [isUpdating, setIsUpdating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync local restaurant state with prop when it changes
  useEffect(() => {
    setRestaurant(initialRestaurant);
    setNewName(initialRestaurant.name);
  }, [initialRestaurant]);

  useEffect(() => {
    if (!isOpen || !restaurant.id) return;

    setLoading(true);
    const fetchReviews = async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reviews:', error);
      } else {
        const mappedReviews = (data || []).map(r => ({
          ...r,
          restaurantId: r.restaurant_id,
          createdAt: r.created_at,
          photoUrl: r.photo_url,
          priceSpent: r.price_spent,
          dishId: r.dish_id
        }));
        setReviews(mappedReviews as Review[]);
      }
      setLoading(false);
    };

    fetchReviews();

    const channel = supabase
      .channel(`reviews_${restaurant.id}`)
      .on('postgres_changes', { 
        event: '*', 
        table: 'reviews', 
        schema: 'public',
        filter: `restaurant_id=eq.${restaurant.id}`
      }, () => {
        fetchReviews();
      })
      .subscribe();

    // Also subscribe to restaurant changes to keep modal in sync
    const restaurantChannel = supabase
      .channel(`restaurant_modal_${restaurant.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        table: 'restaurants',
        schema: 'public',
        filter: `id=eq.${restaurant.id}`
      }, (payload) => {
        const r = payload.new as any;
        setRestaurant(prev => ({
          ...prev,
          name: r.name,
          photoUrl: r.photo_url,
          likes: r.likes,
          dislikes: r.dislikes,
          rating: r.avg_rating || r.rating,
          reviewCount: r.review_count || r.reviewCount,
          dishStats: r.dish_stats || r.dishStats
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(restaurantChannel);
    };
  }, [isOpen, restaurant.id]);

  const handleUpdateName = async () => {
    if (!newName.trim() || newName === restaurant.name) {
      setIsEditingName(false);
      return;
    }

    try {
      setIsUpdating(true);
      const { error } = await supabase
        .from('restaurants')
        .update({ name: newName.trim() })
        .eq('id', restaurant.id);

      if (error) throw error;
      
      // Optimistic update
      setRestaurant(prev => ({ ...prev, name: newName.trim() }));
      setIsEditingName(false);
    } catch (error) {
      console.error('Error updating name:', error);
      alert('Failed to update name');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !restaurant.id) return;

    try {
      setIsUpdating(true);
      
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);

      const fileExt = file.name.split('.').pop();
      const fileName = `${restaurant.id}-${Date.now()}.${fileExt}`;
      const filePath = `restaurants/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, compressedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ photo_url: publicUrl })
        .eq('id', restaurant.id);

      if (updateError) throw updateError;
      
      // Optimistic update
      setRestaurant(prev => ({ ...prev, photoUrl: publicUrl }));
      setIsMenuOpen(false);
    } catch (error) {
      console.error('Error updating photo:', error);
      alert('Failed to update photo');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReviewReact = async (reviewId: string, type: 'likes' | 'dislikes') => {
    if (!restaurant.id) return;
    
    // Optimistic update for reviews list
    setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, [type]: (r[type] || 0) + 1 } : r));
    // Optimistic update for restaurant totals
    setRestaurant(prev => ({ ...prev, [type]: (prev[type] || 0) + 1 }));

    try {
      // 1. Update review
      const review = reviews.find(r => r.id === reviewId);
      if (!review) return;

      const { error: reviewError } = await supabase
        .from('reviews')
        .update({ [type]: (review[type] || 0) + 1 })
        .eq('id', reviewId);

      if (reviewError) throw reviewError;
      
      // 2. Update restaurant total reactions
      const { error: restaurantError } = await supabase
        .from('restaurants')
        .update({ [type]: (restaurant[type] || 0) + 1 })
        .eq('id', restaurant.id);

      if (restaurantError) throw restaurantError;

      // 3. Recalculate bestComment for the dish
      if (review.dishId) {
        const { data: dishReviewsData, error: dishReviewsError } = await supabase
          .from('reviews')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .eq('dish_id', review.dishId);

        if (dishReviewsError) throw dishReviewsError;

        const dishReviews = (dishReviewsData || []).map(r => ({
          ...r,
          likes: r.id === reviewId && type === 'likes' ? (r.likes || 0) + 1 : (r.likes || 0),
          dislikes: r.id === reviewId && type === 'dislikes' ? (r.dislikes || 0) + 1 : (r.dislikes || 0)
        }));

        const reviewsWithComments = dishReviews.filter(r => r.comment && r.comment.trim().length > 0);
        const bestReview = reviewsWithComments.length > 0
          ? reviewsWithComments.reduce((prev, curr) => (curr.likes || 0) > (prev.likes || 0) ? curr : prev, reviewsWithComments[0])
          : null;

        const currentDishStats = restaurant.dishStats || {};
        const updatedDishStats = { ...currentDishStats };
        
        if (updatedDishStats[review.dishId]) {
          updatedDishStats[review.dishId] = {
            ...updatedDishStats[review.dishId],
            bestComment: bestReview?.comment
          };
          
          await supabase
            .from('restaurants')
            .update({ dish_stats: updatedDishStats })
            .eq('id', restaurant.id);
            
          // Optimistic update for dishStats
          setRestaurant(prev => ({ ...prev, dishStats: updatedDishStats }));
        }
      }
    } catch (error) {
      console.error(`Error updating review ${type}:`, error);
      // Revert optimistic update if needed (optional, for simplicity we skip here)
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative"
        >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handlePhotoUpload}
            />

            {/* Header */}
            <div className="relative h-64 sm:h-80 bg-gray-100">
              {restaurant.photoUrl ? (
                <img 
                  src={restaurant.photoUrl} 
                  alt={restaurant.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <MapPin size={48} />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              
              <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
                {/* Edit Menu Trigger (3 dots) */}
                <div className="relative">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMenuOpen(!isMenuOpen);
                    }}
                    className="p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white transition-all shadow-sm border border-white/10"
                  >
                    <MoreVertical size={18} />
                  </button>

                  <AnimatePresence>
                    {isMenuOpen && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className="absolute right-0 top-full mt-2 w-40 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden"
                      >
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsEditingName(true);
                            setIsMenuOpen(false);
                          }}
                          className="w-full px-4 py-3 text-left text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                        >
                          <Edit2 size={14} className="text-[#1D9E75]" />
                          Edit name
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                          className="w-full px-4 py-3 text-left text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors border-t border-gray-50"
                        >
                          <Camera size={14} className="text-[#1D9E75]" />
                          Edit photo
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md text-white rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="absolute bottom-4 left-6 right-14">
                {isEditingName ? (
                  <div className="flex items-center gap-2 mb-1">
                    <input 
                      autoFocus
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()}
                      className="text-2xl sm:text-3xl font-bold text-white bg-transparent border-b-2 border-white/50 focus:border-white focus:outline-none w-full"
                    />
                    <button onClick={handleUpdateName} className="text-white p-1.5 bg-white/20 rounded-lg hover:bg-white/40">
                      <Check size={20} />
                    </button>
                    <button onClick={() => { setIsEditingName(false); setNewName(restaurant.name); }} className="text-white/70 p-1.5 bg-white/10 rounded-lg hover:bg-white/20">
                      <CloseIcon size={20} />
                    </button>
                  </div>
                ) : (
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1 drop-shadow-md">{restaurant.name}</h2>
                )}
                <div className="flex items-center gap-2 text-white/90 text-sm drop-shadow-sm">
                  <MapPin size={14} />
                  <span>{restaurant.address}</span>
                </div>
              </div>

              {/* Loading Overlay */}
              {isUpdating && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-30">
                  <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">{t('price')}</p>
                <p className="text-sm font-black text-gray-900">
                  {Math.round(selectedDishes.length === 1 && restaurant.dishStats?.[selectedDishes[0]] 
                    ? restaurant.dishStats[selectedDishes[0]].avgPrice 
                    : restaurant.price).toLocaleString()} {t('som')}
                </p>
                {restaurant.avgPrice && Math.round(restaurant.avgPrice) !== Math.round(restaurant.price) && (
                  <p className="text-[9px] text-[#1D9E75] font-bold mt-0.5">
                    Avg: {Math.round(restaurant.avgPrice).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">{t('rating')}</p>
                <div className="flex items-center gap-1">
                  <Star size={14} className="text-yellow-400 fill-yellow-400" />
                  <p className="text-sm font-bold text-gray-900">{restaurant.rating.toFixed(1)}</p>
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">{t('reviews')}</p>
                <p className="text-sm font-bold text-gray-900">{restaurant.reviewCount}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-xl border border-green-100">
                <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                  <ThumbsUp size={10} /> Likes
                </p>
                <p className="text-sm font-bold text-green-700">{restaurant.likes || 0}</p>
              </div>
              <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                <p className="text-[10px] text-red-600 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                  <ThumbsDown size={10} /> Dislikes
                </p>
                <p className="text-sm font-bold text-red-700">{restaurant.dislikes || 0}</p>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wider">{t('about')}</h3>
              <p className="text-gray-600 leading-relaxed italic">
                "{restaurant.description}"
              </p>
            </div>

            {/* Dishes */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">{t('popularDishes')}</h3>
              <div className="flex flex-wrap gap-2">
                {restaurant.dishes.map(dishId => {
                  const dish = DISH_TYPES.find(d => d.id === dishId);
                  const isSelected = selectedDishes.includes(dishId);
                  return dish ? (
                    <span 
                      key={dishId} 
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                        isSelected 
                          ? "bg-[#1D9E75] text-white shadow-sm" 
                          : "bg-[#1D9E75]/10 text-[#1D9E75]"
                      }`}
                    >
                      {t(dish.label)}
                    </span>
                  ) : null;
                })}
              </div>
            </div>

            {/* Reviews Section */}
            <div className="border-t border-gray-100 pt-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{t('communityReviews')}</h3>
                  <div className="flex items-center gap-1 text-[#1D9E75] text-sm font-bold mt-1">
                    <Star size={16} className="fill-[#1D9E75]" />
                    <span>{restaurant.rating.toFixed(1)} / 5</span>
                  </div>
                </div>
                <button
                  onClick={() => onAddReview?.()}
                  className="bg-[#1D9E75] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md hover:bg-[#168a65] transition-all flex items-center gap-2"
                >
                  <Star size={14} className="fill-white" />
                  {t('addReview')}
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : reviews.length > 0 ? (
                <div className="space-y-6">
                  {reviews.map((review, idx) => (
                    <motion.div 
                      key={review.id || idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-gray-50 rounded-2xl p-5 border border-gray-100"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-400 border border-gray-200">
                            <User size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{review.submitter || t('anonymous')}</p>
                            <p className="text-[10px] text-gray-400">
                              {new Date(review.createdAt).toLocaleDateString()}
                              {review.priceSpent ? ` • ${review.priceSpent.toLocaleString()} ${t('som')}` : ''}
                              {review.dishId && (
                                <>
                                  {' • '}
                                  <span className="text-[#1D9E75] font-bold">
                                    {t(DISH_TYPES.find(d => d.id === review.dishId)?.label || '')}
                                  </span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 px-2 py-1 bg-white rounded-lg border border-gray-200 shadow-sm">
                          <Star size={12} className="text-yellow-400 fill-yellow-400" />
                          <span className="text-xs font-bold text-gray-900">{review.rating.toFixed(1)}</span>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 text-sm leading-relaxed mb-4">
                        {review.comment}
                      </p>

                      {review.photoUrl && (
                        <div className="w-full h-48 rounded-xl overflow-hidden border border-gray-200 mb-4">
                          <img 
                            src={review.photoUrl} 
                            alt="Review photo" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
                        <button 
                          onClick={() => review.id && handleReviewReact(review.id, 'likes')}
                          className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-green-600 transition-colors"
                        >
                          <ThumbsUp size={14} />
                          <span>{review.likes || 0}</span>
                        </button>
                        <button 
                          onClick={() => review.id && handleReviewReact(review.id, 'dislikes')}
                          className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-red-600 transition-colors"
                        >
                          <ThumbsDown size={14} />
                          <span>{review.dislikes || 0}</span>
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-gray-400 text-sm">{t('noReviews')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
            <a 
              href={`https://www.google.com/maps/dir/?api=1&destination=${restaurant.location.lat},${restaurant.location.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-[#1D9E75] text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-[#1D9E75]/20 hover:scale-105 transition-transform"
            >
              <Navigation size={16} />
              {t('getDirections')}
            </a>
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-gray-500 font-bold text-sm hover:text-gray-700"
            >
              {t('cancel')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
