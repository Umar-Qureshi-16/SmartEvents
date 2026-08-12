import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Users, DollarSign, ArrowLeft, ShieldCheck, Clock, Send, CheckCircle2, XCircle, Star } from 'lucide-react';
import axios from '../../api/axios';
import { toast } from 'react-hot-toast';
import ReviewCard from '../../components/reviews/ReviewCard';
import ReviewForm from '../../components/reviews/ReviewForm';

const EventDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useSelector(state => state.auth);
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [offerPrice, setOfferPrice] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [buyingTicket, setBuyingTicket] = useState(false);
    const [reviews, setReviews] = useState([]);
    const [hasConfirmedBooking, setHasConfirmedBooking] = useState(false);

    useEffect(() => {
        fetchEvent();
        fetchReviews();
    }, [id]);

    useEffect(() => {
        if (user && user.role === 'customer') {
            checkBookingStatus();
        }
    }, [user, id]);

    const fetchReviews = async () => {
        try {
            const res = await axios.get(`/reviews/event/${id}`);
            if (res.data.success) {
                setReviews(res.data.data);
            }
        } catch (err) {
            console.error("Failed to fetch reviews", err);
        }
    };

    const checkBookingStatus = async () => {
        try {
            const res = await axios.get('/bookings/my');
            if (res.data.success) {
                const isConfirmed = res.data.data.some(b =>
                    (b.eventId?._id === id || b.eventId === id) && b.status === 'confirmed'
                );
                setHasConfirmedBooking(isConfirmed);
            }
        } catch (err) {
            console.error("Failed to check booking status", err);
        }
    };

    const fetchEvent = async () => {
        try {
            const res = await axios.get(`/events/${id}`);
            if (res.data.success) {
                setEvent(res.data.data);
                setOfferPrice(res.data.data.price);
            }
        } catch (err) {
            toast.error("Failed to fetch event data.");
            navigate('/events');
        } finally {
            setLoading(false);
        }
    };

    const handleBooking = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await axios.post('/bookings', {
                eventId: id,
                offerPrice: Number(offerPrice),
                message: message || "Interested in this event."
            });
            if (res.data.success) {
                toast.success("Offer submitted! Starting negotiation...");
                setIsModalOpen(false);
                setTimeout(() => navigate(`/negotiate/${res.data.data._id}`), 1000);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Booking failed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-[#030712] pt-24 pb-20 px-6 animate-pulse">
            <div className="max-w-6xl mx-auto space-y-12">
                <div className="w-32 h-6 bg-fg/5 rounded-md"></div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                    <div className="space-y-8">
                        <div className="aspect-[4/5] bg-fg/5 rounded-[40px]"></div>
                        <div className="grid grid-cols-3 gap-6">
                            <div className="h-24 bg-fg/5 rounded-3xl"></div>
                            <div className="h-24 bg-fg/5 rounded-3xl"></div>
                            <div className="h-24 bg-fg/5 rounded-3xl"></div>
                        </div>
                    </div>
                    <div className="space-y-10">
                        <div className="space-y-4">
                            <div className="h-16 w-3/4 bg-fg/5 rounded-2xl"></div>
                            <div className="flex gap-6">
                                <div className="h-6 w-32 bg-fg/5 rounded-md"></div>
                                <div className="h-6 w-32 bg-fg/5 rounded-md"></div>
                            </div>
                        </div>
                        <div className="h-48 bg-fg/5 rounded-3xl"></div>
                        <div className="h-16 bg-fg/5 rounded-2xl"></div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (!event) return null;

    const handleBuyTicket = async () => {
        if (!user) {
            toast.error('Please sign in to get a pass.');
            navigate('/login');
            return;
        }
        setBuyingTicket(true);
        try {
            await axios.post('/tickets/purchase', {
                eventId: event._id,
                ticketType: 'General',
                price: event.price,
            });
            toast.success('Pass issued. Find the QR code in your wallet.');
            navigate('/tickets');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not issue your pass.');
        } finally {
            setBuyingTicket(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#030712] text-fg pt-24 pb-20 px-6">
            <div className="max-w-6xl mx-auto space-y-12">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted hover:text-fg transition-colors group">
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-xs font-bold uppercase tracking-widest">Return to Grid</span>
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                    {/* Visual Section */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                        <div className="aspect-[4/5] rounded-[40px] overflow-hidden border border-border relative glass">
                            {event.image ? (
                                <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center opacity-10">
                                    <Calendar size={120} />
                                </div>
                            )}
                            <div className="absolute top-8 left-8 bg-fg/60 backdrop-blur-xl border border-border px-6 py-2 rounded-2xl">
                                <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">{event.category}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-6">
                            <Stat label="Capacity" value={event.capacity} icon={<Users size={16} />} />
                            <Stat label="Location" value={event.location || 'Remote'} icon={<MapPin size={16} />} />
                            <Stat label="Verified" value="100%" icon={<ShieldCheck size={16} />} />
                        </div>
                    </motion.div>

                    {/* Data Section */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-10">
                        <div className="space-y-4">
                            <h1 className="text-6xl font-black tracking-tighter leading-none">{event.title}</h1>
                            <div className="flex items-center gap-6 text-muted">
                                <div className="flex items-center gap-2 text-sm font-bold">
                                    <Calendar className="text-indigo-500" size={16} />
                                    {new Date(event.date).toLocaleDateString(undefined, { dateStyle: 'full' })}
                                </div>
                                <div className="flex items-center gap-2 text-sm font-bold">
                                    <Clock className="text-indigo-500" size={16} />
                                    10:00 AM UTC
                                </div>
                            </div>
                        </div>

                        <div className="p-8 glass rounded-3xl border-border bg-surface/[0.02] space-y-4">
                            <div className="flex justify-between items-center pb-3 border-b border-border">
                                <div>
                                    <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest block">EVENT PROVIDER</span>
                                    <span className="text-base font-bold text-fg">{event.createdBy?.name || 'Verified Provider'}</span>
                                    <span className="text-xs text-muted block">{event.createdBy?.email}</span>
                                </div>
                                <button
                                    onClick={() => navigate(`/vendor/${event.createdBy?._id || event.createdBy}`)}
                                    className="btn-adyen-outline text-[10px] px-4 py-2 font-bold flex items-center gap-1"
                                >
                                    <span>View Catalog</span>
                                </button>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black uppercase text-muted tracking-widest mb-2">Transmission Content</h4>
                                <p className="text-muted leading-relaxed text-sm">{event.description}</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-6 space-y-3">
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="w-full grad-primary py-5 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-sm shadow-glow hover:scale-[1.01] active:scale-95 transition-all text-white"
                            >
                                Make an Offer <Send size={18} aria-hidden="true" />
                            </button>

                            {/* POST /tickets/purchase existed but nothing on the
                                client ever called it, so the pass wallet could
                                never be filled. */}
                            <button
                                onClick={handleBuyTicket}
                                disabled={buyingTicket}
                                className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-xs border border-border text-fg hover:bg-fg/5 transition-all disabled:opacity-50"
                            >
                                {buyingTicket
                                    ? 'Issuing your pass...'
                                    : <>Get an entry pass &middot; {`$${(event.price || 0).toLocaleString()}`}</>}
                            </button>
                            <p className="text-[11px] text-muted text-center">
                                A pass admits you at the gate. Making an offer negotiates the service price.
                            </p>
                        </div>
                    </motion.div>
                </div>

                {/* Reviews Section */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
                    <div className="flex items-center justify-between border-b border-border pb-6">
                        <h2 className="text-3xl font-black">Reviews</h2>
                        {event.numberOfReviews > 0 && (
                            <div className="flex items-center gap-3 glass px-5 py-2 rounded-xl border-border bg-surface/[0.02]">
                                <span className="text-xl font-black text-amber-400">{event.averageRating?.toFixed(1)}</span>
                                <div className="flex items-center gap-1">
                                    <Star size={16} className="text-amber-400 fill-amber-400" />
                                </div>
                                <span className="text-xs font-bold text-muted uppercase tracking-widest">({event.numberOfReviews} reviews)</span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        {/* Review Form Column */}
                        <div className="lg:col-span-1 space-y-6">
                            {user?.role === 'customer' && hasConfirmedBooking ? (
                                <ReviewForm
                                    eventId={id}
                                    onSuccess={(newReview) => {
                                        setReviews([newReview, ...reviews]);
                                        fetchEvent(); // Refresh to update average rating
                                    }}
                                />
                            ) : (
                                <div className="p-6 glass rounded-2xl border-border bg-surface/[0.01] flex flex-col items-center justify-center text-center gap-3 h-full min-h-[200px]">
                                    <ShieldCheck size={32} className="text-indigo-500/50" />
                                    <h4 className="text-sm font-black text-fg">Verified Reviews Only</h4>
                                    <p className="text-xs text-muted">You must have a confirmed booking for this event to leave a review.</p>
                                </div>
                            )}
                        </div>

                        {/* Reviews List Column */}
                        <div className="lg:col-span-2 space-y-4">
                            {reviews.length > 0 ? (
                                reviews.map((review) => (
                                    <ReviewCard key={review._id} review={review} />
                                ))
                            ) : (
                                <div className="p-10 glass rounded-2xl border-border flex flex-col items-center justify-center text-center gap-4">
                                    <Star size={40} className="text-muted" />
                                    <p className="text-sm font-bold text-muted uppercase tracking-widest">No reviews yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Offer Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-fg/60 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-lg glass bg-[#0f172a] rounded-3xl border border-border p-8 shadow-2xl relative"
                        >
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="absolute top-6 right-6 text-muted hover:text-fg transition-colors"
                            >
                                <XCircle size={24} />
                            </button>

                            <h3 className="text-2xl font-black mb-2 text-fg">Make an Offer</h3>
                            <p className="text-muted text-sm mb-6">Propose your price and terms for this awesome event.</p>

                            <div className="flex justify-between items-center bg-fg/5 p-4 rounded-2xl mb-6 border border-border">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Base Rate</p>
                                    <p className="text-2xl font-black text-fg">${event.price}</p>
                                </div>
                            </div>

                            <form onSubmit={handleBooking} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted tracking-widest ml-1">Your Offer Price</label>
                                    <div className="relative">
                                        <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" />
                                        <input
                                            type="number"
                                            value={offerPrice}
                                            onChange={(e) => setOfferPrice(e.target.value)}
                                            className="w-full bg-fg/40 border border-border rounded-2xl py-4 pl-12 pr-6 text-xl font-black text-fg outline-none focus:ring-2 ring-indigo-500/50 transition-all"
                                            placeholder={event.price}
                                            required
                                            min="1"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted tracking-widest ml-1">Message to organizer (optional)</label>
                                    <textarea
                                        rows="3"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        className="w-full bg-fg/40 border border-border rounded-2xl p-4 text-sm font-medium text-fg outline-none focus:ring-2 ring-indigo-500/50 transition-all resize-none"
                                        placeholder="Outline your requirements or propose a schedule..."
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting || !offerPrice || offerPrice <= 0}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 py-4 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-sm text-white shadow-xl shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                                >
                                    {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Submit Offer <CheckCircle2 size={18} /></>}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const Stat = ({ label, value, icon }) => (
    <div className="glass p-5 rounded-3xl border-border text-center flex flex-col items-center gap-2">
        <div className="text-indigo-400">{icon}</div>
        <div>
            <p className="text-[8px] font-black text-muted uppercase tracking-widest">{label}</p>
            <p className="text-sm font-black text-fg">{value}</p>
        </div>
    </div>
);

export default EventDetail;
