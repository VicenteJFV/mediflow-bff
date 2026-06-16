const request = require('supertest');
const axios = require('axios');
const app = require('../src/index');

// Mock Axios globally
jest.mock('axios');

describe('Patient Controller - getFullPatientHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return 200 and combined data when both microservices respond successfully', async () => {
    const mockHceData = {
      id: 123,
      allergies: ['penicillin'],
      diagnoses: ['Hypertension']
    };
    const mockLabData = [
      { id: 1, testName: 'Blood Count', status: 'Completed' },
      { id: 2, testName: 'Glucose', status: 'Pending' }
    ];

    axios.get.mockImplementation((url) => {
      if (url.includes(':8080/api/hce/patients/123')) {
        return Promise.resolve({ data: mockHceData });
      }
      if (url.includes(':8081/api/laboratorios/patients/123')) {
        return Promise.resolve({ data: mockLabData });
      }
      return Promise.reject(new Error('Unknown URL in mock'));
    });

    const response = await request(app)
      .get('/api/patients/123/full-history')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toEqual({
      patientId: '123',
      clinicalHistory: mockHceData,
      labOrders: mockLabData
    });
    expect(axios.get).toHaveBeenCalledTimes(2);
  });

  test('should return 500 when ms-hce fails', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes(':8080/api/hce/patients/123')) {
        return Promise.reject(new Error('HCE Service Unavailable'));
      }
      if (url.includes(':8081/api/laboratorios/patients/123')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.reject(new Error('Unknown URL in mock'));
    });

    const response = await request(app)
      .get('/api/patients/123/full-history')
      .expect('Content-Type', /json/)
      .expect(500);

    expect(response.body).toEqual({
      error: {
        message: 'HCE Service Unavailable',
        status: 500
      }
    });
  });

  test('should return 500 when ms-laboratorios fails', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes(':8080/api/hce/patients/123')) {
        return Promise.resolve({ data: { id: 123 } });
      }
      if (url.includes(':8081/api/laboratorios/patients/123')) {
        return Promise.reject(new Error('Lab Service Down'));
      }
      return Promise.reject(new Error('Unknown URL in mock'));
    });

    const response = await request(app)
      .get('/api/patients/123/full-history')
      .expect('Content-Type', /json/)
      .expect(500);

    expect(response.body).toEqual({
      error: {
        message: 'Lab Service Down',
        status: 500
      }
    });
  });

  test('should handle Axios errors with response details correctly', async () => {
    const axiosError = new Error('Request failed with status code 404');
    axiosError.response = {
      status: 404,
      data: { message: 'Patient not found in HCE database' }
    };

    axios.get.mockImplementation((url) => {
      if (url.includes(':8080/api/hce/patients/999')) {
        return Promise.reject(axiosError);
      }
      if (url.includes(':8081/api/laboratorios/patients/999')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.reject(new Error('Unknown URL in mock'));
    });

    const response = await request(app)
      .get('/api/patients/999/full-history')
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toEqual({
      error: {
        message: 'Patient not found in HCE database',
        status: 404
      }
    });
  });

  test('should return 400 when patient ID is missing', async () => {
    const patientController = require('../src/controllers/patientController');
    const req = { params: {} };
    const res = {};
    const next = jest.fn();

    await patientController.getFullPatientHistory(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const errorPassed = next.mock.calls[0][0];
    expect(errorPassed.message).toBe('Patient ID is required');
    expect(errorPassed.status).toBe(400);
  });

  describe('getPatientHistoryArray', () => {
    test('should return 400 when patient ID is missing', async () => {
      const patientController = require('../src/controllers/patientController');
      const req = { params: {} };
      const res = {};
      const next = jest.fn();

      await patientController.getPatientHistoryArray(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const errorPassed = next.mock.calls[0][0];
      expect(errorPassed.message).toBe('Patient ID is required');
      expect(errorPassed.status).toBe(400);
    });

    test('should return mapped array when microservices return valid data', async () => {
      const mockHceData = {
        id: 98765,
        allergies: 'Penicillin',
        chronicConditions: 'Asthma'
      };
      const mockLabData = [
        {
          id: 45,
          studyType: 'Blood Test',
          status: 'COMPLETED',
          labResult: {
            resultDate: '2026-06-12T10:00:00',
            resultData: 'Hemoglobin: 14',
            observations: 'Normal results'
          }
        }
      ];

      axios.get.mockImplementation((url) => {
        if (url.includes(':8080/api/hce/patients/1')) {
          return Promise.resolve({ data: mockHceData });
        }
        if (url.includes(':8081/api/laboratorios/patients/1')) {
          return Promise.resolve({ data: mockLabData });
        }
        return Promise.reject(new Error('Unknown URL in mock'));
      });

      const response = await request(app)
        .get('/api/paciente/MF-98765/historial')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0].tipo).toBe('Consulta General');
      expect(response.body[0].diagnostico).toBe('Asthma');
      expect(response.body[1].tipo).toBe('Resultados de Laboratorio');
      expect(response.body[1].examen).toBe('Blood Test');
    });

    test('should return fallback mock data when microservices fail or are offline', async () => {
      axios.get.mockImplementation(() => {
        return Promise.reject(new Error('Connection refused'));
      });

      const response = await request(app)
        .get('/api/paciente/MF-98765/historial')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0].id).toBe('rec-1');
      expect(response.body[0].tipo).toBe('Consulta General');
      expect(response.body[1].id).toBe('rec-2');
      expect(response.body[1].tipo).toBe('Resultados de Laboratorio');
    });
  });

  describe('getPatientDemographics', () => {
    test('should return 400 when patient ID is missing', async () => {
      const patientController = require('../src/controllers/patientController');
      const req = { params: {} };
      const res = {};
      const next = jest.fn();

      await patientController.getPatientDemographics(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const errorPassed = next.mock.calls[0][0];
      expect(errorPassed.message).toBe('Patient ID is required');
      expect(errorPassed.status).toBe(400);
    });

    test('should return demographics from ms-hce when patient exists', async () => {
      const mockHceData = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@email.com',
        phoneNumber: '+56999999999',
        birthDate: '1990-01-01',
        documentNumber: '12.345.678-9'
      };

      axios.get.mockImplementation((url) => {
        if (url.includes(':8080/api/hce/patients/1')) {
          return Promise.resolve({ data: mockHceData });
        }
        return Promise.reject(new Error('Unknown URL in mock'));
      });

      const response = await request(app)
        .get('/api/paciente/MF-1/demographics')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.nombre).toBe('John Doe');
      expect(response.body.rut).toBe('12.345.678-9');
      expect(response.body.email).toBe('john.doe@email.com');
    });

    test('should return fallback demographics when ms-hce fails', async () => {
      axios.get.mockImplementation(() => {
        return Promise.reject(new Error('Connection refused'));
      });

      const response = await request(app)
        .get('/api/paciente/MF-2/demographics')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.id).toBe('MF-2');
      expect(response.body.nombre).toBe('Paciente Demo MF-2');
      expect(response.body.email).toBe('paciente.2@mediflow.cl');
    });
  });
});
