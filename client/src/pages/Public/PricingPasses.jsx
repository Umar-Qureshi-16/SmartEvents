import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, QrCode, ShieldCheck, Zap, ArrowRight } from 'lucide-react';

export default function PricingPasses() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-bg text-fg p-6 max-w-[1280px] mx-auto space-y-12 pt-6">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
                <span className="adyen-badge">TICKET PASS TIERS & FEES</span>
                <h1 className="text-4xl md:text-6xl font-black tracking-tight text-fg">
                    Simple, Transparent Pricing
                </h1>
                <p className="text-base text-muted font-medium">
                    No hidden charges. Free for basic attendee passes with low 2.5% platform escrow fees on vendor transactions.
                </p>
            </div>

            {/* Pricing Tiers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                    {
                        name: 'General Attendee Pass',
                        price: 'FREE',
                        subtitle: 'For guests & public attendees',
                        features: ['Free RSVP ticket registration', 'Digital QR code pass', 'PDF pass download', 'Event updates & notifications'],
                        cta: 'Register Pass',
                        highlight: false
                    },
                    {
                        name: 'VIP Premium Pass',
                        price: '$49 / event',
                        subtitle: 'For VIP lounge & priority gate entry',
                        features: ['Fast-track Staff QR scanner gate', 'VIP lounge & seating access', 'Includes sponsor swag kit', 'Downloadable PDF & QR Wallet'],
                        cta: 'Get VIP Pass',
                        highlight: true
                    },
                    {
                        name: 'Vendor Partner',
                        price: '2.5% per escrow',
                        subtitle: 'For service providers & caterers',
                        features: ['Submit unlimited counter-bids', 'Stripe protected escrow payout', 'Verified vendor badge', 'Direct host messaging'],
                        cta: 'Join as Vendor',
                        highlight: false
                    }
                ].map((tier, idx) => (
                    <div
                        key={idx}
                        className={`adyen-card p-8 flex flex-col justify-between space-y-8 ${tier.highlight ? 'border-success shadow-xl relative' : 'border-border'}`}
                    >
                        {tier.highlight && (
                            <span className="absolute -top-3 right-6 bg-success text-white text-[10px] font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                MOST POPULAR
                            </span>
                        )}

                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-fg">{tier.name}</h3>
                            <div>
                                <span className="text-3xl font-black text-fg">{tier.price}</span>
                                <span className="text-xs text-muted block font-medium mt-1">{tier.subtitle}</span>
                            </div>
                            <ul className="space-y-2.5 pt-4 border-t border-border">
                                {tier.features.map((f, fIdx) => (
                                    <li key={fIdx} className="flex items-center gap-2.5 text-xs text-muted font-semibold">
                                        <Check size={16} className="text-success shrink-0" />
                                        <span>{f}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <button
                            onClick={() => navigate('/signup')}
                            className={`w-full py-3.5 rounded-full text-xs font-bold transition-all ${tier.highlight ? 'btn-adyen-primary shadow-glow justify-center' : 'btn-adyen-outline justify-center'}`}
                        >
                            {tier.cta}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
