import React, { useState, useEffect, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { supabase } from './supabase';
import imageCompression from 'browser-image-compression';
import { seedDatabase } from './seed';
import { Restaurant, SortOption, Review } from './types';
import { DISH_TYPES, PRICE_RANGES } from './constants';
import Navbar from './components/Navbar';
import FilterBar from './components/FilterBar';
import StatsBar from './components/StatsBar';
import MapContainer from './components/MapContainer';
import RestaurantList from './components/RestaurantList';
import AddRestaurantModal from './components/AddRestaurantModal';
import './i18n';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error?.message || "{}");
        if (parsed.error) errorMessage = parsed.error;
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-red-100">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Error</h2>
            <p className="text-gray-600 mb-8">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[#1D9E75] text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-[#168a65] transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

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

export default function App() {
  const { t } = useTranslation();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDishes, setSelectedDishes] = useState<string[]>([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('all');
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [customDish, setCustomDish] = useState<string>('');
  const [sortOption, setSortOption] = useState<SortOption>('price');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialRestaurantForModal, setInitialRestaurantForModal] = useState<Restaurant | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    setLoading(true);
    // Seed database with sample data if empty
    seedDatabase();

    const fetchRestaurants = async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching restaurants:', error);
      } else {
        // Map snake_case from DB to camelCase for the UI
        const mappedData = (data || []).map(r => ({
          ...r,
          avgPrice: r.avg_price,
          avgRating: r.avg_rating,
          reviewCount: r.review_count,
          totalReviews: r.total_reviews,
          photoUrl: r.photo_url,
          createdAt: r.created_at,
          dishScore: r.dish_score,
          dishPrices: r.dish_prices,
          dishStats: r.dish_stats
        }));
        setRestaurants(mappedData as Restaurant[]);
      }
      setLoading(false);
    };

    fetchRestaurants();

    // Set up real-time subscription
    const channel = supabase
      .channel('restaurants_changes')
      .on('postgres_changes', { event: '*', table: 'restaurants', schema: 'public' }, () => {
        fetchRestaurants();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredRestaurants = useMemo(() => {
    // First, filter out duplicates by name and address just in case
    const uniqueMap = new Map<string, Restaurant>();
    restaurants.forEach(r => {
      const id = `${r.name}|${r.address}`.toLowerCase().trim();
      if (!uniqueMap.has(id)) {
        uniqueMap.set(id, r);
      }
    });
    const uniqueRestaurants = Array.from(uniqueMap.values());

    return uniqueRestaurants.filter(restaurant => {
      // Dish filter
      let matchesDishes = selectedDishes.length === 0;
      
      if (selectedDishes.length > 0) {
        matchesDishes = selectedDishes.some(dish => {
          if (dish === 'custom') {
            if (!customDish) return true; // If custom selected but no text, show all (or could show none)
            // Check if any of the restaurant's dishes match the custom string (case-insensitive)
            return restaurant.dishes.some(d => d.toLowerCase().includes(customDish.toLowerCase()));
          }
          return restaurant.dishes.includes(dish);
        });
      }
      
      // Price filter
      let matchesPrice = true;
      if (selectedPriceRange === 'custom') {
        matchesPrice = customPrice === 0 || restaurant.price <= customPrice;
      } else {
        const range = PRICE_RANGES.find(r => r.id === selectedPriceRange);
        if (range) {
          matchesPrice = restaurant.price >= range.min && restaurant.price <= range.max;
        }
      }

      return matchesDishes && matchesPrice;
    }).sort((a, b) => {
      // If a single dish is selected, sort by dishScore for that dish
      if (selectedDishes.length === 1) {
        let dishId = selectedDishes[0] === 'custom' ? customDish : selectedDishes[0];
        if (dishId) {
          dishId = dishId.toLowerCase(); // Normalize for lookup
          
          // Find the key in dishScore that matches (case-insensitive)
          const scoreKeyA = Object.keys(a.dishScore || {}).find(k => k.toLowerCase() === dishId);
          const scoreKeyB = Object.keys(b.dishScore || {}).find(k => k.toLowerCase() === dishId);
          
          const scoreA = scoreKeyA ? a.dishScore![scoreKeyA] : 0;
          const scoreB = scoreKeyB ? b.dishScore![scoreKeyB] : 0;
          
          if (scoreA !== scoreB) return scoreB - scoreA;
        }
      }

      if (sortOption === 'price') return a.price - b.price;
      if (sortOption === 'rating') return b.rating - a.rating;
      // Distance sorting would require user location, simplified for now
      return 0;
    });
  }, [restaurants, selectedDishes, selectedPriceRange, customPrice, customDish, sortOption]);

  const handleOpenReviewModal = (restaurant: Restaurant) => {
    setInitialRestaurantForModal(restaurant);
    setIsModalOpen(true);
  };

  const uploadImage = async (file: File, path: string) => {
    console.log(`Starting upload to ${path}...`);
    
    // Image compression options
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };

    let fileToUpload = file;
    try {
      console.log('Compressing image...');
      fileToUpload = await imageCompression(file, options);
      console.log(`Compression complete. Original size: ${file.size / 1024 / 1024}MB, New size: ${fileToUpload.size / 1024 / 1024}MB`);
    } catch (error) {
      console.error('Compression failed, uploading original:', error);
    }

    setIsUploading(true);
    setUploadProgress(0);

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('photos')
      .upload(filePath, fileToUpload, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      setIsUploading(false);
      throw error;
    }

    setIsUploading(false);
    const { data: { publicUrl } } = supabase.storage
      .from('photos')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleAddRestaurant = async (data: any) => {
    try {
      // Check for duplicates first
      const identifier = `${data.name}|${data.address}`.toLowerCase().trim();
      const isDuplicate = restaurants.some(r => `${r.name}|${r.address}`.toLowerCase().trim() === identifier);
      
      if (isDuplicate) {
        console.warn("Restaurant already exists!");
        setIsModalOpen(false);
        return;
      }

      setLoading(true);
      let photoUrl = '';
      if (data.photoFile) {
        photoUrl = await uploadImage(data.photoFile, 'restaurants');
      }

      const { photoFile, ...restData } = data;
      const restaurantData = {
        name: restData.name,
        address: restData.address,
        dishes: restData.dishes,
        price: restData.price,
        photo_url: photoUrl,
        rating: 0,
        avg_rating: 0,
        review_count: 0,
        total_reviews: 0,
        avg_price: data.price,
        likes: 0,
        dislikes: 0,
        dish_score: {},
        description: restData.description,
        submitter: restData.submitter,
        location: restData.location,
        created_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('restaurants')
        .insert([restaurantData]);

      if (error) throw error;
      console.log('Restaurant added successfully!');
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error adding restaurant:', error);
    } finally {
      setLoading(false);
    }
  };

  const recalculateRestaurantMetrics = async (restaurantId: string) => {
    try {
      // Fetch the restaurant to get its initial price
      const { data: restaurant, error: restFetchError } = await supabase
        .from('restaurants')
        .select('price')
        .eq('id', restaurantId)
        .single();

      if (restFetchError) throw restFetchError;

      const { data: reviewsData, error: fetchError } = await supabase
        .from('reviews')
        .select('*')
        .eq('restaurant_id', restaurantId);

      if (fetchError) throw fetchError;
      
      const reviews = (reviewsData || []).map(r => ({
        ...r,
        priceSpent: r.price_spent,
        dishId: r.dish_id
      }));

      const reviewCount = reviews.length;
      if (reviewCount === 0) return;

      const totalRating = reviews.reduce((acc, curr) => acc + curr.rating, 0);
      const avgRating = totalRating / reviewCount;
      
      const totalPrice = reviews.reduce((acc, curr) => acc + curr.priceSpent, 0) + restaurant.price;
      const avgPrice = Math.round(totalPrice / (reviewCount + 1));

      const dishCounts: { [dishId: string]: number } = {};
      const dishGroupedPrices: { [dishId: string]: number[] } = {};
      const dishDisplayNames: { [dishId: string]: string } = {}; // Store original casing for display
      
      reviews.forEach(review => {
        if (review.dishId) {
          const isPredefined = DISH_TYPES.some(d => d.id === review.dishId);
          const normalizedId = isPredefined ? review.dishId : review.dishId.toLowerCase();
          
          if (!isPredefined && !dishDisplayNames[normalizedId]) {
            dishDisplayNames[normalizedId] = review.dishId; // Keep the first casing we find
          }

          dishCounts[normalizedId] = (dishCounts[normalizedId] || 0) + 1;
          if (!dishGroupedPrices[normalizedId]) dishGroupedPrices[normalizedId] = [];
          dishGroupedPrices[normalizedId].push(review.priceSpent);
        }
      });

      const dishScore: { [dishId: string]: number } = {};
      const dishStats: { [dishId: string]: { avgPrice: number; reviewCount: number; bestComment?: string; displayName?: string } } = {};
      
      Object.keys(dishCounts).forEach(dishId => {
        dishScore[dishId] = dishCounts[dishId] / reviewCount;
        const prices = dishGroupedPrices[dishId];
        const avgDishPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
        
        const isPredefined = DISH_TYPES.some(d => d.id === dishId);
        const dishReviews = reviews.filter(r => {
          const rId = isPredefined ? r.dishId : (r.dishId?.toLowerCase());
          return rId === dishId;
        });

        const reviewsWithComments = dishReviews.filter(r => r.comment && r.comment.trim().length > 0);
        const bestReview = reviewsWithComments.length > 0
          ? reviewsWithComments.reduce((prev, curr) => (curr.likes || 0) > (prev.likes || 0) ? curr : prev, reviewsWithComments[0])
          : null;
        
        dishStats[dishId] = {
          avgPrice: avgDishPrice,
          reviewCount: dishCounts[dishId],
          bestComment: bestReview?.comment,
          displayName: dishDisplayNames[dishId] // Will be undefined for predefined
        };
      });

      await supabase
        .from('restaurants')
        .update({
          rating: avgRating,
          avg_rating: avgRating,
          avg_price: avgPrice,
          review_count: reviewCount,
          total_reviews: reviewCount,
          dish_score: dishScore,
          dish_stats: dishStats,
          dishes: Array.from(new Set([...(Object.keys(dishCounts))]))
        })
        .eq('id', restaurantId);
    } catch (error) {
      console.error('Error recalculating metrics:', error);
    }
  };

  const handleAddReview = async (restaurantId: string, reviewData: any) => {
    try {
      setLoading(true);
      let photoUrl = '';
      if (reviewData.photoFile) {
        photoUrl = await uploadImage(reviewData.photoFile, `reviews/${restaurantId}`);
      }

      const { photoFile, ...restReviewData } = reviewData;
      
      // 1. Add review
      const { error: reviewError } = await supabase
        .from('reviews')
        .insert([{
          restaurant_id: restaurantId,
          rating: restReviewData.rating,
          comment: restReviewData.comment,
          submitter: restReviewData.submitter,
          price_spent: restReviewData.priceSpent,
          dish_id: restReviewData.dishId,
          photo_url: photoUrl,
          created_at: new Date().toISOString(),
          likes: 0,
          dislikes: 0
        }]);

      if (reviewError) throw reviewError;

      // 2. Recalculate all metrics
      await recalculateRestaurantMetrics(restaurantId);

      console.log('Review added and restaurant metrics updated successfully!');
      setIsModalOpen(false);
      setInitialRestaurantForModal(null);
    } catch (error) {
      console.error('Error adding review:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewReact = async (reviewId: string, type: 'likes' | 'dislikes') => {
    try {
      // 1. Get the review to find the restaurant_id
      const { data: review, error: fetchError } = await supabase
        .from('reviews')
        .select('restaurant_id')
        .eq('id', reviewId)
        .single();
      
      if (fetchError) throw fetchError;

      // 2. Increment reaction
      const { error: reactError } = await supabase.rpc('increment_review_reaction', {
        review_id: reviewId,
        reaction_type: type
      });
      if (reactError) throw reactError;

      // 3. Recalculate metrics for the restaurant (to update bestComment)
      if (review?.restaurant_id) {
        await recalculateRestaurantMetrics(review.restaurant_id);
      }
    } catch (error) {
      console.error('Error reacting to review:', error);
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
        <Navbar />
        
        <main className="flex-1 flex flex-col">
          <FilterBar 
            selectedDishes={selectedDishes}
            setSelectedDishes={setSelectedDishes}
            selectedPriceRange={selectedPriceRange}
            setSelectedPriceRange={setSelectedPriceRange}
            customPrice={customPrice}
            setCustomPrice={setCustomPrice}
            customDish={customDish}
            setCustomDish={setCustomDish}
          />

          <StatsBar restaurants={filteredRestaurants} />

          <div className="p-4 max-w-7xl mx-auto w-full space-y-6">
            <MapContainer 
              restaurants={filteredRestaurants} 
              onAddRestaurant={() => setIsModalOpen(true)}
              selectedDishes={selectedDishes}
              customDish={customDish}
            />

            <RestaurantList 
              restaurants={filteredRestaurants}
              sortOption={sortOption}
              setSortOption={setSortOption}
              onAddReview={handleOpenReviewModal}
              selectedDishes={selectedDishes}
              customDish={customDish}
            />
          </div>
        </main>

        <AddRestaurantModal 
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setInitialRestaurantForModal(null);
          }}
          onSubmit={handleAddRestaurant}
          onAddReview={handleAddReview}
          initialRestaurant={initialRestaurantForModal}
        />

        {loading && (
          <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[200] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 w-full max-w-xs px-6">
              <div className="w-12 h-12 border-4 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
              <p className="text-[#1D9E75] font-bold animate-pulse">
                {isUploading ? t('uploading') || 'Uploading...' : t('loading')}
              </p>
              
              {isUploading && (
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    className="bg-[#1D9E75] h-full"
                  />
                </div>
              )}
              
              {isUploading && (
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {Math.round(uploadProgress)}%
                </p>
              )}
            </div>
          </div>
        )}

        <footer className="bg-white border-t border-gray-100 py-8 px-4 mt-12">
          <div className="max-w-7xl mx-auto text-center">
            <div className="flex justify-center gap-0.5 mb-4 items-center">
              <div className="w-8 h-4 bg-[#1D9E75]" title="Green"></div>
              <div className="w-1 h-4 bg-[#CE1126]" title="Red"></div>
              <div className="w-8 h-4 bg-white border border-gray-100" title="White"></div>
              <div className="w-1 h-4 bg-[#CE1126]" title="Red"></div>
              <div className="w-8 h-4 bg-[#0099B5]" title="Blue"></div>
            </div>
            <p className="text-gray-400 text-xs font-medium">
              &copy; {new Date().getFullYear()} Arzoni — {t('tagline')}
            </p>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
