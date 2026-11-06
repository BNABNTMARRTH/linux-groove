/*
 * groove-transparency-settings.c - Window & Compositor Transparency Editor for Linux Groove OS
 */
#define _GNU_SOURCE
#include <gtk/gtk.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    const char *label;
    const char *prop;
    int min;
    int max;
    int def_val;
    GtkWidget *scale;
} SliderDef;

static SliderDef sliders[] = {
    {"Opacidad de Marcos y Cabeceras", "/general/frame_opacity", 50, 100, 94, NULL},
    {"Opacidad de Ventanas Inactivas", "/general/inactive_opacity", 40, 100, 90, NULL},
    {"Opacidad al Mover Ventanas", "/general/move_opacity", 40, 100, 88, NULL},
    {"Opacidad al Redimensionar", "/general/resize_opacity", 40, 100, 88, NULL},
    {"Intensidad de Sombra de Ventanas", "/general/shadow_opacity", 0, 100, 40, NULL}
};
static const int num_sliders = sizeof(sliders) / sizeof(sliders[0]);

static int read_xfconf_int(const char *prop, int fallback) {
    char cmd[256];
    snprintf(cmd, sizeof(cmd), "xfconf-query -c xfwm4 -p %s 2>/dev/null", prop);
    FILE *fp = popen(cmd, "r");
    if (!fp) return fallback;
    int val = fallback;
    if (fscanf(fp, "%d", &val) != 1) {
        val = fallback;
    }
    pclose(fp);
    return val;
}

static void write_xfconf_int(const char *prop, int val) {
    char cmd[256];
    snprintf(cmd, sizeof(cmd), "xfconf-query -c xfwm4 -p %s -s %d --create -t int 2>/dev/null", prop, val);
    int ret = system(cmd);
    (void)ret;
}

static void on_slider_changed(GtkRange *range, gpointer user_data) {
    SliderDef *sd = (SliderDef *)user_data;
    int val = (int)gtk_range_get_value(range);
    write_xfconf_int(sd->prop, val);
}

static void on_reset_defaults(GtkButton *btn, gpointer user_data) {
    (void)btn;
    (void)user_data;
    for (int i = 0; i < num_sliders; i++) {
        gtk_range_set_value(GTK_RANGE(sliders[i].scale), sliders[i].def_val);
        write_xfconf_int(sliders[i].prop, sliders[i].def_val);
    }
}

int main(int argc, char *argv[]) {
    gtk_init(&argc, &argv);

    GtkWidget *win = gtk_window_new(GTK_WINDOW_TOPLEVEL);
    gtk_window_set_default_size(GTK_WINDOW(win), 480, 420);
    gtk_window_set_position(GTK_WINDOW(win), GTK_WIN_POS_CENTER);
    g_signal_connect(win, "destroy", G_CALLBACK(gtk_main_quit), NULL);

    GtkWidget *header = gtk_header_bar_new();
    gtk_header_bar_set_show_close_button(GTK_HEADER_BAR(header), TRUE);
    gtk_header_bar_set_title(GTK_HEADER_BAR(header), "Transparencia de Ventanas");
    gtk_header_bar_set_subtitle(GTK_HEADER_BAR(header), "Efectos Visuales · Linux Groove OS");
    gtk_window_set_titlebar(GTK_WINDOW(win), header);

    GtkWidget *main_box = gtk_box_new(GTK_ORIENTATION_VERTICAL, 16);
    gtk_container_set_border_width(GTK_CONTAINER(main_box), 18);
    gtk_container_add(GTK_CONTAINER(win), main_box);

    GtkWidget *card = gtk_frame_new(NULL);
    GtkStyleContext *card_ctx = gtk_widget_get_style_context(card);
    gtk_style_context_add_class(card_ctx, "groove-header-card");
    gtk_frame_set_shadow_type(GTK_FRAME(card), GTK_SHADOW_NONE);

    GtkWidget *info_lbl = gtk_label_new(NULL);
    gtk_label_set_markup(GTK_LABEL(info_lbl),
        "<span size='medium' weight='bold' foreground='#d4af37'>Control de Opacidad y Cristal</span>\n"
        "<span size='small' foreground='#9aa0a6'>Ajusta el nivel de transparencia de las ventanas activas, inactivas y en movimiento en tiempo real.</span>");
    gtk_label_set_xalign(GTK_LABEL(info_lbl), 0.0);
    gtk_container_set_border_width(GTK_CONTAINER(info_lbl), 6);
    gtk_container_add(GTK_CONTAINER(card), info_lbl);
    gtk_box_pack_start(GTK_BOX(main_box), card, FALSE, FALSE, 0);

    for (int i = 0; i < num_sliders; i++) {
        GtkWidget *row_box = gtk_box_new(GTK_ORIENTATION_VERTICAL, 4);

        GtkWidget *lbl = gtk_label_new(sliders[i].label);
        gtk_label_set_xalign(GTK_LABEL(lbl), 0.0);
        gtk_box_pack_start(GTK_BOX(row_box), lbl, FALSE, FALSE, 0);

        int current = read_xfconf_int(sliders[i].prop, sliders[i].def_val);
        GtkWidget *scale = gtk_scale_new_with_range(GTK_ORIENTATION_HORIZONTAL, sliders[i].min, sliders[i].max, 1);
        gtk_range_set_value(GTK_RANGE(scale), current);
        gtk_scale_set_value_pos(GTK_SCALE(scale), GTK_POS_RIGHT);
        gtk_scale_set_digits(GTK_SCALE(scale), 0);
        g_signal_connect(scale, "value-changed", G_CALLBACK(on_slider_changed), &sliders[i]);

        sliders[i].scale = scale;
        gtk_box_pack_start(GTK_BOX(row_box), scale, FALSE, FALSE, 0);
        gtk_box_pack_start(GTK_BOX(main_box), row_box, FALSE, FALSE, 0);
    }

    GtkWidget *btn_reset = gtk_button_new_with_label("Restablecer Valores Predeterminados");
    GtkStyleContext *b_ctx = gtk_widget_get_style_context(btn_reset);
    gtk_style_context_add_class(b_ctx, "groove-action-btn");
    g_signal_connect(btn_reset, "clicked", G_CALLBACK(on_reset_defaults), NULL);
    gtk_box_pack_start(GTK_BOX(main_box), btn_reset, FALSE, FALSE, 4);

    gtk_widget_show_all(win);
    gtk_main();
    return 0;
}
