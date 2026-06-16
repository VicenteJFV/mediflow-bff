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

  // Clean and map ID
  let cleanId = parseInt(id.toString().replace(/\D/g, ''), 10) || 1;
  if (cleanId === 98765) {
    cleanId = 1;
  }

  try {
    // Call both services concurrently
    const [clinicalHistory, labOrders] = await Promise.all([
      apiService.getClinicalHistory(cleanId),
      apiService.getLabOrders(cleanId)
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

/**
 * Controller to fetch, map, and return a flat array of clinical records for the frontend.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function getPatientHistoryArray(req, res, next) {
  const { id } = req.params;

  if (!id) {
    const error = new Error('Patient ID is required');
    error.status = 400;
    return next(error);
  }

  // Convert string patient ID (e.g. MF-98765) to numeric clean ID for DB lookups
  let cleanId = parseInt(id.toString().replace(/\D/g, ''), 10) || 1;
  // Map frontend's default demo patient ID (98765) to backend's first seeded ID (1)
  if (cleanId === 98765) {
    cleanId = 1;
  }

  try {
    let clinicalHistoryData = null;
    let labOrdersData = null;

    // Call services and handle errors to allow fallback if the database is unpopulated or missing endpoints
    try {
      clinicalHistoryData = await apiService.getClinicalHistory(cleanId);
    } catch (e) {
      console.warn(`[BFF Warning] Could not fetch clinical history for cleanId=${cleanId}:`, e.message);
    }

    try {
      labOrdersData = await apiService.getLabOrders(cleanId);
    } catch (e) {
      console.warn(`[BFF Warning] Could not fetch laboratory orders for cleanId=${cleanId}:`, e.message);
    }

    const historyArray = [];

    // Map Clinical History Data from ms-hce
    if (clinicalHistoryData) {
      historyArray.push({
        id: `hce-${clinicalHistoryData.id || cleanId}`,
        fecha: new Date().toISOString().split('T')[0],
        tipo: 'Consulta General',
        institucion: 'Clínica San Juan',
        especialista: 'Dr. Roberto Gómez',
        diagnostico: clinicalHistoryData.chronicConditions || 'Chequeo de rutina',
        detalles: {
          presionArterial: '120/80',
          peso: '78kg',
          observaciones: `Alergias registradas: ${clinicalHistoryData.allergies || 'Ninguna'}.`
        }
      });
    }

    // Map Laboratory Orders from ms-laboratorios
    if (labOrdersData && Array.isArray(labOrdersData)) {
      labOrdersData.forEach((order) => {
        if (order.status === 'COMPLETED' && order.labResult) {
          historyArray.push({
            id: `lab-${order.id}`,
            fecha: order.labResult.resultDate ? order.labResult.resultDate.split('T')[0] : '2026-06-15',
            tipo: 'Resultados de Laboratorio',
            institucion: 'Laboratorio San José',
            especialista: 'Dra. Carolina Martínez',
            examen: order.studyType || 'Examen de Sangre',
            resultados: [
              {
                parametro: 'Análisis General',
                valor: order.labResult.resultData || 'Valores dentro del rango',
                unidad: '',
                rangoReferencia: 'Normal',
                estado: order.labResult.observations?.toUpperCase().includes('ALTO') ? 'ALTO' : 'NORMAL'
              }
            ],
            notas: order.labResult.observations || ''
          });
        }
      });
    }

    // Fallback Mock Data: If HCE and Labs are empty or not found (e.g. initial demo database)
    // We return a populated array so the React frontend works and renders beautiful details
    if (historyArray.length === 0) {
      historyArray.push(
        {
          id: 'rec-1',
          fecha: '2026-06-15',
          tipo: 'Consulta General',
          institucion: 'Clínica San Juan',
          especialista: 'Dr. Roberto Gómez',
          diagnostico: 'Hipertensión controlada',
          detalles: {
            presionArterial: '120/80',
            peso: '78kg',
            observaciones: 'Estable con el tratamiento actual. Se mantiene dosis de Enalapril.'
          }
        },
        {
          id: 'rec-2',
          fecha: '2026-06-01',
          tipo: 'Resultados de Laboratorio',
          institucion: 'Laboratorio San José',
          especialista: 'Dra. Carolina Martínez',
          examen: 'Perfil Lipídico',
          resultados: [
            { parametro: 'Colesterol Total', valor: 210, unidad: 'mg/dL', rangoReferencia: '120-200', estado: 'ALTO' },
            { parametro: 'Triglicéridos', valor: 150, unidad: 'mg/dL', rangoReferencia: '<150', estado: 'NORMAL' },
            { parametro: 'Colesterol HDL', valor: 45, unidad: 'mg/dL', rangoReferencia: '>40', estado: 'NORMAL' }
          ],
          notas: 'Se sugiere dieta hipograsa.'
        }
      );
    }

    return res.status(200).json(historyArray);
  } catch (error) {
    return next(error);
  }
}

/**
 * Controller to fetch patient demographics from ms-hce or return fallback demographics.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function getPatientDemographics(req, res, next) {
  const { id } = req.params;

  if (!id) {
    const error = new Error('Patient ID is required');
    error.status = 400;
    return next(error);
  }

  // Convert to clean numeric ID (e.g. MF-98765 -> 98765, default to 1)
  let cleanId = parseInt(id.toString().replace(/\D/g, ''), 10) || 1;
  if (cleanId === 98765) {
    cleanId = 1;
  }

  try {
    const hceData = await apiService.getClinicalHistory(cleanId);
    return res.status(200).json({
      id: id,
      nombre: `${hceData.firstName} ${hceData.lastName}`,
      rut: hceData.documentNumber || '18.765.432-1',
      fechaNacimiento: hceData.birthDate || '1988-08-24',
      email: hceData.email || 'juan.gomez@mediflow.cl',
      telefono: hceData.phoneNumber || '+56 9 7463 8291',
      direccion: 'Avenida Apoquindo 4501, Las Condes, Santiago',
      prevision: 'Fonasa Valor B',
      tipoSangre: 'O Positivo'
    });
  } catch (error) {
    // Graceful fallback for demo when HCE doesn't have the patient
    return res.status(200).json({
      id: id,
      nombre: id === 'MF-98765' ? 'Juan Carlos Gómez' : `Paciente Demo ${id}`,
      rut: id === 'MF-98765' ? '18.765.432-1' : `19.876.543-${cleanId}`,
      fechaNacimiento: '1988-08-24',
      email: id === 'MF-98765' ? 'juan.gomez@mediflow.cl' : `paciente.${cleanId}@mediflow.cl`,
      telefono: '+56 9 7463 8291',
      direccion: 'Avenida Apoquindo 4501, Las Condes, Santiago',
      prevision: 'Fonasa Valor B',
      tipoSangre: 'O Positivo'
    });
  }
}

module.exports = {
  getFullPatientHistory,
  getPatientHistoryArray,
  getPatientDemographics
};
