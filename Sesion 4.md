# Sesión 4 — Autenticación Remota y Cierre del Proyecto

**Unidad III: Integración de componentes de software para aplicaciones Web** **Proyecto integrador:** API de gestión de tareas con clima (Node.js + Express)

Esta es la última sesión: protege con autenticación todo lo construido en las Sesiones 1 a 3 y cierra el proyecto completo.

---

## 1. Datos generales

| Campo | Detalle |
| --- | --- |
| Duración | 2 horas (120 min) |
| Tema curricular | Implementación de WEB services en el desarrollo WEB |
| Saber hacer que cubre | Realizar la implementación de mecanismos de autentificación remota a WEB services |
| Instrumento de evaluación | Lista de cotejo final (cierre de la Unidad III completa) |
| Requisitos previos | Proyecto de la Sesión 3 funcionando |

## Objetivo de la sesión

Al finalizar, el alumno tendrá autenticación basada en JWT protegiendo sus rutas de tareas y clima, de modo que solo usuarios registrados con sesión iniciada puedan usarlas.

### Instalar dependencias y agregar el secreto de JWT

```bash
npm install bcryptjs jsonwebtoken
```

Agregar al `.env`:

```
JWT_SECRET=una_frase_larga_dificil_de_adivinar
```

`JWT_SECRET` garantiza que solo nuestro servidor pueda firmar y verificar tokens válidos — si se filtra, cualquiera podría fabricar tokens falsos.

### Modelo de usuarios en memoria (`models/usuarios.js`)

```javascript
let usuarios = [];
let siguienteId = 1;

module.exports = {
  buscarPorCorreo: (correo) => usuarios.find(u => u.correo === correo),
  crear: (correo, hashPassword) => {
    const nuevo = { id: siguienteId++, correo, password: hashPassword };
    usuarios.push(nuevo);
    return nuevo;
  }
};
```

### Rutas de registro y login (`routes/auth.js`)

```javascript
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const usuariosModel = require('../models/usuarios');

function validar(req, res, next) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) return res.status(400).json({ errores: errores.array() });
  next();
}

router.post(
  '/registro',
  body('correo').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  validar,
  async (req, res) => {
    const { correo, password } = req.body;
    if (usuariosModel.buscarPorCorreo(correo)) {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }
    const hash = await bcrypt.hash(password, 10);
    const usuario = usuariosModel.crear(correo, hash);
    res.status(201).json({ id: usuario.id, correo: usuario.correo });
  }
);

router.post(
  '/login',
  body('correo').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validar,
  async (req, res) => {
    const { correo, password } = req.body;
    const usuario = usuariosModel.buscarPorCorreo(correo);
    if (!usuario) return res.status(401).json({ error: 'Credenciales inválidas' });

    const coincide = await bcrypt.compare(password, usuario.password);
    if (!coincide) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign(
      { id: usuario.id, correo: usuario.correo },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.status(200).json({ token });
  }
);

module.exports = router;
```

Puntos a resaltar en la demo:

- Nunca se guarda la contraseña original, solo su hash (`bcrypt.hash`). Ni siquiera el propio servidor puede "leer" la contraseña después.
- El token tiene una expiración (`expiresIn: '1h'`) — esto limita el daño si un token se filtra.
- El código `401` significa "no estás autenticado o tus credenciales son inválidas".

### Middleware que verifica el token (`middleware/auth.js`)

```javascript
const jwt = require('jsonwebtoken');

function verificarToken(req, res, next) {
  const encabezado = req.headers.authorization;
  if (!encabezado || !encabezado.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = encabezado.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

module.exports = verificarToken;
```

### Proteger las rutas existentes (`server.js`)

```javascript
const authRouter = require('./routes/auth');
const verificarToken = require('./middleware/auth');
const tareasRouter = require('./routes/tareas');
const climaRouter = require('./routes/clima');

app.use('/api/auth', authRouter);           // pública: registro y login
app.use('/api/tareas', verificarToken, tareasRouter);  // protegida
app.use('/api/clima', verificarToken, climaRouter);    // protegida
```

Punto clave: el middleware `verificarToken` se ejecuta **antes** de llegar a cualquier ruta de tareas o clima — si el token falla, la petición nunca llega al controlador.

### Probar el flujo completo en Postman

1. `POST {{baseUrl}}/auth/registro` con `{ "correo": "alumno@demo.com", "password": "123456" }` → 201.
2. `POST {{baseUrl}}/auth/login` con las mismas credenciales → 200 con el `token`.
3. Copiar el token. En la pestaña **Tests** de esta petición, agregar para automatizarlo: 

   ```javascript
   pm.environment.set("token", pm.response.json().token);
   
   ```
4. En las peticiones de tareas y clima, ir a la pestaña **Authorization** → tipo **Bearer Token** → valor `{{token}}`.
5. Probar `GET {{baseUrl}}/tareas` **sin** token primero (debe dar 401) y luego **con** token (debe dar 200) — mostrar ambos casos en pantalla.

## Reto de la sesión (actividad guiada del alumno)

1. Crear la ruta protegida `GET /api/auth/perfil` que devuelva `req.usuario` (los datos que vienen en el token) — esto confirma que el middleware está funcionando y les enseña que la información del token queda disponible en toda la petición.
2. Actualizar la colección de Postman con las peticiones de registro, login y perfil, usando el script de la sección 4.6 paso 3, y volver a exportarla.

## Cierre: lista de cotejo final de toda la Unidad III

Esta es la evaluación integradora, tal como la pide el programa de la asignatura:

| Criterio (según programa de la unidad) | Evidencia en el proyecto | Cumple |
| --- | --- | --- |
| Mecanismos de seguridad | Helmet, HTTPS con certificado, validación de entradas, contraseñas con hash, JWT | ☐ |
| WEB Services propios | CRUD de tareas (`/api/tareas`) con los 5 verbos y códigos de estado correctos | ☐ |
| WEB Services de terceros | Integración con OpenWeatherMap, con manejo de errores (502) | ☐ |
| Autenticación remota | Registro, login y rutas protegidas con JWT | ☐ |
| Enlace del repositorio en funcionamiento | Repositorio en GitHub con commits de las 4 sesiones, `.env` fuera del control de versiones | ☐ |
| Documentación del API | Colección de Postman exportada con las peticiones de las 4 sesiones | ☐ |

## Cómo entregarlo

El alumno sube el enlace de su repositorio (con el historial de commits visible) y adjunta la última exportación de la colección de Postman. El docente puede clonar el repositorio, correr `npm install` y `npm run dev`, e importar la colección para verificar todo el flujo en minutos.