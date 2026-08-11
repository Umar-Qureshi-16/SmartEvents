import React from 'react';
import AdminPanel from '../Admin/AdminPanel';

export default function SuperAdminDashboard({ user }) {
    return <AdminPanel user={user} />;
}
