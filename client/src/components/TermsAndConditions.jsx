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
                            Welcome to NuurPath International Limited. These Terms and Conditions govern your use of our website, your account, and any package, flight, consultation, or service request you submit through NuurPath.
                        </p>
                    </div>

                    <div style={sectionStyle}>
                        <h3 style={sectionTitleStyle}>2. Requests, Pricing, and Confirmation</h3>
                        <p>
                            Requests submitted through the website are expressions of interest and are subject to review, availability, and follow-up confirmation from our team. Prices shown on the website are estimated package values and may change before your itinerary or service is confirmed. NuurPath does not collect online payment on the website unless clearly stated otherwise.
                        </p>
                    </div>

                    <div style={sectionStyle}>
                        <h3 style={sectionTitleStyle}>3. Communication and Follow-Up</h3>
                        <p>
                            By submitting a request, you agree that NuurPath may contact you by phone, email, or WhatsApp to confirm details, request documents, share updates, or continue service coordination.
                        </p>
                    </div>

                    <div style={sectionStyle}>
                        <h3 style={sectionTitleStyle}>4. Travel Documents</h3>
                        <p>
                            It is the traveler&apos;s responsibility to ensure that all travel documents, including passports and visas, are valid and complete. NuurPath may provide guidance, reminders, or application support, but we do not guarantee visa issuance, passport approval, or other government decisions.
                        </p>
                    </div>

                    <div style={sectionStyle}>
                        <h3 style={sectionTitleStyle}>5. Changes, Cancellations, and Supplier Terms</h3>
                        <p>
                            Confirmed travel arrangements may be subject to airline, hotel, transport, embassy, or other third-party supplier rules. Cancellations, changes, refunds, and administration fees may vary depending on the supplier and the stage of your request or confirmed itinerary.
                        </p>
                    </div>

                    <div style={sectionStyle}>
                        <h3 style={sectionTitleStyle}>6. Liability</h3>
                        <p>
                            NuurPath International Limited acts as an intermediary and service coordinator for independent suppliers that provide transportation, accommodation, appointments, tours, documentation support, or related services. Those services remain subject to the suppliers&apos; own terms and conditions.
                        </p>
                    </div>

                    <div style={{ paddingTop: '2rem', borderTop: '1px solid #f3f4f6' }}>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            For legal or privacy inquiries, please contact us at <a href="mailto:legal@nuurpathtravels.com" style={{ color: '#0B1C3E', fontWeight: 'bold', textDecoration: 'none' }}>legal@nuurpathtravels.com</a>. You can also review our <a href="/privacy" style={{ color: '#0B1C3E', fontWeight: 'bold', textDecoration: 'none' }}>Privacy Policy</a>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TermsAndConditions;
