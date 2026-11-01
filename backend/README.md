# Backend de PraxisTrack

El frontend estático consume este backend mediante `frontend/js/api.js`. Los ejemplos de respuesta del contrato son ilustrativos; las rutas de negocio devuelven datos de Supabase y requieren una sesión autenticada.

Documentación complementaria: [Contrato de API](docs/contrato_api.md), [Arquitectura](docs/arquitectura.md), [Máquinas de estado](docs/maquinas_de_estado.md) y [Seguridad](docs/seguridad.md).

## Ejecutar localmente

Requisitos: Node.js y credenciales de un proyecto Supabase de desarrollo.

1. Instalar dependencias con `npm install`.
2. Copiar `.env.example` a `.env` y completar `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `PORT` (opcional), `NODE_ENV` y `CORS_ORIGINS`.
3. Iniciar el servidor en desarrollo con `npm run dev`; para ejecutar el proceso de producción, usar `npm start` con `NODE_ENV=production`.
4. Confirmar que responde en `GET http://localhost:3000/api/health`.

No compartan `.env` ni expongan `SUPABASE_SECRET_KEY` (o la antigua `SUPABASE_SERVICE_ROLE_KEY`) al frontend. Si una clave secreta se comparte por error, rótela desde Supabase antes de continuar. El proyecto no define actualmente un script `npm test`; las validaciones disponibles deben ejecutarse por archivo o añadirse al configurar una suite.

## Conectar el frontend local

- Sirvan la carpeta `frontend` con un servidor local, por ejemplo VS Code Live Server en `http://localhost:5500`.
- El cliente usa por defecto `http://localhost:3000/api`; se puede cambiar antes de cargar `js/api.js` mediante `window.PRAXISTRACK_CONFIG.apiBaseUrl`.
- El cliente toma el access token de la sesión propia de PraxisTrack o de un proveedor `window.PRAXISTRACK_CONFIG.getAccessToken`. Las claves publicable/anon pueden estar en el frontend; nunca coloquen una clave secreta allí.
- Si existen varias sesiones de Supabase en el navegador, configuren `window.PRAXISTRACK_CONFIG.supabaseStorageKey` con la clave de almacenamiento de la sesión activa.
- El backend permite por defecto los orígenes `localhost:5173`, `localhost:5500`, `127.0.0.1:5500` y `localhost:3000`. Para otros puertos, añádanlos a `CORS_ORIGINS`.

### Headers

Para todas las rutas protegidas:

El cliente adjunta el access token vigente con el esquema Bearer en el encabezado `Authorization`.

```http
Authorization: Bearer <ACCESS_TOKEN_SUPABASE>
```

Para `POST` y `PATCH` con cuerpo JSON:

```http
Content-Type: application/json
```

Los roles se leen desde `perfiles.rol`. Los nombres son sensibles a mayúsculas y deben coincidir exactamente con los indicados en cada endpoint.

### Registro, perfil y autenticación

El frontend ofrece registro, acceso y recuperación de contraseña en `frontend/auth.html`. `frontend/js/config.js` contiene el Project URL, la clave publicable y la clave anon/JWT pública del proyecto. Esas dos claves son públicas y aptas para el navegador; `SUPABASE_SECRET_KEY` y la antigua `SUPABASE_SERVICE_ROLE_KEY` son exclusivamente backend. La autenticación se realiza contra Supabase Auth; la contraseña no se copia a `perfiles`.

Para instalar o alinear el esquema desde Supabase SQL Editor, ejecuten `backend/supabase/migrations/20261030000000_align_schema_with_application.sql`. El script crea las tablas y enums que consume el backend, activa RLS y sincroniza `perfiles.email` desde `auth.users`; también reemplaza los triggers de registro anteriores. `auth.users` sigue siendo la fuente de verdad del correo y contraseña. El trigger crea el perfil con rol inicial fijo `Estudiante` y no confía en un rol proporcionado por el cliente.

Si está activada la confirmación de correo, la cuenta debe confirmar el email antes de iniciar sesión. Configuren la URL local del frontend en Supabase Auth > URL Configuration y añadan el dominio desplegado en producción. La sesión se conserva en `localStorage` del navegador y se renueva mediante el refresh token de Supabase; cerrar sesión invalida el token remoto.

El perfil se consulta y actualiza por `GET/PATCH /api/perfil`; identidad y rol proceden del token validado y el cliente no puede editar el rol ni el correo. `github` y `linkedin` se guardan en `perfiles` y solo aceptan URLs HTTPS de sus dominios oficiales.

