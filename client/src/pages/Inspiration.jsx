import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

// Mocked Inspiration Data for FYP
const inspirationData = [
    { id: 1, type: 'Wedding', name: 'Royal Gold Wedding', desc: 'Luxurious gold and white floral setup', height: 300, img: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=600&q=80' },
    { id: 2, type: 'Birthday', name: 'Neon Cyberpunk', desc: 'Glowing neon lights for epic night parties', height: 450, img: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80' },
    { id: 3, type: 'Wedding', name: 'Boho Beach Setup', desc: 'Minimalist outdoor beach wedding', height: 400, img: 'https://images.unsplash.com/photo-1544079631-419bcf8e030a?auto=format&fit=crop&w=600&q=80' },
    { id: 4, type: 'Corporate', name: 'Tech Conference', desc: 'Modern stage setup for keynotes', height: 350, img: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=600&q=80' },
    { id: 5, type: 'Birthday', name: 'Princess Pink Theme', desc: 'Perfect pastel pink setup for kids', height: 300, img: 'https://images.unsplash.com/photo-1530103862676-de8892b12a15?auto=format&fit=crop&w=600&q=80' },
    { id: 6, type: 'Wedding', name: 'Rustic Barn', desc: 'Wooden aesthetics with fairy lights', height: 450, img: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=600&q=80' },
    { id: 7, type: 'Corporate', name: 'Gala Dinner', desc: 'Elegant round table seating', height: 350, img: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=600&q=80' },
    { id: 8, type: 'Birthday', name: 'Superhero Bash', desc: 'Action-packed theme with comic props', height: 300, img: 'https://images.unsplash.com/photo-1606335543042-57c525922933?auto=format&fit=crop&w=600&q=80' },
];

function Inspiration() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    const categories = ['All', 'Wedding', 'Birthday', 'Corporate'];

    const filteredData = inspirationData.filter(item => {
        const matchesTab = activeTab === 'All' || item.type === activeTab;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.type.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
    });

    // Masonry effect split into 3 columns
    const col1 = [], col2 = [], col3 = [];
    filteredData.forEach((item, index) => {
        if (index % 3 === 0) col1.push(item);
        else if (index % 3 === 1) col2.push(item);
        else col3.push(item);
    });

    const handleApply = (themeName) => {
        alert(`Theme "${themeName}" selected! This will direct you to the AI Assistant to generate the plan.`);
        // Since it's a prototype, we just redirect back to Dashboard for the chat
        navigate('/');
    };

    return (
        <div>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Inspiration Gallery</h1>
                <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
                    Browse Pinterest-style vision boards and themes. Find a style you love, and let our AI create the perfect event package for you!
                </p>
            </div>

            <div className="search-bar-container" style={{ margin: '0 auto 30px auto' }}>
                <input
                    type="text"
                    placeholder="Try searching 'Luxury Wedding' or 'Neon'..."
                    className="search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="category-pills" style={{ justifyContent: 'center' }}>
                {categories.map(cat => (
                    <button
                        key={cat}
                        className={`category-pill ${activeTab === cat ? 'active' : ''}`}
                        onClick={() => setActiveTab(cat)}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div className="masonry-grid">
                <div className="masonry-column">
                    {col1.map(item => (
                        <PinCard key={item.id} item={item} onApply={handleApply} />
                    ))}
                </div>
                <div className="masonry-column">
                    {col2.map(item => (
                        <PinCard key={item.id} item={item} onApply={handleApply} />
                    ))}
                </div>
                <div className="masonry-column">
                    {col3.map(item => (
                        <PinCard key={item.id} item={item} onApply={handleApply} />
                    ))}
                </div>
            </div>
        </div>
    );
}

function PinCard({ item, onApply }) {
    return (
        <div className="pin-item">
            <img src={item.img} alt={item.name} style={{ height: item.height + 'px' }} />
            <div className="pin-overlay">
                <h4>{item.name}</h4>
                <p>{item.desc}</p>
                <button className="apply-theme-btn" onClick={() => onApply(item.name)}>
                    👉 Apply this theme
                </button>
            </div>
        </div>
    );
}

export default Inspiration;
