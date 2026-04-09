import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, 
  Store, 
  Image as ImageIcon, 
  Bell, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle,
  Search,
  MoreVertical,
  ArrowLeft,
  Star,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { Restaurant } from '../types';

interface AdminDashboardProps {
  onBack: () => void;
}

type AdminTab = 'overview' | 'restaurants' | 'banners' | 'notifications';

export default function AdminDashboard({ onBack }: AdminDashboardProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching restaurants:', error);
    } else {
      const mappedData = (data || []).map(r => ({
        ...r,
        avgPrice: r.avg_price,
        avgRating: r.avg_rating,
        reviewCount: r.review_count,
        photoUrl: r.photo_url,
        isSponsored: r.is_sponsored,
        isVerified: r.is_verified
      }));
      setRestaurants(mappedData as Restaurant[]);
    }
    setLoading(false);
  };

  const toggleSponsored = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('restaurants')
      .update({ is_sponsored: !currentStatus })
      .eq('id', id);

    if (error) {
      console.error('Error updating sponsored status:', error);
    } else {
      setRestaurants(prev => prev.map(r => r.id === id ? { ...r, isSponsored: !currentStatus } : r));
    }
  };

  const toggleVerified = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('restaurants')
      .update({ is_verified: !currentStatus })
      .eq('id', id);

    if (error) {
      console.error('Error updating verified status:', error);
    } else {
      setRestaurants(prev => prev.map(r => r.id === id ? { ...r, isVerified: !currentStatus } : r));
    }
  };

  const filteredRestaurants = restaurants.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: restaurants.length,
    sponsored: restaurants.filter(r => r.isSponsored).length,
    verified: restaurants.filter(r => r.isVerified).length,
    food: restaurants.filter(r => r.category === 'food').length,
    clothes: restaurants.filter(r => r.category === 'clothes').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Admin Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <LayoutDashboard className="text-amber-500" size={24} />
                {t('adminDashboard')}
              </h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Management Portal</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end leading-none mr-2">
              <span className="text-[10px] font-black text-amber-600 uppercase tracking-tighter">System Administrator</span>
              <span className="text-[9px] font-bold text-gray-400">Live Control</span>
            </div>
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 border border-amber-100">
              <TrendingUp size={20} />
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full flex flex-col md:flex-row">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 p-6 space-y-2 border-r border-gray-100 bg-white/50">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'overview' ? 'bg-amber-50 text-amber-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <LayoutDashboard size={18} />
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('restaurants')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'restaurants' ? 'bg-amber-50 text-amber-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Store size={18} />
            Restaurants & Shops
          </button>
          <button 
            onClick={() => setActiveTab('banners')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'banners' ? 'bg-amber-50 text-amber-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <ImageIcon size={18} />
            Ad Banners
          </button>
          <button 
            onClick={() => setActiveTab('notifications')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'notifications' ? 'bg-amber-50 text-amber-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Bell size={18} />
            Push Notifications
          </button>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div 
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Listings</p>
                    <p className="text-3xl font-black text-gray-900">{stats.total}</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">Sponsored</p>
                    <p className="text-3xl font-black text-gray-900">{stats.sponsored}</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Verified</p>
                    <p className="text-3xl font-black text-gray-900">{stats.verified}</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-2">Food/Clothes</p>
                    <p className="text-3xl font-black text-gray-900">{stats.food}/{stats.clothes}</p>
                  </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center space-y-4">
                  <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mx-auto">
                    <TrendingUp size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Welcome to your Admin Center</h3>
                  <p className="text-gray-500 max-w-md mx-auto text-sm">
                    From here you can manage your advertising revenue, verify high-quality locations, and communicate with your users.
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'restaurants' && (
              <motion.div 
                key="restaurants"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                  <h2 className="text-xl font-black text-gray-900">Manage Listings</h2>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                      type="text"
                      placeholder="Search restaurants..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Listing</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Sponsored</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Verified</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {loading ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center">
                              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                            </td>
                          </tr>
                        ) : filteredRestaurants.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm italic">
                              No listings found matching your search.
                            </td>
                          </tr>
                        ) : (
                          filteredRestaurants.map(r => (
                            <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-100 shrink-0">
                                    <img src={r.photoUrl || 'https://picsum.photos/seed/food/100/100'} alt={r.name} className="w-full h-full object-cover" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-gray-900">{r.name}</p>
                                    <p className="text-[10px] text-gray-400 flex items-center gap-1">
                                      <MapPin size={10} />
                                      {r.address}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <button 
                                  onClick={() => toggleSponsored(r.id!, r.isSponsored || false)}
                                  className={`p-2 rounded-xl transition-all ${
                                    r.isSponsored 
                                      ? 'bg-amber-50 text-amber-600 border border-amber-100' 
                                      : 'bg-gray-50 text-gray-300 border border-gray-100 hover:text-amber-400'
                                  }`}
                                  title={r.isSponsored ? "Remove Promotion" : "Promote to Top"}
                                >
                                  <Star size={18} className={r.isSponsored ? "fill-amber-500" : ""} />
                                </button>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <button 
                                  onClick={() => toggleVerified(r.id!, r.isVerified || false)}
                                  className={`p-2 rounded-xl transition-all ${
                                    r.isVerified 
                                      ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                                      : 'bg-gray-50 text-gray-300 border border-gray-100 hover:text-blue-400'
                                  }`}
                                  title={r.isVerified ? "Unverify" : "Mark as Verified"}
                                >
                                  <CheckCircle2 size={18} />
                                </button>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button className="p-2 text-gray-300 hover:text-gray-600 transition-colors">
                                  <MoreVertical size={18} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {(activeTab === 'banners' || activeTab === 'notifications') && (
              <motion.div 
                key="coming-soon"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 text-center space-y-4"
              >
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mx-auto">
                  <AlertCircle size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Module Coming Soon</h3>
                <p className="text-gray-500 max-w-md mx-auto text-sm">
                  We are building the {activeTab === 'banners' ? 'Ad Banner Manager' : 'Push Notification Center'}. This will be available in the next update.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
