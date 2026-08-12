import React, { useState } from 'react';
import { Gavel, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

const money = (n) => `$${Number(n || 0).toLocaleString()}`;

/**
 * Mediation portal for disputed bookings.
 * Resolves through PUT /admin/bookings/:id/resolve-dispute.
 */
const DisputeResolutionCenter = ({ disputes = [], onResolve, busyId }) => {
    const [confirming, setConfirming] = useState(null); // { id, resolution }

    const label = (r) => (r === 'refunded_customer' ? 'refund the customer' : 'release funds to the provider');

    return (
        <div className="glass p-8 rounded-3xl border-border space-y-8">
            <div>
                <h3 className="text-xl font-bold text-fg flex items-center gap-2">
                    <Gavel className="text-amber-400" size={20} /> Resolution Hub
                </h3>
                <p className="text-xs text-muted mt-1">
                    Mediation for bookings escalated by either party
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {disputes.length === 0 ? (
                    <div className="p-12 text-center rounded-3xl border border-dashed border-border text-muted">
                        <CheckCircle size={48} className="mx-auto mb-4 opacity-40" />
                        <h4 className="text-fg font-bold">No open disputes</h4>
                        <p className="text-xs mt-1">Escalated bookings will appear here for review.</p>
                    </div>
                ) : (
                    disputes.map((d) => {
                        const reason = [...(d.negotiationHistory || [])]
                            .reverse()
                            .find(h => h.message?.startsWith('Dispute raised:'))?.message
                            ?.replace('Dispute raised:', '')
                            .trim();
                        const isBusy = busyId === d._id;
                        const isConfirming = confirming?.id === d._id;

                        return (
                            <div
                                key={d._id}
                                className="p-6 rounded-3xl bg-fg/5 border border-border flex flex-col gap-5 hover:border-border transition-all"
                            >
                                <div className="flex flex-col md:flex-row justify-between gap-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 shrink-0 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                                            <AlertTriangle size={24} />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-fg">
                                                {d.eventId?.title || d.eventDetails?.eventType || 'Custom booking'}
                                            </h4>
                                            <p className="text-xs text-muted mt-1">
                                                Case <span className="font-mono">{d._id}</span> · {money(d.offerPrice)}
                                            </p>
                                            <p className="text-xs text-muted mt-2">
                                                <span className="text-indigo-400 font-semibold">{d.customerId?.name || 'Customer'}</span>
                                                {' vs '}
                                                <span className="text-emerald-400 font-semibold">{d.vendorId?.name || 'Provider'}</span>
                                                {d.vendorId?.trustScore != null && (
                                                    <span className="text-muted"> · provider trust {d.vendorId.trustScore}</span>
                                                )}
                                            </p>
                                            {reason && (
                                                <p className="text-sm text-muted mt-3 p-3 rounded-xl bg-fg/20 border border-border">
                                                    “{reason}”
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {!isConfirming && (
                                        <div className="flex gap-3 shrink-0 h-fit">
                                            <button
                                                type="button"
                                                disabled={isBusy}
                                                onClick={() => setConfirming({ id: d._id, resolution: 'refunded_customer' })}
                                                className="px-4 py-3 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all border border-rose-500/20 text-xs font-bold flex items-center gap-2 disabled:opacity-40"
                                            >
                                                <XCircle size={16} /> Refund customer
                                            </button>
                                            <button
                                                type="button"
                                                disabled={isBusy}
                                                onClick={() => setConfirming({ id: d._id, resolution: 'released_vendor' })}
                                                className="px-4 py-3 rounded-xl bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-40"
                                            >
                                                <CheckCircle size={16} /> Release to provider
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {isConfirming && (
                                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <p className="text-xs text-amber-200">
                                            This will <strong>{label(confirming.resolution)}</strong> and cannot be undone.
                                        </p>
                                        <div className="flex gap-2 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setConfirming(null)}
                                                className="px-4 py-2 rounded-lg bg-fg/5 border border-border text-xs font-bold text-muted hover:bg-surface/10"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                disabled={isBusy}
                                                onClick={async () => {
                                                    await onResolve?.(d._id, confirming.resolution);
                                                    setConfirming(null);
                                                }}
                                                className="px-4 py-2 rounded-lg bg-amber-500 text-black text-xs font-black flex items-center gap-2 disabled:opacity-50"
                                            >
                                                {isBusy && <Loader2 size={12} className="animate-spin" />}
                                                Confirm
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default DisputeResolutionCenter;
