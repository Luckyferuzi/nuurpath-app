import React from 'react';
import { Link } from 'react-router-dom';

const PackageComparison = ({ packages, onRemove }) => {
  if (!packages || packages.length === 0) return null;

  return (
    <div className="my-8 overflow-x-auto rounded-[1.4rem] border border-[#e5dece] bg-white shadow-sm animate-fadeInUp">
      <div className="flex items-center justify-between border-b border-[#ece4d6] px-5 py-4">
        <h3 className="text-lg font-black tracking-tight text-[#101c2d]">Package Comparison</h3>
        <span className="rounded-full bg-[#faf8f3] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#4d5562]">
          {packages.length} selected
        </span>
      </div>
      <table className="min-w-full text-sm text-left">
        <thead>
          <tr>
            <th className="min-w-37.5 border-b border-[#ece4d6] bg-[#faf8f3] p-4 font-black text-[#4d5562]">Feature</th>
            {packages.map(pkg => (
              <th key={pkg._id || pkg.id} className="min-w-50 border-b border-[#ece4d6] bg-[#faf8f3] p-4 relative group">
                <div className="flex flex-col gap-2">
                  <span className="text-lg font-black tracking-tight text-[#101c2d]">{pkg.title}</span>
                  {onRemove && (
                    <button 
                      onClick={() => onRemove(pkg._id || pkg.id)}
                      className="self-start text-xs font-semibold text-[#8a7240] underline hover:text-[#6f5c31]"
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
            <td className="border-b border-[#f0ebe2] bg-[#fcfbf8] p-4 font-semibold">Price</td>
            {packages.map(pkg => (
              <td key={pkg._id || pkg.id} className="border-b border-[#f0ebe2] p-4 text-lg font-black text-[#006837]">
                ${typeof pkg.price === 'number' ? pkg.price.toLocaleString() : pkg.price}
              </td>
            ))}
          </tr>
          <tr>
            <td className="border-b border-[#f0ebe2] bg-[#fcfbf8] p-4 font-semibold">Destination</td>
            {packages.map(pkg => (
              <td key={pkg._id || pkg.id} className="border-b border-[#f0ebe2] p-4">
                {pkg.destination}
              </td>
            ))}
          </tr>
          <tr>
            <td className="border-b border-[#f0ebe2] bg-[#fcfbf8] p-4 font-semibold">Duration</td>
            {packages.map(pkg => (
              <td key={pkg._id || pkg.id} className="border-b border-[#f0ebe2] p-4">
                {pkg.duration}
              </td>
            ))}
          </tr>
          <tr>
            <td className="border-b border-[#f0ebe2] bg-[#fcfbf8] p-4 font-semibold">Type</td>
            {packages.map(pkg => (
              <td key={pkg._id || pkg.id} className="border-b border-[#f0ebe2] p-4">
                {pkg.type}
              </td>
            ))}
          </tr>
          <tr>
            <td className="border-b border-[#f0ebe2] bg-[#fcfbf8] p-4 font-semibold">Description</td>
            {packages.map(pkg => (
              <td key={pkg._id || pkg.id} className="border-b border-[#f0ebe2] p-4 italic text-gray-600">
                {pkg.description && pkg.description.length > 80 
                  ? `${pkg.description.substring(0, 80)}...` 
                  : pkg.description}
              </td>
            ))}
          </tr>
          <tr>
            <td className="border-b border-[#f0ebe2] bg-[#fcfbf8] p-4"></td>
            {packages.map(pkg => (
              <td key={pkg._id || pkg.id} className="border-b border-[#f0ebe2] p-4">
                <Link 
                  to={`/packages/${pkg._id || pkg.id}`}
                  className="block w-full rounded-full bg-[#0B1C3E] py-2 text-center text-sm font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#1a2f55]"
                >
                  View Package
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
