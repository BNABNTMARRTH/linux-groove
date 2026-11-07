import QtQuick
import QtQuick.Layouts
import QtQuick.Controls as QQC2
import QtQuick.Effects as Effects
import org.kde.kirigami as Kirigami
import org.kde.plasma.core as PlasmaCore
import org.kde.plasma.extras as PlasmaExtras
import org.kde.plasma.plasmoid
import org.kde.plasma.components as PlasmaComponents
import org.kde.plasma.plasma5support as Plasma5Support
import org.kde.plasma.private.mpris as Mpris

PlasmaExtras.Representation {
    id: expandedRoot

    implicitWidth: Kirigami.Units.gridUnit * 21
    implicitHeight: Kirigami.Units.gridUnit * 16.5
    collapseMarginsHint: true
    focus: true

    // Herencia directa del esquema de color de ventana del sistema (cambia en vivo entre Claro y Oscuro)
    Kirigami.Theme.colorSet: Kirigami.Theme.Window
    Kirigami.Theme.inherit: false

    readonly property var player: root.currentMprisPlayer
    readonly property bool isPlaying: player ? (player.playbackStatus === Mpris.PlaybackStatus.Playing || player.playbackStatus === 2 || player.playbackStatus === "Playing") : false

    // Estado de volumen real sincronizado con PipeWire + MPRIS
    property real systemVolume: 0.80
    property bool systemMuted: false

    // Motor de reloj monotónico real (Anchor Clock) para avance 100% fluido y sin deriva
    property real livePosition: 0
    property real anchorPositionUs: 0
    property double anchorTimestampMs: 0
    property bool disablePositionUpdate: false
    property real lastMprisPosition: -1
    property string lastTrackTitle: ""
    property int lengthProbeAttempts: 0

    // Caché persistente de duración de pista (evita que Firefox al pausar borre mpris:length a 0 y distorsione la barra)
    property real knownTrackLength: 0
    readonly property real effectiveLength: (player && player.length > 0) ? player.length : knownTrackLength

    // Alturas en tiempo real para las 5 barras de ecualizador y energía real de PipeWire
    property var barHeights: [3.0, 3.0, 3.0, 3.0, 3.0]
    property var realAudioBands: [0.85, 0.55, 0.50, 0.65, 0.80]
    property real realAudioEnergy: 0.75
    property real wavePhase: 0.0

    function updateKnownLength() {
        if (expandedRoot.player && expandedRoot.player.length && expandedRoot.player.length > 0) {
            if (expandedRoot.knownTrackLength !== expandedRoot.player.length) {
                expandedRoot.knownTrackLength = expandedRoot.player.length;
                var safeTitle = (expandedRoot.player.track || "").replace(/'/g, "").replace(/\n/g, " ");
                audioExec.connectSource("printf '%s\\t%s\\n' '" + safeTitle + "' '" + Math.round(expandedRoot.knownTrackLength) + "' > /tmp/groove_mpris_length_cache");
            }
        } else if (expandedRoot.knownTrackLength <= 0 && expandedRoot.player) {
            audioExec.connectSource("cat /tmp/groove_mpris_length_cache 2>/dev/null # GROOVE_LEN_CACHE");
        }
    }

    function reanchorPosition(newPosUs) {
        expandedRoot.anchorPositionUs = Math.max(0, newPosUs);
        expandedRoot.anchorTimestampMs = Date.now();
        expandedRoot.livePosition = expandedRoot.anchorPositionUs;
    }

    function syncPositionFromMpris(forceSnap) {
        if (!expandedRoot.player) {
            expandedRoot.livePosition = 0;
            expandedRoot.anchorPositionUs = 0;
            expandedRoot.anchorTimestampMs = Date.now();
            expandedRoot.lastMprisPosition = -1;
            return;
        }
        expandedRoot.updateKnownLength();
        if (expandedRoot.disablePositionUpdate || progressSlider.pressed) {
            return;
        }
        var reported = expandedRoot.player.position || 0;
        // Ignorar el falso Position=0 que Firefox emite cuando YouTube limpia setPositionState(null) tras un Seek o en Pausa
        if (reported <= 0 && expandedRoot.anchorPositionUs > 3000000 && (!expandedRoot.player.length || expandedRoot.player.length <= 0)) {
            return;
        }
        if (forceSnap || Math.abs(reported - expandedRoot.lastMprisPosition) > 50000) {
            expandedRoot.lastMprisPosition = reported;
            expandedRoot.reanchorPosition(reported);
        }
    }

    // Ejecuta Seek absoluto garantizando que mpris:length esté activo en Firefox/YouTube antes y después de SetPosition
    function applySeekPosition(targetUs) {
        if (!expandedRoot.player || !expandedRoot.player.canSeek) {
            expandedRoot.disablePositionUpdate = false;
            return;
        }
        var clampedUs = Math.max(0, Math.round(targetUs));
        if (expandedRoot.effectiveLength > 0 && clampedUs > expandedRoot.effectiveLength) {
            clampedUs = Math.round(expandedRoot.effectiveLength);
        }
        expandedRoot.disablePositionUpdate = true;
        expandedRoot.lastMprisPosition = clampedUs;
        expandedRoot.reanchorPosition(clampedUs);
        seekReleaseGuardTimer.restart();

        // 1. Vía estándar libkmpris (para reproductores de escritorio con mpris:trackid y mpris:length permanentes)
        expandedRoot.player.position = clampedUs;

        // 2. Vía D-Bus para Firefox/YouTube: restaura mpris:length si YouTube limpió setPositionState(null), aplica SetPosition(/org/mpris/MediaPlayer2/firefox) y re-sincroniza MediaSession
        audioExec.connectSource(
            "bash -c 'for s in $(qdbus6 2>/dev/null | grep -E \"org\\.mpris\\.MediaPlayer2\\.firefox\"); do "
            + "st=$(qdbus6 \"$s\" /org/mpris/MediaPlayer2 org.mpris.MediaPlayer2.Player.PlaybackStatus 2>/dev/null); "
            + "len=$(qdbus6 \"$s\" /org/mpris/MediaPlayer2 org.mpris.MediaPlayer2.Player.Metadata 2>/dev/null | grep mpris:length); "
            + "if [ -z \"$len\" ]; then "
            + "  qdbus6 \"$s\" /org/mpris/MediaPlayer2 org.mpris.MediaPlayer2.Player.Pause >/dev/null 2>&1; "
            + "  qdbus6 \"$s\" /org/mpris/MediaPlayer2 org.mpris.MediaPlayer2.Player.Play >/dev/null 2>&1; "
            + "  sleep 0.14; "
            + "fi; "
            + "dbus-send --session --type=method_call --dest=\"$s\" /org/mpris/MediaPlayer2 "
            + "org.mpris.MediaPlayer2.Player.SetPosition objpath:/org/mpris/MediaPlayer2/firefox int64:" + clampedUs + " >/dev/null 2>&1; "
            + "sleep 0.22; "
            + "len2=$(qdbus6 \"$s\" /org/mpris/MediaPlayer2 org.mpris.MediaPlayer2.Player.Metadata 2>/dev/null | grep mpris:length); "
            + "if [ -z \"$len2\" ]; then "
            + "  qdbus6 \"$s\" /org/mpris/MediaPlayer2 org.mpris.MediaPlayer2.Player.Pause >/dev/null 2>&1; "
            + "  if [ \"$st\" = \"Playing\" ]; then "
            + "    qdbus6 \"$s\" /org/mpris/MediaPlayer2 org.mpris.MediaPlayer2.Player.Play >/dev/null 2>&1; "
            + "  fi; "
            + "fi; "
            + "done' # GROOVE_SEEK"
        );
    }

    // Motor de comandos para sincronizar volumen del sistema (PipeWire), nivel RMS real y Dock OSD nativo de KDE
    Plasma5Support.DataSource {
        id: audioExec
        engine: "executable"
        connectedSources: []
        onNewData: (sourceName, data) => {
            var out = data["stdout"] ? data["stdout"].trim() : "";
            if (sourceName.indexOf("get-volume") !== -1 && out.indexOf("Volume:") !== -1) {
                var parts = out.split(" ");
                if (parts.length >= 2) {
                    var parsed = parseFloat(parts[1]);
                    if (!isNaN(parsed) && !volumeSlider.pressed) {
                        expandedRoot.systemVolume = Math.min(1.0, Math.max(0.0, parsed));
                    }
                }
                expandedRoot.systemMuted = (out.indexOf("[MUTED]") !== -1);
            } else if (sourceName.indexOf("GROOVE_EQ") !== -1 && out !== "") {
                var vals = out.split(",");
                if (vals.length === 5) {
                    var b0 = parseFloat(vals[0]);
                    var b1 = parseFloat(vals[1]);
                    var b2 = parseFloat(vals[2]);
                    var b3 = parseFloat(vals[3]);
                    var b4 = parseFloat(vals[4]);
                    if (!isNaN(b0) && !isNaN(b1) && !isNaN(b2) && !isNaN(b3) && !isNaN(b4)) {
                        expandedRoot.realAudioBands = [b0, b1, b2, b3, b4];
                        expandedRoot.realAudioEnergy = Math.max(0.25, (b0 + b1 + b2 + b3 + b4) / 5.0);
                    }
                }
            } else if (sourceName.indexOf("GROOVE_LEN_CACHE") !== -1 && out !== "") {
                var tabParts = out.split("\t");
                if (tabParts.length >= 2) {
                    var cachedTitle = tabParts[0].trim();
                    var cachedLen = parseFloat(tabParts[1]);
                    var curTitle = (expandedRoot.player && expandedRoot.player.track) ? expandedRoot.player.track.trim() : "";
                    if (!isNaN(cachedLen) && cachedLen > 0 && (curTitle === "" || cachedTitle === curTitle)) {
                        expandedRoot.knownTrackLength = cachedLen;
                    }
                }
            }
            disconnectSource(sourceName);
        }
    }

    function refreshSystemVolume() {
        audioExec.connectSource("wpctl get-volume @DEFAULT_AUDIO_SINK@");
    }

    function setRealVolume(val) {
        var clamped = Math.min(1.0, Math.max(0.0, val));
        expandedRoot.systemVolume = clamped;
        expandedRoot.systemMuted = (clamped <= 0.005);
        audioExec.connectSource("wpctl set-mute @DEFAULT_AUDIO_SINK@ 0 && wpctl set-volume @DEFAULT_AUDIO_SINK@ " + clamped.toFixed(2));
        if (player && player.canControl) {
            player.volume = clamped;
        }
    }

    function showNativeOsd(pct) {
        var appName = (expandedRoot.player && expandedRoot.player.identity) ? expandedRoot.player.identity : "Mozilla firefox";
        var safeAppName = appName.replace(/"/g, "");
        // Icono nativo exacto de libkmpris: player.iconName o "emblem-music-symbolic" (nota musical 🎵)
        var osdIcon = (expandedRoot.player && expandedRoot.player.iconName && expandedRoot.player.iconName !== "")
            ? expandedRoot.player.iconName
            : "emblem-music-symbolic";
        audioExec.connectSource(
            "qdbus6 org.kde.plasmashell /org/kde/osdService org.kde.osdService.mediaPlayerVolumeChanged "
            + pct + " \"" + safeAppName + "\" \"" + osdIcon + "\""
        );
    }

    // Ajusta volumen y muestra el Dock Flotante (OSD) nativo de KDE Plasma con icono de nota musical
    function adjustVolumeWithOsd(deltaStep) {
        var baseVol = expandedRoot.systemMuted ? 0.0 : expandedRoot.systemVolume;
        var nextVol = Math.min(1.0, Math.max(0.0, baseVol + deltaStep));
        expandedRoot.setRealVolume(nextVol);
        var pct = Math.round(nextVol * 100);
        expandedRoot.showNativeOsd(pct);
    }

    function toggleMute() {
        expandedRoot.systemMuted = !expandedRoot.systemMuted;
        audioExec.connectSource("wpctl set-mute @DEFAULT_AUDIO_SINK@ toggle");
        var pct = expandedRoot.systemMuted ? 0 : Math.round(expandedRoot.systemVolume * 100);
        expandedRoot.showNativeOsd(pct);
    }

    // Formateador de tiempo inteligente (H:MM:SS si dura más de 1 hora, M:SS si es menor)
    function formatTime(microSeconds, forceHours) {
        if (!microSeconds || microSeconds <= 0) return forceHours ? "0:00:00" : "0:00";
        var totalSec = Math.floor(microSeconds / 1000000);
        var hrs = Math.floor(totalSec / 3600);
        var min = Math.floor((totalSec % 3600) / 60);
        var sec = totalSec % 60;
        var secStr = (sec < 10 ? "0" : "") + sec;
        if (hrs > 0 || forceHours) {
            var minStr = (min < 10 ? "0" : "") + min;
            return hrs + ":" + minStr + ":" + secStr;
        }
        return min + ":" + secStr;
    }

    // Motor de animación en tiempo real para las 5 barras de onda de sonido (55ms = ~18 FPS fluidos)
    Timer {
        id: waveAnimTimer
        interval: 55
        repeat: true
        running: expandedRoot.visible
        property int probeTick: 0
        onTriggered: {
            if (!expandedRoot.isPlaying || expandedRoot.systemMuted || expandedRoot.systemVolume <= 0.01) {
                // Colapsar suavemente hacia los 5 puntos cuadrados de 3.0px (▪ ▪ ▪ ▪ ▪)
                var collapsed = [];
                var needsUpdate = false;
                for (var c = 0; c < 5; c++) {
                    var curH = expandedRoot.barHeights[c] || 3.0;
                    var nextH = curH + (3.0 - curH) * 0.45;
                    if (Math.abs(nextH - 3.0) < 0.15) nextH = 3.0;
                    if (nextH !== curH) needsUpdate = true;
                    collapsed.push(nextH);
                }
                if (needsUpdate) {
                    expandedRoot.barHeights = collapsed;
                }
                return;
            }

            expandedRoot.wavePhase += 0.42;
            var p = expandedRoot.wavePhase;
            // Contraste alto entre barras (de 3.5px a 16px) para que el movimiento en vivo sea súper expresivo
            var env = expandedRoot.realAudioBands;
            var volScale = Math.max(0.65, Math.min(1.0, expandedRoot.systemVolume * 1.4));

            var w0 = Math.pow(Math.abs(Math.sin(p * 1.10 + 0.0)), 1.3);
            var w1 = Math.pow(Math.abs(Math.sin(p * 1.55 + 1.4)), 1.4);
            var w2 = Math.pow(Math.abs(Math.sin(p * 1.85 + 2.9)), 1.5);
            var w3 = Math.pow(Math.abs(Math.sin(p * 1.35 + 0.9)), 1.4);
            var w4 = Math.pow(Math.abs(Math.sin(p * 1.20 + 2.3)), 1.3);

            var rawWaves = [w0, w1, w2, w3, w4];
            var nextBars = [];
            for (var i = 0; i < 5; i++) {
                var bandGain = (env && env.length === 5) ? env[i] : 0.85;
                var combined = (rawWaves[i] * 0.82 + bandGain * 0.18) * volScale;
                var targetHeight = 3.2 + Math.min(1.0, Math.max(0.0, combined)) * 13.0;
                var prevHeight = expandedRoot.barHeights[i] || 3.0;
                nextBars.push(prevHeight + (targetHeight - prevHeight) * 0.65);
            }
            expandedRoot.barHeights = nextBars;

            // Cada ~440ms muestrea la energía real del sink de PipeWire para modular las 5 bandas con el audio real
            probeTick = (probeTick + 1) % 8;
            if (probeTick === 0) {
                audioExec.connectSource(
                    "python3 -c 'import subprocess,struct,math; "
                    + "p=subprocess.Popen([\"pw-record\",\"-P\",\"{ stream.capture.sink=true }\",\"--rate=8000\",\"--channels=1\",\"--format=s16\",\"-\"],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL); "
                    + "raw=p.stdout.read(2400); p.terminate(); "
                    + "s=struct.unpack(\"<%dh\"%(len(raw)//2),raw[:len(raw)//2*2])[-400:] if len(raw)>=800 else [0]*100; "
                    + "chunks=[s[i*80:(i+1)*80] for i in range(5)]; "
                    + "vals=[min(1.0,max(0.25,math.sqrt(sum(x*x for x in c)/max(1,len(c)))/1800.0)) for c in chunks]; "
                    + "print(\"%.2f,%.2f,%.2f,%.2f,%.2f\"%tuple(vals))' # GROOVE_EQ"
                );
            }
        }
    }

    // Timer de avance en tiempo real (100ms) basado en reloj monotónico sin deriva
    Timer {
        id: positionPollTimer
        interval: 100
        repeat: true
        running: expandedRoot.isPlaying && expandedRoot.visible
        property int tickCount: 0
        onTriggered: {
            if (!expandedRoot.player) return;
            expandedRoot.updateKnownLength();
            if (expandedRoot.anchorTimestampMs <= 0 || (expandedRoot.livePosition === 0 && expandedRoot.player.position > 0)) {
                expandedRoot.syncPositionFromMpris(true);
            }
            if (!expandedRoot.disablePositionUpdate && !progressSlider.pressed) {
                var rate = (expandedRoot.player.rate && expandedRoot.player.rate > 0) ? expandedRoot.player.rate : 1.0;
                var maxLen = expandedRoot.effectiveLength;
                var elapsedUs = (Date.now() - expandedRoot.anchorTimestampMs) * 1000.0 * rate;
                var nextPos = expandedRoot.anchorPositionUs + elapsedUs;
                if (maxLen > 0 && nextPos > maxLen) {
                    nextPos = maxLen;
                }
                expandedRoot.livePosition = nextPos;
            }
            tickCount = (tickCount + 1) % 20; // Cada 2 segundos solicita alineación silenciosa con D-Bus
            if (tickCount === 0 && typeof expandedRoot.player.updatePosition === "function") {
                expandedRoot.player.updatePosition();
            }
        }
    }

    // Cola de actualización en tiempo real para Seek (100ms throttle = 10 Hz durante arrastre)
    Timer {
        id: queuedPositionUpdate
        interval: 100
        repeat: false
        onTriggered: {
            expandedRoot.applySeekPosition(progressSlider.value);
        }
    }

    Timer {
        id: seekReleaseGuardTimer
        interval: 900
        repeat: false
        onTriggered: {
            if (!progressSlider.pressed) {
                expandedRoot.disablePositionUpdate = false;
                if (expandedRoot.player && typeof expandedRoot.player.updatePosition === "function") {
                    expandedRoot.player.updatePosition();
                }
            }
        }
    }

    // Sincronización periódica ligera de volumen con el sistema
    Timer {
        id: volumePollTimer
        interval: 2000
        repeat: true
        running: expandedRoot.visible && !volumeSlider.pressed
        triggeredOnStart: true
        onTriggered: expandedRoot.refreshSystemVolume()
    }

    // Sondeo no intrusivo de duración para transiciones de YouTube/Firefox (sin pausar audio)
    Timer {
        id: firefoxLengthProbeTimer
        interval: 400
        repeat: true
        running: false
        onTriggered: {
            expandedRoot.lengthProbeAttempts++;
            if (expandedRoot.player) {
                if (typeof expandedRoot.player.updatePosition === "function") {
                    expandedRoot.player.updatePosition();
                }
                if (expandedRoot.player.length && expandedRoot.player.length > 0) {
                    expandedRoot.updateKnownLength();
                    firefoxLengthProbeTimer.stop();
                    expandedRoot.reanchorPosition(expandedRoot.player.position || 0);
                    return;
                }
            }
            if (expandedRoot.lengthProbeAttempts >= 10) {
                firefoxLengthProbeTimer.stop();
            }
        }
    }

    Connections {
        target: expandedRoot.player
        function onPositionChanged() {
            if (!expandedRoot.disablePositionUpdate && !progressSlider.pressed) {
                expandedRoot.syncPositionFromMpris(false);
            }
        }
        function onLengthChanged() {
            expandedRoot.updateKnownLength();
        }
        function onPlaybackStatusChanged() {
            expandedRoot.updateKnownLength();
            if (expandedRoot.player && typeof expandedRoot.player.updatePosition === "function") {
                expandedRoot.player.updatePosition();
            }
            if (!expandedRoot.disablePositionUpdate && !progressSlider.pressed) {
                expandedRoot.reanchorPosition(expandedRoot.player ? (expandedRoot.player.position || expandedRoot.livePosition) : 0);
                expandedRoot.syncPositionFromMpris(true);
            }
        }
        function onMetadataChanged() {
            var curTrack = expandedRoot.player ? (expandedRoot.player.track || "") : "";
            if (curTrack !== "" && curTrack !== expandedRoot.lastTrackTitle) {
                expandedRoot.lastTrackTitle = curTrack;
                expandedRoot.knownTrackLength = (expandedRoot.player && expandedRoot.player.length > 0) ? expandedRoot.player.length : 0;
                expandedRoot.livePosition = 0;
                expandedRoot.lastMprisPosition = -1;
                expandedRoot.reanchorPosition(0);
                if (expandedRoot.isPlaying && (!expandedRoot.player.length || expandedRoot.player.length <= 0)) {
                    expandedRoot.lengthProbeAttempts = 0;
                    firefoxLengthProbeTimer.restart();
                }
            }
            expandedRoot.updateKnownLength();
            if (expandedRoot.player && typeof expandedRoot.player.updatePosition === "function") {
                expandedRoot.player.updatePosition();
            }
            expandedRoot.syncPositionFromMpris(false);
        }
    }

    onPlayerChanged: {
        if (expandedRoot.player) {
            expandedRoot.lastTrackTitle = expandedRoot.player.track || "";
            expandedRoot.updateKnownLength();
            if (typeof expandedRoot.player.updatePosition === "function") {
                expandedRoot.player.updatePosition();
            }
            expandedRoot.syncPositionFromMpris(true);
        }
    }

    Component.onCompleted: {
        if (expandedRoot.player) {
            expandedRoot.lastTrackTitle = expandedRoot.player.track || "";
            expandedRoot.updateKnownLength();
            if (typeof expandedRoot.player.updatePosition === "function") {
                expandedRoot.player.updatePosition();
            }
            expandedRoot.syncPositionFromMpris(true);
        }
        expandedRoot.refreshSystemVolume();
    }

    // Soporte global de rueda del ratón en toda la ventana para subir/bajar volumen con OSD
    WheelHandler {
        acceptedDevices: PointerDevice.Mouse | PointerDevice.TouchPad
        onWheel: event => {
            var delta = event.angleDelta.y > 0 ? 0.05 : -0.05;
            expandedRoot.adjustVolumeWithOsd(delta);
        }
    }

    // Atajos de teclado para transporte y volumen
    Keys.onSpacePressed: if (player && (player.canPlay || player.canPause)) player.PlayPause()
    Keys.onReturnPressed: if (player && (player.canPlay || player.canPause)) player.PlayPause()
    Keys.onLeftPressed: {
        if (player && player.canSeek) {
            var target = Math.max(0, expandedRoot.livePosition - 5000000);
            expandedRoot.applySeekPosition(target);
        }
    }
    Keys.onRightPressed: {
        if (player && player.canSeek) {
            var maxLen = (expandedRoot.effectiveLength > 0) ? expandedRoot.effectiveLength : (expandedRoot.livePosition + 10000000);
            var target = Math.min(maxLen, expandedRoot.livePosition + 5000000);
            expandedRoot.applySeekPosition(target);
        }
    }
    Keys.onUpPressed: expandedRoot.adjustVolumeWithOsd(0.05)
    Keys.onDownPressed: expandedRoot.adjustVolumeWithOsd(-0.05)

    // Contenedor principal reactivo al tema del sistema (Claro / Oscuro)
    Rectangle {
        anchors.fill: parent
        color: Kirigami.Theme.backgroundColor

        ColumnLayout {
            anchors.fill: parent
            spacing: 0

            // =========================================================================
            // 1. BARRA SUPERIOR NATIVA (Cambia dinámicamente con el tema del sistema)
            // =========================================================================
            Item {
                Layout.fillWidth: true
                Layout.preferredHeight: Kirigami.Units.gridUnit * 2.1

                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: Kirigami.Units.smallSpacing * 2
                    anchors.rightMargin: Kirigami.Units.smallSpacing * 2
                    spacing: Kirigami.Units.smallSpacing

                    QQC2.ToolButton {
                        icon.name: "go-previous"
                        flat: true
                        visible: root.mprisModel && root.mprisModel.count > 1
                        onClicked: playerListPopup.open()
                        PlasmaComponents.ToolTip.visible: hovered
                        PlasmaComponents.ToolTip.text: i18n("Cambiar reproductor")
                    }

                    QQC2.Label {
                        text: player && player.identity ? player.identity : i18n("Reproductor Groove")
                        color: Kirigami.Theme.textColor
                        font.pixelSize: 13
                        opacity: 0.85
                        elide: Text.ElideRight
                        Layout.fillWidth: true
                    }

                    QQC2.ToolButton {
                        id: pinButton
                        icon.name: "window-pin"
                        flat: true
                        checkable: true
                        checked: !Plasmoid.hideOnWindowDeactivate
                        onToggled: Plasmoid.hideOnWindowDeactivate = !checked
                        PlasmaComponents.ToolTip.visible: hovered
                        PlasmaComponents.ToolTip.text: checked ? i18n("Desanclar ventana") : i18n("Mantener abierta")
                    }
                }

                Rectangle {
                    anchors.bottom: parent.bottom
                    anchors.left: parent.left
                    anchors.right: parent.right
                    height: 1
                    color: Kirigami.Theme.textColor
                    opacity: 0.12
                }
            }

            // =========================================================================
            // 2. SECCIÓN CENTRAL DE CARÁTULA Y METADATOS (Fusión KDE Nativo + Apple)
            // =========================================================================
            Item {
                id: heroSection
                Layout.fillWidth: true
                Layout.fillHeight: true
                Layout.minimumHeight: Kirigami.Units.gridUnit * 7.8
                clip: true

                // Fondo base oscuro suave para la zona de carátula
                Rectangle {
                    anchors.fill: parent
                    color: "#181a1f"
                }

                // Imagen de fondo difuminada atmosférica (como el reproductor nativo de KDE)
                Image {
                    id: blurredBg
                    anchors.fill: parent
                    anchors.margins: -24
                    source: player && player.artUrl ? player.artUrl : ""
                    fillMode: Image.PreserveAspectCrop
                    asynchronous: true
                    visible: false
                }

                Effects.MultiEffect {
                    anchors.fill: blurredBg
                    source: blurredBg
                    visible: blurredBg.status === Image.Ready && blurredBg.source != ""
                    blurEnabled: true
                    blurMax: 64
                    blur: 1.0
                    saturation: 0.25
                    brightness: -0.22
                }

                // Velo sutil para garantizar contraste perfecto del texto
                Rectangle {
                    anchors.fill: parent
                    gradient: Gradient {
                        GradientStop { position: 0.0; color: Qt.rgba(0, 0, 0, 0.28) }
                        GradientStop { position: 1.0; color: Qt.rgba(0, 0, 0, 0.52) }
                    }
                }

                // Contenido horizontal: Carátula con bordes redondeados a la izquierda + Texto a la derecha
                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: Kirigami.Units.largeSpacing
                    anchors.rightMargin: Kirigami.Units.largeSpacing
                    anchors.topMargin: Kirigami.Units.mediumSpacing
                    anchors.bottomMargin: Kirigami.Units.mediumSpacing
                    spacing: Kirigami.Units.largeSpacing

                    // Contenedor de Carátula redondeada con sombra suave (Referencia Apple)
                    Item {
                        Layout.preferredWidth: 124
                        Layout.preferredHeight: 82
                        Layout.alignment: Qt.AlignVCenter

                        Rectangle {
                            id: coverFrame
                            anchors.fill: parent
                            radius: 8
                            color: "#23262e"
                            clip: true

                            Image {
                                id: mainArt
                                anchors.fill: parent
                                source: player && player.artUrl ? player.artUrl : ""
                                fillMode: Image.PreserveAspectCrop
                                asynchronous: true
                                smooth: true
                                visible: status === Image.Ready && source != ""
                            }

                            // Ícono por defecto elegante cuando no hay carátula
                            Kirigami.Icon {
                                anchors.centerIn: parent
                                width: 36
                                height: 36
                                source: "emblem-music-symbolic"
                                color: "#ffffff"
                                opacity: 0.4
                                visible: !mainArt.visible
                            }
                        }

                        layer.enabled: true
                        layer.effect: Effects.MultiEffect {
                            shadowEnabled: true
                            shadowColor: Qt.rgba(0, 0, 0, 0.55)
                            shadowBlur: 0.6
                            shadowVerticalOffset: 3
                        }
                    }

                    // Títulos y Artista a la derecha
                    ColumnLayout {
                        Layout.fillWidth: true
                        Layout.alignment: Qt.AlignVCenter
                        spacing: 4

                        QQC2.Label {
                            text: player && player.track ? player.track : i18n("Sin reproducción activa")
                            color: "#ffffff"
                            font.pixelSize: 14
                            font.weight: Font.DemiBold
                            wrapMode: Text.Wrap
                            maximumLineCount: 3
                            elide: Text.ElideRight
                            Layout.fillWidth: true
                        }

                        QQC2.Label {
                            text: player && player.artist ? player.artist : (player && player.identity ? player.identity : "")
                            color: Qt.rgba(1, 1, 1, 0.78)
                            font.pixelSize: 12
                            elide: Text.ElideRight
                            maximumLineCount: 1
                            Layout.fillWidth: true
                            visible: text !== ""
                        }
                    }
                }

                // Badge de 5 barras de ecualizador en tiempo real (estilo Apple Now Playing)
                Item {
                    id: eqBadgeContainer
                    anchors.right: parent.right
                    anchors.bottom: parent.bottom
                    anchors.rightMargin: Kirigami.Units.largeSpacing + 4
                    anchors.bottomMargin: Kirigami.Units.mediumSpacing + 2
                    width: 28
                    height: 20
                    visible: player !== null

                    Row {
                        id: eqBarsRow
                        anchors.centerIn: parent
                        spacing: 2.5

                        Repeater {
                            model: 5
                            Rectangle {
                                width: 3
                                radius: 1.5
                                color: "#ffffff"
                                opacity: expandedRoot.isPlaying ? 0.85 : 0.42
                                anchors.verticalCenter: parent.verticalCenter
                                height: (expandedRoot.barHeights && expandedRoot.barHeights.length > index)
                                    ? expandedRoot.barHeights[index]
                                    : 3.0
                            }
                        }
                    }
                }
            }

            // =========================================================================
            // 3. PANEL DE CONTROLES INFERIOR (Cambia dinámicamente con el tema actual)
            // =========================================================================
            Item {
                Layout.fillWidth: true
                Layout.preferredHeight: Kirigami.Units.gridUnit * 6.4

                Rectangle {
                    anchors.top: parent.top
                    anchors.left: parent.left
                    anchors.right: parent.right
                    height: 1
                    color: Kirigami.Theme.textColor
                    opacity: 0.1
                }

                ColumnLayout {
                    anchors.fill: parent
                    anchors.leftMargin: Kirigami.Units.largeSpacing
                    anchors.rightMargin: Kirigami.Units.largeSpacing
                    anchors.topMargin: Kirigami.Units.smallSpacing * 2
                    anchors.bottomMargin: Kirigami.Units.smallSpacing * 2
                    spacing: 6

                    // 3A. Barra de Progreso en Tiempo Real (Estilo píldora limpia con Seek en vivo y proporción temporal protegida)
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 8

                        readonly property bool hasHours: (expandedRoot.effectiveLength >= 3600000000)

                        QQC2.Label {
                            text: expandedRoot.formatTime(progressSlider.pressed ? progressSlider.value : expandedRoot.livePosition, parent.hasHours)
                            font.pixelSize: 11
                            color: Kirigami.Theme.textColor
                            opacity: 0.75
                            horizontalAlignment: Text.AlignRight
                            Layout.minimumWidth: parent.hasHours ? 44 : 32
                        }

                        QQC2.Slider {
                            id: progressSlider
                            Layout.fillWidth: true
                            Layout.preferredHeight: 18
                            from: 0
                            to: (expandedRoot.effectiveLength > 0) ? expandedRoot.effectiveLength : Math.max(300000000, expandedRoot.livePosition)
                            enabled: player && player.canSeek

                            // Vínculo desacoplado protegido por disablePositionUpdate
                            Binding {
                                target: progressSlider
                                property: "value"
                                value: expandedRoot.livePosition
                                when: !progressSlider.pressed && !expandedRoot.disablePositionUpdate
                                restoreMode: Binding.RestoreBindingOrValue
                            }

                            onPressedChanged: {
                                if (pressed) {
                                    expandedRoot.disablePositionUpdate = true;
                                } else {
                                    queuedPositionUpdate.stop();
                                    expandedRoot.applySeekPosition(progressSlider.value);
                                }
                            }

                            onMoved: {
                                if (expandedRoot.player && expandedRoot.player.canSeek) {
                                    expandedRoot.disablePositionUpdate = true;
                                    expandedRoot.livePosition = progressSlider.value;
                                    // Si el usuario hace clic directo sin mantener presionado, o se detiene durante el arrastre, aplica a los 180ms
                                    if (!progressSlider.pressed) {
                                        queuedPositionUpdate.restart();
                                    }
                                }
                            }

                            // Soporte de rueda de scroll sobre la barra para saltos de 5s
                            MouseArea {
                                anchors.fill: parent
                                acceptedButtons: Qt.NoButton
                                onWheel: wheel => {
                                    if (expandedRoot.player && expandedRoot.player.canSeek) {
                                        var deltaSeek = wheel.angleDelta.y > 0 ? 5000000 : -5000000;
                                        var targetPos = Math.max(0, Math.min(progressSlider.to, expandedRoot.livePosition + deltaSeek));
                                        expandedRoot.applySeekPosition(targetPos);
                                    }
                                }
                            }

                            background: Rectangle {
                                x: progressSlider.leftPadding
                                y: progressSlider.topPadding + progressSlider.availableHeight / 2 - height / 2
                                implicitWidth: 200
                                implicitHeight: 5
                                width: progressSlider.availableWidth
                                height: implicitHeight
                                radius: 2.5
                                color: Qt.alpha(Kirigami.Theme.textColor, 0.16)

                                Rectangle {
                                    width: progressSlider.visualPosition * parent.width
                                    height: parent.height
                                    radius: 2.5
                                    color: Kirigami.Theme.highlightColor
                                }
                            }

                            handle: Rectangle {
                                x: progressSlider.leftPadding + progressSlider.visualPosition * (progressSlider.availableWidth - width)
                                y: progressSlider.topPadding + progressSlider.availableHeight / 2 - height / 2
                                implicitWidth: 12
                                implicitHeight: 12
                                radius: 6
                                color: progressSlider.pressed ? Kirigami.Theme.highlightColor : Kirigami.Theme.backgroundColor
                                border.color: Qt.alpha(Kirigami.Theme.textColor, 0.35)
                                border.width: 1
                                scale: (progressSlider.hovered || progressSlider.pressed) ? 1.05 : 0.85
                                Behavior on scale { NumberAnimation { duration: 120 } }
                            }
                        }

                        QQC2.Label {
                            readonly property real rem: (expandedRoot.effectiveLength > 0) ? Math.max(0, expandedRoot.effectiveLength - (progressSlider.pressed ? progressSlider.value : expandedRoot.livePosition)) : 0
                            text: "-" + expandedRoot.formatTime(rem, parent.hasHours)
                            font.pixelSize: 11
                            color: Kirigami.Theme.textColor
                            opacity: 0.75
                            horizontalAlignment: Text.AlignLeft
                            Layout.minimumWidth: parent.hasHours ? 48 : 36
                        }
                    }

                    // 3B. Botones de Transporte Limpios con Jerarquía Real (contentItem: Item para respetar tamaño exacto)
                    RowLayout {
                        Layout.alignment: Qt.AlignHCenter
                        spacing: Kirigami.Units.largeSpacing

                        // Aleatorio (Shuffle) - 28px círculo, 14px icono
                        QQC2.AbstractButton {
                            id: shuffleBtn
                            implicitWidth: 28
                            implicitHeight: 28
                            padding: 0
                            focusPolicy: Qt.NoFocus
                            enabled: player && player.canControl
                            onClicked: if (player) player.shuffle = !player.shuffle
                            background: Rectangle {
                                radius: 14
                                color: Qt.alpha(Kirigami.Theme.textColor, shuffleBtn.pressed ? 0.18 : (shuffleBtn.hovered ? 0.10 : 0.0))
                            }
                            contentItem: Item {
                                Kirigami.Icon {
                                    anchors.centerIn: parent
                                    width: 14
                                    height: 14
                                    source: "media-playlist-shuffle"
                                    color: Kirigami.Theme.textColor
                                    opacity: (player && player.shuffle) ? 1.0 : 0.45
                                }
                            }
                        }

                        // Anterior (Skip Backward) - 34px círculo, 16px icono (el círculo de hover lo cubre con amplio margen)
                        QQC2.AbstractButton {
                            id: prevBtn
                            implicitWidth: 34
                            implicitHeight: 34
                            padding: 0
                            focusPolicy: Qt.NoFocus
                            enabled: player ? (player.canGoPrevious || player.canSeek) : false
                            onClicked: {
                                if (!player) return;
                                if (player.canGoPrevious) player.Previous();
                                else if (player.canSeek) player.Seek(-10000000);
                            }
                            background: Rectangle {
                                radius: 17
                                color: Qt.alpha(Kirigami.Theme.textColor, prevBtn.pressed ? 0.18 : (prevBtn.hovered ? 0.10 : 0.0))
                            }
                            contentItem: Item {
                                Kirigami.Icon {
                                    anchors.centerIn: parent
                                    width: 16
                                    height: 16
                                    source: "media-skip-backward"
                                    color: Kirigami.Theme.textColor
                                    opacity: prevBtn.enabled ? 0.90 : 0.35
                                }
                            }
                        }

                        // Play / Pause Central (Botón Rey Destacado) - 44px círculo, 28px icono
                        QQC2.AbstractButton {
                            id: playPauseBtn
                            implicitWidth: 44
                            implicitHeight: 44
                            padding: 0
                            focusPolicy: Qt.NoFocus
                            enabled: player ? (player.canPlay || player.canPause) : false
                            onClicked: if (player) player.PlayPause()

                            background: Rectangle {
                                radius: 22
                                color: Qt.alpha(Kirigami.Theme.textColor, playPauseBtn.pressed ? 0.20 : (playPauseBtn.hovered ? 0.11 : 0.0))
                            }

                            contentItem: Item {
                                Kirigami.Icon {
                                    anchors.centerIn: parent
                                    width: 28
                                    height: 28
                                    source: expandedRoot.isPlaying ? "media-playback-pause" : "media-playback-start"
                                    color: Kirigami.Theme.textColor
                                }
                            }
                        }

                        // Siguiente (Skip Forward) - 34px círculo, 16px icono (más pequeño que Play, cubierto holgadamente por el hover)
                        QQC2.AbstractButton {
                            id: nextBtn
                            implicitWidth: 34
                            implicitHeight: 34
                            padding: 0
                            focusPolicy: Qt.NoFocus
                            enabled: player ? (player.canGoNext || player.canSeek) : false
                            onClicked: {
                                if (!player) return;
                                if (player.canGoNext) player.Next();
                                else if (player.canSeek) player.Seek(10000000);
                            }
                            background: Rectangle {
                                radius: 17
                                color: Qt.alpha(Kirigami.Theme.textColor, nextBtn.pressed ? 0.18 : (nextBtn.hovered ? 0.10 : 0.0))
                            }
                            contentItem: Item {
                                Kirigami.Icon {
                                    anchors.centerIn: parent
                                    width: 16
                                    height: 16
                                    source: "media-skip-forward"
                                    color: Kirigami.Theme.textColor
                                    opacity: nextBtn.enabled ? 0.90 : 0.35
                                }
                            }
                        }

                        // Repetir (Loop) - 28px círculo, 14px icono
                        QQC2.AbstractButton {
                            id: repeatBtn
                            implicitWidth: 28
                            implicitHeight: 28
                            padding: 0
                            focusPolicy: Qt.NoFocus
                            enabled: player && player.canControl
                            onClicked: if (player) player.loopStatus = (player.loopStatus + 1) % 3
                            background: Rectangle {
                                radius: 14
                                color: Qt.alpha(Kirigami.Theme.textColor, repeatBtn.pressed ? 0.18 : (repeatBtn.hovered ? 0.10 : 0.0))
                            }
                            contentItem: Item {
                                Kirigami.Icon {
                                    anchors.centerIn: parent
                                    width: 14
                                    height: 14
                                    source: "media-playlist-repeat"
                                    color: Kirigami.Theme.textColor
                                    opacity: (player && player.loopStatus > 0) ? 1.0 : 0.45
                                }
                            }
                        }
                    }

                    // 3C. Control de Volumen Sutil y Compacto (Referencia Apple con integración OSD)
                    Rectangle {
                        Layout.alignment: Qt.AlignHCenter
                        Layout.preferredWidth: 184
                        Layout.maximumWidth: 184
                        Layout.preferredHeight: 24
                        radius: 12
                        color: Qt.alpha(Kirigami.Theme.textColor, 0.06)
                        border.color: Qt.alpha(Kirigami.Theme.textColor, 0.10)
                        border.width: 1
                        visible: Plasmoid.configuration.showVolumeSlider

                        // Soporte de rueda sobre la píldora de volumen
                        MouseArea {
                            anchors.fill: parent
                            acceptedButtons: Qt.NoButton
                            onWheel: wheel => {
                                var delta = wheel.angleDelta.y > 0 ? 0.05 : -0.05;
                                expandedRoot.adjustVolumeWithOsd(delta);
                            }
                        }

                        RowLayout {
                            anchors.fill: parent
                            anchors.leftMargin: 10
                            anchors.rightMargin: 10
                            spacing: 7

                            MouseArea {
                                width: 14
                                height: 14
                                cursorShape: Qt.PointingHandCursor
                                onClicked: expandedRoot.toggleMute()
                                Kirigami.Icon {
                                    anchors.fill: parent
                                    source: (expandedRoot.systemMuted || volumeSlider.value <= 0.01) ? "audio-volume-muted" : "audio-volume-low"
                                    color: Kirigami.Theme.textColor
                                    opacity: 0.65
                                }
                            }

                            QQC2.Slider {
                                id: volumeSlider
                                Layout.fillWidth: true
                                Layout.preferredHeight: 16
                                from: 0.0
                                to: 1.0
                                stepSize: 0.01

                                Binding {
                                    target: volumeSlider
                                    property: "value"
                                    value: expandedRoot.systemMuted ? 0.0 : expandedRoot.systemVolume
                                    when: !volumeSlider.pressed
                                    restoreMode: Binding.RestoreBindingOrValue
                                }

                                onMoved: {
                                    expandedRoot.setRealVolume(value);
                                    var pct = Math.round(value * 100);
                                    expandedRoot.showNativeOsd(pct);
                                }

                                background: Rectangle {
                                    x: volumeSlider.leftPadding
                                    y: volumeSlider.topPadding + volumeSlider.availableHeight / 2 - height / 2
                                    implicitWidth: 110
                                    implicitHeight: 4
                                    width: volumeSlider.availableWidth
                                    height: implicitHeight
                                    radius: 2
                                    color: Qt.alpha(Kirigami.Theme.textColor, 0.16)

                                    Rectangle {
                                        width: volumeSlider.visualPosition * parent.width
                                        height: parent.height
                                        radius: 2
                                        color: Qt.alpha(Kirigami.Theme.textColor, 0.70)
                                    }
                                }

                                handle: Rectangle {
                                    x: volumeSlider.leftPadding + volumeSlider.visualPosition * (volumeSlider.availableWidth - width)
                                    y: volumeSlider.topPadding + volumeSlider.availableHeight / 2 - height / 2
                                    implicitWidth: 10
                                    implicitHeight: 10
                                    radius: 5
                                    color: Kirigami.Theme.backgroundColor
                                    border.color: Qt.alpha(Kirigami.Theme.textColor, 0.45)
                                    border.width: 1
                                }

                                PlasmaComponents.ToolTip.visible: hovered || pressed
                                PlasmaComponents.ToolTip.text: Math.round(volumeSlider.value * 100) + "%"
                            }

                            MouseArea {
                                width: 14
                                height: 14
                                cursorShape: Qt.PointingHandCursor
                                onClicked: expandedRoot.adjustVolumeWithOsd(0.10)
                                Kirigami.Icon {
                                    anchors.fill: parent
                                    source: "audio-volume-high"
                                    color: Kirigami.Theme.textColor
                                    opacity: 0.65
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Menú emergente para cambiar de reproductor cuando hay más de uno
    QQC2.Menu {
        id: playerListPopup
        title: i18n("Seleccionar Reproductor")
        Repeater {
            model: root.mprisModel
            QQC2.MenuItem {
                text: (model.container ? model.container.identity : "") || (model.identity ? model.identity : i18n("Reproductor %1", index + 1))
                icon.name: "emblem-music-symbolic"
                highlighted: root.mprisModel && root.mprisModel.currentIndex === index
                onTriggered: {
                    if (root.mprisModel) {
                        root.mprisModel.currentIndex = index;
                    }
                }
            }
        }
    }
}
