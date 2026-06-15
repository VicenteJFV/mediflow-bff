const express = require('express');
const cors = require('cors');
const patientRoutes = require('./routes/patientRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Apply CORS middleware
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Bind routes to prefix /api
app.use('/api', patientRoutes);

// Global error handling middleware
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(status).json({
    error: {
      message,
      status
    }
  });
});

// Start the server if file is executed directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`MediFlow BFF listening on port ${PORT}`);
  });
}

module.exports = app;
