/*
 * groove-app-hub.c - 1-Click Application Catalog for Linux Groove OS
 * Inspired by Valve SteamOS Discover / Holo App Architecture
 * Supports Flathub, native Arch ARM64 packages, and AI harnesses.
 */

#define _GNU_SOURCE
#include <gtk/gtk.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

typedef struct {
    const char *id;
    const char *name;
    const char *desc;
    const char *icon;
    const char *category;
    const char *check_bin;
    const char *install_cmd;
    const char *badge;
    GtkWidget *btn;
    GtkWidget *spinner;
} AppEntry;

static AppEntry app_catalog[] = {
    // IA & Desarrollo
    {"opencode", "OpenCode AI", "Asistente de desarrollo e Inteligencia Artificial", "utilities-terminal",
     "IA & Desarrollo", "opencode", "curl -fsSL https://opencode.ai/install.sh | bash", "ARM64 · Nativo", NULL, NULL},
    {"ollama", "Ollama & DeepSeek", "Ejecuta modelos DeepSeek R1 localmente en ARM64", "system-run",
     "IA & Desarrollo", "ollama", "curl -fsSL https://ollama.com/install.sh | sh", "Local AI · Offline", NULL, NULL},
    {"vscodium", "VSCodium / Code", "Editor de código libre optimizado para ARM64", "text-editor",
     "IA & Desarrollo", "codium", "flatpak install -y flathub com.vscodium.codium", "Flathub · ARM64", NULL, NULL},
    {"antigravity", "Antigravity IDE", "Entorno de desarrollo agéntico avanzado", "system-software-install",
     "IA & Desarrollo", "antigravity", "/usr/libexec/groove-install-antigravity", "Agéntico · Pro", NULL, NULL},

    // 3D, Video & Diseño
    {"blender", "Blender 4.x", "Suite completa de modelado 3D, animación y VFX", "applications-graphics",
     "Diseño & 3D", "blender", "sudo pacman -S --noconfirm blender", "Arch ARM · GPU VirGL", NULL, NULL},
    {"krita", "Krita Pro", "Pintura digital, ilustración y arte conceptual", "applications-graphics",
     "Diseño & 3D", "krita", "sudo pacman -S --noconfirm krita", "Acelerado · Stylus", NULL, NULL},
    {"inkscape", "Inkscape Vector", "Ilustración vectorial profesional (SVG / PDF)", "applications-graphics",
     "Diseño & 3D", "inkscape", "sudo pacman -S --noconfirm inkscape", "Diseño Vectorial", NULL, NULL},
    {"gimp", "GIMP Foto", "Edición y retoque avanzado de imágenes", "applications-graphics",
     "Diseño & 3D", "gimp", "sudo pacman -S --noconfirm gimp", "Edición Gráfica", NULL, NULL},

    // Audio Pro & Sonido
    {"reaper", "REAPER DAW", "Estación de audio digital ultra-rápida y ligera", "multimedia-audio-player",
     "Audio Pro", "reaper", "flatpak install -y flathub fm.reaper.Reaper", "PREEMPT_RT · Audio", NULL, NULL},
    {"ardour", "Ardour Studio", "Grabación y mezcla profesional multicanal", "audio-speakers",
     "Audio Pro", "ardour", "sudo pacman -S --noconfirm ardour", "JACK2 & PipeWire", NULL, NULL},
    {"audacity", "Audacity", "Grabador y editor de ondas de audio multipista", "audio-input-microphone",
     "Audio Pro", "audacity", "sudo pacman -S --noconfirm audacity", "Edición Rápida", NULL, NULL},
    {"qpwgraph", "PipeWire Matrix", "Enrutador visual de conexiones de audio y MIDI", "multimedia-volume-control",
     "Audio Pro", "qpwgraph", "sudo pacman -S --noconfirm qpwgraph", "Matriz RT Oficial", NULL, NULL},

    // Ofimática & Multimedia
    {"vlc", "VLC Media Player", "Reproductor multimedia universal para audio y video", "applications-multimedia",
     "Multimedia", "vlc", "sudo pacman -S --noconfirm vlc", "Códecs 4K / AV1", NULL, NULL},
    {"obs", "OBS Studio", "Grabación de pantalla y transmisión en vivo", "video-display",
     "Multimedia", "obs", "sudo pacman -S --noconfirm obs-studio", "Screen Recording", NULL, NULL}
};

static const int total_apps = sizeof(app_catalog) / sizeof(app_catalog[0]);

