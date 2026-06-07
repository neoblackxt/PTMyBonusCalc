// ==UserScript==
// @name         PT站点魔力计算器
// @namespace    https://github.com/neoblackxt/PTMyBonusCalc
// @version      2.1.0
// @description  在使用NexusPHP架构的PT站点显示每个种子的A值和每GB的A值。
// @author       neoblackxt, LaneLau
// @require      https://cdn.jsdelivr.net/npm/jquery@3/dist/jquery.min.js
// @require      https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js
// @require      https://cdn.jsdelivr.net/npm/toastify-js
// @require      https://cdn.jsdelivr.net/npm/crypto-js@4.2.0/crypto-js.min.js
// @resource     TOASTIFY_CSS https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @match        *://*.beitai.pt/torrents*
// @match        *://*.pttime.org/torrents*
// @match        *://*.ptsbao.club/torrents*
// @match        *://*.pthome.net/torrents*
// @match        *://kp.m-team.cc/*
// @match        *://zp.m-team.io/*
// @match        *://*.hddolby.com/torrents*
// @match        *://*.leaguehd.com/torrents*
// @match        *://*.hdhome.org/torrents*
// @match        *://*.hdsky.me/torrents*
// @match        *://*.ourbits.club/torrents*
// @match        *://*.u2.dmhy.org/torrents*
// @match        *://*.hdzone.me/torrents*
// @match        *://*.hdatmos.club/torrents*
// @match        *://*.pt.soulvoice.club/torrents*
// @match        *://*.pt.soulvoice.club/live*
// @match        *://*.discfan.net/torrents*
// @match        *://*.hdtime.org/torrents*
// @match        *://*.nicept.net/torrents*
// @match        *://*.pterclub.com/torrents*
// @match        *://*.hdarea.co/torrents*
// @match        *://*.hdfans.org/torrents*
// @match        *://pt.btschool.club/torrents*
// @match        *://*.1ptba.com/torrents*
// @match        *://www.oshen.win/torrents*
// @match        *://*.rousi.zip/torrents*
// @match        *://*.kufei.org/torrents*
// @match        *://*.tjupt.org/torrents*
// @match        *://*.tjupt.org/bonus*
// @match        *://*/mybonus*
// @license      GPL License
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        window.onurlchange
// ==/UserScript==

// ave不同范围对应的颜色及字重
const colorsOfAVE = [
    // null表示使用默认颜色和字重
    {min: 0, max: 1, color: null, fontWeight: null}, // 黑色
    {min: 1, max: 1.5, color: '#00008B', fontWeight: 700}, // 蓝色
    {min: 1.5, max: 2, color: '#8B4513', fontWeight: 800}, // 棕色
    {min: 2, max: Infinity, color: '#ff0000', fontWeight: 900} // 红色
]

const siteInfo = [
    {
        name: "tjupt",
        host: ["tjupt.org", "tju.pt"],
        bonusPage: "/bonus.php?show=description",
        torrentListPage: "/torrents.php"
    }, {
        name: "m-team",
        host: ["kp.m-team.cc", "zp.m-team.io"],
        bonusPage: "/mybonus",
        torrentListPage: "/browse"
    }
];

let site;

function getParamsFromBonusPage() {
    let argsReady = true;
    let siteName = site.name;
    let T0 = GM_getValue(siteName + ".T0");
    let N0 = GM_getValue(siteName + ".N0");
    let B0 = GM_getValue(siteName + ".B0");
    let L = GM_getValue(siteName + ".L");
    if (!(T0 && N0 && B0 && L)) {
        argsReady = false
    }
    let newT0, newN0, newB0, newL;
    try {
        newT0 = parseInt($("li:has(b:contains('T0'))")[1].innerText.split(" = ")[1]);
        newN0 = parseInt($("li:has(b:contains('N0'))")[1].innerText.split(" = ")[1]);
        newB0 = parseInt($("li:has(b:contains('B0'))")[1].innerText.split(" = ")[1]);
        newL = parseInt($("li:has(b:contains('L'))")[1].innerText.split(" = ")[1]);
        console.log('数据提取成功:', newT0, newN0, newB0, newL);
    } catch (error) {
        console.error('数据提取过程中出现错误:', error);
        return null;
    }

    if (!argsReady || newT0 !== T0 || newN0 !== N0 || newB0 !== B0 || newL !== L) {
        Toastify({
            text: "魔力值参数已更新",
            duration: 3000,
            close: true
        }).showToast()
        GM_setValue(siteName + ".T0", newT0);
        GM_setValue(siteName + ".N0", newN0);
        GM_setValue(siteName + ".B0", newB0);
        GM_setValue(siteName + ".L", newL);
    }
    return {T0: newT0, N0: newN0, B0: newB0, L: newL};
}

