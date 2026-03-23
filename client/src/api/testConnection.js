import axios from 'axios';

export const testBackendConnection = async () => {
    try {
        const response = await axios.get('http://localhost:5001/');
        return response.data;
    } catch (error) {
        console.error('Error connecting to backend:', error);
        throw error;
    }
};
