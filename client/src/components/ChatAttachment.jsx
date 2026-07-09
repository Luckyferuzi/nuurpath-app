import React, { useEffect, useState } from 'react';
import axios, { resolveBackendUrl } from '../lib/api';

const ChatAttachment = ({ path, alt = 'Shared attachment' }) => {
    const [resolvedSource, setResolvedSource] = useState('');

    useEffect(() => {
        let objectUrl = '';
        let isMounted = true;

        const loadAttachment = async () => {
            if (!path) {
                setResolvedSource('');
                return;
            }

            if (!path.startsWith('/api/chat/files/')) {
                setResolvedSource(resolveBackendUrl(path));
                return;
            }

            try {
                const response = await axios.get(path, { responseType: 'blob' });
                objectUrl = URL.createObjectURL(response.data);
                if (isMounted) {
                    setResolvedSource(objectUrl);
                }
            } catch (error) {
                console.error('Failed to load protected chat attachment:', error);
                if (isMounted) {
                    setResolvedSource('');
                }
            }
        };

        loadAttachment();

        return () => {
            isMounted = false;
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [path]);

    if (!resolvedSource) {
        return <p className="text-xs text-gray-400">Attachment unavailable.</p>;
    }

    return (
        <img
            src={resolvedSource}
            alt={alt}
            className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(resolvedSource, '_blank', 'noopener,noreferrer')}
        />
    );
};

export default ChatAttachment;
