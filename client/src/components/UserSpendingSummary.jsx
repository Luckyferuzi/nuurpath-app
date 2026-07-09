import React, { useMemo } from 'react';
import { isOperationalOpenStatus } from '../lib/operationalPipeline.js';

const UserSpendingSummary = ({ bookings }) => {
    const { total, count } = useMemo(() => {
        let totalAmount = 0;
        let activeCount = 0;

        if (bookings && bookings.length > 0) {
            bookings.forEach(booking => {
                if (isOperationalOpenStatus(booking.status) && booking.package?.price) {
                    totalAmount += Number(booking.package.price) * (booking.passengers || 1);
                    activeCount++;
                }
            });
        }

        return { total: totalAmount, count: activeCount };
    }, [bookings]);

    if (count === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-gradient-to-r from-[#0B1C3E] to-[#1a2f55] rounded-xl p-6 text-white shadow-lg">
                <p className="text-sm opacity-80 mb-1">Estimated Request Value</p>
                <p className="text-3xl font-bold text-[#D4AF37]">
                    ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-center">
                <p className="text-sm text-gray-500 mb-1">Active Bookings</p>
                <p className="text-3xl font-bold text-[#0B1C3E]">{count}</p>
            </div>
        </div>
    );
};

export default UserSpendingSummary;
