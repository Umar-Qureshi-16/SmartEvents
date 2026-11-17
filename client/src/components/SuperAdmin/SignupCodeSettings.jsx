import React, { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from '../../api/axios';
import { Button, Input, formatDateTime } from '../ui';

const MIN_LENGTH = 8;

const SOURCE_LABEL = {
    console: 'Set from this console',
    environment: 'Server setting (ADMIN_SIGNUP_CODE)',
    none: 'Not set: admin sign-up is disabled',
};

/**
 * Lets the super admin replace the code that unlocks Admin / Super Admin
 * sign-up. The server stores it hashed and never sends it back, so the
 * current code cannot be displayed, only replaced.
 */
const SignupCodeSettings = () => {
    const [status, setStatus] = useState(null);
    const [code, setCode] = useState('');
    const [confirm, setConfirm] = useState('');
    const [saving, setSaving] = useState(false);

    const load = async () => {
        try {
            const res = await axios.get('/super-admin/signup-code');
            setStatus(res.data.data);
        } catch {
            setStatus(null);
        }
    };

    useEffect(() => { load(); }, []);

    const tooShort = code.length > 0 && code.trim().length < MIN_LENGTH;
    const mismatch = confirm.length > 0 && confirm !== code;
    const canSave = code.trim().length >= MIN_LENGTH && confirm === code && !saving;

    const save = async (e) => {
        e.preventDefault();
        if (!canSave) return;
        setSaving(true);
        try {
            const res = await axios.put('/super-admin/signup-code', { code });
            setStatus(res.data.data);
            setCode('');
            setConfirm('');
            toast.success('Admin signup code updated. Share it only with people who should become admins.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not update the signup code.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="glass p-6 rounded-3xl border-border space-y-6 max-w-2xl">
            <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-surface-2 text-brand">
                    <KeyRound size={18} aria-hidden="true" />
                </div>
                <div>
                    <h2 className="text-lg font-black text-fg">Admin signup code</h2>
                    <p className="text-xs text-muted">
                        Anyone signing up as Admin or Super Admin must enter this code. It is stored hashed,
                        so it cannot be shown here, only replaced.
                    </p>
                </div>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                    <dt className="text-[10px] font-black uppercase tracking-widest text-muted">Current source</dt>
                    <dd className="text-fg font-semibold">{status ? SOURCE_LABEL[status.source] : 'Unavailable'}</dd>
                </div>
                {status?.updatedAt && (
                    <div>
                        <dt className="text-[10px] font-black uppercase tracking-widest text-muted">Last changed</dt>
                        <dd className="text-fg font-semibold">
                            {formatDateTime(status.updatedAt)}{status.updatedBy?.name ? ` by ${status.updatedBy.name}` : ''}
                        </dd>
                    </div>
                )}
            </dl>

            <form onSubmit={save} className="space-y-4">
                <Input
                    id="new-signup-code"
                    label="New code"
                    type="password"
                    autoComplete="new-password"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    error={tooShort ? `Use at least ${MIN_LENGTH} characters.` : undefined}
                    hint={`At least ${MIN_LENGTH} characters.`}
                />
                <Input
                    id="confirm-signup-code"
                    label="Confirm new code"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    error={mismatch ? 'The codes do not match.' : undefined}
                />
                <Button type="submit" loading={saving} disabled={!canSave} icon={KeyRound}>
                    Update code
                </Button>
            </form>
        </div>
    );
};

export default SignupCodeSettings;
