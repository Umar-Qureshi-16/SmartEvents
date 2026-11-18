import React, { useState } from 'react';
import axios from '../../api/axios';
import BudgetPlanner from '../../components/planner/BudgetPlanner';
import AgentChat from '../../components/ai/AgentChat';
import { toast } from 'react-hot-toast';
import { Sparkles, Send, FileText, Calendar, DollarSign, ArrowRight, Bot, User, Cpu, Check, X, Loader2, Copy, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function AIConcierge() {
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const isAdmin = ['admin', 'superadmin'].includes(user?.role);
    const isCustomer = user?.role === 'customer';
    const isProvider = user?.role === 'provider';
    const [activeTab, setActiveTab] = useState('chat');
    const [loading, setLoading] = useState(false);




    // Timeline state
    const [timelineDetails, setTimelineDetails] = useState({ date: '', eventType: 'Wedding' });
    const [timelineResult, setTimelineResult] = useState(null);

    const handleTimelineSubmit = async (e) => {
        e.preventDefault();
        if (!timelineDetails.date) {
            toast.error('Please specify event date.');
            return;
        }
        setLoading(true);

        try {
            const res = await axios.post('/ai/timeline', {
                eventDetails: {
                    date: new Date(timelineDetails.date),
                    eventType: timelineDetails.eventType
                }
            });
            if (res.data.success) {
                setTimelineResult(res.data.data);
                toast.success('Timeline generated!');
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to plan timeline.');
        } finally {
            setLoading(false);
        }
    };

    // Turns the generated milestones into a saved, tickable plan.
    const saveAsPlan = async () => {
        try {
            const res = await axios.post('/plans', {
                title: `${timelineDetails.eventType} on ${timelineDetails.date}`,
                eventType: timelineDetails.eventType,
                date: timelineDetails.date,
            });
            toast.success('Saved to your Event planner.');
            navigate(`/planner?plan=${res.data.data._id}`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not save the plan.');
        }
    };

    return (
        <div className="min-h-screen bg-bg text-fg space-y-8 p-6 max-w-[1440px] mx-auto pt-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
                <div className="space-y-1">
                    <span className="adyen-badge">SMARTIE AI ASSISTANT</span>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-fg">
                        {isAdmin ? 'AI Operations Assistant' : 'AI Event Planner Workspace'}
                    </h1>
                    <p className="text-xs text-muted font-medium">Tell Smartie what you need. Look-ups happen straight away; any change is shown to you for confirmation first.</p>
                </div>

                <div className="flex items-center gap-2 bg-surface-2 p-1 rounded-full text-xs font-bold uppercase shrink-0">
                    <button onClick={() => setActiveTab('chat')} className={`px-4 py-2 rounded-full transition-all ${activeTab === 'chat' ? 'bg-success text-white shadow-sm' : 'text-muted hover:text-fg'}`}>Chatbot</button>
                    {isCustomer && <button onClick={() => setActiveTab('budget')} className={`px-4 py-2 rounded-full transition-all ${activeTab === 'budget' ? 'bg-success text-white shadow-sm' : 'text-muted hover:text-fg'}`}>Budget planner</button>}
                    {isProvider && <button onClick={() => navigate('/design-studio')} className="px-4 py-2 rounded-full transition-all text-muted hover:text-fg">Design studio</button>}
                    {isCustomer && <button onClick={() => setActiveTab('timeline')} className={`px-4 py-2 rounded-full transition-all ${activeTab === 'timeline' ? 'bg-success text-white shadow-sm' : 'text-muted hover:text-fg'}`}>Timeline Plan</button>}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Action area */}
                <div className="lg:col-span-8 space-y-6">
                    {/* TAB 1: CHAT (live-data context) */}
                    {activeTab === 'chat' && (
                        <div className="adyen-card bg-surface border border-border rounded-3xl overflow-hidden flex flex-col h-[550px] shadow-sm">
                            <div className="p-4 bg-surface-2 border-b border-border flex items-center gap-2">
                                <Bot size={16} className="text-success" />
                                <span className="text-xs font-bold text-fg">Chat with Smartie</span>
                            </div>

                            <AgentChat role={user?.role} />
                        </div>
                    )}

                    {/* TAB 2: BUDGET PLANNER (organizers) */}
                    {activeTab === 'budget' && <BudgetPlanner />}

                    {/* TAB 3: TIMELINE GENERATOR */}
                    {activeTab === 'timeline' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="adyen-card p-6 bg-surface border border-border space-y-4">
                                <h3 className="text-sm font-black text-fg uppercase tracking-wider">Configure Timeline Parameters</h3>
                                <form onSubmit={handleTimelineSubmit} className="space-y-4 text-xs font-semibold">
                                    <div>
                                        <label className="text-muted block mb-1">Target Event Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={timelineDetails.date}
                                            onChange={(e) => setTimelineDetails({ ...timelineDetails, date: e.target.value })}
                                            className="w-full bg-bg border border-border rounded-xl px-3.5 py-2.5 outline-none focus:border-success"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-muted block mb-1">Event Category</label>
                                        <select
                                            value={timelineDetails.eventType}
                                            onChange={(e) => setTimelineDetails({ ...timelineDetails, eventType: e.target.value })}
                                            className="w-full bg-bg border border-border rounded-xl px-3.5 py-2.5 outline-none focus:border-success"
                                        >
                                            <option value="Wedding">Wedding</option>
                                            <option value="Concert">Concert</option>
                                            <option value="Corporate">Corporate Conference</option>
                                        </select>
                                    </div>
                                    <button type="submit" disabled={loading} className="w-full btn-adyen-primary py-3 rounded-full justify-center shadow-glow">
                                        <Sparkles size={16} />
                                        <span>{loading ? 'Building Timeline...' : 'Generate Roadmap'}</span>
                                    </button>
                                </form>
                            </div>

                            <div className="adyen-card p-6 bg-surface border border-border rounded-3xl min-h-[300px] flex flex-col justify-between">
                                {/* Guard the shape: the API used to hand back a plain
                                    object, and calling .map on it threw, which took the
                                    whole page down through the error boundary. */}
                                {!Array.isArray(timelineResult) || timelineResult.length === 0 ? (
                                    <div className="text-center text-muted my-auto">
                                        <Calendar size={40} className="mx-auto opacity-30 mb-2" />
                                        <p className="text-xs font-semibold">
                                            {timelineResult ? 'No milestones came back — try again.' : 'No timeline generated yet.'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold text-fg">Milestone checklist</h4>
                                        <div className="space-y-4 overflow-y-auto max-h-72 pr-1">
                                            {timelineResult.map((m, idx) => (
                                                <div key={`${m.milestone}-${idx}`} className="flex gap-3 text-xs font-semibold border-l-2 border-success/30 pl-3 relative">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-success absolute -left-[6px] top-1" />
                                                    <div className="space-y-0.5">
                                                        <span className="text-[10px] font-mono text-muted block uppercase font-bold">
                                                            {m.daysBefore} days before
                                                        </span>
                                                        <h5 className="font-bold text-fg">{m.milestone}</h5>
                                                        <p className="text-muted leading-relaxed font-medium">{m.description}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {user?.role === 'customer' && (
                                            <button onClick={saveAsPlan} className="w-full mt-2 px-4 py-2.5 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand-hover">
                                                Save as my plan, with tasks and vendor packages
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Quick Links / AI Specs */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="adyen-card p-6 bg-surface border border-border space-y-4">
                        <h3 className="text-sm font-black text-fg uppercase tracking-wider">AI Operations</h3>
                        <p className="text-xs text-muted leading-relaxed font-medium">
                            Smartie reads your live bookings, events and services on every question, so its answers reflect your current data.
                        </p>

                        <div className="space-y-2 pt-2 text-xs font-bold">
                            <button
                                onClick={() => navigate('/budget-tracker')}
                                className="w-full flex items-center justify-between p-3 rounded-2xl bg-surface-2 border border-border hover:border-success text-fg hover:text-success transition-all"
                            >
                                <div className="flex items-center gap-2">
                                    <DollarSign size={16} />
                                    <span>Event Budget Analyzer</span>
                                </div>
                                <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
