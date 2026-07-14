require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const { body, validationResult } = require('express-validator');



const app = express();

app.use(helmet());              // cabeceras de seguridad HTTP
app.use(express.json());        // parseo seguro de JSON



// Ruta de prueba con validación de entrada
app.post(
  '/api/echo',
  body('mensaje').isString().trim().isLength({ min: 1, max: 200 }).escape(),
  (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ errores: errores.array() });
    }
    res.json({ recibido: req.body.mensaje });
  }
);

app.post(
  '/api/registro',
  body('nombre').notEmpty().withMessage('El nombre no debe estar vacío').trim().escape(),
  body('correo').isEmail().withMessage('El correo debe tener un formato válido').normalizeEmail(),
  (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ errores: errores.array() });
    }
    res.status(201).json({ mensaje: 'Registro exitoso', datos: req.body });
  }
);

app.get('/api/salud', (req, res) => {
  res.json({ status: 'ok' });
});

const tareasRouter = require('./routes/tareas');
app.use('/api/tareas', tareasRouter);

const climaRoutes = require('./routes/clima');
app.use('/api/clima', climaRoutes);

module.exports = app;