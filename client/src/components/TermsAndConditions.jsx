import React, { useEffect } from 'react';

const TermsAndConditions = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
        document.title = "Terms and Conditions | NuurPath International Limited";
    }, []);

    const containerStyle = {
        padding: '60px 20px',
        backgroundColor: '#f9fafb', // gray-50
        minHeight: '100vh',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
    };

    const contentWrapperStyle = {
        maxWidth: '900px',
        margin: '0 auto'
    };

    const headerStyle = {
        fontSize: '2.25rem',
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: '-0.05em',
        color: '#0B1C3E', // brand-primary
        marginBottom: '2rem',
        lineHeight: '1'
    };

    const dividerStyle = {
        height: '4px',
        width: '64px',
        backgroundColor: '#D4AF37', // brand-accent
        marginBottom: '3rem'
    };

    const cardStyle = {
        backgroundColor: 'white',
        padding: '3rem',
        borderRadius: '2.5rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid #f3f4f6',
        color: '#4b5563', // gray-600
        lineHeight: '1.625'
    };

    const sectionTitleStyle = {
        fontSize: '1.25rem',
        fontWeight: '900',
        color: '#0B1C3E',
        textTransform: 'uppercase',
        marginBottom: '1rem',
        letterSpacing: '-0.025em'
    };

    const sectionStyle = {
        marginBottom: '2rem'
    };

    return (
        <div style={containerStyle}>
            <div style={contentWrapperStyle}>
                <h1 style={headerStyle}>Terms and Conditions</h1>
                <div style={dividerStyle}></div>
                
                <div style={cardStyle}>
                    <p style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '2rem' }}>Effective Date: January 2024</p>
                    
                    <div style={sectionStyle}>
                        <h3 style={sectionTitleStyle}>1. Introduction</h3>
                        <p>
                            Welcome to NuurPath International Limited. These Terms and Conditions govern your use of our website and services. By booking a tour, flight, or appointment with us, you agree to comply with these terms.
                        </p>
                    </div>

                    <div style={sectionStyle}>
                        <h3 style={sectionTitleStyle}>2. Bookings & Payments</h3>
                        <p>
                            All bookings are subject to availability. A deposit is required to confirm your reservation, with the balance due prior to departure as specified in your booking invoice. Prices are subject to change without notice until full payment is received.
                        </p>
                    </div>

                    <div style={sectionStyle}>
                        <h3 style={sectionTitleStyle}>3. Cancellations & Refunds</h3>
                        <p>
                            Cancellations must be made in writing. Refund policies vary depending on the service provider (airlines, hotels, etc.) and the timing of the cancellation. Administration fees may apply.
                        </p>
                    </div>

                    <div style={sectionStyle}>
                        <h3 style={sectionTitleStyle}>4. Travel Documents</h3>
                        <p>
                            It is the traveler's responsibility to ensure that all travel documents, including passports and visas, are valid and complete. NuurPath International Limited is not liable for any failure to obtain necessary documents.
                        </p>
                    </div>

                    <div style={sectionStyle}>
                        <h3 style={sectionTitleStyle}>5. Liability</h3>
                        <p>
                            NuurPath International Limited acts only as an agent for the various independent suppliers that provide hotel accommodations, transportation, sightseeing, activities, or other services connected with this itinerary. Such services are subject to the terms and conditions of those suppliers.
                        </p>
                    </div>

                    <div style={{ paddingTop: '2rem', borderTop: '1px solid #f3f4f6' }}>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            For any legal inquiries, please contact us at <a href="mailto:legal@nuurpathtravels.com" style={{ color: '#0B1C3E', fontWeight: 'bold', textDecoration: 'none' }}>legal@nuurpathtravels.com</a>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TermsAndConditions;