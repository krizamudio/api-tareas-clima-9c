# Guía de Instalación — API de Tareas con Clima

**Unidad III: Integración de componentes de software para aplicaciones Web**

Esta guía te permite construir el proyecto completo **desde cero**, paso a paso, integrando lo visto en las 4 sesiones: codificación segura, web services propios, integración de API de terceros y autenticación remota con JWT.

Sigue los pasos en orden. No te saltes ninguno, ya que cada archivo depende de los anteriores.

---

## 0. Requisitos previos

Antes de empezar, verifica que tengas instalado:


| Herramienta                       | Cómo verificar                                           | Dónde obtenerla                                            |
| --------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------- |
| Node.js (v18 o superior)          | `node -v`en la terminal                                   | [nodejs.org](https://nodejs.org/)                           |
| npm (viene con Node.js)           | `npm -v`en la terminal                                    | —                                                          |
| Git                               | `git -v`en la terminal                                    | [git-scm.com](https://git-scm.com/)                         |
| OpenSSL                           | `openssl version`(en Windows viene incluido con Git Bash) | Incluido en Git para Windows                                |
| Postman                           | Abrir la aplicación                                      | [postman.com/downloads](https://www.postman.com/downloads/) |
| Cuenta gratuita de OpenWeatherMap | —                                                        | [openweathermap.org/api](https://openweathermap.org/api)    |

**⚠️ Importante sobre OpenWeatherMap:** genera tu API key **con un día de anticipación**. A veces tarda entre 10 minutos y 2 horas en activarse, y si la generas justo antes de la clase, la demo puede fallar por esa razón (no por un error de código).

---

## 1. Crear el proyecto e instalar dependencias

Abre una terminal en la carpeta donde quieras crear el proyecto y ejecuta:

```bash
mkdir tareas-clima-api
cd tareas-clima-api
npm init -y
```

Instala todas las dependencias de producción de una sola vez:

```bash
npm install express helmet dotenv express-validator morgan axios bcryptjs jsonwebtoken
```

Instala la dependencia de desarrollo:

```bash
npm install --save-dev nodemon
```

Abre `package.json` y agrega el script `dev` dentro de `"scripts"`:

```json
"scripts": {
  "dev": "nodemon index.js"
}
```

---

## 2. Crear la estructura de carpetas

Dentro de `tareas-clima-api`, crea las siguientes carpetas (vacías por ahora):

```bash
mkdir middleware models routes services
```

Al terminar toda la guía, tu proyecto debe verse así:

```
tareas-clima-api/
├── middleware/
│   └── auth.js
├── models/
│   ├── tareas.js
│   └── usuarios.js
├── routes/
│   ├── auth.js
│   ├── clima.js
│   └── tareas.js
├── services/
│   └── clima.js
├── .env
├── .gitignore
├── index.js
├── server.js
├── package.json
├── server.key
└── server.cert
```

---

## 3. Crear el archivo de variables de entorno (`.env`)

En la raíz del proyecto, crea el archivo `.env` con este contenido (reemplaza los valores marcados):

```
PORT=3000
NODE_ENV=development
JWT_SECRET=una_frase_larga_y_dificil_de_adivinar
WEATHERAPI_KEY=tu_api_key_de_openweathermap_aqui
```

**Nunca subas este archivo a un repositorio.** Lo excluiremos en el siguiente paso.

---

## 4. Crear el archivo `.gitignore`

En la raíz del proyecto, crea `.gitignore` con:

```
node_modules/
.env
*.pem
server.key
server.cert
```

---

## 5. Generar el certificado SSL autofirmado

En la terminal, dentro de la raíz del proyecto:

```bash
openssl req -nodes -new -x509 -keyout server.key -out server.cert -days 365
```

Presiona Enter en todas las preguntas (o llena datos ficticios) — esto genera `server.key` y `server.cert` en la raíz del proyecto.

---

## 6. Crear los archivos de modelos (`models/`)

### `models/tareas.js`

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

### `models/usuarios.js`

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

---

## 7. Crear el servicio externo (`services/`)

### `services/clima.js`

```javascript
const axios = require('axios');

async function obtenerClima(ciudad) {
  const apiKey = process.env.WEATHERAPI_KEY;
  const url = 'https://api.openweathermap.org/data/2.5/weather';

  try {
    const respuesta = await axios.get(url, {
      params: { q: ciudad, appid: apiKey, units: 'metric', lang: 'es' },
      timeout: 5000
    });

    return {
      ciudad: respuesta.data.name,
      temperatura: respuesta.data.main.temp,
      descripcion: respuesta.data.weather[0].description
    };
  } catch (error) {
    if (error.response) {
      throw new Error(`El servicio de clima respondió con error ${error.response.status}`);
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('El servicio de clima tardó demasiado en responder');
    } else {
      throw new Error('No se pudo conectar con el servicio de clima');
    }
  }
}

module.exports = { obtenerClima };
```

---

## 8. Crear el middleware de autenticación (`middleware/`)

### `middleware/auth.js`

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

---

## 9. Crear las rutas (`routes/`)

### `routes/auth.js`

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

router.get('/perfil', require('../middleware/auth'), (req, res) => {
  res.status(200).json({ usuario: req.usuario });
});

module.exports = router;
```

### `routes/tareas.js`

```javascript
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
router.delete('/:id', param('id').isInt(), validar, (req, res) => {
  const eliminada = tareasModel.eliminar(Number(req.params.id));
  if (!eliminada) return res.status(404).json({ error: 'Tarea no encontrada' });
  res.status(204).send();
});

// GET /api/tareas/:id/clima?ciudad=Toluca — combina tarea propia + clima externo
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
```

### `routes/clima.js`

```javascript
const express = require('express');
const router = express.Router();
const { param, validationResult } = require('express-validator');
const { obtenerClima } = require('../services/clima');

function validar(req, res, next) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) return res.status(400).json({ errores: errores.array() });
  next();
}

// GET /api/clima/:ciudad — clima de una ciudad, independiente de las tareas
router.get(
  '/:ciudad',
  param('ciudad').isString().trim().isLength({ min: 1, max: 60 }).escape(),
  validar,
  async (req, res) => {
    try {
      const clima = await obtenerClima(req.params.ciudad);
      res.status(200).json(clima);
    } catch (error) {
      res.status(502).json({ error: error.message });
    }
  }
);

module.exports = router;
```

---

## 10. Crear el servidor principal

### `server.js`

```javascript
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const { body, validationResult } = require('express-validator');

const tareasRouter = require('./routes/tareas');
const authRouter = require('./routes/auth');
const climaRouter = require('./routes/clima');
const verificarToken = require('./middleware/auth');

const app = express();

app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));

