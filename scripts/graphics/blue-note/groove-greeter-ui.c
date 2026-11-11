/*
 * Linux Groove OS — macOS Sonoma/Sequoia Glass Interactive Greeter
 * Built with GTK+ 3.0 and liblightdm-gobject-1.
 */

#include <gtk/gtk.h>
#include <gdk/gdk.h>
#include <lightdm.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>
#include <sys/sysinfo.h>

static LightDMGreeter *greeter = NULL;
static GtkWidget *main_window = NULL;
static GtkWidget *clock_label = NULL;
static GtkWidget *date_label = NULL;
static GtkWidget *telemetry_label = NULL;
static GtkWidget *session_combo = NULL;
static GtkWidget *login_button = NULL;
static GtkWidget *bg_image = NULL;
static GdkPixbuf *current_bg_pixbuf = NULL;

static GList *wallpaper_list = NULL;
static GList *current_wallpaper_node = NULL;
static char current_bg_path[512] = "";

static void load_wallpapers(void) {
    const char *bg_dir = "/usr/share/backgrounds/groove";
    GDir *dir = g_dir_open(bg_dir, 0, NULL);
    if (dir) {
        const gchar *fn;
        while ((fn = g_dir_read_name(dir)) != NULL) {
            if (g_str_has_suffix(fn, ".png") || g_str_has_suffix(fn, ".jpg")) {
                wallpaper_list = g_list_append(wallpaper_list, g_build_filename(bg_dir, fn, NULL));
            }
        }
        g_dir_close(dir);
    }
    /* Fallback default background candidate list */
    if (!wallpaper_list) {
        const char *candidates[] = {
            "/usr/share/backgrounds/groove-default.png",
            "/usr/share/backgrounds/groove-blue-note.png",
            "/usr/share/backgrounds/groove/Groove creativo en Linux.png",
            "/tmp/groove-wayfire-inputs/backgrouds_groove/groove-piano-background-4k.png",
            NULL
        };
        for (int i = 0; candidates[i]; i++) {
            if (g_file_test(candidates[i], G_FILE_TEST_EXISTS)) {
                wallpaper_list = g_list_append(wallpaper_list, g_strdup(candidates[i]));
                break;
            }
        }
    }
    current_wallpaper_node = wallpaper_list;
}

static void apply_wallpaper(const char *path) {
    if (!path || !g_file_test(path, G_FILE_TEST_EXISTS)) return;
    strncpy(current_bg_path, path, sizeof(current_bg_path) - 1);
    
    GdkScreen *screen = gdk_screen_get_default();
    int sw = gdk_screen_get_width(screen);
    int sh = gdk_screen_get_height(screen);
    if (sw < 800) sw = 1280;
    if (sh < 600) sh = 800;

    GError *err = NULL;
    GdkPixbuf *src = gdk_pixbuf_new_from_file_at_scale(path, sw, sh, FALSE, &err);
    if (src) {
        if (current_bg_pixbuf) g_object_unref(current_bg_pixbuf);
        current_bg_pixbuf = src;
        gtk_image_set_from_pixbuf(GTK_IMAGE(bg_image), current_bg_pixbuf);
    }
}

static void on_change_wallpaper_clicked(GtkButton *btn, gpointer user_data) {
    (void)btn; (void)user_data;
    if (!current_wallpaper_node || !current_wallpaper_node->next) {
        current_wallpaper_node = wallpaper_list;
    } else {
        current_wallpaper_node = current_wallpaper_node->next;
    }
    if (current_wallpaper_node && current_wallpaper_node->data) {
        apply_wallpaper((const char *)current_wallpaper_node->data);
    }
}

static gboolean update_clock(gpointer user_data) {
    (void)user_data;
    time_t now = time(NULL);
    struct tm *tm_info = localtime(&now);

    char time_str[64];
    strftime(time_str, sizeof(time_str), "%H:%M", tm_info);
    gtk_label_set_text(GTK_LABEL(clock_label), time_str);

    /* Localized date in Spanish */
    const char *days[] = {"domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"};
    const char *months[] = {"enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"};
    char date_str[128];
    snprintf(date_str, sizeof(date_str), "%s, %d de %s",
             days[tm_info->tm_wday], tm_info->tm_mday, months[tm_info->tm_mon]);
    gtk_label_set_text(GTK_LABEL(date_label), date_str);

    /* Telemetry update */
    struct sysinfo si;
    if (sysinfo(&si) == 0) {
        unsigned long total_ram = si.totalram * si.mem_unit / (1024 * 1024);
        unsigned long free_ram = (si.freeram + si.bufferram) * si.mem_unit / (1024 * 1024);
        unsigned long used_ram = total_ram > free_ram ? (total_ram - free_ram) : 0;
        char tele_buf[256];
        snprintf(tele_buf, sizeof(tele_buf),
                 "⚡ Linux Groove 6.12 · aarch64   |   RAM: %lu MiB / %lu MiB   |   Red: Conectada",
                 used_ram, total_ram);
        gtk_label_set_text(GTK_LABEL(telemetry_label), tele_buf);
    }

    return G_SOURCE_CONTINUE;
}

