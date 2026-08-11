import { useNavigate } from 'react-router-dom';
import React, { useState } from 'react';

function Contact() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Simulate API call for FYP
        setTimeout(() => {
            setIsSubmitting(false);
            setSuccessMessage("Thank you for reaching out! Our team will get back to you shortly.");
            setFormData({ name: '', email: '', subject: '', message: '' });
        }, 1500);
    };

    return (
        <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px', fontFamily: 'Inter, sans-serif' }}>
            <h1 style={{ fontSize: '2.5rem', color: '#0f172a', marginBottom: '10px', textAlign: 'center' }}>Get In Touch</h1>
            <p style={{ color: '#64748b', textAlign: 'center', marginBottom: '40px', fontSize: '1.1rem' }}>
                Have questions about our AI matching or want to partner with us? Send us a message.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '40px' }}>
                <div style={{ background: '#f8fafc', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ color: '#1e293b', marginBottom: '20px' }}>Contact Information</h3>
                    <div style={{ marginBottom: '15px' }}>
                        <strong style={{ display: 'block', color: '#4f46e5', marginBottom: '5px' }}>📍 Headquarters</strong>
                        <span style={{ color: '#475569' }}>DHA Phase 5, Main Boulevard<br />Lahore, Pakistan</span>
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                        <strong style={{ display: 'block', color: '#4f46e5', marginBottom: '5px' }}>📧 Email Us</strong>
                        <span style={{ color: '#475569' }}>support@smartevents.fyp</span>
                    </div>
                    <div>
                        <strong style={{ display: 'block', color: '#4f46e5', marginBottom: '5px' }}>📞 Call Us</strong>
                        <span style={{ color: '#475569' }}>+92 300 1234567</span>
                    </div>
                </div>

                <div style={{ background: '#ffffff', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0' }}>
                    {successMessage ? (
                        <div style={{ padding: '20px', background: '#dcfce3', color: '#166534', borderRadius: '8px', textAlign: 'center', fontWeight: '500' }}>
                            ✅ {successMessage}
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '5px', color: '#334155', fontWeight: '600', fontSize: '0.9rem' }}>Full Name</label>
                                    <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} placeholder="John Doe" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '5px', color: '#334155', fontWeight: '600', fontSize: '0.9rem' }}>Email Address</label>
                                    <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} placeholder="john@example.com" />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', color: '#334155', fontWeight: '600', fontSize: '0.9rem' }}>Subject</label>
                                <input type="text" required value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} placeholder="How can we help?" />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', color: '#334155', fontWeight: '600', fontSize: '0.9rem' }}>Message</label>
                                <textarea required value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '120px', resize: 'vertical', outline: 'none' }} placeholder="Type your message here..."></textarea>
                            </div>
                            <button type="submit" disabled={isSubmitting} style={{ padding: '14px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: isSubmitting ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
                                {isSubmitting ? 'Sending Message...' : 'Send Message'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Contact;
