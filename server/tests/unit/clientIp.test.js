const { clientIp, accountOrIpKey, clientIpInfo } = require('../../utils/clientIp');

const req = (headers = {}, extra = {}) => ({ headers, ip: '10.29.164.47', ...extra });

describe('client IP for rate limiting', () => {
    it('prefers the address Vercel forwards over the shared internal proxy address', () => {
        expect(clientIp(req({ 'x-vercel-forwarded-for': '203.0.113.9, 76.76.21.21' }))).toBe('203.0.113.9');
        expect(clientIpInfo(req({ 'x-vercel-forwarded-for': '203.0.113.9' })).source).toBe('x-vercel-forwarded-for');
    });

    it('falls back to Cloudflare, then to the socket address', () => {
        expect(clientIp(req({ 'cf-connecting-ip': '198.51.100.4' }))).toBe('198.51.100.4');
        expect(clientIp(req())).toBe('10.29.164.47');
    });

    it('keys credential endpoints by account so changing IP does not reset the limit', () => {
        const a = accountOrIpKey(req({ 'x-vercel-forwarded-for': '1.1.1.1' }, { body: { email: ' Victim@Example.com ' } }));
        const b = accountOrIpKey(req({ 'x-vercel-forwarded-for': '9.9.9.9' }, { body: { email: 'victim@example.com' } }));
        expect(a).toBe('acct:victim@example.com');
        expect(b).toBe(a);
    });

    it('uses the client IP when no email is supplied', () => {
        expect(accountOrIpKey(req({ 'cf-connecting-ip': '198.51.100.4' }, { body: {} }))).toBe('ip:198.51.100.4');
    });
});
