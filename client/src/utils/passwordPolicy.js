// Mirrors server/utils/passwordPolicy.js so people see the rules as they type.
// The server is the authority; this only gives early feedback.
export const MIN_LENGTH = 8;
export const MAX_LENGTH = 128;

const COMMON = [
    'password', 'passw0rd', 'qwerty', 'letmein', 'welcome', 'admin', 'iloveyou',
    'abc123', '123456', '12345678', '11111111', 'monkey', 'dragon', 'football',
    'smartie', 'smartevents'
];

/** Every rule with whether `password` meets it. */
export function checkPasswordRules(password = '', { name = '', email = '' } = {}) {
    const p = String(password);
    const lower = p.toLowerCase();
    const personal = [String(email).split('@')[0], ...String(name).split(/\s+/)]
        .map((w) => w.toLowerCase())
        .filter((w) => w.length >= 3);
    return [
        { id: 'length', label: `${MIN_LENGTH} or more characters`, ok: p.length >= MIN_LENGTH && p.length <= MAX_LENGTH },
        { id: 'upper', label: 'An uppercase letter', ok: /[A-Z]/.test(p) },
        { id: 'lower', label: 'A lowercase letter', ok: /[a-z]/.test(p) },
        { id: 'number', label: 'A number', ok: /\d/.test(p) },
        { id: 'symbol', label: 'A symbol (! @ # $ % ...)', ok: /[^A-Za-z0-9\s]/.test(p) },
        { id: 'spaces', label: 'No spaces', ok: p.length > 0 && !/\s/.test(p) },
        { id: 'common', label: 'Not a common password', ok: p.length > 0 && !COMMON.some((w) => lower.includes(w)) },
        { id: 'personal', label: 'Not your name or email', ok: p.length > 0 && !personal.some((w) => lower.includes(w)) },
    ];
}

export const isStrongPassword = (password, context) =>
    checkPasswordRules(password, context).every((r) => r.ok);
