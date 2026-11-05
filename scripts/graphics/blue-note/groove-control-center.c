/*
 * groove-control-center.c - Native GTK3 Control Center for Linux Groove OS
 * Aesthetics: macOS Blue Note Glass with live telemetry and quick system access
 */
#define _GNU_SOURCE
#include <gtk/gtk.h>
#include <sys/utsname.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

typedef struct {
    const char *icon_name;
    const char *title;
    const char *desc;
    const char *cmd;
} ControlAction;

static const ControlAction actions[] = {
    {"video-display", "Pantalla", "Resolución y orientación", "/opt/groove-graphics/bin/xfce4-display-settings"},
    {"preferences-desktop-theme", "Apariencia", "Temas GTK, iconos y fuentes", "/opt/groove-graphics/bin/xfce4-appearance-settings"},
    {"preferences-desktop-wallpaper", "Fondo", "Fondo de escritorio y estilos", "/opt/groove-graphics/bin/xfdesktop-settings"},
    {"preferences-system-windows", "Ventanas", "Bordes y comportamiento xfwm4", "/opt/groove-graphics/bin/xfwm4-settings"},
    {"input-keyboard", "Teclado", "Distribución de teclas y atajos", "/opt/groove-graphics/bin/xfce4-keyboard-settings"},
    {"input-mouse", "Ratón", "Velocidad del puntero y touchpad", "/opt/groove-graphics/bin/xfce4-mouse-settings"},
    {"utilities-terminal", "Terminal", "Línea de comandos Groove", "/usr/libexec/groove-terminal"},
    {"preferences-system", "Efectos 3D", "Cubo 3D, Wobbly y rotación Wayfire", "/usr/libexec/groove-effects-info"},
    {"drive-harddisk", "Instalar OS", "Instalar Linux Groove en disco", "/usr/libexec/groove-installer-gui"}
};
static const int num_actions = sizeof(actions) / sizeof(actions[0]);

static void on_action_clicked(GtkButton *btn, gpointer user_data) {
    (void)btn;
    const char *cmd = (const char *)user_data;
    if (cmd && *cmd) {
        g_spawn_command_line_async(cmd, NULL);
    }
}

static char *get_sys_summary(void) {
    struct utsname un;
    uname(&un);

    // RAM
    long total_k = 0, avail_k = 0;
    FILE *fp = fopen("/proc/meminfo", "r");
    if (fp) {
        char line[128];
        while (fgets(line, sizeof(line), fp)) {
            if (strncmp(line, "MemTotal:", 9) == 0) sscanf(line + 9, "%ld", &total_k);
            else if (strncmp(line, "MemAvailable:", 13) == 0) sscanf(line + 13, "%ld", &avail_k);
        }
        fclose(fp);
    }
    long used_mb = (total_k - avail_k) / 1024;
    long total_mb = total_k / 1024;

    // Network
    char net_info[64] = "Sin conexión activa";
    fp = fopen("/proc/net/route", "r");
    if (fp) {
        char iface[32];
        unsigned long dest;
        char line[256];
        if (fgets(line, sizeof(line), fp)) { // skip header
            while (fgets(line, sizeof(line), fp)) {
                if (sscanf(line, "%31s %lx", iface, &dest) == 2 && dest == 0) {
                    snprintf(net_info, sizeof(net_info), "Red conectada (%s)", iface);
                    break;
                }
            }
        }
        fclose(fp);
    }

    char *buf = NULL;
    asprintf(&buf,
        "<span size='large' weight='bold' color='#d4af37'>Linux Groove OS</span> · Blue Note Glass\n"
        "<span size='small' color='#94a3b8'>Kernel: %s (%s)  |  RAM: %ld / %ld MiB  |  %s</span>",
        un.release, un.machine, used_mb, total_mb, net_info);
    return buf;
}

