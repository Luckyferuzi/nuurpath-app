import React from 'react';

// --- Placeholder Components (Replace with actual imports in a real project) ---

// Placeholder for the Navbar Component
const Navbar = () => (
    <nav className="bg-white shadow-md sticky top-0 z-50 p-4">
        <div className="container mx-auto flex justify-between items-center text-[#0f4c81] font-bold">
            <span>NuurPath Travels</span>
            <div className="space-x-4">
                <a href="#/packages" className="hover:text-[#006b5e]">Packages</a>
                <a href="#/dashboard" className="hover:text-[#006b5e]">Dashboard</a>
            </div>
        </div>
    </nav>
);

// Placeholder for the Footer Component
const Footer = () => (
    <footer className="bg-[#0f4c81] text-white py-6">
        <div className="container mx-auto px-4 text-center text-sm text-gray-300">
            &copy; 2025 NuurPath International LTD. All rights reserved.
        </div>
    </footer>
);
// -----------------------------------------------------------------------------

/**
 * Layout component providing consistent structure (Navbar, Main Content, Footer)
 * for all application pages.
 * * It ensures the footer sticks to the bottom on short pages by enforcing min-height on main.
 */
const Layout = ({ children }) => {
    return (
        <div className="flex flex-col min-h-screen antialiased bg-gray-50">
            <Navbar />
            
            {/* Main content area. Flex-grow ensures it takes up available vertical space */}
            <main className="flex-grow">
                {children}
            </main>
            
            <Footer />
        </div>
    );
};

export default Layout;