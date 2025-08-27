import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import PackageCard from '../components/PackageCard'; // Assuming you have this component

const HomePage = () => {
    const [destination, setDestination] = useState('');
    const [featuredPackages, setFeaturedPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchFeaturedPackages = async () => {
            try {
                // Fetch a limited number of packages, e.g., 3-4, or specific 'featured' ones
                // For simplicity, fetching all and taking a few. In a real app, backend would provide a 'featured' flag or limit.
                const res = await axios.get('/api/packages');
                setFeaturedPackages(res.data.slice(0, 3)); // Displaying first 3 packages as featured
                setLoading(false);
            } catch (err) {
                console.error('Failed to fetch featured packages:', err);
                setError('Failed to load featured packages. Please try again later.');
                setLoading(false);
            }
        };

        fetchFeaturedPackages();
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        // Navigate to packages page with the destination query parameter
        navigate(`/packages?destination=${destination}`);
    };

    return (
        <div className="font-inter">
            {/* Hero Section */}
            <section
                className="relative bg-cover bg-center h-[500px] flex items-center justify-center text-white"
                style={{ backgroundImage: "url('https://placehold.co/1920x500/007bff/ffffff?text=Your+Adventure+Awaits')" }}
            >
                <div className="absolute inset-0 bg-black opacity-50"></div>
                <div className="relative z-10 text-center p-6 rounded-lg bg-black bg-opacity-30">
                    <h1 className="text-5xl md:text-6xl font-extrabold mb-4 leading-tight">
                        Explore the World with NuurPath Travels
                    </h1>
                    <p className="text-xl md:text-2xl mb-8 font-light">
                        Unforgettable journeys, tailored just for you.
                    </p>
                    <form onSubmit={handleSearch} className="flex justify-center">
                        <input
                            type="text"
                            placeholder="Search by destination..."
                            className="w-full max-w-md p-3 rounded-l-md text-gray-800 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                        />
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-r-md text-lg font-semibold transition-colors duration-300"
                        >
                            Search
                        </button>
                    </form>
                    <div className="mt-8">
                        <Link
                            to="/packages"
                            className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-md text-lg font-semibold transition-colors duration-300 mx-2"
                        >
                            View All Packages
                        </Link>
                        <Link
                            to="/contact" // Assuming a contact page exists
                            className="bg-gray-400 hover:bg-gray-500 text-white px-8 py-3 rounded-md text-lg font-semibold transition-colors duration-300 mx-2"
                        >
                            Request Custom Tour
                        </Link>
                    </div>
                </div>
            </section>

            {/* Featured Packages Section */}
            <section className="container mx-auto px-4 py-16">
                <h2 className="text-4xl font-bold text-center text-gray-800 mb-12">Featured Travel Packages</h2>
                {loading ? (
                    <div className="text-center text-gray-600">Loading featured packages...</div>
                ) : error ? (
                    <div className="text-center text-red-500">{error}</div>
                ) : featuredPackages.length === 0 ? (
                    <div className="text-center text-gray-600">No featured packages available at the moment.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {featuredPackages.map((pkg) => (
                            <PackageCard key={pkg._id} packageItem={pkg} />
                        ))}
                    </div>
                )}
            </section>

            {/* Call to Action Section (Optional) */}
            <section className="bg-blue-700 text-white py-16 text-center">
                <h2 className="text-4xl font-bold mb-4">Ready for Your Next Adventure?</h2>
                <p className="text-xl mb-8">
                    Browse our incredible destinations or contact us for a personalized travel plan.
                </p>
                <Link
                    to="/packages"
                    className="bg-white text-blue-700 px-8 py-3 rounded-md text-lg font-semibold hover:bg-gray-100 transition-colors duration-300"
                >
                    Start Planning Now
                </Link>
            </section>
        </div>
    );
};

export default HomePage;
