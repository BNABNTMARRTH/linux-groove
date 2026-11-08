/*
    Linux Groove - Groove Labyrinth Screensaver Splash Screen (Cyberpunk ASCII Matrix Edition)
    Dynamic Light Projection on SVG Soundwave + Seamless Matrix Maze
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

    // Respiración de escala cinematográfica (zoom de 7 segundos)
    property real logoScale: 1.0
    SequentialAnimation on logoScale {
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

    // -------------------------------------------------------------------------
    // CAPA 1: Textura Fuente del Emblema Soundwave (Cargada en VRAM para GLSL)
    // -------------------------------------------------------------------------
    Image {
        id: logoSource
        source: "images/groove-soundwave-clean.png"
        visible: false
        smooth: true
        asynchronous: false
    }

    // -------------------------------------------------------------------------
    // CAPA 2: Laberinto ASCII + Corredores Neón + Iluminación Dinámica sobre SVG
    // -------------------------------------------------------------------------
    ShaderEffect {
        id: labyrinthShader
        z: 1
        anchors.fill: parent
        opacity: 0.0

        property real uTime: root.screensaverTime
        property vector2d uResolution: Qt.vector2d(Math.max(1.0, width), Math.max(1.0, height))

        // Centro flotante del logotipo con deriva suave de cámara
        property vector2d uLogoCenter: Qt.vector2d(
            0.50 + (Math.sin(root.screensaverPhase) * 12.0) / Math.max(1.0, width),
            0.50 + (Math.cos(root.screensaverPhase * 0.8) * 8.0) / Math.max(1.0, height)
        )

        // Dimensión normalizada manteniendo aspect ratio 1:1 estricto
        property real baseLogoWidth: Math.min(width * 0.32, height * 0.50, 400.0) * root.logoScale
        property vector2d uLogoSize: Qt.vector2d(
            baseLogoWidth / Math.max(1.0, width),
            baseLogoWidth / Math.max(1.0, height)
        )

        property var sourceLogo: logoSource

        fragmentShader: "shaders/labyrinth.frag.qsb"
    }

    // -------------------------------------------------------------------------
    // CAPA 3: Tipografía Minimalista
    // -------------------------------------------------------------------------
    Text {
        z: 10
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
