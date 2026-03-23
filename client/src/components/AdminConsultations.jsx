import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminConsultations = () => {
    const [list, setList] = useState([]);
    useEffect(() => {
        axios.get('http://localhost:5001/api/consultations').then(res => setList(res.data)).catch(err => console.log(err));
    }, []);

    return (
        <div className="p-10">
            <h2 className="text-2xl font-bold mb-4">Manage Consultations</h2>
            <table className="w-full border">
                <thead><tr className="bg-gray-100"><th>Name</th><th>Date</th><th>Status</th></tr></thead>
                <tbody>
                    {list.map(item => (
                        <tr key={item.id} className="border-b"><td>{item.name}</td><td>{item.date}</td><td>{item.status}</td></tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default AdminConsultations;