function drawChart(bonusParams) {

    let B0 = bonusParams.B0;
    let L = bonusParams.L;

    function calcB(A) {
        return B0 * (2 / Math.PI) * Math.atan(A / L)
    }

    //从B值反推A值
    function calcAbyB(B) {
        return Math.tan(B / B0 / (2 / Math.PI)) * L
    }

    let A = isMTeam ? 0 : parseFloat($("div:contains(' (A = ')")[0].innerText.split(" = ")[1]);
    let B = isMTeam ? parseFloat($("td:contains('基本獎勵')+td+td")[0].innerText) : calcB(A);
    // 剔除M-Team的基本奖励中做种数奖励
    if (isMTeam) {
        let matches = $("h5:contains('做種每小時將得到如下的魔力值')").next().children().first().text()
            .match(/(\d+(\.\d+)?)個魔力值.*最多計(\d+)個/);
        let seedingBonusPerSeed = parseFloat(matches[1]);
        let seedingBonusLimit = parseInt(matches[3]);
        let currentSeedingNode = $("span:contains('當前活動')").parent().clone();
        currentSeedingNode.find('img').replaceWith(function () {
            return "img";
        });
        let currentSeeding = parseInt(currentSeedingNode.text().match(/(\d+)/)[1]);
        B = B - (currentSeeding > seedingBonusLimit ?
            seedingBonusPerSeed * seedingBonusLimit : seedingBonusPerSeed * currentSeeding);
    }
    // 对于M-Team，B>B0是因为网页获取的基本奖励包括了做种数的奖励，上面代码已经进行排除。
    // 其他站暂不明确是否有该问题，下面一行的代码暂时保留
    B = B >= B0 ? B0 * 0.98 : B
    if (isMTeam) {
        A = calcAbyB(B);
    }
    GM_setValue(site.name + ".A", A);

    let spot = [A, B]

    let data = []
    for (let i = 0; i < (1.1 * A > 25 * L ? 1.1 * A : 25 * L); i = i + L / 4) {
        data.push([i, calcB(i)])
    }

    let insertPos = isMTeam ? $("ul+table") : $("table+h1")
    insertPos.before('<div id="main" style="width: 600px;height:400px; margin:auto;"></div>')

    var myChart = echarts.init(document.getElementById('main'));
    // 指定图表的配置项和数据
    var option = {
        title: {
            text: 'B - A 图',
            top: 'bottom',
            left: 'center'
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'cross'
            },
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            valueFormatter: function (value) {
                return value.toFixed(2);
            }
        },
        xAxis: {
            name: 'A',
        },
        yAxis: {
            name: 'B'
        },
        axisPointer: {
            label: {
                backgroundColor: '#777'
            }
        },
        series: [
            {
                type: 'line',
                data: data,
                showSymbol: false
            },
            {
                type: 'line',
                data: [spot],
                symbolSize: 6
            }
        ]
    };

    // 使用刚指定的配置项和数据显示图表。
    myChart.setOption(option);
}

function run() {
    var $ = jQuery;
    site = siteInfo.find(site => site.host.includes(window.location.host));
    // 未在预设站点中找到，使用默认配置
    if (!site) {
        const mybonusLinks = $("a:contains('使用')");
        let targetHref = mybonusLinks.length > 0 ? mybonusLinks.eq(0).prop("href") : null;
        if (targetHref) {
            let pathParts = targetHref.split("/");
            targetHref = pathParts.length > 0 ? "/" + pathParts[pathParts.length - 1] : null;
        }
        site = {
            name: host,
            host: [window.location.host],
            bonusPage: targetHref || "/mybonus.php",
            torrentListPage: "/torrents"
        }
    }
    if (window.location.href.includes(site.bonusPage)) {
        let bonusParams = getParamsFromBonusPage();
        if (!bonusParams) {
            return;
        }
        drawChart(bonusParams);
    } else if (window.location.href.includes(site.torrentListPage)) {
        addDataCol()
    }
}

