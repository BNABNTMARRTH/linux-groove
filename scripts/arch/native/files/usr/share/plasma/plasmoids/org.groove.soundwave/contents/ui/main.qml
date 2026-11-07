import QtQuick
import QtQuick.Layouts
import QtQuick.Effects as Effects
import org.kde.plasma.core as PlasmaCore
import org.kde.plasma.plasmoid
import org.kde.kirigami as Kirigami

PlasmoidItem {
    id: root

    // Control total del fondo por el propio widget
    Plasmoid.backgroundHints: PlasmaCore.Types.NoBackground

    preferredRepresentation: fullRepresentation
    Layout.minimumWidth: Kirigami.Units.gridUnit * 10
    Layout.minimumHeight: Kirigami.Units.gridUnit * 7
    Layout.preferredWidth: Kirigami.Units.gridUnit * 12
    Layout.preferredHeight: Kirigami.Units.gridUnit * 8

    fullRepresentation: Item {
        id: container
        anchors.fill: parent

        // Fondo de cristal dinámico personalizado
        Rectangle {
            id: glassBg
            anchors.fill: parent
            radius: 14

            visible: Plasmoid.configuration.bgStyle !== 1 // 1 = Totalmente transparente

            color: {
                if (Plasmoid.configuration.bgStyle === 2) {
                    return Qt.rgba(0.08, 0.08, 0.1, 0.95);
                }
                // Glassmorphism oscuro con tono ámbar sutil
                var op = Plasmoid.configuration.customOpacity !== undefined ? Plasmoid.configuration.customOpacity : 0.35;
                return Qt.rgba(0.05, 0.06, 0.09, op);
            }

            border.color: Qt.rgba(1.0, 1.0, 1.0, Plasmoid.configuration.bgStyle === 1 ? 0.0 : 0.12)
            border.width: 1

            // Sombra suave en modo cristal
            layer.enabled: true
            layer.effect: Effects.MultiEffect {
                shadowEnabled: true
                shadowColor: Qt.rgba(0, 0, 0, 0.4)
                shadowBlur: 0.6
                shadowVerticalOffset: 3
            }
        }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: Kirigami.Units.largeSpacing
            spacing: Kirigami.Units.smallSpacing

            // Título opcional
            Kirigami.Heading {
                level: 3
                text: "GROOVE AUDIO"
                color: "#ffaa00"
                font.bold: true
                font.letterSpacing: 2
                font.pixelSize: 11
                Layout.alignment: Qt.AlignHCenter
                visible: Plasmoid.configuration.showTitle
                opacity: 0.9
            }

            // Área central: Ondas Sonoras de Groove
            Item {
                id: waveContainer
                Layout.fillWidth: true
                Layout.fillHeight: true

                Row {
                    id: waveRow
                    anchors.centerIn: parent
                    spacing: 7

                    readonly property var baseHeights: [0.35, 0.55, 0.80, 1.0, 0.80, 0.55, 0.35]
                    readonly property var barGradients: [
                        ["#ffb703", "#fb8500"],
                        ["#ffaa00", "#f77f00"],
                        ["#ff9e00", "#f46036"],
                        ["#ffdd00", "#ff5400"],
                        ["#ff9e00", "#f46036"],
                        ["#ffaa00", "#f77f00"],
                        ["#ffb703", "#fb8500"]
                    ]

                    Repeater {
                        model: 7
                        Rectangle {
                            id: bar
                            width: 10
                            radius: 5

                            property real pulseFactor: 1.0
                            height: Math.max(14, (waveContainer.height * 0.75 * waveRow.baseHeights[index]) * pulseFactor)
                            anchors.verticalCenter: parent.verticalCenter

                            gradient: Gradient {
                                GradientStop { position: 0.0; color: waveRow.barGradients[index][0] }
                                GradientStop { position: 1.0; color: waveRow.barGradients[index][1] }
                            }

                            // Efecto Neón Glow
                            layer.enabled: Plasmoid.configuration.barGlow
                            layer.effect: Effects.MultiEffect {
                                shadowEnabled: true
                                shadowColor: waveRow.barGradients[index][0]
                                shadowBlur: 0.8
                                shadowOpacity: 0.65
                            }
                        }
                    }
                }

                // Animador de pulso reactivo musical
                Timer {
                    interval: 65
                    running: true
                    repeat: true
                    property real phase: 0.0
                    onTriggered: {
                        phase += 0.18;
                        for (var i = 0; i < waveRow.children.length; ++i) {
                            var item = waveRow.children[i];
                            if (item && item.pulseFactor !== undefined) {
                                var offset = Math.sin(phase + i * 0.7);
                                item.pulseFactor = 0.82 + (offset * 0.28);
                            }
                        }
                    }
                }
            }

            // Pie: Indicador de DSP / Sample Rate
            RowLayout {
                Layout.fillWidth: true
                Layout.alignment: Qt.AlignHCenter
                spacing: 8

                Rectangle {
                    width: 6; height: 6; radius: 3
                    color: "#00e676"
                }

                Kirigami.Heading {
                    level: 5
                    text: "48 kHz • 64 spl • 1.3 ms"
                    color: Qt.rgba(1, 1, 1, 0.7)
                    font.pixelSize: 10
                    font.bold: false
                }
            }
        }
    }
}

