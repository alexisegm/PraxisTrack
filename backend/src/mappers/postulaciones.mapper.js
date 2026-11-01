class PostulacionesMapper {
    static toApiContract(postulacionDb) {
        return {
            id_postulacion: postulacionDb.id,
            estado_actual: postulacionDb.estado,
            fecha_registro: postulacionDb.creado_en
        };
    }

    static toListApiContract(postulacionesDb) {
        return postulacionesDb.map(postulacion => ({
            id_postulacion: postulacion.id,
            id_estudiante: postulacion.id_estudiante,
            id_oferta: postulacion.ofertas_pasantias.id,
            titulo_oferta: postulacion.ofertas_pasantias.titulo,
            estado_actual: postulacion.estado,
            fecha_registro: postulacion.creado_en
        }));
    }
}

module.exports = PostulacionesMapper;