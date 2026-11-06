/* Render actual GTK + XFWM surfaces under Xvfb; not a UTM acceptance test. */
#include <gtk/gtk.h>

static gboolean stop(gpointer unused) { (void)unused; gtk_main_quit(); return G_SOURCE_REMOVE; }
int main(int argc, char **argv) {
    gtk_init(&argc, &argv);
    gchar *theme = NULL;
    g_object_get(gtk_settings_get_default(), "gtk-theme-name", &theme, NULL);
    g_print("GTK theme: %s\n", theme);
    g_free(theme);
    if (argc != 2) return 2;
    GError *error = NULL;
    GtkCssProvider *css = gtk_css_provider_new();
    if (!gtk_css_provider_load_from_path(css, argv[1], &error)) {
        g_printerr("CSS: %s\n", error->message); return 3;
    }
    g_object_unref(css);
    for (int i=0; i<2; i++) {
        GtkWidget *win=gtk_window_new(GTK_WINDOW_TOPLEVEL);
        gtk_window_set_title(GTK_WINDOW(win), i ? "GrooveWindow — ventana clara" : "GrooveWindow — edición y herramientas");
        gtk_window_set_default_size(GTK_WINDOW(win), 560, 440);
        gtk_window_move(GTK_WINDOW(win), 40+i*600, 90);
        GtkWidget *box=gtk_box_new(GTK_ORIENTATION_VERTICAL,0);
        gtk_container_add(GTK_CONTAINER(win),box);
        GtkWidget *menu=gtk_menu_bar_new();
        const char *labels[]={"Archivo","Editar","Ver","Ayuda"};
        for(int j=0;j<4;j++) gtk_menu_shell_append(GTK_MENU_SHELL(menu),gtk_menu_item_new_with_label(labels[j]));
        gtk_box_pack_start(GTK_BOX(box),menu,FALSE,FALSE,0);
        GtkWidget *toolbar=gtk_toolbar_new();
        gtk_toolbar_insert(GTK_TOOLBAR(toolbar),gtk_tool_button_new(NULL,"Abrir"),-1);
        gtk_toolbar_set_style(GTK_TOOLBAR(toolbar),GTK_TOOLBAR_TEXT);
        gtk_box_pack_start(GTK_BOX(box),toolbar,FALSE,FALSE,0);
        GtkWidget *text=gtk_text_view_new();
        gtk_text_buffer_set_text(gtk_text_view_get_buffer(GTK_TEXT_VIEW(text)),"Linux Groove\nTexto de interfaz: áéíóú ñ — 0123456789\nContenido y herramientas en superficies distintas.",-1);
        if(i) {
            GtkCssProvider *white=gtk_css_provider_new();
            gtk_css_provider_load_from_data(white,"textview text { background: white; color: #202124; }",-1,NULL);
            gtk_style_context_add_provider(gtk_widget_get_style_context(text),GTK_STYLE_PROVIDER(white),GTK_STYLE_PROVIDER_PRIORITY_APPLICATION);
            g_object_unref(white);
        }
        gtk_box_pack_start(GTK_BOX(box),text,TRUE,TRUE,0);
        gtk_widget_show_all(win);
    }
    g_timeout_add_seconds(90,stop,NULL);
    gtk_main(); return 0;
}
