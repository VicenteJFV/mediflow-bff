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
});