static gboolean login_requested = FALSE;

static void on_login_clicked(GtkButton *btn, gpointer user_data) {
    (void)btn; (void)user_data;
    if (login_requested) return;
    login_requested = TRUE;

    gtk_widget_set_sensitive(login_button, FALSE);
    gtk_button_set_label(GTK_BUTTON(login_button), "Iniciando sesión...");

    if (greeter && lightdm_greeter_get_is_authenticated(greeter)) {
        const gchar *selected_session = gtk_combo_box_get_active_id(GTK_COMBO_BOX(session_combo));
        if (!selected_session || strlen(selected_session) == 0) {
            selected_session = "plasma";
        }
        lightdm_greeter_start_session_sync(greeter, selected_session, NULL);
    } else if (greeter) {
        if (lightdm_greeter_get_in_authentication(greeter)) {
            lightdm_greeter_cancel_authentication(greeter, NULL);
        }
        lightdm_greeter_authenticate(greeter, "groove", NULL);
    }
}

static void on_show_prompt(LightDMGreeter *g, const gchar *text, LightDMPromptType type, gpointer data) {
    (void)text; (void)type; (void)data;
    /* Auto-respond with empty password for live user groove */
    lightdm_greeter_respond(g, "", NULL);
}

static void on_authentication_complete(LightDMGreeter *g, gpointer data) {
    (void)data;
    if (login_requested && lightdm_greeter_get_is_authenticated(g)) {
        const gchar *selected_session = gtk_combo_box_get_active_id(GTK_COMBO_BOX(session_combo));
        if (!selected_session || strlen(selected_session) == 0) {
            selected_session = "plasma";
        }
        lightdm_greeter_start_session_sync(g, selected_session, NULL);
    } else if (!lightdm_greeter_get_is_authenticated(g)) {
        login_requested = FALSE;
        gtk_widget_set_sensitive(login_button, TRUE);
        gtk_button_set_label(GTK_BUTTON(login_button), "Iniciar");
    }
}

static void on_restart_clicked(GtkButton *btn, gpointer user_data) {
    (void)btn; (void)user_data;
    lightdm_restart(NULL);
}

static void on_shutdown_clicked(GtkButton *btn, gpointer user_data) {
    (void)btn; (void)user_data;
    lightdm_shutdown(NULL);
}


