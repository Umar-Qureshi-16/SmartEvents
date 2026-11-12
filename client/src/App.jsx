import { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import DynamicNavbar from './components/layout/DynamicNavbar';

// Eager: the entry points a first-time visitor lands on.
import Home from './pages/Home';
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import NotFound from './pages/NotFound';

/*
 * Everything else is route-split. The production bundle was a single 1.18 MB
 * chunk, so every visitor downloaded the admin console, the governance
 * widgets, Recharts and GSAP before the homepage could paint.
 *
 * The heaviest leaves are grouped deliberately: Recharts is pulled in by
 * Revenue, BudgetTracker and the SuperAdmin console, so those share a chunk
 * rather than duplicating it.
 */
const ForgotPassword       = lazy(() => import('./pages/Auth/ForgotPassword'));
const ResetPassword        = lazy(() => import('./pages/Auth/ResetPassword'));
const VerifyEmail          = lazy(() => import('./pages/Auth/VerifyEmail'));
const Inspiration          = lazy(() => import('./pages/Inspiration'));
const Contact              = lazy(() => import('./pages/Contact'));
const Dashboard            = lazy(() => import('./pages/Dashboard/Dashboard'));
const Revenue              = lazy(() => import('./pages/Revenue/Revenue'));
const Bookings             = lazy(() => import('./pages/Bookings/Bookings'));
const Services             = lazy(() => import('./pages/Services/Services'));
const Leads                = lazy(() => import('./pages/Leads/Leads'));
const TicketWallet         = lazy(() => import('./pages/Tickets/TicketWallet'));
const StaffScanner         = lazy(() => import('./pages/Staff/StaffScanner'));
const ExploreEvents        = lazy(() => import('./pages/Events/ExploreEvents'));
const EventDetail          = lazy(() => import('./pages/Events/EventDetail'));
const VendorMarketplace    = lazy(() => import('./pages/Vendors/VendorMarketplace'));
const VendorProfilePage    = lazy(() => import('./pages/Vendors/VendorProfilePage'));
const HowItWorks           = lazy(() => import('./pages/Public/HowItWorks'));
const PricingPasses        = lazy(() => import('./pages/Public/PricingPasses'));
const About                = lazy(() => import('./pages/Public/About'));
const AdminPanel           = lazy(() => import('./pages/Admin/AdminPanel'));
const Settings             = lazy(() => import('./pages/Settings/Settings'));
const NegotiationPage      = lazy(() => import('./pages/Bookings/NegotiationPage'));
const AvailabilityCalendar = lazy(() => import('./pages/Calendar/AvailabilityCalendar'));
const Notifications        = lazy(() => import('./pages/Notifications/Notifications'));
const BudgetTracker        = lazy(() => import('./pages/AI/BudgetTracker'));
const AIConcierge          = lazy(() => import('./pages/AI/AIConcierge'));
const Favorites            = lazy(() => import('./pages/Favorites/Favorites'));
const PortfolioManager     = lazy(() => import('./pages/Vendors/PortfolioManager'));
const ProviderReviews      = lazy(() => import('./pages/Reviews/ProviderReviews'));
const ManageEvents         = lazy(() => import('./pages/Events/ManageEvents'));

import './feature-styles.css';
import './gallery-styles.css';
import './mega-menu.css';

import { WebSocketProvider } from './context/WebSocketContext';
import { ThemeProvider } from './context/ThemeContext';
import ParticleBackground from './components/ParticleBackground';
import CustomLoader from './components/CustomLoader';

import { useSelector, useDispatch } from 'react-redux';
import { setCredentials, logout } from './store/slices/authSlice';
import axios from './api/axios';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';

/** Shown for the moment a route's chunk is being fetched. */
function RouteFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center" role="status" aria-live="polite">
      <span className="sr-only">Loading page…</span>
      <span className="w-8 h-8 border-2 border-brand/25 border-t-brand rounded-full animate-spin" />
    </div>
  );
}

