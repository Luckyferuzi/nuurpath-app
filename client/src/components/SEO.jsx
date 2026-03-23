import { useEffect } from 'react';

const SEO = ({ title, description }) => {
    useEffect(() => {
        document.title = title ? `${title} | NuurPath International Limited` : "NuurPath International Limited";
        let metaDescription = document.querySelector('meta[name="description"]');
        if (!metaDescription) {
            metaDescription = document.createElement('meta');
            metaDescription.name = "description";
            document.head.appendChild(metaDescription);
        }
        metaDescription.setAttribute('content', description || "Redefining luxury and spiritual travel with integrity and excellence.");
    }, [title, description]);
    return null;
};

export default SEO;