Para poblar datos de prueba, registren y confirmen una cuenta de empresa y otra de estudiante. Reemplacen los correos de ejemplo en `backend/supabase/seed_demo.sql` y ejecútenlo desde Supabase SQL Editor. El script asigna los roles de prueba y crea una oferta, una postulación seleccionada y dos registros de bitácora; ejecútenlo solo en un proyecto de desarrollo.

El proyecto debe servir `frontend/` sobre HTTP (por ejemplo Live Server en `http://localhost:5500`); abrir los HTML como `file://` no es una URL de redirect OAuth/recuperación soportada por Supabase. Para finalizar el alta, configure ese origen en Supabase Auth, revise el trigger y compruebe que la tabla `perfiles` y su enum tengan las columnas y valores documentados. No existe una configuración Supabase ni una base real incluida en el repositorio, así que los accesos externos requieren esas credenciales y ajustes.

En el Dashboard de Supabase, en **Authentication > URL Configuration**, configuren como `Site URL` el origen exacto del servidor frontend (por ejemplo `http://localhost:5500`) y agreguen como `Redirect URLs` `http://localhost:5500/**` y `http://127.0.0.1:5500/**`. El formulario de registro solicita el regreso a `auth.html`; al confirmar el correo, el frontend guarda el access token del callback y continúa al dashboard. El origen del frontend también debe estar permitido por `CORS_ORIGINS` del backend.

El nombre de la tabla de ofertas es `public.ofertas_pasantias`, relacionado con `perfiles` mediante `id_empresa`. Las demás tablas son `public.perfiles`, `public.postulaciones` y `public.bitacora_horas`; las relaciones, enums y valores por defecto están definidos en el script SQL anterior.

Para asignar `Empresa` o `Institucion`, creen primero la cuenta por el flujo normal y verifiquen su identidad; luego una persona administradora con acceso al SQL Editor puede actualizar `public.perfiles.rol` por el correo confirmado:

```sql
UPDATE public.perfiles AS p
SET rol = 'Empresa'::public.rol_usuario
FROM auth.users AS u
WHERE p.id = u.id
  AND u.email = 'empresa@ejemplo.com';
```

Usen `'Institucion'::public.rol_usuario` para una institución. Verifiquen el resultado con una consulta `SELECT` antes de asignar el rol. El enum actual no define un rol `Admin`: la administración de la base se hace desde Supabase, no mediante una cuenta de frontend. No asignen roles desde `raw_user_meta_data` ni acepten ese campo desde el cliente. Si se requiere un rol de administrador de la aplicación, hay que diseñar explícitamente el enum, los permisos del backend y las políticas RLS; no basta con agregar un valor en la tabla.

### Configuración del servidor

El backend carga estas variables desde `.env`:

```dotenv
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://<PROJECT_REF>.supabase.co
SUPABASE_SECRET_KEY=<SECRET_SERVER_SIDE>
CORS_ORIGINS=http://localhost:5173
```

`SUPABASE_URL` debe ser la URL raíz del proyecto (sin `/rest/v1`). El backend también normaliza ese sufijo si ya está presente en una configuración local.

`CORS_ORIGINS` acepta una lista separada por comas de orígenes completos, por ejemplo `https://frontend.example.com,http://localhost:5173`. En desarrollo, si no se define, el servidor permite `http://localhost:5173`, `http://localhost:5500`, `http://127.0.0.1:5500` y `http://localhost:3000`; en producción es obligatorio configurarlo y el proceso no iniciará si falta. CORS restringe el acceso desde navegadores; no sustituye la autenticación y no impide llamadas directas con cURL o Postman. Las solicitudes sin header `Origin` se permiten para herramientas de línea de comandos.

El backend también acepta `SUPABASE_SERVICE_ROLE_KEY` como nombre compatible con instalaciones antiguas, pero se recomienda `SUPABASE_SECRET_KEY`. No compartan ni incluyan ninguna de esas claves en el frontend, el repositorio ni los logs. `.env` está excluido por `.gitignore`.

## Ofertas

### Listar ofertas

`GET /api/ofertas`

Acceso público; solo devuelve ofertas activas.

Devuelve solo ofertas activas, ordenadas de la más reciente a la más antigua. Si no hay ofertas activas, devuelve `200` con `data` como arreglo vacío.

Respuesta mock `200 OK`:

```json
{
  "data": [
    {
      "id_oferta": "11111111-1111-4111-8111-111111111111",
      "titulo": "Desarrollador Junior React/Node",
      "descripcion": "Desarrollo de funcionalidades web con acompañamiento del equipo.",
      "empresa": "Mobilistics",
      "fecha_publicacion": "2026-10-13T10:00:00.000Z"
    }
  ]
}
```

