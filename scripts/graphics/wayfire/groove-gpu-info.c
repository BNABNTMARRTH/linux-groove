/* Probe the guest render node directly; a GLES context alone does not prove acceleration. */
#include <EGL/egl.h>
#include <EGL/eglext.h>
#include <GLES2/gl2.h>
#include <gbm.h>
#include <fcntl.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>
int main(void) {
    int fd=open("/dev/dri/renderD128",O_RDWR|O_CLOEXEC);
    if(fd<0){perror("renderD128");return 1;}
    struct gbm_device *gbm=gbm_create_device(fd);
    if(!gbm){close(fd);return 1;}
    PFNEGLGETPLATFORMDISPLAYEXTPROC platform=(void*)eglGetProcAddress("eglGetPlatformDisplayEXT");
    EGLDisplay d=platform?platform(EGL_PLATFORM_GBM_KHR,gbm,NULL):EGL_NO_DISPLAY;
    EGLint major,minor;
    if(d==EGL_NO_DISPLAY||!eglInitialize(d,&major,&minor)||!eglBindAPI(EGL_OPENGL_ES_API)){
        fprintf(stderr,"EGL initialization failed: 0x%x\n",eglGetError());return 1;
    }
    EGLint attributes[]={EGL_RENDERABLE_TYPE,EGL_OPENGL_ES2_BIT,EGL_SURFACE_TYPE,EGL_WINDOW_BIT,EGL_NONE};
    EGLConfig config;EGLint n;
    if(!eglChooseConfig(d,attributes,&config,1,&n)||n<1){fprintf(stderr,"No GBM EGL config: 0x%x\n",eglGetError());return 1;}
    EGLint context_attributes[]={EGL_CONTEXT_CLIENT_VERSION,2,EGL_NONE};
    EGLContext c=eglCreateContext(d,config,EGL_NO_CONTEXT,context_attributes);
    if(c==EGL_NO_CONTEXT||!eglMakeCurrent(d,EGL_NO_SURFACE,EGL_NO_SURFACE,c)){fprintf(stderr,"GLES context failed: 0x%x\n",eglGetError());return 1;}
    const char *renderer=(const char*)glGetString(GL_RENDERER);
    const char *vendor=(const char*)glGetString(GL_VENDOR);
    printf("EGL: %d.%d\nGBM backend: %s\nVendor: %s\nRenderer: %s\n",major,minor,gbm_device_get_backend_name(gbm),vendor,renderer);
    int software=!renderer||strcasestr(renderer,"llvmpipe")||strcasestr(renderer,"softpipe")||strcasestr(renderer,"swrast")||strcasestr(renderer,"software");
    /* This delivery targets UTM VirGL specifically. Unknown renderers need review. */
    int accelerated=!software&&strcasestr(renderer,"virgl");
    printf("UTM VirGL acceleration: %s\n",accelerated?"verified":"not verified");
    eglMakeCurrent(d,EGL_NO_SURFACE,EGL_NO_SURFACE,EGL_NO_CONTEXT);
    eglDestroyContext(d,c);eglTerminate(d);gbm_device_destroy(gbm);close(fd);
    return accelerated?0:2;
}
