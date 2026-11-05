/* Validate the actual session catalogue exposed to the greeter. */
#include <lightdm.h>
#include <stdio.h>
#include <string.h>
int main(int argc,char **argv) {
    int xfce=0,weston=0,wayfire=0;
    for(GList *row=lightdm_get_sessions();row;row=row->next){
        LightDMSession *session=row->data;
        const char *key=lightdm_session_get_key(session);
        printf("Session: %s (%s)\n",key,lightdm_session_get_session_type(session));
        xfce|=!strcmp(key,"groove-xfce");weston|=!strcmp(key,"weston");wayfire|=!strcmp(key,"groove-wayfire");
    }
    return xfce&&weston&&(argc<2||wayfire)?0:1;
}
