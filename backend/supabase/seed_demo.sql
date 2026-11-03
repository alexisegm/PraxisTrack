-- Datos de demostracion para probar Marketplace, Postulaciones y Bitacora.
-- Primero registra en PraxisTrack una cuenta de empresa y otra de estudiante,
-- confirma sus correos y reemplaza estas dos direcciones antes de ejecutar.
-- Ejecutar solo en desarrollo: las cuentas indicadas quedaran con esos roles.

BEGIN;

DO $$
DECLARE
    v_correo_empresa constant text := 'empresa-demo@ejemplo.com';
    v_correo_estudiante constant text := 'estudiante-demo@ejemplo.com';
    v_id_empresa uuid;
    v_id_estudiante uuid;
    v_id_oferta constant uuid := 'd0000000-0000-4000-8000-000000000001';
    v_id_postulacion uuid;
BEGIN
    SELECT p.id
    INTO v_id_empresa
    FROM public.perfiles AS p
    JOIN auth.users AS u ON u.id = p.id
    WHERE lower(u.email) = lower(v_correo_empresa);

    IF v_id_empresa IS NULL THEN
        RAISE EXCEPTION 'No existe un perfil para la cuenta de empresa %.', v_correo_empresa;
    END IF;

    SELECT p.id
    INTO v_id_estudiante
    FROM public.perfiles AS p
    JOIN auth.users AS u ON u.id = p.id
    WHERE lower(u.email) = lower(v_correo_estudiante);

    IF v_id_estudiante IS NULL THEN
        RAISE EXCEPTION 'No existe un perfil para la cuenta de estudiante %.', v_correo_estudiante;
    END IF;

    IF v_id_empresa = v_id_estudiante THEN
        RAISE EXCEPTION 'Usa dos cuentas distintas: una empresa y un estudiante.';
    END IF;

    UPDATE public.perfiles
    SET rol = 'Empresa'::public.rol_usuario
    WHERE id = v_id_empresa;

    UPDATE public.perfiles
    SET rol = 'Estudiante'::public.rol_usuario,
        cv_resumen = 'Estudiante de Ingeniería de Sistemas con interés en desarrollo web y proyectos de software.',
        cv_institucion = 'Universidad Nacional',
        cv_carrera = 'Ingeniería de Sistemas',
        cv_semestre = '8vo semestre',
        cv_promedio = '18/20',
        cv_habilidades = 'JavaScript, Node.js, SQL, trabajo en equipo',
        cv_experiencia = 'Proyecto académico de gestión de inventario y pasantía de desarrollo web.'
    WHERE id = v_id_estudiante;

    INSERT INTO public.ofertas_pasantias (
        id, id_empresa, titulo, descripcion, activa
    )
    VALUES (
        v_id_oferta,
        v_id_empresa,
        'Pasantia demo - Desarrollo web',
        'Oferta de prueba para validar el flujo de postulaciones y el registro de horas en PraxisTrack.',
        true
    )
    ON CONFLICT (id) DO UPDATE
    SET id_empresa = EXCLUDED.id_empresa,
        titulo = EXCLUDED.titulo,
        descripcion = EXCLUDED.descripcion,
        activa = EXCLUDED.activa;

    INSERT INTO public.postulaciones (
        id_estudiante, id_oferta, estado
    )
    VALUES (
        v_id_estudiante,
        v_id_oferta,
        'Seleccionado'::public.estado_postulacion
    )
    ON CONFLICT (id_estudiante, id_oferta) DO UPDATE
    SET estado = EXCLUDED.estado
    RETURNING id INTO v_id_postulacion;

    INSERT INTO public.bitacora_horas (
        id, id_postulacion, fecha, horas_invertidas, descripcion, estado
    )
    VALUES
        (
            'd0000000-0000-4000-8000-000000000002',
            v_id_postulacion,
            DATE '2026-10-28',
            4.00,
            'Implementacion de componentes de interfaz para la oferta demo.',
            'Horas_Aprobadas'::public.estado_bitacora
        ),
        (
            'd0000000-0000-4000-8000-000000000003',
            v_id_postulacion,
            DATE '2026-10-29',
            3.50,
            'Pruebas y correcciones de accesibilidad en la aplicacion demo.',
            'Pendiente_De_Aprobación'::public.estado_bitacora
        )
    ON CONFLICT (id_postulacion, fecha) DO UPDATE
    SET horas_invertidas = EXCLUDED.horas_invertidas,
        descripcion = EXCLUDED.descripcion,
        estado = EXCLUDED.estado;
END;
$$;

COMMIT;
