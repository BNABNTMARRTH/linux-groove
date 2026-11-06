/*
 * groove-package-installer.c - Archive Extractor & App Installer for Linux Groove OS
 * Handles .tar.xz, .tar.gz, .zip, .deb, and .AppImage packages with ARM64 architecture detection
 */
#define _GNU_SOURCE
#include <gtk/gtk.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>

typedef struct {
    GtkWidget *win;
    GtkWidget *lbl_file;
    GtkWidget *lbl_size;
    GtkWidget *lbl_arch;
    GtkWidget *lbl_status;
    GtkWidget *btn_extract;
    GtkWidget *btn_open_folder;
    char filepath[1024];
    int is_x64_mismatch;
} AppState;

static void format_size(off_t bytes, char *out, size_t out_sz) {
    if (bytes >= 1024 * 1024 * 1024) {
        snprintf(out, out_sz, "%.2f GiB (%ld bytes)", (double)bytes / (1024 * 1024 * 1024), bytes);
    } else if (bytes >= 1024 * 1024) {
        snprintf(out, out_sz, "%.1f MiB (%ld bytes)", (double)bytes / (1024 * 1024), bytes);
    } else if (bytes >= 1024) {
        snprintf(out, out_sz, "%.1f KiB (%ld bytes)", (double)bytes / 1024, bytes);
    } else {
        snprintf(out, out_sz, "%ld bytes", bytes);
    }
}

static void analyze_file(AppState *state) {
    struct stat st;
    if (stat(state->filepath, &st) != 0) {
        gtk_label_set_text(GTK_LABEL(state->lbl_status), "Error: No se pudo leer el archivo.");
        return;
    }

    char sz_buf[64];
    format_size(st.st_size, sz_buf, sizeof(sz_buf));
    gtk_label_set_text(GTK_LABEL(state->lbl_size), sz_buf);

    const char *basename = strrchr(state->filepath, '/');
    basename = basename ? basename + 1 : state->filepath;
    gtk_label_set_text(GTK_LABEL(state->lbl_file), basename);

    // Check architecture compatibility
    state->is_x64_mismatch = 0;
    if (strstr(basename, "x86_64") || strstr(basename, "x64") || strstr(basename, "amd64")) {
        state->is_x64_mismatch = 1;
        gtk_label_set_markup(GTK_LABEL(state->lbl_arch),
            "<span foreground='#f87171' weight='bold'>[!] Arquitectura Incompatible: Intel/AMD x86_64</span>\n"
            "<span size='small' foreground='#9aa0a6'>Este equipo usa arquitectura ARM64 (aarch64). Los ejecutables x64 no podrán correr directamente sin un emulador.</span>");
    } else if (strstr(basename, "arm64") || strstr(basename, "aarch64")) {
        gtk_label_set_markup(GTK_LABEL(state->lbl_arch),
            "<span foreground='#34d399' weight='bold'>[OK] Compatible con arquitectura ARM64 (Apple Silicon)</span>");
    } else if (strstr(basename, ".dmg")) {
        gtk_label_set_markup(GTK_LABEL(state->lbl_arch),
            "<span foreground='#60a5fa' weight='bold'>[Apple Silicon / macOS Disk Image (.dmg)]</span>\n"
            "<span size='small' foreground='#9aa0a6'>Imagen de disco de Mac. Se extraerá la aplicación y su contenido usando 7-Zip para explorarla en Linux.</span>");
    } else {
        gtk_label_set_markup(GTK_LABEL(state->lbl_arch),
            "<span foreground='#d4af37'>Paquete genérico o multiplataforma</span>");
    }

    gtk_widget_set_sensitive(state->btn_extract, TRUE);
}