function App() {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token && !user) {
        try {
          const res = await axios.get('/auth/me');
          if (res.data.success) {
            dispatch(setCredentials({
              user: res.data.user,
              token: localStorage.getItem('token'),
              refreshToken: localStorage.getItem('refreshToken')
            }));
          }
        } catch (err) {
          console.error("Auth check failed", err);
          dispatch(logout());
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [dispatch, user]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <ThemeProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e2130',
            color: '#f1f5f9',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: '14px',
            fontWeight: 500,
          },
          success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
          error: { duration: 5000, iconTheme: { primary: '#F87171', secondary: '#fff' } },
        }}
      />
      <ErrorBoundary>
        {loading && <CustomLoader />}
        <ParticleBackground />
        <WebSocketProvider user={user}>
          <a href="#main-content" className="skip-link">Skip to main content</a>
          <div className="app-shell min-h-screen bg-bg text-fg">
            <DynamicNavbar user={user} onLogout={handleLogout} />

            <div className="w-full min-h-screen bg-bg text-fg pt-20">
              <main id="main-content" className="relative z-10 h-full">
                <AnimatePresence mode="wait">
                  {/* Lazy routes need a boundary while their chunk loads. */}
                  <Suspense fallback={<RouteFallback />}>
                  <Routes location={location} key={location.pathname}>
                    {/* ---------- Public ---------- */}
                    <Route path="/" element={user ? <Dashboard user={user} /> : <Home user={user} />} />
                    <Route path="/home" element={<Home user={user} />} />
                    <Route path="/inspiration" element={<Inspiration />} />
                    <Route path="/login" element={<Login onLoginSuccess={(u) => dispatch(setCredentials({ user: u, token: localStorage.getItem('token') }))} />} />
                    <Route path="/signup" element={<Signup onLoginSuccess={(u) => dispatch(setCredentials({ user: u, token: localStorage.getItem('token') }))} />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password/:token" element={<ResetPassword />} />
                    <Route path="/verify-email" element={<VerifyEmail />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/events" element={<ExploreEvents user={user} />} />
                    <Route path="/events/:id" element={<EventDetail user={user} />} />
                    <Route path="/vendors" element={<VendorMarketplace user={user} />} />
                    <Route path="/vendor/:id" element={<VendorProfilePage user={user} />} />
                    <Route path="/how-it-works" element={<HowItWorks />} />
                    <Route path="/pricing" element={<PricingPasses />} />
                    <Route path="/about" element={<About />} />

                    {/* ---------- Any authenticated user ---------- */}
                    <Route element={<ProtectedRoute />}>
                      <Route path="/dashboard" element={<Dashboard user={user} />} />
                      <Route path="/bookings" element={<Bookings user={user} />} />
                      <Route path="/negotiate/:bookingId" element={<NegotiationPage />} />
                      <Route path="/tickets" element={<TicketWallet user={user} />} />
                      <Route path="/settings" element={<Settings user={user} />} />
                      <Route path="/notifications" element={<Notifications />} />
                      <Route path="/favorites" element={<Favorites />} />
                      <Route path="/budget-tracker" element={<BudgetTracker />} />
                      <Route path="/ai-concierge" element={<AIConcierge />} />
                    </Route>

                    {/* ---------- Providers (and admins, for support) ---------- */}
                    <Route element={<ProtectedRoute roles={['provider', 'admin', 'superadmin']} />}>
                      <Route path="/revenue" element={<Revenue user={user} />} />
                      <Route path="/services" element={<Services user={user} />} />
                      <Route path="/leads" element={<Leads user={user} />} />
                      <Route path="/calendar" element={<AvailabilityCalendar />} />
                      <Route path="/portfolio" element={<PortfolioManager />} />
                      <Route path="/reviews" element={<ProviderReviews />} />
                      <Route path="/my-events" element={<ManageEvents />} />
                      <Route path="/staff/scanner" element={<StaffScanner user={user} />} />
                    </Route>

                    {/* ---------- Admin only ---------- */}
                    <Route element={<ProtectedRoute roles={['admin', 'superadmin']} />}>
                      <Route path="/admin/users" element={<AdminPanel user={user} />} />
                      <Route path="/admin/events" element={<AdminPanel user={user} />} />
                    </Route>

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  </Suspense>
                </AnimatePresence>
              </main>
            </div>
          </div>
        </WebSocketProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
