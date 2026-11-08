/*
    Linux Groove - Ambient Frosted Wave Splash Screen
    SPDX-License-Identifier: GPL-2.0-or-later
*/

import QtQuick
import org.kde.kirigami as Kirigami

Rectangle {
    id: root
    color: "#04060a" // Fondo negro profundo

    property int stage: 0

    // Control de ciclo de vida de arranque en KDE Plasma
    onStageChanged: {
        if (stage === 1 || stage === 2) {
            introAnim.running = true;
        } else if (stage >= 5) {
            fadeOutAnim.running = true;
        }
    }

    Component.onCompleted: {
        introAnim.running = true;
    }

    // Fase angular para el flujo continuo de las ondas
    property real waveTime: 0.0
    NumberAnimation on waveTime {
        from: 0.0
        to: Math.PI * 2
        duration: 8000
        loops: Animation.Infinite
        running: true
    }

    // -------------------------------------------------------------
    // CAPA 1: Siluetas de luz ondulantes estilo protector de pantalla
    // -------------------------------------------------------------
    Canvas {
        id: waveCanvas
        anchors.fill: parent
        antialiasing: true
        renderTarget: Canvas.Image

        onPaint: {
            var ctx = getContext("2d");
            ctx.clearRect(0, 0, width, height);

            var w = width;
            var h = height;
            var t = root.waveTime;

            // 1. Resplandor base ambiental (halo cálido izquierda, frío derecha)
            var gradAmbient = ctx.createLinearGradient(0, h * 0.5, w, h * 0.5);
            gradAmbient.addColorStop(0.0, "rgba(255, 110, 10, 0.09)");
            gradAmbient.addColorStop(0.35, "rgba(255, 130, 20, 0.14)");
            gradAmbient.addColorStop(0.65, "rgba(0, 160, 255, 0.12)");
            gradAmbient.addColorStop(1.0, "rgba(0, 120, 255, 0.09)");
            ctx.fillStyle = gradAmbient;
            ctx.fillRect(0, 0, w, h);

            // 2. Cinta de luz Ámbar / Dorado (fluyendo en la zona inferior-izquierda)
            var gradAmber = ctx.createLinearGradient(0, h * 0.4, w, h);
            gradAmber.addColorStop(0.0, "rgba(255, 120, 20, 0.0)");
            gradAmber.addColorStop(0.25, "rgba(255, 150, 30, 0.38)");
            gradAmber.addColorStop(0.65, "rgba(235, 75, 15, 0.22)");
            gradAmber.addColorStop(1.0, "rgba(255, 100, 20, 0.0)");

            ctx.beginPath();
            ctx.moveTo(0, h * 0.70 + Math.sin(t) * 30);
            ctx.bezierCurveTo(
                w * 0.35, h * 0.58 + Math.cos(t) * 45,
                w * 0.65, h * 0.86 + Math.sin(t * 1.2) * 35,
                w, h * 0.64 + Math.cos(t * 0.8) * 30
            );
            ctx.lineTo(w, h);
            ctx.lineTo(0, h);
            ctx.closePath();
            ctx.fillStyle = gradAmber;
            ctx.fill();

            // 3. Cinta de luz Azul Eléctrico / Neón (cruzando desde arriba-derecha)
            var gradBlue = ctx.createLinearGradient(0, 0, w, h * 0.75);
            gradBlue.addColorStop(0.0, "rgba(0, 150, 255, 0.0)");
            gradBlue.addColorStop(0.35, "rgba(0, 200, 255, 0.32)");
            gradBlue.addColorStop(0.70, "rgba(70, 90, 255, 0.24)");
            gradBlue.addColorStop(1.0, "rgba(0, 140, 255, 0.0)");

            ctx.beginPath();
            ctx.moveTo(0, h * 0.36 + Math.cos(t * 0.9) * 30);
            ctx.bezierCurveTo(
                w * 0.30, h * 0.52 + Math.sin(t * 1.1) * 38,
                w * 0.70, h * 0.24 + Math.cos(t) * 46,
                w, h * 0.44 + Math.sin(t * 0.7) * 35
            );
            ctx.bezierCurveTo(
                w * 0.65, h * 0.38 + Math.cos(t * 1.3) * 32,
                w * 0.35, h * 0.62 + Math.sin(t * 0.8) * 28,
                0, h * 0.52
            );
            ctx.closePath();
            ctx.fillStyle = gradBlue;
            ctx.fill();

            // 4. Filamento brillante fino Magenta / Violeta (aurora sutil)
            var gradViolet = ctx.createLinearGradient(0, h * 0.5, w, h * 0.5);
            gradViolet.addColorStop(0.0, "rgba(200, 50, 255, 0.0)");
            gradViolet.addColorStop(0.5, "rgba(235, 90, 255, 0.55)");
            gradViolet.addColorStop(1.0, "rgba(200, 50, 255, 0.0)");

            ctx.beginPath();
            ctx.moveTo(0, h * 0.56 + Math.sin(t * 1.3) * 24);
            ctx.bezierCurveTo(
                w * 0.40, h * 0.44 + Math.cos(t * 1.1) * 34,
                w * 0.60, h * 0.66 + Math.sin(t * 0.9) * 28,
                w, h * 0.52 + Math.cos(t) * 20
            );
            ctx.lineWidth = 3.5;
            ctx.strokeStyle = gradViolet;
            ctx.stroke();
        }
    }

    Timer {
        interval: 33 // ~30 fps suave
        running: true
        repeat: true
        onTriggered: waveCanvas.requestPaint()
    }

    // -------------------------------------------------------------
    // CAPA 2: Emblema Central de Teclas de Piano con Respiración
    // -------------------------------------------------------------
    Item {
        id: logoCenter
        anchors.centerIn: parent
        width: Math.min(parent.width * 0.52, Kirigami.Units.gridUnit * 24)
        height: width * 0.66
        opacity: 0.0

        // Resplandor difuso detrás del logo
        Rectangle {
            anchors.centerIn: parent
            width: parent.width * 1.15
            height: parent.height * 1.15
            radius: width / 2
            opacity: 0.40
            gradient: Gradient {
                orientation: Gradient.Horizontal
                GradientStop { position: 0.0; color: "transparent" }
                GradientStop { position: 0.35; color: "#66ff8800" }
                GradientStop { position: 0.65; color: "#6600a2ff" }
                GradientStop { position: 1.0; color: "transparent" }
            }
        }

        // Icono de Teclas de Piano de Groove
        Image {
            id: logoImage
            anchors.fill: parent
            fillMode: Image.PreserveAspectFit
            asynchronous: false
            smooth: true
            source: "images/groove-logo-glow.png"

            // Pulso de respiración orgánico
            SequentialAnimation on scale {
                loops: Animation.Infinite
                running: true
                NumberAnimation { from: 0.985; to: 1.02; duration: 2500; easing.type: Easing.InOutSine }
                NumberAnimation { from: 1.02; to: 0.985; duration: 2500; easing.type: Easing.InOutSine }
            }
        }

        // Ecualizador de carga sutil (indicador de inicio)
        Row {
            anchors.horizontalCenter: parent.horizontalCenter
            anchors.top: logoImage.bottom
            anchors.topMargin: Kirigami.Units.gridUnit * 1.5
            spacing: Kirigami.Units.smallSpacing

            Repeater {
                model: 5
                Rectangle {
                    required property int index
                    width: Kirigami.Units.gridUnit * 0.28
                    height: Kirigami.Units.gridUnit * 1.1
                    radius: width / 2
                    color: index < 2 ? "#ff9020" : (index === 2 ? "#e060ff" : "#00b4ff")
                    opacity: 0.85

                    SequentialAnimation on scale {
                        loops: Animation.Infinite
                        running: true
                        PauseAnimation { duration: index * 180 }
                        NumberAnimation { from: 0.4; to: 1.25; duration: 600; easing.type: Easing.InOutQuad }
                        NumberAnimation { from: 1.25; to: 0.4; duration: 600; easing.type: Easing.InOutQuad }
                        PauseAnimation { duration: (4 - index) * 180 }
                    }
                }
            }
        }
    }

    // Pie de página elegante: "Linux Groove"
    Text {
        anchors.bottom: parent.bottom
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.bottomMargin: Kirigami.Units.gridUnit * 1.8
        text: "L I N U X   G R O O V E"
        color: "#99b0c8"
        font.pixelSize: Kirigami.Units.gridUnit * 0.72
        font.letterSpacing: 4
        font.weight: Font.DemiBold
        opacity: 0.65
    }

    // -------------------------------------------------------------
    // CAPA 3: Transiciones Suaves de Entrada y Salida
    // -------------------------------------------------------------
    OpacityAnimator {
        id: introAnim
        target: logoCenter
        from: 0.0
        to: 1.0
        duration: 900
        easing.type: Easing.OutCubic
    }

    OpacityAnimator {
        id: fadeOutAnim
        target: root
        from: 1.0
        to: 0.0
        duration: 600
        easing.type: Easing.InOutQuad
    }
}
