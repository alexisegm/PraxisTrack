const express = require('express');
const router = express.Router();
const validateSchema = require('../middlewares/validator');
const { verificarToken, requerirRol } = require('../middlewares/auth.middleware');
const { crearOfertaSchema } = require('../middlewares/schemas/ofertas.schema');
const ofertasService = require('../services/ofertas.service');
const catchAsync = require('../utils/catchAsync');

// POST /api/ofertas - Solo Empresas pueden publicar
router.post(
    '/',
    verificarToken,
    requerirRol(['Empresa', 'Institucion']),
    validateSchema(crearOfertaSchema),
    catchAsync(async (req, res) => {
        const resultado = await ofertasService.publicarOferta(req.body, req.user.id);
        return res.status(201).json({
            mensaje: "Oferta de pasantía publicada exitosamente.",
            data: resultado
        });
    })
);

router.patch(
    '/:id',
    verificarToken,
    requerirRol(['Empresa', 'Institucion']),
    validateSchema(crearOfertaSchema),
    catchAsync(async (req, res) => {
        const oferta = await ofertasService.actualizarOferta(req.params.id, req.body, req.user);
        return res.status(200).json({ mensaje: 'Oferta actualizada correctamente.', data: oferta });
    })
);

router.delete(
    '/:id',
    verificarToken,
    requerirRol(['Empresa', 'Institucion']),
    catchAsync(async (req, res) => {
        const oferta = await ofertasService.desactivarOferta(req.params.id, req.user);
        return res.status(200).json({ mensaje: 'Oferta desactivada correctamente.', data: oferta });
    })
);

// El catálogo activo se puede consultar sin iniciar sesión.
router.get(
    '/',
    catchAsync(async (req, res) => {
        const listado = await ofertasService.listarActivas();
        return res.status(200).json({ data: listado });
    })
);

module.exports = router;