### Crear oferta

`POST /api/ofertas`

Rol permitido: `Empresa`.

El payload acepta exactamente estos campos: `titulo` (5 a 150 caracteres) y `descripcion` (mínimo 20 caracteres). No envíen `id`, `id_empresa` ni `activa`.

Request:

```json
{
  "titulo": "Desarrollador Junior React/Node",
  "descripcion": "Desarrollo de funcionalidades web con acompañamiento del equipo."
}
```

Respuesta mock `201 Created`:

```json
{
  "mensaje": "Oferta de pasantía publicada exitosamente.",
  "data": {
    "id_oferta": "11111111-1111-4111-8111-111111111111",
    "titulo": "Desarrollador Junior React/Node",
    "descripcion": "Desarrollo de funcionalidades web con acompañamiento del equipo.",
    "empresa": null,
    "fecha_publicacion": "2026-10-13T10:00:00.000Z"
  }
}
```

`empresa` puede ser `null` en la respuesta de creación; el listado obtiene el nombre mediante la relación con el perfil.

## Postulaciones

### Listar postulaciones

`GET /api/postulaciones`

Roles permitidos: `Estudiante` y `Empresa`. No requiere body. El estudiante recibe únicamente sus postulaciones; la empresa, únicamente las asociadas a sus ofertas. Los resultados se ordenan de más recientes a más antiguos.

Respuesta mock `200 OK`:

```json
{
  "data": [
    {
      "id_postulacion": "22222222-2222-4222-8222-222222222222",
      "id_estudiante": "44444444-4444-4444-8444-444444444444",
      "id_oferta": "11111111-1111-4111-8111-111111111111",
      "titulo_oferta": "Desarrollador Junior React/Node",
      "estado_actual": "Enviada",
      "fecha_registro": "2026-10-13T10:30:00.000Z"
    }
  ]
}
```

Si no hay resultados para el usuario autenticado, responde `200` con `{"data":[]}`. El backend real requiere un token válido y un perfil cuyo rol sea uno de los permitidos.

### Postularse a una oferta

`POST /api/postulaciones`

Rol permitido: `Estudiante`.

Request: `id_oferta` debe ser un UUID de una oferta existente.

```json
{
  "id_oferta": "11111111-1111-4111-8111-111111111111"
}
```

Respuesta mock `201 Created`:

```json
{
  "mensaje": "Postulación enviada con éxito.",
  "data": {
    "id_postulacion": "22222222-2222-4222-8222-222222222222",
    "estado_actual": "Enviada",
    "fecha_registro": "2026-10-13T10:30:00.000Z"
  }
}
```

Un estudiante no puede postularse dos veces a la misma oferta; el backend responde `400` en ese caso.

### Cambiar estado de postulación

`PATCH /api/postulaciones/{id_postulacion}/estado`

Rol permitido: `Empresa` propietaria de la oferta asociada a la postulación.

Request:

```json
{
  "nuevo_estado": "En_Revisión_Por_Empresa"
}
```

Estados destino aceptados: `En_Revisión_Por_Empresa`, `Entrevista_Asignada`, `Seleccionado`, `Rechazado`. La transición también debe ser legal desde el estado actual:

| Estado actual | Estados destino permitidos |
| --- | --- |
| `Enviada` | `En_Revisión_Por_Empresa`, `Rechazado` |
| `En_Revisión_Por_Empresa` | `Entrevista_Asignada`, `Rechazado` |
| `Entrevista_Asignada` | `Seleccionado`, `Rechazado` |
| `Seleccionado` | Ninguno; estado final |
| `Rechazado` | Ninguno; estado final |

Respuesta mock `200 OK`:

```json
{
  "mensaje": "Postulación avanzada exitosamente al estado: En_Revisión_Por_Empresa",
  "data": {
    "id_postulacion": "22222222-2222-4222-8222-222222222222",
    "estado_actual": "En_Revisión_Por_Empresa",
    "fecha_registro": "2026-10-13T10:30:00.000Z"
  }
}
```

Una transición reconocida por el esquema pero no permitida por la máquina devuelve `400`. Por ejemplo, `Enviada` a `Seleccionado` es ilegal. También pueden ocurrir `403` si la empresa no es propietaria de la oferta y `404` si la postulación no existe.

## Bitácora

### Registrar horas

`POST /api/bitacora`

Rol permitido: `Estudiante` propietario de la postulación. La postulación debe existir y estar en estado `Seleccionado`.

El payload acepta exactamente estos campos:

- `id_postulacion`: UUID.
- `fecha`: texto con formato `YYYY-MM-DD`.
- `horas_invertidas`: número mayor que 0 y máximo 8.
- `descripcion`: texto de al menos 10 caracteres.

