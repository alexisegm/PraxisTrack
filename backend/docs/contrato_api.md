## Contrato de API de PraxisTrack

Este documento describe las rutas realmente implementadas por `backend/src/server.js`, los permisos y las formas JSON que el servidor acepta y devuelve. La API usa Express, Supabase Auth para validar sesiones y Supabase como almacenamiento.

El workspace contiene un frontend web estático, pero no contiene un cliente móvil nativo. Por tanto, las reglas HTTP aquí son las del backend verificable; el cliente móvil debe enviar los campos y headers descritos y configurar la URL pública de Render. No se presupone una implementación móvil que no está en este repositorio.

## URL base

Todas las rutas de negocio y salud se montan bajo `/api`.

- Producción en Render: `https://<nombre-del-servicio>.onrender.com/api` (sustituir por el dominio exacto mostrado en Render; si se configura un dominio propio, usar ese origen HTTPS).
- Desarrollo local: `http://localhost:3000/api`.
- Health check: `GET https://<nombre-del-servicio>.onrender.com/api/health`.

El cliente concatena la URL base con las rutas de las tablas de endpoints. No agregue `/` al final de la URL base: por ejemplo, la base es `https://praxistrack-api.onrender.com/api` y la ruta es `/ofertas`.

## Desplegar el backend en Render

