
//Users/issatende/Projects/nuurpath-travels/client/src/pages/PackagesPage.jsx
import React, { useState, useEffect } from 'react';
import SEO from '../components/SEO';
import api from '../api';

const PackagesPage = () => {
    const [packages, setPackages] = useState([]);
    
    useEffect(() => {
        const fetch = async () => {
            try {
                const { data } = await api.packages.getAll();
                setPackages(data.packages || data);
            } catch (err) {
                 console.error("Failed to load packages");
            }
        };
        fetch();
    }, []);

    return (
        <div className="bg-gray-50 min-h-screen py-24">
            <SEO title="Packages" />
            <div className="container mx-auto px-4">
                <h1 className="text-4xl font-black uppercase text-[#0B1C3E] mb-12">Available Packages</h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    {packages.map(pkg => (
                        <div key={pkg.id} className="bg-white rounded-3xl overflow-hidden shadow-lg border border-gray-100">
                            <div className="h-64 bg-gray-200 relative">
                                {pkg.images?.[0] && <img src={pkg.images[0]} alt={pkg.title} className="w-full h-full object-cover"/>}
                                <div className="absolute top-4 right-4 bg-white px-3 py-1 text-[10px] font-bold uppercase rounded-full">{pkg.type}</div>+                            </div>
                            <div className="p-8">
                                <h3 className="text-lg font-black uppercase text-[#0B1C3E] mb-2">{pkg.title}</h3>
                                <p className="text-gray-500 text-sm mb-4">{pkg.destination}</p>
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-xl">${pkg.price}</span>
                                    {/* Link to detail page if you have one, or simple alert */}
                                    <button className="px-4 py-2 bg-[#0B1C3E] text-white rounded-lg text-xs font-bold uppercase">View</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PackagesPage;
