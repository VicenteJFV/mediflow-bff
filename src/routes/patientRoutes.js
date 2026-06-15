const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');

// Define the route for retrieving full patient history
router.get('/patients/:id/full-history', patientController.getFullPatientHistory);

module.exports = router;