static gboolean on_avatar_draw(GtkWidget *widget, cairo_t *cr, gpointer user_data) {
    (void)user_data;
    int w = gtk_widget_get_allocated_width(widget);
    int h = gtk_widget_get_allocated_height(widget);
    double cx = w / 2.0;
    double cy = h / 2.0;
    double r = (w < h ? w : h) / 2.0 - 2.0;

    /* Base circular disc with deep glassy background */
    cairo_pattern_t *pat = cairo_pattern_create_radial(cx - r*0.3, cy - r*0.3, 2.0, cx, cy, r);
    cairo_pattern_add_color_stop_rgba(pat, 0.0, 0.22, 0.28, 0.40, 0.95);
    cairo_pattern_add_color_stop_rgba(pat, 1.0, 0.07, 0.09, 0.14, 0.98);
    cairo_arc(cr, cx, cy, r, 0, 2 * G_PI);
    cairo_set_source(cr, pat);
    cairo_fill_preserve(cr);
    cairo_pattern_destroy(pat);

    /* Subtle glowing amber border */
    cairo_set_source_rgba(cr, 1.0, 0.70, 0.20, 0.65);
    cairo_set_line_width(cr, 1.8);
    cairo_stroke(cr);

    /* Vertical Soundwave bars in warm gradient */
    double heights[] = { 10.0, 18.0, 28.0, 36.0, 24.0, 14.0, 8.0 };
    int n_bars = 7;
    double bar_w = 3.6;
    double spacing = 2.4;
    double total_w = n_bars * bar_w + (n_bars - 1) * spacing;
    double start_x = cx - total_w / 2.0;

    for (int i = 0; i < n_bars; i++) {
        double bx = start_x + i * (bar_w + spacing);
        double bh = heights[i];
        double by = cy - bh / 2.0;

        cairo_pattern_t *bar_pat = cairo_pattern_create_linear(bx, by, bx, by + bh);
        cairo_pattern_add_color_stop_rgb(bar_pat, 0.0, 1.0, 0.90, 0.30); /* Yellow */
        cairo_pattern_add_color_stop_rgb(bar_pat, 0.5, 1.0, 0.55, 0.10); /* Warm Amber */
        cairo_pattern_add_color_stop_rgb(bar_pat, 1.0, 1.0, 0.25, 0.05); /* Orange-red */

        cairo_set_source(cr, bar_pat);
        cairo_new_sub_path(cr);
        double rad = bar_w / 2.0;
        cairo_arc(cr, bx + rad, by + rad, rad, G_PI, 1.5 * G_PI);
        cairo_arc(cr, bx + bar_w - rad, by + rad, rad, 1.5 * G_PI, 2 * G_PI);
        cairo_arc(cr, bx + bar_w - rad, by + bh - rad, rad, 0, 0.5 * G_PI);
        cairo_arc(cr, bx + rad, by + bh - rad, rad, 0.5 * G_PI, G_PI);
        cairo_close_path(cr);
        cairo_fill(cr);
        cairo_pattern_destroy(bar_pat);
    }

    return FALSE;
}

static gboolean on_key_press(GtkWidget *widget, GdkEventKey *event, gpointer user_data) {
    (void)widget; (void)user_data;
    if (event->keyval == GDK_KEY_Return || event->keyval == GDK_KEY_KP_Enter || event->keyval == GDK_KEY_space) {
        on_login_clicked(GTK_BUTTON(login_button), NULL);
        return TRUE;
    } else if (event->keyval == GDK_KEY_F5 || event->keyval == GDK_KEY_b) {
        on_change_wallpaper_clicked(NULL, NULL);
        return TRUE;
    }
    return FALSE;
}

static void on_window_realize(GtkWidget *widget, gpointer user_data) {
    (void)user_data;
    GdkWindow *win = gtk_widget_get_window(widget);
    GdkDisplay *disp = gtk_widget_get_display(widget);
    GdkCursor *cursor = gdk_cursor_new_from_name(disp, "left_ptr");
    if (!cursor) cursor = gdk_cursor_new_from_name(disp, "default");
    if (cursor) {
        if (win) gdk_window_set_cursor(win, cursor);
        GdkScreen *screen = gtk_widget_get_screen(widget);
        GdkWindow *root = gdk_screen_get_root_window(screen);
        if (root) gdk_window_set_cursor(root, cursor);
        g_object_unref(cursor);
    }
}

