import QtQuick
import QtQuick.Layouts
import org.kde.kirigami as Kirigami
import org.kde.plasma.core as PlasmaCore
import org.kde.plasma.plasmoid
import org.kde.plasma.components as PlasmaComponents

Item {
    id: compactRoot

    readonly property bool isPlaying: root.currentMprisPlayer && root.currentMprisPlayer.playbackStatus === 1 // Playing

    implicitWidth: Kirigami.Units.iconSizes.medium
    implicitHeight: Kirigami.Units.iconSizes.medium

    Kirigami.Icon {
        id: mediaIcon
        anchors.centerIn: parent
        width: Math.min(parent.width, parent.height) * 0.85
        height: width

        source: {
            if (!root.currentMprisPlayer) {
                return "multimedia-audio-player";
            }
            return compactRoot.isPlaying ? "media-playback-start" : "media-playback-pause";
        }
    }

    // Mini indicador de estado activo (Glow ámbar)
    Rectangle {
        width: 6
        height: 6
        radius: 3
        color: "#ffaa00"
        visible: compactRoot.isPlaying
        anchors.right: parent.right
        anchors.bottom: parent.bottom
    }

    PlasmaComponents.ToolTip.visible: mouseArea.containsMouse
    PlasmaComponents.ToolTip.text: {
        if (!root.currentMprisPlayer) {
            return i18n("Reproductor Groove (Inactivo)");
        }
        var title = root.currentMprisPlayer.track || i18n("Pista desconocida");
        var artist = root.currentMprisPlayer.artist || root.currentMprisPlayer.identity;
        return title + "\n" + artist;
    }

    MouseArea {
        id: mouseArea
        anchors.fill: parent
        hoverEnabled: true
        acceptedButtons: Qt.LeftButton | Qt.MiddleButton

        onClicked: mouse => {
            if (mouse.button === Qt.MiddleButton) {
                if (root.currentMprisPlayer && root.currentMprisPlayer.canPlay) {
                    root.currentMprisPlayer.PlayPause();
                }
            } else {
                root.expanded = !root.expanded;
            }
        }

        onWheel: wheel => {
            if (root.currentMprisPlayer) {
                var delta = wheel.angleDelta.y > 0 ? 0.05 : -0.05;
                root.currentMprisPlayer.changeVolume(delta, true);
            }
        }
    }
}

