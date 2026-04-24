import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { LanguageContext } from '../contexts/LanguageContext';
import api from '../api'; 
import SEO from '../components/SEO';

const HomePage = () => {
    const { t } = useContext(LanguageContext);
    const [featured, setFeatured] = useState([]);
    const [error, setError] = useState(null);
    
    useEffect(() => {
        const fetchPackages = async () => {
            try {
                const { data } = await api.packages.getAll({ featured: true, limit: 3 });
                setFeatured(data.packages || data);
            } catch (error) {
                setError('Failed to load featured packages. Please try again later.');
                console.error("Could not fetch packages", error);
            }
        };
        fetchPackages();
    }, []);

    return (
        <div className="bg-white">
            <SEO title="Home" />
            {/* UPDATED Hero Section: bg-[#006837] */}
            <section className="relative h-162.5 flex items-center justify-center overflow-hidden bg-[#006837]">
                <div className="relative z-10 text-center px-6 max-w-4xl">
                    <h2 className="text-[#D4AF37] font-bold tracking-[8px] uppercase mb-4 text-[10px]">{t('journeyToExcellence')}</h2>
                    <h1 className="text-white text-5xl md:text-7xl font-black mb-6 leading-tight tracking-tighter uppercase">{t('yourSacredLuxuryTravelPartner')}</h1>
                    <Link to="/packages" className="px-10 py-5 bg-[#D4AF37] text-[#006837] rounded-2xl font-black uppercase text-[11px] tracking-[4px] shadow-2xl hover:scale-105 transition-all">{t('explorePackages')}</Link>
                </div>
            </section>

            {/* Featured Packages */}
            <section className="container mx-auto px-4 py-24">
                 {/* UPDATED Text Color: text-[#006837] */}
                 {error && (
                    <div className="text-center text-red-500 mb-8">{error}</div>
                 )}
                 <h2 className="text-4xl font-black tracking-tighter uppercase text-[#006837] leading-none mb-10">Featured Journeys</h2>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    {featured.map(pkg => (
                        <div key={pkg.id} className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-lg group">
                            <div className="h-64 relative overflow-hidden bg-gray-200">
                                {pkg.images && pkg.images[0] && <img src={pkg.images[0]} alt={pkg.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />}
                            </div>
                            <div className="p-8">
                                {/* UPDATED Title: text-[#006837] */}
                                <h3 className="text-xl font-black uppercase tracking-tighter text-[#006837] mb-4">{pkg.title}</h3>
                                <div className="flex justify-between items-center pt-6 border-t border-gray-50">
                                    <span className="text-2xl font-black text-[#006837] tracking-tighter">${pkg.price}</span>
                                    {/* UPDATED Button: bg-[#006837] */}
                                    <Link to={`/packages/${pkg.id}`} className="px-6 py-3 bg-[#006837] text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Details</Link>
                                </div>
                            </div>
                        </div>
                    ))}
                 </div>
            </section>
        </div>
    );
};

export default HomePage;