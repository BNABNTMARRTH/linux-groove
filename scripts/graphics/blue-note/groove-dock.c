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

#define BASE_ICON_SIZE 48
#define MAX_ZOOM_SCALE 1.42
#define SIGMA 50.0
#define DOCK_HEIGHT 74
#define DOCK_BOTTOM_MARGIN 12
#define ITEM_SPACING 14
#define CAPSULE_PAD_X 18

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
} DockItem;

static DockItem items[] = {
    {"terminal", "Terminal", "/usr/share/icons/groove-glass/terminal@2x.png",
     "/usr/libexec/groove-terminal", "terminal", NULL, 1.0, 1.0, 0, 0, FALSE, FALSE},
    {"files", "Archivos", "/usr/share/icons/groove-glass/files@2x.png",
     "/usr/libexec/groove-files", "thunar", NULL, 1.0, 1.0, 0, 0, FALSE, FALSE},
    {"editor", "Editor", "/usr/share/icons/groove-glass/editor@2x.png",
     "/usr/libexec/groove-editor", "mousepad", NULL, 1.0, 1.0, 0, 0, FALSE, FALSE},
    {"browser", "Firefox", "/usr/share/icons/groove-glass/browser@2x.png",
     "/usr/libexec/groove-browser", "firefox", NULL, 1.0, 1.0, 0, 0, FALSE, FALSE},
    {"system", "Sistema", "/usr/share/icons/groove-glass/system@2x.png",
     "/usr/libexec/groove-system-info", "groove-sysinfo", NULL, 1.0, 1.0, 0, 0, FALSE, FALSE},
    {"settings", "Ajustes", "/usr/share/icons/groove-glass/settings@2x.png",
     "/opt/groove-graphics/bin/xfce4-settings-manager", "xfce4-settings-manager", NULL, 1.0, 1.0, 0, 0, FALSE, FALSE}
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

    unsigned long strut[4] = {0, 0, 0, height};
    XChangeProperty(xdisplay, xid, atom_strut, cardinal, 32, PropModeReplace,
                    (unsigned char *)strut, 4);

    unsigned long strut_partial[12] = {
        0, 0, 0, height,
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

    // Compute dock width based on items and current scale
    double total_w = CAPSULE_PAD_X * 2;
    for (int i = 0; i < num_items; i++) {
        total_w += (BASE_ICON_SIZE * items[i].current_scale) + ITEM_SPACING;
    }
    total_w -= ITEM_SPACING; // remove last spacing
    int win_w = (int)ceil(total_w) + 24;
    int win_h = DOCK_HEIGHT + 16;
    int pos_x = (screen_w - win_w) / 2;
    int pos_y = screen_h - win_h - DOCK_BOTTOM_MARGIN;

    gtk_window_resize(GTK_WINDOW(dock_window), win_w, win_h);
    gtk_window_move(GTK_WINDOW(dock_window), pos_x, pos_y);
}

static gboolean on_anim_tick(gpointer user_data) {
    (void)user_data;
    gboolean needs_more = FALSE;
    for (int i = 0; i < num_items; i++) {
        double diff = items[i].target_scale - items[i].current_scale;
        if (fabs(diff) > 0.005) {
            items[i].current_scale += diff * 0.28;
            needs_more = TRUE;
        } else {
            items[i].current_scale = items[i].target_scale;
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
    if (!mouse_in_dock) {
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
        content_w += (BASE_ICON_SIZE * items[i].current_scale) + ITEM_SPACING;
    }
    content_w -= ITEM_SPACING;
    double capsule_w = content_w + (CAPSULE_PAD_X * 2);
    double capsule_h = DOCK_HEIGHT;
    double capsule_x = (w - capsule_w) / 2.0;
    double capsule_y = h - capsule_h - 4.0;
    double corner_radius = 18.0;

    // Draw Capsule Glass Background
    cairo_new_sub_path(cr);
    cairo_arc(cr, capsule_x + capsule_w - corner_radius, capsule_y + corner_radius, corner_radius, -M_PI/2, 0);
    cairo_arc(cr, capsule_x + capsule_w - corner_radius, capsule_y + capsule_h - corner_radius, corner_radius, 0, M_PI/2);
    cairo_arc(cr, capsule_x + corner_radius, capsule_y + capsule_h - corner_radius, corner_radius, M_PI/2, M_PI);
    cairo_arc(cr, capsule_x + corner_radius, capsule_y + corner_radius, corner_radius, M_PI, 3*M_PI/2);
    cairo_close_path(cr);

    // Glass fill: dark navy Blue Note translucent
    cairo_set_source_rgba(cr, 0.08, 0.10, 0.14, 0.82);
    cairo_fill_preserve(cr);

    // Glass border: subtle crisp white glow
    cairo_set_source_rgba(cr, 1.0, 1.0, 1.0, 0.18);
    cairo_set_line_width(cr, 1.2);
    cairo_stroke(cr);

    // Draw Icons and Running Indicators
    double cur_x = capsule_x + CAPSULE_PAD_X;
    for (int i = 0; i < num_items; i++) {
        double icon_size = BASE_ICON_SIZE * items[i].current_scale;
        double icon_x = cur_x;
        // Icons grow upwards when magnified
        double icon_y = (capsule_y + capsule_h - 14.0) - icon_size;

        items[i].draw_x = icon_x;
        items[i].draw_w = icon_size;

        if (items[i].pixbuf) {
            cairo_save(cr);
            cairo_translate(cr, icon_x, icon_y);
            double scale = icon_size / (double)gdk_pixbuf_get_width(items[i].pixbuf);
            cairo_scale(cr, scale, scale);
            gdk_cairo_set_source_pixbuf(cr, items[i].pixbuf, 0, 0);
            cairo_paint(cr);
            cairo_restore(cr);
        }

        // Draw running dot indicator below icon
        if (items[i].is_running) {
            double dot_x = icon_x + (icon_size / 2.0);
            double dot_y = capsule_y + capsule_h - 6.0;
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

        cur_x += icon_size + ITEM_SPACING;
    }

    // Draw label for hovered item if active
    if (mouse_in_dock && hovered_item_idx >= 0 && hovered_item_idx < num_items) {
        const char *name = items[hovered_item_idx].name;
        cairo_select_font_face(cr, "Sans", CAIRO_FONT_SLANT_NORMAL, CAIRO_FONT_WEIGHT_BOLD);
        cairo_set_font_size(cr, 11.0);
        cairo_text_extents_t ext;
        cairo_text_extents(cr, name, &ext);

        double lbl_w = ext.width + 16.0;
        double lbl_h = ext.height + 8.0;
        double lbl_x = items[hovered_item_idx].draw_x + (items[hovered_item_idx].draw_w / 2.0) - (lbl_w / 2.0);
        double lbl_y = capsule_y - 20.0;

        // Label capsule
        cairo_arc(cr, lbl_x + 6, lbl_y + 6, 6, M_PI, 3*M_PI/2);
        cairo_arc(cr, lbl_x + lbl_w - 6, lbl_y + 6, 6, -M_PI/2, 0);
        cairo_arc(cr, lbl_x + lbl_w - 6, lbl_y + lbl_h - 6, 6, 0, M_PI/2);
        cairo_arc(cr, lbl_x + 6, lbl_y + lbl_h - 6, 6, M_PI/2, M_PI);
        cairo_close_path(cr);
        cairo_set_source_rgba(cr, 0.05, 0.07, 0.10, 0.90);
        cairo_fill_preserve(cr);
        cairo_set_source_rgba(cr, 1.0, 1.0, 1.0, 0.20);
        cairo_stroke(cr);

        // Label text
        cairo_set_source_rgb(cr, 0.95, 0.95, 0.95);
        cairo_move_to(cr, lbl_x + 8.0, lbl_y + ext.height + 2.0);
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

static gboolean on_button_release(GtkWidget *widget, GdkEventButton *event, gpointer user_data) {
    (void)widget; (void)user_data;
    if (event->button != 1) return FALSE;

    for (int i = 0; i < num_items; i++) {
        if (event->x >= items[i].draw_x && event->x <= (items[i].draw_x + items[i].draw_w)) {
            // Find if there is a matching window
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
                    if (cls && strcasestr(cls, items[i].wm_class_pattern)) match = TRUE;
                    if (!match && name && strcasestr(name, items[i].wm_class_pattern)) match = TRUE;
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
                    return TRUE;
                }
            }

            // Otherwise, spawn application
            g_spawn_command_line_async(items[i].command, NULL);
            return TRUE;
        }
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
    set_dock_strut(widget, DOCK_HEIGHT + DOCK_BOTTOM_MARGIN + 6);
}

int main(int argc, char *argv[]) {
    gtk_init(&argc, &argv);

    dock_window = gtk_window_new(GTK_WINDOW_TOPLEVEL);
    gtk_window_set_type_hint(GTK_WINDOW(dock_window), GDK_WINDOW_TYPE_HINT_DOCK);
    gtk_window_set_title(GTK_WINDOW(dock_window), "Groove macOS Dock");
    gtk_window_set_decorated(GTK_WINDOW(dock_window), FALSE);
    gtk_window_set_skip_taskbar_hint(GTK_WINDOW(dock_window), TRUE);
    gtk_window_set_skip_pager_hint(GTK_WINDOW(dock_window), TRUE);
    gtk_window_set_keep_above(GTK_WINDOW(dock_window), TRUE);
    gtk_window_stick(GTK_WINDOW(dock_window));
    gtk_widget_set_app_paintable(dock_window, TRUE);

    GdkScreen *screen = gtk_widget_get_screen(dock_window);
    GdkVisual *visual = gdk_screen_get_rgba_visual(screen);
    if (visual) {
        gtk_widget_set_visual(dock_window, visual);
    }

    g_signal_connect(dock_window, "screen-changed", G_CALLBACK(on_screen_changed), NULL);
    g_signal_connect(dock_window, "realize", G_CALLBACK(on_window_realize), NULL);

    draw_area = gtk_drawing_area_new();
    gtk_widget_add_events(draw_area, GDK_POINTER_MOTION_MASK | GDK_LEAVE_NOTIFY_MASK | GDK_BUTTON_RELEASE_MASK);
    g_signal_connect(draw_area, "draw", G_CALLBACK(on_draw), NULL);
    g_signal_connect(draw_area, "motion-notify-event", G_CALLBACK(on_motion_notify), NULL);
    g_signal_connect(draw_area, "leave-notify-event", G_CALLBACK(on_leave_notify), NULL);
    g_signal_connect(draw_area, "button-release-event", G_CALLBACK(on_button_release), NULL);
    gtk_container_add(GTK_CONTAINER(dock_window), draw_area);

    // Load icons
    for (int i = 0; i < num_items; i++) {
        GError *err = NULL;
        items[i].pixbuf = gdk_pixbuf_new_from_file(items[i].icon_path, &err);
        if (!items[i].pixbuf) {
            // Fallback to svg if png not generated yet
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
