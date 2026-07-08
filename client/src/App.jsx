import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { LanguageProvider } from './contexts/LanguageContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import PackageList from './components/PackageList.jsx';
import PackageDetails from './components/PackageDetails.jsx';
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
import ManagePackages from './components/ManagePackages.jsx';
import ManageReviews from './components/ManageReviews.jsx';
import Login from './components/Login.jsx';
import ChatComponent from './components/ChatComponent.jsx';
import Register from './components/Register.jsx';
import ForgotPassword from './components/ForgotPassword.jsx';
import ResetPassword from './components/ResetPassword.jsx';
import ContactUs from './components/ContactUs.jsx';
import UserDashboard from './components/UserDashboard.jsx';
import UserProfile from './components/UserProfile.jsx';
import TermsAndConditions from './components/TermsAndConditions.jsx';
import Footer from './components/Footer.jsx';
import Home from './components/Home.jsx';
import WhatsAppButton from './components/WhatsAppButton.jsx';
import ChatWidget from './ChatWidget.jsx';
import BackToTopButton from './components/BackToTopButton.jsx';
import WishlistPage from './components/WishlistPage.jsx';
import Team from './components/Team.jsx';
import VerifyEmail from './components/VerifyEmail.jsx';
import './App.css';

const GOOGLE_CLIENT_ID = (process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim();

function App() {
  const appContent = (
    <AuthProvider>
      <LanguageProvider>
        <ThemeProvider>
          <Router>
            <div className="App">
              <Navbar />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/packages" element={<PackageList />} />
                <Route path="/packages/:id" element={<PackageDetails />} />
                <Route path="/book/:packageId" element={<BookingForm />} />
                <Route path="/book-consultation" element={<PrivateConsultationBooking />} />
                <Route path="/book-flight" element={<FlightBookingForm />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />
                <Route path="/contact" element={<ContactUs />} />
                <Route path="/terms" element={<TermsAndConditions />} />
                <Route path="/team" element={<Team />} />
                <Route path="/verify-email/:token" element={<VerifyEmail />} />
                
                <Route element={<PrivateRoute />}>
                  <Route path="/dashboard" element={<UserDashboard />} />
                  <Route path="/wishlist" element={<WishlistPage />} />
                  <Route path="/profile" element={<UserProfile />} />
                </Route>
              

                {/* Admin Routes */}
                <Route element={<AdminRoute />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/consultations" element={<PrivateConsultationsAdmin />} />
                  <Route path="/admin/package-bookings" element={<PackageBookingsAdmin />} />
                  <Route path="/admin/flight-bookings" element={<FlightBookingsAdmin />} />
                  <Route path="/admin/users" element={<ManageUsers />} />
                  <Route path="/admin/services" element={<ManageServices />} />
                  <Route path="/admin/packages" element={<ManagePackages />} />
                  <Route path="/admin/reviews" element={<ManageReviews />} />
                  <Route path="/admin/chat" element={<ChatComponent />} />
                </Route>
              </Routes>
              <Footer />
              <WhatsAppButton />
              <ChatWidget />
              <BackToTopButton />
            </div>
          </Router>
        </ThemeProvider>
      </LanguageProvider>
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
