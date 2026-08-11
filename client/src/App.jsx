import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import DynamicNavbar from './components/layout/DynamicNavbar';
import Home from './pages/Home';
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import Inspiration from './pages/Inspiration';
import Contact from './pages/Contact';
import Dashboard from './pages/Dashboard/Dashboard';
import Revenue from './pages/Revenue/Revenue';
import Bookings from './pages/Bookings/Bookings';
import Services from './pages/Services/Services';
import Leads from './pages/Leads/Leads';
import TicketWallet from './pages/Tickets/TicketWallet';
import StaffScanner from './pages/Staff/StaffScanner';
import ExploreEvents from './pages/Events/ExploreEvents';
import EventDetail from './pages/Events/EventDetail';
import VendorMarketplace from './pages/Vendors/VendorMarketplace';
import VendorProfilePage from './pages/Vendors/VendorProfilePage';
import HowItWorks from './pages/Public/HowItWorks';
import PricingPasses from './pages/Public/PricingPasses';
import About from './pages/Public/About';
import AdminPanel from './pages/Admin/AdminPanel';
import AttendeeDashboard from './pages/Attendee/AttendeeDashboard';
import Settings from './pages/Settings/Settings';
import NegotiationPage from './pages/Bookings/NegotiationPage';
import AvailabilityCalendar from './pages/Calendar/AvailabilityCalendar';
import Notifications from './pages/Notifications/Notifications';
import BudgetTracker from './pages/AI/BudgetTracker';
import AIConcierge from './pages/AI/AIConcierge';
import Favorites from './pages/Favorites/Favorites';
import PortfolioManager from './pages/Vendors/PortfolioManager';
import ProviderReviews from './pages/Reviews/ProviderReviews';
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
import NotFound from './pages/NotFound';

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
      <ErrorBoundary>
        {loading && <CustomLoader />}
        <ParticleBackground />
        <WebSocketProvider user={user}>
          <div className="app-shell min-h-screen bg-[#F8F9FA] text-[#111827]">
            <DynamicNavbar user={user} onLogout={handleLogout} />

            <div className="w-full min-h-screen bg-[#F8F9FA] text-[#111827] pt-20">
              <main className="relative z-10 h-full">
                <AnimatePresence mode="wait">
                  <Routes location={location} key={location.pathname}>
                    <Route path="/" element={user ? <Dashboard user={user} /> : <Home user={user} />} />
                    <Route path="/home" element={<Home user={user} />} />
                    <Route path="/inspiration" element={<Inspiration />} />
                    <Route path="/login" element={<Login onLoginSuccess={(u) => dispatch(setCredentials({ user: u, token: localStorage.getItem('token') }))} />} />
                    <Route path="/signup" element={<Signup onLoginSuccess={(u) => dispatch(setCredentials({ user: u, token: localStorage.getItem('token') }))} />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password/:token" element={<ResetPassword />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Home user={user} />} />
                    <Route path="/revenue" element={user ? <Revenue user={user} /> : <Home user={user} />} />
                    <Route path="/bookings" element={user ? <Bookings user={user} /> : <Home user={user} />} />
                    <Route path="/services" element={user ? <Services user={user} /> : <Home user={user} />} />
                    <Route path="/leads" element={user ? <Leads user={user} /> : <Home user={user} />} />
                    <Route path="/negotiate/:bookingId" element={user ? <NegotiationPage /> : <Home user={user} />} />
                    <Route path="/events" element={<ExploreEvents user={user} />} />
                    <Route path="/events/:id" element={<EventDetail user={user} />} />
                    <Route path="/vendors" element={<VendorMarketplace user={user} />} />
                    <Route path="/vendor/:id" element={<VendorProfilePage user={user} />} />
                    <Route path="/how-it-works" element={<HowItWorks />} />
                    <Route path="/pricing" element={<PricingPasses />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/admin/users" element={user ? <AdminPanel user={user} /> : <Home user={user} />} />
                    <Route path="/admin/events" element={user ? <AdminPanel user={user} /> : <Home user={user} />} />
                    <Route path="/tickets" element={user ? <TicketWallet user={user} /> : <Home user={user} />} />
                    <Route path="/staff/scanner" element={user ? <StaffScanner user={user} /> : <Home user={user} />} />
                    <Route path="/settings" element={user ? <Settings user={user} /> : <Home user={user} />} />
                    <Route path="/calendar" element={user ? <AvailabilityCalendar /> : <Home user={user} />} />
                    <Route path="/notifications" element={user ? <Notifications /> : <Home user={user} />} />
                    <Route path="/budget-tracker" element={user ? <BudgetTracker /> : <Home user={user} />} />
                    <Route path="/ai-concierge" element={user ? <AIConcierge /> : <Home user={user} />} />
                    <Route path="/favorites" element={user ? <Favorites /> : <Home user={user} />} />
                    <Route path="/portfolio" element={user ? <PortfolioManager /> : <Home user={user} />} />
                    <Route path="/reviews" element={user ? <ProviderReviews /> : <Home user={user} />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
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
