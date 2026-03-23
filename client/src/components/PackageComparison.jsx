import React from 'react';
import { Link } from 'react-router-dom';

const PackageComparison = ({ packages, onRemove }) => {
  if (!packages || packages.length === 0) return null;

  return (
    <div className="overflow-x-auto my-8 bg-white rounded-xl shadow-lg border border-gray-200 animate-fadeInUp">
      <div className="p-4 bg-[#0B1C3E] text-white flex justify-between items-center">
        <h3 className="font-bold text-lg">Package Comparison</h3>
        <span className="text-sm bg-[#D4AF37] text-[#0B1C3E] px-2 py-1 rounded font-bold">{packages.length} Selected</span>
      </div>
      <table className="min-w-full text-sm text-left">
        <thead>
          <tr>
            <th className="p-4 bg-gray-50 border-b border-gray-200 font-bold text-gray-700 min-w-37.5">Feature</th>
            {packages.map(pkg => (
              <th key={pkg._id || pkg.id} className="p-4 bg-gray-50 border-b border-gray-200 min-w-50 relative group">
                <div className="flex flex-col gap-2">
                  <span className="text-[#0B1C3E] font-bold text-lg">{pkg.title}</span>
                  {onRemove && (
                    <button 
                      onClick={() => onRemove(pkg._id || pkg.id)}
                      className="text-red-500 hover:text-red-700 text-xs underline self-start"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-4 border-b border-gray-100 font-semibold bg-gray-50/50">Price</td>
            {packages.map(pkg => (
              <td key={pkg._id || pkg.id} className="p-4 border-b border-gray-100 text-[#D4AF37] font-bold text-lg">
                ${typeof pkg.price === 'number' ? pkg.price.toLocaleString() : pkg.price}
              </td>
            ))}
          </tr>
          <tr>
            <td className="p-4 border-b border-gray-100 font-semibold bg-gray-50/50">Destination</td>
            {packages.map(pkg => (
              <td key={pkg._id || pkg.id} className="p-4 border-b border-gray-100">
                {pkg.destination}
              </td>
            ))}
          </tr>
          <tr>
            <td className="p-4 border-b border-gray-100 font-semibold bg-gray-50/50">Duration</td>
            {packages.map(pkg => (
              <td key={pkg._id || pkg.id} className="p-4 border-b border-gray-100">
                {pkg.duration}
              </td>
            ))}
          </tr>
          <tr>
            <td className="p-4 border-b border-gray-100 font-semibold bg-gray-50/50">Type</td>
            {packages.map(pkg => (
              <td key={pkg._id || pkg.id} className="p-4 border-b border-gray-100">
                {pkg.type}
              </td>
            ))}
          </tr>
          <tr>
            <td className="p-4 border-b border-gray-100 font-semibold bg-gray-50/50">Description</td>
            {packages.map(pkg => (
              <td key={pkg._id || pkg.id} className="p-4 border-b border-gray-100 text-gray-600 italic">
                {pkg.description && pkg.description.length > 80 
                  ? `${pkg.description.substring(0, 80)}...` 
                  : pkg.description}
              </td>
            ))}
          </tr>
          <tr>
            <td className="p-4 border-b border-gray-100 bg-gray-50/50"></td>
            {packages.map(pkg => (
              <td key={pkg._id || pkg.id} className="p-4 border-b border-gray-100">
                <Link 
                  to={`/packages/${pkg._id || pkg.id}`}
                  className="block w-full text-center bg-[#0B1C3E] text-white py-2 rounded hover:bg-[#1a2f55] transition-colors font-bold"
                >
                  View Details
                </Link>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default PackageComparison;