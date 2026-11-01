-- Ofertas adicionales de demostracion para el Marketplace.
-- Ejecutar en el proyecto Supabase conectado al backend desplegado.
-- No crea usuarios, no cambia roles y no crea postulaciones ni bitacoras.
-- Requiere que ambas cuentas existan en auth.users y tengan rol Empresa.

BEGIN;

DO $$
DECLARE
    v_ofertas_insertadas integer;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.perfiles AS p
        JOIN auth.users AS u ON u.id = p.id
        WHERE p.id = '5c7420c8-3b97-4765-9309-4d4c1f53fc29'::uuid
          AND lower(u.email) = lower('agonzalez.case@gmail.com')
          AND p.rol = 'Empresa'::public.rol_usuario
    ) THEN
        RAISE EXCEPTION
            'La cuenta agonzalez.case@gmail.com (5c7420c8-3b97-4765-9309-4d4c1f53fc29) no existe o no tiene rol Empresa.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.perfiles AS p
        JOIN auth.users AS u ON u.id = p.id
        WHERE p.id = '484f8082-b5ed-4017-9440-d31d7ac5ea0a'::uuid
          AND lower(u.email) = lower('sabidefreitas19@gmail.com')
          AND p.rol = 'Empresa'::public.rol_usuario
    ) THEN
        RAISE EXCEPTION
            'La cuenta sabidefreitas19@gmail.com (484f8082-b5ed-4017-9440-d31d7ac5ea0a) no existe o no tiene rol Empresa.';
    END IF;

    WITH ofertas_seed (id_empresa, titulo, descripcion) AS (
        VALUES
            (
                '5c7420c8-3b97-4765-9309-4d4c1f53fc29'::uuid,
                'Desarrollador/a frontend web junior',
                'Participa en el desarrollo de interfaces web responsivas con HTML, CSS y JavaScript, junto con revisiones de codigo y pruebas de usabilidad.'
            ),
            (
                '5c7420c8-3b97-4765-9309-4d4c1f53fc29'::uuid,
                'Desarrollador/a backend Node.js',
                'Apoya la implementacion de servicios REST con Node.js, validacion de datos, integracion con bases de datos y documentacion de endpoints.'
            ),
            (
                '5c7420c8-3b97-4765-9309-4d4c1f53fc29'::uuid,
                'Desarrollador/a de aplicaciones Android',
                'Colabora en funciones para aplicaciones moviles Android, consumo de APIs, manejo de estados de pantalla y pruebas en dispositivos.'
            ),
            (
                '5c7420c8-3b97-4765-9309-4d4c1f53fc29'::uuid,
                'Desarrollador/a full stack web',
                'Construye mejoras de extremo a extremo para una plataforma web, desde componentes de interfaz hasta rutas y persistencia de datos.'
            ),
            (
                '5c7420c8-3b97-4765-9309-4d4c1f53fc29'::uuid,
                'QA de aplicaciones web y moviles',
                'Diseña y ejecuta casos de prueba para aplicaciones web y moviles, registra defectos reproducibles y colabora con el equipo de desarrollo.'
            ),
            (
                '484f8082-b5ed-4017-9440-d31d7ac5ea0a'::uuid,
                'Desarrollador/a frontend React',
                'Implementa vistas y componentes reutilizables en React, integra servicios HTTP y verifica su funcionamiento en distintos tamanos de pantalla.'
            ),
            (
                '484f8082-b5ed-4017-9440-d31d7ac5ea0a'::uuid,
                'Desarrollador/a de aplicaciones iOS',
                'Apoya el desarrollo de una aplicacion para iOS, incluyendo pantallas, navegacion, consumo de servicios y pruebas funcionales.'
            ),
            (
                '484f8082-b5ed-4017-9440-d31d7ac5ea0a'::uuid,
                'Programador/a de APIs y microservicios',
                'Participa en el diseno e implementacion de APIs para aplicaciones web y moviles, con validacion de solicitudes y manejo consistente de errores.'
            ),
            (
                '484f8082-b5ed-4017-9440-d31d7ac5ea0a'::uuid,
                'Desarrollador/a de aplicaciones moviles multiplataforma',
                'Colabora en una aplicacion multiplataforma, implementando flujos de usuario, integraciones HTTP y ajustes para Android e iOS.'
            ),
            (
                '484f8082-b5ed-4017-9440-d31d7ac5ea0a'::uuid,
                'Pasante de automatizacion de pruebas de software',
                'Crea y mantiene pruebas automatizadas para funcionalidades de aplicaciones web y moviles, y documenta resultados junto al equipo tecnico.'
            )
    )
    INSERT INTO public.ofertas_pasantias (id_empresa, titulo, descripcion, activa)
    SELECT seed.id_empresa, seed.titulo, seed.descripcion, true
    FROM ofertas_seed AS seed
    WHERE NOT EXISTS (
        SELECT 1
        FROM public.ofertas_pasantias AS existente
        WHERE existente.id_empresa = seed.id_empresa
          AND existente.titulo = seed.titulo
    );

    GET DIAGNOSTICS v_ofertas_insertadas = ROW_COUNT;
    RAISE NOTICE '% nuevas ofertas insertadas.', v_ofertas_insertadas;
END;
$$;

COMMIT;
