import QtQuick
import QtQuick.Controls as QQC2
import QtQuick.Layouts
import org.kde.kirigami as Kirigami
import org.kde.plasma.plasmoid

Kirigami.FormLayout {
    id: root

    property alias cfg_bgStyle: styleCombo.currentIndex
    property alias cfg_customOpacity: opacitySlider.value
    property alias cfg_barGlow: glowCheck.checked
    property alias cfg_showTitle: titleCheck.checked

    QQC2.ComboBox {
        id: styleCombo
        Kirigami.FormData.label: i18n("Estilo de fondo:")
        model: [
            i18n("Cristal Esmerilado (Glassmorphism)"),
            i18n("Totalmente Transparente (Flotante)"),
            i18n("Sólido Ahumado")
        ]
        // Actualización instantánea en vivo al seleccionar estilo
        onActivated: {
            Plasmoid.configuration.bgStyle = currentIndex;
        }
    }

    RowLayout {
        Kirigami.FormData.label: i18n("Opacidad del cristal:")
        QQC2.Slider {
            id: opacitySlider
            from: 0.0
            to: 1.0
            stepSize: 0.01
            Layout.fillWidth: true
            // Actualización instantánea en tiempo real conforme se arrastra el slider
            onMoved: {
                Plasmoid.configuration.customOpacity = value;
            }
        }
        QQC2.Label {
            text: Math.round(opacitySlider.value * 100) + "%"
            Layout.minimumWidth: Kirigami.Units.gridUnit * 2
        }
    }

    QQC2.CheckBox {
        id: glowCheck
        Kirigami.FormData.label: i18n("Efectos:")
        text: i18n("Resplandor de neón (Glow)")
        // Actualización instantánea en vivo
        onToggled: {
            Plasmoid.configuration.barGlow = checked;
        }
    }

    QQC2.CheckBox {
        id: titleCheck
        text: i18n("Mostrar etiqueta 'Linux Groove'")
        // Actualización instantánea en vivo
        onToggled: {
            Plasmoid.configuration.showTitle = checked;
        }
    }
}