function updateBonusParams() {
    let activeSeed = GM_getValue(site.name + ".activeSeed", -1);
    let nowActiveSeed = getActiveSeed();
    let paramStoreTime = GM_getValue(site.name + ".paramStoreTime", -1);
    if (activeSeed === nowActiveSeed && Date.now() - paramStoreTime < 1000 * 60 * 60 * 24) {
        return;
    }
    getParamsFromFetch();
}

function getActiveSeed() {
    if (isMTeam) {
        return parseInt($("div.ant-space-item:nth-child(8) > span:nth-child(1) > span:nth-child(3)")[0].innerText);
    } else {
        let infoTdHtml = $("span:contains('活动种子'), span:contains('当前活动')").parent().html();
        let match = infoTdHtml.match(/(?:活动种子|当前活动)[:：]<\/span>\s*<img.*>(\d+)\s*<img.*>(\d+)/);
        if (match && match.length > 2) {
            return parseInt(match[1]);
        } else {
            return -1;
        }
    }
}

function getParamsFromFetch() {

    let newT0, newN0, newB0, newL, a;

    if (isMTeam) {
        const secret = "HLkPcWmycL57mfJt";
        const timestamp = Date.now();
        const stringToSign = `POST&/api/tracker/mybonus&${timestamp}`;
        let sgin = CryptoJS.HmacSHA1(stringToSign, secret).toString(CryptoJS.enc.Base64);
        let formData = new FormData();
        formData.append("_timestamp", timestamp);
        formData.append("_sgin", sgin);
        let auth = localStorage.getItem("auth");
        fetch("https://api.m-team.cc/api/tracker/mybonus", {
            headers: {
                "authorization": auth
            },
            method: "POST",
            body: formData
        }).then(response => response.json()).then(data => {
            if (data.code !== "0" || !data.data) {
                return;
            }
            let bonusData = data.data;
            newT0 = parseFloat(bonusData.formulaParams.tzeroBonus);
            newN0 = parseFloat(bonusData.formulaParams.nzeroBonus);
            newB0 = parseFloat(bonusData.formulaParams.bzeroBonus);
            newL = parseFloat(bonusData.formulaParams.lbonus);
            a = parseFloat(bonusData.formulaParams.a);
            storageData();
        });
    } else {
        fetch(window.location.origin + site.bonusPage, {
            method: 'GET'
        }).then(response => response.text()).then(html => {
            let $html = $(html);
            newT0 = parseFloat($html.find("li:has(b:contains('T0'))")[1].innerText.split(" = ")[1]);
            newN0 = parseFloat($html.find("li:has(b:contains('N0'))")[1].innerText.split(" = ")[1]);
            newB0 = parseFloat($html.find("li:has(b:contains('B0'))")[1].innerText.split(" = ")[1]);
            newL = parseFloat($html.find("li:has(b:contains('L'))")[1].innerText.split(" = ")[1]);
            a = parseFloat($html.find("div:contains(' (A = ')")[0].innerText.split(" = ")[1]);
            storageData();
        });
    }

    function storageData() {
        let activeSeed = getActiveSeed();
        if (activeSeed !== -1) {
            GM_setValue(site.name + ".activeSeed", activeSeed);
        }
        GM_setValue(site.name + ".paramStoreTime", Date.now());
        GM_setValue(site.name + ".a", a);
        Toastify({
            text: "时魔参数已更新",
            duration: 3000,
            close: true
        }).showToast();
        let T0 = GM_getValue(site.name + ".T0");
        let N0 = GM_getValue(site.name + ".N0");
        let B0 = GM_getValue(site.name + ".B0");
        let L = GM_getValue(site.name + ".L");
        if (T0 === newT0 && N0 === newN0 && B0 === newB0 && L === newL) {
            addDataCol();
            return;
        }
        GM_setValue(site.name + ".T0", newT0);
        GM_setValue(site.name + ".N0", newN0);
        GM_setValue(site.name + ".B0", newB0);
        GM_setValue(site.name + ".L", newL);
        Toastify({
            text: "魔力值参数已更新",
            duration: 3000,
            close: true
        }).showToast();
        addDataCol();
    }
}

