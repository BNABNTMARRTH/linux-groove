/*
    Linux Groove - Groove Labyrinth Screensaver Splash Screen (Cyberpunk ASCII Matrix Edition)
    SPDX-License-Identifier: GPL-2.0-or-later
*/

import QtQuick
import org.kde.kirigami as Kirigami

Rectangle {
    id: root
    width: 1280
    height: 800
    color: "#000000" // CAPA 0: Fondo 100% negro puro absoluto

    property int stage: 0

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

    // Temporizador continuo para el Shader de laberinto ASCII y corredores de luz
    property real screensaverTime: 0.0
    NumberAnimation on screensaverTime {
        from: 0.0
        to: 10000.0
        duration: 10000000
        loops: Animation.Infinite
        running: true
    }

    // Temporizador de movimiento continuo de cámara flotante (14 segundos)
    property real screensaverPhase: 0.0
    NumberAnimation on screensaverPhase {
        from: 0.0
        to: Math.PI * 2
        duration: 14000
        loops: Animation.Infinite
        running: true
    }

    // -------------------------------------------------------------------------
    // CAPA 1: Laberinto ASCII y Luces Neón en GPU (60 FPS)
    // -------------------------------------------------------------------------
    ShaderEffect {
        id: labyrinthShader
        z: 1
        anchors.fill: parent
        opacity: 1.0

        property real uTime: root.screensaverTime
        property vector2d uResolution: Qt.vector2d(width, height)

        fragmentShader: "shaders/labyrinth.frag.qsb"
    }

    // -------------------------------------------------------------------------
    // CAPA 2: Emblema SVG / PNG Central de Groove (Cámara Central del Laberinto)
    // -------------------------------------------------------------------------
    Item {
        id: logoCenter
        z: 10
        anchors.centerIn: parent
        width: Math.min(parent.width * 0.44, Kirigami.Units.gridUnit * 21)
        height: width * 0.66
        opacity: 0.0

        // Deriva suave y continua de cámara flotante
        x: (parent.width - width) / 2 + Math.sin(root.screensaverPhase) * 10
        y: (parent.height - height) / 2 + Math.cos(root.screensaverPhase * 0.8) * 7

        Image {
            id: logoImage
            anchors.fill: parent
            fillMode: Image.PreserveAspectFit
            asynchronous: false
            smooth: true
            source: "images/groove-logo-glow.png"

            // Respiración de escala cinematográfica (zoom de 7 segundos)
            SequentialAnimation on scale {
                loops: Animation.Infinite
                running: true
                NumberAnimation {
                    from: 1.00
                    to: 1.035
                    duration: 7000
                    easing.type: Easing.InOutSine
                }
                NumberAnimation {
                    from: 1.035
                    to: 1.00
                    duration: 7000
                    easing.type: Easing.InOutSine
                }
            }
        }
    }

    // -------------------------------------------------------------------------
    // CAPA 3: Tipografía Minimalista
    // -------------------------------------------------------------------------
    Text {
        z: 12
        anchors.bottom: parent.bottom
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.bottomMargin: Kirigami.Units.gridUnit * 2.2
        text: "L I N U X   G R O O V E"
        color: "#ffffff"
        font.pixelSize: Kirigami.Units.gridUnit * 0.70
        font.letterSpacing: 6
        font.weight: Font.DemiBold
        opacity: 0.75
    }

    // -------------------------------------------------------------------------
    // CAPA 4: Transiciones Suaves
    // -------------------------------------------------------------------------
    ParallelAnimation {
        id: introAnim
        NumberAnimation {
            target: labyrinthShader
            property: "opacity"
            from: 0.0
            to: 1.0
            duration: 1000
            easing.type: Easing.OutCubic
        }
        NumberAnimation {
            target: logoCenter
            property: "opacity"
            from: 0.0
            to: 1.0
            duration: 1200
            easing.type: Easing.OutCubic
        }
    }

    NumberAnimation {
        id: fadeOutAnim
        target: root
        property: "opacity"
        from: 1.0
        to: 0.0
        duration: 600
        easing.type: Easing.InOutQuad
    }
}
