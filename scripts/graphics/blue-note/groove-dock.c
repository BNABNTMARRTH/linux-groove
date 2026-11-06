/*
 * groove-dock.c - macOS Glass Floating Dock for Linux Groove OS
 * Built with GTK+ 3.0, Cairo, and libwnck-3.0
 */
#define _GNU_SOURCE
#define WNCK_I_KNOW_THIS_IS_UNSTABLE 1

#include <gtk/gtk.h>
#include <gdk/gdk.h>
#include <cairo.h>
#include <math.h>
#include <string.h>
#include <libwnck/libwnck.h>
#include <gdk/gdkx.h>
#include <X11/Xlib.h>
#include <X11/Xatom.h>

#define DEFAULT_ICON_SIZE 48
#define MAX_ZOOM_SCALE 1.38
#define SIGMA 54.0
#define CAPSULE_PAD_X 16

static int base_icon_size = DEFAULT_ICON_SIZE;
static int capsule_height = 66;
static int win_height = 136;
static int dock_bottom_margin = 10;
static int item_spacing = 12;
static gboolean zoom_enabled = TRUE;

static void load_dock_config(void) {
    const char *home = g_get_home_dir();
    char *conf_path = g_build_filename(home, ".config", "groove", "dock.conf", NULL);
    GKeyFile *kf = g_key_file_new();
    if (g_key_file_load_from_file(kf, conf_path, G_KEY_FILE_NONE, NULL)) {
        int sz = g_key_file_get_integer(kf, "Dock", "icon_size", NULL);
        if (sz >= 32 && sz <= 64) {
            base_icon_size = sz;
            capsule_height = base_icon_size + 18;
            win_height = capsule_height + 70;
        }
        if (g_key_file_has_key(kf, "Dock", "zoom_enabled", NULL)) {
            zoom_enabled = g_key_file_get_boolean(kf, "Dock", "zoom_enabled", NULL);
        }
    }
    g_key_file_free(kf);
    g_free(conf_path);
}

static void save_dock_config(void) {
    const char *home = g_get_home_dir();
    char *dir_path = g_build_filename(home, ".config", "groove", NULL);
    g_mkdir_with_parents(dir_path, 0755);
    char *conf_path = g_build_filename(dir_path, "dock.conf", NULL);
    GKeyFile *kf = g_key_file_new();
    g_key_file_set_integer(kf, "Dock", "icon_size", base_icon_size);
    g_key_file_set_boolean(kf, "Dock", "zoom_enabled", zoom_enabled);
    g_key_file_save_to_file(kf, conf_path, NULL);
    g_key_file_free(kf);
    g_free(dir_path);
    g_free(conf_path);
}

typedef struct {
    const char *id;
    const char *name;
    const char *icon_path;
    const char *command;
    const char *wm_class_pattern;
    GdkPixbuf *pixbuf;
    double current_scale;
    double target_scale;
    double draw_x;
    double draw_w;
    gboolean is_running;
    gboolean is_active;
    gboolean bounce_active;
    double bounce_offset;
    double bounce_phase;
} DockItem;

static DockItem items[] = {
    {"terminal", "Terminal", "/usr/share/icons/groove-glass/terminal@2x.png",
     "/usr/libexec/groove-terminal", "terminal", NULL, 1.0, 1.0, 0, 0, FALSE, FALSE, FALSE, 0.0, 0.0},
    {"files", "Archivos", "/usr/share/icons/groove-glass/files@2x.png",
     "/usr/libexec/groove-files", "thunar", NULL, 1.0, 1.0, 0, 0, FALSE, FALSE, FALSE, 0.0, 0.0},
    {"editor", "Editor", "/usr/share/icons/groove-glass/editor@2x.png",
     "/usr/libexec/groove-editor", "mousepad", NULL, 1.0, 1.0, 0, 0, FALSE, FALSE, FALSE, 0.0, 0.0},
    {"browser", "Brave", "/usr/share/icons/groove-glass/browser@2x.png",
     "/usr/libexec/groove-browser", "brave", NULL, 1.0, 1.0, 0, 0, FALSE, FALSE, FALSE, 0.0, 0.0},
    {"office", "OnlyOffice", "/usr/share/icons/groove-glass/office@2x.png",
     "/usr/libexec/groove-office", "desktopeditors", NULL, 1.0, 1.0, 0, 0, FALSE, FALSE, FALSE, 0.0, 0.0},
    {"system", "Control", "/usr/share/icons/groove-glass/system@2x.png",
     "/usr/libexec/groove-control-center", "groove-control-center", NULL, 1.0, 1.0, 0, 0, FALSE, FALSE, FALSE, 0.0, 0.0},
    {"settings", "Ajustes", "/usr/share/icons/groove-glass/settings@2x.png",
     "/usr/bin/xfce4-settings-manager", "xfce4-settings-manager", NULL, 1.0, 1.0, 0, 0, FALSE, FALSE, FALSE, 0.0, 0.0},
    {"apphub", "App Hub", "/usr/share/icons/groove-glass/installer@2x.png",
     "/usr/bin/groove-app-hub", "groove-app-hub", NULL, 1.0, 1.0, 0, 0, FALSE, FALSE, FALSE, 0.0, 0.0}
};
static const int num_items = sizeof(items) / sizeof(items[0]);

