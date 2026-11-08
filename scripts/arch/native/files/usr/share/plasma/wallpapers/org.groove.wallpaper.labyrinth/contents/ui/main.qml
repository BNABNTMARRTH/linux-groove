/*
    Linux Groove - Interactive Cyberpunk ASCII Labyrinth Dynamic Wallpaper
    Wallpaper Plugin for KDE Plasma 6 (Plasma/Wallpaper)
    SPDX-License-Identifier: GPL-2.0-or-later
*/

import QtQuick
import org.kde.kirigami as Kirigami
import org.kde.plasma.plasmoid

WallpaperItem {
    id: root

    // Temporizador continuo para el Shader GLSL (GPU 60 FPS)
    property real wallpaperTime: 0.0
    NumberAnimation on wallpaperTime {
        from: 0.0
        to: 100000.0
        duration: 100000000
        loops: Animation.Infinite
        running: true
    }

    // Deriva suave y lenta de cámara (18 segundos)
    property real cameraPhase: 0.0
    NumberAnimation on cameraPhase {
        from: 0.0
        to: Math.PI * 2
        duration: 18000
        loops: Animation.Infinite
        running: true
    }

    // Respiración sutil de escala cinematográfica (8 segundos)
    property real logoScale: 1.0
    SequentialAnimation on logoScale {
        loops: Animation.Infinite
        running: true
        NumberAnimation {
            from: 1.00
            to: 1.03
            duration: 8000
            easing.type: Easing.InOutSine
        }
        NumberAnimation {
            from: 1.03
            to: 1.00
            duration: 8000
            easing.type: Easing.InOutSine
        }
    }

    // -------------------------------------------------------------------------
    // SEGUIMIENTO INTERACTIVO DEL CURSOR (Sin bloquear clicks del escritorio)
    // -------------------------------------------------------------------------
    property point targetMouse: Qt.point(0.5, 0.5)
    property point smoothMouse: Qt.point(0.5, 0.5)
    property real mouseHovered: 0.0

    // HoverHandler moderno de Qt 6
    HoverHandler {
        id: hoverHandler
        onPointChanged: {
            if (root.width > 0 && root.height > 0) {
                root.targetMouse = Qt.point(
                    point.position.x / root.width,
                    point.position.y / root.height
                );
                root.mouseHovered = 1.0;
            }
        }
    }

    // MouseArea de respaldo sin captura de clicks (acceptedButtons: Qt.NoButton)
    MouseArea {
        anchors.fill: parent
        hoverEnabled: true
        acceptedButtons: Qt.NoButton // Permite que los clicks pasen al escritorio
        onPositionChanged: (mouse) => {
            if (root.width > 0 && root.height > 0) {
                root.targetMouse = Qt.point(
                    mouse.x / root.width,
                    mouse.y / root.height
                );
                root.mouseHovered = 1.0;
            }
        }
        onExited: {
            root.mouseHovered = 0.0;
        }
    }

    // Amortiguación física lerp para movimiento de estela suave
    Timer {
        interval: 16 // 60 Hz
        repeat: true
        running: true
        onTriggered: {
            var tx = root.targetMouse.x;
            var ty = root.targetMouse.y;
            var sx = root.smoothMouse.x;
            var sy = root.smoothMouse.y;
            root.smoothMouse = Qt.point(
                sx + (tx - sx) * 0.16,
                sy + (ty - sy) * 0.16
            );
        }
    }

    // -------------------------------------------------------------------------
    // CAPA 1: Textura Fuente del Emblema Soundwave en Blanco Puro en VRAM
    // -------------------------------------------------------------------------
    Image {
        id: logoSource
        source: "../images/groove-soundwave-white.png"
        visible: false
        smooth: true
        asynchronous: false
    }

    // -------------------------------------------------------------------------
    // CAPA 2: Shader del Laberinto ASCII + Corredores Reactivos + Faro del Cursor
    // -------------------------------------------------------------------------
    ShaderEffect {
        id: labyrinthShader
        z: 1
        anchors.fill: parent

        property real uTime: root.wallpaperTime
        property vector2d uResolution: Qt.vector2d(Math.max(1.0, width), Math.max(1.0, height))

        // Centro flotante del logotipo
        property vector2d uLogoCenter: Qt.vector2d(
            0.50 + (Math.sin(root.cameraPhase) * 10.0) / Math.max(1.0, width),
            0.50 + (Math.cos(root.cameraPhase * 0.8) * 6.0) / Math.max(1.0, height)
        )

        // Dimensión normalizada manteniendo proporción 1:1
        property real baseLogoWidth: Math.min(width * 0.30, height * 0.48, 420.0) * root.logoScale
        property vector2d uLogoSize: Qt.vector2d(
            baseLogoWidth / Math.max(1.0, width),
            baseLogoWidth / Math.max(1.0, height)
        )

        // Posición y estado interactivo del cursor del ratón
        property vector2d uMouse: Qt.vector2d(root.smoothMouse.x, root.smoothMouse.y)
        property real uMouseHover: root.mouseHovered
        property real uPadding: 0.0

        property var sourceLogo: logoSource

        fragmentShader: "../shaders/labyrinth_interactive.frag.qsb"
    }

    // -------------------------------------------------------------------------
    // CAPA 3: Tipografía Minimalista
    // -------------------------------------------------------------------------
    Text {
        z: 10
        anchors.bottom: parent.bottom
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.bottomMargin: Kirigami.Units.gridUnit * 2.4
        text: "L I N U X   G R O O V E"
        color: "#ffffff"
        font.pixelSize: Kirigami.Units.gridUnit * 0.70
        font.letterSpacing: 6
        font.weight: Font.DemiBold
        opacity: 0.70
    }
}
