import React, { createContext, useState, useCallback, useEffect } from 'react';
import { translations } from '../translations'; // Ensure you have this file

export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [currentLanguage, setCurrentLanguage] = useState(localStorage.getItem('language') || 'en');

    useEffect(() => {
        localStorage.setItem('language', currentLanguage);
        const rtlLanguages = ['ar', 'fa'];
        document.documentElement.dir = rtlLanguages.includes(currentLanguage) ? 'rtl' : 'ltr';
        document.documentElement.lang = currentLanguage;
    }, [currentLanguage]);

    const t = useCallback((key) => translations[currentLanguage][key] || key, [currentLanguage]);

    const availableLanguages = Object.keys(translations);

    return (
        <LanguageContext.Provider value={{ currentLanguage, setCurrentLanguage, t, availableLanguages }}>
            {children}
        </LanguageContext.Provider>
    );
};