// Rutas públicas
app.use('/api/auth', authRouter);

// Rutas protegidas
app.use('/api/tareas', verificarToken, tareasRouter);
app.use('/api/clima', verificarToken, climaRouter);

// Ruta de prueba de validación
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

// Ruta de salud (pública, útil para verificar que el servidor está vivo)
app.get('/api/salud', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = app;
```

### `index.js`

```javascript
const https = require('https');
const fs = require('fs');
const app = require('./server');

const opciones = {
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.cert')
};

const PORT = process.env.PORT || 3000;

https.createServer(opciones, app).listen(PORT, () => {
  console.log(`Servidor seguro corriendo en https://localhost:${PORT}`);
});
```

---

## 11. Ejecutar el servidor

```bash
npm run dev
```

Deberías ver en la terminal:

```
[nodemon] starting `node index.js`
Servidor seguro corriendo en https://localhost:3000
```

Prueba en el navegador o en Postman: `https://localhost:3000/api/salud` → debe responder `{ "status": "ok" }` (con la advertencia de certificado no confiable, que es normal por ser autofirmado).

---

## 12. Configurar Postman

### 12.1 Desactivar verificación de certificado SSL (una sola vez)

**Settings** (engrane, arriba a la derecha) → pestaña **General** → **"SSL certificate verification"** → **OFF**.

### 12.2 Crear el environment

1. **Environments** → **+**.
2. Nómbralo `Local`.
3. Agrega la variable `base_url` con valor `https://localhost:3000/api`.
4. Guarda y selecciónalo en el selector superior derecho.

### 12.3 Crear la colección y las peticiones

Crea una colección `Tareas API - Unidad III` con estas peticiones:


| Nombre               | Método | URL                                         |
| -------------------- | ------- | ------------------------------------------- |
| Crear usuario        | POST    | `{{base_url}}/auth/registro`                |
| Login                | POST    | `{{base_url}}/auth/login`                   |
| Ver perfil           | GET     | `{{base_url}}/auth/perfil`                  |
| Listar tareas        | GET     | `{{base_url}}/tareas`                       |
| Obtener tarea por id | GET     | `{{base_url}}/tareas/1`                     |
| Crear tarea          | POST    | `{{base_url}}/tareas`                       |
| Actualizar tarea     | PUT     | `{{base_url}}/tareas/1`                     |
| Eliminar tarea       | DELETE  | `{{base_url}}/tareas/1`                     |
| Tarea con clima      | GET     | `{{base_url}}/tareas/1/clima?ciudad=Toluca` |
| Clima independiente  | GET     | `{{base_url}}/clima/Toluca`                 |

### 12.4 Automatizar el guardado del token

En la petición **Login**, ve a la pestaña **Scripts → Post-response** (en versiones nuevas de Postman ya no se llama "Tests") y pega:

```javascript
pm.test("El login responde 200", () => {
  pm.response.to.have.status(200);
});

pm.test("La respuesta incluye un token", () => {
  const data = pm.response.json();
  pm.expect(data).to.have.property("token");
});

pm.environment.set("token", pm.response.json().token);
```

### 12.5 Usar el token en las rutas protegidas

En cada petición protegida (**Listar tareas**, **Crear tarea**, etc.), ve a la pestaña **Authorization** → tipo **Bearer Token** → valor `{{token}}`.

---

## 13. Flujo de prueba completo (en este orden)

1. **Crear usuario** con body: `{ "correo": "alumno@demo.com", "password": "123456" }` → debe responder `201`.
2. **Login** con el mismo correo y contraseña → debe responder `200` y guardar el token automáticamente.
3. **Ver perfil** (con el token ya configurado en Authorization) → debe responder `200` con tus datos.
4. **Listar tareas** → `200` con las tareas de ejemplo.
5. **Crear tarea** con body `{ "titulo": "Estudiar para el examen" }` → `201`.
6. **Actualizar tarea** con body `{ "completada": true }` → `200`.
7. **Tarea con clima** → `200` con la tarea y el clima de Toluca.
8. **Clima independiente** → `200` con el clima de Toluca, sin relación a ninguna tarea.
9. **Eliminar tarea** → `204`.
10. Repite el paso 4 (**Listar tareas**) sin el token en Authorization → debe responder `401 Token no proporcionado`, confirmando que la protección funciona.

---

## 14. Solución de problemas comunes


| Error                                                      | Causa más probable                                                                                                                        | Solución                                                                                                                |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `Cannot find module './middleware/auth'`(o similar)        | El archivo no existe físicamente en el disco, o el nombre de la carpeta no coincide exactamente                                           | Verifica que la carpeta y el archivo existan con el nombre exacto (sensible a mayúsculas en algunos sistemas)           |
| `Token no proporcionado`al crear usuario o hacer login     | La URL apunta por error a una ruta protegida, por ejemplo usando`{{base_url}}`mal configurado apuntando a`/tareas`en vez de la raíz`/api` | Usa`base_url = https://localhost:3000/api`y arma cada ruta completa:`{{base_url}}/auth/registro`                         |
| El navegador o Postman muestra "certificado no confiable"  | Es esperado: el certificado es autofirmado, no viene de una CA reconocida                                                                  | En el navegador, avanzar/aceptar el riesgo; en Postman, desactivar "SSL certificate verification" en Settings            |
| No aparece la pestaña "Tests" en Postman                  | Postman v11 fusionó "Tests" dentro de "Scripts → Post-response"                                                                          | Usa**Scripts → Post-response**para todo el código que antes iba en "Tests"                                             |
| El clima responde`502`                                     | La API key de OpenWeatherMap aún no se activa, es incorrecta, o la ciudad no existe                                                       | Espera a que la key se active (hasta 2 horas), verifica que esté bien copiada en`.env`, o prueba con una ciudad válida |
| `EADDRINUSE: address already in use`al iniciar el servidor | Ya hay otro proceso usando el puerto 3000                                                                                                  | Cierra el otro proceso o cambia`PORT`en`.env`                                                                            |

---
