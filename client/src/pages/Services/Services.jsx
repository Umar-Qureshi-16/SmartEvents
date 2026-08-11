import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, Calendar, Package, ArrowLeft, Star, Tag, Users, CheckCircle2 } from 'lucide-react';

const CATEGORY_MAP = {
    venue: 'Venue & Hall',
    catering: 'Catering & dining',
    decoration: 'Decoration & Florals',
    photography: 'Photography & Cinema',
    music: 'Music & Stage AV',
    makeup: 'Makeup & Styling'
};

function Services({ user }) {
    const navigate = useNavigate();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newService, setNewService] = useState({
        title: '',
        category: 'catering',
        price: '',
        description: '',
        eventType: 'Wedding',
        location: 'Chicago, IL'
    });

    const fetchServices = async () => {
        try {
            const res = await axios.get('/vendor/services');
            if (res.data.success) {
                setServices(res.data.data || []);
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to load services catalog.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServices();
    }, []);

    const handleAddService = async (e) => {
        e.preventDefault();
        if (!newService.title || !newService.price) {
            toast.error('Please enter service title and price');
            return;
        }

        try {
            const res = await axios.post('/vendor/services', {
                title: newService.title,
                category: newService.category,
                price: Number(newService.price),
                description: newService.description || 'Full professional service.',
                eventType: newService.eventType,
                location: newService.location
            });

            if (res.status === 201) {
                toast.success(`Service "${newService.title}" added to catalog!`);
                setShowAddForm(false);
                setNewService({ title: '', category: 'catering', price: '', description: '', eventType: 'Wedding', location: 'Chicago, IL' });
                fetchServices();
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to add service.');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to remove this service offering?')) return;
        try {
            const res = await axios.delete(`/vendor/services/${id}`);
            if (res.data.success) {
                toast.success('Service package removed');
                fetchServices();
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to remove service.');
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-[#111827] space-y-8 p-6 max-w-[1280px] mx-auto pt-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-[#E5E7EB]">
                <div className="space-y-1">
                    <span className="adyen-badge">VENDOR SERVICE CATALOG</span>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#111827]">
                        Manage Your Service Offerings
                    </h1>
                    <p className="text-xs text-slate-600 font-medium">List packages, set base prices, and showcase offerings to event organizers.</p>
                </div>

                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="btn-adyen-primary text-xs px-6 py-3 font-bold shadow-adyen-glow"
                >
                    <Plus size={16} />
                    <span>{showAddForm ? 'Close Form' : 'Add New Service Listing'}</span>
                </button>
            </div>

            {/* ADD SERVICE FORM MODAL / PANEL */}
            {showAddForm && (
                <div className="adyen-card p-6 bg-white border border-[#E5E7EB] space-y-4 max-w-xl shadow-xl">
                    <h3 className="text-base font-bold text-[#111827]">Create New Service Listing</h3>

                    <form onSubmit={handleAddService} className="space-y-3 text-xs font-semibold">
                        <div>
                            <label className="text-slate-700 block mb-1">Package / Service Title</label>
                            <input
                                type="text"
                                required
                                value={newService.title}
                                onChange={(e) => setNewService({ ...newService, title: e.target.value })}
                                placeholder="e.g. Premium Stage Lighting & Sound Rig"
                                className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#0ABF53]"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-slate-700 block mb-1">Category</label>
                                <select
                                    value={newService.category}
                                    onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                                    className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#0ABF53]"
                                >
                                    <option value="venue">Venue & Hall</option>
                                    <option value="catering">Catering & Dining</option>
                                    <option value="decoration">Decoration & Design</option>
                                    <option value="photography">Photography & Cinema</option>
                                    <option value="music">Music & Stage AV</option>
                                    <option value="makeup">Makeup Artist</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-slate-700 block mb-1">Starting Price ($)</label>
                                <input
                                    type="number"
                                    required
                                    value={newService.price}
                                    onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                                    placeholder="2500"
                                    className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#0ABF53]"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-slate-700 block mb-1">Service Region / Location</label>
                                <input
                                    type="text"
                                    value={newService.location}
                                    onChange={(e) => setNewService({ ...newService, location: e.target.value })}
                                    placeholder="e.g. Chicago, IL"
                                    className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#0ABF53]"
                                />
                            </div>
                            <div>
                                <label className="text-slate-700 block mb-1">Primary Event Match</label>
                                <input
                                    type="text"
                                    value={newService.eventType}
                                    onChange={(e) => setNewService({ ...newService, eventType: e.target.value })}
                                    placeholder="e.g. Wedding, Concert"
                                    className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#0ABF53]"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-slate-700 block mb-1">Description & Deliverables</label>
                            <textarea
                                rows="3"
                                value={newService.description}
                                onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                                placeholder="Specify equipment, crew count, and event deliverables..."
                                className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-3 outline-none focus:border-[#0ABF53]"
                            />
                        </div>

                        <button type="submit" className="w-full btn-adyen-primary py-3 rounded-full justify-center shadow-adyen-glow">
                            Save & Publish Service
                        </button>
                    </form>
                </div>
            )}

            {/* SERVICES CARDS GRID */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
                    <div className="h-48 bg-white border border-slate-200 rounded-3xl"></div>
                    <div className="h-48 bg-white border border-slate-200 rounded-3xl"></div>
                </div>
            ) : services.length === 0 ? (
                <div className="adyen-card p-12 text-center text-slate-400 border border-slate-200 bg-white max-w-xl">
                    <Package size={48} className="mx-auto mb-4 opacity-20 text-slate-500 animate-bounce" />
                    <h3 className="text-base font-bold text-[#111827]">Catalog is empty</h3>
                    <p className="text-xs text-slate-500 font-semibold mt-1">Publish packages to let customers book your services.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {services.map(srv => (
                        <div key={srv._id} className="adyen-card p-6 flex flex-col justify-between space-y-4 bg-white border border-[#E5E7EB] hover:border-[#0ABF53] transition-all">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="adyen-badge bg-[#0ABF53]/10 text-[#0ABF53] border-none font-bold capitalize">
                                        {CATEGORY_MAP[srv.category] || srv.category}
                                    </span>
                                    <button onClick={() => handleDelete(srv._id)} className="text-rose-500 hover:text-rose-700 p-1">
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <h3 className="text-lg font-bold text-[#111827]">{srv.title}</h3>
                                <p className="text-xs text-slate-600 leading-relaxed font-medium">{srv.description}</p>
                            </div>

                            <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">STARTING PRICE</span>
                                    <span className="text-xl font-black text-[#0ABF53]">${srv.price.toLocaleString()}</span>
                                </div>
                                <span className="text-xs text-slate-500 font-semibold">{srv.location}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Services;
