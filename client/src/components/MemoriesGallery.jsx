import React, { useEffect, useState } from 'react';
import axios, { resolveBackendUrl } from '../lib/api';

function getMediaUrl(path) {
  if (!path) {
    return '';
  }

  return resolveBackendUrl(path);
}

const MemoriesGallery = () => {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMemories = async () => {
      try {
        const response = await axios.get('/reviews');
        setMemories(Array.isArray(response.data) ? response.data : []);
        setError(null);
      } catch (err) {
        setError('Failed to load traveler memories.');
        console.error('Error fetching memories:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMemories();
  }, []);

  if (loading) {
    return <div className="py-20 text-center text-gray-500">Loading traveler memories...</div>;
  }

  if (error && memories.length === 0) {
    return <div className="py-20 text-center text-red-500">{error}</div>;
  }

  if (memories.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-gray-100 bg-white py-20">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-2 text-3xl font-black uppercase tracking-widest text-[#0B1C3E]">Memories & Testimonials</h2>
          <div className="mx-auto mb-6 h-1 w-24 bg-[#D4AF37]"></div>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            Real stories and unforgettable moments shared by our global community of travelers.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
          {memories.map((memory) => (
            <div key={memory.id} className="group flex flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl shadow-gray-100/50 transition-all duration-500 hover:shadow-2xl">
              <div className="relative h-72 overflow-hidden bg-gray-900">
                {memory.videos && memory.videos.length > 0 ? (
                  <video
                    src={getMediaUrl(memory.videos[0])}
                    className="h-full w-full object-cover"
                    controls
                    poster={memory.images && memory.images.length > 0 ? getMediaUrl(memory.images[0]) : ''}
                  />
                ) : memory.images && memory.images.length > 0 ? (
                  <img
                    src={getMediaUrl(memory.images[0])}
                    alt={memory.package?.title || 'Travel Memory'}
                    className="h-full w-full object-cover transition-all duration-500 ease-out group-hover:scale-105 group-hover:opacity-95"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#0B1C3E]/5 text-[#0B1C3E]/20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                {memory.package && (
                  <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#0B1C3E] shadow-sm backdrop-blur-md">
                    {memory.package.title}
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col p-8">
                <div className="mb-6 flex items-center gap-4">
                  <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-[#D4AF37]/20 bg-gray-100">
                    {memory.user?.profilePicture ? (
                      <img src={getMediaUrl(memory.user.profilePicture)} alt={memory.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-50 font-black text-[#0B1C3E]">
                        {memory.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0B1C3E]">{memory.name}</h4>
                    <div className="flex text-xs text-[#D4AF37]">
                      {'\u2605'.repeat(memory.rating)}{'\u2606'.repeat(5 - memory.rating)}
                    </div>
                  </div>
                </div>
                <p className="grow text-gray-600 italic leading-relaxed">
                  "{memory.comment}"
                </p>
                <div className="mt-6 text-[10px] font-bold uppercase tracking-widest text-gray-400">
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
