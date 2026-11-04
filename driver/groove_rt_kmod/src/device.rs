// Linux Groove OS - Character Device registration /dev/groove_rt

use crate::ioctl::*;
use crate::GrooveRtModule;

pub struct GrooveDevice {
    pub name: &'static str,
    pub mode: u16,
}

impl GrooveDevice {
    pub const fn new() -> Self {
        Self {
            name: "groove_rt",
            mode: 0o666, // Permite acceso directo a apps de audio en userspace
        }
    }

    pub fn handle_ioctl(&self, module: &mut GrooveRtModule, cmd: u32, arg: i32) -> Result<u64, i32> {
        match cmd {
            GROOVE_IOCTL_REGISTER_RT_THREAD => {
                module.register_rt_thread(arg)?;
                Ok(0)
            }
            GROOVE_IOCTL_GET_JITTER => {
                Ok(module.get_jitter_telemetry())
            }
            GROOVE_IOCTL_UNREGISTER => {
                module.unregister_rt_thread(arg)?;
                Ok(0)
            }
            _ => Err(-25), // -ENOTTY
        }
    }
}

