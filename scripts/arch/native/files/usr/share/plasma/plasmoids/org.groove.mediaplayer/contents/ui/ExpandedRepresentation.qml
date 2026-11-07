import QtQuick
import QtQuick.Layouts
import QtQuick.Controls as QQC2
import QtQuick.Effects as Effects
import org.kde.kirigami as Kirigami
import org.kde.plasma.core as PlasmaCore
import org.kde.plasma.plasmoid
import org.kde.plasma.components as PlasmaComponents
import org.kde.plasma.plasma5support as Plasma5Support
import org.kde.plasma.private.mpris as Mpris

Item {
    id: expandedRoot

    implicitWidth: Kirigami.Units.gridUnit * 21
    implicitHeight: Kirigami.Units.gridUnit * 16.5
    focus: true

    readonly property var player: root.currentMprisPlayer
    readonly property bool isPlaying: player ? (player.playbackStatus === Mpris.PlaybackStatus.Playing || player.playbackStatus === 2) : false

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

    function reanchorPosition(newPosUs) {
        expandedRoot.anchorPositionUs = Math.max(0, newPosUs);
        expandedRoot.anchorTimestampMs = Date.now();
        if (!expandedRoot.disablePositionUpdate) {
            expandedRoot.livePosition = expandedRoot.anchorPositionUs;
        }
    }

    function syncPositionFromMpris(forceSnap) {
        if (!expandedRoot.player) {
            expandedRoot.livePosition = 0;
            expandedRoot.anchorPositionUs = 0;
            expandedRoot.anchorTimestampMs = Date.now();
            expandedRoot.lastMprisPosition = -1;
            return;
        }
        var reported = expandedRoot.player.position || 0;
        if (forceSnap || Math.abs(reported - expandedRoot.lastMprisPosition) > 50000) {
            expandedRoot.lastMprisPosition = reported;
            expandedRoot.reanchorPosition(reported);
        }
    }

    // Motor de comandos para sincronizar volumen del sistema (PipeWire) y Dock OSD nativo de KDE
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
        audioExec.connectSource("wpctl set-mute @DEFAULT_AUDIO_SINK@ 0 && wpctl set-volume @DEFAULT_AUDIO_SINK@ " + clamped.toFixed(2));
        if (player && player.canControl) {
            player.volume = clamped;
        }
    }

    // Ajusta volumen y muestra el Dock Flotante (OSD) nativo de KDE Plasma
    function adjustVolumeWithOsd(deltaStep) {
        var baseVol = expandedRoot.systemMuted ? 0.0 : expandedRoot.systemVolume;
        var nextVol = Math.min(1.0, Math.max(0.0, baseVol + deltaStep));
        expandedRoot.setRealVolume(nextVol);
        var pct = Math.round(nextVol * 100);
        var appName = (expandedRoot.player && expandedRoot.player.identity) ? expandedRoot.player.identity : "Mozilla firefox";
        var safeAppName = appName.replace(/"/g, "");
        audioExec.connectSource(
            "qdbus6 org.kde.plasmashell /org/kde/osdService org.kde.osdService.mediaPlayerVolumeChanged "
            + pct + " \"" + safeAppName + "\" \"multimedia-audio-player\""
        );
    }

    function toggleMute() {
        expandedRoot.systemMuted = !expandedRoot.systemMuted;
        audioExec.connectSource("wpctl set-mute @DEFAULT_AUDIO_SINK@ toggle");
        var pct = expandedRoot.systemMuted ? 0 : Math.round(expandedRoot.systemVolume * 100);
        var appName = (expandedRoot.player && expandedRoot.player.identity) ? expandedRoot.player.identity : "Mozilla firefox";
        audioExec.connectSource(
            "qdbus6 org.kde.plasmashell /org/kde/osdService org.kde.osdService.mediaPlayerVolumeChanged "
            + pct + " \"" + appName.replace(/"/g, "") + "\" \"multimedia-audio-player\""
        );
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

    // Timer de avance en tiempo real (100ms) basado en reloj monotónico sin deriva
    Timer {
        id: positionPollTimer
        interval: 100
        repeat: true
        running: expandedRoot.isPlaying && expandedRoot.visible
        property int tickCount: 0
        onTriggered: {
            if (!expandedRoot.player) return;
            if (expandedRoot.anchorTimestampMs <= 0 || (expandedRoot.livePosition === 0 && expandedRoot.player.position > 0)) {
                expandedRoot.syncPositionFromMpris(true);
            }
            if (!expandedRoot.disablePositionUpdate && !progressSlider.pressed) {
                var rate = (expandedRoot.player.rate && expandedRoot.player.rate > 0) ? expandedRoot.player.rate : 1.0;
                var maxLen = (expandedRoot.player.length && expandedRoot.player.length > 0) ? expandedRoot.player.length : 0;
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

    // Cola de actualización para Seek (100ms debounce idéntico al reproductor nativo de KDE)
    Timer {
        id: queuedPositionUpdate
        interval: 100
        repeat: false
        onTriggered: {
            if (!expandedRoot.player || !expandedRoot.player.canSeek) {
                expandedRoot.disablePositionUpdate = false;
                return;
            }
            var targetUs = Math.round(progressSlider.value);
            expandedRoot.reanchorPosition(targetUs);
            expandedRoot.player.position = targetUs;
            seekReleaseGuardTimer.restart();
        }
    }

    Timer {
        id: seekReleaseGuardTimer
        interval: 250
        repeat: false
        onTriggered: {
            if (!progressSlider.pressed) {
                expandedRoot.disablePositionUpdate = false;
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
        function onPlaybackStatusChanged() {
            if (expandedRoot.player && typeof expandedRoot.player.updatePosition === "function") {
                expandedRoot.player.updatePosition();
            }
            expandedRoot.reanchorPosition(expandedRoot.player ? (expandedRoot.player.position || 0) : 0);
            expandedRoot.syncPositionFromMpris(true);
        }
        function onMetadataChanged() {
            var curTrack = expandedRoot.player ? (expandedRoot.player.track || "") : "";
            if (curTrack !== "" && curTrack !== expandedRoot.lastTrackTitle) {
                expandedRoot.lastTrackTitle = curTrack;
                expandedRoot.livePosition = 0;
                expandedRoot.lastMprisPosition = -1;
                expandedRoot.reanchorPosition(0);
                if (expandedRoot.isPlaying && (!expandedRoot.player.length || expandedRoot.player.length <= 0)) {
                    expandedRoot.lengthProbeAttempts = 0;
                    firefoxLengthProbeTimer.restart();
                }
            }
            if (expandedRoot.player && typeof expandedRoot.player.updatePosition === "function") {
                expandedRoot.player.updatePosition();
            }
            expandedRoot.syncPositionFromMpris(false);
        }
    }

    onPlayerChanged: {
        if (expandedRoot.player) {
            expandedRoot.lastTrackTitle = expandedRoot.player.track || "";
            if (typeof expandedRoot.player.updatePosition === "function") {
                expandedRoot.player.updatePosition();
            }
            expandedRoot.syncPositionFromMpris(true);
        }
    }

    Component.onCompleted: {
        if (expandedRoot.player) {
            expandedRoot.lastTrackTitle = expandedRoot.player.track || "";
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
            expandedRoot.disablePositionUpdate = true;
            progressSlider.value = target;
            queuedPositionUpdate.restart();
        }
    }
    Keys.onRightPressed: {
        if (player && player.canSeek) {
            var maxLen = (player.length && player.length > 0) ? player.length : (expandedRoot.livePosition + 10000000);
            var target = Math.min(maxLen, expandedRoot.livePosition + 5000000);
            expandedRoot.disablePositionUpdate = true;
            progressSlider.value = target;
            queuedPositionUpdate.restart();
        }
    }
    Keys.onUpPressed: expandedRoot.adjustVolumeWithOsd(0.05)
    Keys.onDownPressed: expandedRoot.adjustVolumeWithOsd(-0.05)

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        // =========================================================================
        // 1. BARRA SUPERIOR NATIVA (Respeta 100% el tema actual del sistema)
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

            // Badge de 5 barras de ecualizador (estilo Apple Now Playing)
            Item {
                anchors.right: parent.right
                anchors.bottom: parent.bottom
                anchors.rightMargin: Kirigami.Units.largeSpacing + 4
                anchors.bottomMargin: Kirigami.Units.mediumSpacing + 2
                implicitWidth: 32
                implicitHeight: 22
                visible: player !== null

                Row {
                    anchors.centerIn: parent
                    spacing: 2.5

                    property real wavePhase: 0.0
                    NumberAnimation on wavePhase {
                        from: 0; to: 6.28318
                        duration: 850
                        loops: Animation.Infinite
                        running: expandedRoot.isPlaying && expandedRoot.visible
                    }

                    Repeater {
                        model: 5
                        Rectangle {
                            width: 2.5
                            radius: 1.25
                            color: "#ffffff"
                            opacity: expandedRoot.isPlaying ? 0.90 : 0.40
                            anchors.verticalCenter: parent.verticalCenter

                            // Si está en pausa se colapsa suavemente a 2.5px (un punto cuadrado ▪ ▪ ▪ ▪ ▪)
                            height: {
                                if (!expandedRoot.isPlaying) return 2.5;
                                var offsets = [0.0, 1.4, 2.8, 0.9, 2.2];
                                var amp = Math.abs(Math.sin(parent.wavePhase + offsets[index]));
                                return 3.5 + (amp * 11.5);
                            }

                            Behavior on height { NumberAnimation { duration: 160 } }
                            Behavior on opacity { NumberAnimation { duration: 160 } }
                        }
                    }
                }
            }
        }

        // =========================================================================
        // 3. PANEL DE CONTROLES INFERIOR (Respeta 100% el tema actual de la ventana)
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

                // 3A. Barra de Progreso en Tiempo Real (Estilo píldora limpia con debounce)
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    readonly property bool hasHours: (player && player.length >= 3600000000)

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
                        to: (player && player.length > 0) ? player.length : Math.max(100, expandedRoot.livePosition * 1.2)
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
                                queuedPositionUpdate.restart();
                            }
                        }

                        onMoved: {
                            if (expandedRoot.player && expandedRoot.player.canSeek) {
                                expandedRoot.disablePositionUpdate = true;
                                queuedPositionUpdate.restart();
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
                                    expandedRoot.disablePositionUpdate = true;
                                    progressSlider.value = targetPos;
                                    queuedPositionUpdate.restart();
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
                        readonly property real rem: (player && player.length > 0) ? Math.max(0, player.length - (progressSlider.pressed ? progressSlider.value : expandedRoot.livePosition)) : 0
                        text: "-" + expandedRoot.formatTime(rem, parent.hasHours)
                        font.pixelSize: 11
                        color: Kirigami.Theme.textColor
                        opacity: 0.75
                        horizontalAlignment: Text.AlignLeft
                        Layout.minimumWidth: parent.hasHours ? 48 : 36
                    }
                }

                // 3B. Botones de Transporte Limpios con Nueva Jerarquía Armónica
                RowLayout {
                    Layout.alignment: Qt.AlignHCenter
                    spacing: Kirigami.Units.largeSpacing

                    // Aleatorio (Shuffle)
                    QQC2.AbstractButton {
                        id: shuffleBtn
                        implicitWidth: 28
                        implicitHeight: 28
                        focusPolicy: Qt.NoFocus
                        enabled: player && player.canControl
                        onClicked: if (player) player.shuffle = !player.shuffle
                        background: Rectangle {
                            radius: 14
                            color: Qt.alpha(Kirigami.Theme.textColor, shuffleBtn.pressed ? 0.16 : (shuffleBtn.hovered ? 0.08 : 0.0))
                        }
                        contentItem: Kirigami.Icon {
                            anchors.centerIn: parent
                            width: 14
                            height: 14
                            source: "media-playlist-shuffle"
                            color: Kirigami.Theme.textColor
                            opacity: (player && player.shuffle) ? 1.0 : 0.45
                        }
                    }

                    // Anterior (Skip Backward) - Más pequeño que Play para margen amplio en hover
                    QQC2.AbstractButton {
                        id: prevBtn
                        implicitWidth: 32
                        implicitHeight: 32
                        focusPolicy: Qt.NoFocus
                        enabled: player ? (player.canGoPrevious || player.canSeek) : false
                        onClicked: {
                            if (!player) return;
                            if (player.canGoPrevious) player.Previous();
                            else if (player.canSeek) player.Seek(-10000000);
                        }
                        background: Rectangle {
                            radius: 16
                            color: Qt.alpha(Kirigami.Theme.textColor, prevBtn.pressed ? 0.16 : (prevBtn.hovered ? 0.08 : 0.0))
                        }
                        contentItem: Kirigami.Icon {
                            anchors.centerIn: parent
                            width: 17
                            height: 17
                            source: "media-skip-backward"
                            color: Kirigami.Theme.textColor
                            opacity: prevBtn.enabled ? 0.9 : 0.35
                        }
                    }

                    // Play / Pause Central - Botón Rey Destacado
                    QQC2.AbstractButton {
                        id: playPauseBtn
                        implicitWidth: 42
                        implicitHeight: 42
                        focusPolicy: Qt.NoFocus
                        enabled: player ? (player.canPlay || player.canPause) : false
                        onClicked: if (player) player.PlayPause()

                        background: Rectangle {
                            radius: 21
                            color: Qt.alpha(Kirigami.Theme.textColor, playPauseBtn.pressed ? 0.20 : (playPauseBtn.hovered ? 0.10 : 0.0))
                        }

                        contentItem: Kirigami.Icon {
                            anchors.centerIn: parent
                            width: 24
                            height: 24
                            source: expandedRoot.isPlaying ? "media-playback-pause" : "media-playback-start"
                            color: Kirigami.Theme.textColor
                        }
                    }

                    // Siguiente (Skip Forward) - Más pequeño que Play
                    QQC2.AbstractButton {
                        id: nextBtn
                        implicitWidth: 32
                        implicitHeight: 32
                        focusPolicy: Qt.NoFocus
                        enabled: player ? (player.canGoNext || player.canSeek) : false
                        onClicked: {
                            if (!player) return;
                            if (player.canGoNext) player.Next();
                            else if (player.canSeek) player.Seek(10000000);
                        }
                        background: Rectangle {
                            radius: 16
                            color: Qt.alpha(Kirigami.Theme.textColor, nextBtn.pressed ? 0.16 : (nextBtn.hovered ? 0.08 : 0.0))
                        }
                        contentItem: Kirigami.Icon {
                            anchors.centerIn: parent
                            width: 17
                            height: 17
                            source: "media-skip-forward"
                            color: Kirigami.Theme.textColor
                            opacity: nextBtn.enabled ? 0.9 : 0.35
                        }
                    }

                    // Repetir (Loop)
                    QQC2.AbstractButton {
                        id: repeatBtn
                        implicitWidth: 28
                        implicitHeight: 28
                        focusPolicy: Qt.NoFocus
                        enabled: player && player.canControl
                        onClicked: if (player) player.loopStatus = (player.loopStatus + 1) % 3
                        background: Rectangle {
                            radius: 14
                            color: Qt.alpha(Kirigami.Theme.textColor, repeatBtn.pressed ? 0.16 : (repeatBtn.hovered ? 0.08 : 0.0))
                        }
                        contentItem: Kirigami.Icon {
                            anchors.centerIn: parent
                            width: 14
                            height: 14
                            source: "media-playlist-repeat"
                            color: Kirigami.Theme.textColor
                            opacity: (player && player.loopStatus > 0) ? 1.0 : 0.45
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
                    color: Qt.alpha(Kirigami.Theme.textColor, 0.05)
                    border.color: Qt.alpha(Kirigami.Theme.textColor, 0.08)
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
                                var appName = (expandedRoot.player && expandedRoot.player.identity) ? expandedRoot.player.identity : "Mozilla firefox";
                                var safeAppName = appName.replace(/"/g, "");
                                audioExec.connectSource(
                                    "qdbus6 org.kde.plasmashell /org/kde/osdService org.kde.osdService.mediaPlayerVolumeChanged "
                                    + pct + " \"" + safeAppName + "\" \"multimedia-audio-player\""
                                );
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

    // Menú emergente para cambiar de reproductor cuando hay más de uno
    QQC2.Menu {
        id: playerListPopup
        title: i18n("Seleccionar Reproductor")
        Repeater {
            model: root.mprisModel
            QQC2.MenuItem {
                text: (model.container ? model.container.identity : "") || (model.identity ? model.identity : i18n("Reproductor %1", index + 1))
                icon.name: "multimedia-audio-player"
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
