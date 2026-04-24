import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CONFIG } from '../config';

const getMediaUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = CONFIG.API_BASE_URL.replace('/api', '');
    return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
};

const MemoriesGallery = () => {
    const [memories, setMemories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchMemories = async () => {
            try {
                const res = await axios.get('/api/reviews');
                setMemories(res.data);
                setError(null);
            } catch (err) {
                setError('Failed to load traveler memories.');
                console.error("Error fetching memories:", err);
            } finally {
                setLoading(false);

            }
        };
        fetchMemories();
    }, []);

    if (loading) return <div className="py-20 text-center text-gray-500">Loading traveler memories...</div>;
    if (memories.length === 0) return null;
    if (error) return <div className="py-20 text-center text-red-500">{error}</div>;

    return (
        <section className="py-20 bg-white border-t border-gray-100">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-black uppercase tracking-widest text-[#0B1C3E] mb-2">Memories & Testimonials</h2>
                    <div className="w-24 h-1 bg-[#D4AF37] mx-auto mb-6"></div>
                    <p className="text-gray-600 max-w-2xl mx-auto text-lg">
                        Real stories and unforgettable moments shared by our global community of travelers.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {memories.map((memory) => (
                        <div key={memory.id} className="group bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 overflow-hidden flex flex-col hover:shadow-2xl transition-all duration-500">
                            {/* Media Section */}
                            <div className="relative h-72 bg-gray-900 overflow-hidden">
                                {memory.videos && memory.videos.length > 0 ? (
                                    <video 
                                        src={getMediaUrl(memory.videos[0])} 
                                        className="w-full h-full object-cover"
                                        controls
                                        poster={memory.images && memory.images.length > 0 ? getMediaUrl(memory.images[0]) : ''}
                                    />
                                ) : memory.images && memory.images.length > 0 ? (
                                    <img 
                                        src={getMediaUrl(memory.images[0])} 
                                        alt={memory.package?.title || "Travel Memory"} 
                                        className="w-full h-full object-cover transition-all duration-500 ease-out group-hover:scale-105 group-hover:opacity-95"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-[#0B1C3E]/5 text-[#0B1C3E]/20">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                )}
                                {memory.package && (
                                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md text-[#0B1C3E] text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm">
                                        {memory.package.title}
                                    </div>
                                )}
                            </div>

                            {/* Content Section */}
                            <div className="p-8 flex-1 flex flex-col">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden border-2 border-[#D4AF37]/20">
                                        {memory.user?.profilePicture ? (
                                            <img src={getMediaUrl(memory.user.profilePicture)} alt={memory.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[#0B1C3E] font-black bg-gray-50">
                                                {memory.name?.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-[#0B1C3E]">{memory.name}</h4>
                                        <div className="flex text-[#D4AF37] text-xs">
                                            {'★'.repeat(memory.rating)}{'☆'.repeat(5 - memory.rating)}
                                        </div>
                                    </div>
                                </div>
                                <p className="text-gray-600 leading-relaxed italic mb-6 grow">
                                    "{memory.comment}"
                                </p>
                                <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                                    {new Date(memory.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default MemoriesGallery;