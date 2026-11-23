/**
 * 平興數枝扭蛋機 - 獨立名單資料檔 (roster.js)
 * ------------------------------------------------------------
 * 修改方式：
 * 1. 直接編輯下方 GACHA_RAW_DATA 中的名單（格式：分組[Tab]班級[Tab]座號[Tab]姓名）
 *    可直接從 Excel / Google 試算表選取四欄複製貼上！
 * 2. 或前往 roster.html 頁面進行視覺化檢視與編輯後匯出覆蓋本檔案。
 */

window.GACHA_RAW_DATA = `分組	班級	座號	姓名
7A	701	15	沈品孜
7A	704	10	楊詠安
7A	704	18	陳玄芮
7B	709	22	彭唯喬
7B	710	12	羅裔甯
8A	803	17	許羽昀
8A	808	10	黃以理
8A	808	27	盧映彤
8A	811	13	饒閔元
8B	801	14	吳采薇
8B	801	17	林少筠
8B	805	2	余侑霖
8B	806	2	吳昱穎
8C	812	13	顏楷恩
8C	813	27	鍾妍瑾
8C	814	11	賴韋諺
8C	815	5	柯炳綸
9A	902	2	宋泓錡
9A	902	29	朱宸緯
9A	903	29	王彤綺
9A	903	19	李紫晴
9B	907	6	陳彥澄
9B	907	8	温傑宇
9B	909	25	温欣庭
9B	912	29	龐羽彤`;

window.GACHA_ROSTER_STORAGE_KEY = 'psjh_gacha_custom_roster_v1';

/**
 * 將 TSV 文字解析為學生陣列
 */
window.parseGachaRawData = function (rawText) {
    const lines = (rawText || '').trim().split(/\r?\n/);
    const list = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        // 跳過標題列
        if (i === 0 && line.startsWith('分組')) continue;
        const parts = line.split(/\t|,/);
        if (parts.length >= 4) {
            const [group, classNum, seatNum, name] = parts;
            if (group.trim() && name.trim()) {
                list.push({
                    group: group.trim(),
                    classNum: classNum.trim(),
                    seatNum: seatNum.trim(),
                    name: name.trim(),
                    drawn: false
                });
            }
        }
    }
    return list;
};

/**
 * 取得目前生效的名單（若有在 roster.html 自訂並儲存於 localStorage 則優先使用）
 */
window.getActiveGachaRoster = function () {
    try {
        const customRaw = localStorage.getItem(window.GACHA_ROSTER_STORAGE_KEY);
        if (customRaw && customRaw.trim()) {
            const parsed = window.parseGachaRawData(customRaw);
            if (parsed.length > 0) {
                return { students: parsed, isCustom: true, rawText: customRaw };
            }
        }
    } catch (e) {
        // 忽略 localStorage 存取錯誤
    }
    return {
        students: window.parseGachaRawData(window.GACHA_RAW_DATA),
        isCustom: false,
        rawText: window.GACHA_RAW_DATA
    };
};
