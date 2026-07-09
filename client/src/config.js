import { API_BASE_URL, BACKEND_ORIGIN } from './lib/api';

const CONFIG = {
    LOGO_URL: "nuurpath-logo.png",
    PRIMARY_COLOR: "#006837", // Dark Green
    ACCENT_COLOR: "#D4AF37",  // Mustard Gold
    SECONDARY_COLOR: "#F8F9FA",
    API_BASE_URL,
    BACKEND_ORIGIN,
    WHATSAPP: (process.env.REACT_APP_WHATSAPP_NUMBER || "255764770939").trim(),
    CONTACT_PHONES: "+255 764 770 939 / +255 782 266 440 / +255 686 770 990",
    ADDRESS: "P.O. Box, Dar Es Salaam, Tanzania",
    SOCIAL: {
        facebook: "https://facebook.com/nuurpath",
        instagram: "https://instagram.com/nuurpath",
        twitter: "https://twitter.com/nuurpath",
        linkedin: "https://linkedin.com/company/nuurpath"
    },
    USE_MOCK: false,
};

export default CONFIG;
export { API_BASE_URL, BACKEND_ORIGIN, CONFIG };
