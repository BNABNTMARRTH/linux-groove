/*
    Linux Groove - Groove Stroke Screensaver Splash Screen (GLSL GPU Shader Edition)
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

    // Temporizador continuo ultra fluido para el Shader
    property real screensaverTime: 0.0
    NumberAnimation on screensaverTime {
        from: 0.0
        to: 10000.0
        duration: 10000000
        loops: Animation.Infinite
        running: true
    }

    // -------------------------------------------------------------------------
    // CAPA 1: Esfera de Cristal Eléctrica (Plasma Shader en GPU a 60 FPS)
    // -------------------------------------------------------------------------
    ShaderEffect {
        id: ribbonsShader
        z: 1
        anchors.fill: parent
        opacity: 1.0

        property real uTime: root.screensaverTime
        property vector2d uResolution: Qt.vector2d(width, height)

        fragmentShader: "shaders/ribbons.frag.qsb"
    }

    // -------------------------------------------------------------------------
    // CAPA 2: Emblema SVG / PNG Central de Groove (Electrodo de Alta Tensión)
    // -------------------------------------------------------------------------
    Item {
        id: logoCenter
        z: 10
        anchors.centerIn: parent
        width: Math.min(parent.width * 0.44, Kirigami.Units.gridUnit * 21)
        height: width * 0.66
        opacity: 1.0

        Image {
            id: logoImage
            anchors.fill: parent
            fillMode: Image.PreserveAspectFit
            asynchronous: false
            smooth: true
            source: "images/groove-logo-glow.png"

            SequentialAnimation on scale {
                loops: Animation.Infinite
                running: true
                NumberAnimation { from: 0.99; to: 1.015; duration: 2800; easing.type: Easing.InOutSine }
                NumberAnimation { from: 1.015; to: 0.99; duration: 2800; easing.type: Easing.InOutSine }
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
        color: "#6b7d92"
        font.pixelSize: Kirigami.Units.gridUnit * 0.70
        font.letterSpacing: 6
        font.weight: Font.DemiBold
        opacity: 0.70
    }

    // -------------------------------------------------------------------------
    // CAPA 3: Transiciones Suaves
    // -------------------------------------------------------------------------
    ParallelAnimation {
        id: introAnim
        NumberAnimation {
            target: ribbonsShader
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
            duration: 900
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
