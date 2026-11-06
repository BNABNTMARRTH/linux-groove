# Especificación 014 — Groove nativo: Arch ARM, Plasma, A/B y audio

Estado: diseñado e implementado en `scripts/arch/native`; pendiente de validación en UTM.

La imagen instalada se construye desde una raíz limpia de Arch Linux ARM con
paquetes firmados y actualización completa. `systemd` es PID 1; `logind`, SDDM,
NetworkManager, Plasma Wayland y PipeWire/WirePlumber son servicios nativos.
Wayfire es una sesión alternativa. No se instala `groove-init`, un compositor
secundario ni una copia de `/opt/groove-wayfire`.

## Sesiones y diseño

Plasma usa Breeze, panel superior y panel inferior flotante inicializados solo
para perfiles nuevos. Wayfire usa `wf-shell` y los portales wlroots/GTK. Ambos
consumen `usr/share/groove/design.json`: carbón `#202124`, herramientas `#353535`,
contenido `#15181e`, texto `#e8e6e0`, acento `#d4af37`, Inter con DejaVu Sans,
antialias en escala de grises y hinting ligero. Las preferencias existentes no
se sobrescriben. Brave, ONLYOFFICE y otras cabeceras propias conservan su
decoración y se documentan como diferencias.

Estable desactiva blur y deformaciones. Expresivo habilita efectos nativos
compatibles. Estudio coordina efectos mínimos con PipeWire a 48 kHz/256
muestras. `groove-profile restore` recupera el estado anterior.

## Disco instalado y A/B

Una imagen UEFI nueva tiene ESP de 1 GiB, dos particiones raíz de 16 GiB con
tipo GPT root-ARM64 y una partición `groove-state` para `/home`, logs e identidad.
La ranura activa se monta de solo lectura; `/etc` y `/var` tienen estado por
versión. UKI y raíz comparten versión. `systemd-sysupdate` actualiza solo la
ranura inactiva, verifica el manifiesto firmado, conserva dos instancias y
configura tres intentos de arranque. `groove-update confirm` exige servicios
esenciales y un marcador de sesión gráfica antes de bendecir el arranque.
`rollback` selecciona la versión anterior sin tocar documentos.

La ISO Live no ejecuta actualizaciones A/B. El servicio público de imágenes no
forma parte de esta entrega; las pruebas usan un repositorio firmado local.

## Audio y evidencia

PipeWire ofrece perfil UTM conservador 48 kHz/1024 y Estudio 48 kHz/256;
128/64 se caracterizan sin convertirlos en predeterminados. RTKit proporciona
prioridad de procesamiento sin conceder límites RT generales a `wheel`.
PREEMPT_RT es una variante posterior. Cada resultado registra entorno,
dispositivo, frecuencia, búfer, carga, duración, xruns y quantum; “cero xruns
observados” solo describe esa prueba.

La matriz de aceptación exige diez arranques y sesiones por escritorio, ratón
en 25 puntos con desfase lógico máximo de dos píxeles, p95 de cuadro ≤33 ms a
1080p/60, dos horas de uso combinado, fallos de actualización y una hora de
audio conservador. Sin esos registros el requisito permanece pendiente.
