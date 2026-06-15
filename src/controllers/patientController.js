const apiService = require('../services/apiService');

/**
 * Controller to fetch and combine clinical history and lab orders for a patient.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function getFullPatientHistory(req, res, next) {
  const { id } = req.params;

  if (!id) {
    const error = new Error('Patient ID is required');
    error.status = 400;
    return next(error);
  }

  try {
    // Call both services concurrently
    const [clinicalHistory, labOrders] = await Promise.all([
      apiService.getClinicalHistory(id),
      apiService.getLabOrders(id)
    ]);

    return res.status(200).json({
      patientId: id,
      clinicalHistory,
      labOrders
    });
  } catch (error) {
    // Determine the status and forward the error to the global handler
    const status = error.response ? error.response.status : (error.status || 500);
    const message = error.response && error.response.data && error.response.data.message
      ? error.response.data.message
      : (error.message || 'Internal Server Error while fetching patient details');
    
    const err = new Error(message);
    err.status = status;
    return next(err);
  }
}

module.exports = {
  getFullPatientHistory
};
