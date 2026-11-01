const supabase = require('../config/supabase');

class BitacoraStore {
    async obtenerDetallesPostulacion(id_postulacion) {
        const { data, error } = await supabase
            .from('postulaciones')
            .select('estado, id_estudiante')
            .eq('id', id_postulacion)
            .maybeSingle();
        
        if (error) throw new Error(error.message);
        return data;
    }

    async verificarRegistroExistente(id_postulacion, fecha) {
        const { data, error } = await supabase
            .from('bitacora_horas')
            .select('id')
            .eq('id_postulacion', id_postulacion)
            .eq('fecha', fecha)
            .maybeSingle();
        
        if (error) throw new Error(error.message);
        return !!data;
    }

    async crearRegistro(registroData) {
        const { data, error } = await supabase
            .from('bitacora_horas')
            .insert([{
                id_postulacion: registroData.id_postulacion,
                fecha: registroData.fecha,
                horas_invertidas: registroData.horas_invertidas,
                descripcion: registroData.descripcion
                // El estado 'Registro_Creado' se asigna automáticamente por defecto en la BD
            }])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    async calcularHorasAcumuladas(id_postulacion) {
        const { data, error } = await supabase
            .from('bitacora_horas')
            .select('horas_invertidas')
            .eq('id_postulacion', id_postulacion)
            // Solo sumamos horas que no hayan sido rechazadas
            .neq('estado', 'Horas_Rechazadas'); 

        if (error) throw new Error(error.message);
        
        const total = data.reduce((acc, curr) => acc + Number(curr.horas_invertidas), 0);
        return total;
    }

    async obtenerDetallesRegistro(id_registro) {
        // Hacemos JOIN profundo para obtener quién es el estudiante y quién es la empresa dueña
        const { data, error } = await supabase
            .from('bitacora_horas')
            .select(`
                id,
                estado,
                postulaciones!inner (
                    id,
                    id_estudiante,
                    ofertas_pasantias!inner ( id_empresa )
                )
            `)
            .eq('id', id_registro)
            .maybeSingle();
        
        if (error) throw new Error(error.message);
        return data;
    }

    async actualizarEstado(id_registro, nuevo_estado) {
        const { data, error } = await supabase
            .from('bitacora_horas')
            .update({ estado: nuevo_estado })
            .eq('id', id_registro)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    async listarHistorial(idUsuario, rol) {
        let query = supabase
            .from('bitacora_horas')
            .select(`
                id,
                fecha,
                horas_invertidas,
                descripcion,
                estado,
                creado_en,
                postulaciones!inner (
                    id_estudiante,
                    ofertas_pasantias!inner ( id_empresa, titulo )
                )
            `)
            .order('fecha', { ascending: false });

        if (rol === 'Estudiante') {
            query = query.eq('postulaciones.id_estudiante', idUsuario);
        } else if (rol === 'Empresa') {
            query = query.eq('postulaciones.ofertas_pasantias.id_empresa', idUsuario);
        } else if (rol !== 'Institucion') {
            throw new Error('Rol no autorizado para visualizar bitácoras.');
        }

        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return data;
    }
}

module.exports = new BitacoraStore();