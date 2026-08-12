import React from 'react';
import { UserX } from 'lucide-react';
import CustomerDashboard from './CustomerDashboard';
import ProviderDashboard from './ProviderDashboard';
import AdminDashboard from './AdminDashboard';
import SuperAdminDashboard from './SuperAdminDashboard';
import { EmptyState } from '../../components/ui';

/**
 * Routes to the dashboard for the signed-in user's role.
 *
 * The previous implementation branched on 'organizer', 'vendor' and
 * 'attendee' — none of which are values in the User schema enum — and had no
 * fallback, so an unmatched role rendered a completely blank page with no
 * explanation.
 */
const DASHBOARDS = {
    customer: CustomerDashboard,
    provider: ProviderDashboard,
    admin: AdminDashboard,
    superadmin: SuperAdminDashboard,
};

export default function Dashboard({ user }) {
    if (!user) return null;

    const View = DASHBOARDS[user.role];

    if (!View) {
        return (
            <div className="min-h-screen bg-bg px-6 py-16">
                <div className="max-w-xl mx-auto">
                    <EmptyState
                        icon={UserX}
                        title="We could not load a dashboard for this account"
                        description={`Your account type is "${user.role || 'unknown'}", which has no dashboard configured. Please contact support so we can put this right.`}
                        action={{ label: 'Contact support', to: '/contact' }}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen pt-4">
            <View user={user} />
        </div>
    );
}
