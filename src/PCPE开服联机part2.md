## 各种游戏联机方法示例

只列出部分游戏，主要看自己判断；支持ip直连（内网穿透或公网主机）的也都支持异地组网
+ 生存创造类
> 内+异：MC、TR、饥荒
> 远程协助：DR2C
+ 经营类
> 内+异：星露谷
+ 策略类
> 内+异：铁锈
> 异：红警，钢4
+ 竞技类
> 内+异+远：武装原型
> 异：使命全系列、鸭子游戏、回旋标
## **类型一**：提供**IP直连**的程序（通过中间服务器实现远程联机）

**判断方法**：允许通过输入**字符串类型的值**来连接服务器（如同**浏览器的地址栏**），该类型程序一般允许用户自己创建连接服务器或者直接连接，典型的如：我的世界(Minecraft)、泰拉瑞亚(Terraria)、星露谷物语(Stardew Valley)、铁锈战争(Rusted Warfare)、生存战争(Survivalcraft)联机版等

---

1. ### **1.部署本地服务端(必需-准备)**
>
>**启动**对应的**服务端程序**（可能需要填入部分配置信息）并等待部署完成即可，有的软件不自带服务端的启动程序，或者其不能够满足服务器的需求，因此需要下载对应的服务端：
>
>+ #### 我的世界Minecraft
>
> ##### 安装服务端
>*无论何种平台大概流程都是[配置运行环境]-->运行服务器端-->公开服务器端口*
>+ Java端服务器
>> + [Minecraft官方服务器端（纯原版）](https://www.minecraft.net/zh-hans/download/server)
>> + [Paper服务器端（插件+优化）](https://papermc.io/downloads)
>> + [spigot服务器端（插件）](https://hub.spigotmc.org/jenkins/job/BuildTools/)
>> + [Forge安装服务器（mod）](https://files.minecraftforge.net/net/minecraftforge/forge/)（下载时若不能跳过广告，一可在下载按钮右键复制链接，单独粘贴链接中URL部分，或者到广告界面查看网页源代码，找到skip附近的链接地址并单独搜索即可）
>> + [Forge + Sponge（插件+mod - SpongeMod支持版本少）](https://spongepowered.org/downloads/)
>> + **．．．．．．**（数据来源于2023.1，**可能不准确**如有需要在下面留言更新）
> + 关于Java版开服：
>> + [Java各大平台版本地址](https://www.oracle.com/java/technologies/downloads/)
>> + OpenJDK on Linux：
>>>```bash
>>> sudo apt install openjdk-17 #版本与服务端挂钩1.16.5&-请安装使用jdk8
>>>```
>>选择合适服务端需求版本的java后下载服务器端
>>
>>如果openjdk不能用去官网下对应版本的javajdk/jre，无系统archarm64/arm64，有则按照系统下载对应包
>>
>>Linux通过终端命令行运行；Windows创建**bat文件**运行服务端
>>```bash
>>    java -Xms1024M -Xms2048M -jar 服务器端名称.jar
>>```
>> + 或java -jar 服务端名称.jar自动分配内存。
>> + 其中**Xms**为**最小**内存，**Xmx**为**最大**内存，单位可以为M也可以为G，也可以默认自适应。
>> + 服务端名称是下载使用哪个服务端就填哪个服务端的名称，**forge**要**先双击安装**程序(需java运行环境)运行并安装服务器端
>> + 启动带GUI的服务端可以在后面加 **nogui**来取消运行时启动独立窗口
>> + java是使用默认环境变量的java，当1.16.5&-版本服务器运行时可能不兼容新版，可以在计算机中安装多个版本的java并使用**绝对路径**来运行服务器端如下（Linux用./同理）：
>>```bash
>> "C:\Program Files\Java\jre1.8.0_351\bin\java" -Xms1G -Xmx2G -jar paperc.jar nogui
>>```
>> + 第一次运行需要先改**eula.txt**文件中eula=后面的false改为**true**即同意上述协议，修改完成后保存再次启动(Linux进入vim默认命令模式后按i进入插入模式开始写入，按ESC切换为命令模式，输入:wq保存并退出，:q!不保存强制退出)
>>```bash
>> sudo apt install vim #linux安装编辑器，已安装跳过
>> vi eula.txt
>>```
>>之后再次启动会下载所需文件，耐心等待，若下载出现错误可以开**网络工具**或者在**log报错文件**中找到报错的**文件地址手动下载**，手动下载再失败可以**复制地址到网盘的P2P下载器**下载。
>> + **Stop**停止并保存服务器，注该开服方法不**适用于**国内版MC，且**国内版**MC与**国际版**并**不能互通**。
>>
> ##### MC开服成功后相关内容
> + 配置文件
>> 位置：服务器目录下Serverpropreity
>> + 出生点保护：spawn-protection=16 #半径
>> + 启用命令方块：enable-command-block=false #默认关闭，故有些地图无法使用，启用即可正常
>> + [更多请跳转至wiki](https://minecraft.fandom.com/zh/wiki/Server.properties)
> + 基本命令
>> 控制台内无"/"，游戏内需加"/"
>>```bash
>> op 玩家名 #使指定玩家获取权限
>> deop 玩家名 #作用与op相反
>> ban 玩家名 #将指定玩家踢出服务器（封禁）
>>```
> ##### Java服基础上实现与BE(基岩)互通
>
>> 进不去下载页面试试魔法或代理或修改dns
>>
>> 以下链接为构建页面，选择一个最新构建的分支下载需对应需要的jar
>> + [Geyser跨平台翻译组件](https://ci.opencollab.dev//job/GeyserMC/job/Geyser/job/master/)
>> + [Floodgate基岩版离线服组件](https://ci.opencollab.dev/job/GeyserMC/job/Floodgate/job/master/)
>> + [跨版本插件](https://www.spigotmc.org/resources/viaversion.19254/)
>> + [关于Geyser](https://geyser.superiormc.cn/user-guide/da-jian):
>>> Geyser-Fabric安装在mods文件夹
>>>>服务器要求使用任何 客户端Mod 都会导致基岩版玩家无法进入服务器，
>>> Geyser-Spigot作为插件安装在plugins文件夹，服务器内/reload /reload confirm可以重载服务器插件
>>> Geyser-Velocity独立端，单独窗口运行
>>> + quote：如果你使用的服务端核心并不支持 Java 16，请在 启动参数 添加 -DPaper.ignoreJavaVersion=true 来使得你的服务端能够正常运行。
>>> + 如果你的服务端核心实在无法在 Java 16 上运行，请考虑使用 独立版。
>>> + 手机版开互通服不建议使用独立端，需要较高性能
>>>+ 一些旧版本的 Geyser 只和 Floodgate 1.0 适配而不支持 Floodgate 2.0，所以建议最新版
>>
>> + [关于Floodgate](https://geyser.superiormc.cn/floodgate-wiki/da-jian-he-yong-fa):
>>>下载并放置在服务端目录下plugins文件夹内
>>>+ *quote：你可以在各个子服上安装 Floodgate (但 Geyser 真的没必要) 来增强玩家的皮肤显示功能和在子服上使用 Floodgate API。如果你要这么做，你 必须 保证你将代理服务端内 Floodgate 文件夹内的 key.pem 文件放置到了 所有子服的 Floodgate 文件夹内的相同位置，否则，基岩版客户端无法加入服务器。*
>>>+ 你只需在使用独立版上进行此步骤：复制 Floodgate 配置所在的目录下的 key.pem 文件到 Geyser独立版 的文件夹内。不要尝试将这个文件分享给其他人！这个密钥文件允许基岩版账号绕过 Java 版身份验证，如果有人拿到了它，他们可能会对您的服务器造成严重破坏
>>>+ 在你的 Floodgate 配置中，将 username-prefix 设置为你需要的前缀 - 你可以设置为 "" 以关闭基岩版前缀功能。
>>>> *在一些旧版本的 Paper 服务器（或者 Paper 的一些分支），你或许需要关闭你的服务器并删除你的 服务端 jar 文件同目录下的的usercache.json 文件以避免出现你的老的 Floodgate 玩家的前缀没有更新的问题。*
>>
>>+ 配置完Geyser[&Floodgate]后，服务端就配置完成了
>
> ##### 仅基岩版相关
>>适合只开手机服务器的用户
>> + [单基岩版官方服务端无插件互通官网](https://www.minecraft.net/en-us/download/server/bedrock/)
>>在termux中的启动命令
>>```bash
>> ####下载并解压服务端文件####
>> wget https://minecraft.azureedge.net/bin-linux/bedrock-server-1.18.12.01.zip #换成自己版本
>> unzip bedrock-server-1.18.12.01.zip -C minecraftbeserver/ #目录换成你自己想要的好记的名
>> ####运行命令####
>> LD_LIBRARY_PATH=. ./bedrock_server
>>```
>> + 修改配置文件同上，如：player-idle-timeout=0 #挂机踢出时间，0为不因挂机超时踢出玩家
>>
>+ #### 泰拉瑞亚Terraria
>>1.4以下版本win用户可不安装新版dotnet，建议先启动试试不能启动再安装运行环境。另外：手机termux开tshock的服必须在proot/chroot环境中，需要安装一个linux系统
>>+ [通过安装dotnet启动Win&Linux：dotnet官网链接](https://dotnet.microsoft.com/zh-cn/download/)
>>> Windows安装dotnet后双击服务端程序直接运行即可
>>>
>>> Windows游戏存档等目录：资源管理器--->左侧：我的文档/My Games/Terraria/
>>+Linux安装dotnet命令(termux旧版使用mono)：
>>>```bash
>>> sudo apt install dotnet-sdk-6
>>>```
>>+ Linux或使用脚本安装
>>>```bash
>>> wget https://dot.net/v1/dotnet-install.sh -Oc dotnet-install.sh
>>> sudo chmod +x ./dotnet-install.sh
>>> ./dotnet-install.sh  --channel 6.0 #可修改版本，推荐6.0
>>> dotnet TerrariaServer.exe #运行服务器
>>>```
>>+ Linux或其他平台通过mono启动
>>>注：使用mono最大支持[1.4.3.6及以下版本的TShock(github直链)](https://github.com/Pryaxis/TShock/releases/download/v4.5.18/TShock4.5.18_Terraria1.4.3.6.zip) ，**Android6&-我目前没有开**1.4.3.6TShock的方法，**新版TShock需要dotnet**
>>>[mono官网](https://www.mono-project.com/download/)
>>>```bash
>>> apt install mono-complete
>>>```
>>>*TerariaServer.exe服务端游戏本体目录下自带，linux也是先下载游戏本体，进入游戏目录运行服务端文件*
>>>
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
>>> Linux游戏存档等路径：~/.local/share/Terraria/
>>>
>>+ [TShock（相比原版可以装插件）](https://github.com/Pryaxis/TShock/releases)
>>>去官网复制下载链接，然后通过wget下载tshock的zip文件，之后使用unzip工具解压
>>>```
>>> wget -c #目标地址，-c是意外中断后再次下载能接上
>>> sudo apt install unzip
>>> unzip TShock*.zip -d tshock 
>>> cd tshock
>>> tar -xf TShock*.tar #解压目标文件，-C 加已经创建好的目录地址
>>> mono TerrariaServer.exe #启动命令
>>>```
>>> *如果提示开始下载dotnet之后失败，则先自己安装dotnet，见上*
>>>
>>> + 开服后看情况保存超级管理员代码，只有第一次显示，没记下来如果需要可以删除tshock.sqlite&auth.lck文件然后重启，或者其他方法见下
>>> + TShock安装插件：将插件名.dll放在ServerPlugins下，重启后TShock会自动生成相应的配置文件
>>> + 版本差异时可以使用插件解决（如不同平台最新版不同时，但只能跨一个大版本内的子版本）[CrossPlay跨版本插件](https://github.com/Moneylover3246/Crossplay)
>>> + 通过控制台移动用户组至admin组获得管理权限（常用），或是游戏内输入/auth [authcode]获取超管权限，也可移动用户组至superadmin(超级管理员)，但是**不建议**用超管游玩，**超级管理的角色数据不会被保存**
>>> + config.json配置文件在tshock目录下，如出生点保护范围之类，可以进行查阅&修改，之后重启更新服务器，[TShock官方帮助文档](https://ikebukuro.tshock.co/)；[相关链接推荐csdn1](https://blog.csdn.net/shuishen49/article/details/54743316)；[相关链接推荐csdn2]([https://blog.csdn.net/junknow/article/details/128260828)
>>>+ TShock基本命令(控制台内无"/"，游戏内需加"/")：
>>>>+ 游戏内：
>>>>/register 密码
>>>>
>>>>/login [password]
>>>>
>>>>/auth [authcode]
>>>>
>>>>+ 控制台：
>>>>```bash
>>>> ban 玩家名
>>>> help [页数]
>>>>```
>>+ [TML（Steam商店地址)(可装Mod）](https://store.steampowered.com/app/1281930/tModLoader/)
>>>```bash
>>> #还是terraria的目录下
>>> #steam更新命令：app_update <应用ID> [-beta <测试名称>] [-betapassword <密码>] [validate] 版本号自行查看，validate可以不成功时再加
>>> app_update 1281930 +tml版本号 validate
>>> ./start-tModLoaderServer.sh
>>>```
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

2. ### **2.监听程序端口(可跳过-准备)**
>
> 这里也给出了一些常见的应用端口，如果包含在内，或者已知，请跳过此步骤
>
> ***先启动游戏服务器或创建局域网房间后才能看到其端口和协议类型，下面列出常见软件的协议类型及其端口***
>
> + **网站默认http/https**(vue：**8080**；PHPstudy：**80**；Hexo：**4000**；mdbook；**3000**；......)
> + **泰拉瑞亚Terraria自带**或**TShock**：TCP**7777**
> + **我的世界Minecraft：Java**：TCP**25565**；内置服务端**随机**；**BE基岩版**：UDP**19132**（互通服两个都要映射）
> + **铁锈战争Rusted Warfare**：TCP**5132**
> + **生存战争Survivalcraft联机版**：UDP**28887**
> + **星露谷物语Stardew Valley**：UDP**24642**
> + **像素工厂Mindustry**：**TCP+UDP双协议映射&相同对外端口**
> + **饥荒**：UDP**地上10999&地下10998**
> + ......（有的游戏服务器需要**两条隧道**才能正常运行，例如：**未转变者Unturned**(**quit**退出并保存服务器)、MC互通服等）
>
> ***如果出现报错显示端口被占用相关问题，可以修改配置文件改变游戏默认的端口号，但有的程序不提供配置文件修改端口号，那也可以在下面操作找到占用该端口号的程序并将它结束掉；linux系统结束程序在下面***
>
> ***一般游戏端口及其协议类型可以搜到，或者界面会告诉你，如果没有再进行下面的步骤***
>
> ---
>
> ![图片加载失败了，不过不影响](https://s1.vika.cn/space/2023/03/23/3b38183a828441e99f50e4c1ddbb0d90)
>
> + #### **Windows操作系统**
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
> > 打开**终端**，输入
> > `netstat -a`
> > + 参数含义：-a 显示所有；-n 以ip形式显示当前建立的有效连接和端口；-u 显示UDP协议；-t 显示TCP协议；-p 显示对应PID与程序名
> > + 如果该方法不可用，可尝试安装nmap扫描本地端口

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
>> + [**frp**](https://github.com/fatedier/frp)：有较高的学习成本，是自己部署内网穿透的开源工具，但需要**有条件（公网主机）**，可扩展性强，不少内网穿透就是基于它的(例如莱云、Locyan、凿洞)
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
4. ### **4.IPv6公网方式(条件-实现)**
>
> + **前言：理想状态下**，IPv6延迟低，操作简单，免费且无需账号、认证等，不过前提是你的**网络运营商向你提供IPv6服务**，且你的电脑**能够正常识别和使用**，详细判断是否可用和配置教程可见相关教程[【mc开服】教你白嫖运营商公网ipv6跟好兄弟联机】](https://www.bilibili.com/video/BV1Lb4y1o7SF)
> + 主机启动服务器后，访问端以 **[对方的IPv6地址]:端口号** 的格式直接连接即可
> + 注：这里没有条件不做演示，可移步到上方链接观看推荐视频学习。
