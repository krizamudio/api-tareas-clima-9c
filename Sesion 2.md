# Sesión 2 — Web Services Propios (REST)

**Unidad III: Integración de componentes de software para aplicaciones WebProyecto integrador:** API de gestión de tareas con clima (Node.js + Express)

## Datos generales


| Campo                      | Detalle                                                                  |
| -------------------------- | ------------------------------------------------------------------------ |
| Duración                  | 2 horas (120 min)                                                        |
| Tema curricular            | Implementación de WEB services en el desarrollo WEB                     |
| Saber hacer que cubre      | Realizar la implementación de WEBservices propios en el desarrollo WEB  |
| Instrumento de evaluación | Lista de cotejo + prueba funcional con Postman                           |
| Requisitos previos         | Proyecto de la Sesión 1 funcionando, Postman o Thunder Client instalado |

## Objetivo de la sesión

Al finalizar, el alumno tendrá un **web service propio tipo REST** para gestionar tareas, con las 5 operaciones CRUD completas, códigos de estado HTTP correctos, validación de datos y documentación básica del API.

### Modelo de datos en memoria (`models/tareas.js`)

Para mantener el foco en el diseño del API (y no en configurar una base de datos), usamos un arreglo en memoria.

```javascript
let tareas = [
  { id: 1, titulo: 'Revisar documentación de la API', completada: false },
  { id: 2, titulo: 'Configurar certificado HTTPS', completada: true }
];
let siguienteId = 3;

module.exports = {
  obtenerTodas: () => tareas,
  obtenerPorId: (id) => tareas.find(t => t.id === id),
  crear: (titulo) => {
    const nueva = { id: siguienteId++, titulo, completada: false };
    tareas.push(nueva);
    return nueva;
  },
  actualizar: (id, datos) => {
    const tarea = tareas.find(t => t.id === id);
    if (!tarea) return null;
    Object.assign(tarea, datos);
    return tarea;
  },
  eliminar: (id) => {
    const indice = tareas.findIndex(t => t.id === id);
    if (indice === -1) return false;
    tareas.splice(indice, 1);
    return true;
  }
};
```

### Rutas REST (`routes/tareas.js`)

```javascript
const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const tareasModel = require('../models/tareas');

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

module.exports = router;
```

Puntos a resaltar en la demo:

- Cada verbo HTTP tiene un propósito claro: GET no modifica datos, POST crea, PUT actualiza.
- Los códigos de estado comunican el resultado sin que el cliente tenga que leer el cuerpo de la respuesta: `201` = creado, `404` = no existe, `400` = petición inválida.
- La validación (`express-validator`) que vieron en la Sesión 1 se reutiliza aquí.

### Conectar las rutas al servidor (`server.js`)

Agregar antes del `module.exports = app;` de la Sesión 1:

```javascript
const tareasRouter = require('./routes/tareas');
app.use('/api/tareas', tareasRouter);
```

### Documentar el API rápidamente

- **Postman**: crear una colección con las 4 peticiones y exportarla como parte del entregable.
  - GET - listar todas las tareas
  - GET - listar tareas por id
  - POST - crear una tarea
  - PUT - actualizar una tarea
- **Swagger/OpenAPI** (opcional) instalar `swagger-ui-express` y `swagger-jsdoc` para generar documentación interactiva en `/api-docs`.

## Reto de la sesión (actividad guiada del alumno)

El único verbo que falta es `DELETE`. Pide al alumno:

1. Agregar la ruta `DELETE /api/tareas/:id` en `routes/tareas.js`, usando `tareasModel.eliminar`.
2. Debe responder `204` (sin contenido) si se eliminó correctamente, o `404` si el id no existe.
3. Probarla en Postman y capturar evidencia (screenshot) de una eliminación exitosa y de un intento con id inexistente.

## Entregable y lista de cotejo


| Criterio                                                              | Cumple |
| --------------------------------------------------------------------- | ------ |
| Existen los 4 verbos: GET (lista y por id), POST, PUT, DELETE         | ☐     |
| Cada respuesta usa el código de estado HTTP correcto                 | ☐     |
| Las entradas de usuario (POST/PUT) están validadas                   | ☐     |
| El API corre sobre el servidor seguro de la Sesión 1 (HTTPS, Helmet) | ☐     |
| Existe una colección de Postman o documentación Swagger del API     | ☐     |
| El alumno puede explicar la diferencia entre 200, 201, 400 y 404      | ☐     |
