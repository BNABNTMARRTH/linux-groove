/*
    Linux Groove - Ambient Neon Screensaver Splash Screen
    SPDX-License-Identifier: GPL-2.0-or-later
*/

import QtQuick
import org.kde.kirigami as Kirigami

Rectangle {
    id: root
    color: "#000000" // 100% Negro absoluto de fondo

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

    // Temporizador de movimiento continuo tipo protector de pantalla
    property real screensaverPhase: 0.0
    NumberAnimation on screensaverPhase {
        from: 0.0
        to: Math.PI * 2
        duration: 14000 // 14 segundos: cadencia pausada, hipnótica y fluida
        loops: Animation.Infinite
        running: true
    }

    // -------------------------------------------------------------------------
    // CAPA 1: Ondas de Neón y Teclado Maestro con Movimiento de Cámara Orgánico
    // -------------------------------------------------------------------------
    Item {
        id: sceneContainer
        anchors.fill: parent
        opacity: 0.0 // Desvanece desde negro absoluto

        // Deriva suave y continua en los ejes X e Y (efecto cámara flotante)
        x: Math.sin(root.screensaverPhase) * 12
        y: Math.cos(root.screensaverPhase * 0.8) * 8

        // Arte maestro de alta resolución con las ondas de neón y teclas
        Image {
            id: masterWaveArt
            anchors.fill: parent
            fillMode: Image.PreserveAspectCrop
            asynchronous: false
            smooth: true
            source: "images/groove-waves-master.png"

            // Respiración de escala cinematográfica (screensaver zoom continuo)
            SequentialAnimation on scale {
                loops: Animation.Infinite
                running: true
                NumberAnimation {
                    from: 1.00
                    to: 1.03
                    duration: 7000
                    easing.type: Easing.InOutSine
                }
                NumberAnimation {
                    from: 1.03
                    to: 1.00
                    duration: 7000
                    easing.type: Easing.InOutSine
                }
            }
        }

        // ---------------------------------------------------------------------
        // CAPA 2: Pulso Dinámico de Luz de Neón (Shimmer / Barrido de Energía)
        // Crea la sensación de que la electricidad y la luz fluyen por las ondas
        // ---------------------------------------------------------------------
        Rectangle {
            anchors.fill: parent
            color: "transparent"

            // Resplandor pulsante ámbar en el cuadrante izquierdo
            Rectangle {
                width: parent.width * 0.55
                height: parent.height * 0.70
                anchors.left: parent.left
                anchors.bottom: parent.bottom
                color: "transparent"
                opacity: 0.20 + Math.sin(root.screensaverPhase * 1.5) * 0.15

                gradient: Gradient {
                    orientation: Gradient.Horizontal
                    GradientStop { position: 0.0; color: "transparent" }
                    GradientStop { position: 0.45; color: "#44ff8800" }
                    GradientStop { position: 1.0; color: "transparent" }
                }
            }

            // Resplandor pulsante azul eléctrico / cian en el cuadrante derecho
            Rectangle {
                width: parent.width * 0.55
                height: parent.height * 0.70
                anchors.right: parent.right
                anchors.top: parent.top
                color: "transparent"
                opacity: 0.20 + Math.cos(root.screensaverPhase * 1.3) * 0.15

                gradient: Gradient {
                    orientation: Gradient.Horizontal
                    GradientStop { position: 0.0; color: "transparent" }
                    GradientStop { position: 0.55; color: "#4400c8ff" }
                    GradientStop { position: 1.0; color: "transparent" }
                }
            }

            // Destello de energía que viaja a través de las teclas centrales
            Rectangle {
                width: parent.width * 0.35
                height: parent.height * 0.45
                anchors.centerIn: parent
                radius: width / 2
                color: "transparent"
                opacity: 0.15 + Math.sin(root.screensaverPhase * 2.0) * 0.12

                gradient: Gradient {
                    orientation: Gradient.Horizontal
                    GradientStop { position: 0.0; color: "transparent" }
                    GradientStop { position: 0.5; color: "#55ffffff" }
                    GradientStop { position: 1.0; color: "transparent" }
                }
            }
        }
    }

    // -------------------------------------------------------------------------
    // CAPA 3: Transiciones Suaves de Entrada y Salida
    // -------------------------------------------------------------------------
    NumberAnimation {
        id: introAnim
        target: sceneContainer
        property: "opacity"
        from: 0.0
        to: 1.0
        duration: 1000
        easing.type: Easing.InOutQuad
    }

    NumberAnimation {
        id: fadeOutAnim
        target: root
        property: "opacity"
        from: 1.0
        to: 0.0
        duration: 650
        easing.type: Easing.InOutQuad
    }
}