function addDataCol() {

    updateBonusParams();

    let siteName = site.name;
    let T0 = GM_getValue(siteName + ".T0");
    let N0 = GM_getValue(siteName + ".N0");
    let B0 = GM_getValue(siteName + ".B0");
    let L = GM_getValue(siteName + ".L");

    if (!(T0 && N0 && B0 && L)) {
        return;
    }

    function calcA(T, S, N) {
        let c1 = 1 - Math.pow(10, -(T / T0));
        // 当断种时，显示续种后的实际值，因为当前状态值无意义
        N = N ? N : 1;
        // 当前状态值，加入做种后实际值会小于当前值
        // TODO: 改为双行显示为当前值和实际值
        let c2 = 1 + Math.pow(2, .5) * Math.pow(10, -(N - 1) / (N0 - 1));
        return c1 * S * c2;
    }

    /**
     *
     * @param $this 种子的每一行
     * @param i_T 种子发布时间所在列
     * @param i_S 种子体积所在列
     * @param i_N 做种人数人数所在列
     */
    function makeA($this, i_T, i_S, i_N) {
        var time = $this.children('td:eq(' + i_T + ')').find("span").attr("title");
        // 适配m-team的发生时间
        if (time == undefined || time == "") {
            time = $this.children('td:eq(' + i_T + ')').find("span").text();
        }
        // 适配tjupt的发生时间
        if (time == undefined || time == "") {
            time = $this.children('td:eq(' + i_T + ')').html().replace("<br>", " ").trim();
        }
        var T = (new Date().getTime() - new Date(time).getTime()) / 1e3 / 86400 / 7;
        var size = $this.children('td:eq(' + i_S + ')').text().trim();
        var size_tp = 1;
        var S = size.replace(/[KMGT]i?B/, function (tp) {
            if (tp == "KB" || tp == "KiB") {
                size_tp = 1 / 1024 / 1024;
            } else if (tp == "MB" || tp == "MiB") {
                size_tp = 1 / 1024;
            } else if (tp == "GB" || tp == "GiB") {
                size_tp = 1;
            } else if (tp == "TB" || tp == "TiB") {
                size_tp = 1024;
            }
            return "";
        });
        S = parseFloat(S) * size_tp;
        //var number = $this.children('td:eq(' + i_N + ')').text().trim();
        var number = $this.children('td:eq(' + i_N + ')').text().trim().replace(/,/g, ''); // 获取人数，删除多余符号
        //console.log(number);
        var N = parseInt(number);
        var A = calcA(T, S, N);
        var ave = (A / S).toFixed(2);
        // tjupt的“魔力值详情”页面可以看到当前做种种子的A值，比对发现带“保种”标签种子的A值是公式计算A值的5倍
        if (site.name === "tjupt" && $this.find(".tag-keepseed").length !== 0) {
            A = 5 * A;
        }
        return {a: A, ave: ave, s: S};
    }

    function makeTextAve(ave) {
        for (const config of colorsOfAVE) {
            if (ave >= config.min && ave < config.max) {
                if (config.color || config.fontWeight) {
                    const styles = [];
                    if (config.color) {
                        styles.push(`color: ${config.color};`);
                    }
                    if (config.fontWeight) {
                        styles.push(`font-weight: ${config.fontWeight};`);
                    }
                    const styleString = styles.join('');
                    return `<span style="${styleString}">${ave}</span>`;
                }
                return `<span>${ave}</span>`;
            }
        }
        return `<span>${ave}</span>`;
    }

    let nowA = GM_getValue(site.name + ".a");
    let hasNowA = !isNaN(nowA);
    let aHeadText = hasNowA ? "时魔" : "A";
    let aTitle = hasNowA ? "当前做种状态下每小时可以获得的魔力值" : "A值";
    let aveHeadText = hasNowA ? "时魔/GB" : "A/GB";
    let aveTitle = hasNowA ? "当前做种状态下每GB每小时可以获得的魔力值" : "每GB的A值";

    function calcB(A) {
        return B0 * (2 / Math.PI) * Math.atan(A / L)
    }

    function calcDeltaB(a) {
        let nowB = calcB(nowA);
        let newB = calcB(a + nowA);
        return newB - nowB;
    }

    function addDataColGeneral() {
        let i_T, i_S, i_N;
        let calTHeadA = $("#calcTHeadA");
        let calTHeadAve = $("#calcTHeadAve");
        let addFlag = calTHeadA.length !== 0 && calTHeadAve.length !== 0;
        let thead = $(seedTableHeaderSelector);
        if (thead.length > 0) {
            detectAndAddHead(thead, "th");
        }
        $(seedTableSelector).each(function (row) {
            const $this = $(this);
            if (row === 0 && thead.length === 0) {
                detectAndAddHead($this, "td");
            } else {
                let {a, ave, s} = makeA($this, i_T, i_S, i_N);
                let textAve = makeTextAve(ave);
                if (hasNowA) {
                    let deltaB = calcDeltaB(a);
                    if (addFlag) {
                        const colA = $this.children(":nth-last-child(3)");
                        const colAve = $this.children(":nth-last-child(2)");
                        colA.html(deltaB.toFixed(2));
                        colA.attr('title', 'A: ' + a.toFixed(2));
                        colAve.html((deltaB / s).toFixed(2));
                        colAve.attr('title', 'A/GB: ' + ave);
                    } else {
                        $this.children("td:last").before('<td class="rowfollow" data-calc-a="' + deltaB + '" ' +
                            'title="A: ' + a.toFixed(2) + '">' + deltaB.toFixed(2) + '</td>',
                            '<td class="rowfollow" data-calc-ave="' + deltaB / s + '" title="A/GB: ' + ave + '">'
                            + (deltaB / s).toFixed(2) + '</td>');
                    }
                } else {
                    $this.children("td:last").before('<td class="rowfollow" data-calc-a="' + a +
                        '">' + a.toFixed(2) + '</td>', '<td class="rowfollow" data-calc-ave="' + ave +
                        '">' + textAve + '</td>');
                }
            }
        })

        function detectAndAddHead(head, cellTag) {
            head.children(cellTag).each(function (col) {
                if ($(this).find('img.time').length) {
                    i_T = col
                } else if ($(this).find('img.size').length) {
                    i_S = col
                } else if ($(this).find('img.seeders').length) {
                    i_N = col
                }
            })
            if (!i_T || !i_S || !i_N) {
                Toastify({
                    text: "未能找到数据列",
                    duration: 3000,
                    close: true
                }).showToast();
                return
            }
            if (!addFlag) {
                head.children(cellTag + ":last").before('<' + cellTag + ' class="colhead" style="cursor: pointer;" ' +
                    'id="calcTHeadA" title="' + aTitle + '">' + aHeadText + '</' + cellTag + '>',
                    '<' + cellTag + ' class="colhead" style="cursor: pointer;" ' +
                    'id="calcTHeadAve" title="' + aveTitle + '">' + aveHeadText + '</' + cellTag + '>');
            } else {
                $("#calcTHeadA").attr('title', aTitle);
                $("#calcTHeadAve").attr('title', aveTitle);
            }
            $('#calcTHeadA,#calcTHeadAve').off('click')
                .on('click', function () {
                    handleSortTable(this.id);
                });
        }

        sortTable();
    }

    function addDataColMTeam() {
        let i_T, i_S, i_N, addFlag = false

        let colLen = $('div.mt-4>table>thead>tr>th').length
        if ($('div.mt-4>table>thead>tr>th:last').attr('id') === "calcTHeadAve") {
            addFlag = true
            colLen -= 2
        }
        i_T = colLen - 5
        i_S = colLen - 4
        i_N = colLen - 3
        if (!addFlag) {
            $('div.mt-4>table>thead>tr>th:last')
                .after('<th class="border-0 border-b border-solid border-[--mt-line-color] p-2 " ' +
                    'style="width: 65px;cursor: pointer;" title="' + aTitle + '" id="calcTHeadA"> ' + aHeadText + ' </th>',
                    '<th class="border-0 border-b border-solid border-[--mt-line-color] p-2 " ' +
                    'style="width: 80px;cursor: pointer;" title="' + aveTitle + '" id="calcTHeadAve"> ' + aveHeadText + ' </th>');
        } else {
            $("#calcTHeadA").attr('title', aTitle);
            $("#calcTHeadAve").attr('title', aveTitle);
        }
        $('#calcTHeadA,#calcTHeadAve').off('click')
            .on('click', function () {
                handleSortTable(this.id);
            });
        $(seedTableSelector).each(function (row) {
            const $this = $(this);
            let {a, ave, s} = makeA($this, i_T, i_S, i_N)
            let tdTextA, tdTextAve, textAve, textA;
            if (hasNowA) {
                let deltaB = calcDeltaB(a);
                tdTextA = '<td class="border-0 border-b border-solid border-[--mt-line-color] p-0 " ' +
                    'align="center" data-from-calc="true" data-calc-a="' + deltaB + '" title="A: ' +
                    a.toFixed(2) + '">' + deltaB.toFixed(2) + '</td>';
                textA = deltaB.toFixed(2);
                textAve = (deltaB / s).toFixed(2);
                tdTextAve = '<td class="border-0 border-b border-solid border-[--mt-line-color] p-0 " ' +
                    'align="center" data-from-calc="true" data-calc-ave="' + (deltaB / s) + '" title="A/GB: ' +
                    ave + '">' + textAve + '</td>';
            } else {
                // data-from-calc用于判断该元素是否由脚本生成
                tdTextA = '<td class="border-0 border-b border-solid border-[--mt-line-color] p-0 " ' +
                    'align="center" data-from-calc="true" data-calc-a="' + a + '">'
                    + a.toFixed(2) + '</td>'
                textA = a.toFixed(2);
                textAve = makeTextAve(ave);
                tdTextAve = '<td class="border-0 border-b border-solid border-[--mt-line-color] p-0 " ' +
                    'align="center" data-from-calc="true" data-calc-ave="' + ave + '">'
                    + textAve + '</td>';
            }
            if ($this.children("td:last").data("fromCalc")) {
                $this.children(":nth-last-child(2)").html(textA);
                $this.children(":nth-last-child(2)").attr("title", a.toFixed(2));
                $this.children("td:last").html(textAve);
                $this.children("td:last").attr("title", ave);
            } else {
                $this.children("td:last").after(tdTextA, tdTextAve);
            }
        });
        sortTable();
    }

    let needStore = true;
    // 0表示未排序，1表示按a降序，2表示按a升序
    let aSortCounter = parseInt(sessionStorage.getItem("ptMyBonusCalcASortCounter")) || 0;
    // 0表示未排序，1表示按ave降序，2表示按ave升序
    let aveSortCounter = parseInt(sessionStorage.getItem("ptMyBonusCalcAveSortCounter")) || 0;
    // 1表示按a排序，2表示按ave排序
    let sortBy = parseInt(sessionStorage.getItem("ptMyBonusCalcSortBy")) || 0;

    function handleSortTable(id) {
        if (id === "calcTHeadA") {
            aSortCounter = (aSortCounter + 1) % 3;
            sessionStorage.setItem("ptMyBonusCalcASortCounter", aSortCounter);
            sortBy = 1;
            sessionStorage.setItem("ptMyBonusCalcSortBy", sortBy);
        } else if (id === "calcTHeadAve") {
            aveSortCounter = (aveSortCounter + 1) % 3;
            sessionStorage.setItem("ptMyBonusCalcAveSortCounter", aveSortCounter);
            sortBy = 2;
            sessionStorage.setItem("ptMyBonusCalcSortBy", sortBy);
        }
        sortTable();
    }

    function sortTable() {
        const $aHeader = $('#calcTHeadA');
        const $aveHeader = $('#calcTHeadAve');
        if (sortBy === 0) {
            $aHeader.html(aHeadText);
            $aveHeader.html(aveHeadText);
        }
        const $tbody = $aHeader.closest('table').children('tbody');
        let rows;
        if (isMTeam) {
            rows = $tbody.children('tr').toArray();
        } else {
           let $rows = $tbody.children('tr');
            if ($(seedTableHeaderSelector).length === 0) {
                // 如果站点将表头也放在tbody中，则排除第一行
                $rows = $rows.not(':first-child')
            }
            rows = $rows.toArray();
        }
        // 保存原始顺序
        if (needStore) {
            rows.forEach((row, index) => {
                $(row).data('originalIndex', index);
            });
            needStore = false;
        }
        rows.sort((rowA, rowB) => {
            if ((sortBy === 1 && aSortCounter === 0) || (sortBy === 2 && aveSortCounter === 0)) {
                $aHeader.html(aHeadText);
                $aveHeader.html(aveHeadText);
                return $(rowA).data('originalIndex') - $(rowB).data('originalIndex');
            } else if (sortBy === 1 && aSortCounter !== 0) {
                $aHeader.html(aSortCounter === 1 ? aHeadText + '↓' : aHeadText + '↑');
                $aveHeader.html(aveHeadText);
                const aOfA = parseFloat($(rowA).children().eq($aHeader.index()).data('calcA')) || 0;
                const aOfB = parseFloat($(rowB).children().eq($aHeader.index()).data('calcA')) || 0;
                let comparison = aOfA - aOfB;
                return aSortCounter === 1 ? comparison * -1 : comparison;
            } else if (sortBy === 2 && aveSortCounter !== 0) {
                $aveHeader.html(aveSortCounter === 1 ? aveHeadText + '↓' : aveHeadText + '↑');
                $aHeader.html(aHeadText);
                const aveOfA = parseFloat($(rowA).children().eq($aveHeader.index()).data('calcAve')) || 0;
                const aveOfB = parseFloat($(rowB).children().eq($aveHeader.index()).data('calcAve')) || 0;
                let comparison = aveOfA - aveOfB;
                return aveSortCounter === 1 ? comparison * -1 : comparison;
            }
        });
        rows.forEach(row => $tbody.append(row));
    }

    if (isMTeam) {
        addDataColMTeam()
    } else {
        addDataColGeneral()
    }
}

