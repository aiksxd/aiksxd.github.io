---
title: PCPE双端开服建站联机教程
date: 2023-06-29 21:59:38
tags: 
- study
author: AX
---
## **前言**

+ 建议配合视频教程和宽屏版页面右侧目录一起使用，这是一篇面向新萌的教程，提供我已知的最优解，但**不一定是最好**；完成一个服务器需要**一台满足配置要求(因目标而定)的设备**，能够**正常运行的**对应程序的**服务器端**（程序自带或给常见链接自行下载），一个能够使用且支持对应协议的内网穿透工具或者联机工具(后面会列出，自选即可)和一颗能够坚持学下去的恒心（学会了还是蛮简单的）
+ 信息交换主要包含三大方式（网站大都采用第一种，游戏通常是第二、三种局域网）：
+ **！PS：本教程是部署第一种实现方法或将第二、三种实现方法转为第一种并部署以此打破空间限制！**
  + ***中间服务器实现**（服务器托管或内网穿透等）：通过内网连接公网，处于公网中的服务器中转分发主机的数据实现联机。**优点**：可以打破空间限制，将处于世界各地的人汇合组建一个小网络，并且通常服务器有更丰富的配置文件提供，启动更快，配置更灵活方便；**缺点**：学习成本相对较高，较长的信息传输线路导致延迟相对较高。*
  + ***局域网下实现**：通过设备连接路由器，由路由器中转分发主机的数据实现一个内网中设备之间的信息交换。**优点**：速度快，简单没有学习压力；**缺点**：受到空间限制，必须在同一个网络下才能进行信息交换*
  + ***通过预设本地的多人操作位置实现**（多见于游戏）：通过程序预先设置好的位置，允许多个人共用一台设备进行不同位置间的信息共享。**优点**：几乎没有信息传输间的延迟，更加稳定，几乎为零的学习成本，且大大节约了应用的开发成本，在代码上更容易实现；**缺点**：严格的空间限制，所有人必须共用一台设备，而且位置受硬件规格限制，需要外接设备（如手柄）。*

## 

## **Android搭建终端环境(内网穿透开服)**
 + 这是专门为安卓手机提供的**开服**方法，主要服务于**内网穿透**，或是异地组网和远程控制(安卓系统本身有软件提供异地组网和远程控制，frpc有内网穿透但是直接运行服务器端不方便，如果你不是为了开服建议使用**原生安卓应用**，除非特殊需要)**pc端请忽略该部分**。
