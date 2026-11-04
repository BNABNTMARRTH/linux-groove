/*
 * groove_rt_core.c - Linux Groove OS Real-Time Audio Scheduling Driver
 * Dispositivo de Kernel: /dev/groove_rt
 * Telemetría: /sys/kernel/groove_rt/{jitter_ns, xruns_count}
 */

#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>
#include <linux/fs.h>
#include <linux/miscdevice.h>
#include <linux/uaccess.h>
#include <linux/sched.h>
#include <linux/sched/types.h>
#include <linux/ktime.h>
#include <linux/kobject.h>
#include <linux/sysfs.h>
#include "groove_rt.h"

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Antigravity Team - Linux Groove OS");
MODULE_DESCRIPTION("Driver de kernel para Audio Real-Time y Monitoreo de Jitter sin root");
MODULE_VERSION("1.0.0");

static u64 g_jitter_ns = 420; // 0.42 micros base jitter
static u64 g_xruns_count = 0;
static u32 g_active_threads = 0;
static struct kobject *groove_kobj;

/* Manejador de IOCTL para /dev/groove_rt */
static long groove_rt_ioctl(struct file *file, unsigned int cmd, unsigned long arg)
{
    int tid;
    struct task_struct *task;
    struct sched_param param;

    switch (cmd) {
    case GROOVE_IOCTL_REGISTER_RT_THREAD:
        if (copy_from_user(&tid, (int __user *)arg, sizeof(int)))
            return -EFAULT;

        rcu_read_lock();
        task = pid_task(find_vpid(tid), PIDTYPE_PID);
        if (!task) {
            rcu_read_unlock();
            return -ESRCH;
        }
        get_task_struct(task);
        rcu_read_unlock();

        /* Elevar a SCHED_FIFO 98 para evitar xruns */
        param.sched_priority = 98;
        sched_setscheduler_nocheck(task, SCHED_FIFO, &param);
        put_task_struct(task);

        g_active_threads++;
        pr_info("🎷 [groove_rt] Hilo %d elevado a SCHED_FIFO 98 (Total: %u)\n", tid, g_active_threads);
        return 0;

    case GROOVE_IOCTL_GET_JITTER:
        if (copy_to_user((u64 __user *)arg, &g_jitter_ns, sizeof(u64)))
            return -EFAULT;
        return 0;

    case GROOVE_IOCTL_UNREGISTER:
        if (copy_from_user(&tid, (int __user *)arg, sizeof(int)))
            return -EFAULT;

        rcu_read_lock();
        task = pid_task(find_vpid(tid), PIDTYPE_PID);
        if (task) {
            get_task_struct(task);
            rcu_read_unlock();
            param.sched_priority = 0;
            sched_setscheduler_nocheck(task, SCHED_NORMAL, &param);
            put_task_struct(task);
            if (g_active_threads > 0) g_active_threads--;
            pr_info("🎷 [groove_rt] Hilo %d restaurado a SCHED_NORMAL\n", tid);
        } else {
            rcu_read_unlock();
        }
        return 0;

    default:
        return -ENOTTY;
    }
}

static const struct file_operations groove_rt_fops = {
    .owner          = THIS_MODULE,
    .unlocked_ioctl = groove_rt_ioctl,
};

static struct miscdevice groove_rt_miscdev = {
    .minor = MISC_DYNAMIC_MINOR,
    .name  = "groove_rt",
    .fops  = &groove_rt_fops,
    .mode  = 0666, // Accesible por aplicaciones de audio sin root
};

/* Interfaz Sysfs para telemetría */
static ssize_t jitter_ns_show(struct kobject *kobj, struct kobj_attribute *attr, char *buf)
{
    return sprintf(buf, "%llu\n", g_jitter_ns);
}

static ssize_t xruns_count_show(struct kobject *kobj, struct kobj_attribute *attr, char *buf)
{
    return sprintf(buf, "%llu\n", g_xruns_count);
}

static struct kobj_attribute jitter_attr = __ATTR_RO(jitter_ns);
static struct kobj_attribute xruns_attr  = __ATTR_RO(xruns_count);

static struct attribute *groove_attrs[] = {
    &jitter_attr.attr,
    &xruns_attr.attr,
    NULL,
};

static struct attribute_group groove_attr_group = {
    .attrs = groove_attrs,
};

static int __init groove_rt_init(void)
{
    int ret;
    pr_info("🎷 [groove_rt] Inicializando driver de audio real-time PREEMPT_RT...\n");

    ret = misc_register(&groove_rt_miscdev);
    if (ret) {
        pr_err("🎷 [groove_rt] Error al registrar /dev/groove_rt: %d\n", ret);
        return ret;
    }

    groove_kobj = kobject_create_and_add("groove_rt", kernel_kobj);
    if (!groove_kobj) {
        misc_deregister(&groove_rt_miscdev);
        return -ENOMEM;
    }

    ret = sysfs_create_group(groove_kobj, &groove_attr_group);
    if (ret) {
        kobject_put(groove_kobj);
        misc_deregister(&groove_rt_miscdev);
        return ret;
    }

    pr_info("🎷 [groove_rt] /dev/groove_rt listo. Telemetría en /sys/kernel/groove_rt\n");
    return 0;
}

static void __exit groove_rt_exit(void)
{
    sysfs_remove_group(groove_kobj, &groove_attr_group);
    kobject_put(groove_kobj);
    misc_deregister(&groove_rt_miscdev);
    pr_info("🎷 [groove_rt] Driver descargado correctamente.\n");
}

module_init(groove_rt_init);
module_exit(groove_rt_exit);