int main(int argc, char *argv[]) {
    gtk_init(&argc, &argv);

    GtkWidget *win = gtk_window_new(GTK_WINDOW_TOPLEVEL);
    gtk_window_set_title(GTK_WINDOW(win), "Centro de Control · Linux Groove OS");
    gtk_window_set_default_size(GTK_WINDOW(win), 640, 480);
    gtk_window_set_position(GTK_WINDOW(win), GTK_WIN_POS_CENTER);
    gtk_container_set_border_width(GTK_CONTAINER(win), 16);
    g_signal_connect(win, "destroy", G_CALLBACK(gtk_main_quit), NULL);

    GtkWidget *main_box = gtk_box_new(GTK_ORIENTATION_VERTICAL, 16);
    gtk_container_add(GTK_CONTAINER(win), main_box);

    // Header Card
    GtkWidget *hdr_frame = gtk_frame_new(NULL);
    gtk_frame_set_shadow_type(GTK_FRAME(hdr_frame), GTK_SHADOW_ETCHED_IN);
    GtkWidget *hdr_box = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 12);
    gtk_container_set_border_width(GTK_CONTAINER(hdr_box), 12);
    gtk_container_add(GTK_CONTAINER(hdr_frame), hdr_box);

    GtkWidget *icon = gtk_image_new_from_icon_name("preferences-system", GTK_ICON_SIZE_DIALOG);
    gtk_box_pack_start(GTK_BOX(hdr_box), icon, FALSE, FALSE, 0);

    GtkWidget *lbl_summary = gtk_label_new(NULL);
    char *summary_text = get_sys_summary();
    gtk_label_set_markup(GTK_LABEL(lbl_summary), summary_text);
    g_free(summary_text);
    gtk_label_set_xalign(GTK_LABEL(lbl_summary), 0.0);
    gtk_box_pack_start(GTK_BOX(hdr_box), lbl_summary, TRUE, TRUE, 0);

    gtk_box_pack_start(GTK_BOX(main_box), hdr_frame, FALSE, FALSE, 0);

    // Action Grid
    GtkWidget *grid = gtk_grid_new();
    gtk_grid_set_row_spacing(GTK_GRID(grid), 12);
    gtk_grid_set_column_spacing(GTK_GRID(grid), 12);
    gtk_grid_set_row_homogeneous(GTK_GRID(grid), TRUE);
    gtk_grid_set_column_homogeneous(GTK_GRID(grid), TRUE);
    gtk_box_pack_start(GTK_BOX(main_box), grid, TRUE, TRUE, 0);

    for (int i = 0; i < num_actions; i++) {
        GtkWidget *btn = gtk_button_new();
        GtkWidget *btn_box = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 10);
        gtk_container_set_border_width(GTK_CONTAINER(btn_box), 8);

        GtkWidget *act_icon = gtk_image_new_from_icon_name(actions[i].icon_name, GTK_ICON_SIZE_DND);
        gtk_box_pack_start(GTK_BOX(btn_box), act_icon, FALSE, FALSE, 0);

        GtkWidget *txt_box = gtk_box_new(GTK_ORIENTATION_VERTICAL, 2);
        GtkWidget *lbl_title = gtk_label_new(NULL);
        char *title_markup = g_strdup_printf("<span weight='bold' size='medium'>%s</span>", actions[i].title);
        gtk_label_set_markup(GTK_LABEL(lbl_title), title_markup);
        g_free(title_markup);
        gtk_label_set_xalign(GTK_LABEL(lbl_title), 0.0);

        GtkWidget *lbl_desc = gtk_label_new(actions[i].desc);
        gtk_label_set_xalign(GTK_LABEL(lbl_desc), 0.0);
        GtkStyleContext *ctx = gtk_widget_get_style_context(lbl_desc);
        gtk_style_context_add_class(ctx, "dim-label");

        gtk_box_pack_start(GTK_BOX(txt_box), lbl_title, FALSE, FALSE, 0);
        gtk_box_pack_start(GTK_BOX(txt_box), lbl_desc, FALSE, FALSE, 0);
        gtk_box_pack_start(GTK_BOX(btn_box), txt_box, TRUE, TRUE, 0);

        gtk_container_add(GTK_CONTAINER(btn), btn_box);
        g_signal_connect(btn, "clicked", G_CALLBACK(on_action_clicked), (gpointer)actions[i].cmd);

        int col = i % 2;
        int row = i / 2;
        gtk_grid_attach(GTK_GRID(grid), btn, col, row, 1, 1);
    }

    gtk_widget_show_all(win);
    gtk_main();
    return 0;
}

