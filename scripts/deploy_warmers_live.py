#!/usr/bin/env python3
import time
import json
import urllib.request

VM_URL = "http://192.168.64.25:8080"
HOST_URL = "http://192.168.64.1:8999"

def exec_cmd(cmd):
    req = urllib.request.Request(
        f"{VM_URL}/exec",
        data=json.dumps({"cmd": cmd}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def main():
    print("[INIT] Desplegando optimizadores Rust directamente desde host HTTP...")

    commands = [
        # Descarga de binarios usando reemplazo atomico (evita 'Text file busy')
        f"curl -fsSL {HOST_URL}/usr/bin/groove-warmer -o /tmp/groove-warmer && chmod 755 /tmp/groove-warmer && mv -f /tmp/groove-warmer /usr/bin/groove-warmer",
        f"curl -fsSL {HOST_URL}/usr/bin/groove-launch -o /tmp/groove-launch && chmod 755 /tmp/groove-launch && mv -f /tmp/groove-launch /usr/bin/groove-launch",
        f"curl -fsSL {HOST_URL}/usr/bin/groove-boostd -o /tmp/groove-boostd && chmod 755 /tmp/groove-boostd && mv -f /tmp/groove-boostd /usr/bin/groove-boostd",
        f"curl -fsSL {HOST_URL}/usr/lib/libgroove_fast.so -o /tmp/libgroove_fast.so && chmod 755 /tmp/libgroove_fast.so && mv -f /tmp/libgroove_fast.so /usr/lib/libgroove_fast.so",

        # Sysctl de baja latencia interactiva
        f"curl -fsSL {HOST_URL}/etc/sysctl.d/99-groove-lowlatency.conf -o /etc/sysctl.d/99-groove-lowlatency.conf",
        "sysctl --system",

        # Autostart y servicio systemd user
        "mkdir -p /etc/xdg/autostart /usr/lib/systemd/user",
        f"curl -fsSL {HOST_URL}/etc/xdg/autostart/groove-warmer.desktop -o /etc/xdg/autostart/groove-warmer.desktop && chmod 644 /etc/xdg/autostart/groove-warmer.desktop",
        f"curl -fsSL {HOST_URL}/usr/lib/systemd/user/groove-warmer.service -o /usr/lib/systemd/user/groove-warmer.service",

        # Actualizar launcher de Dolphin en el sistema
        "sed -i 's|^Exec=dolphin|Exec=groove-launch dolphin|' /usr/share/applications/org.kde.dolphin.desktop",
    ]

    for cmd in commands:
        res = exec_cmd(cmd)
        if not res.get("success", False):
            print(f"[ERROR] Fallo en comando: {cmd}\n{res}")
            return
        print(f"[OK] {cmd[:60]}...")

    # Ejecutar groove-boostd
    print("\n[BOOSTD] Ejecutando groove-boostd (precarga de RAM ELF)...")
    res_boost = exec_cmd("/usr/bin/groove-boostd")
    print(f"[BOOSTD] Salida:\n{res_boost.get('stdout', '').strip()}")

    # Asegurar que LD_PRELOAD incluye libgroove_fast.so
    exec_cmd("grep -q libgroove_fast.so /etc/ld.so.preload 2>/dev/null || echo '/usr/lib/libgroove_fast.so' >> /etc/ld.so.preload")

    # Iniciar groove-warmer en segundo plano en la sesion grafica
    print("\n[WARMER] Arrancando groove-warmer daemon...")
    exec_cmd("pkill -9 groove-warmer || true")
    exec_cmd("su - groove -c 'export WAYLAND_DISPLAY=wayland-1 XDG_RUNTIME_DIR=/run/user/1000 DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus; nohup /usr/bin/groove-warmer >/tmp/groove-warmer.log 2>&1 &'")
    time.sleep(1.0)

    # Verificar proceso
    res_ps = exec_cmd("ps -ef | grep groove-warmer | grep -v grep")
    print(f"[STATUS] Proceso groove-warmer:\n{res_ps.get('stdout', '').strip()}")

    # Verificar socket
    res_sock = exec_cmd("ls -la /run/user/1000/groove-warmer.sock")
    print(f"[SOCKET] Socket UNIX:\n{res_sock.get('stdout', '').strip()}")

    # Benchmark: lanzar ventana con groove-launch
    print("\n[BENCHMARK] Probando apertura instantanea con groove-launch dolphin...")
    res_launch = exec_cmd("su - groove -c 'export WAYLAND_DISPLAY=wayland-1 XDG_RUNTIME_DIR=/run/user/1000 DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus; time /usr/bin/groove-launch dolphin /home/groove'")
    print(f"[BENCHMARK] Salida groove-launch:\n{res_launch.get('stdout', '').strip()}\n{res_launch.get('stderr', '').strip()}")

if __name__ == "__main__":
    main()