static GtkWidget *dock_window = NULL;
static GtkWidget *draw_area = NULL;
static WnckScreen *wnck_screen = NULL;
static double mouse_x = -1000.0;
static double mouse_y = -1000.0;
static gboolean mouse_in_dock = FALSE;
static guint anim_timer_id = 0;
static int hovered_item_idx = -1;

static void update_window_states(void) {
    if (!wnck_screen) return;
    wnck_screen_force_update(wnck_screen);
    GList *windows = wnck_screen_get_windows(wnck_screen);
    WnckWindow *active_win = wnck_screen_get_active_window(wnck_screen);

    for (int i = 0; i < num_items; i++) {
        items[i].is_running = FALSE;
        items[i].is_active = FALSE;
    }

    for (GList *l = windows; l != NULL; l = l->next) {
        WnckWindow *win = WNCK_WINDOW(l->data);
        if (wnck_window_is_skip_tasklist(win)) continue;
        const char *cls = wnck_window_get_class_instance_name(win);
        const char *name = wnck_window_get_name(win);
        for (int i = 0; i < num_items; i++) {
            gboolean match = FALSE;
            if (cls && strcasestr(cls, items[i].wm_class_pattern)) match = TRUE;
            if (!match && name && strcasestr(name, items[i].wm_class_pattern)) match = TRUE;
            if (match) {
                items[i].is_running = TRUE;
                if (win == active_win) {
                    items[i].is_active = TRUE;
                }
            }
        }
    }
    if (draw_area) gtk_widget_queue_draw(draw_area);
}

static void on_active_window_changed(WnckScreen *scr, WnckWindow *prev, gpointer user_data) {
    (void)scr; (void)prev; (void)user_data;
    update_window_states();
}

static void on_window_opened_or_closed(WnckScreen *scr, WnckWindow *win, gpointer user_data) {
    (void)scr; (void)win; (void)user_data;
    update_window_states();
}

static void set_dock_strut(GtkWidget *win, int height) {
    GdkWindow *gdk_win = gtk_widget_get_window(win);
    if (!gdk_win) return;
    Display *xdisplay = GDK_WINDOW_XDISPLAY(gdk_win);
    Window xid = GDK_WINDOW_XID(gdk_win);
    GdkScreen *screen = gtk_widget_get_screen(win);
    int screen_w = gdk_screen_get_width(screen);

    Atom atom_strut = XInternAtom(xdisplay, "_NET_WM_STRUT", False);
    Atom atom_strut_partial = XInternAtom(xdisplay, "_NET_WM_STRUT_PARTIAL", False);
    Atom cardinal = XInternAtom(xdisplay, "CARDINAL", False);

    unsigned long strut[4] = {0, 0, 0, (unsigned long)height};
    XChangeProperty(xdisplay, xid, atom_strut, cardinal, 32, PropModeReplace,
                    (unsigned char *)strut, 4);

    unsigned long strut_partial[12] = {
        0, 0, 0, (unsigned long)height,
        0, 0, 0, 0, 0, 0, 0, (unsigned long)screen_w
    };
    XChangeProperty(xdisplay, xid, atom_strut_partial, cardinal, 32, PropModeReplace,
                    (unsigned char *)strut_partial, 12);
}

