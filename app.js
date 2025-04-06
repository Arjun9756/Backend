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
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500' , '*'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions))

// Set API_URL for routes to use
process.env.API_URL = process.env.NODE_ENV === 'production'
  ? process.env.API_URL
  : `http://localhost:${process.env.PORT || 5000}`;

app.use('/login', Login)
app.use('/ai-news-detect', AINewsDetect)
app.use('/signup', Signup)
app.use('/data', DataExtractor)
app.use('/search', SearchAPI)
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