static void on_extract_clicked(GtkButton *btn, gpointer user_data) {
    (void)btn;
    AppState *state = (AppState *)user_data;
    const char *home = getenv("HOME");
    if (!home) home = "/home/groove";

    char dest_dir[1024];
    snprintf(dest_dir, sizeof(dest_dir), "%s/Downloads", home);
    mkdir(dest_dir, 0755);

    gtk_label_set_markup(GTK_LABEL(state->lbl_status), "<span foreground='#d4af37'>Descomprimiendo archivo...</span>");
    while (gtk_events_pending()) gtk_main_iteration();

    char cmd[5120];
    if (strstr(state->filepath, ".tar.xz") || strstr(state->filepath, ".txz")) {
        snprintf(cmd, sizeof(cmd), "tar -xf '%s' -C '%s'", state->filepath, dest_dir);
    } else if (strstr(state->filepath, ".tar.gz") || strstr(state->filepath, ".tgz")) {
        snprintf(cmd, sizeof(cmd), "tar -xzf '%s' -C '%s'", state->filepath, dest_dir);
    } else if (strstr(state->filepath, ".tar.bz2")) {
        snprintf(cmd, sizeof(cmd), "tar -xjf '%s' -C '%s'", state->filepath, dest_dir);
    } else if (strstr(state->filepath, ".tar")) {
        snprintf(cmd, sizeof(cmd), "tar -xf '%s' -C '%s'", state->filepath, dest_dir);
    } else if (strstr(state->filepath, ".zip")) {
        snprintf(cmd, sizeof(cmd), "unzip -q -o '%s' -d '%s'", state->filepath, dest_dir);
    } else if (strstr(state->filepath, ".dmg")) {
        snprintf(cmd, sizeof(cmd), "7z x '%s' -o'%s' -y 2>/dev/null", state->filepath, dest_dir);
    } else {
        snprintf(cmd, sizeof(cmd), "tar -xf '%s' -C '%s' 2>/dev/null || unzip -q -o '%s' -d '%s'",
            state->filepath, dest_dir, state->filepath, dest_dir);
    }

    int res = system(cmd);
    if (res == 0) {
        gtk_label_set_markup(GTK_LABEL(state->lbl_status),
            "<span foreground='#34d399' weight='bold'>¡Extracción completada con éxito en la carpeta Descargas!</span>");
        gtk_widget_set_sensitive(state->btn_open_folder, TRUE);
    } else {
        gtk_label_set_markup(GTK_LABEL(state->lbl_status),
            "<span foreground='#f87171' weight='bold'>Ocurrió un error al descomprimir el archivo.</span>");
    }
}

static void on_open_folder_clicked(GtkButton *btn, gpointer user_data) {
    (void)btn;
    (void)user_data;
    const char *home = getenv("HOME");
    if (!home) home = "/home/groove";
    char cmd[1024];
    snprintf(cmd, sizeof(cmd), "thunar '%s/Downloads' &", home);
    system(cmd);
}

static void on_choose_file(GtkButton *btn, gpointer user_data) {
    (void)btn;
    AppState *state = (AppState *)user_data;
    GtkWidget *chooser = gtk_file_chooser_dialog_new(
        "Seleccionar archivo para extraer o instalar",
        GTK_WINDOW(state->win),
        GTK_FILE_CHOOSER_ACTION_OPEN,
        "Cancelar", GTK_RESPONSE_CANCEL,
        "Abrir", GTK_RESPONSE_ACCEPT,
        NULL
    );

    GtkFileFilter *filter = gtk_file_filter_new();
    gtk_file_filter_set_name(filter, "Paquetes y Archivos (.tar.*, .zip, .deb, .dmg)");
    gtk_file_filter_add_pattern(filter, "*.tar.xz");
    gtk_file_filter_add_pattern(filter, "*.tar.gz");
    gtk_file_filter_add_pattern(filter, "*.tar.bz2");
    gtk_file_filter_add_pattern(filter, "*.zip");
    gtk_file_filter_add_pattern(filter, "*.deb");
    gtk_file_filter_add_pattern(filter, "*.AppImage");
    gtk_file_filter_add_pattern(filter, "*.dmg");
    gtk_file_chooser_add_filter(GTK_FILE_CHOOSER(chooser), filter);

    if (gtk_dialog_run(GTK_DIALOG(chooser)) == GTK_RESPONSE_ACCEPT) {
        char *filename = gtk_file_chooser_get_filename(GTK_FILE_CHOOSER(chooser));
        if (filename) {
            strncpy(state->filepath, filename, sizeof(state->filepath) - 1);
            g_free(filename);
            analyze_file(state);
        }
    }
    gtk_widget_destroy(chooser);
}