static void update_dock_position(void) {
    if (!dock_window) return;
    GdkScreen *screen = gtk_widget_get_screen(dock_window);
    int screen_w = gdk_screen_get_width(screen);
    int screen_h = gdk_screen_get_height(screen);

    double total_w = CAPSULE_PAD_X * 2;
    for (int i = 0; i < num_items; i++) {
        total_w += (base_icon_size * items[i].current_scale) + item_spacing;
    }
    total_w -= item_spacing;
    int win_w = (int)ceil(total_w) + 32;
    int win_h = win_height;
    int pos_x = (screen_w - win_w) / 2;
    int pos_y = screen_h - win_h - dock_bottom_margin;

    gtk_window_resize(GTK_WINDOW(dock_window), win_w, win_h);
    gtk_window_move(GTK_WINDOW(dock_window), pos_x, pos_y);

    // Apply input shape region so only capsule and hovered icon area receive mouse events
    if (gtk_widget_get_realized(dock_window)) {
        double cap_w = total_w;
        double cap_x = (win_w - cap_w) / 2.0;
        double cap_y = win_h - capsule_height - 6.0;

        cairo_region_t *input_region = cairo_region_create_rectangle(&(cairo_rectangle_int_t){
            .x = (int)cap_x - 10,
            .y = (int)cap_y - 48,
            .width = (int)cap_w + 20,
            .height = capsule_height + 54
        });
        gtk_widget_input_shape_combine_region(dock_window, input_region);

        GdkWindow *gdk_win = gtk_widget_get_window(dock_window);
        if (gdk_win && !gdk_screen_is_composited(screen)) {
            // Non-composited fallback: clip window shape to avoid black rectangle
            gdk_window_shape_combine_region(gdk_win, input_region, 0, 0);
        }
        cairo_region_destroy(input_region);
    }
}

static gboolean on_anim_tick(gpointer user_data) {
    (void)user_data;
    gboolean needs_more = FALSE;

    for (int i = 0; i < num_items; i++) {
        // Zoom interpolation
        double diff = items[i].target_scale - items[i].current_scale;
        if (fabs(diff) > 0.005) {
            items[i].current_scale += diff * 0.28;
            needs_more = TRUE;
        } else {
            items[i].current_scale = items[i].target_scale;
        }

        // Bounce animation
        if (items[i].bounce_active) {
            items[i].bounce_phase += 0.22;
            items[i].bounce_offset = sin(items[i].bounce_phase) * 14.0 * exp(-items[i].bounce_phase * 0.35);
            if (items[i].bounce_phase > 2.0 * M_PI) {
                items[i].bounce_active = FALSE;
                items[i].bounce_offset = 0.0;
            } else {
                needs_more = TRUE;
            }
        }
    }

    update_dock_position();
    gtk_widget_queue_draw(draw_area);

    if (!needs_more) {
        anim_timer_id = 0;
        return G_SOURCE_REMOVE;
    }
    return G_SOURCE_CONTINUE;
}

static void trigger_anim(void) {
    if (anim_timer_id == 0) {
        anim_timer_id = g_timeout_add(16, on_anim_tick, NULL);
    }
}

static void recalculate_target_scales(void) {
    if (!mouse_in_dock || !zoom_enabled) {
        for (int i = 0; i < num_items; i++) {
            items[i].target_scale = 1.0;
        }
        hovered_item_idx = -1;
    } else {
        int best_idx = -1;
        double min_dist = 99999.0;
        for (int i = 0; i < num_items; i++) {
            double icon_center = items[i].draw_x + (items[i].draw_w / 2.0);
            double dist = fabs(mouse_x - icon_center);
            if (dist < min_dist) {
                min_dist = dist;
                best_idx = i;
            }
            double factor = exp(- (dist * dist) / (2.0 * SIGMA * SIGMA));
            items[i].target_scale = 1.0 + (MAX_ZOOM_SCALE - 1.0) * factor;
        }
        hovered_item_idx = best_idx;
    }
    trigger_anim();
}

