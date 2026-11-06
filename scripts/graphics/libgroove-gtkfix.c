#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <dlfcn.h>

/*
 * libgroove-gtkfix:
 * Ensures GTK3 display connection and default screen are properly initialized
 * before Qt5 / CEF or other non-GTK frontends create GtkStyleContext or file dialogs.
 * This completely avoids the assertion failure in _gtk_style_provider_private_get_settings
 * and the 'Can't create a GtkStyleContext without a display connection' crash.
 */

__attribute__((constructor))
static void groove_gtk_fix_init(void) {
    const char *disp = getenv("DISPLAY");
    const char *wl_disp = getenv("WAYLAND_DISPLAY");
    if (!disp && !wl_disp) {
        return;
    }
    void *gtk = dlopen("libgtk-3.so.0", RTLD_LAZY | RTLD_GLOBAL);
    if (!gtk) {
        gtk = dlopen("/opt/groove-graphics/lib/libgtk-3.so.0", RTLD_LAZY | RTLD_GLOBAL);
    }
    if (!gtk) {
        return;
    }
    int (*p_gtk_init_check)(int *argc, char ***argv) = dlsym(gtk, "gtk_init_check");
    if (p_gtk_init_check) {
        int argc = 0;
        char **argv = NULL;
        p_gtk_init_check(&argc, &argv);
    }
}