function mTeamWaitPageLoadAndRun() {
    let $ = jQuery;
    let contentObserver = new MutationObserver((mutationsList, observer) => {
        let isMybonusPage = window.location.toString().indexOf("mybonus") != -1
        let bonusPageReady = isMybonusPage && $("li:has(b:contains('T0'))").length > 1;
        let torrentListPageReady = !isMybonusPage && $(seedTableSelector).length > 1;
        if (bonusPageReady || torrentListPageReady) {
            observer.disconnect();
            run();
        }
    });
    let bodyObserver = new MutationObserver((mutationsList, observer) => {
        if (document.body) {
            observer.disconnect();
            contentObserver.observe(document.body, {childList: true, subtree: true});
        }
    });
    bodyObserver.observe(document, {childList: true, subtree: true});
}

let host = window.location.host.match(/\b[^\.]+\.[^\.]+$/)[0]
let isMTeam = window.location.toString().indexOf("m-team") != -1
let mTeamUrl
let seedTableHeaderSelector = '.torrents:last-of-type>thead>tr';
let seedTableSelector = isMTeam ? 'div.ant-spin-container:not(.ant-spin-blur)>div.mt-4>table>tbody>tr' : '.torrents:last-of-type>tbody>tr'
let isMybonusPage = window.location.toString().indexOf("mybonus") != -1
if (isMTeam) {
    if (isMybonusPage || window.location.toString().indexOf("browse") != -1) {
        mTeamUrl = window.location.toString()
        mTeamWaitPageLoadAndRun()
    }
} else {
    run()
}

if (window.onurlchange === null) {
    // M-Team 页面局部刷新时重新运行函数
    window.addEventListener('urlchange', (info) => {
        if (info.url !== mTeamUrl) {
            mTeamUrl = window.location.toString()
            mTeamWaitPageLoadAndRun();
        }
    });
}

GM_addStyle(GM_getResourceText("TOASTIFY_CSS"));
