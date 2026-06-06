// ==UserScript==
// @name         PT站点魔力计算器
// @namespace    https://github.com/neoblackxt/PTMyBonusCalc
// @version      2.3.0
// @description  在NexusPHP架构的PT站点显示每个种子的B值(时魔)、A值和每GB的A值。通用匹配，自动适配。
// @author       neoblackxt, LaneLau
// @require      https://cdn.jsdelivr.net/npm/jquery@3/dist/jquery.min.js
// @require      https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js
// === M-Team（SPA架构，需特殊处理，匹配所有页面） ===
// @match        *://kp.m-team.cc/*
// @match        *://zp.m-team.io/*
// === 通用匹配：自动适配所有 NexusPHP 架构的 PT 站点 ===
//    *torrents* 覆盖 /torrents、/torrents.php、/xxx/torrents 等所有变体
// @match        *://*/*torrents*
// @match        *://*/*mybonus*
//    *userdetails* 覆盖 /userdetails、/userdetails.php 等所有变体
// @match        *://*/*userdetails*
// === TJUPT 兼容（魔力值页面 URL 为 bonus.php） ===
// @match        *://*/*bonus.php*
// @license      GPL License
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        window.onurlchange
// ==/UserScript==

/**
 * B|A@A/GB 中 A/GB 值不同范围对应的显示颜色及字体粗细。
 *
 * A/GB（每GB的A值）越高，代表该种子单位体积的魔力值收益越高，越值得挂种。
 * 颜色同时作用于整列（包括 B 值和 A 值），方便用户一眼识别优质种子。
 *
 * 颜色含义：
 *   - [0, 1):   默认色（黑色），普通种子，收益一般
 *   - [1, 1.5): 蓝色加粗，较好种子
 *   - [1.5, 2): 棕色更粗，优质种子
 *   - [2, ∞):   红色最粗，极品种子，值得优先挂种
 */
const colorsOfAVE = [
    // null 表示使用页面默认颜色和字重
    {min: 0, max: 1, color: null, fontWeight: 700},    // 默认色 — 普通
    {min: 1, max: 1.5, color: '#00008B', fontWeight: 700},   // 蓝色加粗 — 较好
    {min: 1.5, max: 2, color: '#8B4513', fontWeight: 800},   // 棕色更粗 — 优质
    {min: 2, max: Infinity, color: '#ff0000', fontWeight: 900} // 红色最粗 — 极品
]

/**
 * 脚本主入口函数。
 *
 * 整个脚本在两个场景下运行：
 * 1. 种子列表页 (/torrents 等) — 在每个种子行中插入 A@A/GB 列，帮助用户评估挂种收益。
 * 2. 魔力值说明页 (/mybonus) — 提取站点魔力值公式参数（T0/N0/B0/L），并绘制 B-A 曲线图。
 *
 * 核心公式：
 *   A = (1 - 10^(-T/T0)) * S * (1 + √2 * 10^(-(N-1)/(N0-1)))
 *   B = B0 * (2/π) * arctan(A/L)
 *
 * 其中：
 *   T — 种子已发布周数
 *   S — 种子体积（GB）
 *   N — 当前做种人数
 *   T0, N0, B0, L — 站点魔力值系统参数（各站不同，从 /mybonus 页面提取）
 *
 * A 值代表种子在当前状态下的魔力值潜力，A/GB 代表单位体积的收益率。
 */
