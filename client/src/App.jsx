import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, matchPath } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { PublicContentProvider } from './contexts/PublicContentContext.jsx';
import { StaffNotificationsProvider } from './contexts/StaffNotificationsContext.jsx';
import PackageList from './components/PackageList.jsx';
import PackageDetails from './components/PackageDetails.jsx';
import TravelStoriesPage from './components/TravelStoriesPage.jsx';
import TravelStoryDetails from './components/TravelStoryDetails.jsx';
import Navbar from './components/Navbar.jsx';
import BookingForm from './components/BookingForm.jsx';
import PrivateConsultationBooking from './components/PrivateConsultationBooking.jsx';
import FlightBookingForm from './components/FlightBookingForm.jsx';
import AdminRoute from './components/AdminRoute.jsx';
import PrivateRoute from './components/PrivateRoute.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import PrivateConsultationsAdmin from './components/PrivateConsultationsAdmin.jsx';
import PackageBookingsAdmin from './components/PackageBookingsAdmin.jsx';
import FlightBookingsAdmin from './components/FlightBookingsAdmin.jsx';
import ManageUsers from './components/ManageUsers.jsx';
import ManageServices from './components/ManageServices.jsx';
import ServiceInquiriesAdmin from './components/ServiceInquiriesAdmin.jsx';
import ServiceInquiryForm from './components/ServiceInquiryForm.jsx';
import ManagePackages from './components/ManagePackages.jsx';
import ManageReviews from './components/ManageReviews.jsx';
import ManageMediaPosts from './components/ManageMediaPosts.jsx';
import ManageNewsletter from './components/ManageNewsletter.jsx';
import Login from './components/Login.jsx';
import StaffLogin from './components/StaffLogin.jsx';
import AdminSetup from './components/AdminSetup.jsx';
import ChatComponent from './components/ChatComponent.jsx';
import Register from './components/Register.jsx';
import ForgotPassword from './components/ForgotPassword.jsx';
import ResetPassword from './components/ResetPassword.jsx';
import ContactUs from './components/ContactUs.jsx';
import UserDashboard from './components/UserDashboard.jsx';
import UserProfile from './components/UserProfile.jsx';
import TermsAndConditions from './components/TermsAndConditions.jsx';
import PrivacyPolicy from './components/PrivacyPolicy.jsx';
import NewsletterPreferencesPage from './components/NewsletterPreferencesPage.jsx';
import Footer from './components/Footer.jsx';
import Home from './components/Home.jsx';
import WhatsAppButton from './components/WhatsAppButton.jsx';
import ChatWidget from './ChatWidget.jsx';
import BackToTopButton from './components/BackToTopButton.jsx';
import WishlistPage from './components/WishlistPage.jsx';
import Team from './components/Team.jsx';
import VerifyEmail from './components/VerifyEmail.jsx';
import StaffPortalHeader from './components/StaffPortalHeader.jsx';
import StaffWorkspaceLayout from './components/StaffWorkspaceLayout.jsx';
import NotFoundPage from './components/NotFoundPage.jsx';
import ScrollToTopOnRouteChange from './components/ScrollToTopOnRouteChange.jsx';
import './App.css';

const GOOGLE_CLIENT_ID = (process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim();
const FOOTER_HIDDEN_PATTERNS = [
  '/book/:packageId',
  '/book-flight',
  '/book-consultation',
  '/services/:serviceId/request',
  '/contact',
  '/stories',
  '/stories/:id',
  '/packages',
  '/packages/:id',
];
const FOOTER_COMPACT_PATTERNS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password/:token',
  '/verify-email/:token',
  '/terms',
  '/privacy',
  '/newsletter/preferences',
  '/dashboard',
  '/wishlist',
  '/profile',
];

const matchesPattern = (patterns, pathname) => patterns.some((pattern) => matchPath({ path: pattern, end: true }, pathname));

