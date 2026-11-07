/*
    SPDX-FileCopyrightText: 2026 Linux Groove Team
    SPDX-License-Identifier: GPL-2.0-or-later
*/

import QtQuick
import QtQuick.Controls as QQC2
import QtQuick.Layouts
import org.kde.kirigami as Kirigami
import org.kde.kcmutils as KCM
import org.kde.plasma.core as PlasmaCore
import org.kde.plasma.plasmoid

KCM.SimpleKCM {
    id: root

    title: i18n("Transparencia y Cristal")

    property bool unsavedChanges: false

    function saveConfig() {
        Plasmoid.configuration.backgroundOpacity = bgOpacitySlider.value;
        Plasmoid.configuration.widgetOpacity = widgetOpacitySlider.value;
        Plasmoid.userBackgroundHints = bgModeCombo.currentValue;
        Plasmoid.configuration.writeConfig();
        unsavedChanges = false;
    }

    Kirigami.FormLayout {
        wideMode: true

        QQC2.ComboBox {
            id: bgModeCombo
            Kirigami.FormData.label: i18n("Modo de Fondo:")
            textRole: "text"
            valueRole: "value"
            model: [
                { text: i18n("Transparente Flotante (Recomendado)"), value: PlasmaCore.Types.ShadowBackground },
                { text: i18n("Cristal Translúcido (Glassmorphism)"), value: PlasmaCore.Types.TranslucentBackground },
                { text: i18n("Fondo Estándar del Tema"), value: PlasmaCore.Types.StandardBackground },
                { text: i18n("100% Invisible (Sin Sombra)"), value: PlasmaCore.Types.NoBackground }
            ]

            Component.onCompleted: {
                for (var i = 0; i < model.length; ++i) {
                    if (model[i].value === Plasmoid.userBackgroundHints) {
                        currentIndex = i;
                        break;
                    }
                }
            }

            // Actualización instantánea en vivo
            onActivated: {
                Plasmoid.userBackgroundHints = currentValue;
                root.unsavedChanges = true;
            }
        }

        RowLayout {
            Kirigami.FormData.label: i18n("Opacidad del Fondo:")
            QQC2.Slider {
                id: bgOpacitySlider
                from: 0.0
                to: 1.0
                stepSize: 0.01
                value: (Plasmoid.configuration.backgroundOpacity !== undefined) ? Plasmoid.configuration.backgroundOpacity : 1.0
                Layout.fillWidth: true

                // Actualización instantánea en tiempo real
                onMoved: {
                    Plasmoid.configuration.backgroundOpacity = value;
                    root.unsavedChanges = true;
                }
            }
            QQC2.Label {
                text: Math.round(bgOpacitySlider.value * 100) + "%"
                Layout.minimumWidth: Kirigami.Units.gridUnit * 2
            }
        }

        RowLayout {
            Kirigami.FormData.label: i18n("Opacidad General del Widget:")
            QQC2.Slider {
                id: widgetOpacitySlider
                from: 0.1
                to: 1.0
                stepSize: 0.01
                value: (Plasmoid.configuration.widgetOpacity !== undefined) ? Plasmoid.configuration.widgetOpacity : 1.0
                Layout.fillWidth: true

                // Actualización instantánea en tiempo real
                onMoved: {
                    Plasmoid.configuration.widgetOpacity = value;
                    root.unsavedChanges = true;
                }
            }
            QQC2.Label {
                text: Math.round(widgetOpacitySlider.value * 100) + "%"
                Layout.minimumWidth: Kirigami.Units.gridUnit * 2
            }
        }

        Kirigami.InlineMessage {
            Layout.fillWidth: true
            type: Kirigami.MessageType.Information
            text: i18n("Los ajustes de transparencia y cristal se reflejan en tiempo real en tu escritorio.")
            visible: true
        }
    }
}
