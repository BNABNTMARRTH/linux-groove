#!/usr/bin/env python3
import os
import sys
import time
import json
import urllib.request

VM_URL = "http://192.168.64.25:8080"
BASE_LOCAL = "/Volumes/HDEXTERNO/linux_groove/scripts/arch/native/files"

def wait_for_vm(timeout=60):
    print("⏳ Esperando que Linux Groove inicie...")
    start = time.time()
    while time.time() - start < timeout:
        try:
            with urllib.request.urlopen(f"{VM_URL}/status", timeout=2) as r:
                if r.status == 200:
                    data = json.loads(r.read().decode("utf-8"))
                    print(f"✅ VM Online! Kernel: {data.get('kernel', '')[:35]}...")
                    return True
        except Exception:
            time.sleep(1.5)
    return False

def exec_cmd(cmd):
    req = urllib.request.Request(f"{VM_URL}/exec",
        data=json.dumps({"cmd": cmd}).encode("utf-8"),
        headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def upload_file(local_path, remote_path):
    import gzip, base64
    with open(local_path, "rb") as f:
        gz_b64 = base64.b64encode(gzip.compress(f.read())).decode("ascii")
    exec_cmd(f"echo '{gz_b64}' | base64 -d | gunzip > '{remote_path}'")
    return {"success": True}

def sync_tree(rel_dir):
    full_local_dir = os.path.join(BASE_LOCAL, rel_dir)
    print(f"📦 Sincronizando {rel_dir}...")
    for root_dir, dirs, files in os.walk(full_local_dir):
        for f in files:
            full_p = os.path.join(root_dir, f)
            rel_p = os.path.relpath(full_p, BASE_LOCAL)
            dest_p = "/" + rel_p
            dest_dir = os.path.dirname(dest_p)
            exec_cmd(f"mkdir -p {dest_dir}")
            upload_file(full_p, dest_p)

def main():
    if not wait_for_vm():
        print("❌ Error: No se pudo conectar a la VM a tiempo.")
        sys.exit(1)

    # 1. Subir componentes de Groove
    sync_tree("usr/share/plasma/plasmoids/org.groove.mediaplayer")
    sync_tree("usr/share/plasma/plasmoids/org.groove.soundwave")
    sync_tree("usr/share/plasma/shells/org.kde.plasma.desktop")
    sync_tree("usr/lib/qt6/qml/org/kde/plasma/private/containmentlayoutmanager")

    # 2. Refrescar base de datos Sycoca
    print("🔄 Actualizando base de datos de plugins Sycoca...")
    res = exec_cmd("kbuildsycoca6 --noincremental")
    print("Sycoca:", res.get("stderr", "").strip() or "OK")

    # 3. Detectar socket Wayland activo del usuario groove
    res_sock = exec_cmd("ls /run/user/1000/wayland-* 2>/dev/null")
    sock_path = res_sock.get("stdout", "").strip().split("\n")[0]
    sock_name = os.path.basename(sock_path) if sock_path else "wayland-0"
    print(f"🖥️ Socket gráfico detectado: {sock_name}")

    # 4. Despertar pantalla y desactivar salvapantallas
    exec_cmd("kscreen-doctor --dpms on 2>/dev/null")
    exec_cmd("sudo -u groove qdbus6 org.freedesktop.ScreenSaver /ScreenSaver org.freedesktop.ScreenSaver.SetActive false 2>/dev/null")

    # 5. Desplegar plasmawindowed org.groove.mediaplayer
    print("🚀 Levantando en caliente Groove Media Player...")
    exec_cmd("killall plasmawindowed 2>/dev/null")
    time.sleep(0.5)
    launch_cmd = f"sudo -u groove XDG_RUNTIME_DIR=/run/user/1000 WAYLAND_DISPLAY={sock_name} DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus nohup plasmawindowed org.groove.mediaplayer >/tmp/groove_mediaplayer.log 2>&1 &"
    res_launch = exec_cmd(launch_cmd)
    print("Lanzamiento:", res_launch)

    time.sleep(2.5)

    # 6. Capturar pantalla
    print("📸 Tomando captura en vivo...")
    shot_cmd = f"sudo -u groove XDG_RUNTIME_DIR=/run/user/1000 WAYLAND_DISPLAY={sock_name} DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus spectacle -b -f -o /tmp/live_groove_player.png; base64 /tmp/live_groove_player.png"
    shot_res = exec_cmd(shot_cmd)
    
    b64_data = shot_res.get("stdout", "").strip()
    if b64_data:
        import base64
        out_png = "/Users/benavente/.gemini/antigravity/brain/b14eba9a-15cf-4911-99ca-6d1a6faa801e/live_screenshot_groove_player_active.png"
        try:
            with open(out_png, "wb") as f:
                f.write(base64.b64decode(b64_data))
            print(f"✨ Captura guardada con éxito en: {out_png}")
        except Exception as e:
            print("Error decodificando imagen:", e)
    else:
        print("Aviso: spectacle no retornó datos en base64 directamente.")

if __name__ == "__main__":
    main()

