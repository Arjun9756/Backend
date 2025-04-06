const express = require('express')
const app = express()
const dotenv = require('dotenv')
const DataExtractor = require('./Routes/DataExtractor')
const cors = require('cors')
const db = require('./DataBase/DBConnect')
const Login = require('./Routes/Login')
const Signup = require('./Routes/Signup')
const AINewsDetect = require('./Routes/AINewsDetect')
const SearchAPI = require('./Routes/SearchAPI')
const voice = require('./Routes/Voice_Generate')

dotenv.config()
app.use(express.json())

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Server is running',
    status: true
  })
})

// CORS setup with appropriate configuration for different environments
app.use((req, res, next) => {
  // Allow Netlify domains and your local development domains
  const allowedOrigins = [
    'https://truth-guard-seven.vercel.app',
    'https://truth-guards.netlify.app',  // Update with your actual Netlify domain
    'http://localhost:5500',
    'http://127.0.0.1:5500'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
    res.header('Access-Control-Allow-Origin', origin || '*');
  } else {
    res.header('Access-Control-Allow-Origin', 'https://your-netlify-site.netlify.app'); // Default to your Netlify domain
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Also keep the regular CORS middleware for compatibility
app.use(cors({ origin: true, credentials: true }));

// Set API_URL for routes to use
process.env.API_URL = process.env.NODE_ENV === 'production'
  ? process.env.API_URL
  : `http://localhost:${process.env.PORT || 5000}`;

app.use('/login', Login)
app.use('/ai-news-detect', AINewsDetect.route)
app.use('/signup', Signup)
app.use('/data', DataExtractor)
app.use('/search', SearchAPI.route)
app.use('/voice', voice)

// For Vercel, we need to export the Express app as a module
if (process.env.NODE_ENV === 'production') {
  // Export for Vercel serverless function
  module.exports = app;
} else {
  // Traditional server listening when running locally
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}