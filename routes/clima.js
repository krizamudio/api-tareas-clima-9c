const express = require('express');
const router = express.Router();
const { param, validationResult } = require('express-validator');

router.get('/:ciudad', [
    // Validamos que el parámetro en la URL no esté vacío
    param('ciudad')
        .trim()
        .notEmpty().withMessage('El nombre de la ciudad es obligatorio')
        // Puedes agregar matches para evitar números o símbolos raros
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('La ciudad solo debe contener letras'),
], async (req, res) => {

    // Verificamos si hubo errores en la validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errores: errors.array() });
    }

    // Si pasa la validación, extraemos la ciudad
    const { ciudad } = req.params;

    try {
        // Asegúrate de tener tu API key configurada en tu archivo .env
        const apiKey = process.env.WEATHERAPI_KEY;

        // Hacemos la petición a la API externa (ejemplo con OpenWeatherMap)
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${ciudad}&appid=${apiKey}&units=metric`);

        if (!response.ok) {
            // Si la API externa responde con error (ej. ciudad no encontrada o sin saldo)
            // Lanzamos un error para que caiga en el catch
            throw new Error('Error al obtener datos del servicio de clima');
        }

        const data = await response.json();

        // Si todo sale bien, devolvemos la info del clima
        res.json({
            ciudad: data.name,
            temperatura: data.main.temp,
            descripcion: data.weather[0].description
        });

    } catch (error) {
        // AQUÍ CUMPLIMOS EL PUNTO 3 DEL RETO:
        // Respondemos 502 si el servicio externo falla
        console.error('Error en servicio externo de clima:', error.message);
        res.status(502).json({
            error: 'Bad Gateway',
            mensaje: 'El servicio de clima no está disponible en este momento. Por favor, intenta más tarde.'
        });
    }

});



module.exports = router;
