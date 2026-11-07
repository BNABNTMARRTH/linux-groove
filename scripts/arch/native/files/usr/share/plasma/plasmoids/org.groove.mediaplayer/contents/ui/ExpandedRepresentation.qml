import QtQuick
import QtQuick.Layouts
import QtQuick.Controls as QQC2
import QtQuick.Effects as Effects
import org.kde.kirigami as Kirigami
import org.kde.plasma.core as PlasmaCore
import org.kde.plasma.plasmoid
import org.kde.plasma.components as PlasmaComponents
import org.kde.pipewire as PipeWire

Item {
    id: expandedRoot

    implicitWidth: Kirigami.Units.gridUnit * 22
    implicitHeight: Kirigami.Units.gridUnit * 26

    readonly property var player: root.currentMprisPlayer
    readonly property bool isPlaying: player && player.playbackStatus === 1 // Playing

    function formatTime(microSeconds) {
        if (!microSeconds || microSeconds <= 0) return "0:00";
        var totalSec = Math.floor(microSeconds / 1000000);
        var min = Math.floor(totalSec / 60);
        var sec = totalSec % 60;
        return min + ":" + (sec < 10 ? "0" : "") + sec;
    }

    // Contenedor principal con Glassmorphism
    Rectangle {
        id: bgCard
        anchors.fill: parent
        radius: 14
        color: Qt.rgba(0.06, 0.07, 0.10, Plasmoid.configuration.customOpacity)
        border.color: Qt.rgba(1.0, 1.0, 1.0, 0.14)
        border.width: 1

        layer.enabled: true
        layer.effect: Effects.MultiEffect {
            shadowEnabled: true
            shadowColor: Qt.rgba(0, 0, 0, 0.5)
            shadowBlur: 0.7
            shadowVerticalOffset: 4
        }
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: Kirigami.Units.largeSpacing
        spacing: Kirigami.Units.smallSpacing

        // 1. Barra Superior (Encabezado con botón de retorno y chincheta de anclaje)
        RowLayout {
            Layout.fillWidth: true
            spacing: Kirigami.Units.smallSpacing

            QQC2.ToolButton {
                icon.name: "go-previous"
                visible: root.mprisModel && root.mprisModel.count > 1
                onClicked: playerListPopup.open()
                PlasmaComponents.ToolTip.visible: hovered
                PlasmaComponents.ToolTip.text: i18n("Cambiar fuente / reproductor")
            }

            Kirigami.Heading {
                level: 4
                text: player ? (player.identity || i18n("Reproductor Groove")) : i18n("Reproductor Groove")
                color: "#ffaa00"
                font.bold: true
                elide: Text.ElideRight
                Layout.fillWidth: true
            }

            // Chincheta de Anclaje (Pin)
            QQC2.ToolButton {
                id: pinButton
                icon.name: Plasmoid.hideOnWindowDeactivate ? "window-pin-symbolic" : "window-unpin-symbolic"
                checkable: true
                checked: !Plasmoid.hideOnWindowDeactivate
                onToggled: {
                    Plasmoid.hideOnWindowDeactivate = !checked;
                }
                PlasmaComponents.ToolTip.visible: hovered
                PlasmaComponents.ToolTip.text: checked ? i18n("Desanclar ventana") : i18n("Anclar ventana (mantener abierta)")
            }
        }

        // 2. Área Visual Central (Video en vivo / Carátula / Ondas reactivas Groove)
        Rectangle {
            id: mediaViewport
            Layout.fillWidth: true
            Layout.preferredHeight: Kirigami.Units.gridUnit * 11
            radius: 10
            clip: true
            color: "#0a0b0e"

            // Capa 0: Stream de video en vivo vía PipeWire (Cero-copia acelerado por hardware)
            PipeWire.PipeWireSourceItem {
                id: liveVideoPipeWire
                anchors.fill: parent
                nodeId: root.pipeWireVideoNodeId !== undefined ? root.pipeWireVideoNodeId : 0
                visible: nodeId > 0
            }

            // Capa 1: Carátula o imagen del medio (cuando no hay video en vivo o es audio)
            Image {
                id: artImage
                anchors.fill: parent
                source: player && player.artUrl ? player.artUrl : ""
                fillMode: Image.PreserveAspectCrop
                asynchronous: true
                visible: !liveVideoPipeWire.visible && source != ""
                opacity: 0.95
            }

            // Capa 2: Visualizador Neón Groove si no hay video ni carátula
            Item {
                id: waveFallback
                anchors.fill: parent
                visible: !liveVideoPipeWire.visible && !artImage.visible && Plasmoid.configuration.enableWaveformFallback

                Row {
                    anchors.centerIn: parent
                    spacing: 8
                    readonly property var heights: [0.3, 0.55, 0.85, 1.0, 0.85, 0.55, 0.3]
                    Repeater {
                        model: 7
                        Rectangle {
                            width: 8
                            radius: 4
                            height: Math.max(12, mediaViewport.height * 0.6 * waveFallback.heights[index] * (expandedRoot.isPlaying ? 1.0 : 0.3))
                            anchors.verticalCenter: parent.verticalCenter
                            gradient: Gradient {
                                GradientStop { position: 0.0; color: "#ffb703" }
                                GradientStop { position: 1.0; color: "#fb8500" }
                            }
                        }
                    }
                }
            }

            // Etiqueta flotante Live Video si está disponible
            Rectangle {
                anchors.top: parent.top
                anchors.left: parent.left
                anchors.margins: 8
                radius: 4
                color: Qt.rgba(0, 0, 0, 0.65)
                width: liveBadgeText.implicitWidth + 12
                height: 20
                visible: player && player.canPlay

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 4
                    Rectangle { width: 6; height: 6; radius: 3; color: expandedRoot.isPlaying ? "#00e676" : "#ffaa00" }
                    Text { id: liveBadgeText; text: expandedRoot.isPlaying ? "EN VIVO" : "PAUSA"; color: "#ffffff"; font.pixelSize: 9; font.bold: true }
                }
            }
        }

        // 3. Títulos y Artista
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 2

            Kirigami.Heading {
                level: 3
                text: player && player.track ? player.track : i18n("Esperando reproducción...")
                elide: Text.ElideRight
                font.bold: true
                Layout.fillWidth: true
            }

            QQC2.Label {
                text: player && player.artist ? player.artist : (player ? player.identity : "Linux Groove Media")
                color: Qt.rgba(1, 1, 1, 0.7)
                font.pixelSize: 11
                elide: Text.ElideRight
                Layout.fillWidth: true
            }
        }

        // 4. Barra de Tiempo y Posición (Timeline / Seeking)
        RowLayout {
            Layout.fillWidth: true
            spacing: Kirigami.Units.smallSpacing

            QQC2.Label {
                text: expandedRoot.formatTime(player ? player.position : 0)
                font.pixelSize: 10
                color: Qt.rgba(1, 1, 1, 0.7)
                Layout.minimumWidth: 32
            }

            QQC2.Slider {
                id: progressSlider
                Layout.fillWidth: true
                from: 0
                to: player && player.length ? player.length : 100
                value: player ? player.position : 0
                enabled: player && player.canSeek

                onMoved: {
                    if (player) {
                        player.position = value;
                    }
                }
            }

            QQC2.Label {
                text: "-" + expandedRoot.formatTime(player && player.length ? (player.length - player.position) : 0)
                font.pixelSize: 10
                color: Qt.rgba(1, 1, 1, 0.7)
                Layout.minimumWidth: 36
            }
        }

        // 5. Botones de Control de Reproducción
        RowLayout {
            Layout.fillWidth: true
            Layout.alignment: Qt.AlignHCenter
            spacing: Kirigami.Units.largeSpacing

            // Shuffle
            QQC2.ToolButton {
                icon.name: "media-playlist-shuffle"
                enabled: player && player.canControl
                opacity: player && player.shuffle ? 1.0 : 0.4
                onClicked: {
                    if (player) player.shuffle = !player.shuffle;
                }
            }

            // Anterior
            QQC2.ToolButton {
                icon.name: "media-skip-backward"
                enabled: player && player.canGoPrevious
                onClicked: if (player) player.Previous()
            }

            // Play / Pause Principal
            QQC2.Button {
                icon.name: expandedRoot.isPlaying ? "media-playback-pause" : "media-playback-start"
                enabled: player && (player.canPlay || player.canPause)
                highlighted: true
                implicitWidth: Kirigami.Units.gridUnit * 2.8
                implicitHeight: Kirigami.Units.gridUnit * 2.8
                onClicked: {
                    if (player) player.PlayPause();
                }
            }

            // Siguiente
            QQC2.ToolButton {
                icon.name: "media-skip-forward"
                enabled: player && player.canGoNext
                onClicked: if (player) player.Next()
            }

            // Repeat / Bucle
            QQC2.ToolButton {
                icon.name: "media-playlist-repeat"
                enabled: player && player.canControl
                opacity: player && player.loopStatus > 0 ? 1.0 : 0.4
                onClicked: {
                    if (player) {
                        player.loopStatus = (player.loopStatus + 1) % 3;
                    }
                }
            }
        }

        // 6. 🔥 CONTROL DE VOLUMEN INTEGRADO (Nueva característica solicitada)
        RowLayout {
            Layout.fillWidth: true
            visible: Plasmoid.configuration.showVolumeSlider
            spacing: Kirigami.Units.smallSpacing

            QQC2.ToolButton {
                icon.name: {
                    if (!player || player.volume <= 0.01) return "audio-volume-muted";
                    if (player.volume < 0.35) return "audio-volume-low";
                    if (player.volume < 0.70) return "audio-volume-medium";
                    return "audio-volume-high";
                }
                onClicked: {
                    if (player) {
                        if (player.volume > 0) {
                            player.volume = 0.0;
                        } else {
                            player.volume = 0.65;
                        }
                    }
                }
                PlasmaComponents.ToolTip.visible: hovered
                PlasmaComponents.ToolTip.text: i18n("Silenciar / Reactivar volumen")
            }

            QQC2.Slider {
                id: volumeSlider
                Layout.fillWidth: true
                from: 0.0
                to: 1.0
                stepSize: 0.01
                value: player ? player.volume : 1.0

                // 🔥 Modificación inmediata del volumen de la aplicación en vivo
                onMoved: {
                    if (player) {
                        player.volume = value;
                    }
                }
            }

            QQC2.Label {
                text: Math.round(volumeSlider.value * 100) + "%"
                font.pixelSize: 11
                color: "#ffaa00"
                font.bold: true
                Layout.minimumWidth: 32
            }
        }
    }

    // Menú flotante para seleccionar reproductor activo (cuando hay varios)
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
                        if (root.mprisModel.currentIndex !== undefined) {
                            root.mprisModel.currentIndex = index;
                        }
                        if (typeof root.mprisModel.updateActivePlayer === "function" && model.container) {
                            root.mprisModel.updateActivePlayer(model.container);
                        }
                    }
                }
            }
        }
    }
}