static gboolean on_draw(GtkWidget *widget, cairo_t *cr, gpointer user_data) {
    (void)widget; (void)user_data;
    int w = gtk_widget_get_allocated_width(widget);
    int h = gtk_widget_get_allocated_height(widget);

    // Clear transparent background
    cairo_set_operator(cr, CAIRO_OPERATOR_CLEAR);
    cairo_paint(cr);
    cairo_set_operator(cr, CAIRO_OPERATOR_OVER);

    // Compute capsule rectangle
    double content_w = 0;
    for (int i = 0; i < num_items; i++) {
        content_w += (base_icon_size * items[i].current_scale) + item_spacing;
    }
    content_w -= item_spacing;
    double capsule_w = content_w + (CAPSULE_PAD_X * 2);
    double cap_h = capsule_height;
    double capsule_x = (w - capsule_w) / 2.0;
    double capsule_y = h - cap_h - 6.0;
    double corner_radius = 18.0;

    // Draw Capsule Glass Background
    cairo_new_sub_path(cr);
    cairo_arc(cr, capsule_x + capsule_w - corner_radius, capsule_y + corner_radius, corner_radius, -M_PI/2, 0);
    cairo_arc(cr, capsule_x + capsule_w - corner_radius, capsule_y + cap_h - corner_radius, corner_radius, 0, M_PI/2);
    cairo_arc(cr, capsule_x + corner_radius, capsule_y + cap_h - corner_radius, corner_radius, M_PI/2, M_PI);
    cairo_arc(cr, capsule_x + corner_radius, capsule_y + corner_radius, corner_radius, M_PI, 3*M_PI/2);
    cairo_close_path(cr);

    // Glass fill: dark navy Blue Note translucent
    cairo_set_source_rgba(cr, 0.08, 0.10, 0.15, 0.84);
    cairo_fill_preserve(cr);

    // Glass border: subtle crisp white glow
    cairo_set_source_rgba(cr, 1.0, 1.0, 1.0, 0.22);
    cairo_set_line_width(cr, 1.2);
    cairo_stroke(cr);

    // Draw Icons and Running Indicators
    double cur_x = capsule_x + CAPSULE_PAD_X;
    for (int i = 0; i < num_items; i++) {
        double icon_size = base_icon_size * items[i].current_scale;
        double icon_x = cur_x;
        // Icons grow upwards when magnified, minus bounce offset
        double icon_y = (capsule_y + cap_h - 10.0) - icon_size - items[i].bounce_offset;

        items[i].draw_x = icon_x;
        items[i].draw_w = icon_size;

        if (items[i].pixbuf) {
            cairo_save(cr);
            cairo_translate(cr, icon_x, icon_y);
            double scale = icon_size / (double)gdk_pixbuf_get_width(items[i].pixbuf);
            cairo_scale(cr, scale, scale);
            gdk_cairo_set_source_pixbuf(cr, items[i].pixbuf, 0, 0);
            cairo_pattern_set_filter(cairo_get_source(cr), CAIRO_FILTER_BEST);
            cairo_paint(cr);
            cairo_restore(cr);
        }

        // Draw running dot indicator below icon
        if (items[i].is_running) {
            double dot_x = icon_x + (icon_size / 2.0);
            double dot_y = capsule_y + cap_h - 4.5;
            cairo_arc(cr, dot_x, dot_y, 2.5, 0, 2*M_PI);
            if (items[i].is_active) {
                // Active: bright glowing cyan
                cairo_set_source_rgba(cr, 0.62, 0.73, 0.78, 1.0);
            } else {
                // Running: warm gold / amber
                cairo_set_source_rgba(cr, 0.95, 0.75, 0.20, 0.90);
            }
            cairo_fill(cr);
        }

        cur_x += icon_size + item_spacing;
    }

    // Draw label for hovered item if active
    if (mouse_in_dock && hovered_item_idx >= 0 && hovered_item_idx < num_items) {
        const char *name = items[hovered_item_idx].name;
        cairo_select_font_face(cr, "DejaVu Sans", CAIRO_FONT_SLANT_NORMAL, CAIRO_FONT_WEIGHT_BOLD);
        cairo_set_font_size(cr, 11.5);
        cairo_text_extents_t ext;
        cairo_text_extents(cr, name, &ext);

        double lbl_w = ext.width + 18.0;
        double lbl_h = ext.height + 10.0;
        double lbl_x = items[hovered_item_idx].draw_x + (items[hovered_item_idx].draw_w / 2.0) - (lbl_w / 2.0);
        double icon_top = (capsule_y + cap_h - 10.0) - (base_icon_size * items[hovered_item_idx].current_scale) - items[hovered_item_idx].bounce_offset;
        double lbl_y = icon_top - lbl_h - 8.0;
        if (lbl_y < 6.0) lbl_y = 6.0; // Never cut off at top of window

        // Label pill background
        cairo_new_sub_path(cr);
        cairo_arc(cr, lbl_x + 6, lbl_y + 6, 6, M_PI, 3*M_PI/2);
        cairo_arc(cr, lbl_x + lbl_w - 6, lbl_y + 6, 6, -M_PI/2, 0);
        cairo_arc(cr, lbl_x + lbl_w - 6, lbl_y + lbl_h - 6, 6, 0, M_PI/2);
        cairo_arc(cr, lbl_x + 6, lbl_y + lbl_h - 6, 6, M_PI/2, M_PI);
        cairo_close_path(cr);
        cairo_set_source_rgba(cr, 0.05, 0.07, 0.12, 0.92);
        cairo_fill_preserve(cr);
        cairo_set_source_rgba(cr, 1.0, 1.0, 1.0, 0.25);
        cairo_stroke(cr);

        // Label text
        cairo_set_source_rgb(cr, 0.96, 0.96, 0.96);
        cairo_move_to(cr, lbl_x + 9.0, lbl_y + ext.height + 3.0);
        cairo_show_text(cr, name);
    }

    return FALSE;
}

