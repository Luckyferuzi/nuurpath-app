import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import PackageCard from '../components/PackageCard';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css'; // Import datepicker styles

const travelTypes = ['adventure', 'relaxation', 'cultural', 'family', 'romantic', 'wildlife', 'city_break', 'beach'];

const PackagesPage = () => {
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();

    // Filter states
    const [destination, setDestination] = useState(searchParams.get('destination') || '');
    const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
    const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
    const [type, setType] = useState(searchParams.get('type') || '');
    const [startDate, setStartDate] = useState(
        searchParams.get('startDate') ? new Date(searchParams.get('startDate')) : null
    );
    const [endDate, setEndDate] = useState(
        searchParams.get('endDate') ? new Date(searchParams.get('endDate')) : null
    );

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [packagesPerPage] = useState(6); // Number of packages to display per page

    useEffect(() => {
        const fetchPackages = async () => {
            setLoading(true);
            setError(null);
            try {
                const query = {};
                if (destination) query.destination = destination;
                if (minPrice) query.minPrice = minPrice;
                if (maxPrice) query.maxPrice = maxPrice;
                if (type) query.type = type;
                if (startDate) query.startDate = startDate.toISOString().split('T')[0]; // Format for backend
                if (endDate) query.endDate = endDate.toISOString().split('T')[0]; // Format for backend

                const res = await axios.get('/api/packages', { params: query });
                setPackages(res.data);
                setCurrentPage(1); // Reset to first page on new search
            } catch (err) {
                console.error('Failed to fetch packages:', err);
                setError('Failed to load packages. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchPackages();
    }, [searchParams, destination, minPrice, maxPrice, type, startDate, endDate]); // Re-fetch when search params change

    const handleApplyFilters = (e) => {
        e.preventDefault();
        const newSearchParams = {};
        if (destination) newSearchParams.destination = destination;
        if (minPrice) newSearchParams.minPrice = minPrice;
        if (maxPrice) newSearchParams.maxPrice = maxPrice;
        if (type) newSearchParams.type = type;
        if (startDate) newSearchParams.startDate = startDate.toISOString().split('T')[0];
        if (endDate) newSearchParams.endDate = endDate.toISOString().split('T')[0];
        setSearchParams(newSearchParams);
    };

    const handleClearFilters = () => {
        setDestination('');
        setMinPrice('');
        setMaxPrice('');
        setType('');
        setStartDate(null);
        setEndDate(null);
        setSearchParams({}); // Clear all search parameters
    };

    // Get current packages for pagination
    const indexOfLastPackage = currentPage * packagesPerPage;
    const indexOfFirstPackage = indexOfLastPackage - packagesPerPage;
    const currentPackages = packages.slice(indexOfFirstPackage, indexOfLastPackage);

    // Change page
    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const totalPages = Math.ceil(packages.length / packagesPerPage);

    return (
        <div className="container mx-auto px-4 py-8 font-inter">
            <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center">Our Travel Packages</h1>

            {/* Filter Section */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Filter Packages</h2>
                <form onSubmit={handleApplyFilters} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div>
                        <label htmlFor="destination" className="block text-gray-700 text-sm font-medium mb-1">Destination</label>
                        <input
                            type="text"
                            id="destination"
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Paris, Tokyo"
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="minPrice" className="block text-gray-700 text-sm font-medium mb-1">Min Price</label>
                        <input
                            type="number"
                            id="minPrice"
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., 500"
                            value={minPrice}
                            onChange={(e) => setMinPrice(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="maxPrice" className="block text-gray-700 text-sm font-medium mb-1">Max Price</label>
                        <input
                            type="number"
                            id="maxPrice"
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., 2000"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="type" className="block text-gray-700 text-sm font-medium mb-1">Travel Type</label>
                        <select
                            id="type"
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                        >
                            <option value="">All Types</option>
                            {travelTypes.map((t) => (
                                <option key={t} value={t} className="capitalize">
                                    {t.replace('_', ' ')}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="startDate" className="block text-gray-700 text-sm font-medium mb-1">Available After</label>
                        <DatePicker
                            selected={startDate}
                            onChange={(date) => setStartDate(date)}
                            dateFormat="yyyy/MM/dd"
                            placeholderText="Select start date"
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="endDate" className="block text-gray-700 text-sm font-medium mb-1">Available Before</label>
                        <DatePicker
                            selected={endDate}
                            onChange={(date) => setEndDate(date)}
                            dateFormat="yyyy/MM/dd"
                            placeholderText="Select end date"
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="col-span-1 md:col-span-2 lg:col-span-2 flex justify-end gap-2">
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md font-semibold transition-colors duration-300 flex-grow md:flex-grow-0"
                        >
                            Apply Filters
                        </button>
                        <button
                            type="button"
                            onClick={handleClearFilters}
                            className="bg-gray-400 hover:bg-gray-500 text-white px-5 py-2 rounded-md font-semibold transition-colors duration-300 flex-grow md:flex-grow-0"
                        >
                            Clear Filters
                        </button>
                    </div>
                </form>
            </div>

            {/* Packages Display */}
            {loading ? (
                <div className="text-center text-gray-600 text-lg">Loading packages...</div>
            ) : error ? (
                <div className="text-center text-red-500 text-lg">{error}</div>
            ) : packages.length === 0 ? (
                <div className="text-center text-gray-600 text-lg">No packages found matching your criteria.</div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {currentPackages.map((pkg) => (
                            <PackageCard key={pkg._id} packageItem={pkg} />
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <nav className="mt-10 flex justify-center">
                            <ul className="flex list-none rounded-md shadow-sm">
                                {Array.from({ length: totalPages }, (_, i) => (
                                    <li key={i + 1}>
                                        <button
                                            onClick={() => paginate(i + 1)}
                                            className={`px-4 py-2 leading-tight border border-gray-300 ${
                                                currentPage === i + 1
                                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                    : 'bg-white text-blue-600 hover:bg-gray-100'
                                            } transition-colors duration-200`}
                                        >
                                            {i + 1}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    )}
                </>
            )}
        </div>
    );
};

export default PackagesPage;
