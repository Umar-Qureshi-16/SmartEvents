import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

/**
 * Route guard.
 *
 * Replaces the previous inline `user ? <Page/> : <Home/>` pattern, which
 * dumped unauthenticated visitors on the marketing homepage with no
 * explanation and no way back, and applied no role checks at all — a customer
 * could open /admin/users and see the admin panel render.
 *
 * @param {string[]} [roles] - if given, the user's role must be in this list.
 */
export default function ProtectedRoute({ roles }) {
    const { user, isAuthenticated } = useSelector((state) => state.auth);
    const location = useLocation();

    if (!isAuthenticated || !user) {
        // Remember where they were headed so login can return them there.
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (roles && !roles.includes(user.role)) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
}
