import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../lib/api';

const WishlistPage = () => {
    const [wishlistItems, setWishlistItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchWishlist();
    }, []);

    const fetchWishlist = async () => {
        try {
            const res = await axios.get(`/wishlist`);
            setWishlistItems(res.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching wishlist:', err);
            setError('Something went wrong while loading your saved packages. Please try again.');
            setLoading(false);
        }
    };

    const removeFromWishlist = async (packageId) => {
        try {
            await axios.post(`/wishlist/${packageId}`);
            setWishlistItems((prev) => prev.filter((item) => item.packageId !== packageId));
        } catch (err) {
            console.error('Error removing from wishlist:', err);
        }
    };

    const clearWishlist = async () => {
        if (!window.confirm('Are you sure you want to clear your saved packages?')) return;

        try {
            await axios.delete(`/wishlist`);
            setWishlistItems([]);
        } catch (err) {
            console.error('Error clearing wishlist:', err);
            setError('Unable to clear your saved packages right now. Please try again.');
        }
    };

    if (loading) return <div className="text-center p-10">Loading your saved packages...</div>;
    if (error) return <div className="text-center p-10 text-red-500">{error}</div>;

    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-8 border-b border-gray-200 pb-4">
                <h2 className="text-3xl font-bold text-[#0B1C3E]">Saved Packages</h2>
                {wishlistItems.length > 0 && (
                    <button onClick={clearWishlist} className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                        Clear Saved Packages
                    </button>
                )}
            </div>

            {wishlistItems.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500 mb-4">You have not saved any packages yet.</p>
                    <Link to="/packages" className="inline-block bg-[#0B1C3E] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#1a2f55] transition-colors">
                        Explore Packages
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {wishlistItems.map((item) => {
                        const pkg = item.package;
                        if (!pkg) return null;

                        return (
                            <div key={item.id} className="border border-gray-200 rounded-xl shadow-lg overflow-hidden bg-white relative group">
                                <div className="p-6 flex flex-col h-full">
                                    <button
                                        onClick={() => removeFromWishlist(pkg.id)}
                                        className="absolute top-4 right-4 z-10 bg-white/80 p-2 rounded-full shadow-sm hover:bg-white transition-all text-red-500"
                                        title="Remove saved package"
                                    >
                                        <span className="text-xl">{'\u2665'}</span>
                                    </button>
                                    <h3 className="text-xl font-bold mb-3 text-[#0B1C3E]">{pkg.title}</h3>
                                    <p className="text-gray-600 mb-6 grow line-clamp-3">{pkg.description}</p>
                                    <div className="mt-auto">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-[#D4AF37] font-bold text-xl">
                                                {typeof pkg.price === 'number' ? `$${pkg.price.toLocaleString()}` : pkg.price}
                                            </span>
                                            <Link to={`/packages/${pkg.id}`} className="bg-[#0B1C3E] text-white px-5 py-2 rounded-lg hover:bg-[#1a2f55]">
                                                View Package
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default WishlistPage;
