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