# MediFlow BFF (Backend For Frontend)

El BFF de **MediFlow** es un servicio construido en Node.js y Express que actúa como intermediario y orquestador entre el frontend de React y los microservicios backend de Spring Boot (`ms-hce` y `ms-laboratorios`). Su propósito principal es consolidar la información médica y de laboratorio de los pacientes en un único endpoint optimizado para el consumo del cliente.

## Requisitos Previos

* **Node.js** (v16 o superior)
* **npm** (v7 o superior)

## Instalación

Para descargar e instalar todas las dependencias necesarias (incluyendo dependencias de desarrollo para testing), ejecuta en la raíz del proyecto:

```bash
npm install
```

## Configuración

Por defecto, el BFF se conecta a los microservicios en las siguientes URLs locales:
* **ms-hce**: `http://localhost:8080`
* **ms-laboratorios**: `http://localhost:8081`

Puedes personalizar estas URLs a través de variables de entorno:
```bash
# Ejemplo en Linux/macOS
PORT=3000 MS_HCE_URL=http://localhost:8080 MS_LABORATORIOS_URL=http://localhost:8081 npm start

# Ejemplo en Windows (PowerShell)
$env:PORT="3000"
$env:MS_HCE_URL="http://localhost:8080"
$env:MS_LABORATORIOS_URL="http://localhost:8081"
npm start
```

## Ejecución del Servidor

Para iniciar el servidor del BFF en modo de producción o ejecución directa:

```bash
npm start
```

El servidor estará escuchando en el puerto `3000` (o el puerto especificado en la variable `PORT`): `http://localhost:3000`.

## Pruebas Unitarias y Cobertura (Coverage)

Para correr las pruebas unitarias automatizadas con Jest y Supertest, junto con el reporte de cobertura exigido:

```bash
npm test
```

Este comando ejecutará los tests y mostrará una tabla resumen en la terminal. El reporte detallado de cobertura en formato HTML se generará automáticamente en el directorio `/coverage`.

---

## Evaluación y Endpoints de la API

El BFF expone el siguiente endpoint principal para ser integrado con el frontend o evaluado mediante herramientas como Postman o Swagger:

### 1. Obtener Historial Clínico Completo de un Paciente

* **Endpoint**: `GET /api/patients/:id/full-history`
* **Descripción**: Realiza peticiones concurrentes a `ms-hce` y `ms-laboratorios` para obtener y combinar el historial clínico del paciente y sus órdenes de laboratorio.
* **Parámetros**:
  * `id` (path parameter): El ID identificador del paciente.

#### Ejemplo de Petición (curl)
```bash
curl http://localhost:3000/api/patients/123/full-history
```

#### Estructura de Respuesta Exitosa (JSON - 200 OK)
```json
{
  "patientId": "123",
  "clinicalHistory": {
    "id": 123,
    "allergies": ["penicillin"],
    "diagnoses": ["Hypertension"]
  },
  "labOrders": [
    { "id": 1, "testName": "Blood Count", "status": "Completed" },
    { "id": 2, "testName": "Glucose", "status": "Pending" }
  ]
}
```

#### Respuestas de Error
* **400 Bad Request**: Si no se proporciona un ID de paciente válido.
* **404 Not Found**: Si el paciente no existe en la base de datos de los microservicios.
* **500 Internal Server Error**: Si hay un fallo de comunicación con los microservicios o caída de los mismos.

### Evaluación en Postman / Swagger
Para probar y evaluar la API en entornos de integración:
1. Importa una petición `GET` a `http://localhost:3000/api/patients/{id}/full-history` en tu colección de **Postman**.
2. Asegúrate de tener levantados de forma simulada o real los microservicios en los puertos `8080` (ms-hce) y `8081` (ms-laboratorios), o mockea sus respuestas de acuerdo a tus necesidades de prueba.
