const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
const apiRoutes = require('./src/routes/apiRoutes');
app.use('/api', apiRoutes);

// Fallback route for SPA (Express 5 compatible)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🏏 Cricket Toss Analyzer Platform is running!`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`📅 Date-wise matches & Deep Toss Analysis active`);
  console.log(`💡 Zero-cost Free API Engine Ready`);
  console.log(`====================================================`);
});
