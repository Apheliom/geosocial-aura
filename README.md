# 📡 GEOSOCIAL — Cyberpunk social network & telemetry monitor

GeoSocial is a dark-neon cyberpunk styled social networking and telemetry monitoring dashboard designed for Lara state municipalities. Users can monitor network status, share telemetry reports, sintonize node locations, send auto-destructive messages, crowdsource utility polling, and browse proximal node signals.

---

## 🚀 Características Cyberpunk

- **Matriz de Data Drops:** Publicaciones encriptadas y limitadas por radio físico. Los usuarios fuera de rango deben "sintonizar" su nodo para descifrar la señal.
- **Sintetizador Web Audio API:** Efectos de sonido cyberpunk generados en tiempo real (clics, alertas, glitches, sirenas). Sin descargas de archivos de audio externos.
- **Visualizador de Espectro Neón:** Barra superior dinámica con canvas osciloscopio que dibuja la frecuencia del sintetizador y se aplana en silencio (flatline).
- **Modo Nodo Fantasma (Ghost Mode):** Oculta tu identidad, reemplaza avatares por estática holográfica y anonimiza tu geolocalización en el mapa estatal.
- **Mensajes Autodestruibles (Burn Notes):** Chat directo con temporizadores físicos. Al expirar, los mensajes sufren una degradación glitch visual antes de ser purgados de la base de datos permanentemente.
- **Alerta Sirena de Emergencia:** Reportes críticos del sector disparan un parpadeo de crisis generalizado y alertas sonoras a todos los clientes activos.

---

## 🛠️ Instalación y Uso Local

1. Clona el repositorio.
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Inicia la aplicación:
   ```bash
   npm start
   ```
4. Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 🌐 Despliegue en Render (Render.com)

Para desplegar esta aplicación de forma gratuita y que funcione de inmediato en **Render**:

1. Crea un servicio **Web Service** en tu panel de Render.
2. Vincula tu repositorio de GitHub.
3. Configura los siguientes parámetros en Render:
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Render inyectará el puerto dinámico necesario (`process.env.PORT`) automáticamente, y el servidor se enlazará correctamente a la dirección pública.

> [!NOTE]
> La aplicación utiliza **SQLite3** para almacenar usuarios, chats y reportes. En la capa gratuita de Render, el sistema de archivos es efímero. Esto significa que la base de datos se reiniciará cuando el contenedor se duerma o se vuelva a desplegar. Para evitar esto, puedes asociar un **Persistent Disk** en Render y configurar la base de datos para guardarse en dicho volumen.
