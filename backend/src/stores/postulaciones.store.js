const supabase = require('../config/supabase');

class PostulacionesStore {
    async verificarPostulacionPrevia(id_estudiante, id_oferta) {
        const { data, error } = await supabase
            .from('postulaciones')
            .select('id')
            .eq('id_estudiante', id_estudiante)
            .eq('id_oferta', id_oferta)
            .maybeSingle();
        
        if (error) throw new Error(error.message);
        return !!data; // Retorna true si ya existe
    }

    async crearPostulacion(id_estudiante, id_oferta) {
        const { data, error } = await supabase
            .from('postulaciones')
            .insert([{
                id_estudiante,
                id_oferta
                // El estado 'Enviada' se asigna por defecto en BD
            }])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    async obtenerDetallesPostulacion(id_postulacion) {
        // Hacemos un JOIN con ofertas para obtener el id_empresa y validar propiedad
        const { data, error } = await supabase
            .from('postulaciones')
            .select(`
                id,
                estado,
                ofertas_pasantias!inner ( id_empresa )
            `)
            .eq('id', id_postulacion)
            .maybeSingle();

        if (error) throw new Error(error.message);
        return data;
    }

    async actualizarEstado(id_postulacion, nuevo_estado) {
        const { data, error } = await supabase
            .from('postulaciones')
            .update({ estado: nuevo_estado })
            .eq('id', id_postulacion)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    async listarPorUsuario(idUsuario, rol) {
        let query = supabase
            .from('postulaciones')
            .select(`
                id,
                id_estudiante,
                estado,
                creado_en,
                ofertas_pasantias!inner (
                    id,
                    id_empresa,
                    titulo
                )
            `)
            .order('creado_en', { ascending: false });

        if (rol === 'Estudiante') {
            query = query.eq('id_estudiante', idUsuario);
        } else if (rol === 'Empresa') {
            query = query.eq('ofertas_pasantias.id_empresa', idUsuario);
        } else if (rol !== 'Institucion') {
            throw new Error('Rol no autorizado para visualizar postulaciones.');
        }

        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return data;
    }
}

module.exports = new PostulacionesStore();