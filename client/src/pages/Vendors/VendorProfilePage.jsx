import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import { toast } from 'react-hot-toast';
import { Star, ShieldCheck, MapPin, Tag, Mail, MessageSquare, ArrowRight, DollarSign, Calendar, Sparkles } from 'lucide-react';

export default function VendorProfilePage({ user }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);

    // Booking modal state
    const [bookingModalOpen, setBookingModalOpen] = useState(false);
    const [selectedService, setSelectedService] = useState(null);
    const [bookingDetails, setBookingDetails] = useState({
        offerPrice: '',
        date: '',
        location: '',
        message: ''
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await axios.get(`/vendor/profile/${id}`);
                if (res.data.success) {
                    setProfile(res.data.profile);
                    setServices(res.data.services || []);
                }
            } catch (err) {
                console.error(err);
                toast.error('Failed to load provider profile.');
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [id]);

    const addToFavorites = async () => {
        if (!user) {
            toast.error('Please log in to save vendors to your wishlist.');
            return;
        }
        try {
            const targetId = profile.userId?._id || profile.userId;
            const res = await axios.post('/auth/favorites', { vendorId: targetId });
            if (res.data.success) {
                toast.success('Saved to wishlist!');
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to save to wishlist.');
        }
    };

    const handleNegotiateStart = (service) => {
        if (!user) {
            toast.error('Please log in as an organizer to negotiate pricing.');
            navigate('/login');
            return;
        }
        if (user.role !== 'customer') {
            toast.error('Only organizers/customers can book services.');
            return;
        }
        setSelectedService(service);
        setBookingDetails({
            offerPrice: service.price,
            date: '',
            location: profile.location || '',
            message: `Hello! I would like to book your service "${service.title}".`
        });
        setBookingModalOpen(true);
    };

    const handleCreateBooking = async (e) => {
        e.preventDefault();
        if (!bookingDetails.offerPrice || !bookingDetails.date) {
            toast.error('Please specify target budget and date.');
            return;
        }

        try {
            const res = await axios.post('/bookings', {
                vendorId: profile.userId?._id || profile.userId, // Points to vendor User ID
                serviceId: selectedService._id,
                offerPrice: Number(bookingDetails.offerPrice),
                eventDetails: {
                    eventType: selectedService.eventType || 'Event Listing',
                    date: new Date(bookingDetails.date),
                    location: bookingDetails.location,
                    message: bookingDetails.message
                }
            });

            if (res.status === 201) {
                toast.success('RFP Proposal submitted! Opening negotiation room...');
                setBookingModalOpen(false);
                navigate(`/negotiate/${res.data.booking._id}`);
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to submit proposal.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg">
                <div className="text-center space-y-4">
                    <Sparkles className="animate-spin text-success mx-auto" size={32} />
                    <p className="text-xs text-muted font-bold uppercase tracking-wider">Loading provider profile...</p>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg">
                <div className="text-center space-y-3">
                    <h3 className="text-lg font-bold text-fg">Provider profile not found</h3>
                    <button onClick={() => navigate('/')} className="btn-adyen-outline py-2 px-4 text-xs">Return Home</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg text-fg space-y-8 p-6 max-w-[1280px] mx-auto pt-6">
            {/* Header / Cover */}
            <div className="adyen-card bg-surface border border-border p-8 rounded-3xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="adyen-badge bg-success/10 text-success border-none font-bold uppercase">{profile.category}</span>
                        {(() => {
                            const score = profile.userId?.trustScore ?? 100;
                            const badgeColor = score >= 80 ? 'text-emerald-600 bg-emerald-100/60' : score >= 50 ? 'text-amber-600 bg-amber-100/60' : 'text-rose-600 bg-rose-100/60';
                            return (
                                <div className={`flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border border-current ${badgeColor}`}>
                                    <ShieldCheck size={14} />
                                    <span>Trust Score: {score}%</span>
                                </div>
                            );
                        })()}
                    </div>

                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-fg">
                        {profile.businessName}
                    </h1>

                    <div className="flex flex-wrap items-center gap-6 text-xs text-muted font-semibold">
                        <div className="flex items-center gap-1">
                            <MapPin size={14} className="text-success" />
                            <span>{profile.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Star size={14} className="text-amber-500 fill-amber-500" />
                            <span>{profile.rating || 5.0} ★ ({profile.reviewsCount || 0} reviews)</span>
                        </div>
                    </div>
                </div>

                <div className="pt-2 md:pt-0 shrink-0 flex items-center gap-3">
                    <button
                        onClick={addToFavorites}
                        className="btn-adyen-outline text-xs px-5 py-3 font-bold flex items-center gap-2"
                    >
                        <span>Save to Wishlist</span>
                    </button>
                    <a href={`mailto:${profile.userId?.email || 'vendor@smartevents.com'}`} className="btn-adyen-primary text-xs px-5 py-3 font-bold flex items-center gap-2">
                        <Mail size={15} />
                        <span>Contact business</span>
                    </a>
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: About and Services list */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="adyen-card p-6 bg-surface border border-border rounded-3xl space-y-4">
                        <h3 className="text-sm font-black text-fg uppercase tracking-wider">About Business</h3>
                        <p className="text-xs text-muted leading-relaxed font-medium">
                            {profile.description || 'No business description provided.'}
                        </p>
                    </div>

                    {/* Services Catalog */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-black text-fg uppercase tracking-wider px-1">Service packages</h3>
                        
                        {services.length === 0 ? (
                            <div className="adyen-card p-12 text-center text-muted bg-surface border border-border">
                                No active service listings.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {services.map(srv => (
                                    <div key={srv._id} className="adyen-card p-6 bg-surface border border-border hover:border-success transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div className="space-y-2 max-w-xl">
                                            <h4 className="text-base font-bold text-fg">{srv.title}</h4>
                                            <p className="text-xs text-muted leading-relaxed font-medium">{srv.description}</p>
                                        </div>

                                        <div className="flex md:flex-col items-end gap-3 justify-between w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-border">
                                            <div className="text-right">
                                                <span className="text-[10px] font-mono text-muted block uppercase font-bold">STARTING PRICE</span>
                                                <span className="text-lg font-black text-success">${srv.price.toLocaleString()}</span>
                                            </div>
                                            <button
                                                onClick={() => handleNegotiateStart(srv)}
                                                className="btn-adyen-primary text-[10px] px-4 py-2 font-bold shadow-glow flex items-center gap-1.5"
                                            >
                                                <span>Book & Negotiate</span>
                                                <ArrowRight size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Portfolio Gallery */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="adyen-card p-6 bg-surface border border-border rounded-3xl space-y-4">
                        <h3 className="text-sm font-black text-fg uppercase tracking-wider">Portfolio Showcase</h3>
                        {profile.portfolioImages?.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2">
                                {profile.portfolioImages.map((img, idx) => (
                                    <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-border">
                                        <img src={img} alt="portfolio" className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted font-semibold italic">No portfolio images uploaded.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Negotiation Offer Modal */}
            {bookingModalOpen && selectedService && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="adyen-card max-w-md w-full bg-surface p-6 border border-border rounded-3xl space-y-4 shadow-2xl">
                        <h3 className="text-base font-bold text-fg">InDrive Negotiation Quote</h3>
                        <p className="text-[11px] text-muted font-semibold">Service: {selectedService.title}</p>

                        <form onSubmit={handleCreateBooking} className="space-y-3 text-xs font-semibold">
                            <div>
                                <label className="text-fg block mb-1">Your Proposed Budget ($)</label>
                                <input
                                    type="number"
                                    required
                                    value={bookingDetails.offerPrice}
                                    onChange={(e) => setBookingDetails({ ...bookingDetails, offerPrice: e.target.value })}
                                    placeholder={selectedService.price}
                                    className="w-full bg-bg border border-border rounded-xl px-3.5 py-2.5 outline-none focus:border-success font-mono text-sm font-bold text-success"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-fg block mb-1">Event Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={bookingDetails.date}
                                        onChange={(e) => setBookingDetails({ ...bookingDetails, date: e.target.value })}
                                        className="w-full bg-bg border border-border rounded-xl px-3.5 py-2.5 outline-none focus:border-success"
                                    />
                                </div>
                                <div>
                                    <label className="text-fg block mb-1">Location</label>
                                    <input
                                        type="text"
                                        required
                                        value={bookingDetails.location}
                                        onChange={(e) => setBookingDetails({ ...bookingDetails, location: e.target.value })}
                                        className="w-full bg-bg border border-border rounded-xl px-3.5 py-2.5 outline-none focus:border-success"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-fg block mb-1">Cover Note / Instructions</label>
                                <textarea
                                    rows="3"
                                    value={bookingDetails.message}
                                    onChange={(e) => setBookingDetails({ ...bookingDetails, message: e.target.value })}
                                    className="w-full bg-bg border border-border rounded-xl p-3 outline-none focus:border-success"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setBookingModalOpen(false)} className="flex-1 btn-adyen-outline py-2.5 rounded-full justify-center">
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 btn-adyen-primary py-2.5 rounded-full justify-center shadow-glow">
                                    Send Bid Proposal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
