/**
 * ========================================================================
 * 文件名称: color.js
 * 所属模块: 主题颜色算法工具 (src/utils/color.js)
 * 功能说明:
 *   1. 纯原生线性 RGB 加权颜色混合算法，零外部依赖；
 *   2. 完美生成 Element Plus 所需的全部 10 个衍生主色变量；
 *   3. 深度自适应 Dark (暗黑) / Light (亮色) 双模式的对比度与背景融合。
 * ========================================================================
 */

/**
 * 标准化 Hex 颜色字符串为 6 位标准格式 (如 #fff -> #ffffff)
 * @param {string} color
 * @returns {string}
 */
export const normalizeHex = (color) => {
    let hex = color.trim().toLowerCase();
    if (hex.startsWith('#')) {
        hex = hex.slice(1);
    }
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }
    return `#${hex}`;
};

/**
 * 16 进制颜色转换为 RGB 数组 [r, g, b]
 * @param {string} hex
 * @returns {[number, number, number]}
 */
export const hexToRgb = (hex) => {
    const cleanHex = normalizeHex(hex).slice(1);
    const r = parseInt(cleanHex.slice(0, 2), 16) || 0;
    const g = parseInt(cleanHex.slice(2, 4), 16) || 0;
    const b = parseInt(cleanHex.slice(4, 6), 16) || 0;
    return [r, g, b];
};

/**
 * RGB 转换为标准 16 进制颜色字符串
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {string}
 */
export const rgbToHex = (r, g, b) => {
    const toHex = (c) => {
        const clamp = Math.max(0, Math.min(255, Math.round(c)));
        return clamp.toString(16).padStart(2, '0');
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

/**
 * 两个颜色按比例加权混合算法
 * @param {string} color1 源基色 (Hex)
 * @param {string} color2 混合目标色 (Hex，如白色或黑色)
 * @param {number} weight 目标色占比权重 (0 ~ 1)
 * @returns {string} 混合后的 Hex
 */
export const mixColor = (color1, color2, weight) => {
    const w = Math.max(0, Math.min(1, weight));
    const [r1, g1, b1] = hexToRgb(color1);
    const [r2, g2, b2] = hexToRgb(color2);

    const r = r1 * (1 - w) + r2 * w;
    const g = g1 * (1 - w) + g2 * w;
    const b = b1 * (1 - w) + b2 * w;

    return rgbToHex(r, g, b);
};

/**
 * 动态生成 Element Plus 主色及其全部衍生色阶变量字典
 * @param {string} primaryHex 主题主色 (如 #409EFF, #00B96B)
 * @param {boolean} isDark 是否处于暗黑模式
 * @returns {Record<string, string>}
 */
export const generateThemeColors = (primaryHex, isDark = false) => {
    if (!primaryHex) return {};
    const baseColor = normalizeHex(primaryHex);

    const colors = {
        '--el-color-primary': baseColor,
    };

    // 1. 深色加深态: dark-2 (与纯黑混合 20%)
    colors['--el-color-primary-dark-2'] = mixColor(baseColor, '#000000', 0.2);

    // 2. 浅色色阶: light-1 至 light-9
    // 在亮色模式下与白色混合；在暗黑模式下与暗夜底色 (#141414) 混合以避免惨白反光
    const blendTarget = isDark ? '#141414' : '#ffffff';

    for (let i = 1; i <= 9; i++) {
        colors[`--el-color-primary-light-${i}`] = mixColor(baseColor, blendTarget, i / 10);
    }

    return colors;
};

/**
 * 将生成的颜色变量直接写入 document.documentElement.style
 * @param {string} primaryHex
 * @param {boolean} isDark
 */
export const applyThemeColor = (primaryHex, isDark = false) => {
    if (!primaryHex || typeof document === 'undefined') return;
    const colors = generateThemeColors(primaryHex, isDark);
    const rootStyle = document.documentElement.style;

    Object.entries(colors).forEach(([key, val]) => {
        rootStyle.setProperty(key, val);
    });
};