int main(int argc, char *argv[]) {
    gtk_init(&argc, &argv);

    AppState state;
    memset(&state, 0, sizeof(state));

    state.win = gtk_window_new(GTK_WINDOW_TOPLEVEL);
    gtk_window_set_default_size(GTK_WINDOW(state.win), 560, 420);
    gtk_window_set_position(GTK_WINDOW(state.win), GTK_WIN_POS_CENTER);
    g_signal_connect(state.win, "destroy", G_CALLBACK(gtk_main_quit), NULL);

    GtkWidget *header = gtk_header_bar_new();
    gtk_header_bar_set_show_close_button(GTK_HEADER_BAR(header), TRUE);
    gtk_header_bar_set_title(GTK_HEADER_BAR(header), "Instalador de Paquetes");
    gtk_header_bar_set_subtitle(GTK_HEADER_BAR(header), "Gestor de Archivos · Linux Groove OS");
    gtk_window_set_titlebar(GTK_WINDOW(state.win), header);

    GtkWidget *btn_select = gtk_button_new_from_icon_name("document-open", GTK_ICON_SIZE_BUTTON);
    gtk_widget_set_tooltip_text(btn_select, "Seleccionar otro archivo...");
    g_signal_connect(btn_select, "clicked", G_CALLBACK(on_choose_file), &state);
    gtk_header_bar_pack_start(GTK_HEADER_BAR(header), btn_select);

    GtkWidget *main_box = gtk_box_new(GTK_ORIENTATION_VERTICAL, 16);
    gtk_container_set_border_width(GTK_CONTAINER(main_box), 20);
    gtk_container_add(GTK_CONTAINER(state.win), main_box);

    // Card info
    GtkWidget *card = gtk_frame_new(NULL);
    GtkStyleContext *card_ctx = gtk_widget_get_style_context(card);
    gtk_style_context_add_class(card_ctx, "groove-header-card");
    gtk_frame_set_shadow_type(GTK_FRAME(card), GTK_SHADOW_NONE);

    GtkWidget *card_box = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 14);
    gtk_container_set_border_width(GTK_CONTAINER(card_box), 12);
    gtk_container_add(GTK_CONTAINER(card), card_box);

    GtkWidget *icon = gtk_image_new_from_icon_name("package-x-generic", GTK_ICON_SIZE_DIALOG);
    gtk_box_pack_start(GTK_BOX(card_box), icon, FALSE, FALSE, 0);

    GtkWidget *details_box = gtk_box_new(GTK_ORIENTATION_VERTICAL, 4);
    state.lbl_file = gtk_label_new("Ningún archivo seleccionado");
    gtk_label_set_xalign(GTK_LABEL(state.lbl_file), 0.0);
    gtk_label_set_markup(GTK_LABEL(state.lbl_file), "<span weight='bold' size='medium'>Ningún archivo seleccionado</span>");

    state.lbl_size = gtk_label_new("-");
    gtk_label_set_xalign(GTK_LABEL(state.lbl_size), 0.0);
    GtkStyleContext *sz_ctx = gtk_widget_get_style_context(state.lbl_size);
    gtk_style_context_add_class(sz_ctx, "dim-label");

    gtk_box_pack_start(GTK_BOX(details_box), state.lbl_file, FALSE, FALSE, 0);
    gtk_box_pack_start(GTK_BOX(details_box), state.lbl_size, FALSE, FALSE, 0);
    gtk_box_pack_start(GTK_BOX(card_box), details_box, TRUE, TRUE, 0);
    gtk_box_pack_start(GTK_BOX(main_box), card, FALSE, FALSE, 0);

    // Arch label
    state.lbl_arch = gtk_label_new(NULL);
    gtk_label_set_xalign(GTK_LABEL(state.lbl_arch), 0.0);
    gtk_box_pack_start(GTK_BOX(main_box), state.lbl_arch, FALSE, FALSE, 0);

    // Actions Box
    GtkWidget *act_box = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 12);
    state.btn_extract = gtk_button_new_with_label("Extraer en Descargas");
    GtkStyleContext *ext_ctx = gtk_widget_get_style_context(state.btn_extract);
    gtk_style_context_add_class(ext_ctx, "groove-primary-btn");
    gtk_widget_set_sensitive(state.btn_extract, FALSE);
    g_signal_connect(state.btn_extract, "clicked", G_CALLBACK(on_extract_clicked), &state);

    state.btn_open_folder = gtk_button_new_with_label("Abrir Carpeta");
    GtkStyleContext *op_ctx = gtk_widget_get_style_context(state.btn_open_folder);
    gtk_style_context_add_class(op_ctx, "groove-action-btn");
    gtk_widget_set_sensitive(state.btn_open_folder, FALSE);
    g_signal_connect(state.btn_open_folder, "clicked", G_CALLBACK(on_open_folder_clicked), &state);

    gtk_box_pack_start(GTK_BOX(act_box), state.btn_extract, TRUE, TRUE, 0);
    gtk_box_pack_start(GTK_BOX(act_box), state.btn_open_folder, FALSE, FALSE, 0);
    gtk_box_pack_start(GTK_BOX(main_box), act_box, FALSE, FALSE, 0);

    // Status label
    state.lbl_status = gtk_label_new(NULL);
    gtk_label_set_xalign(GTK_LABEL(state.lbl_status), 0.0);
    gtk_label_set_line_wrap(GTK_LABEL(state.lbl_status), TRUE);
    gtk_box_pack_start(GTK_BOX(main_box), state.lbl_status, TRUE, TRUE, 0);

    if (argc > 1 && argv[1] && argv[1][0]) {
        strncpy(state.filepath, argv[1], sizeof(state.filepath) - 1);
        analyze_file(&state);
    }

    gtk_widget_show_all(state.win);
    gtk_main();
    return 0;
}
