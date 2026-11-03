const { z } = require('zod');

function esUrlHttpsDeDominio(valor, dominiosPermitidos) {
    try {
        const url = new URL(valor);
        return url.protocol === 'https:' && dominiosPermitidos.includes(url.hostname.toLowerCase());
    } catch {
        return false;
    }
}

const githubSchema = z.string()
    .trim()
    .url({ message: 'El enlace de GitHub debe ser una URL válida.' })
    .refine(valor => esUrlHttpsDeDominio(valor, ['github.com', 'www.github.com']), {
        message: 'El enlace debe pertenecer a github.com.'
    })
    .nullable()
    .optional();

const linkedinSchema = z.string()
    .trim()
    .url({ message: 'El enlace de LinkedIn debe ser una URL válida.' })
    .refine(valor => esUrlHttpsDeDominio(valor, ['linkedin.com', 'www.linkedin.com']), {
        message: 'El enlace debe pertenecer a linkedin.com.'
    })
    .nullable()
    .optional();

function campoCvOpcional(maximo, mensaje) {
    return z.string()
        .trim()
        .max(maximo, { message: mensaje })
        .nullable()
        .optional();
}

const actualizarPerfilSchema = z.object({
    nombre_completo: z.string()
        .trim()
        .min(3, { message: 'El nombre debe tener al menos 3 caracteres.' })
        .max(120, { message: 'El nombre no puede exceder 120 caracteres.' }),
    documento_identidad: z.string()
        .trim()
        .min(3, { message: 'El documento debe tener al menos 3 caracteres.' })
        .max(40, { message: 'El documento no puede exceder 40 caracteres.' }),
    github: githubSchema,
    linkedin: linkedinSchema,
    cv_resumen: campoCvOpcional(1000, 'El resumen no puede exceder 1000 caracteres.'),
    cv_institucion: campoCvOpcional(150, 'La institución no puede exceder 150 caracteres.'),
    cv_carrera: campoCvOpcional(150, 'La carrera no puede exceder 150 caracteres.'),
    cv_semestre: campoCvOpcional(40, 'El semestre no puede exceder 40 caracteres.'),
    cv_promedio: campoCvOpcional(20, 'El promedio no puede exceder 20 caracteres.'),
    cv_habilidades: campoCvOpcional(500, 'Las habilidades no pueden exceder 500 caracteres.'),
    cv_experiencia: campoCvOpcional(2000, 'La experiencia no puede exceder 2000 caracteres.')
}).strict();

const actualizarRolSchema = z.object({
    rol: z.enum(['Estudiante', 'Empresa', 'Institucion'])
}).strict();

const usuarioIdSchema = z.string().uuid({ message: 'El identificador debe ser un UUID válido.' });

module.exports = { actualizarPerfilSchema, actualizarRolSchema, usuarioIdSchema };