static gboolean check_installed(const AppEntry *app) {
    char cmd[256];
    snprintf(cmd, sizeof(cmd), "command -v %s >/dev/null 2>&1 || (flatpak list 2>/dev/null | grep -qi %s)", app->check_bin, app->id);
    return system(cmd) == 0;
}

static gboolean on_install_timeout(gpointer data) {
    AppEntry *a = (AppEntry *)data;
    if (check_installed(a)) {
        gtk_button_set_label(GTK_BUTTON(a->btn), "Abrir");
        gtk_widget_set_sensitive(a->btn, TRUE);
        gtk_spinner_stop(GTK_SPINNER(a->spinner));
        gtk_widget_hide(a->spinner);
        return G_SOURCE_REMOVE;
    }
    gtk_widget_set_sensitive(a->btn, TRUE);
    gtk_button_set_label(GTK_BUTTON(a->btn), "Instalar");
    gtk_spinner_stop(GTK_SPINNER(a->spinner));
    gtk_widget_hide(a->spinner);
    return G_SOURCE_REMOVE;
}

static void on_install_clicked(GtkButton *btn, gpointer user_data) {
    AppEntry *app = (AppEntry *)user_data;
    (void)btn;

    if (check_installed(app)) {
        // Lanzar la app ya instalada
        char launch_cmd[512];
        snprintf(launch_cmd, sizeof(launch_cmd), "%s &", app->check_bin);
        system(launch_cmd);
        return;
    }

    gtk_widget_set_sensitive(app->btn, FALSE);
    gtk_button_set_label(GTK_BUTTON(app->btn), "Instalando...");
    gtk_spinner_start(GTK_SPINNER(app->spinner));
    gtk_widget_show(app->spinner);

    // Lanzar terminal interactiva para la descarga limpia con barra de progreso
    char term_cmd[2048];
    snprintf(term_cmd, sizeof(term_cmd),
        "xfce4-terminal --title='Instalando %s' -e \"bash -c '%s; echo; echo [Instalación finalizada. Presiona Enter para salir]; read'\" &",
        app->name, app->install_cmd);
    system(term_cmd);

    // Temporizador para refrescar el estado del botón
    g_timeout_add_seconds(3, on_install_timeout, app);
}

static GtkWidget* create_app_card(AppEntry *app) {
    GtkWidget *card = gtk_frame_new(NULL);
    GtkStyleContext *card_ctx = gtk_widget_get_style_context(card);
    gtk_style_context_add_class(card_ctx, "groove-app-card");

    GtkWidget *box = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 14);
    gtk_container_set_border_width(GTK_CONTAINER(box), 12);
    gtk_container_add(GTK_CONTAINER(card), box);

    // Icono
    GtkWidget *img = gtk_image_new_from_icon_name(app->icon, GTK_ICON_SIZE_DIALOG);
    gtk_widget_set_size_request(img, 48, 48);
    gtk_box_pack_start(GTK_BOX(box), img, FALSE, FALSE, 0);

    // Info
    GtkWidget *info_box = gtk_box_new(GTK_ORIENTATION_VERTICAL, 4);
    GtkWidget *title_box = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 8);

    GtkWidget *lbl_name = gtk_label_new(NULL);
    char name_markup[256];
    snprintf(name_markup, sizeof(name_markup), "<b><span size='large' color='#ffffff'>%s</span></b>", app->name);
    gtk_label_set_markup(GTK_LABEL(lbl_name), name_markup);
    gtk_label_set_xalign(GTK_LABEL(lbl_name), 0.0);
    gtk_box_pack_start(GTK_BOX(title_box), lbl_name, FALSE, FALSE, 0);

    GtkWidget *badge = gtk_label_new(NULL);
    char badge_markup[256];
    snprintf(badge_markup, sizeof(badge_markup), "<span size='small' color='#d4af37' bgcolor='#1c2333'> %s </span>", app->badge);
    gtk_label_set_markup(GTK_LABEL(badge), badge_markup);
    gtk_box_pack_start(GTK_BOX(title_box), badge, FALSE, FALSE, 0);

    gtk_box_pack_start(GTK_BOX(info_box), title_box, FALSE, FALSE, 0);

    GtkWidget *lbl_desc = gtk_label_new(app->desc);
    gtk_label_set_xalign(GTK_LABEL(lbl_desc), 0.0);
    gtk_style_context_add_class(gtk_widget_get_style_context(lbl_desc), "dim-label");
    gtk_box_pack_start(GTK_BOX(info_box), lbl_desc, FALSE, FALSE, 0);

    gtk_box_pack_start(GTK_BOX(box), info_box, TRUE, TRUE, 0);

    // Acciones
    GtkWidget *act_box = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 6);
    gtk_widget_set_valign(act_box, GTK_ALIGN_CENTER);

    app->spinner = gtk_spinner_new();
    gtk_box_pack_start(GTK_BOX(act_box), app->spinner, FALSE, FALSE, 0);

    gboolean installed = check_installed(app);
    app->btn = gtk_button_new_with_label(installed ? "Abrir" : "Instalar");
    GtkStyleContext *btn_ctx = gtk_widget_get_style_context(app->btn);
    gtk_style_context_add_class(btn_ctx, installed ? "suggested-action" : "groove-install-btn");
    gtk_widget_set_size_request(app->btn, 90, 34);
    g_signal_connect(app->btn, "clicked", G_CALLBACK(on_install_clicked), app);

    gtk_box_pack_start(GTK_BOX(act_box), app->btn, FALSE, FALSE, 0);
    gtk_box_pack_start(GTK_BOX(box), act_box, FALSE, FALSE, 0);

    return card;
}

