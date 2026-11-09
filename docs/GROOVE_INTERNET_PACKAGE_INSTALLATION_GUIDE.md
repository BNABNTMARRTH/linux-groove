# Guia de Instalacion y Gestion de Paquetes en Linux Groove OS

## 1. Vision General

Linux Groove OS esta disenado como una distribucion para produccion audiovisual, creatividad y desarrollo de alto rendimiento sobre arquitectura ARM64 (aarch64). Para que los usuarios puedan enriquecer su entorno de trabajo con cualquier programa disponible en internet, el sistema integra de manera nativa multiples vias de aprovisionamiento de software:

- Repositorios oficiales de Arch Linux ARM via **Pacman**.
- Instalacion de paquetes binarios locales (**`.pkg.tar.zst`**).
- Arch User Repository (**AUR**) via el asistente **`yay`**.
- Formatos universales sandboxed via **Flatpak** con el catalogo **Flathub**.
- Aplicaciones portables autocontenidas via **AppImage** (respaldadas por `fuse2`).
- Paquetes de distribuciones Debian/Ubuntu (**`.deb`**) mediante **`debtap`**.
- Entorno grafico de gestion de software con **KDE Discover**.
- Conectividad remota segura para mantenimiento via **OpenSSH**.

---

## 2. Pacman: Repositorios Oficiales y Paquetes Locales

### 2.1 Actualizacion e Instalacion desde Repositorios Oficiales
Para actualizar las bases de datos de paquetes e instalar software oficial:

```bash
# Sincronizar bases de datos de repositorios
sudo pacman -Sy

# Buscar un paquete en los repositorios
pacman -Ss <nombre_programa>

# Instalar un paquete
sudo pacman -S <nombre_programa>
```

### 2.2 Instalacion de Paquetes Descargados (.pkg.tar.zst)
Si descargas un paquete binario precompilado para Arch Linux ARM (`.pkg.tar.zst` o `.pkg.tar.xz`):

```bash
sudo pacman -U /ruta/al/paquete.pkg.tar.zst
```

### 2.3 Detalle Tecnico: CheckSpace en Live OverlayFS
En el modo LiveUSB/ISO, el sistema de archivos raiz se ejecuta sobre un `tmpfs` enlazado con OverlayFS sobre SquashFS. En versiones previas, la opcion `CheckSpace` en `/etc/pacman.conf` impedia la instalacion de paquetes produciendo el error:
```text
error: could not determine cachedir mount point
error: failed to commit transaction (not enough free disk space)
```
En la configuracion actual de Groove OS:
- Se comenta `#CheckSpace` en `/etc/pacman.conf` para evitar la consulta erronea de `statvfs` en el lowerdir de solo lectura.
- Se define `LocalFileSigLevel = Optional TrustAll` para permitir la instalacion de paquetes descargados sin bloqueos de firma local.
- Se mantiene `SigLevel = Required DatabaseOptional` para la seguridad de paquetes remotos oficiales.

---

## 3. AUR (Arch User Repository) via `yay`

La gran mayoria de aplicaciones modernas y comerciales para Linux (Google Chrome, Visual Studio Code, Discord, Telegram, Spotify, Cursor, Steam) residen en el repositorio comunitario AUR.

Linux Groove OS incluye el asistente `yay` preinstalado y configurado para arquitectura aarch64.

### 3.1 Uso Basico de `yay`
No se requiere ejecutar `yay` con `sudo`; el asistente solicita credenciales cuando es indispensable:

```bash
# Buscar e instalar un paquete de AUR
yay -S visual-studio-code-bin

# Actualizar todos los paquetes oficiales y de AUR
yay -Syu

# Buscar interactivamente
yay <termino_de_busqueda>
```

### 3.2 Dependencias de Compilacion
El sistema incluye `base-devel`, `git`, `curl`, `wget`, `python` y los compiladores esenciales para resolver dependencias y compilar codigo fuente de AUR de forma automatica.

---

## 4. Flatpak y Flathub

Flatpak ofrece ejecucion aislada y compatibilidad independiente del sistema base, ideal para navegadores, suites ofimaticas y clientes de comunicacion.

### 4.1 Repositorio Flathub
Groove OS registra de manera predeterminada el repositorio remoto oficial de Flathub:

```bash
# Verificar repositorios remotos configurados
flatpak remotes

# Si se necesitara registrar manualmente:
flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
```

### 4.2 Instalacion de Aplicaciones Flatpak
Desde la terminal:
```bash
# Buscar aplicaciones
flatpak search vlc

# Instalar aplicacion desde Flathub
flatpak install flathub org.videolan.VLC

# Ejecutar aplicacion instalada
flatpak run org.videolan.VLC
```

Desde el navegador:
- Al descargar un archivo `.flatpakref` desde `flathub.org`, el sistema abrira la ventana de confirmacion e instalacion correspondiente.

---

## 5. Aplicaciones Portables AppImage

Muchos desarrolladores publican binarios universales en formato `.AppImage`.

### 5.1 Requisito FUSE v2
Las especificaciones de AppImage (Type 2 runtime) requieren `libfuse.so.2`. En distribuciones modernas con FUSE3, esto genera el error `dlopen(): error loading libfuse.so.2`.
Linux Groove OS incluye el paquete `fuse2` nativo en su imagen base para garantizar retrocompatibilidad total.

### 5.2 Ejecucion de una AppImage
1. Descargar la AppImage correspondiente a la arquitectura ARM64 (`aarch64`).
2. Otorgar permisos de ejecucion y lanzar:
```bash
chmod +x aplicacion-arm64.AppImage
./aplicacion-arm64.AppImage
```

---

## 6. Paquetes Debian / Ubuntu (.deb) con `debtap`

Cuando un desarrollador solo proporciona instaladores `.deb` para arquitectura `arm64`:

1. Instalar o ejecutar `debtap`:
```bash
sudo debtap -u
debtap paquete-arm64.deb
```
2. Instalar el paquete generado:
```bash
sudo pacman -U paquete-arm64.pkg.tar.zst
```

---

## 7. Tienda Grafica: KDE Discover

Para usuarios que prefieren prescindir de la terminal:
- **KDE Discover** (`discover`) se encuentra integrado en el menu de aplicaciones de KDE Plasma 6.
- Incluye el backend `packagekit-qt6` para repositorios nativos de Arch y el modulo de integracion con **Flatpak/Flathub**.
- Permite explorar categorias (Audio, Graficos, Desarrollo, Internet), actualizar el sistema y desinstalar software con un clic.

---

## 8. Acceso Remoto para Soporte y Desarrollo (OpenSSH)

Para depuracion remota o administracion headless desde otra maquina en la red local:

- El servicio `sshd` se encuentra habilitado por defecto en el sistema.
- Usuario estandar: `groove`
- Credencial predeterminada: `groove`
- Permisos de administracion: `%wheel ALL=(ALL:ALL) NOPASSWD: ALL`

### Conexion via SSH desde el host
```bash
ssh groove@<ip_de_la_vm>
# Ejemplo: ssh groove@192.168.64.25
```

