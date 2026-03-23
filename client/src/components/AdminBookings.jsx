import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminBookings = () => {
    const [bookings, setBookings] = useState([]);
    useEffect(() => {
        axios.get('http://localhost:5001/api/package-bookings').then(res => setBookings(res.data)).catch(err => console.log(err));
    }, []);

    return (
        <div className="p-10">
            <h2 className="text-2xl font-bold mb-4">Manage Package Bookings</h2>
            {bookings.length === 0 ? <p>No bookings yet.</p> : <p>Bookings loaded.</p>}
        </div>
    );
};

export default AdminBookings;