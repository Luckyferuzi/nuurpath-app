//dev/null
//  /Users/issatende/Projects/nuurpath-travels/client/src/pages/UserDashboard.jsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import api from '../api';

const UserDashboard = () => {
    const { user } = useAuth();
    const [bookings, setBookings] = useState([]);
    
    useEffect(() => {
        const fetchBookings = async () => {
            try {
               const { data } = await api.bookings.getMy();
               setBookings(data);
            } catch (error) { console.error(error); }
        };
        if(user) fetchBookings();
    }, [user]);

    return (
        <div className="bg-gray-50 min-h-screen py-20">
            <SEO title="My Dashboard" />
            <div className="container mx-auto px-4">
                <div className="bg-white p-12 rounded-[3rem] shadow-xl mb-12 border border-gray-100">
                    <h2 className="text-4xl font-black uppercase tracking-tighter text-[#0B1C3E]">My Dashboard</h2>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-1">Welcome, {user?.name}</p>
                </div>
                <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
                    <h3 className="text-2xl font-black uppercase text-[#0B1C3E] mb-6">My Bookings</h3>
                    {bookings.length === 0 ? <p>No bookings yet.</p> : (
                        <ul className="space-y-4">
                            {bookings.map(b => (
                                <li key={b.id} className="p-4 bg-gray-50 rounded-xl flex justify-between">
                                    <span className="font-bold">{b.Package?.title || 'Trip'}</span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${b.status === 'Confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{b.status}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserDashboard;