static gboolean on_motion_notify(GtkWidget *widget, GdkEventMotion *event, gpointer user_data) {
    (void)widget; (void)user_data;
    mouse_x = event->x;
    mouse_y = event->y;
    mouse_in_dock = TRUE;
    recalculate_target_scales();
    return TRUE;
}

static gboolean on_leave_notify(GtkWidget *widget, GdkEventCrossing *event, gpointer user_data) {
    (void)widget; (void)event; (void)user_data;
    mouse_in_dock = FALSE;
    recalculate_target_scales();
    return TRUE;
}

static void activate_or_launch(DockItem *item) {
    // 1. Try to find matching window in libwnck
    if (wnck_screen) {
        GList *windows = wnck_screen_get_windows(wnck_screen);
        WnckWindow *active_win = wnck_screen_get_active_window(wnck_screen);
        WnckWindow *target_win = NULL;

        for (GList *l = windows; l != NULL; l = l->next) {
            WnckWindow *win = WNCK_WINDOW(l->data);
            if (wnck_window_is_skip_tasklist(win)) continue;
            const char *cls = wnck_window_get_class_instance_name(win);
            const char *name = wnck_window_get_name(win);
            gboolean match = FALSE;
            if (cls && strcasestr(cls, item->wm_class_pattern)) match = TRUE;
            if (!match && name && strcasestr(name, item->wm_class_pattern)) match = TRUE;
            if (match) {
                target_win = win;
                break;
            }
        }

        if (target_win) {
            if (target_win == active_win) {
                wnck_window_minimize(target_win);
            } else {
                wnck_window_activate(target_win, gtk_get_current_event_time());
            }
            return;
        }
    }

    // 2. Launch application async
    GError *err = NULL;
    g_spawn_command_line_async(item->command, &err);
    if (err) {
        g_printerr("Failed to launch %s (%s): %s\n", item->name, item->command, err->message);
        g_error_free(err);
    }
}

static void on_size_menu_select(GtkMenuItem *mi, gpointer user_data) {
    (void)mi;
    int sz = GPOINTER_TO_INT(user_data);
    base_icon_size = sz;
    capsule_height = base_icon_size + 18;
    win_height = capsule_height + 70;
    save_dock_config();
    set_dock_strut(dock_window, capsule_height + dock_bottom_margin + 6);
    update_dock_position();
    gtk_widget_queue_draw(draw_area);
}

static void on_toggle_zoom(GtkCheckMenuItem *mi, gpointer user_data) {
    (void)user_data;
    zoom_enabled = gtk_check_menu_item_get_active(mi);
    save_dock_config();
    recalculate_target_scales();
}

static void on_launch_item(GtkMenuItem *mi, gpointer user_data) {
    (void)mi;
    DockItem *item = (DockItem *)user_data;
    if (item) {
        g_spawn_command_line_async(item->command, NULL);
    }
}

static void on_open_effects(GtkMenuItem *mi, gpointer user_data) {
    (void)mi; (void)user_data;
    g_spawn_command_line_async("/opt/groove-graphics/bin/groove-effects-dialog", NULL);
}

