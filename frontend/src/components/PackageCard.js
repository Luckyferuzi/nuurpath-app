import React from 'react';
import { Link } from 'react-router-dom';

const PackageCard = ({ packageItem = {} }) => { // Added default empty object for packageItem
    // Safely access properties or provide fallback values
    const { _id, title = 'Untitled Package', images, destination = 'Unknown', duration = 'N/A', type, price = 0 } = packageItem;

    // Default image if none provided or broken
    const defaultImageUrl = `https://placehold.co/400x250/cccccc/333333?text=${title.substring(0, 15)}...`;

    return (
        <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
            <Link to={`/packages/${_id}`}>
                <img
                    src={images && images.length > 0 ? images[0] : defaultImageUrl}
                    alt={title}
                    className="w-full h-48 object-cover object-center"
                    onError={(e) => { e.target.onerror = null; e.target.src = defaultImageUrl; }}
                />
            </Link>
            <div className="p-4">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    <Link to={`/packages/${_id}`} className="hover:text-blue-600 transition-colors">
                        {title}
                    </Link>
                </h3>
                <p className="text-gray-600 mb-1">
                    <span className="font-medium">Destination:</span> {destination}
                </p>
                <p className="text-gray-600 mb-1">
                    <span className="font-medium">Duration:</span> {duration}
                </p>
                {type && (
                    <p className="text-gray-600 mb-3">
                        <span className="font-medium">Type:</span> <span className="capitalize">{type.replace('_', ' ')}</span>
                    </p>
                )}
                <div className="flex justify-between items-center mt-4">
                    <span className="text-2xl font-bold text-green-700">
                        ${price.toLocaleString()}
                    </span>
                    <Link
                        to={`/packages/${_id}`}
                        className="bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 transition-colors duration-300"
                    >
                        View Details
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default PackageCard;
