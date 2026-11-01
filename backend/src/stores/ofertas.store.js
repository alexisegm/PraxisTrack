const supabase = require('../config/supabase');

class OfertasStore {
    async obtenerPorId(id) {
        const { data, error } = await supabase
            .from('ofertas_pasantias')
            .select('id, id_empresa, titulo, descripcion, activa, creado_en')
            .eq('id', id)
            .maybeSingle();

        if (error) throw new Error(error.message);
        return data;
    }

    async crearOferta(datos, id_empresa) {
        const { data, error } = await supabase
            .from('ofertas_pasantias')
            .insert([{
                id_empresa: id_empresa,
                titulo: datos.titulo,
                descripcion: datos.descripcion
                // 'activa' es true por defecto según el DDL
            }])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    async obtenerOfertasActivas() {
        const { data, error } = await supabase
            .from('ofertas_pasantias')
            .select(`
                id,
                titulo,
                descripcion,
                creado_en,
                perfiles ( nombre_completo )
            `)
            .eq('activa', true)
            .order('creado_en', { ascending: false });

        if (error) throw new Error(error.message);
        return data;
    }

    async actualizar(id, datos) {
        const { data, error } = await supabase
            .from('ofertas_pasantias')
            .update(datos)
            .eq('id', id)
            .select('id, id_empresa, titulo, descripcion, activa, creado_en')
            .single();

        if (error) throw new Error(error.message);
        return data;
    }
}

module.exports = new OfertasStore();