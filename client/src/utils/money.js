import { useSyncExternalStore } from 'react';

/**
 * Money in the viewer's own currency.
 *
 * Amounts are stored in US dollars (the platform's base currency). Each user
 * sees and types them in the currency of the country in their profile, using
 * the server's daily exchange rates (GET /locale). `toBase` turns what a user
 * typed back into dollars before it is sent.
 */

// Used until the server's list arrives, so the first paint is already right.
const FALLBACK_COUNTRIES = {
    PK: { name: 'Pakistan', currency: 'PKR', regions: ['Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Islamabad Capital Territory', 'Gilgit-Baltistan', 'Azad Kashmir'] },
    AE: { name: 'United Arab Emirates', currency: 'AED', regions: [] },
    SA: { name: 'Saudi Arabia', currency: 'SAR', regions: [] },
    QA: { name: 'Qatar', currency: 'QAR', regions: [] },
    GB: { name: 'United Kingdom', currency: 'GBP', regions: [] },
    US: { name: 'United States', currency: 'USD', regions: [] },
    CA: { name: 'Canada', currency: 'CAD', regions: [] },
    AU: { name: 'Australia', currency: 'AUD', regions: [] },
};
const FALLBACK_RATES = { USD: 1, PKR: 280, AED: 3.6725, SAR: 3.75, QAR: 3.64, GBP: 0.78, CAD: 1.38, AUD: 1.52 };
const LOCALES = { PKR: 'en-PK', AED: 'en-AE', SAR: 'en-SA', QAR: 'en-QA', GBP: 'en-GB', USD: 'en-US', CAD: 'en-CA', AUD: 'en-AU' };

let state = { country: 'PK', region: null, currency: 'PKR', rate: FALLBACK_RATES.PKR, countries: FALLBACK_COUNTRIES, rates: FALLBACK_RATES, version: 0 };
const listeners = new Set();
const emit = () => { state = { ...state, version: state.version + 1 }; listeners.forEach((l) => l()); };

function apply(country, region) {
    const c = state.countries[country] ? country : 'PK';
    const currency = state.countries[c].currency;
    state = { ...state, country: c, region: region || null, currency, rate: state.rates[currency] || 1 };
}

/** Sets the viewer's country/region (from their profile). */
export function setMoneyLocale(locale) {
    apply(locale?.country || 'PK', locale?.region);
    emit();
}

/** Loads the country list and today's rates from the server. */
export function loadRates(data) {
    if (!data) return;
    state = { ...state, countries: data.countries || state.countries, rates: { ...state.rates, ...(data.rates || {}) } };
    apply(state.country, state.region);
    emit();
}

export const getMoney = () => state;

/** Dollars (stored) -> the viewer's currency, rounded to a whole number. */
export const fromBase = (usd) => Math.round((Number(usd) || 0) * state.rate);
/** The viewer's currency (typed) -> dollars, for sending to the server. */
export const toBase = (local) => Math.round(((Number(local) || 0) / state.rate) * 100) / 100;

/** Formats a stored dollar amount in the viewer's currency, e.g. "Rs 1,260,000". */
export function formatMoney(usd) {
    const value = fromBase(usd);
    try {
        return new Intl.NumberFormat(LOCALES[state.currency] || 'en-US', { style: 'currency', currency: state.currency, maximumFractionDigits: 0 }).format(value);
    } catch {
        return `${state.currency} ${value.toLocaleString()}`;
    }
}

/** Re-renders a component when the currency or rates change. */
export function useMoney() {
    return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state);
}
