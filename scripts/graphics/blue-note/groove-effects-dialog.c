/*
 * groove-effects-dialog.c - Visual guide for 3D Desktop Effects in Linux Groove OS
 */
#include <gtk/gtk.h>

int main(int argc, char *argv[]) {
    gtk_init(&argc, &argv);

    GtkWidget *dialog = gtk_dialog_new_with_buttons(
        NULL,
        NULL,
        GTK_DIALOG_MODAL | GTK_DIALOG_DESTROY_WITH_PARENT,
        "Entendido",
        GTK_RESPONSE_ACCEPT,
        NULL
    );
    gtk_window_set_default_size(GTK_WINDOW(dialog), 520, 420);
    gtk_window_set_position(GTK_WINDOW(dialog), GTK_WIN_POS_CENTER);

    GtkWidget *header = gtk_header_bar_new();
    gtk_header_bar_set_show_close_button(GTK_HEADER_BAR(header), TRUE);
    gtk_header_bar_set_title(GTK_HEADER_BAR(header), "Efectos 3D de Escritorio");
    gtk_header_bar_set_subtitle(GTK_HEADER_BAR(header), "Wayfire 3D · Linux Groove OS");
    gtk_window_set_titlebar(GTK_WINDOW(dialog), header);

    GtkWidget *content_area = gtk_dialog_get_content_area(GTK_DIALOG(dialog));
    gtk_container_set_border_width(GTK_CONTAINER(content_area), 18);

    GtkWidget *vbox = gtk_box_new(GTK_ORIENTATION_VERTICAL, 14);
    gtk_box_pack_start(GTK_BOX(content_area), vbox, TRUE, TRUE, 0);

    GtkWidget *card = gtk_frame_new(NULL);
    GtkStyleContext *card_ctx = gtk_widget_get_style_context(card);
    gtk_style_context_add_class(card_ctx, "groove-header-card");
    gtk_frame_set_shadow_type(GTK_FRAME(card), GTK_SHADOW_NONE);

    GtkWidget *title_lbl = gtk_label_new(NULL);
    gtk_label_set_markup(GTK_LABEL(title_lbl),
        "<span size='large' weight='bold' foreground='#d4af37'>Efectos Expresivos y Cubo 3D</span>\n"
        "<span size='small' foreground='#9aa0a6'>Disponibles activando la sesión Wayfire 3D en la pantalla de inicio o seleccionando Wayfire en GRUB.</span>");
    gtk_label_set_xalign(GTK_LABEL(title_lbl), 0.0);
    gtk_container_set_border_width(GTK_CONTAINER(title_lbl), 8);
    gtk_container_add(GTK_CONTAINER(card), title_lbl);
    gtk_box_pack_start(GTK_BOX(vbox), card, FALSE, FALSE, 0);

    const char *effects_text =
        "<span weight='bold' foreground='#d4af37'>[1] Giro en Cubo 3D de Escritorios:</span>\n"
        "  • <b>Ctrl + Alt + Flechas</b> (Izquierda / Derecha) para rotar el cubo.\n"
        "  • <b>Ctrl + Alt + Clic Izquierdo</b> y arrastrar para girar el cubo libremente en 3D.\n\n"
        "<span weight='bold' foreground='#d4af37'>[2] Rotación 3D de Ventanas (wrot):</span>\n"
        "  • <b>Ctrl + Alt + Clic Derecho</b> sobre cualquier ventana para rotarla en perspectiva.\n\n"
        "<span weight='bold' foreground='#d4af37'>[3] Ventanas Gelatinosas (Wobbly):</span>\n"
        "  • Efecto elástico y dinámico al arrastrar o redimensionar ventanas.\n\n"
        "<span weight='bold' foreground='#d4af37'>[4] Exposé y Mission Control:</span>\n"
        "  • <b>Super + Espacio</b>: Vista general Exposé de todos los escritorios.\n"
        "  • <b>Super + W</b>: Vista Scale (Mission Control) de ventanas activas.";

    GtkWidget *desc_lbl = gtk_label_new(NULL);
    gtk_label_set_markup(GTK_LABEL(desc_lbl), effects_text);
    gtk_label_set_xalign(GTK_LABEL(desc_lbl), 0.0);
    gtk_label_set_line_wrap(GTK_LABEL(desc_lbl), TRUE);
    gtk_box_pack_start(GTK_BOX(vbox), desc_lbl, TRUE, TRUE, 0);

    gtk_widget_show_all(dialog);
    gtk_dialog_run(GTK_DIALOG(dialog));
    gtk_widget_destroy(dialog);
    return 0;
}
