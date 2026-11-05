/* Root session coordinator: compositor runs as groove, then LightDM takes over. */
#define _GNU_SOURCE
#include <errno.h>
#include <grp.h>
#include <pwd.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/wait.h>
#include <unistd.h>

static volatile sig_atomic_t session_pid;
static volatile sig_atomic_t stopping;
static void stop_session(int signal_number)
{
    stopping = 1;
    if (session_pid > 0) {
        kill(-session_pid, signal_number);
        kill(session_pid, signal_number); /* also covers fork-before-setsid */
    }
}

int main(void)
{
    if (getuid() != 0) { fputs("groove-desktop requires the init supervisor\n", stderr); return 1; }
    struct passwd *user = getpwnam("groove");
    if (!user || user->pw_uid == 0) { fputs("Invalid groove account\n", stderr); return 1; }
    struct sigaction action = {.sa_handler = stop_session};
    sigemptyset(&action.sa_mask);
    sigaction(SIGTERM, &action, NULL);
    sigaction(SIGINT, &action, NULL);
    sigaction(SIGHUP, &action, NULL);
    pid_t child = fork();
    if (child < 0) { perror("fork"); return 1; }
    if (child == 0) {
        struct sigaction defaults = {.sa_handler = SIG_DFL};
        sigemptyset(&defaults.sa_mask);
        sigaction(SIGTERM, &defaults, NULL);
        sigaction(SIGINT, &defaults, NULL);
        sigaction(SIGHUP, &defaults, NULL);
        if (stopping) _exit(0);
        if (setsid() < 0 || initgroups(user->pw_name, user->pw_gid) < 0 ||
            setgid(user->pw_gid) < 0 || setuid(user->pw_uid) < 0) {
            perror("groove identity"); _exit(1);
        }
        setenv("HOME", user->pw_dir, 1);
        setenv("USER", user->pw_name, 1);
        setenv("LOGNAME", user->pw_name, 1);
        setenv("SHELL", user->pw_shell, 1);
        if (chdir(user->pw_dir) < 0) _exit(1);
        execl("/usr/libexec/groove-wayfire", "groove-wayfire", "--fallback-weston", (char*)NULL);
        perror("groove-wayfire"); _exit(1);
    }
    session_pid = child;
    if (stopping) stop_session(SIGTERM);
    int status;
    while (waitpid(child, &status, 0) < 0) {
        if (errno != EINTR) { perror("waitpid"); return 1; }
    }
    session_pid = 0;
    if (stopping) return 0;
    fputs("Graphical session ended; handing the seat to LightDM\n", stderr);
    execl("/opt/groove-graphics/sbin/lightdm", "lightdm", "--no-daemon", (char*)NULL);
    perror("lightdm");
    return 1;
}
