
## 前言

+ 建议配合视频教程一起使用，这篇提供我已知的最优解，但**不一定是最好**；
+ 完成本地的直播网站需要一台满足配置要求的设备(能**带动OBS**+**内网穿透**且**承载**住他人的**拉流**；主要吃**CPU和宽带**，CPU方面基本上**一般电脑都可以**)，体量不大宽带家用蛮够，主要看映射软件给你开放的宽带（obs默认码率一个访问者流量传输约为**128KB/s**），如果面向人群体量稍大如班级可以考虑研究一下**p2p**技术，再大这则博客就没用了，大型的平台主要采用**CDN分发**和**p2p**；
+ 需要两条http协议的隧道，如果网页有托管可以直接对外公开的话可以只要一个隧道（Github是https打头，数据不和http互通，需要额外配置）

## 准备工作

除**内网穿透**需求**可能要多个**，**其他工具只要一个**即可

+ ### **网页部署工具**（选一）
> + **Windows自带**的**IIS组件**
>
> + [小皮面板phpStudy](https://www.xp.cn/)
>
> + [Vue.js渐进式 JavaScript 框架](https://cn.vuejs.org/)
>
> + [Hexo](https://hexo.io/zh-cn/index.html)

+ ### **推流工具**（选一）
> + [FFmpeg](https://ffmpeg.org/)
>
> + [OBS](https://obsproject.com/)

+ ### **流媒体中转服务器**（选一）
> + [LiveGo：纯 Golang 编写的直播服务器，性能高，跨平台](https://github.com/gwuhaolin/livego)
>
> + [nginx-rtmp-module：基于NGINX的媒体流服务器](https://github.com/arut/nginx-rtmp-module)
>
> + [Node-Media-Server：一个 Node.js 实现的RTMP/HTTP/WebSocket/HLS/DASH流媒体服务器](https://github.com/illuspas/Node-Media-Server)

+ ### **内网穿透工具（这里只列出支持http/https协议的)**(视频演示方法需要凑出**2条隧道**）

  > + [**cpolar**](https://www.cpolar.com/)：学习成本低；无需实名；无限流量；**动态域名**且**无**UDP；速度较低；**http**协议提供**免费动态域名**，**免费一条http**隧道
  > + [**飞鸽**](https://www.fgnwct.com/)：学习成本低；**0.5M**，签到给流量；**http**协议提供**免费域名**；**免费两条**隧道但**http只能一条**
  > + [**OpenFrp 内网穿透（需域名）**](https://www.openfrp.net)：学习成本低(带GUI启动器和樱花相似)免费，签到领流量；**部分节点**无需实名；速度**限制**12M/s(速度取决于所选节点与访客距离)；固定域名；**http**协议需要**绑定自己的域名**
  > + [**NATAPP**](https://natapp.cn/)：学习成本一般；**动态域名**；**实名**；1M；**http**协议提供**免费域名**
  > + [闪库](http://www.ipyingshe.com/)：1M/s；**仅支持Http**，**随机固定**域名；未来可能实名
  >   **（以下是其他我没用过的内网穿透）**
  > + [**ngrok(https)**](https://ngrok.com/)：学习成本一般；无需实名；只给**一条免费隧道**，离得近的节点延迟较低；http会**自动换https**协议（相当于**不支持http**）
  > + [**花生壳(https)**](https://hsk.oray.com/)：极低的学习成本；**实名1M**每月1G且**无Http只有https**，隧道固定域名
  > + **．．．．．．**（数据来源于2023.1，**可能不准确**如有需要在下面留言更新）
