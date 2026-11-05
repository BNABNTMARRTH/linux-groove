/* A small native GTK error dialog; messages are plain text, never shell code. */
#include <gtk/gtk.h>
int main(int argc, char **argv)
{
    if (argc != 3) return 2;
    if (!gtk_init_check(NULL, NULL)) return 1;
    GtkWidget *dialog = gtk_message_dialog_new(NULL, 0, GTK_MESSAGE_ERROR,
        GTK_BUTTONS_CLOSE, "No se pudo abrir %s", argv[1]);
    gtk_message_dialog_format_secondary_text(GTK_MESSAGE_DIALOG(dialog),
        "Revisa el registro de la aplicación:\n%s", argv[2]);
    gtk_window_set_title(GTK_WINDOW(dialog), "Groove · Aplicaciones");
    gtk_dialog_run(GTK_DIALOG(dialog));
    gtk_widget_destroy(dialog);
    return 0;
}
