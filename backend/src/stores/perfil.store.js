const supabase = require('../config/supabase');

const CAMPOS_PERFIL = 'id, rol, nombre_completo, documento_identidad, email, github, linkedin, cv_resumen, cv_institucion, cv_carrera, cv_semestre, cv_promedio, cv_habilidades, cv_experiencia, creado_en';
const CAMPOS_CV = [
    'cv_resumen',
    'cv_institucion',
    'cv_carrera',
    'cv_semestre',
    'cv_promedio',
    'cv_habilidades',
    'cv_experiencia'
];

class PerfilStore {
    async obtener(id) {
        const { data, error } = await supabase
            .from('perfiles')
            .select(CAMPOS_PERFIL)
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

        for (const campo of CAMPOS_CV) {
            if (datos[campo] !== undefined) cambios[campo] = datos[campo];
        }

        const { data, error } = await supabase
            .from('perfiles')
            .update(cambios)
            .eq('id', id)
            .select(CAMPOS_PERFIL)
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    async listarUsuarios() {
        const { data, error } = await supabase
            .from('perfiles')
            .select(CAMPOS_PERFIL)
            .order('nombre_completo', { ascending: true });

        if (error) throw new Error(error.message);
        return data;
    }

    async actualizarRol(id, rol) {
        const { data, error } = await supabase
            .from('perfiles')
            .update({ rol })
            .eq('id', id)
            .select(CAMPOS_PERFIL)
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
