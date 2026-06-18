# Even Now Playing para Even G2

Plugin experimental para Even Hub / Even G2.

Lo que ya hace:

- Corre como app web compatible con Even Hub.
- Dibuja una pantalla "Now Playing" pensada para el display 576 x 288 de G2.
- Usa el SDK oficial `@evenrealities/even_hub_sdk`.
- Empaqueta correctamente como `.ehpk`.
- Incluye una companion app Android que lee YouTube Music con `MediaSession`.
- Expone un puente local en el teléfono: `http://127.0.0.1:8765`.

Arquitectura:

```text
YouTube Music
  -> Android MediaSession
  -> Even Now Playing companion app
  -> http://127.0.0.1:8765
  -> Even Hub plugin
  -> Even G2
```

## Dependencias instaladas

Node está instalado localmente dentro del proyecto, no en todo el sistema:

```bash
.tools/node-v24.16.0-darwin-arm64/bin/node --version
```

Paquetes instalados:

- `@evenrealities/even_hub_sdk`
- `@evenrealities/evenhub-cli`
- `@evenrealities/evenhub-simulator`
- `vite`
- `typescript`

Tooling Android local instalado:

- JDK 21 en `.tools/jdk-21`
- Gradle 8.10.2 en `.tools/gradle-8.10.2`
- Android SDK en `.tools/android-sdk`

## Comandos

Antes de correr comandos, activa el Node local:

```bash
export PATH="$PWD/.tools/node-v24.16.0-darwin-arm64/bin:$PATH"
```

Arrancar el plugin para probarlo desde el teléfono:

```bash
npm run dev
```

URL actual detectada en esta red:

```text
http://192.168.1.79:5173/
```

Generar QR para abrirlo desde Even Hub:

```bash
npx evenhub qr --url http://192.168.1.79:5173/
```

Compilar:

```bash
npm run build
```

Empaquetar:

```bash
npm run pack
```

Archivo generado:

```text
even-now-playing.ehpk
```

Companion APK generado:

```text
app/build/outputs/apk/debug/app-debug.apk
```

Tambien se sirve por Vite para instalarlo desde Android:

```text
http://192.168.1.79:5173/even-now-playing-companion-debug.apk
```

## Instalar la companion app Android

1. En el Mac, deja corriendo:

```bash
export PATH="$PWD/.tools/node-v24.16.0-darwin-arm64/bin:$PATH"
npm run dev
```

2. En Android, abre Chrome y visita:

```text
http://192.168.1.79:5173/even-now-playing-companion-debug.apk
```

3. Android te va a pedir permitir instalar apps desconocidas desde Chrome. Permítelo solo para esta instalación.
4. Instala la app "Even Now Playing".
5. Abre la app.
6. Toca "Open notification access".
7. Activa el acceso para "Even Now Playing".
8. Abre YouTube Music y reproduce una canción.

El puente local queda disponible dentro del teléfono:

```text
http://127.0.0.1:8765/health
http://127.0.0.1:8765/now-playing
http://127.0.0.1:8765/command/next
http://127.0.0.1:8765/command/previous
http://127.0.0.1:8765/command/play-pause
```

## Activar Developer Mode en Even Hub

Si no ves "Developer Center", "Developer Hub" o "Scan QR" en la app de Android,
primero activa Developer Mode:

1. En el teléfono o en el Mac, abre:

```text
https://hub.evenrealities.com/login
```

2. Inicia sesión con la misma cuenta que usas en la app de Even Realities.
3. En Android, fuerza el cierre de la app Even Realities.
4. Vuelve a abrir la app.
5. Entra al tab Even Hub.
6. Busca la sección developer en la esquina superior derecha.

Según la documentación oficial, esa sección es la que desbloquea QR sideload y pruebas locales.

## Pasos para meterlo en tus G2 después de activar Developer Mode

1. Asegúrate de que el Mac y tu Android estén en la misma Wi-Fi.
2. En el Mac, desde esta carpeta, corre:

```bash
export PATH="$PWD/.tools/node-v24.16.0-darwin-arm64/bin:$PATH"
npm run dev
```

3. Abre la app de Even Realities / Even Hub en Android.
4. Entra a Even Hub -> Developer Center / Developer Hub.
5. Usa el scanner QR integrado.
6. Genera el QR:

```bash
npx evenhub qr --url http://192.168.1.79:5173/
```

7. Escanéalo desde la app de Even.
8. Abre el plugin en los lentes.

Cuando todo está conectado:

- Si la companion app no está abierta/autorizada, el plugin dice "Companion app no detectada".
- Si la companion app está activa pero YouTube Music no tiene sesión, dice "Abre YouTube Music".
- Si YouTube Music está reproduciendo, aparece título/artista y los controles mandan comandos reales.

Si cambia tu IP local, vuelve a detectarla con:

```bash
ipconfig getifaddr en0
```

y reemplaza `192.168.1.79` en el comando del QR.

## Compilar Android manualmente

```bash
export JAVA_HOME="$PWD/.tools/jdk-21"
export ANDROID_SDK_ROOT="$PWD/.tools/android-sdk"
export PATH="$JAVA_HOME/bin:$PWD/.tools/gradle-8.10.2/bin:$ANDROID_SDK_ROOT/platform-tools:$PATH"
gradle assembleDebug
```

## Reinstalar por ADB, si conectas el celular por USB

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```
