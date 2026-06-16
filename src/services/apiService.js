const axios = require('axios');

const MS_HCE_URL = process.env.MS_HCE_URL || 'http://localhost:8080';
const MS_LABORATORIOS_URL = process.env.MS_LABORATORIOS_URL || 'http://localhost:8081';

/**
 * Gets the clinical history for a patient from ms-hce.
 * @param {string|number} patientId 
 * @returns {Promise<Object>}
 */
async function getClinicalHistory(patientId) {
  const response = await axios.get(`${MS_HCE_URL}/api/patients/${patientId}`);
  return response.data;
}

/**
 * Gets the laboratory orders for a patient from ms-laboratorios.
 * @param {string|number} patientId 
 * @returns {Promise<Object>}
 */
async function getLabOrders(patientId) {
  const response = await axios.get(`${MS_LABORATORIOS_URL}/api/laboratory/patients/${patientId}`);
  return response.data;
}

module.exports = {
  getClinicalHistory,
  getLabOrders,
  MS_HCE_URL,
  MS_LABORATORIOS_URL
};
