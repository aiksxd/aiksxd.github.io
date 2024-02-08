## **手机搭建终端环境(内网穿透开服)**
 + 这是专门为**安卓**手机提供的**开服**方法（**IOS苹果手机**需要先**越狱**然后使用**NewTerm**，虽同样都是终端命令，**但我暂无条件更新相关教程**），主要服务于**内网穿透**，或是异地组网和远程控制(安卓系统本身有软件提供异地组网和远程控制，frpc有内网穿透但是直接运行服务器端不方便，如果你不是为了开服建议使用**原生安卓应用**，除非特殊需要)如内网穿透[frpc on github](https://github.com/mainfunx/frpc_android)，[frpc on gitee](https://gitee.com/skyuning/frpc-Android)，**pc端请忽略该部分**
 + *注：本教程内所有安装过程的选择直接回车默认即可*
> + 安装termux
>> 下载地址(github如若打不开，在地址github之前加字母k或https://ghproxy.com/，即https://kgithub...或https://ghproxy.com/https://github...)：
>> + [github安卓6及以下版本](https://github.com/termux/termux-app/wiki/Termux-on-android-5-or-6)
>> + [国内云盘直链0.118](https://www.123pan.com/s/Rx6cVv-BYhxd.html)
>> *注：安卓6及其以下版本建议**不要换源**，请安装完系统后，在系统内换源*
>> + [github安卓7及以上版本](https://github.com/termux)
>> + [F-Droid的termux网页页面]()
> + Termux基础配置(最左下按钮为tab自动补全)
>> + ***换源**命令(安卓7+版本)：*
>>```bash
>> termux-change-repo
>>```
>> 直接**回车(Enter)**下一步后**空格**选择下方国内源后**一路回车即可**（安卓6及其以下不建议换源，如需则自行查找低版本换源命令）
>> + 更新包管理工具
>>```bash
>> pkg upgrade && pkg update
>> apt upgrade && apt update
>>```
>> + 获取手机内部储存
>>```bash
>> termux-setup-storage
>>```
>> 注：Termux的文件都存在手机根目录，没有root无法访问，这些只能通过termux进行读写，使用此命令后，可在home目录下生成一个通往手机主目录的软链接。
>>
> + 基本命令
>>```bash
>> cd 目录 #进入当前目录下的指定目录,其中../为上级，cd ~中~表示当前操作用户目录。
>> rm -r 目录/文件 #递归删除，参数-r为递归，没有不能删目录
>> ls -a #列出当前目录下文件，-a参数显示隐藏文件
>> l #单l命令比ls更加便捷清晰(旧版termux没有，不过安装的系统内可使用)
>> pwd #获取当前目录地址
>> mkdir 文件夹名 #在当前目录下新建文件夹（目录）
>> Ctrl + C #键盘快捷键强制中断当前程序/废弃当前键入命令
>> #右滑可创建新会话(窗口)|唤起键盘
>> ####解压工具####
>> apt install unzip #安装
>> unzip 目标文件名.zip -d 释放目标目录（如无自动创建）
>>```

### 安装Linux系统

也可以不装，不过有些应用依赖无法启用(如dotnet)，可能回导致应用无法启动，这时就需要安装系统(proot/chroot)，否则可以直接使用启动命令

#### Android5以上通用方法（简单，内存充足时推荐）
>+为什么建议该方法：
>>+ kali nethunter方法安装termux的linux系统，使用的包都可以支持最新版，不过这也导致了一些不兼容问题
>>+ 并且该方法操作简单，无需多余步骤
>>+ 缺点在于镜像只有完整版且占用内存较大（约11G），如果内存不足可用下面其他方法占用约1G+
>+ Kali版本
>> + 官方版本（需网络环境，没有则用镜像版）
>>```bash
>> pkg install git wget
>> wget -O install-nethunter-termux https://offs.ec/2MceZWr #–no-check-certificate
>> chmod +x install-nethunter-termux
>> ./install-nethunter-termux
>>```
>> + 使用wget下载时使用-c参数可防止意外中断，对于github相关地址可以在地址前加入"https://ghproxy.com/"代理加速
>> + 国内镜像（无需代理）
>>```bash
>> git clone https://gitee.com/zhang-955/clone.git && cd clone && cd AutoInstallKali && chmod +x kalinethunter finaltouchup.sh
>> ./kalinethunter
>>```
>> + 国外github镜像(完整版同上)
>>```bash
>> curl -LO https://raw.githubusercontent.com/Hax4us/Nethunter-In-Termux/master/kalinethunter
>> chmod +x kalinethunter
>> ./kalinethunter
>>```
>>如果下载过程中断需要手动rm（删除）损坏的包，然后重新执行安装脚本("./开头的是执行脚本命令")
>>低版本在通过该系统在安装部分应用时，最新版本可能会出故障
>>+ 获取linux系统权限
>>```bash
>> su
>> toor
>>```
>>获取root权限：toor是默认密码，或者kali（Linux的一个用户，Android也有root用户，但不是同一个）
>>kali内置的工具不做介绍，并且有些需要root才可正常使用

#### Android5-6安装系统方法
>+ kali见上
>+ 安装其他版本(如果一个失败可换其他的)：
>> 1.脚本一键安装(国光)
>>```bash
>> pkg install proot git python -y
>> git clone https://github.com/sqlsec/termux-install-linux
>> cd termux-install-linux
>> python termux-linux-install.py
>>```
>>之后输入数字选择对应操作，安装完后使用下面命令启动
>> ```bash
>> #Ubuntu换成自己安装的系统
>> cd ~/Termux-Linux/Ubuntu #文件所在目录
>> ./start-ubuntu.sh
>>```
> 2.通过atlio安装linux系统
>> + 精简版本（没内存推荐）
>>+ 直链需魔法，建议加代理前缀，方法见上
>>+ 安装**运行依赖**
>>```bash
>> pkg install python curl proot
>>```
>>> + CN中文版
>>>```bash
>>> curl -o $PREFIX/bin/atilo https://raw.githubusercontent.com/YadominJinta/atilo/master/CN/atilo_cn && chmod +x $PREFIX/bin/atilo
>>>```
>>> + EN英文版(多几个镜像)
>>>```bash
>>> curl -o $PREFIX/bin/atilo https://raw.githubusercontent.com/YadominJinta/atilo/master/atilo && chmod +x $PREFIX/bin/atilo
>>>```
>>>如果提示缺少插件则输入(先更新一次pip，否则不兼容包存在会导致更新失败)
>>>```bash
>>> pip install --upgrade pip -i http://pypi.douban.com/simple --trusted-host pypi.douban.com && pip install 'requests' tqdm 'prettytable' bs4  -i http://pypi.douban.com/simple --trusted-host pypi.douban.com
>>>```
>>>安装&启动命令：
>>```bash
>> atilo images #列出可用镜像
>> atilo pull ubuntu #下载&安装ubuntu镜像(自选)
>> atilo run ubuntu #ubuntu换成安装自己的系统
>>```
>>+ 如果启动过程中提示需要代理而且你又没有代理，可以尝试修改DNS或者换个时间段再试试，一般国内傍晚就连不上了
>> + Github方法（可能需要网络环境）:
>>>```bash
>>> pkg in git
>>> git clone https://github.com/jerrychen110/atilo
>>> chmod +x ~/atilo
>>> ./atilo ubuntu #启动命令
>>>```
>>>ubuntu换成自己想要的系统，不带参数可以查看命令帮助；启动报错proot可以试试其他方法或者更换网络环境再删除重下系统（一般下载系统镜像不会太快，太快就可能是网络故障）
>
>安装好系统后下面参考linux操作方法开服，不过termux要下载arm64的包，其他设备的linux系统架构自行查看并下载使用对应包
>
>如果apt seach也找不到对应的包可能是你没更新源

#### Android7&+安装系统方法
>+ 脚本安装（功能丰富，推荐）
>>```bash
>> bash -c "$(curl -Lv gitee.com/mo2/linux/raw/master/debian.sh)"
>>```
>>不重启termux(长按more->kill 所有会话->重新启动termux)使用debian-i进入管理面板或startvnc命令进入系统
>>
>>重启后输入debian即可进入系统
>+ 手动安装（占用少，网络环境要求较高，没魔法国内够呛）
>>```bash
>> pkg install proot-distro
>> proot-distro install ubuntu
>> proot-distro login ubuntu #进入系统命令
>>```
>>ubuntu可换成自己喜欢的系统(proot-distro list查看可用镜像)，建议先proot-distro list查看支持系统，有些系统不支持部分手机架构，请阅读其简介下载合适的

#### termux系统常见问题
> + 旧版termux安装的系统没有内置的互通存储目录，通过创建软链接连接termux储存目录时mv 文件 ../后回到../没有文件，可以去系统的/data/data/com.termux 目录查看，建议直接mv至~(用户目录)
> + **注意：本文往后以Debian系系统(Debian、Ubuntu、Kali等)为例，其他系统包管理器命令自行查找（如ArchLinux的pacman）**
> + apt添加储存库：
>>```bash
>> apt-get install software-properties-common
>> add-apt-repository ppa:openjdk-r/ppa #jdk8示例
>>```