> + 安装termux
>>下载地址(github如若打不开，在地址github之前加字母k，即https://kgithub...)：
>> + [github安卓6及以下版本](https://github.com/termux/termux-app/wiki/Termux-on-android-5-or-6)
>>*注：安卓6及其以下版本建议**不要换源***
>> + [github安卓7及以上版本](https://github.com/termux)
>> + [F-Droid的termux网页页面]()
> + Termux基础配置(最左下按钮为tab自动补全)
>> + ***换源**命令(安卓7+版本)：*
>>```bash
>> termux-change-repo
>>```
>>直接下一步后选择下方国内源（安卓6及其以下不建议换源，如需则自行查找低版本换源命令）
>> + 更新包管理工具
>>```bash
>> pkg upgrade && pkg update
>> apt upgrade && apt update
>>```
>> + 获取手机内部储存
>>```bash
>> termux-setup-storage
>>```
>>注：Termux的文件都存在手机根目录，没有root无法访问，这些只能通过termux进行读写，使用此命令后，可在home目录下生成一个通往手机主目录的软链接。
> + 基本命令
>>```bash
>> cd 目录 #进入当前目录下的指定目录,其中../为上级
>> rm -r 目录/文件 #递归删除，参数-r为递归，没有不能删目录
>> ls -a #列出当前目录下文件，-a参数显示隐藏文件
>>```
### 安装Linux系统
也可以不装，不过如果依赖较高的应用可能无法启动，或者有些软件运行环境无法安装，这时就需要安装系统，否则可以直接使用启动命令
### Android5以上通用方法（简单推荐）
>+ Kali版本
>> + 官方版本（需网络环境，没有用镜像版）
>>```bash
>> pkg install wget
>> wget -O install-nethunter-termux https://offs.ec/2MceZWr
>> chmod +x install-nethunter-termux
>> ./install-nethunter-termux
>>```
>> + 国内镜像
>>```bash
>> git clone https://gitee.com/zhang-955/clone.git && cd clone && cd AutoInstallKali && chmod +x kalinethunter finaltouchup.sh
>> ./kalinethunter
>>```
>>如果下载过程中断需要手动rm（删除）损坏的包，然后重新执行安装脚本("./开头的是执行脚本命令")
>>低版本在通过该系统在安装部分应用时，强制安装新版可能会出故障
### Android5-6安装系统方法
>>
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
>> + 其他版本（可能需网络环境）
>>安装**运行依赖**
>>```bash
>> pkg install python curl
>>```
>>> + CN中文版
>>>```bash
>>> curl -o $PREFIX/bin/atilo https://raw.githubusercontent.com/YadominJinta/atilo/master/CN/atilo_cn && chmod +x $PREFIX/bin/atilo
>>>```
>>> + EN英文版(多几个镜像)
>>>```bash
>>> curl -o $PREFIX/bin/atilo https://raw.githubusercontent.com/YadominJinta/atilo/master/atilo && chmod +x $PREFIX/bin/atilo
>>>```
>>>如果提示缺少插件则输入
>>>```bash
>>> pip install --upgrade pip
>>> pip install # + 缺少组件名
>>>```
>>>启动命令：
>>```bash
>> atilo run ubuntu #ubuntu换成安装自己的系统
>>```
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




## **类型一**：提供**IP直连**的程序（通过中间服务器实现远程联机）

**判断方法**：允许通过输入**字符串类型的值**来连接服务器（如同**浏览器的地址栏**），该类型程序一般允许用户自己创建连接服务器或者直接连接，典型的如：我的世界(Minecraft)、泰拉瑞亚(Terraria)、星露谷物语(Stardew Valley)、铁锈战争(Rusted Warfare)、生存战争(Survivalcraft)联机版等

---

1. ### **1.部署本地服务端(必需-准备)**
>
>**启动**对应的**服务端程序**（可能需要填入部分配置信息）并等待部署完成即可，有的软件不自带服务端的启动程序，或者其不能够满足服务器的需求，因此需要下载对应的服务端：
>
>+ #### 我的世界Minecraft服务端
>> + [Minecraft官方服务器端（纯原版）](https://www.minecraft.net/zh-hans/download/server)
>> + [Paper服务器端（插件+优化）](https://papermc.io/downloads)
>> + [spigot服务器端（插件）](https://hub.spigotmc.org/jenkins/job/BuildTools/)
>> + [Forge安装服务器（mod）](https://files.minecraftforge.net/net/minecraftforge/forge/)（下载时若不能跳过广告，一可在下载按钮右键复制链接，单独粘贴链接中URL部分，或者到广告界面查看网页源代码，找到skip附近的链接地址并单独搜索即可）
>> + [Forge + Sponge（插件+mod - SpongeMod支持版本少）](https://spongepowered.org/downloads/)
>> + **．．．．．．**（数据来源于2023.1，**可能不准确**如有需要在下面留言更新）
> + 关于开服：
>> + [Java各大平台版本地址](https://www.oracle.com/java/technologies/downloads/)
>> + OpenJDK on Linux(此文往后以debian系系统为例，其他系统安装命令自行查找)：
>>>```bash
>>> sudo apt install openjdk-17
>>>```
>>选择合适服务端需求版本的java后下载服务器端
>>
>>如果openjdk不能用去官网下对应版本的javajdk/jre，无系统archarm64/arm64，有则按照系统下载对应包
>>
>>Linux通过终端命令行运行；Windows创建**bat文件**运行服务端
>>```bash
>>    java -Xms1024M -Xms2048M -jar 服务器端名称.jar
>>```
>> + 其中**Xms**为**最小**内存，**Xmx**为**最大**内存，单位可以为M也可以为G，也可以默认自适应。服务端名称是下载使用哪个服务端就填哪个服务端的名称，**forge**要**先双击安装**程序(需java运行环境)运行并安装服务器端，启动带GUI的服务端可以在后面加 **nogui**来取消运行时启动独立窗口，java是使用默认环境变量的java，当低版本服务器运行时可能不兼容新版，可以在计算机中安装多个版本的java并使用**绝对路径**来运行服务器端如下（Linux用./同理）：
>>```bash
>> "C:\Program Files\Java\jre1.8.0_351\bin\java" -Xms1G -Xmx2G -jar paperc.jar nogui
>>```
>> + 第一次运行需要先改**eula.txt**文件中eula=后面的false改为**true**即同意上述协议，修改完成后保存再次启动(Linux进入vim默认命令模式后按i进入插入模式开始写入，按ESC切换为命令模式，输入:wq保存并退出，:q!不保存强制退出)
>>```bash
>> sudo apt install vim #安装编辑器，已安装跳过
>> vi eula.txt
>>```
>>之后会下载所需文件，耐心等待，若下载出现错误可以开**网络工具**或者在**log报错文件**中找到报错的**文件地址手动下载**，手动下载再失败可以**复制地址到网盘的P2P下载器**下载。
>> + **Stop**停止并保存服务器，注该开服方法不**适用于**国内版MC，且**国内版**MC与**国际版**并**不能互通**。
>>
>+ #### 泰拉瑞亚Terraria
>>1.4以下版本win用户可不安装新版dotnet，建议先启动试试不能启动再安装运行环境
>>+ [通过安装dotnet启动Win&Linux：dotnet官网链接](https://dotnet.microsoft.com/zh-cn/download/)
>>+Linux安装dotnet命令(termux旧版使用mono)：
>>>```bash
>>> sudo apt install dotnet-sdk-6
>>>```
>>+ Linux或使用脚本安装
>>>```bash
>>> wget https://dot.net/v1/dotnet-install.sh -O dotnet-install.sh
>>> sudo chmod +x ./dotnet-install.sh
>>> ./dotnet-install.sh  --channel 6.0 #可修改版本，推荐6.0
>>> dotnet TerrariaServer.exe #运行服务器
>>>```
>>+ Linux或其他平台通过mono启动
>>>[mono官网](https://www.mono-project.com/download/)
>>>```bash
>>> apt install mono-complete
>>>```
>>>*TerariaServer.exe服务端游戏本体目录下自带，linux也是先下载游戏本体，进入游戏目录运行服务端文件*
>>>
>>>termux旧版4.6.2的mono最大支持1.4.3.6及以下版本的tshock
>>+ Linux原版服务器：
>>>```bash
>>> #64位操作系统先执行以下命令
>>> sudo add-apt-repository multiverse
>>> sudo dpkg --add-architecture i386
>>> sudo apt update
>>> sudo apt install lib32gcc1
>>>#下面安装steamcmd，steam也可以，在游戏目录启动游戏即可
>>> sudo apt install steamcmd
>>> ./usr/games/steamcmd #sudo bash ./...
>>> login + 用户名 #登录帐号
>>> app_update 105600 #安装terraria
>>> cd ~/Steam/steamapps/common/Terraria
>>> ./TerrariaServer.bin.x86_64 #运行服务端
>>>```
>>>游戏存档等路径：~/.local/share/Terraria/
>>+ [TShock（相比原版可以装插件）](https://github.com/Pryaxis/TShock/releases)
>>>去官网复制下载链接，然后通过wget下载tshock的zip文件，之后使用unzip工具解压
>>>```
>>> wget #目标地址
>>> sudo apt install unzip
>>> unzip TShock*.zip -d tshock #unzip 目标文件名.zip -d 释放目标目录
>>> cd tshock
>>> tar -xf TShock*.tar #解压目标文件
>>> mono TerrariaServer.exe #启动命令
>>>```
>>>开服后看情况保存超级管理员代码，只有第一次显示，没记下来可以删除setup.lock然后重启或者见下
>>>
>>>控制台移动组至admin组获得管理权限（常用），或是游戏内输入/auth [authcode]获取超管权限，也可通过控制台移动用户组至superadmin，但是**不建议**用超管游玩，**超级管理的角色数据不会被保存**
>>>+ config配置文件在tshock目录下，包含出生点保护之类，可以进行查阅&修改，之后重启更新服务器
>>+ [TML（Steam商店地址)(可装Mod）](https://store.steampowered.com/app/1281930/tModLoader/)
>>>```bash
>>> #还是terraria的目录下
>>> #steam更新命令：app_update <应用ID> [-beta <测试名称>] [-betapassword <密码>] [validate] 版本号自行查看，validate可以不成功时再加
>>> app_update 1281930 +tml版本号 validate
>>> ./start-tModLoaderServer.sh
>>>```
>>>*如果开始下载dotnet之后失败，则先自己安装dotnet，见上*
>>+ **exit**停止并保存服务器，该开服方法不**适用于**国内版TR，且**国内版**TR与**国际版**并**不能互通**。
>>
>+ #### 生存战争Survivalcraft联机版
>>**作者团队**及其**教程地址**：[瓦西里沃尔特 bilibili](https://space.bilibili.com/292546719?spm_id_from=333.337.search-card.all.click)
>>
>+ #### Vue网站基本命令
>
>需先安装**Node.js**
>>
>>```bash
> npm install vue-cli -g 安装vue-cli
> vue init webpack my-project  初始化项目
> npm install  安装项目依赖
> npm run build 生成上线目录部署
> nmp run dev 本地测试服务器
>>```
>> **Ctrl+C**关闭服务器
>
>+ #### Hexo网站基本命令
>
>需先安装**Node.js**和**Git**
>>```bash
> npm install hexo-cli -g 安装hexo-cli
> hexo init 文件夹名 cd进去后npm install安装npm即完成
> hexo new "文章名" 新文章
> hexo new page "页面名" 生成新页面
> hexo s 本地预览
> hexo g 上传暂存区
> hexo d 上传到Github
> hexo server -p 端口号 修改本地部署的端口
> >```
> > **Ctrl+C**关闭服务器
>

2. ### **2.监听程序端口(可选-准备)**
>
> + #### **Windows操作系统**
>
> ***先启动游戏服务器或创建局域网房间后才能看到其端口和协议类型，下面列出常见软件的协议类型及其端口***
>
> + **网站默认http/https**(vue：**8080**；PHPstudy：**80**；Hexo：**4000**；......)
> + **泰拉瑞亚Terraria自带**或**TShock**：TCP**7777**
> + **我的世界Minecraft**(**Java**：TCP**25565**；内置服务端**随机**；**BE基岩版**：UDP**19132**)
> + **铁锈战争Rusted Warfare**：TCP**5132**
> + **生存战争Survivalcraft联机版**：UDP**28887**
> + **星露谷物语Stardew Valley**：UDP**24642**
> + **像素工厂Mindustry**：**TCP+UDP+相同对外端口**
> + ......（有的游戏服务器需要**两条隧道**才能正常运行，例如：**未转变者Unturned**(**quit**退出并保存服务器)、MC互通服等）
>
> ***如果出现报错显示端口被占用相关问题，可以修改配置文件改变游戏默认的端口号，但有的程序不提供配置文件修改端口号，那也可以在下面操作找到占用该端口号的程序并将它结束掉；linux系统结束程序在下面***
>
> ***一般游戏端口及其协议类型可以搜到，或者界面会告诉你，如果没有再进行下面的步骤***
>
> ---
>
> ![图片加载失败了，不过不影响](https://s1.vika.cn/space/2023/03/23/3b38183a828441e99f50e4c1ddbb0d90)
> >
> > 1. **启动资源监视器**
> > >
> > > + 方法一：直接运行，按下**Win+R**，输入以下内容
> > > `C:\Windows\System32\perfmon.exe`
> > > + 方法二：**右键**windows菜单栏 ——> 选择**任务管理器** ——> 选择**性能**一栏 ——> 下面单击“**打开资源监视器**”
> > >
> > 2. **监听程序端口**
> > 
> > ![图片加载失败了，看视频吧，或者复制图片地址到浏览器地址栏里手动浏览](https://s1.vika.cn/space/2023/03/23/647c28cf8e7e4ab5b135a5c7ab627a8e)
> >
> > > 在菜单栏**网络**下的页面划到**监听端口**一栏
> > > 我们需要的是目标游戏的**传输协议类型**和它的**端口号**
> > > 这里以**TShock**为例，它的**默认端口号**为**7777**，**协议类型**是**TCP**
> > > 一般**游戏**的协议为**TCP**或**UDP**，要根据协议类型选择**合适的映射（内网穿透）**工具，因为有的映射工具不支持UDP，还有的不支持TCP、http。
> > >
> + #### **Linux操作系统**
>
> 打开**终端**，输入
> `netstat -a`
> 参数含义：-a 显示所有；-n 以ip形式显示当前建立的有效连接和端口；-u 显示UDP协议；-t 显示TCP协议；-p 显示对应PID与程序名
---

3. ### **3.内网穿透方式(通用-实现)**
>**前言：**这里主要介绍基于**第三方免费平台**的内网穿透，***倘若**自己部署内网穿透，需要一份有固定公网ip的服务器和一个已经备案的域名，这里不讲，想要部署的可以自己搜索相关教程，还是挺全面的。*
>
>![内网穿透流程图，可能不正确](https://s1.vika.cn/space/2023/03/23/ac6857a399f24701aae0a29b463a740f)
>
>**我在这里列出常见的平台**：（以下为**普通用户配置:不购买套餐**）
>
>+ #### 常见平台（1M(bps)=128KB=1/8MB）
>> + [**花生壳**](https://hsk.oray.com/)：极低的学习成本；**实名1M/s**每月1G且**无Http**和**UDP**，固定域名
>> + [**cpolar**](https://www.cpolar.com/)：学习成本低；无需实名；无限流量；**动态域名**且**无**UDP；速度较低；**http**协议提供**免费动态域名**
>> + [**飞鸽**](https://www.fgnwct.com/)：学习成本低；**0.5M/s**，签到给流量；**http**协议提供**免费域名**；**免费两条**隧道但**http只能一条**
>> + [**MirrorEdge Frp镜缘(莱云)映射**](https://www.mefrp.com/)：学习成本一般；**1元实名刷脸**；速度限制取决于所选节点，隧道固定域名
>> + [**OpenFrp 内网穿透**](https://www.openfrp.net)：学习成本低(带GUI启动器和樱花相似)免费，签到领流量；**部分节点**无需实名；速度**限制**12M/s(速度取决于所选节点与访客距离)；固定域名；**http**协议需要**绑定自己的域名**
>> + [**NATAPP**](https://natapp.cn/)：学习成本一般；**动态域名**；**实名**；1Mbps；**http**协议提供**免费域名**
>> + [**网云穿**](https://xiaomy.net)：学习成本低；**实名**；每**月1G**；前7天3M/s会员，后面**锁TCP**且**1M/s**，固定域名
>> + [**ngrok**](https://ngrok.com/)：学习成本一般；无需实名；只给**一条免费隧道**，离得近的节点延迟较低；http会**自动换https**协议（相当于**不支持http**）
>> + [Nat123](http://www.nat123.com/)：学习成本一般；**无需实名**但**支付实名**；**新**账号只给**5个N币**；**<1M/s**；支持**自定二级域名**；仅支持**http协议**
>> + [闪库](http://www.ipyingshe.com/)：1M；**仅支持Http**，**随机固定**域名；未来可能实名
>> **（以下是其他我没用过的内网穿透）**
>> + [**樱花**](https://www.natfrp.com)：学习成本低；**1毛付费刷脸实名必须18+**；新5/老10M/s速度限制，固定域名，进不去网上有备用路线
>> + [**frp**](https://github.com/fatedier/frp)：有较高的学习成本，是自己部署内网穿透的开源工具，但需要**有条件**，可扩展性强，不少内网穿透就是它改的(例如莱云、Locyan、凿洞)
>> + [Sunny-Ngrok](https://www.ngrok.cc/):1块付费刷脸实名；*钉钉内网穿透*:早已停止服务；[蜻蜓](https://flynat.51miaole.com/)、[网络通](http://www.youtusoft.com/)无法注册；[LoCyan Frp](https://www.locyanfrp.cn/):之前节点不可用，最近Q群审核使用；[凿洞Free Frp](https://frp.wiki/):我不会用，它老报错；*U-anywhere万由云*；*QuickConnect*；*哲西云*:加入花生壳了；*nat123*；*Tinc*
>> + **．．．．．．**（数据来源于2023.1，**可能不准确**如有需要在下面留言更新）
>
>+ #### **内网穿透操作流程**
>
>+ **网页+平台类型**
>
>> 1. 注册账号填写并完善相关信息(如绑定验证账号、实名等，没有则跳过)，然后后再进入**控制面板**
>> 2. 创建**隧道**（有的在本地创建隧道，形式不一，但需要的信息基本一样），填入相关信息：隧道名、**协议类型**、**本地地址(127.0.0.1或局域网地址)**以及**本地端口**（上面查的）。（有的支持自定义子域名或绑定自己的域名，也有的支持一定限度内自定义对外端口号，也有的允许你自选节点，可以根据配置需要选择）
>> 3. 云端部署好后开始**部署本地**，先**下载**对应平台的**服务端程序**，**有的**需要将其**与个人账号绑定**，一般是通过个人账户的Token（或口令、密钥等）进行绑定；
>> 4. 复制云端**隧道创建后给的Token**与本地映射服务端进行**绑定**，或者给予窗口选择自己的隧道并**启动**，启动后给出的**地址**（一般为：地址:端口号；像http类型只有地址）就是他人访问的所用到的信息了。
>
>+ **应用平台类型**（相对简单）
>
>> 1. **注册**账号填写并完善相关信息
>> 2. 创建隧道填入：隧道名、**协议类型**、**本地地址**、**本地端口**、[自选节点或宽带套餐]等信息
>> 3. **启动**隧道，即可获取我们所需的地址（一般为：**地址:端口号**；像http类型只有地址）
>
>+ **访客使用地址教程**
>
>>**网页**：访客将给定的地址直接**粘贴**到浏览器的**地址栏**访问；**主机**可以用**localhost**或**127.0.0.1**访问
>> **游戏**：访客选择**多人游戏**并选择**加入**相关，**填入给定的地址**加入即可；**主机**可以用**localhost**或**127.0.0.1**访问。
>>+ 只给一个填写IP地址的输入框，则填写 **地址:端口号** 的形式（如：MCJava版）
>>+ 同时给出IP地址和端口号地址的，各填入各所需的地址和端口，**英文冒号直接省去**（如：Terraria、MCBE版）
>
>+ #### **图文示例**
>
>> 此处以Terraria的**TShock服务端**和**Cpolar和飞鸽内网穿透**为例（**图示**+**简短文字描述**）：
>> + **Cpolar 快捷方法**：
>>   > 这是Cpolar较为便捷的操作方式
>>   > ![Cpolar方法一](https://s1.vika.cn/space/2023/03/23/42baaf7fd3b24c00a46a3f971b0afa8c)
>> + **通用方法-以Cpolar和飞鸽为例**：
>>   > ①②和Cpolar快捷方法的一样，创建后隧道管理界面会有相应隧道的访问地址
>>   > ![Cpolar方法二](https://s1.vika.cn/space/2023/03/23/4c645eeeb79f44488245e5cc6ff93ae9)
>>   > 启动后访问地址在隧道管理界面可见
>>   > ![飞鸽方法](https://s1.vika.cn/space/2023/03/23/fada6872953d452b8afe1fac10908a8d) 
1. ### **4.IPv6公网方式(条件-实现)**
>
> + **前言：理想状态下**，IPv6延迟低，操作简单，免费且无需账号、认证等，不过前提是你的**网络运营商向你提供IPv6服务**，且你的电脑**能够正常识别和使用**，详细判断是否可用和配置教程可见相关教程[【mc开服】教你白嫖运营商公网ipv6跟好兄弟联机】](https://www.bilibili.com/video/BV1Lb4y1o7SF)
> + 主机启动服务器后，访问端以 **[对方的IPv6地址]:端口号** 的格式直接连接即可
> + 注：这里没有条件不做演示，可移步到上方链接观看推荐视频学习。

## **类型二：提供局域网的程序**（通过异地组网实现远程联机）

**判断方法**：提供IP直连的基本都支持局域网，因为你可以用路**由器分配的地址**和**对应程序的端口**实现**内网中不同设备**的**信息交换**，只是可能有些程序不提供现成的独立页面和自动搜索；也有一些程序仅支持使用局域网联机不开放IP直连，此类游戏一般**有多人游戏的入口**但既**没有本地预设的P1234玩家位置**，也没有IP直连的输入框，可能能够**自动搜索**网络下的房间。

1. ### **1.部署本地服务端(必需-准备)**
>
>**启动**对应的**服务端程序**（可能需要填入部分配置信息）并等待部署完成即可，有的软件不自带服务端的启动程序，或者其不能够满足服务器的需求，因此需要下载对应的服务端：
>
>+ #### 我的世界Minecraft
>>
>> + [Minecraft官方服务器端（纯原版）](https://www.minecraft.net/zh-hans/download/server)
>> + [Paper服务器端（插件+优化）](https://papermc.io/downloads)
>> + [spigot服务器端（插件）](https://hub.spigotmc.org/jenkins/job/BuildTools/)
>> + [Forge安装服务器（mod）](https://files.minecraftforge.net/net/minecraftforge/forge/)（下载时若不能跳过广告，一可在下载按钮右键复制链接，单独粘贴链接中URL部分，或者到广告界面查看网页源代码，找到skip附近的链接地址并单独搜索即可）
>> + [Forge + Sponge（插件+mod - SpongeMod支持版本少）](https://spongepowered.org/downloads/)
>> + **．．．．．．**（数据来源于2023.1，**可能不准确**如有需要在下面留言更新）
>> + 关于开服：创建**bat文件**运行服务器端
>>```bash
>>    java -Xms1024M -Xms2048M -jar 服务器端名称.jar
>>```
>> + 其中**Xms**为**最小**内存，**Xmx**为**最大**内存，单位可以为M也可以为G。服务端名称是下载使用哪个服务端就填哪个服务端的名称，**forge**要**先双击安装**程序(需java运行环境)运行并安装服务器端，启动带GUI的服务端可以在后面加 **nogui**来取消运行时启动独立窗口，java是使用默认环境变量的java，当低版本服务器运行时可能不兼容新版，可以在计算机中安装多个版本的java并使用**绝对路径**来运行服务器端如下：
>> ```bash
>> "C:\Program Files\Java\jre1.8.0_351\bin\java" -Xms1G -Xmx2G -jar paperc.jar nogui
>> ```
>> + 第一次运行需要先改**eula.txt**文件中eula=后面的false改为**true**即同意上述协议，修改完成后保存再次启动，之后会下载所需文件，耐心等待，若下载出现错误可以开**网络工具**或者在**log报错文件**中找到报错的**文件地址手动下载**，手动下载再失败可以**复制地址到网盘的P2P下载器**下载。
>> + **Stop**停止并保存服务器，该开服方法不**适用于**国内版MC，且**国内版**MC与**国际版**并**不能互通**。
>>
>+ #### 泰拉瑞亚Terraria
>>+ [TShock（相比原版可以装插件）](https://github.com/Pryaxis/TShock/releases)
>>+ [TML（Steam商店地址)(Mod）](https://store.steampowered.com/app/1281930/tModLoader/)
>>+ **exit**停止并保存服务器，该开服方法不**适用于**国内版TR，且**国内版**TR与**国际版**并**不能互通**。
>>
>+ #### 生存战争Survivalcraft联机版
>>**作者团队**及其**教程地址**：[瓦西里沃尔特 bilibili](https://space.bilibili.com/292546719?spm_id_from=333.337.search-card.all.click)
>>
2. ### **2.异地组网方式(通用-实现)**
>**前言：**异地组网相较于其他方式依赖于**软件的自动搜索**，只是在理论上简单，实际操作更可能遇到问题，此时最好查询**官方文档**，这里我提出以下**两**点建议：
>
>1. 组网成功后可以在**命令提示符**中**ping**软件给出的**虚拟网内其他用户的地址**，以检查是否能够连通，若不能ping通大概率是不成功的
>2. 若**能ping通**但软件自动搜索**不能搜到**，则**检查防火墙**的相关配置，若还是不行可以在对应的**社区咨询**
>+ **中转服务器类型异地组网**
>![异地组网流程图，但不一定正确](https://s1.vika.cn/space/2023/03/23/52c37ee84e2a41149485140fe87103f1)
>+ **P2P类型异地组网**
>![异地组网流程图，但不一定正确](https://s1.vika.cn/space/2023/03/23/2577e99ea1bb49ce88c3e961514916d6)
>**我在这里列出常见的平台**：（以下为**普通用户配置:不购买套餐**)
>
>+ #### 常见平台
>> + [**蒲公英**](https://pgy.oray.com/download/)：学习成本低；免费，很简单，只要**登录同一个账号**即可；可以付费升级套餐
>> + ***Hiper***(重名太多找不到链接)：**一个**注册的**账号付费后**可以邀请其他人加入使用；签到送时长；学习成本低；宽带较好
>> + [**EasyN2N**](https://bugxia.com/357.html)：学习成本较低；**只能Windows间使用**，会**自动安装**一个**虚拟网卡**；加入同一个小组即可
>> + **[Radmin LAN](https://www.radmin-lan.cn/)**：学习成本低；**只能Windows间使用**，会**自动安装**一个**虚拟网卡**；加入同一个房间即可
>> + **[UDPPLAN(博客)](https://www.7iot.net/)**：会**选择自动安装**一个**虚拟网卡**；简单免费；无需账号
>> + **[TeamViewer](https://www.teamviewer.cn/cn/)**(**安装**要选**VPN)**：学习成本低；简单易用；但**需要注册账号**
>> + **[ZeroTier](https://www.zerotier.com/)**：有一定学习成本；会**自动安装**一个**虚拟网卡**；管理能力强；但**对网络要求较高**
>> + **．．．．．．**（数据来源于2023.1，**可能不准确**如有需要在下面留言更新）
>
>+ #### **异地组网操作流程**
>> 0.注册账号[可能没有这一步]
>> 1.**创建**一个**网络**，将**网络的ID和验证密钥**或者**是网络名称和密钥**给访客
>> 2.访客通过给定的密钥加入该网络，即可实现异地组网
>
>+ #### **图文示例**
>> 此处以**蒲公英**和**红警2**、**RadminLAN**和**Minecraft**为例（**图示**+**简短文字描述**）：
>> + **蒲公英**使用方法：
>> ![蒲公英使用教程](https://s1.vika.cn/space/2023/03/23/0355efd17635468193a1db6729b80432)
>> + **RadminLAN**使用方法（**通用**）：
>> ![RadminLAN使用教程](https://s1.vika.cn/space/2023/03/23/92c65870f8ca45e49af37f9099be6c0e)

## **类型三：本地预留位置的游戏**（通过远程控制实现远程联机）
> **前言：**远程控制操作起来相对简单，**一般**只能**主机用手柄**，其他连接的**访客只能用键鼠**。示例以**向日葵**为例，这里我列出常见的远程控制软件：
>
> + ### 常见平台
> > + **[QQ](https://im.qq.com/index)/[TIM](https://tim.qq.com/)**仅支持**PC**间控制，免费但画质一般，有一定延迟，并且**只能一对一**连接；在好友面板选择**远程协助**，等待对方同意即可
> > + **[向日葵](https://sunlogin.oray.com/)**（v12绿色版无需账号登录）：免费，可以**多设备连接一台设备**，功能较全；只需要把**ID和验证码**发给好友即可让好友远程控制。（连接人数较多时可能卡顿，**重启**向日葵服务并让好友们重新加入即可）
> > + **[TeamViewer](https://www.teamviewer.cn/cn/)**：免费；只需要把**ID和验证码**发给好友即可让好友远程控制。
> > + **[Parsec](https://parsec.app/)**（**win10+**）：免费，易用，可以**跨平台**但有相应的**系统版本限制**，功能非常齐全，对游戏方面更加友好，但可能对网络有一定要求，不过有**网页端**可以用；既可以分享主机地址让他人加入(需要**手动接受**加入请求)，也可以创建公开房间或者加入处于公开状态的房间来远程控制联机
> > + [**腾讯会议**](https://meeting.tencent.com/)：免费简单；可能有一定延迟，视自己网络属性而定。
> > + **[Steam](https://store.steampowered.com/about/)远程畅玩**(流式传输)：免费，最简单，但**需要双方互加好友**(Steam有一定条件)，而且对**网络要求较高，可能用不了**，需要有人**游戏在库中**；游戏内**Shift+Tap**唤出好友列表**邀请**好友远程畅玩即可
> > + **[AnyDesk](https://anydesk.com/zhs)；[ToDesk](https://www.todesk.com/solo?v=4)**
> > + **．．．．．．**（数据来源于2023.1，**可能不准确**如有需要在下面留言更新）
> + ### **远程控制操作流程**
> > 1.配置好游戏后，**启动**对应的远程协助软件，并**通知好友启动**相同的软件
> > 2.将你的**ID密钥**给予好友，好友选择**加入/连接**功能远程获取你电脑的**控制权及画面**(QQ、Steam无密钥)?
> > + ### **图文示例**
> >   此处以**向日葵**和**DR2C**为例（**图示**+**简短文字描述**）：
> >   **向日葵**使用方法：
> >   ![向日葵联机教程](https://s1.vika.cn/space/2023/03/23/72d1efe7da664afe9aa21514258bcb27)
> >   *好像有人的demo拼成了dome*
## **其他附加问题**
> + **若需手柄但没有**，可以尝试使用**DroidJoy**或**MyJoy**等软件将**安卓**手机转为手柄并连接电脑，亦或者是其他方法都。
> + **若好友电脑没有麦克风**可以使用**WO Mic**来让**安卓**手机变为**麦克风**。
> + **内网穿透要求实名但不满条件**的，可以尝试不断使用**新兴的**或者**国外的**内网穿透工具，一般需要提交的信息较少
> + 游戏联机时非远程协助联机的**服务器端的版本**必须与**用户端的版本**相匹配，像**TR**、**MC**可以通过安装**跨版本插件**（链接见下）来允许**大版本内**的联机兼容
> + **远程协助**一般只有**主机的手柄**输入可以被识别，**其他连接者**只能**使用键盘**，因此大部分软件远程控制只能**主机使用手柄**。
## **视频中的链接汇总**
>+ **Terraria互通器**
>> [TShock服务端下载](https://github.com/mistzzt/TShock/releases)
>> [CrossPlay跨版本插件](https://github.com/Moneylover3246/Crossplay)；
>> [CrossPlay插件在TrBBS上的页面](https://www.bbstr.net/r/79/)
>+ **Minecraft互通服**
>> [MCpaper端下载](https://papermc.io/downloads)
>> [Geyser下载](https://ci.opencollab.dev/job/GeyserMC/job/Floodgate/job/master/)
>> [Floodgate下载](https://ci.opencollab.dev/job/GeyserMC/job/Floodgate/job/master/)
>> [多世界插件Multiverse-Core](https://www.spigotmc.org/resources/multiverse-core.390/updates)
>> [背包隔离插件](https://www.mcbbs.net/thread-909834-1-1.html)
>> [空岛插件](https://www.spigotmc.org/resources/iridium-skyblock-1-13-1-19.62480/)
>> [空岛需要的前置插件](https://www.spigotmc.org/resources/vault.34315/)
>> [Forge下载](https://files.minecraftforge.net/net/minecraftforge/forge/)
>> [跨版本插件](https://www.spigotmc.org/resources/viaversion.19254/)
>+ **生存战争Survivalcraft联机版**
>> [SC联机版作者团队：瓦西里沃尔特](https://space.bilibili.com/292546719?spm_id_from=333.337.search-card.all.click)
>+ **红警双端联机**
>> [手机运行红警(b站视频教程)](https://www.bilibili.com/video/BV13h411676X)


## **总结**
> **以上方法的最终目标都是打破空间限制实现远程联机，综合来看，原本联机空间越严格的程序在远程联机的方法上操作起来反而更简单。本次教程主要面向新萌，没什么技术力，如果有什么问题可以向我咨询，有什么错误可以指出，就是我不一定在线，回复可能较慢，见谅，感谢您的浏览O(∩_∩)O**
