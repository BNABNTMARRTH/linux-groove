/* Build-only integration probe: no passwords or prompts are supplied. */
#include <security/pam_appl.h>
#include <stdio.h>
static int no_password(int count, const struct pam_message **messages,
                       struct pam_response **responses, void *data) {
    (void)count; (void)messages; (void)responses; (void)data;
    return PAM_CONV_ERR;
}
int main(int argc, char **argv) {
    if (argc != 2) return 2;
    const struct pam_conv conv = { no_password, NULL };
    pam_handle_t *handle = NULL;
    int result = pam_start("lightdm", argv[1], &conv, &handle);
    if (result == PAM_SUCCESS) result = pam_authenticate(handle, PAM_SILENT);
    fprintf(stdout, "PAM auth=%d\n", result);
    if (result == PAM_SUCCESS) result = pam_acct_mgmt(handle, PAM_SILENT);
    fprintf(stdout, "PAM user=%s result=%d (%s)\n", argv[1], result,
            handle ? pam_strerror(handle, result) : "pam_start failed");
    if (handle) pam_end(handle, result);
    return result == PAM_SUCCESS ? 0 : 1;
}
