import React, { useState } from 'react';
import './ChatModal.css';
import API_BASE_URL from '../apiConfig';

const quickSuggestions = [
    { label: 'Create Event', message: 'Create event' },
    { label: 'View Revenue', message: 'Show total revenue' },
    { label: 'View Bookings', message: 'Show bookings' },
];

const ChatModal = ({ onClose }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [typing, setTyping] = useState(false);

    const addMessage = (sender, text) => {
        setMessages((prev) => [...prev, { sender, text }]);
    };

    const handleSend = async () => {
        if (!input.trim()) return;
        const userMsg = input.trim();
        addMessage('user', userMsg);
        setInput('');
        setLoading(true);
        setTyping(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                addMessage('ai', "You seem to be logged out or your session has expired. Please log in again to use the AI Assistant.");
                setLoading(false);
                setTyping(false);
                return;
            }
            const res = await fetch(`${API_BASE_URL}/chatbot`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message: userMsg }),
            });
            const data = await res.json();
            if (res.ok) {
                addMessage('ai', data.reply || "I didn't understand that. Can you rephrase?");
                // Handle actions like navigation
                if (data.action && data.action.type === 'navigate') {
                    window.location.href = data.action.path;
                }
            } else {
                addMessage('ai', data.message || "I'm having trouble connecting to the service. Please try again later.");
            }
        } catch (err) {
            addMessage('ai', "Error: Could not reach the AI Assistant. Please check your connection.");
        } finally {
            setLoading(false);
            setTyping(false);
        }
    };

    const handleSuggestion = async (msg) => {
        setInput(msg);
        await handleSend();
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="chat-modal-overlay" role="dialog" aria-modal="true">
            <div className="chat-modal">
                <div className="chat-header">
                    <h3>AI Assistant</h3>
                    <button className="close-btn" onClick={onClose} aria-label="Close chat">
                        ✖
                    </button>
                </div>
                <div className="chat-messages">
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`chat-message ${msg.sender === 'user' ? 'user' : 'ai'}`}
                        >
                            {msg.text}
                        </div>
                    ))}
                    {typing && <div className="typing-indicator">AI is typing...</div>}
                </div>
                <div className="chat-input-area">
                    <input
                        type="text"
                        placeholder="Type a message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={loading}
                        aria-label="Chat input"
                    />
                    <button onClick={handleSend} disabled={loading} aria-label="Send message">
                        Send
                    </button>
                </div>
                <div className="quick-suggestions">
                    {quickSuggestions.map((s) => (
                        <button
                            key={s.label}
                            onClick={() => handleSuggestion(s.message)}
                            className="suggestion-btn"
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ChatModal;