function run() {
    var $ = jQuery;

    // ==================== 第一部分：读取/获取魔力值参数 ====================

    let argsReady = true;
    // 尝试从 Tampermonkey 存储中读取已保存的站点参数
    let T0 = GM_getValue(host + ".T0");
    let N0 = GM_getValue(host + ".N0");
    let B0 = GM_getValue(host + ".B0");
    let L = GM_getValue(host + ".L");
    if (!(T0 && N0 && B0 && L)) {
        argsReady = false
    }

    // 在魔力值说明页：从页面 DOM 中提取参数并持久化存储
    if (isMybonusPage) {
        try {
            // 从页面中的列表项提取四个关键参数
            T0 = parseInt($("li:has(b:contains('T0'))")[1].innerText.split(" = ")[1]);
            N0 = parseInt($("li:has(b:contains('N0'))")[1].innerText.split(" = ")[1]);
            B0 = parseInt($("li:has(b:contains('B0'))")[1].innerText.split(" = ")[1]);
            L = parseInt($("li:has(b:contains('L'))")[1].innerText.split(" = ")[1]);
            console.log('数据提取成功:', T0, N0, B0, L);
        } catch (error) {
            console.error('数据提取过程中出现错误:', error);
        }

        if (!argsReady) {
            if (T0 && N0 && B0 && L) {
                argsReady = true
                alert("魔力值参数已更新")
            } else {
                // 参数提取失败，写入默认值 0 防止后续卡死
                T0 = N0 = B0 = L = 0;
                alert("魔力值参数获取失败,请将Tampermonkey的配置模式修改为高级后手动修改存储配置参数，详见说明文档")
            }

            // 持久化存储参数，下次访问种子列表页时可直接使用
            GM_setValue(host + ".T0", T0);
            GM_setValue(host + ".N0", N0);
            GM_setValue(host + ".B0", B0);
            GM_setValue(host + ".L", L);
        }

        if (!argsReady) {
            // 参数错误时终止执行，避免页面卡死
            return
        }

        // ==================== 第二部分：绘制 B-A 曲线图 ====================

        /**
         * 根据 A 值计算 B 值（魔力值/小时）
         * B = B0 * (2/π) * arctan(A/L)
         */
        function calcB(A) {
            return B0 * (2 / Math.PI) * Math.atan(A / L)
        }

        /**
         * 从 B 值反推 A 值
         * A = L * tan(B / B0 / (2/π))
         */
        function calcAbyB(B) {
            return Math.tan(B / B0 / (2 / Math.PI)) * L
        }

        // 获取当前种子的 A 值（M-Team 和其他站点的 DOM 结构不同）
        let A = isMTeam ? 0 : parseFloat($("div:contains(' (A = ')")[0].innerText.split(" = ")[1]);
        let B = isMTeam ? parseFloat($("td:contains('基本獎勵')+td+td")[0].innerText) : calcB(A);

        // M-Team 特殊处理：页面显示的"基本奖励"包含了做种数奖励，需要扣除
        // 扣除公式：基本奖励 = 总奖励 - min(当前做种数, 做种上限) × 每种子奖励
        if (isMTeam) {
            let matches = $("h5:contains('做種每小時將得到如下的魔力值')").next().children().first().text()
                .match(/(\d+(\.\d+)?)個魔力值.*最多計(\d+)個/);
            let seedingBonusPerSeed = parseFloat(matches[1]);
            let seedingBonusLimit = parseInt(matches[3]);
            // 获取当前做种数（需要 clone 并替换 img 标签来提取纯文本中的数字）
            let currentSeedingNode = $("span:contains('當前活動')").parent().clone();
            currentSeedingNode.find('img').replaceWith(function () {
                return "img";
            });
            let currentSeeding = parseInt(currentSeedingNode.text().match(/(\d+)/)[1]);
            B = B - (currentSeeding > seedingBonusLimit ?
                seedingBonusPerSeed * seedingBonusLimit : seedingBonusPerSeed * currentSeeding);
        }

        // 防止 B 值溢出：若 B >= B0，取 B0 的 98% 作为上限
        // 原因：arctan 函数渐近于 B0，B 值理论上不可能达到或超过 B0
        B = B >= B0 ? B0 * 0.98 : B

        // M-Team 需从修正后的 B 值反推 A 值
        if (isMTeam) {
            A = calcAbyB(B);
        }

        // 当前种子的坐标点 (A, B)
        let spot = [A, B]

        // 生成 B-A 曲线的采样数据点，用于 ECharts 绘图
        // 横轴范围：max(1.1*A, 25*L)，步长 L/4，确保曲线完整展示
        let data = []
        for (let i = 0; i < (1.1 * A > 25 * L ? 1.1 * A : 25 * L); i = i + L / 4) {
            data.push([i, calcB(i)])
        }

        // 在页面上插入 ECharts 图表容器
        let insertPos = isMTeam ? $("ul+table") : $("table+h1")
        insertPos.before('<div id="main" style="width: 600px;height:400px; margin:auto;"></div>')

        // 使用 ECharts 初始化并渲染 B-A 曲线图
        var myChart = echarts.init(document.getElementById('main'));
        var option = {
            title: {
                text: 'B - A 图',
                top: 'bottom',
                left: 'center'
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross'  // 十字准星指示器
                },
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                position: function (pos, params, el, elRect, size) {
                    var obj = {top: 10};
                    obj[['left', 'right'][+(pos[0] < size.viewSize[0] / 2)]] = 30;
                    return obj;
                },
                extraCssText: 'width: 170px'
            },
            xAxis: {
                name: 'A',  // 横轴：A 值（种子魔力值潜力）
            },
            yAxis: {
                name: 'B'   // 纵轴：B 值（每小时魔力值收益）
            },
            axisPointer: {
                label: {
                    backgroundColor: '#777'
                }
            },
            series: [
                {
                    type: 'line',
                    data: data,       // B-A 曲线
                    symbol: 'none'    // 不显示数据点标记
                },
                {
                    type: 'line',
                    data: [spot],     // 当前种子在图上的位置
                    symbolSize: 6     // 显示为实心圆点
                }
            ]
        };

        myChart.setOption(option);
    }

    // ==================== 第2.5部分：用户详情页 — 监听做种表格并添加 B|A@A/GB ====================

    if (isUserdetailsPage) {
        if (argsReady) {
            setupUserdetailsObserver();
        } else {
            alert("未找到魔力值参数，请先打开魔力值系统说明页面获取（/mybonus）");
        }
        return;
    }

    // ==================== 第三部分：种子列表页 — 计算并显示 B|A@A/GB ====================

    /**
     * 计算单个种子的 A 值。
     *
     * 公式：A = (1 - 10^(-T/T0)) * S * (1 + √2 * 10^(-(N-1)/(N0-1)))
     *
     * @param {number} T — 种子已存活时间（周）
     * @param {number} S — 种子体积（GB）
     * @param {number} N — 当前做种人数（0 表示断种）
     * @returns {number} A 值
     */
    function calcA(T, S, N) {
        // 时间因子：种子存在时间越长，系数越接近 1
        var c1 = 1 - Math.pow(10, -(T / T0));
        // 做种人数因子：N 为 0（断种）时，视为 1 来计算续种后的实际值
        // 续种后人数变 1，实际 A 值会比当前状态值小
        N = N ? N : 1;
        var c2 = 1 + Math.pow(2, .5) * Math.pow(10, -(N - 1) / (N0 - 1));
        return c1 * S * c2;
    }

    /**
     * 为种子表格的一行生成 "B|A@A/GB" 的 HTML。
     *
     * B 值：该种子每小时可获得的魔力值（时魔），直接反映挂种收益。
     *       B = B0 * (2/π) * arctan(A/L)，B 越接近 B0 收益越高。
     * A 值：魔力值潜力，综合考虑时间、体积、做种人数。
     * A/GB：单位体积的收益率，越高说明该种子越"划算"——用较小的硬盘空间换取较高的魔力值收益。
     *
     * 显示格式：B|A@A/GB，其中：
     *   B — 时魔（小时魔力值），用户最关心的数字
     *   A — A 值（魔力值潜力）
     *   A/GB — 单位体积收益率（用于横向比较不同体积的种子）
     *
     * @param {jQuery} $this — 种子行的 jQuery 对象
     * @param {number} i_T   — 发布时间所在列的索引
     * @param {number} i_S   — 种子体积所在列的索引
     * @param {number} i_N   — 做种人数所在列的索引
     * @returns {string} 带样式的 HTML 字符串，格式为 "B|A@A/GB"
     */
    function makeA($this, i_T, i_S, i_N) {
        // ---- 提取发布时间 T ----
        var time = $this.children('td:eq(' + i_T + ')').find("span").attr("title");
        // 适配 M-Team：时间可能在 span 的文本中而非 title 属性
        if (time == undefined || time == "") {
            time = $this.children('td:eq(' + i_T + ')').find("span").text();
        }
        // 适配 TJUPT 和 userdetails 等：时间格式使用 <br> 分隔，或直接在 td 文本中
        if (time == undefined || time == "") {
            time = $this.children('td:eq(' + i_T + ')').html().replace(/<br\s*\/?>/gi, " ").trim();
        }
        // 将发布时间转换为周数
        var T = (new Date().getTime() - new Date(time).getTime()) / 1e3 / 86400 / 7;

        // ---- 提取种子体积 S（统一转换为 GB） ----
        var size = $this.children('td:eq(' + i_S + ')').text().trim();
        var size_tp = 1;  // 单位换算系数，默认为 GB
        var S = size.replace(/[KMGT]i?B/, function (tp) {
            if (tp == "KB" || tp == "KiB") {
                size_tp = 1 / 1024 / 1024;   // KB → GB
            } else if (tp == "MB" || tp == "MiB") {
                size_tp = 1 / 1024;           // MB → GB
            } else if (tp == "GB" || tp == "GiB") {
                size_tp = 1;                  // 已是 GB，不变
            } else if (tp == "TB" || tp == "TiB") {
                size_tp = 1024;               // TB → GB
            }
            return "";  // 去掉单位字符串，只保留数值
        });
        S = parseFloat(S) * size_tp;

        // ---- 提取做种人数 N ----
        // 移除千分位逗号分隔符后再解析为整数
        var number = $this.children('td:eq(' + i_N + ')').text().trim().replace(/,/g, '');
        var N = parseInt(number);

        // ---- 计算 A 值、A/GB 和 B 值（时魔） ----
        var A = calcA(T, S, N).toFixed(2);
        var ave = (A / S).toFixed(2);
        // B = B0 * (2/π) * arctan(A/L)，每小时魔力值收益
        var B = (B0 * (2 / Math.PI) * Math.atan(A / L)).toFixed(2);

        // ---- 根据 A/GB 值范围着色（颜色反映性价比，B 值和 A/GB 共用同一颜色） ----
        var textA = '<span>' + B + '|' + A + '@' + ave + '</span>';
        colorsOfAVE.forEach(color => {
            if (ave >= color.min && ave < color.max && (color.color != null || color.fontWeight != null)) {
                textA = '<span style="'
                    + (color.color == null ? '' : 'color:' + color.color + ";")
                    + (color.fontWeight == null ? '' : 'font-weight:' + color.fontWeight + ";")
                    + '">' + B + '|' + A + '@' + ave + '</span>';
            }
        });
        return textA;
    }

    // ---------------- 用户详情页（userdetails.php）：监听 AJAX 做种表格并添加 B|A@A/GB 列 ----------------
    // 做种表格通过 AJAX 动态加载（点击"显示/隐藏"后触发），使用 MutationObserver 监听。

    /**
     * 为 userdetails 页面上的做种表格添加 B|A@A/GB 列。
     *
     * userdetails.php 中做种表格的表头结构与种子列表页不同：
     *   - 没有 img.time 图标，时间列是纯文本 "col_added"
     *   - 有 img.size 和 img.seeders 图标（与种子列表页相同）
     *   - 数据行时间格式为 YYYY-MM-DD<br>HH:MM:SS
     *
     * 此函数通过图标识别 size 和 seeders 列，通过日期格式识别时间列。
     *
     * @param {jQuery} $table — 做种表格的 jQuery 对象（#ka1 table）
     */
    function addDataColUserdetailsTable($table) {
        var i_T, i_S, i_N;
        var $rows = $table.find('tr');

        if ($rows.length < 2) return;  // 至少需要表头 + 一行数据

        // 第一步：通过图标识别种子大小列和做种人数列
        $rows.first().children('td').each(function (col) {
            if ($(this).find('img.size').length) {
                i_S = col;
            } else if ($(this).find('img.seeders').length) {
                i_N = col;
            }
        });

        if (i_S === undefined || i_N === undefined) {
            console.log('[PTMyBonusCalc] 无法识别 userdetails 做种表格的 size/seeders 列，跳过。');
            return;
        }

        // 第二步：通过数据行中的日期格式识别时间列（格式：YYYY-MM-DD）
        $rows.each(function (row) {
            if (row === 0) return;  // 跳过表头
            var $this = $(this);
            $this.children('td').each(function (col) {
                if ($(this).text().match(/\d{4}-\d{2}-\d{2}/)) {
                    i_T = col;
                    return false;  // break inner loop
                }
            });
            if (i_T !== undefined) return false;  // break outer loop
        });

        if (i_T === undefined) {
            console.log('[PTMyBonusCalc] 无法识别 userdetails 做种表格的时间列，跳过。');
            return;
        }

        // 第三步：检查是否已经添加过 B|A@A/GB 列（翻页时表格内容被替换，需重新添加）
        var $headerLastTd = $rows.first().children('td:last');
        var alreadyAdded = $headerLastTd.text().indexOf('B|A@A/GB') !== -1;

        if (!alreadyAdded) {
            // 首次添加：在表头最后一列前插入 B|A@A/GB 列标题
            $rows.first().children("td:last").before(
                '<td class="colhead" align="center" title="时魔|A值@每GB的A值">B|A@A/GB</td>'
            );
        }

        // 第四步：为每行数据计算并插入 B|A@A/GB
        $rows.each(function (row) {
            if (row === 0) return;  // 跳过表头
            var $this = $(this);
            var textA = makeA($this, i_T, i_S, i_N);
            if (alreadyAdded) {
                // 翻页更新：只替换内容
                $this.children("td:last").html(textA);
            } else {
                // 首次添加：插入新列
                $this.children("td:last").before('<td class="rowfollow" align="center">' + textA + '</td>');
            }
        });
    }

    /**
     * 设置 MutationObserver 监听 userdetails 页面做种表格容器的 DOM 变化。
     *
     * 做种表格包裹在 div#ka1[data-type='seeding'] 中，初始为 display:none 且空内容。
     * 用户点击"显示/隐藏"后 AJAX 加载表格，翻页时也会替换表格内容。
     * Observer 监听 #ka1 的子节点变化，当检测到 <table> 元素时进行处理。
     */
    function setupUserdetailsObserver() {
        var $container = $('#ka1');
        if (!$container.length) {
            console.log('[PTMyBonusCalc] 未找到做种表格容器 #ka1');
            return;
        }

        // 如果表格已存在（页面已展开），立即处理
        var $existingTable = $container.find('table');
        if ($existingTable.length) {
            addDataColUserdetailsTable($existingTable);
        }

        // 使用 MutationObserver 监听后续的 AJAX 加载和翻页
        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // 查找新增节点中的表格
                    mutation.addedNodes.forEach(function (node) {
                        if (node.tagName === 'TABLE') {
                            addDataColUserdetailsTable($(node));
                        } else if (node.querySelectorAll) {
                            var $tables = $(node).find('table');
                            $tables.each(function () {
                                addDataColUserdetailsTable($(this));
                            });
                        }
                    });
                }
            });
        });

        observer.observe($container[0], { childList: true, subtree: true });
        console.log('[PTMyBonusCalc] userdetails 做种表格监听已启动');
    }

    // ---------------- 通用站点（NexusPHP架构）：添加 B|A@A/GB 列 ----------------
    function addDataColGeneral() {
        var i_T, i_S, i_N
        $(seedTableSelector).each(function (row) {
            var $this = $(this);
            if (row == 0) {
                // 第一行是表头：通过图标识别各列的含义
                $this.children('td').each(function (col) {
                    if ($(this).find('img.time').length) {
                        i_T = col        // 发布时间列
                    } else if ($(this).find('img.size').length) {
                        i_S = col        // 体积列
                    } else if ($(this).find('img.seeders').length) {
                        i_N = col        // 做种人数列
                    }
                })
                if (!i_T || !i_S || !i_N) {
                    // 未能识别种子表格列（非 NexusPHP 页面），静默退出
                    console.log('[PTMyBonusCalc] 未检测到 NexusPHP 种子表格，跳过。');
                    return
                }
                // 确认是 NexusPHP 站点后，检查魔力值参数是否就绪
                if (!argsReady) {
                    alert("未找到魔力值参数，请先打开魔力值系统说明页面获取（/mybonus）");
                    return
                }
                // 在表头最后一列前插入新列标题
                $this.children("td:last").before("<td class=\"colhead\" title=\"时魔|A值@每GB的A值\">B|A@A/GB</td>");
            } else {
                // 数据行：计算并插入 A@A/GB
                var textA = makeA($this, i_T, i_S, i_N)
                $this.children("td:last").before("<td class=\"rowfollow\">" + textA + "</td>");
            }
        })
    }

    // ---------------- M-Team 站点特殊处理：添加 B|A@A/GB 列 ----------------
    // M-Team 使用自定义 UI 框架（非 NexusPHP），DOM 结构不同，需单独处理
    function addDataColMTeam() {
        let i_T, i_S, i_N, addFlag = false

        // 通过表格列数计算列索引（M-Team 种子表格固定列顺序，从右往左推）
        let colLen = $('div.mt-4>table>thead>tr>th').length
        // 检查是否已添加过 B|A@A/GB 列（页面局部刷新后更新而非新增）
        if ($('div.mt-4>table>thead>tr>th:last').text().indexOf('B|A@A/GB') != -1) {
            addFlag = true
            colLen -= 1   // 排除已添加的列
        }
        // M-Team 表格最后几列依次为：... | 发布时间 | 体积 | 做种数 | 下载数 | 完成数
        i_T = colLen - 5  // 发布时间
        i_S = colLen - 4  // 体积
        i_N = colLen - 3  // 做种数

        // 首次执行时添加表头
        if (!addFlag) {
            // 确认参数就绪后再添加表头（避免显示 NaN）
            if (!argsReady) {
                alert("未找到魔力值参数，请先打开魔力值系统说明页面获取（/mybonus）");
                return
            }
            $('div.mt-4>table>thead>tr>th:last').after(
                "<th class=\"border-0 border-b border-solid border-[--mt-line-color] p-2 \" " +
                "style=\"width: 130px;\" title=\"时魔|A值@每GB的A值\"> " +
                "<div class=\"action\">B|A@A/GB</div>  </th>");
        }

        // 遍历每行种子数据
        $(seedTableSelector).each(function (row) {
            var $this = $(this);
            var textA = makeA($this, i_T, i_S, i_N)
            let tdTextA = "<td class=\"border-0 border-b border-solid border-[--mt-line-color] p-0 \" align=\"center\">"
                + textA + "</td>"
            if (addFlag) {
                // 已存在列时只更新内容（页面局部刷新场景）
                $this.children("td:last").html(textA)
            } else {
                // 首次添加整列
                $this.children("td:last").after(tdTextA)
            }
        })
    }

    // 根据站点类型选择不同的表格处理方式
    if (isMTeam) {
        addDataColMTeam()
    } else {
        addDataColGeneral()
    }
}