int main(int argc, char *argv[]) {
    gtk_init(&argc, &argv);

    greeter = lightdm_greeter_new();
    GError *err = NULL;
    g_signal_connect(greeter, LIGHTDM_GREETER_SIGNAL_SHOW_PROMPT, G_CALLBACK(on_show_prompt), NULL);
    g_signal_connect(greeter, LIGHTDM_GREETER_SIGNAL_AUTHENTICATION_COMPLETE, G_CALLBACK(on_authentication_complete), NULL);

    if (!lightdm_greeter_connect_sync(greeter, &err)) {
        g_warning("Could not connect to LightDM daemon: %s", err ? err->message : "unknown");
    }

    /* Main Fullscreen Window */
    main_window = gtk_window_new(GTK_WINDOW_TOPLEVEL);
    gtk_window_set_title(GTK_WINDOW(main_window), "Linux Groove");
    gtk_widget_set_name(main_window, "greeter-window");
    GdkScreen *scr = gdk_screen_get_default();
    int scr_w = scr ? gdk_screen_get_width(scr) : 1280;
    int scr_h = scr ? gdk_screen_get_height(scr) : 800;
    if (scr_w < 800) scr_w = 1280;
    if (scr_h < 600) scr_h = 800;
    gtk_window_set_decorated(GTK_WINDOW(main_window), FALSE);
    gtk_window_set_default_size(GTK_WINDOW(main_window), scr_w, scr_h);
    gtk_window_resize(GTK_WINDOW(main_window), scr_w, scr_h);
    gtk_window_move(GTK_WINDOW(main_window), 0, 0);
    gtk_window_fullscreen(GTK_WINDOW(main_window));
    g_signal_connect(main_window, "realize", G_CALLBACK(on_window_realize), NULL);
    g_signal_connect(main_window, "destroy", G_CALLBACK(gtk_main_quit), NULL);
    g_signal_connect(main_window, "key-press-event", G_CALLBACK(on_key_press), NULL);

    /* Overlay for background and UI widgets */
    GtkWidget *overlay = gtk_overlay_new();
    gtk_container_add(GTK_CONTAINER(main_window), overlay);

    bg_image = gtk_image_new();
    gtk_container_add(GTK_CONTAINER(overlay), bg_image);

    /* Layout Container over background */
    GtkWidget *main_vbox = gtk_box_new(GTK_ORIENTATION_VERTICAL, 0);
    gtk_widget_set_halign(main_vbox, GTK_ALIGN_FILL);
    gtk_widget_set_valign(main_vbox, GTK_ALIGN_FILL);
    gtk_overlay_add_overlay(GTK_OVERLAY(overlay), main_vbox);

    /* --- TOP SECTION: Clock & Date --- */
    GtkWidget *top_box = gtk_box_new(GTK_ORIENTATION_VERTICAL, 4);
    gtk_widget_set_halign(top_box, GTK_ALIGN_CENTER);
    gtk_widget_set_margin_top(top_box, 48);

    clock_label = gtk_label_new("12:00");
    gtk_widget_set_name(clock_label, "mac-clock");
    gtk_box_pack_start(GTK_BOX(top_box), clock_label, FALSE, FALSE, 0);

    date_label = gtk_label_new("jueves, 5 de noviembre");
    gtk_widget_set_name(date_label, "mac-date");
    gtk_box_pack_start(GTK_BOX(top_box), date_label, FALSE, FALSE, 0);

    gtk_box_pack_start(GTK_BOX(main_vbox), top_box, FALSE, FALSE, 0);

    /* Spacer expanding vertically */
    GtkWidget *spacer_top = gtk_box_new(GTK_ORIENTATION_VERTICAL, 0);
    gtk_box_pack_start(GTK_BOX(main_vbox), spacer_top, TRUE, TRUE, 0);

    /* --- CENTER SECTION: Glassmorphism Login Card --- */
    GtkWidget *card_box = gtk_box_new(GTK_ORIENTATION_VERTICAL, 14);
    gtk_widget_set_name(card_box, "glass-login-card");
    gtk_widget_set_halign(card_box, GTK_ALIGN_CENTER);
    gtk_widget_set_size_request(card_box, 320, -1);

    /* Official Groove Soundwave Logo PNG */
    GtkWidget *avatar = gtk_image_new();
    const char *logo_candidates[] = {
        "/usr/share/groove/groove-greeter-logo.png",
        "/usr/share/icons/groove-glass/groove-logo.png",
        "/usr/share/icons/hicolor/scalable/apps/groove-logo.svg",
        NULL
    };
    GdkPixbuf *logo_pixbuf = NULL;
    for (int i = 0; logo_candidates[i]; i++) {
        if (g_file_test(logo_candidates[i], G_FILE_TEST_EXISTS)) {
            logo_pixbuf = gdk_pixbuf_new_from_file_at_scale(logo_candidates[i], 120, 60, TRUE, NULL);
            if (logo_pixbuf) break;
        }
    }
    if (logo_pixbuf) {
        gtk_image_set_from_pixbuf(GTK_IMAGE(avatar), logo_pixbuf);
        g_object_unref(logo_pixbuf);
    } else {
        GtkWidget *fallback_avatar = gtk_drawing_area_new();
        gtk_widget_set_size_request(fallback_avatar, 76, 76);
        gtk_widget_set_halign(fallback_avatar, GTK_ALIGN_CENTER);
        g_signal_connect(fallback_avatar, "draw", G_CALLBACK(on_avatar_draw), NULL);
        avatar = fallback_avatar;
    }
    gtk_widget_set_halign(avatar, GTK_ALIGN_CENTER);
    gtk_box_pack_start(GTK_BOX(card_box), avatar, FALSE, FALSE, 0);

    /* User Name & System Subtitle */
    GtkWidget *user_label = gtk_label_new("Groove Artist");
    gtk_widget_set_name(user_label, "user-name");
    gtk_box_pack_start(GTK_BOX(card_box), user_label, FALSE, FALSE, 0);

    GtkWidget *sub_label = gtk_label_new("Linux Groove Studio · Live Edition");
    gtk_widget_set_name(sub_label, "sub-title");
    gtk_box_pack_start(GTK_BOX(card_box), sub_label, FALSE, FALSE, 0);

    /* Session Selector Dropdown */
    session_combo = gtk_combo_box_text_new();
    gtk_widget_set_name(session_combo, "session-combo");
    gtk_combo_box_text_append(GTK_COMBO_BOX_TEXT(session_combo), "plasma", "Groove Studio Edition (KDE Plasma 6 Wayland)");
    gtk_combo_box_text_append(GTK_COMBO_BOX_TEXT(session_combo), "groove-xfce", "Groove · macOS Glass (XFCE)");
    gtk_combo_box_text_append(GTK_COMBO_BOX_TEXT(session_combo), "groove-wayfire", "Groove · Wayfire 3D (Cubo y Efectos)");
    gtk_combo_box_set_active_id(GTK_COMBO_BOX(session_combo), "plasma");
    gtk_box_pack_start(GTK_BOX(card_box), session_combo, FALSE, FALSE, 0);

    /* Primary Login Button (Transparent Pill) */
    login_button = gtk_button_new_with_label("Iniciar");
    gtk_widget_set_name(login_button, "login-pill-button");
    gtk_widget_set_halign(login_button, GTK_ALIGN_CENTER);
    gtk_widget_set_size_request(login_button, 140, 38);
    g_signal_connect(login_button, "clicked", G_CALLBACK(on_login_clicked), NULL);
    gtk_box_pack_start(GTK_BOX(card_box), login_button, FALSE, FALSE, 0);

    gtk_box_pack_start(GTK_BOX(main_vbox), card_box, FALSE, FALSE, 0);

    /* Spacer expanding vertically */
    GtkWidget *spacer_bottom = gtk_box_new(GTK_ORIENTATION_VERTICAL, 0);
    gtk_box_pack_start(GTK_BOX(main_vbox), spacer_bottom, TRUE, TRUE, 0);

    /* --- BOTTOM BAR: Wallpaper Switcher, Telemetry, Power --- */
    GtkWidget *bottom_hbox = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 12);
    gtk_widget_set_margin_bottom(bottom_hbox, 24);
    gtk_widget_set_margin_start(bottom_hbox, 28);
    gtk_widget_set_margin_end(bottom_hbox, 28);

    /* Left: Change Wallpaper Button */
    GtkWidget *btn_bg = gtk_button_new_with_label("Cambiar Fondo");
    gtk_widget_set_name(btn_bg, "bottom-pill-btn");
    g_signal_connect(btn_bg, "clicked", G_CALLBACK(on_change_wallpaper_clicked), NULL);
    gtk_box_pack_start(GTK_BOX(bottom_hbox), btn_bg, FALSE, FALSE, 0);

    /* Center: Telemetry Pill */
    telemetry_label = gtk_label_new("⚡ Linux Groove OS 6.12 · aarch64");
    gtk_widget_set_name(telemetry_label, "telemetry-pill");
    gtk_box_pack_start(GTK_BOX(bottom_hbox), telemetry_label, TRUE, FALSE, 0);

    /* Right: Power Buttons */
    GtkWidget *btn_restart = gtk_button_new_with_label("↻ Reiniciar");
    gtk_widget_set_name(btn_restart, "bottom-pill-btn");
    g_signal_connect(btn_restart, "clicked", G_CALLBACK(on_restart_clicked), NULL);
    gtk_box_pack_end(GTK_BOX(bottom_hbox), btn_restart, FALSE, FALSE, 0);

    GtkWidget *btn_shutdown = gtk_button_new_with_label("⏻ Apagar");
    gtk_widget_set_name(btn_shutdown, "bottom-pill-btn");
    g_signal_connect(btn_shutdown, "clicked", G_CALLBACK(on_shutdown_clicked), NULL);
    gtk_box_pack_end(GTK_BOX(bottom_hbox), btn_shutdown, FALSE, FALSE, 0);

    gtk_box_pack_end(GTK_BOX(main_vbox), bottom_hbox, FALSE, FALSE, 0);

    /* --- CSS Styling (Glassmorphism & macOS Typography) --- */
    GtkCssProvider *css_provider = gtk_css_provider_new();
    const gchar *css =
        "#greeter-window {\n"
        "  background: #0b0e17 radial-gradient(circle at 50% 35%, #182236 0%, #090c14 100%);\n"
        "}\n"
        "#mac-clock {"
        "  font-family: 'Inter', 'DejaVu Sans', sans-serif;"
        "  font-size: 64pt;"
        "  font-weight: 700;"
        "  color: #ffffff;"
        "  text-shadow: 0 4px 16px rgba(0, 0, 0, 0.70);"
        "}"
        "#mac-date {"
        "  font-family: 'Inter', 'DejaVu Sans', sans-serif;"
        "  font-size: 16pt;"
        "  font-weight: 500;"
        "  color: #e2e8f0;"
        "  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.80);"
        "}"
        "#glass-login-card {\n"
        "  background-color: rgba(18, 22, 32, 0.82);\n"
        "  border: 1px solid rgba(255, 255, 255, 0.22);\n"
        "  border-radius: 24px;\n"
        "  padding: 24px 28px;\n"
        "  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.65);\n"
        "}\n"
        "#user-name {\n"
        "  font-family: 'Inter', 'DejaVu Sans', sans-serif;\n"
        "  font-size: 16pt;\n"
        "  font-weight: 700;\n"
        "  color: #f8fafc;\n"
        "}\n"
        "#sub-title {\n"
        "  font-family: 'Inter', 'DejaVu Sans', sans-serif;\n"
        "  font-size: 10.5pt;\n"
        "  color: #94a3b8;\n"
        "}\n"
        "#session-combo, #session-combo button, #session-combo box {\n"
        "  background-color: rgba(255, 255, 255, 0.05);\n"
        "  border: 1px solid rgba(255, 255, 255, 0.22);\n"
        "  border-radius: 12px;\n"
        "  color: #f8fafc;\n"
        "  padding: 4px 10px;\n"
        "}\n"
        "#session-combo:hover, #session-combo button:hover {\n"
        "  background-color: rgba(255, 255, 255, 0.12);\n"
        "  border-color: rgba(255, 255, 255, 0.40);\n"
        "}\n"
        "#login-pill-button {\n"
        "  background-color: rgba(255, 255, 255, 0.08);\n"
        "  color: #f8fafc;\n"
        "  font-weight: 600;\n"
        "  font-size: 12pt;\n"
        "  border: 1px solid rgba(255, 255, 255, 0.28);\n"
        "  border-radius: 18px;\n"
        "  padding: 6px 18px;\n"
        "}\n"
        "#login-pill-button:hover {\n"
        "  background-color: rgba(255, 255, 255, 0.20);\n"
        "  border-color: rgba(255, 255, 255, 0.50);\n"
        "  color: #ffffff;\n"
        "}\n"
        "#bottom-pill-btn {"
        "  background-color: rgba(18, 22, 32, 0.75);"
        "  color: #f1f5f9;"
        "  border: 1px solid rgba(255, 255, 255, 0.20);"
        "  border-radius: 16px;"
        "  padding: 6px 14px;"
        "  font-size: 11pt;"
        "}"
        "#bottom-pill-btn:hover {"
        "  background-color: rgba(255, 255, 255, 0.18);"
        "  color: #ffffff;"
        "}"
        "#telemetry-pill {"
        "  background-color: rgba(18, 22, 32, 0.65);"
        "  color: #cbd5e1;"
        "  border: 1px solid rgba(255, 255, 255, 0.14);"
        "  border-radius: 16px;"
        "  padding: 6px 18px;"
        "  font-size: 10.5pt;"
        "}";
    gtk_css_provider_load_from_data(css_provider, css, -1, NULL);
    gtk_style_context_add_provider_for_screen(gdk_screen_get_default(),
                                              GTK_STYLE_PROVIDER(css_provider),
                                              GTK_STYLE_PROVIDER_PRIORITY_APPLICATION);

    load_wallpapers();
    if (current_wallpaper_node && current_wallpaper_node->data) {
        apply_wallpaper((const char *)current_wallpaper_node->data);
    }

    update_clock(NULL);
    g_timeout_add_seconds(1, update_clock, NULL);

    gtk_widget_show_all(main_window);
    gtk_main();

    return 0;
}

