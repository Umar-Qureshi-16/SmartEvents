import API_BASE_URL from '../../apiConfig';

/** Stored picture paths start with /api/v1; point them at the configured API. */
export const resolveSrc = (src) => (src && src.startsWith('/api/v1/') ? API_BASE_URL + src.slice('/api/v1'.length) : src);

export const uid = () => Math.random().toString(36).slice(2, 10);

const images = new Map();
/** Loads a picture once (CORS-enabled so the canvas can be exported). */
export function loadImage(src) {
    const url = resolveSrc(src);
    if (!images.has(url)) {
        images.set(url, new Promise((resolve, reject) => {
            const img = new window.Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => { images.delete(url); reject(new Error('picture failed to load')); };
            img.src = url;
        }));
    }
    return images.get(url);
}

export const ARTBOARDS = [
    { id: 'stage', label: 'Stage backdrop 16:9', width: 1920, height: 1080 },
    { id: 'square', label: 'Square post 1:1', width: 1080, height: 1080 },
    { id: 'portrait', label: 'Portrait 4:5', width: 1080, height: 1350 },
    { id: 'a4', label: 'A4 landscape', width: 1754, height: 1240 },
];

export const FONTS = ['Georgia', 'Times New Roman', 'Arial', 'Trebuchet MS', 'Verdana', 'Courier New', 'Brush Script MT', 'Palatino Linotype'];