const getPublicFooterVariant = (pathname) => {
  if (matchesPattern(FOOTER_HIDDEN_PATTERNS, pathname)) {
    return 'none';
  }

  if (matchesPattern(FOOTER_COMPACT_PATTERNS, pathname)) {
    return 'compact';
  }

  return 'full';
};

function AppFrame() {
  const location = useLocation();
  const isAdminWorkspaceRoute = location.pathname.startsWith('/admin');
  const isStaffPortalRoute = location.pathname.startsWith('/staff') || isAdminWorkspaceRoute;
  const showStandaloneStaffHeader = location.pathname.startsWith('/staff');
  const footerVariant = !isStaffPortalRoute ? getPublicFooterVariant(location.pathname) : 'none';
  const publicMainClassName = 'flex-1 bg-[#f7f6f2]';

  return (
    <div className="App">
      <ScrollToTopOnRouteChange />
      {showStandaloneStaffHeader ? <StaffPortalHeader /> : !isAdminWorkspaceRoute ? <Navbar /> : null}
      <main className={isStaffPortalRoute ? 'flex-1' : publicMainClassName}>
        <PublicContentProvider enabled={!isStaffPortalRoute}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/packages" element={<PackageList />} />
            <Route path="/packages/:id" element={<PackageDetails />} />
            <Route path="/stories" element={<TravelStoriesPage />} />
            <Route path="/stories/:id" element={<TravelStoryDetails />} />
            <Route path="/book/:packageId" element={<BookingForm />} />
            <Route path="/book-consultation" element={<PrivateConsultationBooking />} />
            <Route path="/book-flight" element={<FlightBookingForm />} />
            <Route path="/services/:serviceId/request" element={<ServiceInquiryForm />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/terms" element={<TermsAndConditions />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/newsletter/preferences" element={<NewsletterPreferencesPage />} />
            <Route path="/team" element={<Team />} />
            <Route path="/verify-email/:token" element={<VerifyEmail />} />
            <Route path="/staff/login" element={<StaffLogin />} />
            <Route path="/staff/setup" element={<AdminSetup />} />

            <Route element={<PrivateRoute />}>
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/profile" element={<UserProfile />} />
            </Route>

            {/* Admin Routes */}
            <Route element={<AdminRoute allowedRoles={['admin', 'manager']} />}>
              <Route path="/admin" element={<StaffNotificationsProvider><StaffWorkspaceLayout /></StaffNotificationsProvider>}>
                <Route index element={<AdminDashboard />} />
                <Route path="consultations" element={<PrivateConsultationsAdmin />} />
                <Route path="package-bookings" element={<PackageBookingsAdmin />} />
                <Route path="flight-bookings" element={<FlightBookingsAdmin />} />
                <Route path="service-inquiries" element={<ServiceInquiriesAdmin />} />
                <Route path="reviews" element={<ManageReviews />} />
                <Route path="chat" element={<ChatComponent />} />
                <Route
                  element={(
                    <AdminRoute
                      allowedRoles={['admin']}
                      permissionTitle="Admin Access Required"
                      permissionMessage="Only admin accounts can manage users, services, package content, media posts, and newsletter operations."
                      fallbackPath="/admin"
                    />
                  )}
                >
                  <Route path="users" element={<ManageUsers />} />
                  <Route path="services" element={<ManageServices />} />
                  <Route path="packages" element={<ManagePackages />} />
                  <Route path="media-posts" element={<ManageMediaPosts />} />
                  <Route path="newsletter" element={<ManageNewsletter />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </PublicContentProvider>
      </main>
      {!isStaffPortalRoute && (
        <>
          {footerVariant !== 'none' ? <Footer variant={footerVariant} /> : null}
          <WhatsAppButton />
          <ChatWidget />
          <BackToTopButton />
        </>
      )}
    </div>
  );
}

function App() {
  const appContent = (
    <AuthProvider>
      <Router>
        <AppFrame />
      </Router>
    </AuthProvider>
  );

  if (!GOOGLE_CLIENT_ID) {
    return appContent;
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {appContent}
    </GoogleOAuthProvider>
  );
}

export default App;
