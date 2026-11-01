-- Esquema de PraxisTrack para ejecutar en Supabase SQL Editor.
-- Los datos de autenticacion permanecen en auth.users; perfiles.email es una
-- copia sincronizada para que el API pueda devolver el correo junto al perfil.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' AND t.typname = 'rol_usuario'
    ) THEN
        CREATE TYPE public.rol_usuario AS ENUM ('Estudiante', 'Empresa', 'Institucion');
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' AND t.typname = 'estado_postulacion'
    ) THEN
        CREATE TYPE public.estado_postulacion AS ENUM (
            'Enviada',
            'En_Revisión_Por_Empresa',
            'Entrevista_Asignada',
            'Seleccionado',
            'Rechazado'
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' AND t.typname = 'estado_bitacora'
    ) THEN
        CREATE TYPE public.estado_bitacora AS ENUM (
            'Registro_Creado',
            'Pendiente_De_Aprobación',
            'Horas_Aprobadas',
            'Horas_Rechazadas'
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF to_regclass('public.oferta_pasantia') IS NOT NULL
       AND to_regclass('public.ofertas_pasantias') IS NULL THEN
        ALTER TABLE public.oferta_pasantia RENAME TO ofertas_pasantias;
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.perfiles (
    id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    rol public.rol_usuario NOT NULL DEFAULT 'Estudiante',
    nombre_completo varchar(120) NOT NULL,
    documento_identidad varchar(40),
    email text NOT NULL,
    github text,
    linkedin text,
    creado_en timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.perfiles
    ADD COLUMN IF NOT EXISTS email text,
    ADD COLUMN IF NOT EXISTS github text,
    ADD COLUMN IF NOT EXISTS linkedin text;

UPDATE public.perfiles AS p
SET email = u.email
FROM auth.users AS u
WHERE p.id = u.id
  AND p.email IS DISTINCT FROM u.email;

ALTER TABLE public.perfiles
    ALTER COLUMN email SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS perfiles_email_lower_uidx
    ON public.perfiles (lower(email));

CREATE TABLE IF NOT EXISTS public.ofertas_pasantias (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empresa uuid NOT NULL REFERENCES public.perfiles (id) ON DELETE CASCADE,
    titulo varchar(150) NOT NULL,
    descripcion text NOT NULL,
    activa boolean NOT NULL DEFAULT true,
    creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.postulaciones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_estudiante uuid NOT NULL REFERENCES public.perfiles (id) ON DELETE CASCADE,
    id_oferta uuid NOT NULL REFERENCES public.ofertas_pasantias (id) ON DELETE CASCADE,
    estado public.estado_postulacion NOT NULL DEFAULT 'Enviada',
    creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS postulaciones_estudiante_oferta_uidx
    ON public.postulaciones (id_estudiante, id_oferta);

CREATE TABLE IF NOT EXISTS public.bitacora_horas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_postulacion uuid NOT NULL REFERENCES public.postulaciones (id) ON DELETE CASCADE,
    fecha date NOT NULL,
    horas_invertidas numeric(5, 2) NOT NULL CHECK (horas_invertidas > 0 AND horas_invertidas <= 8),
    descripcion text NOT NULL,
    estado public.estado_bitacora NOT NULL DEFAULT 'Registro_Creado',
    creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS bitacora_horas_postulacion_fecha_uidx
    ON public.bitacora_horas (id_postulacion, fecha);

CREATE INDEX IF NOT EXISTS ofertas_pasantias_activas_creado_idx
    ON public.ofertas_pasantias (activa, creado_en DESC);

CREATE INDEX IF NOT EXISTS postulaciones_oferta_idx
    ON public.postulaciones (id_oferta);

CREATE INDEX IF NOT EXISTS bitacora_horas_postulacion_fecha_idx
    ON public.bitacora_horas (id_postulacion, fecha DESC);

ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ofertas_pasantias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.postulaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitacora_horas ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.perfiles (
            id,
            rol,
            nombre_completo,
            documento_identidad,
            email
        )
        VALUES (
            NEW.id,
            'Estudiante'::public.rol_usuario,
            COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'nombre_completo', ''), 'Estudiante'),
            NULLIF(NEW.raw_user_meta_data ->> 'documento_identidad', ''),
            NEW.email
        )
        ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email;
    ELSE
        UPDATE public.perfiles
        SET email = NEW.email
        WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS en_registro_usuario ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_profile();

CREATE TRIGGER on_auth_user_email_updated
AFTER UPDATE OF email ON auth.users
FOR EACH ROW
WHEN (OLD.email IS DISTINCT FROM NEW.email)
EXECUTE FUNCTION public.handle_new_user_profile();

NOTIFY pgrst, 'reload schema';
