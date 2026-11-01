const supabase = require('../config/supabase');

class PerfilStore {
    async obtener(id) {
        const { data, error } = await supabase
            .from('perfiles')
            .select('id, rol, nombre_completo, documento_identidad, email, github, linkedin, creado_en')
            .eq('id', id)
            .maybeSingle();

        if (error) throw new Error(error.message);
        return data;
    }

    async actualizar(id, datos) {
        const cambios = {
            nombre_completo: datos.nombre_completo,
            documento_identidad: datos.documento_identidad
        };

        if (datos.github !== undefined) cambios.github = datos.github;
        if (datos.linkedin !== undefined) cambios.linkedin = datos.linkedin;

        const { data, error } = await supabase
            .from('perfiles')
            .update(cambios)
            .eq('id', id)
            .select('id, rol, nombre_completo, documento_identidad, email, github, linkedin, creado_en')
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    async listarUsuarios() {
        const { data, error } = await supabase
            .from('perfiles')
            .select('id, rol, nombre_completo, documento_identidad, email, github, linkedin, creado_en')
            .order('nombre_completo', { ascending: true });

        if (error) throw new Error(error.message);
        return data;
    }

    async actualizarRol(id, rol) {
        const { data, error } = await supabase
            .from('perfiles')
            .update({ rol })
            .eq('id', id)
            .select('id, rol, nombre_completo, documento_identidad, email, github, linkedin, creado_en')
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    async eliminarCuenta(id) {
        const { error } = await supabase.auth.admin.deleteUser(id);
        if (error) throw new Error(error.message);
    }
}

module.exports = new PerfilStore();
