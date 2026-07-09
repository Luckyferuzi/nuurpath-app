import React, { useEffect } from 'react';

const PrivacyPolicy = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
        document.title = 'Privacy Policy | NuurPath International Limited';
    }, []);

    const containerStyle = {
        padding: '60px 20px',
        backgroundColor: '#f9fafb',
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
        color: '#0B1C3E',
        marginBottom: '2rem',
        lineHeight: '1'
    };

    const dividerStyle = {
        height: '4px',
        width: '64px',
        backgroundColor: '#D4AF37',
        marginBottom: '3rem'
    };

    const cardStyle = {
        backgroundColor: 'white',
        padding: '3rem',
        borderRadius: '2.5rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid #f3f4f6',
        color: '#4b5563',
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
                <h1 style={headerStyle}>Privacy Policy</h1>
                <div style={dividerStyle}></div>

                <div style={cardStyle}>
                    <p style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '2rem' }}>Effective Date: January 2024</p>

                    <div style={sectionStyle}>
                        <h3 style={sectionTitleStyle}>1. Information We Collect</h3>
                        <p>
                            We may collect the personal information you provide when you browse our services, create an account, contact us, or submit a package, flight, consultation, visa, passport, or other travel-related request. This may include your name, email, phone or WhatsApp number, travel preferences, uploaded documents, and any details you choose to share with us.
                        </p>
                    </div>

                    <div style={sectionStyle}>
                        <h3 style={sectionTitleStyle}>2. How We Use Your Information</h3>
                        <p>
                            We use your information to respond to inquiries, review and manage requests, continue conversations on phone, email, or WhatsApp, coordinate with travel or service partners when needed, improve our website experience, and meet legal or operational obligations.
                        </p>
                    </div>

                    <div style={sectionStyle}>
                        <h3 style={sectionTitleStyle}>3. Request Processing and Communications</h3>
                        <p>
                            When you submit a request on the website, our team may follow up outside the website to confirm details, ask for documents, or guide the next steps. NuurPath does not process online payment on the website unless clearly stated otherwise.
                        </p>
                    </div>

                    <div style={sectionStyle}>
                        <h3 style={sectionTitleStyle}>4. Sharing Your Information</h3>
                        <p>
                            We may share relevant information with trusted third-party suppliers, advisors, or processors only when reasonably necessary to support your request, provide a service you asked for, comply with the law, or protect our business and users.
                        </p>
                    </div>

                    <div style={sectionStyle}>
                        <h3 style={sectionTitleStyle}>5. Security and Retention</h3>
                        <p>
                            We take reasonable steps to protect your information and keep it only for as long as necessary for service delivery, record keeping, legal obligations, or legitimate business purposes.
                        </p>
                    </div>

                    <div style={sectionStyle}>
                        <h3 style={sectionTitleStyle}>6. Your Choices</h3>
                        <p>
                            You may contact us to request updates to your information, ask questions about how your data is used, or raise privacy concerns. We will review requests in line with applicable law and our operational responsibilities.
                        </p>
                    </div>

                    <div style={{ paddingTop: '2rem', borderTop: '1px solid #f3f4f6' }}>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            For privacy inquiries, please contact <a href="mailto:legal@nuurpathtravels.com" style={{ color: '#0B1C3E', fontWeight: 'bold', textDecoration: 'none' }}>legal@nuurpathtravels.com</a>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
