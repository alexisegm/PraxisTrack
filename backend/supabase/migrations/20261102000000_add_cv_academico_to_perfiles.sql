-- CV académico del estudiante dentro de su perfil.
-- Ejecutar en Supabase SQL Editor sobre el proyecto que usa la aplicación.

ALTER TABLE public.perfiles
    ADD COLUMN IF NOT EXISTS cv_resumen text,
    ADD COLUMN IF NOT EXISTS cv_institucion varchar(150),
    ADD COLUMN IF NOT EXISTS cv_carrera varchar(150),
    ADD COLUMN IF NOT EXISTS cv_semestre varchar(40),
    ADD COLUMN IF NOT EXISTS cv_promedio varchar(20),
    ADD COLUMN IF NOT EXISTS cv_habilidades text,
    ADD COLUMN IF NOT EXISTS cv_experiencia text;

COMMENT ON COLUMN public.perfiles.cv_resumen IS 'Resumen profesional o académico del estudiante.';
COMMENT ON COLUMN public.perfiles.cv_institucion IS 'Institución académica donde estudia o estudió.';
COMMENT ON COLUMN public.perfiles.cv_carrera IS 'Carrera o programa académico.';
COMMENT ON COLUMN public.perfiles.cv_semestre IS 'Semestre o nivel académico actual.';
COMMENT ON COLUMN public.perfiles.cv_promedio IS 'Promedio académico en el formato que use la institución.';
COMMENT ON COLUMN public.perfiles.cv_habilidades IS 'Habilidades y competencias separadas por comas o líneas.';
COMMENT ON COLUMN public.perfiles.cv_experiencia IS 'Experiencia académica, proyectos, certificaciones y logros.';

NOTIFY pgrst, 'reload schema';
