import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-hot-toast';
import { Save, KeyRound, User as UserIcon, Palette } from 'lucide-react';

import axios from '../../api/axios';
import { setCredentials } from '../../store/slices/authSlice';
import { useTheme } from '../../context/ThemeContext';
import { Button, Card, Badge, Input } from '../../components/ui';

/**
 * Account settings.
 *
 * The previous version showed "Account settings saved successfully!" without
 * making any request at all — the form was purely decorative and no
 * profile-update endpoint existed on the server.
 */
export default function Settings({ user }) {
    const dispatch = useDispatch();
    const { theme, toggleTheme, isDark } = useTheme();

    const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '' });
    const [profileErrors, setProfileErrors] = useState({});
    const [savingProfile, setSavingProfile] = useState(false);

    const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [pwErrors, setPwErrors] = useState({});
    const [savingPw, setSavingPw] = useState(false);

    const saveProfile = async (e) => {
        e.preventDefault();
        const errs = {};
        if (profile.name.trim().length < 2) errs.name = 'Name must be at least 2 characters.';
        if (!/^\S+@\S+\.\S+$/.test(profile.email)) errs.email = 'Enter a valid email address.';
        setProfileErrors(errs);
        if (Object.keys(errs).length) return;

        setSavingProfile(true);
        try {
            const res = await axios.put('/auth/profile', {
                name: profile.name.trim(),
                email: profile.email.trim(),
            });
            // Keep the store in sync so the navbar and dashboards update too.
            dispatch(setCredentials({
                user: res.data.user,
                token: localStorage.getItem('token'),
                refreshToken: localStorage.getItem('refreshToken'),
            }));
            localStorage.setItem('user', JSON.stringify(res.data.user));
            toast.success(res.data.message || 'Profile updated.');
        } catch (err) {
            const data = err.response?.data;
            if (data?.errors?.length) setProfileErrors(Object.fromEntries(data.errors.map(x => [x.path, x.message])));
            toast.error(data?.message || 'Could not update your profile.');
        } finally {
            setSavingProfile(false);
        }
    };

    const savePassword = async (e) => {
        e.preventDefault();
        const errs = {};
        if (!pw.currentPassword) errs.currentPassword = 'Enter your current password.';
        if (pw.newPassword.length < 8) errs.newPassword = 'New password must be at least 8 characters.';
        if (pw.newPassword !== pw.confirmPassword) errs.confirmPassword = 'The passwords do not match.';
        setPwErrors(errs);
        if (Object.keys(errs).length) return;

        setSavingPw(true);
        try {
            const res = await axios.put('/auth/password', {
                currentPassword: pw.currentPassword,
                newPassword: pw.newPassword,
            });
            toast.success(res.data.message || 'Password changed.');
            setPw({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            const data = err.response?.data;
            if (data?.errors?.length) setPwErrors(Object.fromEntries(data.errors.map(x => [x.path, x.message])));
            toast.error(data?.message || 'Could not change your password.');
        } finally {
            setSavingPw(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg text-fg space-y-8 p-6 max-w-3xl mx-auto">
            <header className="space-y-1 border-b border-border pb-6">
                <Badge tone="brand">Account</Badge>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight">Settings</h1>
                <p className="text-sm text-muted">Manage your profile, password and appearance.</p>
            </header>

            {/* Profile */}
            <Card className="p-8 space-y-6">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-2xl grad-primary text-white flex items-center justify-center text-3xl font-black shrink-0">
                        {(profile.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="space-y-1 min-w-0">
                        <h2 className="text-xl font-bold truncate">{profile.name || 'Your name'}</h2>
                        <p className="text-xs text-muted font-mono truncate">{profile.email}</p>
                        <Badge tone="success">{user?.role}</Badge>
                    </div>
                </div>

                <form onSubmit={saveProfile} className="space-y-4 pt-4 border-t border-border">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                        <UserIcon size={14} aria-hidden="true" /> Profile
                    </h3>
                    <Input
                        label="Display name"
                        value={profile.name}
                        onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))}
                        error={profileErrors.name}
                        maxLength={50}
                    />
                    <Input
                        label="Email address"
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile(p => ({ ...p, email: e.target.value }))}
                        error={profileErrors.email}
                        hint="You sign in with this address."
                    />
                    <Button type="submit" icon={Save} loading={savingProfile}>Save changes</Button>
                </form>
            </Card>

            {/* Password */}
            <Card className="p-8 space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-2">
                    <KeyRound size={14} aria-hidden="true" /> Change password
                </h3>
                <form onSubmit={savePassword} className="space-y-4">
                    <Input
                        label="Current password"
                        type="password"
                        autoComplete="current-password"
                        value={pw.currentPassword}
                        onChange={(e) => setPw(p => ({ ...p, currentPassword: e.target.value }))}
                        error={pwErrors.currentPassword}
                    />
                    <Input
                        label="New password"
                        type="password"
                        autoComplete="new-password"
                        value={pw.newPassword}
                        onChange={(e) => setPw(p => ({ ...p, newPassword: e.target.value }))}
                        error={pwErrors.newPassword}
                        hint="At least 8 characters."
                    />
                    <Input
                        label="Confirm new password"
                        type="password"
                        autoComplete="new-password"
                        value={pw.confirmPassword}
                        onChange={(e) => setPw(p => ({ ...p, confirmPassword: e.target.value }))}
                        error={pwErrors.confirmPassword}
                    />
                    <Button type="submit" variant="secondary" icon={KeyRound} loading={savingPw}>
                        Change password
                    </Button>
                </form>
            </Card>

            {/* Appearance */}
            <Card className="p-8 space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-2">
                    <Palette size={14} aria-hidden="true" /> Appearance
                </h3>
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-semibold">Theme</p>
                        <p className="text-xs text-muted">
                            Currently {isDark ? 'dark' : 'light'}. Defaults to your system preference.
                        </p>
                    </div>
                    <Button variant="secondary" onClick={toggleTheme}>
                        Switch to {isDark ? 'light' : 'dark'}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
