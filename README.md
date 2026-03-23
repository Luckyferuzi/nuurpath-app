# NuurPath Travels - Full Stack Travel Booking Application

A premium travel booking platform specializing in Hajj, Umrah, and Luxury Tourism, built with a modern React frontend and Node.js/Express backend.

## 🚀 Quick Start

### Prerequisites
- Node.js (v14+)
- PostgreSQL
- npm or yarn

### Development Mode

1. **Start the backend server:**
   ```bash
   cd server
   npm install
   node server.js
   ```
   The backend runs on `http://localhost:5001` by default.

2. **Start the frontend development server:**
   ```bash
   cd client
   npm install
   npm start
   ```
   The frontend runs on `http://localhost:3000`.

### Concurrent Start (Recommended)

To run both client and server with a single command from the root directory:

```bash
npm run dev
```

### Environment Variables

Create a `.env` file in the root directory:

```env
PORT=5001
DATABASE_URL=postgresql://user:password@localhost:5432/nuurpath_travels
JWT_SECRET=Nuurpath2025
NODE_ENV=development

# Email Configuration (Optional)
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=<your-mailtrap-user>
EMAIL_PASS=<your-mailtrap-pass>
EMAIL_FROM="NuurPath Travels <noreply@nuurpath.com>"
```

## 🧪 Testing

Run unit tests:
```bash
cd frontend
npm test
```

## 🔧 Features

- **User Authentication**: JWT-based authentication system
- **User Profile Management**: Complete profile management with bio, contact info, and preferences
- **Travel Packages**: Browse and search travel packages
- **Booking System**: Book travel packages
- **Reviews**: Leave reviews for packages
- **Admin Dashboard**: Comprehensive admin dashboard with user and booking management
- **Notification System**: User notifications with read/unread status
- **Responsive Design**: Mobile-friendly interface

## 🛠 Technologies

### Frontend
- React 18
- React Router DOM
- Axios for API calls
- Bootstrap for styling
- React Datepicker for date selection

### Backend
- Node.js with Express
- PostgreSQL
- JWT Authentication
- CORS and Helmet for security
- Express Validator for input validation

### Testing
- Jest
- React Testing Library

## 📝 API Endpoints

- `GET /api` - API Health Check
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `GET /api/packages` - Get all travel packages
- `GET /api/packages/:id` - Get package details
- `POST /api/bookings` - Create a booking
- `GET /api/bookings` - Get user bookings
- `GET /api/reviews` - Get reviews
- `POST /api/newsletter` - Newsletter subscription
- `POST /api/flights` - Flight booking requests
- `POST /api/appointments` - Appointment booking

## 🔒 Security Features

- Helmet for security headers
- CORS configuration
- JWT authentication
- Input validation
- Error handling middleware

## 🚀 Deployment Options

1. **Local Deployment**: Use the provided `deploy.sh` script
2. **Cloud Deployment**: Deploy to platforms like Heroku, Vercel, or AWS
3. **Containerization**: Use Docker for containerized deployment

## 📈 Future Enhancements

- Add flight booking functionality
- Implement payment gateway integration
- Add user profile management
- Implement admin dashboard
- Add real-time chat support
- Implement notification system
# nuurpath-travels
