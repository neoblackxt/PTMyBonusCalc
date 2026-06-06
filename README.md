# PT站点魔力计算器

在使用NexusPHP架构的PT站点显示每个种子的 B 值（时魔）、A 值和每 GB 的 A 值（A/GB）。

### 功能

#### 种子列表页（/torrents）

在种子列表页增加 `B|A@A/GB` 列，显示每个种子的魔力值信息：

- **B** — 时魔（每小时魔力值收益），用户最关心的数字
- **A** — A 值（魔力值潜力），综合时间、体积、做种人数计算
- **A/GB** — 单位体积收益率，越高说明该种子越"划算"

根据 A/GB 值自动着色：

| A/GB 范围 | 颜色 | 含义 |
|---|---|---|
| [0, 1) | 默认 | 普通种子 |
| [1, 1.5) | <span style="color:#00008B;font-weight:700;">蓝色加粗</span> | 较好种子 |
| [1.5, 2) | <span style="color:#8B4513;font-weight:800;">棕色更粗</span> | 优质种子 |
| [2, ∞) | <span style="color:#ff0000;font-weight:900;">红色最粗</span> | 极品种子 |

如果你此时新加入到该种子的做种者，实际A值会稍稍低于当前显示A值。

特别地，对于断种的种子，直接显示为续种后孤种状态的实际A值。

#### 用户详情页（/userdetails）

在用户详情页的 **当前做种** 列表中同样显示 `B|A@A/GB` 列（点击"显示/隐藏"展开后自动计算）。翻页时自动更新。

#### 魔力值说明页（/mybonus）

在魔力公式页面显示 **B - A 关系图**，并在当前种子位置标注。

> 注意：B 值不等于每小时的魔力值，B 值 + 种子数奖励 + 其他加成 的和才等于每小时的魔力值。

![](https://s2.loli.net/2022/02/04/kLu13N2l87zYTBa.png)

（种子列表截图为老版本效果，待更新...）
![](https://s2.loli.net/2022/02/04/TqnG9itOVvYpIwh.png)

### 使用

脚本安装：https://greasyfork.org/en/scripts/439369-pt站点魔力计算器

脚本已内置通用匹配规则，覆盖以下页面：
- `*://*/*torrents*` — 种子列表页
- `*://*/*userdetails*` — 用户详情页（当前做种列表）
- `*://*/*mybonus*` — 魔力值说明页
- `*://*/*bonus.php*` — TJUPT 等兼容

如需手动添加网站：管理面板 → 已安装脚本 → 本脚本 → 编辑 → 设置 → 包括/排除 → 用户匹配 → 添加，如 `*://*.hddolby.com/*`

首次使用须打开各站的魔力值公式或商店页面获取公式参数，否则无法计算。参数保存在管理面板→已安装脚本→本脚本→编辑→存储。 [图文说明](https://github.com/neoblackxt/PTMyBonusCalc/issues/6)

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
