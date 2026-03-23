
//Users/issatende/Projects/nuurpath-travels/client/src/pages/ContactPage.jsx
import React from 'react';
import SEO from '../components/SEO';

const ContactPage = () => (
    <div className="bg-gray-50 min-h-screen py-24">
        <SEO title="Contact" />
        <div className="container mx-auto px-4 max-w-4xl">
            <div className="bg-white p-16 rounded-[3rem] shadow-2xl border border-gray-100">
                <h1 className="text-4xl font-black uppercase text-[#0B1C3E] mb-8">Contact Us</h1>
                <p className="mb-4 text-gray-500">For urgent inquiries, please contact our support team.</p>
                <div className="grid gap-4">
                    <input type="text" placeholder="Name" className="p-4 bg-gray-50 rounded-xl" />
                    <input type="email" placeholder="Email" className="p-4 bg-gray-50 rounded-xl" />
                    <textarea rows="4" placeholder="Message" className="p-4 bg-gray-50 rounded-xl"></textarea>
                    <button className="py-4 bg-[#0B1C3E] text-white rounded-xl font-bold uppercase shadow-lg">Send Message</button>
                </div>
            </div>
        </div>
    </div>
);

export default ContactPage;