static void show_dock_context_menu(GdkEventButton *event, int item_idx) {
    GtkWidget *menu = gtk_menu_new();

    if (item_idx >= 0 && item_idx < num_items) {
        char title_buf[128];
        snprintf(title_buf, sizeof(title_buf), "Abrir nueva ventana de %s", items[item_idx].name);
        GtkWidget *item_launch = gtk_menu_item_new_with_label(title_buf);
        g_signal_connect(item_launch, "activate", G_CALLBACK(on_launch_item), &items[item_idx]);
        gtk_menu_shell_append(GTK_MENU_SHELL(menu), item_launch);

        GtkWidget *sep = gtk_separator_menu_item_new();
        gtk_menu_shell_append(GTK_MENU_SHELL(menu), sep);
    }

    // Size submenu
    GtkWidget *size_menu_item = gtk_menu_item_new_with_label("Tamaño del Dock");
    GtkWidget *size_sub = gtk_menu_new();
    gtk_menu_item_set_submenu(GTK_MENU_ITEM(size_menu_item), size_sub);

    struct { const char *label; int size; } sizes[] = {
        {"Pequeño (38 px)", 38},
        {"Mediano (48 px)", 48},
        {"Grande (58 px)", 58}
    };
    for (size_t s = 0; s < sizeof(sizes)/sizeof(sizes[0]); s++) {
        GtkWidget *s_item = gtk_menu_item_new_with_label(sizes[s].label);
        g_signal_connect(s_item, "activate", G_CALLBACK(on_size_menu_select), GINT_TO_POINTER(sizes[s].size));
        gtk_menu_shell_append(GTK_MENU_SHELL(size_sub), s_item);
    }
    gtk_menu_shell_append(GTK_MENU_SHELL(menu), size_menu_item);

    // Zoom toggle
    GtkWidget *zoom_item = gtk_check_menu_item_new_with_label("Efecto de ampliación (Zoom)");
    gtk_check_menu_item_set_active(GTK_CHECK_MENU_ITEM(zoom_item), zoom_enabled);
    g_signal_connect(zoom_item, "toggled", G_CALLBACK(on_toggle_zoom), NULL);
    gtk_menu_shell_append(GTK_MENU_SHELL(menu), zoom_item);

    // Effects dialog
    GtkWidget *sep2 = gtk_separator_menu_item_new();
    gtk_menu_shell_append(GTK_MENU_SHELL(menu), sep2);

    GtkWidget *fx_item = gtk_menu_item_new_with_label("Efectos 3D del Escritorio...");
    g_signal_connect(fx_item, "activate", G_CALLBACK(on_open_effects), NULL);
    gtk_menu_shell_append(GTK_MENU_SHELL(menu), fx_item);

    gtk_widget_show_all(menu);
    gtk_menu_popup_at_pointer(GTK_MENU(menu), (GdkEvent *)event);
}

static gboolean on_button_press(GtkWidget *widget, GdkEventButton *event, gpointer user_data) {
    (void)widget; (void)user_data;
    if (event->button == 1) {
        for (int i = 0; i < num_items; i++) {
            if (event->x >= items[i].draw_x && event->x <= (items[i].draw_x + items[i].draw_w)) {
                items[i].bounce_active = TRUE;
                items[i].bounce_phase = 0.0;
                trigger_anim();
                activate_or_launch(&items[i]);
                return TRUE;
            }
        }
    } else if (event->button == 3) {
        int clicked_item = -1;
        for (int i = 0; i < num_items; i++) {
            if (event->x >= items[i].draw_x && event->x <= (items[i].draw_x + items[i].draw_w)) {
                clicked_item = i;
                break;
            }
        }
        show_dock_context_menu(event, clicked_item);
        return TRUE;
    }
    return FALSE;
}

static void on_screen_changed(GtkWidget *widget, GdkScreen *old_screen, gpointer user_data) {
    (void)old_screen; (void)user_data;
    GdkScreen *screen = gtk_widget_get_screen(widget);
    GdkVisual *visual = gdk_screen_get_rgba_visual(screen);
    if (visual && gdk_screen_is_composited(screen)) {
        gtk_widget_set_visual(widget, visual);
    }
    update_dock_position();
}

static void on_window_realize(GtkWidget *widget, gpointer user_data) {
    (void)user_data;
    set_dock_strut(widget, capsule_height + dock_bottom_margin + 6);
}

/* Clear the toplevel as well as the drawing area: its transparent headroom
 * belongs to the dock, not to the application underneath it. */
