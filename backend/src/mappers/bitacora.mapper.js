class BitacoraMapper {
    static toApiContract(registroDb, totalAcumulado) {
        return {
            id_registro: registroDb.id,
            estado_actual: registroDb.estado,
            horas_diarias: Number(registroDb.horas_invertidas),
            total_horas_acumuladas: totalAcumulado
        };
    }

    static toListApiContract(registrosDb) {
        return registrosDb.map(registro => ({
            id_registro: registro.id,
            fecha: registro.fecha,
            horas: Number(registro.horas_invertidas),
            descripcion: registro.descripcion,
            estado: registro.estado,
            oferta: registro.postulaciones.ofertas_pasantias.titulo,
            fecha_registro: registro.creado_en
        }));
    }
}

module.exports = BitacoraMapper;