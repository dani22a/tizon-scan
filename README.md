# Tizon Scan (Frontend) - Levantar sin Docker

Guia completa para ejecutar el frontend localmente con Node.js.

## 1) Instalar Node.js

Version recomendada: **Node.js 20 LTS** (o superior compatible con Next.js 16).

### Windows
1. Descarga Node.js LTS:
   - [https://nodejs.org/](https://nodejs.org/)
2. Instala con las opciones por defecto.
3. Verifica:

```bash
node --version
npm --version
```

## 2) Instalar dependencias del proyecto

Desde la carpeta `tizon-scan`:

```bash
npm install
```

## 3) Configurar variables de entorno

Crea un archivo `.env.local` en la raiz del proyecto con estas variables:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000/api/v1
OPENWEATHER_API_KEY=
GEMINI_API_KEY=
NEXT_PUBLIC_SEND_EMAIL_WEBHOOK=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
NEXT_PUBLIC_ROBOFLOW_PUBLISHABLE_KEY=
```

Notas:
- `NEXT_PUBLIC_BACKEND_URL` debe apuntar al backend `service-tizon-scan`.
- Las variables vacias pueden completarse cuando integres esos servicios.

## 4) Levantar en desarrollo

```bash
npm run dev
```

La aplicacion estara disponible en:

- `http://localhost:3000`

## 5) Build de produccion (opcional)

Construir:

```bash
npm run build
```

Ejecutar build:

```bash
npm run start
```

## 6) Problemas comunes

- Error de CORS o APIs fallando:
  - revisa que el backend este activo en `http://localhost:4000`.
  - valida `NEXT_PUBLIC_BACKEND_URL` en `.env.local`.
- Error por version de Node:
  - actualiza a Node 20 LTS y reinstala dependencias.
- Cambiaste variables y no impacta:
  - reinicia `npm run dev` para recargar `env`.
