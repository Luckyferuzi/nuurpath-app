require('dotenv').config();​
const express = require('express');​
const connectDB = require('./config/db');​
const cors = require('cors');​
​
const app = express();​
​
// Connect Database​
connectDB();​
​
// Middleware​
app.use(express.json()); // Body parser for JSON data​
app.use(cors()); // Enable CORS for frontend communication​
​
// Define Routes​
app.use('/api/auth', require('./routes/authRoutes'));​
app.use('/api/packages', require('./routes/packageRoutes'));​
app.use('/api/bookings', require('./routes/bookingRoutes'));​
​
// Basic route​
app.get('/', (req, res) => {​
res.send('NuurPath Travels API is running!');​
});​
​
const PORT = process.env.PORT || 5000;​
​
app.listen(PORT, () => console.log(`Server running on port
${PORT}`));
