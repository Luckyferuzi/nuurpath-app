import React from 'react';
import { Link } from 'react-router-dom';
import { CONFIG } from '../config';
import NewsletterForm from './NewsletterForm';

const Footer = () => {
    return (
        <footer className="pt-20 pb-10 text-white bg-[#0B1C3E]">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 border-b border-white/5 pb-16">
                    <div className="space-y-6">
                        <h2 className="text-xl font-black tracking-tighter uppercase">NuurPath International</h2>
                        <p className="text-gray-400 text-sm font-medium">Redefining luxury and spiritual travel.</p>
                        <div className="flex space-x-4">
                            {Object.entries(CONFIG.SOCIAL).map(([key, url]) => (
                                <a key={key} href={url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-white capitalize text-xs">{key}</a>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-[3px] mb-8 text-[#D4AF37]">Contact</h3>
                        <ul className="space-y-4 text-sm font-medium text-gray-400 list-none p-0">
                            <li>📍 GSM PLAZA, 2nd Floor</li>
                            <li>📞 {CONFIG.CONTACT_PHONES}</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-[3px] mb-8 text-[#D4AF37]">Links</h3>
                        <ul className="space-y-4 text-sm font-medium text-gray-400 list-none p-0">
                            <li><Link to="/packages" className="hover:text-white">Packages</Link></li>
                            <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
                            <li><Link to="/login" className="hover:text-white">Login</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-[3px] mb-8 text-[#D4AF37]">Newsletter</h3>
                        <NewsletterForm />
                    </div>
                </div>
                <div className="mt-10 text-center text-[10px] font-bold uppercase tracking-[4px] text-gray-500">
                    <p>© 2025 NuurPath International Ltd.</p>
                    <p className="mt-2">
                        <Link to="/team" className="hover:text-[#D4AF37] transition-colors">
                            Developed by Software Team
                        </Link>
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;