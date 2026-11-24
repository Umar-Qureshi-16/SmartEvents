import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { Globe2, MapPin, Save } from 'lucide-react';
import axios from '../api/axios';
import { setCredentials } from '../store/slices/authSlice';
import { useMoney, formatMoney } from '../utils/money';

const field = 'w-full bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand/40';

/**
 * Country and region of the signed-in user. The country sets the currency
 * every price is shown in; the region tells Smartie whose culture to design
 * for (Punjabi, Sindhi, Pashtun, Balochi, Kashmiri...).
 */
export default function RegionPicker({ compact = false, onSaved }) {
    const dispatch = useDispatch();
    const user = useSelector((s) => s.auth.user);
    const money = useMoney();
    const [country, setCountry] = useState(user?.locale?.country || 'PK');
    const [region, setRegion] = useState(user?.locale?.region || '');
    const [saving, setSaving] = useState(false);
    const regions = money.countries[country]?.regions || [];
    const currency = money.countries[country]?.currency;
    const dirty = country !== (user?.locale?.country || 'PK') || (region || '') !== (user?.locale?.region || '');

    const save = async () => {
        setSaving(true);
        try {
            const r = await axios.put('/locale/me', { country, region: region || null });
            dispatch(setCredentials({ user: { ...user, locale: r.data.data.locale } }));
            toast.success(`Saved. Prices now show in ${money.countries[country]?.currency}${region ? `, and Smartie designs in the ${region} style` : ''}.`);
            onSaved?.();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not save your region.');
        } finally { setSaving(false); }
    };

    return (
        <div className={compact ? 'space-y-3' : 'space-y-4'}>
            <div className="grid sm:grid-cols-2 gap-3">
                <div>
                    <label htmlFor="rp-country" className="text-xs font-bold text-fg mb-1 flex items-center gap-1.5"><Globe2 size={13} aria-hidden="true" />Country</label>
                    <select id="rp-country" value={country} onChange={(e) => { setCountry(e.target.value); setRegion(''); }} className={field}>
                        {Object.entries(money.countries).map(([code, c]) => <option key={code} value={code}>{c.name} ({c.currency})</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="rp-region" className="text-xs font-bold text-fg mb-1 flex items-center gap-1.5"><MapPin size={13} aria-hidden="true" />{country === 'PK' ? 'Province / region' : 'City / region'}</label>
                    <select id="rp-region" value={region} onChange={(e) => setRegion(e.target.value)} className={field} disabled={!regions.length}>
                        <option value="">{country === 'PK' ? 'All of Pakistan (mixed styles)' : 'Not set'}</option>
                        {regions.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
            </div>
            <p className="text-xs text-muted">
                Prices show in <b className="text-fg">{currency}</b> (for example {formatMoneyIn(money, country, 1000)} for US$1,000 at today's rate).
                {country === 'PK' ? ' Smartie designs mehndi, nikah, baraat and walima setups in your region\'s traditions.' : ' Smartie designs Pakistani traditions suited to events abroad.'}
            </p>
            <button type="button" onClick={save} disabled={saving || !dirty}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand text-white text-sm font-bold px-4 py-2.5 hover:opacity-90 disabled:opacity-40">
                <Save size={15} aria-hidden="true" />{saving ? 'Saving…' : 'Save region'}
            </button>
        </div>
    );
}

// The example amount in the currency being picked (before it is saved).
function formatMoneyIn(money, country, usd) {
    const cur = money.countries[country]?.currency || 'USD';
    if (cur === money.currency) return formatMoney(usd);
    const v = Math.round(usd * (money.rates[cur] || 1));
    return `${cur} ${v.toLocaleString()}`;
}
