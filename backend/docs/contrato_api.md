## 📄 Contrato de API - BitácoraPasantías

**URL Base (Desarrollo):** `http://localhost:3000/api`

### Perfil del usuario autenticado

- `GET /perfil` devuelve `id`, `rol`, `nombre_completo`, `documento_identidad`, `email`, `github`, `linkedin` y `creado_en` del usuario indicado por el JWT. El correo se sincroniza desde Supabase Auth.
- `PATCH /perfil` acepta `nombre_completo` (3-120 caracteres), `documento_identidad` (3-40 caracteres), `github` y `linkedin` (URL HTTPS válida del dominio correspondiente, o `null`). El ID, el rol y el correo no son editables por el cliente.
- Ambos endpoints requieren `Authorization: Bearer <access_token de Supabase>`.

**Autenticación:** Todas las peticiones protegidas deben incluir el header:

El cliente adjunta el access token de Supabase con el esquema Bearer.

```http
Authorization: Bearer <TU_SUPABASE_JWT>
```

### 1. Ofertas de Pasantías

#### Listar Ofertas Activas

- **Endpoint:** `GET /ofertas`
- **Acceso:** Público; solo devuelve ofertas activas.
- **Respuesta (200 OK):**

```json
{
  "data": [
    {
      "id_oferta": "uuid",
      "titulo": "Desarrollador Junior",
      "descripcion": "Requisitos...",
      "empresa": "Mobilistics / DINAMIC",
      "fecha_publicacion": "2026-10-13T00:00:00.000Z"
    }
  ]
}
```

#### Publicar Oferta

- **Endpoint:** `POST /ofertas`
- **Roles Permitidos:** `Empresa`.
- **Payload:**

```json
{
  "titulo": "Desarrollador Junior",
  "descripcion": "Descripción detallada de la oferta..."
}
```

- **Respuesta (201 Created):** Retorna los datos de la oferta creada.

### 2. Postulaciones (Máquina de Estado)

#### Listar Postulaciones

- **Endpoint:** `GET /postulaciones`
- **Roles Permitidos:** `Estudiante`, `Empresa`.
- **Respuesta (200 OK):** Devuelve únicamente las postulaciones del estudiante autenticado o las asociadas a ofertas de la empresa autenticada. Sin resultados, `data` es un array vacío.

```json
{
  "data": [
    {
      "id_postulacion": "uuid-postulacion",
      "id_estudiante": "uuid-estudiante",
      "id_oferta": "uuid-oferta",
      "titulo_oferta": "Desarrollador Junior",
      "estado_actual": "Enviada",
      "fecha_registro": "2026-10-13T10:30:00.000Z"
    }
  ]
}
```

#### Aplicar a una Oferta

- **Endpoint:** `POST /postulaciones`
- **Roles Permitidos:** `Estudiante`.
- **Payload:**

```json
{
  "id_oferta": "uuid-de-la-oferta"
}
```

- **Respuesta (201 Created):** Retorna el ID de postulación y el estado `Enviada`.

#### Avanzar Estado de Postulación

- **Endpoint:** `PATCH /postulaciones/:id/estado`
- **Roles Permitidos:** `Empresa` propietaria de la oferta asociada.
- **Payload:**

```json
{
  "nuevo_estado": "En_Revisión_Por_Empresa"
}
```

Estados destino aceptados: `En_Revisión_Por_Empresa`, `Entrevista_Asignada`, `Seleccionado`, `Rechazado`. La transición debe ser válida desde el estado actual. Una transición ilegal devuelve `400`.

### 3. Bitácora de Horas (Máquina de Estado)

#### Listar Historial de Horas

- **Endpoint:** `GET /bitacora`
- **Roles Permitidos:** `Estudiante` (ve sus registros), `Empresa` (ve los registros de sus pasantes).
- **Respuesta (200 OK):** Retorna un array de registros filtrados por el usuario autenticado. Si no hay registros, devuelve `{"data":[]}`.

#### Registrar Jornada

- **Endpoint:** `POST /bitacora`
- **Rol Permitido:** `Estudiante`, titular de una postulación en estado `Seleccionado`.
- **Respuesta:** `201 Created`, con el registro creado dentro de `data`.
- **Payload:**

```json
{
  "id_postulacion": "uuid-postulacion",
  "fecha": "YYYY-MM-DD",
  "horas_invertidas": 4.5,
  "descripcion": "Desarrollo de módulos asignados."
}
```

No enviar `estado`; el registro comienza en `Registro_Creado` según el valor predeterminado configurado en la base de datos.

#### Modificar Estado de Horas (Aprobación/Revisión)

- **Endpoint:** `PATCH /bitacora/:id/estado`
- **Roles Permitidos:** `Estudiante` (para enviar a revisión) / `Empresa` (para aprobar o rechazar; debe ser propietaria de la oferta).
- **Payload:**

```json
{
  "nuevo_estado": "Pendiente_De_Aprobación"
}
```

Estados destino aceptados: `Pendiente_De_Aprobación`, `Horas_Aprobadas`, `Horas_Rechazadas`. Las transiciones permitidas son:

| Estado actual | Estado destino | Quién puede solicitarlo |
| --- | --- | --- |
| `Registro_Creado` | `Pendiente_De_Aprobación` | Estudiante titular |
| `Pendiente_De_Aprobación` | `Horas_Aprobadas` | Empresa propietaria |
| `Pendiente_De_Aprobación` | `Horas_Rechazadas` | Empresa propietaria |

Los estados `Horas_Aprobadas` y `Horas_Rechazadas` son finales.
