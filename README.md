# NuurPath Travels - Full Stack Travel Booking Application

A comprehensive travel booking platform with React frontend and Node.js/Express backend.

## 🚀 Quick Start

### Development Mode

1. **Start the backend server:**
```bash
cd backend
npm install
node server.js
```

2. **Start the frontend development server:**
```bash
cd frontend
npm install
npm start
```

The application will be available at:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`

### Production Deployment

1. **Build the frontend:**
```bash
cd frontend
npm run build
```

2. **Set up environment variables:**
Create a `.env` file in the `backend` directory with:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/nuurpath_travels
JWT_SECRET=your_strong_secret_key
NODE_ENV=production
```

3. **Start the production server:**
```bash
cd backend
npm install
node server.js
```

The production application will be available at: `http://localhost:5000`

### Using the Deployment Script

Run the deployment script to automate the process:
```bash
./deploy.sh
```

## 📁 Project Structure

```
nuurpath-travels/
├── backend/              # Node.js/Express backend
│   ├── config/           # Database configuration
│   ├── controllers/      # Route controllers
│   ├── middleware/        # Express middleware
│   ├── models/           # Mongoose models
│   ├── routes/           # API routes
│   └── server.js         # Main server file
├── frontend/             # React frontend
│   ├── public/           # Static files
│   ├── src/              # React source code
│   │   ├── api/          # API service files
│   │   ├── components/   # React components
│   │   ├── contexts/      # React contexts
│   │   ├── pages/        # Page components
│   │   ├── __tests__/    # Unit tests
│   │   └── App.js        # Main App component
│   └── package.json      # Frontend dependencies
├── deploy.sh             # Deployment script
└── README.md             # Project documentation
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
- **Real-time Chat**: Socket.IO based real-time messaging system
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
- MongoDB with Mongoose
- JWT Authentication
- CORS and Helmet for security
- Express Validator for input validation

### Testing
- Jest
- React Testing Library

## 📝 API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/packages` - Get all travel packages
- `POST /api/bookings` - Create a booking
- `GET /api/reviews` - Get reviews

## 🎯 Environment Variables

Create a `.env` file in the backend directory:

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/nuurpath_travels
JWT_SECRET=Nuurpath2025 
NODE_ENV=development
```

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