No envíen un campo `estado`.

Request:

```json
{
  "id_postulacion": "22222222-2222-4222-8222-222222222222",
  "fecha": "2026-10-20",
  "horas_invertidas": 4,
  "descripcion": "Desarrollo y prueba de una funcionalidad del proyecto."
}
```

Respuesta mock `200 OK`:

```json
{
  "mensaje": "Registro de bitácora creado exitosamente.",
  "data": {
    "id_registro": "33333333-3333-4333-8333-333333333333",
    "estado_actual": "Registro_Creado",
    "horas_diarias": 4,
    "total_horas_acumuladas": 4
  }
}
```

El store no inserta `estado`; `Registro_Creado` depende del valor predeterminado configurado en la base de datos. El backend responde `400` si ya existe un registro para esa postulación y fecha, `403` si no pertenece al estudiante o no está seleccionada, y `404` si no encuentra la postulación.

### Cambiar el estado de un registro

`PATCH /api/bitacora/{id_registro}/estado`

Roles aceptados por la ruta: `Estudiante` y `Empresa`. El servicio valida además que el usuario autenticado sea el titular o la empresa propietaria, según la transición.

El cuerpo acepta únicamente `nuevo_estado` y uno de estos valores:

| Estado actual | Estado destino | Quién puede solicitarlo |
| --- | --- | --- |
| `Registro_Creado` | `Pendiente_De_Aprobación` | Estudiante titular de la postulación |
| `Pendiente_De_Aprobación` | `Horas_Aprobadas` | Empresa propietaria de la oferta |
| `Pendiente_De_Aprobación` | `Horas_Rechazadas` | Empresa propietaria de la oferta |
| `Horas_Aprobadas` | Ninguno; estado final | Ninguno |
| `Horas_Rechazadas` | Ninguno; estado final | Ninguno |

Primera transición, solicitada por el estudiante:

```http
PATCH /api/bitacora/33333333-3333-4333-8333-333333333333/estado
Authorization: Bearer <TOKEN_DE_ESTUDIANTE>
Content-Type: application/json
```

```json
{
  "nuevo_estado": "Pendiente_De_Aprobación"
}
```

Respuesta mock `200 OK`:

```json
{
  "mensaje": "Registro avanzado exitosamente al estado: Pendiente_De_Aprobación",
  "data": {
    "id_registro": "33333333-3333-4333-8333-333333333333",
    "estado_actual": "Pendiente_De_Aprobación",
    "horas_diarias": 4,
    "total_horas_acumuladas": 4
  }
}
```

Después, la empresa propietaria puede enviar `{"nuevo_estado":"Horas_Aprobadas"}` o `{"nuevo_estado":"Horas_Rechazadas"}` al mismo endpoint, usando su token. Para ambos casos, la respuesta exitosa tiene el mismo formato y `estado_actual` coincide con el estado solicitado. Si se rechazan las horas, estas dejan de incluirse en `total_horas_acumuladas`.

En modo mock pueden simular estas respuestas sin que exista el registro en Supabase. Para una petición real, el registro y sus relaciones deben existir, y el token debe corresponder al usuario autorizado. Una transición ilegal devuelve `400`; usuario con rol o propiedad incorrectos, `403`; registro inexistente, `404`.

## Errores y requisitos de integración

- `401`: falta el token o es inválido/expiró.
- `403`: el perfil no existe, el rol no está permitido o el usuario no tiene acceso al recurso.
- `404`: no se encontró el recurso solicitado.
- `400`: payload inválido o regla de negocio incumplida, como duplicidad o transición ilegal.
- `500`: error inesperado del backend o de la base de datos.

Para probar la API real se necesitan un access token válido, un perfil con el rol requerido y los registros relacionados en Supabase. Las respuestas mock de este documento permiten avanzar en la UI sin esos datos; no sustituyen esas precondiciones al integrar el backend.

Los errores de payload inválido responden `400` con `error` y `detalles`. Los errores operacionales se procesan con el manejador global: en producción devuelven `status` y `message`; los errores no operacionales se responden con un mensaje genérico `500`. En desarrollo se incluye información de depuración, por lo que no se debe ejecutar con `NODE_ENV=development` en producción.

Riesgo pendiente: el cambio de estado de bitácora actualiza primero la fila y luego calcula el total. Si el cálculo falla después de la actualización, la API puede responder `500` aunque el cambio de estado haya quedado persistido. Para garantizar atomicidad, hace falta trasladar ambas operaciones a una función transaccional de PostgreSQL/RPC.