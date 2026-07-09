# Sesión 3 — Integración de APIs de Terceros

**Unidad III: Integración de componentes de software para aplicaciones Web\*\*\*\*Proyecto integrador:** API de gestión de tareas con clima (Node.js + Express)

## Datos generales

| Campo | Detalle |
| --- | --- |
| Duración | 2 horas (120 min) |
| Tema curricular | Implementación de WEB services en el desarrollo WEB |
| Saber hacer que cubre | Realizar la integración de API's de terceros al desarrollo WEB |
| Instrumento de evaluación | Lista de cotejo + prueba funcional con Postman |
| Requisitos previos | Proyecto de la Sesión 2 funcionando |

## ⚠️ Preparación previa

Crear una cuenta gratuita en [**openweathermap.org**](https://openweathermap.org/api) y generar su API key desde la sección "API keys" de su cuenta.

## Objetivo de la sesión

Al finalizar, el alumno tendrá un endpoint que combina información de su web service propio (una tarea) con datos de un web service externo (el clima), incluyendo manejo de errores cuando el servicio externo falla.

### Instalar axios y guardar la API key de forma segura

```bash
npm install axios
```

Agregar al `.env` (recordar: este archivo ya está en `.gitignore` desde la Sesión 1):

```
WEATHERAPI_KEY=tu_api_key_aqui
```

### Servicio para consumir el clima (`services/clima.js`)

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
      // El servicio externo respondió, pero con un error (404 ciudad no existe, 401 key inválida, etc.)
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

- El `timeout: 5000` evita que nuestro servidor se quede colgado esperando indefinidamente a un tercero.
- Distinguir dos tipos de falla: el servicio externo respondió con error (`error.response`) vs. nunca respondió (problema de red o timeout). Son escenarios distintos y conviene comunicarlos distinto.
- Nunca dejamos "escapar" el error crudo de axios al cliente final; lo traducimos a un mensaje claro.

### Endpoint que combina tarea propia + clima externo (`routes/tareas.js`)

Agregar arriba del archivo:

```javascript
const { obtenerClima } = require('../services/clima');
```

Agregar la nueva ruta (después de las existentes):

```javascript
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
```

Puntos a resaltar:

- `404` significa "el recurso propio (la tarea) no existe" — es responsabilidad de nuestro servidor.
- `502 Bad Gateway` significa "nuestro servidor funcionó bien, pero el servicio externo del que dependemos falló" — es una distinción importante que muchos desarrolladores nuevos no hacen.

### Probar el camino feliz y el camino de error en vivo

En Postman, probar:

1. `GET {{baseUrl}}/1/clima?ciudad=Toluca` → debe responder 200 con la tarea y el clima.
2. `GET {{baseUrl}}/1/clima?ciudad=CiudadQueNoExiste` → debe responder 502 con un mensaje claro (mostrar cómo se ve el error real de OpenWeatherMap vs. el mensaje que nosotros devolvemos).
3. Cambiar temporalmente la `WEATHERAPI_KEY` en `.env` por un valor inválido y reiniciar el servidor → mostrar el error 502 por autenticación fallida. **Regresar la key correcta antes de continuar.**

## Reto de la sesión (actividad guiada del alumno)

Crear un endpoint **independiente** de las tareas, para practicar que el consumo de un servicio externo puede ser un módulo reutilizable:

1. Crear `GET /api/clima/:ciudad` (fuera de `routes/tareas.js`, en un nuevo archivo `routes/clima.js`) que solo devuelva el clima de la ciudad indicada en la URL, sin relacionarlo con ninguna tarea.
2. Debe responder `400` si el parámetro `ciudad` está vacío o tiene caracteres inválidos (usar `express-validator`).
3. Debe responder `502` con un mensaje claro si el servicio externo falla.
4. Agregar esta nueva petición a la colección de Postman de la Sesión 2 y volver a exportarla.

## Entregable y lista de cotejo

| Criterio | Cumple |  |
| --- | --- | --- |
| La API key del servicio de clima está en`.env`, nunca en el código |  | ☐ |
| Existe el endpoint que combina tarea propia + clima externo | ☐ |  |
| Existe el endpoint independiente`/api/clima/:ciudad`del reto | ☐ |  |
| Ambos endpoints manejan errores del servicio externo con código 502 | ☐ |  |
| Se usó`timeout`en las peticiones con axios | ☐ |  |
| El alumno puede explicar la diferencia entre un error 404 y un error 502 | ☐ |  |
| La colección de Postman está actualizada y exportada de nuevo | ☐ |  |
