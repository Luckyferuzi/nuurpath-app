import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
    const { user } = useAuth();

    return (
        <div className="bg-gray-50 min-h-screen py-20 animate-fade-in">
            <div className="container mx-auto px-4">
                {/* Header Section */}
                <div className="bg-[#0c1b33] p-12 rounded-[3rem] shadow-2xl mb-12 border border-white/5 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden text-white">
                    <div className="absolute top-0 right-0 p-10 opacity-10 font-black text-9xl uppercase select-none pointer-events-none">Traveler</div>
                    <div className="w-32 h-32 bg-yellow-500 rounded-[2rem] flex items-center justify-center text-[#0c1b33] text-5xl font-black shadow-2xl relative z-10">
                        {user?.name?.[0] || 'U'}
                    </div>
                    <div className="relative z-10 text-center md:text-left">
                        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">Marhaba, {user?.name}</h2>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4">
                            <span className="bg-white/10 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
                                {user?.email}
                            </span>
                            <span className="bg-yellow-500/20 text-yellow-500 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-yellow-500/20">
                                Verified Member
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Booking Status Card */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm relative overflow-hidden">
                            <div className="flex justify-between items-center mb-10">
                                <h3 className="text-xl font-black uppercase tracking-tighter text-[#0c1b33]">Active Itineraries</h3>
                                <Link to="/packages" className="text-[10px] font-black uppercase tracking-widest text-yellow-600 hover:text-yellow-700">Explore More →</Link>
                            </div>
                            
                            <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-[2rem]">
                                <div className="text-4xl mb-6 opacity-30">✈️</div>
                                <p className="text-gray-400 font-bold uppercase tracking-[3px] text-xs">
                                    Your itinerary is currently clear.
                                </p>
                                <p className="text-gray-300 text-[10px] mt-2 uppercase font-medium">Ready for your next sacred or luxury journey?</p>
                                <div className="mt-8">
                                    <Link to="/packages" className="px-10 py-4 bg-[#0c1b33] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-105 transition-all inline-block">
                                        Browse Packages
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity / Notifications */}
                        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                            <h3 className="text-xl font-black uppercase tracking-tighter text-[#0c1b33] mb-8">Recent Updates</h3>
                            <div className="space-y-6">
                                <div className="flex items-start gap-6 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                                    <div className="bg-yellow-500/20 p-3 rounded-xl text-yellow-600">✨</div>
                                    <div>
                                        <p className="font-black text-xs uppercase tracking-widest text-[#0c1b33]">Welcome to NuurPath</p>
                                        <p className="text-gray-500 text-[11px] mt-1 font-medium leading-relaxed">Thank you for joining our exclusive travel community. Your global journey begins here.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar / Quick Actions */}
                    <div className="space-y-8">
                        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                            <h3 className="text-lg font-black uppercase tracking-tighter text-[#0c1b33] mb-8">Quick Actions</h3>
                            <div className="space-y-4">
                                <Link to="/profile" className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl hover:bg-[#0c1b33] hover:text-white group transition-all">
                                    <span className="font-black text-[10px] uppercase tracking-widest">Update Profile</span>
                                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                                </Link>
                                <Link to="/contact" className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl hover:bg-[#0c1b33] hover:text-white group transition-all">
                                    <span className="font-black text-[10px] uppercase tracking-widest">Global Support</span>
                                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                                </Link>
                                <button className="w-full flex items-center justify-between p-5 bg-gray-50 rounded-2xl hover:bg-red-50 hover:text-red-600 group transition-all">
                                    <span className="font-black text-[10px] uppercase tracking-widest">Security Settings</span>
                                    <span>⚙️</span>
                                </button>
                            </div>
                        </div>

                        <div className="bg-[#c5a059] p-10 rounded-[3rem] shadow-xl text-[#0c1b33] relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-20 text-4xl">🌟</div>
                            <h3 className="text-lg font-black uppercase tracking-tighter mb-4">Need Assistance?</h3>
                            <p className="text-[11px] font-bold uppercase leading-relaxed mb-8">Our travel experts are available 24/7 for our premium members.</p>
                            <a href="https://wa.me/255764770939" target="_blank" rel="noreferrer" className="block text-center py-4 bg-[#0c1b33] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl">
                                Contact Expert
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
