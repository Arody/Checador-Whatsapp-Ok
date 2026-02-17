# Checador WhatsApp Kadmiel

Sistema de registro de asistencia (Check-in/Check-out) mediante WhatsApp con validación de geocercas (geofencing) y panel de administración.

## 🚀 Estructura del Proyecto

El sistema consta de dos servicios principales que deben ejecutarse simultáneamente:

1.  **Plataforma Web (Next.js)**: Panel de administración para visualizar logs, gestionar usuarios y ubicaciones. (Puerto: `3006`)
2.  **Bot de WhatsApp (Baileys)**: Proceso independiente que maneja la comunicación con WhatsApp. (Puerto: `3007`)

---

## 🛠️ Instalación y Configuración

### 1. Requisitos Previos
- Node.js (v18 o superior)
- npm o yarn

### 2. Instalación de dependencias
```bash
npm install
```

### 3. Puertos Configurados
Este proyecto está pre-configurado para evitar conflictos de puertos:
- **Web**: `3006`
- **Bot/API Interna**: `3007`

---

## 💻 Ejecución en Desarrollo

Para poner en marcha el sistema completo, abre dos terminales:

**Terminal 1: Iniciar la Web**
```bash
npm run dev
```
Accede a: `http://localhost:3006`

**Terminal 2: Iniciar el Bot**
```bash
npm run bot
```
Sigue las instrucciones en consola para escanear el código QR desde WhatsApp.

---

## 🚢 Instrucciones de Despliegue (Producción)

Para desplegar en un servidor (VPS), se recomienda el uso de **PM2** para mantener los procesos activos.

### 1. Construir la aplicación Next.js
```bash
npm run build
```

### 2. Iniciar con PM2
Crea un archivo `ecosystem.config.js` o ejecuta directamente:

```bash
# Iniciar la plataforma web
pm2 start npm --name "kadmiel-web" -- start -- -p 3006

# Iniciar el bot de WhatsApp
pm2 start "npm run bot" --name "kadmiel-bot"
```

### 3. Consideraciones de Red
- Asegúrate de que los puertos `3006` y `3007` estén abiertos en el firewall del servidor.
- Para acceso externo seguro, se recomienda utilizar un proxy inverso como **Nginx** con certificados SSL.
- La carpeta `wa_auth` guarda la sesión de WhatsApp; asegúrate de que el proceso tenga permisos de escritura.

---

## 👥 Credenciales por Defecto (Admin)
- **Usuario**: `admin`
- **Password**: `admin`
