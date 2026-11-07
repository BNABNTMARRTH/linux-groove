import QtQuick
import QtQuick.Layouts
import org.kde.plasma.plasmoid
import org.kde.plasma.core as PlasmaCore
import org.kde.plasma.private.mpris as Mpris

PlasmoidItem {
    id: root

    // Configuración de fondo y contenedor
    Plasmoid.backgroundHints: PlasmaCore.Types.DefaultBackground

    Mpris.Mpris2Model {
        id: mprisModel
    }

    readonly property alias mprisModel: mprisModel
    readonly property var currentMprisPlayer: mprisModel.currentPlayer

    // ID de stream PipeWire opcional (suministrado por el daemon groove-media)
    property int pipeWireVideoNodeId: 0

    // Título dinámico para el widget / bandeja del sistema
    Plasmoid.title: currentMprisPlayer && currentMprisPlayer.track ? (currentMprisPlayer.track + " - " + (currentMprisPlayer.artist || currentMprisPlayer.identity)) : i18n("Reproductor Groove")
    toolTipMainText: Plasmoid.title
    toolTipSubText: currentMprisPlayer ? (currentMprisPlayer.identity + (currentMprisPlayer.playbackStatus === Mpris.PlaybackStatus.Playing ? " (" + i18n("Reproduciendo") + ")" : " (" + i18n("En pausa") + ")")) : i18n("Ningún reproductor activo")

    compactRepresentation: CompactRepresentation {}
    fullRepresentation: ExpandedRepresentation {}

    preferredRepresentation: fullRepresentation
}

