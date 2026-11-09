// Only the initial layout. Existing user panels are never rewritten.
if (panels().length === 0) {
    const top = new Panel;
    top.location = "top";
    top.height = 34;
    const kickoff = top.addWidget("org.kde.plasma.kickoff");
    kickoff.currentConfigGroup = ["General"];
    kickoff.writeConfig("icon", "groove-start-here");
    top.addWidget("org.kde.plasma.appmenu");
    top.addWidget("org.kde.plasma.panelspacer");
    top.addWidget("org.kde.plasma.systemtray");
    top.addWidget("org.kde.plasma.digitalclock");
    const dock = new Panel;
    dock.location = "bottom";
    dock.height = 64;
    dock.alignment = "center";
    dock.floating = true;
    dock.lengthMode = "fit";
    const tasks = dock.addWidget("org.kde.plasma.icontasks");
    tasks.currentConfigGroup = ["General"];
    tasks.writeConfig("launchers", ["applications:org.kde.dolphin.desktop", "applications:org.kde.konsole.desktop", "applications:firefox.desktop", "applications:org.groove.mediaplayer.desktop", "applications:org.kde.discover.desktop", "applications:systemsettings.desktop"]);
}
