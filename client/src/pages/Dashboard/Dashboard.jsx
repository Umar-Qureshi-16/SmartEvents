import React from 'react';
import CustomerDashboard from './CustomerDashboard';
import ProviderDashboard from './ProviderDashboard';
import AdminDashboard from './AdminDashboard';
import SuperAdminDashboard from './SuperAdminDashboard';
import AttendeeDashboard from '../Attendee/AttendeeDashboard';

function Dashboard({ user }) {
    if (!user) return null;

    return (
        <div className="relative min-h-screen">
            <div className="pt-4">
                {(user.role === 'customer' || user.role === 'organizer') && <CustomerDashboard user={user} />}
                {(user.role === 'provider' || user.role === 'vendor') && <ProviderDashboard user={user} />}
                {user.role === 'admin' && <AdminDashboard user={user} />}
                {user.role === 'superadmin' && <SuperAdminDashboard user={user} />}
                {user.role === 'attendee' && <AttendeeDashboard user={user} />}
            </div>
        </div>
    );
}

export default Dashboard;
