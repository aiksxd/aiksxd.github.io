进入termux的linux系统后
### 安装rust
> ```bash
> apt install curl
> curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
> #配置环境变量(在控制台输只保存当前会话一次)
> vi ~/.profile
> export PATH=$HOME/.cargo/bin:$PATH
> #换源
> vi ~/.cargo/config
> [source.crates-io]
> registry = "https://github.com/rust-lang/crates.io-index"
> replace-with = 'ustc'
> [source.ustc]
> registry = "git://mirrors.ustc.edu.cn/crates.io-index"
> ```

### error: linker `cc` not found
>```bash
> apt install build-essential
>```

### failed to run custom build command for `alsa-sys v0.3.1`
>```bash
> apt install pkg-config git
> git clone https://ghproxy.com/https://github.com/diwic/alsa-sys.git
> cd alsa-sys && regenerate_bindings.sh
> #或
> apt install libasound2-dev
>```

### failed to run custom build command for libudev-sys v0.1.4
>```bash
> apt install libudev-dev
> 
>```
？：cargo tree | grep udev

### 总结
>```bash
> apt install curl pkg-config libudev-dev build-essential libasound2-dev
> curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
> cd alsa-sys && regenerate_bindings.sh
>```

### 编译windows平台exe
>```
> rustup target add x86_64-pc-windows-gnu
> apt install mingw-w64
> cargo new win #创建一个新项目[可选]
> #cd 项目目录或用户目录再写配置文件
> [target.x86_64-pc-windows-gnu]
> linker = "x86_64-w64-mingw32-gcc"
> ar = "x86_64-w64-mingw32-gcc-ar"
> #编译：
> cargo build --release --target x86_64-pc-windows-gnu


### 拓展：安装桌面环境(自选，仅列示例)
>```
> apt install xfce4 tigervnc-common tigervnc-standalone-server dbus-x11 #最后一个报错时选装
> vncserver
> #输入两遍不少于6位密码
> vncserver -kill :1 #关闭1号vnc服务
>```