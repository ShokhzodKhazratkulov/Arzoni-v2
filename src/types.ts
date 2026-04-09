export type Language = 'en' | 'uz' | 'ru';

export interface Location {
  lat: number;
  lng: number;
}

export interface Restaurant {
  id?: string;
  name: string;
  address: string;
  category: 'food' | 'clothes';
  dishes: string[];
  price: number; // This will be the initial price or the computed avgPrice
  avgPrice?: number;
  rating: number; // This will be the computed avgRating
  avgRating?: number;
  reviewCount: number;
  totalReviews?: number;
  description: string;
  submitter?: string;
  location: Location;
  createdAt: string;
  photoUrl?: string;
  likes: number;
  dislikes: number;
  dishScore?: { [dishId: string]: number };
  dishPrices?: { [dishId: string]: number };
  dishStats?: {
    [dishId: string]: {
      avgPrice: number;
      reviewCount: number;
      bestComment?: string;
      displayName?: string;
    }
  };
  isSponsored?: boolean;
  isVerified?: boolean;
}

export interface Review {
  id?: string;
  restaurantId: string;
  rating: number;
  comment: string;
  submitter: string;
  createdAt: string;
  photoUrl?: string;
  likes: number;
  dislikes: number;
  priceSpent: number;
  dishId: string;
}

export type SortOption = 'price' | 'rating' | 'distance';
