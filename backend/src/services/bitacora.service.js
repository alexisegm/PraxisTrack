const bitacoraStore = require('../stores/bitacora.store');
const BitacoraMapper = require('../mappers/bitacora.mapper');
const AppError = require('../utils/AppError');

class BitacoraService {
    static TRANSICIONES_VALIDAS = {
        'Registro_Creado': ['Pendiente_De_Aprobación'],
        'Pendiente_De_Aprobación': ['Horas_Aprobadas', 'Horas_Rechazadas'],
        'Horas_Aprobadas': [],
        'Horas_Rechazadas': []
    };

    async registrarHoras(datos, idAutenticado) {
        // Validar existencia, pertenencia y estado de la postulación.
        const detallesPostulacion = await bitacoraStore.obtenerDetallesPostulacion(datos.id_postulacion);
        
        if (!detallesPostulacion) {
            throw new AppError('Postulación no encontrada.', 404);
        }

        if (detallesPostulacion.id_estudiante !== idAutenticado) {
            throw new AppError('Operación denegada. Esta postulación no te pertenece.', 403);
        }

        const estadoPostulacion = detallesPostulacion.estado;
        
        if (estadoPostulacion !== 'Seleccionado') {
            throw new AppError('Operación denegada. La postulación no está en estado "Seleccionado".', 403);
        }

        // Evitar registros duplicados para la misma fecha.
        const existeRegistro = await bitacoraStore.verificarRegistroExistente(datos.id_postulacion, datos.fecha);
        if (existeRegistro) {
            throw new AppError('Ya existe un registro para esta fecha.', 400);
        }

        // Ejecutar creación
        const nuevoRegistro = await bitacoraStore.crearRegistro(datos);

        // Calcular total
        const horasAcumuladas = await bitacoraStore.calcularHorasAcumuladas(datos.id_postulacion);

        // Retornar datos mapeados
        return BitacoraMapper.toApiContract(nuevoRegistro, horasAcumuladas);
    }

    async avanzarEstado(idRegistro, nuevoEstado, usuarioAutenticado) {
        const registro = await bitacoraStore.obtenerDetallesRegistro(idRegistro);

        if (!registro) {
            throw new AppError('Registro de bitácora no encontrado.', 404);
        }

        const idEstudiante = registro.postulaciones.id_estudiante;
        const idEmpresa = registro.postulaciones.ofertas_pasantias.id_empresa;

        if (nuevoEstado === 'Pendiente_De_Aprobación') {
            if (usuarioAutenticado.rol !== 'Estudiante' || usuarioAutenticado.id !== idEstudiante) {
                throw new AppError('Operación denegada. Solo el estudiante titular puede enviar horas a revisión.', 403);
            }
        } else if (nuevoEstado === 'Horas_Aprobadas' || nuevoEstado === 'Horas_Rechazadas') {
            if (usuarioAutenticado.rol !== 'Institucion' &&
                (usuarioAutenticado.rol !== 'Empresa' || usuarioAutenticado.id !== idEmpresa)) {
                throw new AppError('Operación denegada. Solo la empresa tutora puede aprobar o rechazar horas.', 403);
            }
        }

        const estadoActual = registro.estado;
        const transicionesPermitidas = BitacoraService.TRANSICIONES_VALIDAS[estadoActual];
        if (!transicionesPermitidas || !transicionesPermitidas.includes(nuevoEstado)) {
            throw new AppError(
                `Transición ilegal en máquina de estado de bitácora. No se puede pasar de [${estadoActual}] a [${nuevoEstado}].`,
                400
            );
        }

        const registroActualizado = await bitacoraStore.actualizarEstado(idRegistro, nuevoEstado);
        const horasAcumuladas = await bitacoraStore.calcularHorasAcumuladas(registro.postulaciones.id);

        return BitacoraMapper.toApiContract(registroActualizado, horasAcumuladas);
    }

    async obtenerHistorial(usuarioAutenticado) {
        const { id, rol } = usuarioAutenticado;
        if (!['Estudiante', 'Empresa', 'Institucion'].includes(rol)) {
            throw new AppError('Rol no autorizado para visualizar bitácoras.', 403);
        }

        const registros = await bitacoraStore.listarHistorial(id, rol);
        return BitacoraMapper.toListApiContract(registros);
    }
}

module.exports = new BitacoraService();