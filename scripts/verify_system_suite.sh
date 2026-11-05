#!/usr/bin/env bash
set -e

echo "🎷 ======================================================================"
echo "   SUITE DE VERIFICACIÓN Y AUDITORÍA DE LINUX GROOVE OS v0.1.0"
echo "   The Blue Note Edition - AArch64"
echo "=========================================================================="

TERABIT_ROOT="/Volumes/Backup/linux_groove_terabit"
ISO_FILE="${TERABIT_ROOT}/iso/linux-groove-0.1.0-aarch64.iso"
KERNEL_FILE="${TERABIT_ROOT}/images/vmlinuz-6.12-groove-rt"
INITRD_FILE="${TERABIT_ROOT}/images/initramfs-6.12-groove.cpio.gz"
ENSEMBLES_DIR="${TERABIT_ROOT}/ensembles"
WORKSPACE_DIR="/Volumes/HDEXTERNO/linux_groove"

echo "  [1/4] Verificando presencia de artefactos principales..."
for f in "${ISO_FILE}" "${KERNEL_FILE}" "${INITRD_FILE}"; do
    if [ ! -f "$f" ]; then
        echo "❌ Error: Archivo faltante: $f"
        exit 1
    fi
    ls -lh "$f"
done

echo "  [2/4] Verificando presencia de los 5 Ensembles Creativos..."
for ens in jazz-audio visual-design cinema-video darkroom-photo rust-dev; do
    f="${ENSEMBLES_DIR}/${ens}.ensemble"
    if [ ! -f "$f" ]; then
        echo "❌ Error: Ensemble faltante: $f"
        exit 1
    fi
    ls -lh "$f"
done

echo "  [3/4] Calculando sumas de verificación SHA-256..."
mkdir -p "${TERABIT_ROOT}/iso"
CHECKSUM_FILE="${WORKSPACE_DIR}/SHA256SUMS.txt"
rm -f "${CHECKSUM_FILE}"

cd "${TERABIT_ROOT}"
shasum -a 256 "iso/linux-groove-0.1.0-aarch64.iso" >> "${CHECKSUM_FILE}"
shasum -a 256 "images/vmlinuz-6.12-groove-rt" >> "${CHECKSUM_FILE}"
shasum -a 256 "images/initramfs-6.12-groove.cpio.gz" >> "${CHECKSUM_FILE}"
for ens in ensembles/*.ensemble; do
    shasum -a 256 "$ens" >> "${CHECKSUM_FILE}"
done

cp -f "${CHECKSUM_FILE}" "${TERABIT_ROOT}/iso/SHA256SUMS.txt"
echo "✅ Sumas de verificación generadas en SHA256SUMS.txt:"
cat "${CHECKSUM_FILE}"

echo "  [4/4] Validando contenido interno de la ISO con Docker/xorriso..."
docker run --rm -v "${TERABIT_ROOT}/iso:/iso" linux-groove-builder /bin/bash -c "
  xorriso -indev /iso/linux-groove-0.1.0-aarch64.iso -find / -exec report_lba -- 2>&1 | head -n 30
"

echo "🎷 ======================================================================"
echo "   TODAS LAS PRUEBAS Y AUDITORÍAS COMPLETADAS EXITOSAMENTE!"
echo "=========================================================================="