/**
 * M-Team 站点页面加载检测器。
 *
 * M-Team 使用 SPA（单页应用）架构，页面内导航（如翻页、切换分类）
 * 不会触发完整的页面刷新，而是通过 DOM 局部更新实现。
 * 因此需要轮询检测 DOM 变化，等待种子表格加载完成后再执行计算。
 *
 * 检测逻辑分三步：
 *   1. 等待页面出现"加载中"的模糊遮罩（ant-spin-blur）
 *   2. 等待遮罩消失（表示数据加载完成）
 *   3. 确认种子表格已渲染完毕
 *   以上任一步超过最大等待次数也会强制继续，避免无限等待。
 */
function MTteamWaitPageLoadAndRun() {
    let $ = jQuery
    let count = 0
    let tableBlured = false
    let T0Found = false
    let seedTableFound = false

    // 页面局部刷新后重新判断当前是否在 mybonus 页面
    isMybonusPage = window.location.toString().indexOf("mybonus") != -1

    // 第一层轮询：等待魔力值参数元素或种子表格出现
    let itv = setInterval(() => {
        if (isMybonusPage) {
            T0Found = $("li:has(b:contains('T0'))")[1]
        }
        if (T0Found || seedTableFound || count >= 100) {
            clearInterval(itv);
            run()
        }
        count++
    }, 100);

    // 第二层轮询：检测表格是否进入加载状态（出现模糊遮罩）
    let count2 = 0
    let itvTableBlur = setInterval(() => {
        if ($('div.ant-spin-blur')[0] || count2 >= 50) {
            tableBlured = true
            clearInterval(itvTableBlur)
        }
        count2++
    }, 100)

    // 第三层轮询：检测表格加载完成（遮罩消失），确认种子表数据行已渲染
    let count3 = 0
    let itvTableUnblur = setInterval(() => {
        if (tableBlured && !$('div.ant-spin-blur')[0] || count3 >= 100) {
            seedTableFound = $(seedTableSelector)[1]  // [1] 获取第二行（第一行是表头）
            if (seedTableFound || count3 >= 100) {
                clearInterval(itvTableUnblur)
            }
        }
        count3++
    }, 100)
}

