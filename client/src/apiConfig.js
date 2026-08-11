// Prefer importing the configured axios instance from `src/api/axios.js`.
// This bare URL exists for the few components that still call fetch() directly.
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export default API_BASE_URL;