static gboolean clear_dock_surface(GtkWidget *widget, cairo_t *cr, gpointer data) {
    (void)widget; (void)data;
    cairo_save(cr);
    cairo_set_operator(cr, CAIRO_OPERATOR_CLEAR);
    cairo_paint(cr);
    cairo_restore(cr);
    return FALSE; /* Let GTK propagate drawing to the capsule and labels. */
}

int main(int argc, char *argv[]) {
    gtk_init(&argc, &argv);
    load_dock_config();

    dock_window = gtk_window_new(GTK_WINDOW_TOPLEVEL);
    gtk_widget_set_name(dock_window, "groove-dock");
    gtk_window_set_type_hint(GTK_WINDOW(dock_window), GDK_WINDOW_TYPE_HINT_DOCK);
    gtk_window_set_title(GTK_WINDOW(dock_window), "Groove macOS Dock");
    gtk_window_set_decorated(GTK_WINDOW(dock_window), FALSE);
    gtk_window_set_skip_taskbar_hint(GTK_WINDOW(dock_window), TRUE);
    gtk_window_set_skip_pager_hint(GTK_WINDOW(dock_window), TRUE);
    gtk_window_set_keep_above(GTK_WINDOW(dock_window), TRUE);
    gtk_window_stick(GTK_WINDOW(dock_window));
    gtk_widget_set_app_paintable(dock_window, TRUE);
    GtkCssProvider *dock_css = gtk_css_provider_new();
    gtk_css_provider_load_from_data(dock_css,
        "#groove-dock, #groove-dock decoration { background: transparent; "
        "background-image: none; border: none; box-shadow: none; }", -1, NULL);
    gtk_style_context_add_provider_for_screen(gtk_widget_get_screen(dock_window),
        GTK_STYLE_PROVIDER(dock_css), GTK_STYLE_PROVIDER_PRIORITY_APPLICATION);
    g_object_unref(dock_css);
    g_signal_connect(dock_window, "draw", G_CALLBACK(clear_dock_surface), NULL);

    GdkScreen *screen = gtk_widget_get_screen(dock_window);
    GdkVisual *visual = gdk_screen_get_rgba_visual(screen);
    if (visual) {
        gtk_widget_set_visual(dock_window, visual);
    }

    g_signal_connect(dock_window, "screen-changed", G_CALLBACK(on_screen_changed), NULL);
    g_signal_connect(dock_window, "realize", G_CALLBACK(on_window_realize), NULL);

    draw_area = gtk_drawing_area_new();
    gtk_widget_add_events(draw_area,
        GDK_POINTER_MOTION_MASK |
        GDK_LEAVE_NOTIFY_MASK |
        GDK_BUTTON_PRESS_MASK |
        GDK_BUTTON_RELEASE_MASK);
    g_signal_connect(draw_area, "draw", G_CALLBACK(on_draw), NULL);
    g_signal_connect(draw_area, "motion-notify-event", G_CALLBACK(on_motion_notify), NULL);
    g_signal_connect(draw_area, "leave-notify-event", G_CALLBACK(on_leave_notify), NULL);
    g_signal_connect(draw_area, "button-press-event", G_CALLBACK(on_button_press), NULL);
    gtk_container_add(GTK_CONTAINER(dock_window), draw_area);

    // Load icons
    for (int i = 0; i < num_items; i++) {
        items[i].pixbuf = gdk_pixbuf_new_from_file(items[i].icon_path, NULL);
        if (!items[i].pixbuf) {
            // Fallback to svg if png not available
            char svg_path[256];
            snprintf(svg_path, sizeof(svg_path), "/usr/share/icons/groove-glass/%s.svg", items[i].id);
            items[i].pixbuf = gdk_pixbuf_new_from_file(svg_path, NULL);
        }
    }

    // Init libwnck
    wnck_screen = wnck_screen_get_default();
    if (wnck_screen) {
        g_signal_connect(wnck_screen, "active-window-changed", G_CALLBACK(on_active_window_changed), NULL);
        g_signal_connect(wnck_screen, "window-opened", G_CALLBACK(on_window_opened_or_closed), NULL);
        g_signal_connect(wnck_screen, "window-closed", G_CALLBACK(on_window_opened_or_closed), NULL);
        update_window_states();
    }

    update_dock_position();
    gtk_widget_show_all(dock_window);

    gtk_main();
    return 0;
}
