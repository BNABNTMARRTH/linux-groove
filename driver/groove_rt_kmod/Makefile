# Makefile para Linux Groove RT Kernel Module (groove_rt_kmod)
# Compatible con Linux 6.12 LTS PREEMPT_RT

KDIR ?= /lib/modules/$(shell uname -r)/build
PWD  := $(shell pwd)

obj-m += groove_rt.o
groove_rt-objs := src/groove_rt_core.o

all:
	$(MAKE) -C $(KDIR) M=$(PWD) modules

clean:
	$(MAKE) -C $(KDIR) M=$(PWD) clean

