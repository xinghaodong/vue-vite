/**
 * ========================================================================
 * 文件名称: formula.js
 * 所属模块: 动态表单公式与计算引擎 (Formula Helpers)
 * 功能说明:
 *   提供类似 Excel 的开箱即用函数库，供表单计算字段使用。
 *   内置安全判空、数据类型转换与边界异常防御，杜绝 NaN 报错与崩溃。
 * ========================================================================
 */

/**
 * 1. 日期计算函数：DATEDIF(startDate, endDate, unit)
 * @param {string|number|Date} start 开始日期
 * @param {string|number|Date} end 结束日期
 * @param {string} unit 单位: 'd' (天, 默认), 'h' (小时), 'm' (分钟)
 * @returns {number} 相隔的时间差数值
 */
export const DATEDIF = (start, end, unit = 'd') => {
    if (!start || !end) return 0;
    const tStart = new Date(start).getTime();
    const tEnd = new Date(end).getTime();
    if (isNaN(tStart) || isNaN(tEnd)) return 0;

    const diffMs = tEnd - tStart;
    if (unit === 'h') {
        return Number((diffMs / (1000 * 60 * 60)).toFixed(1));
    }
    if (unit === 'm') {
        return Math.round(diffMs / (1000 * 60));
    }
    // 默认按天计算
    return Number((diffMs / (1000 * 60 * 60 * 24)).toFixed(1));
};

/**
 * 2. 安全求和函数：SUM(...args)
 * 自动忽略空值/非数值，杜绝 JavaScript 字符串拼接 Bug ("25" + 5 = "255")
 */
export const SUM = (...args) => {
    return args.reduce((acc, curr) => {
        const val = Number(curr);
        return acc + (isNaN(val) ? 0 : val);
    }, 0);
};

/**
 * 3. 安全乘法函数：MULTIPLY(...args)
 * 自动防 NaN，并进行基础精度修约
 */
export const MULTIPLY = (...args) => {
    if (args.length === 0) return 0;
    const res = args.reduce((acc, curr) => {
        const val = Number(curr);
        return acc * (isNaN(val) ? 0 : val);
    }, 1);
    return Number(res.toFixed(2));
};

/**
 * 4. 三元条件判断：IF(condition, valTrue, valFalse)
 */
export const IF = (condition, valTrue, valFalse) => {
    return condition ? valTrue : valFalse;
};

/**
 * 5. 安全四舍五入：ROUND(num, precision)
 */
export const ROUND = (num, precision = 2) => {
    const val = Number(num);
    if (isNaN(val)) return 0;
    return Number(val.toFixed(precision));
};

/**
 * 导出公式沙箱执行环境
 */
export const formulaHelpers = {
    DATEDIF,
    SUM,
    MULTIPLY,
    IF,
    ROUND,
};

/**
 * 预设函数模板目录（供设计器界面展示与点击插入）
 */
export const presetFunctions = [
    {
        name: 'DATEDIF',
        label: '天数差 DATEDIF',
        template: 'DATEDIF(startDate, endDate) + 1',
        desc: '计算两个日期的相差天数（+1表示包含当天）',
    },
    {
        name: 'SUM',
        label: '求和 SUM',
        template: 'SUM(fieldA, fieldB)',
        desc: '多个数值安全累加，自动处理数字转换',
    },
    {
        name: 'MULTIPLY',
        label: '乘积 MULTIPLY',
        template: 'MULTIPLY(price, count)',
        desc: '数值相乘（如单价 * 数量），自动防浮点数精度丢失',
    },
    {
        name: 'ROUND',
        label: '四舍五入 ROUND',
        template: 'ROUND(amount, 2)',
        desc: '保留指定小数位数（默认保留2位）',
    },
    {
        name: 'IF',
        label: '条件判断 IF',
        template: 'IF(days > 3, 100, 50)',
        desc: '条件满足时返回前一个值，否则返回后一个值',
    },
];
