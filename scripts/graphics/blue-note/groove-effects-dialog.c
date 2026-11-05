/*
 * groove-effects-dialog.c - Visual guide for 3D Desktop Effects in Linux Groove OS
 */
#include <gtk/gtk.h>

int main(int argc, char *argv[]) {
    gtk_init(&argc, &argv);

    GtkWidget *dialog = gtk_dialog_new_with_buttons(
        "Linux Groove · Efectos 3D de Escritorio",
        NULL,
        GTK_DIALOG_MODAL | GTK_DIALOG_DESTROY_WITH_PARENT,
        "Entendido",
        GTK_RESPONSE_ACCEPT,
        NULL
    );
    gtk_window_set_default_size(GTK_WINDOW(dialog), 480, 360);
    gtk_window_set_position(GTK_WINDOW(dialog), GTK_WIN_POS_CENTER);

    GtkWidget *content_area = gtk_dialog_get_content_area(GTK_DIALOG(dialog));
    gtk_container_set_border_width(GTK_CONTAINER(content_area), 20);

    GtkWidget *vbox = gtk_box_new(GTK_ORIENTATION_VERTICAL, 14);
    gtk_box_pack_start(GTK_BOX(content_area), vbox, TRUE, TRUE, 0);

    GtkWidget *title_lbl = gtk_label_new(NULL);
    gtk_label_set_markup(GTK_LABEL(title_lbl),
        "<span size='x-large' weight='bold' foreground='#ffaa33'>🎲 Efectos 3D y Cubo de Escritorios</span>\n"
        "<span size='small' foreground='#94a3b8'>Disponibles activando la sesión Wayfire 3D en la pantalla de inicio</span>");
    gtk_label_set_xalign(GTK_LABEL(title_lbl), 0.0);
    gtk_box_pack_start(GTK_BOX(vbox), title_lbl, FALSE, FALSE, 0);

    const char *effects_text =
        "<b>🎲 Giro en Cubo 3D de Escritorios:</b>\n"
        "  • <b>Ctrl + Alt + Flechas</b> (Izquierda / Derecha) para rotar el cubo.\n"
        "  • <b>Ctrl + Alt + Clic Izquierdo</b> y arrastrar para girar el cubo libremente en 3D.\n\n"
        "<b>🌀 Rotación 3D de Ventanas (wrot):</b>\n"
        "  • <b>Ctrl + Alt + Clic Derecho</b> sobre cualquier ventana para rotarla en perspectiva.\n\n"
        "<b>🌊 Ventanas Gelatinosas (Wobbly):</b>\n"
        "  • Efecto elástico y dinámico al arrastrar o mover ventanas.\n\n"
        "<b>🪟 Exposé y Mission Control:</b>\n"
        "  • <b>Super + Espacio</b>: Vista general Exposé de todos los escritorios.\n"
        "  • <b>Super + W</b>: Vista Scale (Mission Control) de ventanas activas.";

    GtkWidget *desc_lbl = gtk_label_new(NULL);
    gtk_label_set_markup(GTK_LABEL(desc_lbl), effects_text);
    gtk_label_set_xalign(GTK_LABEL(desc_lbl), 0.0);
    gtk_label_set_line_wrap(GTK_LABEL(desc_lbl), TRUE);
    gtk_box_pack_start(GTK_BOX(vbox), desc_lbl, TRUE, TRUE, 0);

    // CSS Styling
    GtkCssProvider *css = gtk_css_provider_new();
    gtk_css_provider_load_from_data(css,
        "dialog { background-color: #121620; color: #f1f5f9; }\n"
        "button { background: rgba(255, 170, 51, 0.2); color: #ffaa33; border: 1px solid #ffaa33; border-radius: 8px; padding: 6px 16px; font-weight: bold; }\n"
        "button:hover { background: #ffaa33; color: #000000; }", -1, NULL);
    gtk_style_context_add_provider_for_screen(gdk_screen_get_default(),
        GTK_STYLE_PROVIDER(css), GTK_STYLE_PROVIDER_PRIORITY_APPLICATION);

    gtk_widget_show_all(dialog);
    gtk_dialog_run(GTK_DIALOG(dialog));
    gtk_widget_destroy(dialog);
    return 0;
}
