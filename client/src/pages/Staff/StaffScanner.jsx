import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { QrCode, ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw, Users, Zap, Search, AlertCircle, Plus, Camera, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import StatCard from '../../components/common/StatCard';
import DataTable from '../../components/common/DataTable';
import Drawer from '../../components/common/Drawer';

export default function StaffScanner({ user }) {
    const [ticketInput, setTicketInput] = useState('');
    const [scanResult, setScanResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [rosterData, setRosterData] = useState([]);
    const [stats, setStats] = useState({
        totalCheckedIn: 412,
        totalCapacity: 500,
        expectedGuests: 500,
        duplicateAttemptsBlocked: 3
    });

    const handleScanTicket = async (e) => {
        e.preventDefault();
        if (!ticketInput.trim()) return;

        const cleanCode = ticketInput.trim().toUpperCase();
        setLoading(true);
        setScanResult(null);

        try {
            const res = await axios.post('/tickets/scan', { ticketNumber: cleanCode });
            if (res.data.success) {
                const ticket = res.data.data;
                setScanResult({
                    valid: true,
                    code: cleanCode,
                    name: ticket.attendee?.name || 'Verified Pass Holder',
                    passTier: ticket.ticketType || 'VIP Premium Pass',
                    message: 'ENTRY GRANTED',
                    subtext: `Welcome to the event! Scanned successfully at ${new Date().toLocaleTimeString()}`
                });
                setStats(prev => ({ ...prev, totalCheckedIn: prev.totalCheckedIn + 1 }));
                toast.success(`Access Granted: ${cleanCode}`);
            }
        } catch (err) {
            console.error(err);
            const errMsg = err.response?.data?.message || 'Invalid ticket code';
            const isDuplicate = errMsg.includes('DUPLICATE');

            setScanResult({
                valid: false,
                code: cleanCode,
                message: isDuplicate ? 'DUPLICATE ENTRY DETECTED!' : 'ACCESS DENIED',
                subtext: errMsg
            });

            if (isDuplicate) {
                setStats(prev => ({ ...prev, duplicateAttemptsBlocked: prev.duplicateAttemptsBlocked + 1 }));
                toast.error(`ALERT: Duplicate entry attempt for ${cleanCode}`);
            } else {
                toast.error(`ALERT: ${errMsg}`);
            }
        } finally {
            setLoading(false);
            setTicketInput('');
        }
    };

    return (
        <div className="min-h-screen bg-bg text-fg space-y-8 p-6 max-w-[1280px] mx-auto pt-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
                <div className="space-y-1">
                    <span className="adyen-badge">GATE SCANNER COMMAND</span>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-fg">
                        Staff Entry QR Scanner
                    </h1>
                    <p className="text-xs text-muted font-medium">Verify dynamic, encrypted attendee tickets at gate terminals.</p>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="TOTAL GUESTS EXPECTED" value={stats.expectedGuests} icon={Users} />
                <StatCard label="TOTAL CHECKED IN" value={stats.totalCheckedIn} icon={CheckCircle2} />
                <StatCard label="DUPLICATE ATTEMPTS BLOCKED" value={stats.duplicateAttemptsBlocked} icon={AlertTriangle} />
                <StatCard label="GATE CAPACITY PERCENT" value={`${((stats.totalCheckedIn / stats.totalCapacity) * 100).toFixed(1)}%`} icon={Zap} />
            </div>

            {/* Scanner form */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-6 space-y-6">
                    <div className="adyen-card p-6 bg-surface border border-border space-y-4">
                        <h3 className="text-sm font-black text-fg uppercase tracking-wider">Gate Check Terminal</h3>
                        
                        <form onSubmit={handleScanTicket} className="space-y-3 text-xs font-semibold">
                            <div>
                                <label className="text-fg block mb-1 font-bold">Input Serial Ticket Number / QR String</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        required
                                        value={ticketInput}
                                        onChange={(e) => setTicketInput(e.target.value)}
                                        placeholder="e.g. TKT-1718290291-3819"
                                        className="flex-1 bg-bg border border-border rounded-xl px-4 py-3 outline-none focus:border-success font-mono text-sm font-bold uppercase"
                                    />
                                    <button type="submit" disabled={loading} className="btn-adyen-primary px-6 py-3 font-bold shadow-glow">
                                        Scan Gate
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Scan Status Display */}
                    {scanResult && (
                        <div className={`adyen-card p-6 rounded-3xl border flex items-start gap-4 ${
                            scanResult.valid 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                                : 'bg-rose-50 border-rose-200 text-rose-800'
                        }`}>
                            <div className="space-y-2">
                                <h4 className="text-lg font-black uppercase tracking-tight">{scanResult.message}</h4>
                                <div className="text-xs font-semibold space-y-1">
                                    <p><strong>Code:</strong> <span className="font-mono">{scanResult.code}</span></p>
                                    {scanResult.valid && (
                                        <>
                                            <p><strong>Holder:</strong> {scanResult.name}</p>
                                            <p><strong>Tier:</strong> {scanResult.passTier}</p>
                                        </>
                                    )}
                                    <p className="text-[11px] opacity-80 mt-1">{scanResult.subtext}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-6 space-y-4">
                    <div className="adyen-card p-6 bg-surface border border-border space-y-4">
                        <h3 className="text-sm font-black text-fg uppercase tracking-wider">Gate Access Policy</h3>
                        
                        <div className="space-y-3 text-xs font-medium text-muted leading-relaxed">
                            <div className="flex gap-2.5">
                                <div className="w-5 h-5 rounded bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
                                    <Check size={12} className="text-emerald-600" />
                                </div>
                                <p><strong>Single-Entry validation:</strong> Once scanned, a pass status switches from `valid` to `used` inside MongoDB database.</p>
                            </div>
                            <div className="flex gap-2.5">
                                <div className="w-5 h-5 rounded bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0">
                                    <AlertTriangle size={12} className="text-rose-600" />
                                </div>
                                <p><strong>Duplicate blocking:</strong> Scan attempts of codes already used trigger an automated security lock alert.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
