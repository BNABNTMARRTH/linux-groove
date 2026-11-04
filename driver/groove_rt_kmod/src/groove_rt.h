/*
 * groove_rt.h - Linux Groove OS Real-Time Audio Driver Header
 * Definiciones de IOCTLs y telemetría de scheduler jitter
 */

#ifndef _GROOVE_RT_H
#define _GROOVE_RT_H

#include <linux/ioctl.h>
#include <linux/types.h>

#define GROOVE_IOCTL_MAGIC 'G'

/* IOCTL 0x4701: Registra TID y eleva a SCHED_FIFO 98 */
#define GROOVE_IOCTL_REGISTER_RT_THREAD _IOW(GROOVE_IOCTL_MAGIC, 0x01, __s32)

/* IOCTL 0x4702: Consulta jitter en nanosegundos */
#define GROOVE_IOCTL_GET_JITTER          _IOR(GROOVE_IOCTL_MAGIC, 0x02, __u64)

/* IOCTL 0x4703: Restaura hilo a SCHED_OTHER normal */
#define GROOVE_IOCTL_UNREGISTER          _IOW(GROOVE_IOCTL_MAGIC, 0x03, __s32)

struct groove_rt_stats {
    __u64 jitter_ns;
    __u64 max_jitter_ns;
    __u64 xruns_detected;
    __u32 registered_threads;
};

#endif /* _GROOVE_RT_H */

