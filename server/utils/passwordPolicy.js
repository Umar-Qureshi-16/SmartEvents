/**
 * Password policy for every NEW password (sign-up, reset, change).
 * Sign-in is not checked against it, so accounts created under the old
 * 8-character rule can still sign in and then choose a stronger password.
 * The client mirrors these rules in client/src/utils/passwordPolicy.js.
 */
const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

// Passwords that appear at the top of every breach list, plus the app's name.
const COMMON = [
    'password', 'passw0rd', 'qwerty', 'letmein', 'welcome', 'admin', 'iloveyou',
    'abc123', '123456', '12345678', '11111111', 'monkey', 'dragon', 'football',
    'smartie', 'smartevents'
];

const RULES = [
    { id: 'length', label: `${MIN_LENGTH} to ${MAX_LENGTH} characters`, test: (p) => p.length >= MIN_LENGTH && p.length <= MAX_LENGTH },
    { id: 'upper', label: 'An uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
    { id: 'lower', label: 'A lowercase letter (a-z)', test: (p) => /[a-z]/.test(p) },
    { id: 'number', label: 'A number (0-9)', test: (p) => /\d/.test(p) },
    { id: 'symbol', label: 'A symbol such as ! @ # $ %', test: (p) => /[^A-Za-z0-9\s]/.test(p) },
    { id: 'spaces', label: 'No spaces', test: (p) => !/\s/.test(p) },
    { id: 'common', label: 'Not a common password', test: (p) => !COMMON.some((w) => p.toLowerCase().includes(w)) },
];

/**
 * Returns the messages for every rule the password breaks (empty = strong).
 * `context` may hold the user's name and email so the password cannot be
 * built from them.
 */
function passwordProblems(password, context = {}) {
    const p = String(password ?? '');
    // Lower-case only the first letter, so "(A-Z)" stays as written.
    const problems = RULES.filter((r) => !r.test(p)).map((r) => `Password needs: ${r.label[0].toLowerCase()}${r.label.slice(1)}`);

    const lower = p.toLowerCase();
    const emailName = String(context.email ?? '').split('@')[0].toLowerCase();
    const nameParts = String(context.name ?? '').toLowerCase().split(/\s+/);
    const personal = [emailName, ...nameParts].filter((w) => w.length >= 3);
    if (personal.some((w) => lower.includes(w))) {
        problems.push('Password must not contain your name or email');
    }
    return problems;
}

module.exports = { MIN_LENGTH, MAX_LENGTH, RULES, passwordProblems };
