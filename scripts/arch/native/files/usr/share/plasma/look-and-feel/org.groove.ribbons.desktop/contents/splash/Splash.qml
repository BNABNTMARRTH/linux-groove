/*
    Linux Groove - Dynamic Ribbons Screensaver Splash Screen
    Ondas de luz tipo listones que esquivan el logotipo central
    SPDX-License-Identifier: GPL-2.0-or-later
*/

import QtQuick
import org.kde.kirigami as Kirigami

Rectangle {
    id: root
    color: "#000000" // Fondo 100% negro puro absoluto

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

    // -------------------------------------------------------------------------
    // 3 Osciladores armónicos con frecuencias aperiódicas (movimiento no repetitivo)
    // -------------------------------------------------------------------------
    property real t1: 0.0
    property real t2: 0.0
    property real t3: 0.0

    NumberAnimation on t1 {
        from: 0.0; to: Math.PI * 2
        duration: 12000
        loops: Animation.Infinite; running: true
    }
    NumberAnimation on t2 {
        from: 0.0; to: Math.PI * 2
        duration: 19000
        loops: Animation.Infinite; running: true
    }
    NumberAnimation on t3 {
        from: 0.0; to: Math.PI * 2
        duration: 27000
        loops: Animation.Infinite; running: true
    }

    // -------------------------------------------------------------------------
    // LIENZO DE LISTONES DE LUZ (CANVAS GPU CON MEZCLA ADITIVA)
    // -------------------------------------------------------------------------
    Canvas {
        id: ribbonsCanvas
        anchors.fill: parent
        antialiasing: true
        renderTarget: Canvas.Image

        onPaint: {
            var ctx = getContext("2d");
            ctx.clearRect(0, 0, width, height);

            var w = width;
            var h = height;

            var a1 = root.t1;
            var a2 = root.t2;
            var a3 = root.t3;

            // Modo de fusión de luz aditiva pura (comportamiento de neón/pantalla de plasma)
            ctx.globalCompositeOperation = "lighter";

            // =================================================================
            // 1. LISTÓN INFERIOR: FUEGO Y ÁMBAR (Curva que pasa POR DEBAJO del logo)
            // =================================================================
            // Zona Y despejada: y > 0.72*h (el logo termina en ~0.64*h)
            var p0x = 0;
            var p0y = h * 0.84 + Math.sin(a1) * 35;
            var cp1x = w * 0.28;
            var cp1y = h * 0.72 + Math.cos(a2) * 25;
            var cp2x = w * 0.50;
            var cp2y = h * 0.82 + Math.sin(a3) * 22; // Panza segura que esquiva las teclas
            var cp3x = w * 0.74;
            var cp3y = h * 0.68 + Math.cos(a1) * 28;
            var p3x = w;
            var p3y = h * 0.62 + Math.sin(a2) * 32;

            // Velo de seda translúcido ámbar
            var amberMesh = ctx.createLinearGradient(0, h * 0.6, w, h * 0.9);
            amberMesh.addColorStop(0.0, "rgba(255, 100, 0, 0.0)");
            amberMesh.addColorStop(0.3, "rgba(255, 130, 20, 0.08)");
            amberMesh.addColorStop(0.7, "rgba(255, 170, 40, 0.06)");
            amberMesh.addColorStop(1.0, "rgba(255, 100, 0, 0.0)");

            ctx.beginPath();
            ctx.moveTo(p0x, p0y - 20);
            ctx.bezierCurveTo(cp1x, cp1y - 20, cp2x, cp2y - 20, p3x, p3y - 20);
            ctx.bezierCurveTo(cp3x, cp3y + 25, cp2x, cp2y + 25, p0x, p0y + 25);
            ctx.closePath();
            ctx.fillStyle = amberMesh;
            ctx.fill();

            // Filamentos estriados de neón dorado/ámbar (10 cuerdas luminosas)
            ctx.shadowColor = "#ff9900";
            ctx.shadowBlur = 18;
            for (var i = 0; i < 9; i++) {
                var o = (i - 4) * 6; // Desplazamiento fino en píxeles
                var alpha = 0.28 + (i * 0.08);
                ctx.lineWidth = 1.4;
                ctx.strokeStyle = "rgba(255, " + (130 + i * 14) + ", " + (15 + i * 18) + ", " + alpha + ")";

                ctx.beginPath();
                ctx.moveTo(p0x, p0y + o + Math.sin(a1 + i * 0.12) * 12);
                ctx.bezierCurveTo(
                    cp1x, cp1y + o * 0.8 + Math.cos(a2 + i * 0.1) * 15,
                    cp2x, cp2y + o * 1.1 + Math.sin(a3 + i * 0.14) * 14,
                    p3x, p3y + o + Math.cos(a1 + i * 0.1) * 10
                );
                ctx.stroke();
            }

            // =================================================================
            // 2. LISTÓN CRUZADO: AZUL ELÉCTRICO / CIAN (Bordeando el cuadrante derecho e inferior)
            // =================================================================
            var b0x = w;
            var b0y = h * 0.88 + Math.cos(a3) * 30;
            var bcp1x = w * 0.74;
            var bcp1y = h * 0.74 + Math.sin(a1) * 26;
            var bcp2x = w * 0.54;
            var bcp2y = h * 0.76 + Math.cos(a2) * 20; // Borde inferior derecho, esquiva teclas
            var bcp3x = w * 0.26;
            var bcp3y = h * 0.86 + Math.sin(a3) * 28;
            var bp3x = 0;
            var bp3y = h * 0.80 + Math.cos(a1) * 32;

            // Velo de seda cian
            var blueMesh = ctx.createLinearGradient(w, h * 0.7, 0, h * 0.9);
            blueMesh.addColorStop(0.0, "rgba(0, 180, 255, 0.0)");
            blueMesh.addColorStop(0.35, "rgba(0, 215, 255, 0.09)");
            blueMesh.addColorStop(0.70, "rgba(60, 120, 255, 0.06)");
            blueMesh.addColorStop(1.0, "rgba(0, 180, 255, 0.0)");

            ctx.beginPath();
            ctx.moveTo(b0x, b0y - 18);
            ctx.bezierCurveTo(bcp1x, bcp1y - 18, bcp2x, bcp2y - 18, bp3x, bp3y - 18);
            ctx.bezierCurveTo(bcp3x, bcp3y + 22, bcp2x, bcp2y + 22, b0x, b0y + 22);
            ctx.closePath();
            ctx.fillStyle = blueMesh;
            ctx.fill();

            // Filamentos estriados cian/azul (9 cuerdas luminosas)
            ctx.shadowColor = "#00d4ff";
            ctx.shadowBlur = 18;
            for (var j = 0; j < 9; j++) {
                var bo = (j - 4) * 6;
                var bAlpha = 0.28 + (j * 0.08);
                ctx.lineWidth = 1.4;
                ctx.strokeStyle = "rgba(0, " + (185 + j * 8) + ", 255, " + bAlpha + ")";

                ctx.beginPath();
                ctx.moveTo(b0x, b0y + bo + Math.cos(a3 + j * 0.12) * 12);
                ctx.bezierCurveTo(
                    bcp1x, bcp1y + bo * 0.9 + Math.sin(a1 + j * 0.1) * 14,
                    bcp2x, bcp2y + bo * 1.1 + Math.cos(a2 + j * 0.13) * 12,
                    bp3x, bp3y + bo + Math.sin(a3 + j * 0.1) * 10
                );
                ctx.stroke();
            }

            // =================================================================
            // 3. LISTÓN SUPERIOR: AURORA VIOLETA / MAGENTA (Pasa POR ARRIBA del logo)
            // =================================================================
            // Zona Y despejada: y < 0.32*h (el logo empieza en ~0.36*h)
            var v0x = 0;
            var v0y = h * 0.20 + Math.cos(a1) * 26;
            var vcp1x = w * 0.28;
            var vcp1y = h * 0.30 + Math.sin(a2) * 24;
            var vcp2x = w * 0.50;
            var vcp2y = h * 0.18 + Math.cos(a3) * 20; // Arco que vuela por encima del logo
            var vcp3x = w * 0.74;
            var vcp3y = h * 0.32 + Math.sin(a1) * 26;
            var vp3x = w;
            var vp3y = h * 0.24 + Math.cos(a2) * 28;

            ctx.shadowColor = "#e040fb";
            ctx.shadowBlur = 18;
            for (var k = 0; k < 7; k++) {
                var vo = (k - 3) * 5;
                ctx.lineWidth = 1.4;
                ctx.strokeStyle = "rgba(225, 75, 255, " + (0.30 + k * 0.09) + ")";

                ctx.beginPath();
                ctx.moveTo(v0x, v0y + vo + Math.sin(a1 + k * 0.15) * 10);
                ctx.bezierCurveTo(
                    vcp1x, vcp1y + vo * 0.8 + Math.cos(a2 + k * 0.12) * 12,
                    vcp2x, vcp2y + vo * 1.1 + Math.sin(a3 + k * 0.14) * 12,
                    vp3x, vp3y + vo + Math.cos(a1 + k * 0.1) * 10
                );
                ctx.stroke();
            }

            // =================================================================
            // 4. LISTÓN DE ESCUDO LATERAL: ABRAZA EL FLANCO IZQUIERDO DEL LOGO
            // =================================================================
            // Bordeando x < 0.32*w para rodear sin tocar
            var s0x = w * 0.14 + Math.sin(a2) * 20;
            var s0y = h * 0.12;
            var scp1x = w * 0.28 + Math.cos(a3) * 18;
            var scp1y = h * 0.35;
            var scp2x = w * 0.26 + Math.sin(a1) * 22;
            var scp2y = h * 0.65;
            var sp3x = w * 0.12 + Math.cos(a2) * 20;
            var sp3y = h * 0.88;

            ctx.shadowColor = "#ff9500";
            ctx.shadowBlur = 16;
            for (var m = 0; m < 5; m++) {
                var so = (m - 2) * 6;
                ctx.lineWidth = 1.3;
                ctx.strokeStyle = "rgba(255, " + (160 + m * 20) + ", 40, " + (0.30 + m * 0.10) + ")";

                ctx.beginPath();
                ctx.moveTo(s0x + so, s0y);
                ctx.bezierCurveTo(scp1x + so, scp1y, scp2x + so, scp2y, sp3x + so, sp3y);
                ctx.stroke();
            }

            ctx.shadowBlur = 0;
            ctx.shadowColor = "transparent";
            ctx.globalCompositeOperation = "source-over";
        }
    }

    Timer {
        interval: 33 // 30 FPS estables y continuos
        running: true
        repeat: true
        onTriggered: ribbonsCanvas.requestPaint()
    }

    // -------------------------------------------------------------------------
    // CAPA 2: Emblema de Teclas Central (Groove Piano Keys)
    // Flotando limpio en el centro sobre el negro puro, sin ser tocado por las ondas
    // -------------------------------------------------------------------------
    Item {
        id: logoCenter
        anchors.centerIn: parent
        width: Math.min(parent.width * 0.44, Kirigami.Units.gridUnit * 21)
        height: width * 0.66
        opacity: 0.0

        Image {
            id: logoImage
            anchors.fill: parent
            fillMode: Image.PreserveAspectFit
            asynchronous: false
            smooth: true
            source: "images/groove-logo-glow.png"

            // Pulso de respiración armónico
            SequentialAnimation on scale {
                loops: Animation.Infinite
                running: true
                NumberAnimation { from: 0.99; to: 1.015; duration: 2800; easing.type: Easing.InOutSine }
                NumberAnimation { from: 1.015; to: 0.99; duration: 2800; easing.type: Easing.InOutSine }
            }
        }
    }

    // Pie de página minimalista
    Text {
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
    NumberAnimation {
        id: introAnim
        target: logoCenter
        property: "opacity"
        from: 0.0
        to: 1.0
        duration: 900
        easing.type: Easing.OutCubic
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