// ==================== 脚本入口 ====================

// 提取主机名（二级域名.顶级域名），用作存储键名
let host = window.location.host.match(/\b[^\.]+\.[^\.]+$/)[0]

// 检测是否为 M-Team（需要特殊处理 SPA 导航和不同的 DOM 结构）
let isMTeam = window.location.toString().indexOf("m-team") != -1

// 种子表格选择器：M-Team 和通用 NexusPHP 站点不同
let seedTableSelector = isMTeam ? 'div.mt-4>table>tbody>tr' : '.torrents:last-of-type>tbody>tr'

// 检测是否在魔力值系统说明页面
let isMybonusPage = window.location.toString().indexOf("mybonus") != -1
// TJUPT 的魔力值页面 URL 不同，特殊处理
if (window.location.toString().indexOf("tjupt.org") != -1) {
    isMybonusPage = window.location.toString().indexOf("bonus.php") != -1
}

// 检测是否在用户详情页面（userdetails.php）
let isUserdetailsPage = window.location.toString().indexOf("userdetails") != -1

// M-Team 仅在 mybonus 或 browse 页面运行（其他页面无种子列表）
if (isMTeam) {
    if (isMybonusPage || window.location.toString().indexOf("browse") != -1) {
        MTteamWaitPageLoadAndRun()
    }
} else {
    run()
}

// 监听 URL 变化（用于 M-Team SPA 页面内的局部导航刷新）
// window.onurlchange 是 Tampermonkey 提供的 API，检测 AJAX 驱动的 URL 变化
var currentUrl = window.location.href;
if (window.onurlchange === null) {
    window.addEventListener('urlchange', (info) => MTteamWaitPageLoadAndRun());
}
