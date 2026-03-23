import React, { useState, useEffect } from 'react';

const TripCountdown = ({ trip }) => {
    const [timeLeft, setTimeLeft] = useState(null);

    useEffect(() => {
        if (!trip) return;

        const calculateTimeLeft = () => {
            const now = new Date();
            const difference = trip.date - now;

            if (difference <= 0) {
                setTimeLeft(null);
                return;
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((difference / 1000 / 60) % 60);
            const seconds = Math.floor((difference / 1000) % 60);

            setTimeLeft({ days, hours, minutes, seconds });
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(timer);
    }, [trip]);

    if (!trip || !timeLeft) return null;

    return (
        <div className="bg-gradient-to-r from-[#D4AF37] to-[#b5902f] rounded-xl p-6 text-white shadow-lg mb-8 relative overflow-hidden">
            <div className="relative z-10">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-sm font-bold mb-1 text-[#0B1C3E] uppercase tracking-wider opacity-80">Upcoming Trip</h3>
                        <p className="text-2xl font-bold mb-4 text-white">{trip.title}</p>
                    </div>
                    <div className="text-right">
                         <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase">
                            {trip.type}
                         </span>
                    </div>
                </div>
                
                <div className="flex gap-3 md:gap-6 text-center">
                    {Object.entries(timeLeft).map(([unit, value]) => (
                        <div key={unit} className="bg-[#0B1C3E]/20 rounded-lg p-3 min-w-[70px] backdrop-blur-sm border border-white/10">
                            <span className="block text-3xl font-bold">{value}</span>
                            <span className="text-[10px] uppercase font-bold opacity-80">{unit}</span>
                        </div>
                    ))}
                </div>
                <p className="mt-4 text-sm font-medium text-[#0B1C3E] flex items-center gap-2">
                    <span>📅</span> {trip.date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>
            <div className="absolute -right-6 -bottom-6 opacity-10 text-9xl transform rotate-12">✈️</div>
        </div>
    );
};

export default TripCountdown;