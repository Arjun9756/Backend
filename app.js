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
  // In development mode, allow all origins with credentials
  if (process.env.NODE_ENV !== 'production') {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
  } else {
    // In production, check against allowed origins list
    const allowedOrigins = ['https://truth-guards.netlify.app', 'https://polite-dasik-5bd09f.netlify.app', 'https://lustrous-halva-6f3277.netlify.app'];
    const origin = req.headers.origin;
    
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    } else {
      // For other origins, allow without credentials
      res.header('Access-Control-Allow-Origin', '*');
    }
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Replace the cors middleware with a more specific configuration
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = ['https://truth-guards.netlify.app', 'https://polite-dasik-5bd09f.netlify.app', 'https://lustrous-halva-6f3277.netlify.app', 'http://localhost:3000', 'http://127.0.0.1:5173'];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In production, reject requests from non-allowed origins
      // In development, allow all origins
      callback(null, process.env.NODE_ENV !== 'production');
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

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