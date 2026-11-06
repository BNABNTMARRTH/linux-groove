/* X11 pointer positioning for reproducible hover screenshots. */
#include <X11/Xlib.h>
#include <stdlib.h>
int main(int argc, char **argv) {
    if (argc != 3) return 2;
    Display *d = XOpenDisplay(NULL);
    if (!d) return 3;
    XWarpPointer(d, None, DefaultRootWindow(d), 0, 0, 0, 0, atoi(argv[1]), atoi(argv[2]));
    XSync(d, False); XCloseDisplay(d); return 0;
}
