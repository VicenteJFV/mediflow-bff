const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');

// Define the route for retrieving full patient history (BFF evaluation endpoint)
router.get('/patients/:id/full-history', patientController.getFullPatientHistory);

// Define the route for retrieving full patient history (Frontend consumer endpoint)
router.get('/paciente/:id/historial', patientController.getPatientHistoryArray);

// Define the route for retrieving patient demographics (Frontend consumer endpoint)
router.get('/paciente/:id/demographics', patientController.getPatientDemographics);

module.exports = router;
