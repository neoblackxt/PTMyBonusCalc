# PT站点魔力计算器

在使用NexusPHP架构的PT站点显示每个种子的A值和每GB的A值。

### 功能

在种子界面增加一列显示该种子当前的A值和每GB的A值，后者表征对磁盘空间利用的性价比。如果每GB的A值超过2并且没有断种会被自动<span style="color:#ff0000;font-weight:900;">标红</span>，超过1.5<span style="color:#8B4513;font-weight:800;">标棕</span>，超过1<span style="color:#00008B;font-weight:700;">标蓝</span>，1以下不变。

如果你此时新加入到该种子的做种者，实际A值会稍稍低于当前显示A值。

特别地，对于断种的种子，直接显示为续种后孤种状态的实际A值。

（截图中字体变色为老版本效果，待更新...）
![](https://s2.loli.net/2022/02/04/TqnG9itOVvYpIwh.png)

在魔力公式页面显示 B - A 关系图。注意：B值不等于每小时的魔力值，B值 + 种子数奖励 + 其他加成 的和才等于每小时的魔力值。

![](https://s2.loli.net/2022/02/04/kLu13N2l87zYTBa.png)

### 使用

脚本安装：https://greasyfork.org/en/scripts/439369-pt站点魔力计算器

可自行添加网站->在管理面板->已安装脚本->本脚本->编辑->设置->包括/排除->用户匹配->添加，如`*://*.hddolby.com/torrents*`

首次使用须打开各站的魔力值公式或商店页面获取公式参数，否则无法计算。参数保存在管理面板->已安装脚本->本脚本->编辑->存储。 [图文说明](https://github.com/neoblackxt/PTMyBonusCalc/issues/6)

### 参与开发

https://github.com/neoblackxt/PTMyBonusCalc

### 问题反馈

https://github.com/neoblackxt/PTMyBonusCalc/issues

请将不支持的站点的种子列表和魔力值网页源代码粘贴在issue中，**注意把你的网站ID信息以及其他敏感信息删除，但不要破环网页结构** 不知道怎么删除请不要发出来（Ctrl + U 查看网页源代码，Ctrl + S 保存文件）。

如果可以，希望你能邀请我注册这些站点，这样我可以更方便的调试代码，修复BUG。 Telegram:@naoguregt EMAIL:neoblackxt在outlook点com 在换成@，点换成. （防止爬虫自动抓取发送垃圾邮件）

### Credit

neoblackxt

基于LaneLau 的[NexusPHP魔力计算器](https://greasyfork.org/zh-CN/scripts/416471-nexusphp%E9%AD%94%E5%8A%9B%E8%AE%A1%E7%AE%97%E5%99%A8)修改

### 捐助

<img src="https://s2.loli.net/2022/02/04/sb8COkVURQdBziT.png" width="400" height="600" /><BR>
<img src="https://s2.loli.net/2022/02/04/dCHuwrAKS8qXcsg.jpg" width="400" height="600" /><BR>

### 开源协议

GPL v3
