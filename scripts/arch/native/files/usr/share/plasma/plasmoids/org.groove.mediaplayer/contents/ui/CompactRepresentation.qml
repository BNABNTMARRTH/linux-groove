import QtQuick
import QtQuick.Layouts
import org.kde.kirigami as Kirigami
import org.kde.plasma.core as PlasmaCore
import org.kde.plasma.plasmoid
import org.kde.plasma.components as PlasmaComponents
import org.kde.plasma.plasma5support as Plasma5Support

Item {
    id: compactRoot

    readonly property bool isPlaying: root.currentMprisPlayer && (root.currentMprisPlayer.playbackStatus === 2 || root.currentMprisPlayer.playbackStatus === "Playing")

    implicitWidth: Kirigami.Units.iconSizes.medium
    implicitHeight: Kirigami.Units.iconSizes.medium

    property real currentVolume: 0.80

    Plasma5Support.DataSource {
        id: compactAudioExec
        engine: "executable"
        connectedSources: []
        onNewData: (sourceName, data) => {
            var out = data["stdout"] ? data["stdout"].trim() : "";
            if (sourceName.indexOf("get-volume") !== -1 && out.indexOf("Volume:") !== -1) {
                var parts = out.split(" ");
                if (parts.length >= 2) {
                    var parsed = parseFloat(parts[1]);
                    if (!isNaN(parsed)) {
                        compactRoot.currentVolume = Math.min(1.0, Math.max(0.0, parsed));
                    }
                }
            }
            disconnectSource(sourceName);
        }
    }

    function adjustVolumeWithOsd(deltaStep) {
        var nextVol = Math.min(1.0, Math.max(0.0, compactRoot.currentVolume + deltaStep));
        compactRoot.currentVolume = nextVol;
        var pct = Math.round(nextVol * 100);
        var appName = (root.currentMprisPlayer && root.currentMprisPlayer.identity) ? root.currentMprisPlayer.identity : "Mozilla firefox";
        var safeAppName = appName.replace(/"/g, "");
        var osdIcon = (root.currentMprisPlayer && root.currentMprisPlayer.iconName && root.currentMprisPlayer.iconName !== "")
            ? root.currentMprisPlayer.iconName
            : "emblem-music-symbolic";
        var cmd = "wpctl set-mute @DEFAULT_AUDIO_SINK@ 0 && wpctl set-volume @DEFAULT_AUDIO_SINK@ " + nextVol.toFixed(2)
            + " && qdbus6 org.kde.plasmashell /org/kde/osdService org.kde.osdService.mediaPlayerVolumeChanged "
            + pct + " \"" + safeAppName + "\" \"" + osdIcon + "\"";
        compactAudioExec.connectSource(cmd);
        if (root.currentMprisPlayer && root.currentMprisPlayer.canControl) {
            root.currentMprisPlayer.changeVolume(deltaStep, false);
        }
    }

    Component.onCompleted: {
        compactAudioExec.connectSource("wpctl get-volume @DEFAULT_AUDIO_SINK@");
    }

    Kirigami.Icon {
        id: mediaIcon
        anchors.centerIn: parent
        width: Math.min(parent.width, parent.height) * 0.85
        height: width

        source: {
            if (!root.currentMprisPlayer) {
                return "emblem-music-symbolic";
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
        var artist = root.currentMprisPlayer.artist || "";
        var idName = root.currentMprisPlayer.identity || "";
        var byLine = artist !== "" ? i18n("por %1 (%2)", artist, idName) : idName;
        return title + "\n" + byLine + "\n" + i18n("Pulse con el botón central para pausar") + "\n" + i18n("Desplace para ajustar el volumen");
    }

    MouseArea {
        id: mouseArea
        anchors.fill: parent
        hoverEnabled: true
        acceptedButtons: Qt.LeftButton | Qt.MiddleButton

        onClicked: mouse => {
            if (mouse.button === Qt.MiddleButton) {
                if (root.currentMprisPlayer && (root.currentMprisPlayer.canPlay || root.currentMprisPlayer.canPause)) {
                    root.currentMprisPlayer.PlayPause();
                }
            } else {
                root.expanded = !root.expanded;
            }
        }

        onWheel: wheel => {
            var delta = wheel.angleDelta.y > 0 ? 0.05 : -0.05;
            compactRoot.adjustVolumeWithOsd(delta);
        }
    }
}