1. Confirme que el repositorio Git contiene la carpeta `backend/` y que `backend/package.json` incluye `npm start` (el proyecto ya define `node src/server.js`).
2. Entre a [Render Dashboard](https://dashboard.render.com/) e inicie sesión. Seleccione **New +** y luego **Web Service**.
3. Conecte GitHub/GitLab/Bitbucket si todavía no lo hizo, autorice el acceso al repositorio y seleccione el repositorio de PraxisTrack.
4. Configure el servicio: **Root Directory** `backend`, **Runtime** `Node`, **Build Command** `npm install` y **Start Command** `npm start`. El tipo de instancia/precio depende de la cuenta y no cambia el contrato HTTP.
5. En **Environment Variables**, agregue:

   | Nombre | Valor |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `SUPABASE_URL` | URL raíz del proyecto Supabase, por ejemplo `https://<PROJECT_REF>.supabase.co`; no incluya `/rest/v1`. |
   | `SUPABASE_SECRET_KEY` | Clave secreta del servidor de Supabase. Manténgala solo en Render; nunca en el frontend, app móvil, repositorio ni documentación compartida. |
   | `CORS_ORIGINS` | Orígenes web permitidos, separados por comas y sin rutas, por ejemplo `https://<sitio-web>.vercel.app,http://localhost:5500`. |

   Render asigna `PORT`; no fije un valor propio para producción. El backend escucha en `process.env.PORT`.
6. Revise que las tablas, enums, relaciones y trigger de perfiles estén aplicados en el proyecto Supabase de producción. La migración del repositorio es `backend/supabase/migrations/20261030000000_align_schema_with_application.sql`; ejecútela desde Supabase SQL Editor en el proyecto correcto antes de probar los flujos. No use `seed_demo.sql` en producción.
7. Seleccione **Create Web Service** y espere a que el despliegue termine. En **Settings**, configure el **Health Check Path** como `/api/health` si la opción está disponible. Abra `https://<dominio-de-render>/api/health`; debe responder `200` con `{"status":"ok","message":"Servidor BitácoraPasantías Operativo"}`.
8. Copie el dominio HTTPS exacto de Render. Configure en el cliente móvil la base `https://<dominio-de-render>/api`. En el frontend web de este repositorio, cambie `window.PRAXISTRACK_CONFIG.apiBaseUrl` en `frontend/js/config.js` para que apunte a esa base y vuelva a desplegar el frontend.
9. Si el cliente web está alojado en Vercel, añada su origen exacto (por ejemplo, `https://<proyecto>.vercel.app`) a `CORS_ORIGINS` en Render, guarde el cambio y espere el redeploy/reinicio del servicio. Si usa dominios de preview de Vercel, cada origen que deba usar la API tiene que estar permitido explícitamente. No incluya `/`, rutas ni la base `/api` en los orígenes CORS.
10. Pruebe primero el health check y `GET /api/ofertas`; después pruebe rutas protegidas con un access token vigente de una cuenta real que tenga el rol apropiado en `public.perfiles`.

`CORS_ORIGINS` es obligatorio cuando `NODE_ENV=production`; si falta, el proceso falla al iniciar. Una app nativa que haga solicitudes HTTP directamente puede no enviar el header `Origin`, y este backend permite solicitudes sin `Origin`; una app basada en WebView/navegador sí necesita el origen correspondiente en `CORS_ORIGINS`. CORS no reemplaza autenticación ni autorización.

## Convenciones de consumo

- Los ejemplos de esta especificación usan JSON UTF-8. Para solicitudes `POST` y `PATCH` con cuerpo, envíe `Content-Type: application/json`.
- Los endpoints protegidos requieren `Authorization: Bearer <access_token>` con un access token vigente emitido por Supabase Auth. El backend valida el token mediante Supabase; no acepta un ID de usuario enviado en el body como identidad.
- Los nombres de roles y estados distinguen mayúsculas, minúsculas, guiones bajos y acentos. Envíelos exactamente como aparecen aquí.
- Los objetos de listado se devuelven bajo `{ "data": [...] }`; las mutaciones normalmente devuelven `{ "mensaje": "...", "data": {...} }`.
- Los cuerpos se validan estrictamente en endpoints con esquema: no agregue campos no documentados. Campos como `id`, `rol`, `estado`, `id_empresa` y `activa` no se aceptan en esos payloads.
- La autenticación de la app contra Supabase es separada de esta API. La app obtiene el access token de la sesión Supabase y lo envía a Render. Nunca incorpore `SUPABASE_SECRET_KEY` ni `SUPABASE_SERVICE_ROLE_KEY` en el cliente.

## Endpoints

En la columna de acceso, `Público` significa que no requiere token; los demás requieren token Bearer y el rol indicado. Los datos se restringen al usuario/empresa autenticados salvo que se indique lo contrario.

| Método | Ruta | Acceso | Resultado |
| --- | --- | --- | --- |
| `GET` | `/health` | Público | Estado del proceso. |
| `GET` | `/ofertas` | Público | Ofertas activas, más recientes primero. |
| `POST` | `/ofertas` | `Empresa`, `Institucion` | Crea una oferta. |
| `PATCH` | `/ofertas/:id` | Propietario `Empresa` o `Institucion` | Actualiza título y descripción. |
| `DELETE` | `/ofertas/:id` | Propietario `Empresa` o `Institucion` | Desactiva la oferta; no la elimina físicamente. |
| `GET` | `/postulaciones` | `Estudiante`, `Empresa`, `Institucion` | Lista postulaciones propias, de las ofertas propias o todas (Institucion). |
| `POST` | `/postulaciones` | `Estudiante` | Postula a una oferta. |
| `PATCH` | `/postulaciones/:id/estado` | Propietario `Empresa` o `Institucion` | Avanza el estado de una postulación. |
| `GET` | `/bitacora` | `Estudiante`, `Empresa`, `Institucion` | Lista registros propios, de pasantes o todos (Institucion). |
| `POST` | `/bitacora` | `Estudiante` titular de postulación seleccionada | Registra horas. |
| `PATCH` | `/bitacora/:id/estado` | Estudiante titular, empresa tutora o `Institucion` según transición | Cambia estado de revisión. |
| `GET` | `/perfil` | Usuario autenticado | Consulta el perfil propio. |
| `PATCH` | `/perfil` | Usuario autenticado | Actualiza nombre, documento y enlaces propios. |
| `GET` | `/perfil/usuarios` | `Institucion` | Lista perfiles de todos los usuarios. |
| `PATCH` | `/perfil/usuarios/:id/rol` | `Institucion` | Cambia el rol de otro usuario. |
| `DELETE` | `/perfil/cuenta` | Usuario autenticado | Elimina la cuenta propia; responde sin cuerpo. |

### Salud

`GET /health` no requiere autenticación y permite a Render comprobar que el proceso responde.

Respuesta `200`:

```json
{
  "status": "ok",
  "message": "Servidor BitácoraPasantías Operativo"
}
```

### Ofertas

#### `GET /ofertas`

Público. Devuelve únicamente ofertas con `activa=true`, ordenadas por fecha de creación descendente. Si no existen, `data` es `[]`.

```json
{
  "data": [
    {
      "id_oferta": "11111111-1111-4111-8111-111111111111",
      "titulo": "Desarrollador Junior",
      "descripcion": "Desarrollo de funcionalidades con acompañamiento del equipo.",
      "empresa": "Nombre de empresa",
      "fecha_publicacion": "2026-10-13T10:00:00.000Z"
    }
  ]
}
```

`empresa` es el nombre de perfil asociado y puede ser `null` si no existe la relación/dato esperado.

#### `POST /ofertas`

Roles: `Empresa` o `Institucion`. Campos requeridos: `titulo` (5-150 caracteres) y `descripcion` (mínimo 20). No admite campos adicionales.

```json
{
  "titulo": "Desarrollador Junior",
  "descripcion": "Desarrollo de funcionalidades con acompañamiento del equipo."
}
```

Respuesta `201`:

```json
{
  "mensaje": "Oferta de pasantía publicada exitosamente.",
  "data": {
    "id_oferta": "11111111-1111-4111-8111-111111111111",
    "titulo": "Desarrollador Junior",
    "descripcion": "Desarrollo de funcionalidades con acompañamiento del equipo.",
    "empresa": null,
    "fecha_publicacion": "2026-10-13T10:00:00.000Z"
  }
}
```

En la respuesta inmediata de creación, `empresa` puede ser `null`: el `INSERT ... RETURNING` actual no carga la relación de perfil.

#### `PATCH /ofertas/:id`

Roles: `Empresa` propietaria o `Institucion`. El parámetro `id` es el UUID de oferta. Body idéntico al de creación y con las mismas reglas; ambos campos son requeridos. Respuesta `200`:

```json
{
  "mensaje": "Oferta actualizada correctamente.",
  "data": {
    "id_oferta": "11111111-1111-4111-8111-111111111111",
    "titulo": "Desarrollador Junior",
    "descripcion": "Descripción actualizada con al menos veinte caracteres.",
    "empresa": null,
    "fecha_publicacion": "2026-10-13T10:00:00.000Z"
  }
}
```

#### `DELETE /ofertas/:id`

Roles: `Empresa` propietaria o `Institucion`. Marca `activa=false`; no borra el registro. Respuesta `200` con `mensaje` igual a `Oferta desactivada correctamente.` y `data` con la forma de oferta descrita arriba. No envíe body.

### Postulaciones

#### `GET /postulaciones`

Roles: `Estudiante`, `Empresa`, `Institucion`. El estudiante ve sus postulaciones; una empresa ve postulaciones asociadas a sus ofertas; una institución ve todas. Se ordenan por fecha de registro descendente. Respuesta `200`:

```json
{
  "data": [
    {
      "id_postulacion": "22222222-2222-4222-8222-222222222222",
      "id_estudiante": "44444444-4444-4444-8444-444444444444",
      "id_oferta": "11111111-1111-4111-8111-111111111111",
      "titulo_oferta": "Desarrollador Junior",
      "estado_actual": "Enviada",
      "fecha_registro": "2026-10-13T10:30:00.000Z"
    }
  ]
}
```

Si no hay resultados, responde `200` con `{"data":[]}`.

#### `POST /postulaciones`

Rol: `Estudiante`. `id_oferta` debe ser un UUID válido. No admite campos extra.

```json
{
  "id_oferta": "11111111-1111-4111-8111-111111111111"
}
```

Respuesta `201`:

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

El estado inicial `Enviada` y la fecha los asigna la base de datos. Un estudiante no puede postularse dos veces a la misma oferta; el segundo intento produce `400`.

#### `PATCH /postulaciones/:id/estado`

Roles: `Empresa` propietaria de la oferta o `Institucion`. El parámetro `id` es el UUID de postulación. El body admite solo `nuevo_estado`:

```json
{
  "nuevo_estado": "En_Revisión_Por_Empresa"
}
```

Transiciones válidas:

| Estado actual | Estados destino |
| --- | --- |
| `Enviada` | `En_Revisión_Por_Empresa`, `Rechazado` |
| `En_Revisión_Por_Empresa` | `Entrevista_Asignada`, `Rechazado` |
| `Entrevista_Asignada` | `Seleccionado`, `Rechazado` |
| `Seleccionado` | Ninguno (final). |
| `Rechazado` | Ninguno (final). |

Respuesta `200`: `{ "mensaje": "Postulación avanzada exitosamente al estado: <estado>", "data": { "id_postulacion": "<uuid>", "estado_actual": "<estado>", "fecha_registro": "<ISO-8601>" } }`.

### Bitácora

#### `GET /bitacora`

Roles: `Estudiante`, `Empresa`, `Institucion`. El estudiante ve sus registros; la empresa ve registros vinculados a sus ofertas; la institución ve todos. Se ordenan por fecha descendente. Respuesta `200`:

```json
{
  "data": [
    {
      "id_registro": "33333333-3333-4333-8333-333333333333",
      "fecha": "2026-10-13",
      "horas": 4.5,
      "descripcion": "Desarrollo de módulos asignados.",
      "estado": "Registro_Creado",
      "oferta": "Desarrollador Junior",
      "fecha_registro": "2026-10-13T16:00:00.000Z"
    }
  ]
}
```

Sin registros, responde `200` con `{"data":[]}`. `horas` es numérico.

#### `POST /bitacora`

Rol: `Estudiante`, y debe ser titular de una postulación cuyo estado sea `Seleccionado`. Requiere `id_postulacion` UUID, `fecha` válida en formato `YYYY-MM-DD`, `horas_invertidas` numérico mayor que `0` y como máximo `8`, y `descripcion` con al menos 10 caracteres. No admite campos adicionales; en particular, no envíe `estado`.

```json
{
  "id_postulacion": "22222222-2222-4222-8222-222222222222",
  "fecha": "2026-10-13",
  "horas_invertidas": 4.5,
  "descripcion": "Desarrollo de módulos asignados."
}
```

La base asigna el estado inicial `Registro_Creado`. Solo se permite un registro por postulación y fecha. Respuesta `201`:

```json
{
  "mensaje": "Registro de bitácora creado exitosamente.",
  "data": {
    "id_registro": "33333333-3333-4333-8333-333333333333",
    "estado_actual": "Registro_Creado",
    "horas_diarias": 4.5,
    "total_horas_acumuladas": 4.5
  }
}
```

`total_horas_acumuladas` suma los registros de esa postulación excepto los que tienen estado `Horas_Rechazadas`.

#### `PATCH /bitacora/:id/estado`

El parámetro `id` es el UUID del registro. El body estricto contiene solo `nuevo_estado`.

```json
{
  "nuevo_estado": "Pendiente_De_Aprobación"
}
```

Transiciones y autorización:

| Estado actual | Estado destino | Quién puede solicitarlo |
| --- | --- | --- |
| `Registro_Creado` | `Pendiente_De_Aprobación` | Estudiante titular. |
| `Pendiente_De_Aprobación` | `Horas_Aprobadas` | Empresa tutora o `Institucion`. |
| `Pendiente_De_Aprobación` | `Horas_Rechazadas` | Empresa tutora o `Institucion`. |

`Horas_Aprobadas` y `Horas_Rechazadas` son finales. Una empresa debe ser la propietaria de la oferta; el rol `Institucion` está autorizado por la implementación sin restricción de propiedad. Respuesta `200`: `{ "mensaje": "Registro avanzado exitosamente al estado: <estado>", "data": { "id_registro": "<uuid>", "estado_actual": "<estado>", "horas_diarias": 4.5, "total_horas_acumuladas": 4.5 } }`.

### Perfil y administración de usuarios

#### `GET /perfil`

Usuario autenticado; no requiere rol específico. Devuelve el perfil vinculado al usuario del token. Respuesta `200`:

```json
{
  "data": {
    "id": "44444444-4444-4444-8444-444444444444",
    "rol": "Estudiante",
    "nombre_completo": "Nombre Apellido",
    "documento_identidad": "ABC123",
    "email": "persona@example.com",
    "github": null,
    "linkedin": null,
    "creado_en": "2026-10-13T10:00:00.000Z"
  }
}
```

`id`, `rol` y `email` no se aceptan para edición; el email proviene de Supabase Auth.

#### `PATCH /perfil`

Usuario autenticado. `nombre_completo` (3-120 caracteres) y `documento_identidad` (3-40 caracteres) son requeridos en cada solicitud. `github` y `linkedin` son opcionales; se puede omitirlos para conservarlos, o enviar `null` para borrarlos. Si se envían como texto, deben ser URLs HTTPS con hostname `github.com`/`www.github.com` o `linkedin.com`/`www.linkedin.com` respectivamente. No admite campos extra.

```json
{
  "nombre_completo": "Nombre Apellido",
  "documento_identidad": "ABC123",
  "github": "https://github.com/usuario",
  "linkedin": null
}
```

Respuesta `200`: `{ "mensaje": "Perfil actualizado correctamente.", "data": { ...perfil... } }`, con los campos de `GET /perfil`.

#### `GET /perfil/usuarios`

Solo `Institucion`. Devuelve todos los perfiles, ordenados por nombre, dentro de `data`; cada objeto usa la misma forma de perfil y contiene email. Maneje esta información como datos personales.

#### `PATCH /perfil/usuarios/:id/rol`

Solo `Institucion`. `:id` debe ser un UUID y no puede ser el ID de la propia institución que hace la solicitud. Body estricto:

```json
{
  "rol": "Empresa"
}
```

Valores aceptados: `Estudiante`, `Empresa`, `Institucion`. Respuesta `200`: `{ "mensaje": "Rol actualizado correctamente.", "data": { ...perfil... } }`.

#### `DELETE /perfil/cuenta`

Usuario autenticado. Elimina la cuenta Supabase Auth propia y responde `204 No Content`, sin body. No envíe body. El cliente debe tratar `204` como éxito sin intentar parsear JSON.

## Autenticación y errores

El backend verifica el access token con `supabase.auth.getUser(token)`. Falta de token, token vencido o inválido devuelve `401`. Un usuario sin perfil/rol suficiente o que no sea propietario recibe `403`. Rutas inexistentes devuelven `404`.

Los errores de validación Zod devuelven `400` con esta forma (no se incluye `message` en este caso):

```json
{
  "error": "Payload inválido o intento de inyección de campos no autorizados.",
  "detalles": [
    {
      "campo": "titulo",
      "mensaje": "El título debe tener al menos 5 caracteres."
    }
  ]
}
```

Los errores de negocio y autorización en producción usan `{ "status": "error", "message": "..." }`. Una transición de estado ilegal y reglas como una postulación duplicada devuelven `400`. Un recurso inexistente devuelve `404`. Los errores internos inesperados devuelven `500` con `{ "status": "error", "message": "Algo salió mal en el servidor." }`; el stack trace no se expone en producción. Los detalles de `message` dependen del error concreto.

El cliente debe verificar `response.ok` y no asumir que toda respuesta de error incluye el mismo conjunto de campos. Para una respuesta `204`, no intente leer JSON. El cliente web actual convierte errores en `Error` usando `message`, luego `error`, y finalmente un texto genérico.

## Configuración de acceso desde clientes

En el cliente móvil, defina una constante de configuración para la URL base HTTPS copiada de Render, por ejemplo `https://praxistrack-api.onrender.com/api`, y construya las llamadas como `<base>/ofertas`, `<base>/perfil`, etc. No use `localhost` en una app instalada: allí apuntaría al propio teléfono, no al servicio de Render.

En el frontend web existente, `frontend/js/config.js` actualmente tiene `apiBaseUrl: 'http://localhost:3000/api'`; ese valor es de desarrollo y debe reemplazarse por la URL HTTPS de producción antes de desplegar el frontend. Su origen Vercel debe estar incluido en `CORS_ORIGINS` del backend.

Para llamadas protegidas, obtenga el access token de la sesión Supabase activa e incluya `Authorization: Bearer <access_token>`. No envíe la clave secreta de Supabase como bearer token. La clave publicable/anon puede usarse en el cliente para autenticar contra Supabase; las operaciones de esta API se autorizan según el rol guardado en `perfiles.rol`, no según un rol suministrado en la solicitud.
