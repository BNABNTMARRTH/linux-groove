import QtQuick
import QtQuick.Controls as QQC2
import QtQuick.Layouts
import org.kde.kirigami as Kirigami
import org.kde.plasma.plasmoid

Kirigami.FormLayout {
    id: root

    property alias cfg_showVolumeSlider: volumeCheck.checked
    property alias cfg_enableLiveVideo: videoCheck.checked
    property alias cfg_enableWaveformFallback: waveCheck.checked
    property alias cfg_customOpacity: opacitySlider.value

    QQC2.CheckBox {
        id: volumeCheck
        Kirigami.FormData.label: i18n("Controles de audio:")
        text: i18n("Mostrar barra de control de volumen en el reproductor")
        onToggled: Plasmoid.configuration.showVolumeSlider = checked
    }

    QQC2.CheckBox {
        id: videoCheck
        Kirigami.FormData.label: i18n("Flujo visual:")
        text: i18n("Habilitar ventana de video en vivo (Live Video PiP)")
        onToggled: Plasmoid.configuration.enableLiveVideo = checked
    }

    QQC2.CheckBox {
        id: waveCheck
        text: i18n("Mostrar ondas sonoras neón de Groove cuando solo haya audio")
        onToggled: Plasmoid.configuration.enableWaveformFallback = checked
    }

    RowLayout {
        Kirigami.FormData.label: i18n("Opacidad del cristal (Glassmorphism):")
        QQC2.Slider {
            id: opacitySlider
            from: 0.1
            to: 1.0
            stepSize: 0.02
            Layout.fillWidth: true
            onMoved: Plasmoid.configuration.customOpacity = value
        }
        QQC2.Label {
            text: Math.round(opacitySlider.value * 100) + "%"
            Layout.minimumWidth: Kirigami.Units.gridUnit * 2
        }
    }
}

