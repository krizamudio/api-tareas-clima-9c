const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const tareasModel = require('../models/tareas');
const { obtenerClima } = require('../services/clima');

function validar(req, res, next) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) return res.status(400).json({ errores: errores.array() });
  next();
}

// GET /api/tareas — listar todas
router.get('/', (req, res) => {
  res.status(200).json(tareasModel.obtenerTodas());
});

// GET /api/tareas/:id — obtener una
router.get('/:id', param('id').isInt(), validar, (req, res) => {
  const tarea = tareasModel.obtenerPorId(Number(req.params.id));
  if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });
  res.status(200).json(tarea);
});

// POST /api/tareas — crear
router.post(
  '/',
  body('titulo').isString().trim().isLength({ min: 1, max: 100 }).escape(),
  validar,
  (req, res) => {
    const nueva = tareasModel.crear(req.body.titulo);
    res.status(201).json(nueva);
  }
);

// PUT /api/tareas/:id — actualizar
router.put(
  '/:id',
  param('id').isInt(),
  body('titulo').optional().isString().trim().isLength({ min: 1, max: 100 }).escape(),
  body('completada').optional().isBoolean(),
  validar,
  (req, res) => {
    const actualizada = tareasModel.actualizar(Number(req.params.id), req.body);
    if (!actualizada) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.status(200).json(actualizada);
  }
);

// DELETE /api/tareas/:id — eliminar
router.delete(
  '/:id',
  param('id').isInt(),
  validar,
  (req, res) => {
    const eliminada = tareasModel.eliminar(Number(req.params.id));
    if (!eliminada) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.status(204).send();
  }
);

// GET /api/tareas/:id/clima?ciudad=Toluca — combina la tarea con el clima de una ciudad
router.get('/:id/clima', param('id').isInt(), validar, async (req, res) => {
  const tarea = tareasModel.obtenerPorId(Number(req.params.id));
  if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });

  const ciudad = req.query.ciudad || 'Ciudad de Mexico';

  try {
    const clima = await obtenerClima(ciudad);
    res.status(200).json({ tarea, clima });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

module.exports = router;