int main(int argc, char *argv[]) {
    gtk_init(&argc, &argv);

    GtkWidget *win = gtk_window_new(GTK_WINDOW_TOPLEVEL);
    gtk_window_set_default_size(GTK_WINDOW(win), 820, 580);
    gtk_window_set_position(GTK_WINDOW(win), GTK_WIN_POS_CENTER);
    g_signal_connect(win, "destroy", G_CALLBACK(gtk_main_quit), NULL);

    // CSD HeaderBar macOS
    GtkWidget *header = gtk_header_bar_new();
    gtk_header_bar_set_show_close_button(GTK_HEADER_BAR(header), TRUE);
    gtk_header_bar_set_title(GTK_HEADER_BAR(header), "Groove App Hub");
    gtk_header_bar_set_subtitle(GTK_HEADER_BAR(header), "Suite de Aplicaciones a 1 Clic · SteamOS Architecture");
    gtk_window_set_titlebar(GTK_WINDOW(win), header);

    // Estilos CSS
    GtkCssProvider *css = gtk_css_provider_new();
    const char *custom_css =
        ".groove-app-card { background: rgba(22, 28, 40, 0.85); border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); margin: 4px; }\n"
        ".groove-app-card:hover { background: rgba(30, 38, 54, 0.95); border: 1px solid rgba(212,175,55,0.3); }\n"
        ".groove-install-btn { background: #d4af37; color: #0b0e17; font-weight: bold; border-radius: 8px; }\n"
        ".groove-install-btn:hover { background: #f0c542; }\n"
        ".dim-label { color: rgba(255,255,255,0.65); font-size: 11px; }\n";
    gtk_css_provider_load_from_data(css, custom_css, -1, NULL);
    gtk_style_context_add_provider_for_screen(gdk_screen_get_default(), GTK_STYLE_PROVIDER(css), GTK_STYLE_PROVIDER_PRIORITY_APPLICATION);

    GtkWidget *notebook = gtk_notebook_new();
    gtk_notebook_set_tab_pos(GTK_NOTEBOOK(notebook), GTK_POS_TOP);
    gtk_container_add(GTK_CONTAINER(win), notebook);

    const char *categories[] = {"IA & Desarrollo", "Diseño & 3D", "Audio Pro", "Multimedia"};
    int num_cats = sizeof(categories) / sizeof(categories[0]);

    for (int c = 0; c < num_cats; c++) {
        GtkWidget *scroll = gtk_scrolled_window_new(NULL, NULL);
        gtk_scrolled_window_set_policy(GTK_SCROLLED_WINDOW(scroll), GTK_POLICY_NEVER, GTK_POLICY_AUTOMATIC);

        GtkWidget *vbox = gtk_box_new(GTK_ORIENTATION_VERTICAL, 8);
        gtk_container_set_border_width(GTK_CONTAINER(vbox), 16);
        gtk_container_add(GTK_CONTAINER(scroll), vbox);

        for (int i = 0; i < total_apps; i++) {
            if (strcmp(app_catalog[i].category, categories[c]) == 0) {
                GtkWidget *card = create_app_card(&app_catalog[i]);
                gtk_box_pack_start(GTK_BOX(vbox), card, FALSE, FALSE, 0);
            }
        }

        GtkWidget *tab_lbl = gtk_label_new(categories[c]);
        gtk_notebook_append_page(GTK_NOTEBOOK(notebook), scroll, tab_lbl);
    }

    gtk_widget_show_all(win);
    gtk_main();
    return 0;
}
