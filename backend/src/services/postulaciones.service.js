const postulacionesStore = require('../stores/postulaciones.store');
const PostulacionesMapper = require('../mappers/postulaciones.mapper');
const AppError = require('../utils/AppError');

class PostulacionesService {
    // Definimos las transiciones legales de la Máquina de Estado
    // Llave: Estado Actual | Valor: Array de Estados a los que puede avanzar
    static TRANSICIONES_VALIDAS = {
        'Enviada': ['En_Revisión_Por_Empresa', 'Rechazado'],
        'En_Revisión_Por_Empresa': ['Entrevista_Asignada', 'Rechazado'],
        'Entrevista_Asignada': ['Seleccionado', 'Rechazado'],
        'Seleccionado': [], // Estado Final: No hay transiciones salientes
        'Rechazado': []     // Estado Final
    };

    async postular(datos, idEstudiante) {
        // Regla 1: Un estudiante no puede postularse dos veces a la misma oferta
        const existe = await postulacionesStore.verificarPostulacionPrevia(idEstudiante, datos.id_oferta);
        if (existe) {
            throw new AppError('Ya te has postulado previamente a esta oferta.', 400);
        }

        const nuevaPostulacion = await postulacionesStore.crearPostulacion(idEstudiante, datos.id_oferta);
        return PostulacionesMapper.toApiContract(nuevaPostulacion);
    }

    async avanzarEstado(idPostulacion, nuevoEstado, idEmpresa) {
        const postulacion = await postulacionesStore.obtenerDetallesPostulacion(idPostulacion);
        
        if (!postulacion) {
            throw new AppError('Postulación no encontrada.', 404);
        }

        // Seguridad: Verificar que la oferta pertenece a la empresa que intenta mutar el estado
        if (idEmpresa.rol !== 'Institucion' && postulacion.ofertas_pasantias.id_empresa !== idEmpresa.id) {
            throw new AppError('Operación denegada. No eres el propietario de esta oferta.', 403);
        }

        const estadoActual = postulacion.estado;

        // Validar Máquina de Estado
        const transicionesPermitidas = PostulacionesService.TRANSICIONES_VALIDAS[estadoActual];
        
        if (!transicionesPermitidas || !transicionesPermitidas.includes(nuevoEstado)) {
            throw new AppError(
                `Transición ilegal en máquina de estado. No se puede pasar de [${estadoActual}] a [${nuevoEstado}].`,
                400
            );
        }

        // Si la validación pasa, ejecutamos la mutación
        const postulacionActualizada = await postulacionesStore.actualizarEstado(idPostulacion, nuevoEstado);
        
        return PostulacionesMapper.toApiContract(postulacionActualizada);
    }

            async listar(usuarioAutenticado) {
                const { id, rol } = usuarioAutenticado;
                if (!['Estudiante', 'Empresa', 'Institucion'].includes(rol)) {
                    throw new AppError('Rol no autorizado para visualizar postulaciones.', 403);
                }

                const postulaciones = await postulacionesStore.listarPorUsuario(id, rol);
                return PostulacionesMapper.toListApiContract(postulaciones);
            }
}

module.exports = new PostulacionesService();