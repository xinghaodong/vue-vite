/**
 * ========================================================================
 * 文件名称: useLedSafety.js
 * 所属模块: 无人机集群编队系统 - 机载 LED 光学物理安全防呆与色彩空间引擎
 * 功能说明:
 *   1. CIE Lab 工业色差模型 (ΔE 1976 / CIEDE2000 近似)，量化屏幕色与机载 LED 色差；
 *   2. LED 硬件安全防呆：
 *      - 亮度超过 90% 高负荷长明预警（避免格栅灯带光衰或散热失控）
 *      - 机载贴片 RGBW 常见色偏检测与校准映射
 *   3. 渐变物理空间正交投影插值器 (Direct-Manipulation Gradient Vector Engine)：
 *      - 计算点位在物理轴线上的标量投影 t
 *      - 多色标分段平滑插值 (Piecewise Linear Color Interpolation)
 * ========================================================================
 */

/**
 * 十六进制颜色转 RGB [0-255]
 * @param {string} hex
 * @returns {{ r: number, g: number, b: number }}
 */
export function hexToRgb(hex) {
    if (!hex) return { r: 0, g: 242, b: 254 };
    const clean = hex.replace('#', '').trim();
    if (clean.length === 3) {
        return {
            r: parseInt(clean[0] + clean[0], 16) || 0,
            g: parseInt(clean[1] + clean[1], 16) || 0,
            b: parseInt(clean[2] + clean[2], 16) || 0,
        };
    }
    return {
        r: parseInt(clean.substring(0, 2), 16) || 0,
        g: parseInt(clean.substring(2, 4), 16) || 0,
        b: parseInt(clean.substring(4, 6), 16) || 0,
    };
}

/**
 * RGB 转 Hex
 */
export function rgbToHex(r, g, b) {
    const clamp = (v) => Math.min(255, Math.max(0, Math.round(v)));
    const cr = clamp(r).toString(16).padStart(2, '0');
    const cg = clamp(g).toString(16).padStart(2, '0');
    const cb = clamp(b).toString(16).padStart(2, '0');
    return `#${cr}${cg}${cb}`;
}

/**
 * 计算感知亮度 (Rec. 601 标定)
 * @param {string} hex
 * @returns {number} 0 ~ 100
 */
export function calculateLuminance(hex) {
    const { r, g, b } = hexToRgb(hex);
    return Math.round(((0.299 * r + 0.587 * g + 0.114 * b) / 255) * 100);
}

/**
 * RGB 转 CIE XYZ 色彩空间 (D65 标准光源)
 */
function rgbToXyz(r, g, b) {
    let sR = r / 255;
    let sG = g / 255;
    let sB = b / 255;

    sR = sR > 0.04045 ? Math.pow((sR + 0.055) / 1.055, 2.4) : sR / 12.92;
    sG = sG > 0.04045 ? Math.pow((sG + 0.055) / 1.055, 2.4) : sG / 12.92;
    sB = sB > 0.04045 ? Math.pow((sB + 0.055) / 1.055, 2.4) : sB / 12.92;

    sR *= 100;
    sG *= 100;
    sB *= 100;

    const x = sR * 0.4124564 + sG * 0.3575761 + sB * 0.1804375;
    const y = sR * 0.2126729 + sG * 0.7151522 + sB * 0.0721750;
    const z = sR * 0.0193339 + sG * 0.1191920 + sB * 0.9503041;
    return { x, y, z };
}

/**
 * XYZ 转 CIE Lab (以 D65 为参考白点: Xn=95.047, Yn=100.0, Zn=108.883)
 */
function xyzToLab(x, y, z) {
    const xn = 95.047;
    const yn = 100.0;
    const zn = 108.883;

    let fx = x / xn;
    let fy = y / yn;
    let fz = z / zn;

    const epsilon = 0.008856;
    const kappa = 903.3;

    fx = fx > epsilon ? Math.cbrt(fx) : (kappa * fx + 16) / 116;
    fy = fy > epsilon ? Math.cbrt(fy) : (kappa * fy + 16) / 116;
    fz = fz > epsilon ? Math.cbrt(fz) : (kappa * fz + 16) / 116;

    const L = Math.max(0, 116 * fy - 16);
    const a = 500 * (fx - fy);
    const b = 200 * (fy - fz);
    return { L, a, b };
}

/**
 * 屏幕 RGB 转 CIE Lab
 */
export function hexToLab(hex) {
    const { r, g, b } = hexToRgb(hex);
    const { x, y, z } = rgbToXyz(r, g, b);
    return xyzToLab(x, y, z);
}

/**
 * 机载 LED 光学硬件特性映射模型
 * 仿真高亮贴片 RGBW LED 在非线性驱动下的实际发色（红蓝荧光偏色、高亮白光泛白）
 */
export function simulateDroneLedColor(hex) {
    const { r, g, b } = hexToRgb(hex);

    // 实机贴片 LED 光学特征曲线（绿光波长稍移、深橙偏红、暖黄容易发白）
    let ledR = r;
    let ledG = g;
    let ledB = b;

    // 强橙红区域 (如 #FF7B00) 在高功率 LED 下会因红光主波长占优而偏深红 (#FF2900)
    if (r > 200 && g > 60 && g < 180 && b < 50) {
        ledG = Math.round(g * 0.42); // 绿光衰减明显
    } else if (g > 200 && r < 100 && b < 100) {
        // 纯绿光易泛黄偏翠
        ledR = Math.min(255, Math.round(ledR + 25));
    } else if (b > 200 && r < 100 && g < 100) {
        // 纯深蓝容易变暗
        ledB = Math.max(160, Math.round(b * 0.9));
    }

    // 亮度限幅衰减
    const lum = (0.299 * ledR + 0.587 * ledG + 0.114 * ledB) / 255;
    if (lum > 0.9) {
        const scale = 0.9 / lum;
        ledR = Math.round(ledR * scale);
        ledG = Math.round(ledG * scale);
        ledB = Math.round(ledB * scale);
    }

    return rgbToHex(ledR, ledG, ledB);
}

/**
 * 计算 CIE 1976 ΔE 色差
 * @param {string} hexScreen 屏幕设计色
 * @param {string} hexLed 实机仿真色
 * @returns {number}
 */
export function calculateDeltaE(hexScreen, hexLed) {
    const lab1 = hexToLab(hexScreen);
    const lab2 = hexToLab(hexLed);
    const dL = lab1.L - lab2.L;
    const da = lab1.a - lab2.a;
    const db = lab1.b - lab2.b;
    const deltaE = Math.sqrt(dL * dL + da * da + db * db);
    return Math.round(deltaE * 10) / 10;
}

/**
 * 分析当前颜色的光学安全性与偏色等级
 * @param {string} colorHex
 */
export function analyzeLedSafety(colorHex) {
    const luminance = calculateLuminance(colorHex);
    const ledSimColor = simulateDroneLedColor(colorHex);
    const deltaE = calculateDeltaE(colorHex, ledSimColor);

    // 预警信息与等级
    let alertType = 'safe'; // 'safe' | 'warning' | 'danger'
    let alertMessage = '';

    if (luminance >= 90) {
        alertType = 'warning';
        alertMessage = '亮度超过 90%，格栅灯带长时间亮光有损耗风险，建议降低后使用。';
    } else if (deltaE >= 25.0) {
        alertType = 'danger';
        alertMessage = '当前偏色很严重，实际看板色偏差较大，不建议使用此设计色。';
    } else if (deltaE >= 12.0) {
        alertType = 'warning';
        alertMessage = '该颜色在无人机 LED 上可能出现明显偏色，建议做实机校准或改用推荐正色。';
    }

    return {
        luminance,
        ledSimColor,
        deltaE,
        alertType,
        alertMessage,
    };
}

/**
 * 默认渐变色标三色预设 (对标 SwarmStudio 工业原版: 翠绿 -> 青蓝 -> 深蓝)
 */
export const defaultGradientStops = [
    { offset: 0.0, color: '#2dff6a' },
    { offset: 0.52, color: '#00d6c8' },
    { offset: 1.0, color: '#2454ff' },
];

/**
 * 多色标序列分段线性插值 (Piecewise Linear Interpolation)
 * @param {Array<{offset: number, color: string}>} stops 有序色标
 * @param {number} t 归一化位置 0 ~ 1
 * @returns {string} 插值后的 Hex 颜色
 */
export function interpolateStops(stops, t) {
    if (!stops || stops.length === 0) return '#00f2fe';
    if (stops.length === 1) return stops[0].color;

    const clampedT = Math.max(0, Math.min(1, t));

    // 确保按 offset 升序排列
    const sorted = [...stops].sort((a, b) => a.offset - b.offset);

    if (clampedT <= sorted[0].offset) return sorted[0].color;
    if (clampedT >= sorted[sorted.length - 1].offset) return sorted[sorted.length - 1].color;

    // 定位区间
    let left = sorted[0];
    let right = sorted[sorted.length - 1];

    for (let i = 0; i < sorted.length - 1; i++) {
        if (clampedT >= sorted[i].offset && clampedT <= sorted[i + 1].offset) {
            left = sorted[i];
            right = sorted[i + 1];
            break;
        }
    }

    const span = right.offset - left.offset;
    const factor = span > 1e-6 ? (clampedT - left.offset) / span : 0;

    const rgb1 = hexToRgb(left.color);
    const rgb2 = hexToRgb(right.color);

    const r = rgb1.r + (rgb2.r - rgb1.r) * factor;
    const g = rgb1.g + (rgb2.g - rgb1.g) * factor;
    const b = rgb1.b + (rgb2.b - rgb1.b) * factor;

    return rgbToHex(r, g, b);
}

/**
 * 渐变物理空间正交投影计算器
 * @param {Array<{x: number, y: number, id: string|number}>} targetAgents
 * @param {{startX: number, startY: number, endX: number, endY: number}} axis 渐变轴线物理坐标
 * @param {Array<{offset: number, color: string}>} stops 色标列表
 * @param {boolean} repeat 是否循环渐变 (Repeat)
 * @returns {Map<string|number, string>} agentId -> hexColor
 */
export function computeGradientColors(targetAgents, axis, stops, repeat = false) {
    const result = new Map();
    if (!targetAgents || targetAgents.length === 0) return result;

    const vx = axis.endX - axis.startX;
    const vy = axis.endY - axis.startY;
    const lenSq = vx * vx + vy * vy;

    if (lenSq < 1e-6) {
        const fallback = stops && stops.length ? stops[0].color : '#00f2fe';
        for (const agent of targetAgents) {
            result.set(agent.id, fallback);
        }
        return result;
    }

    for (const agent of targetAgents) {
        const dx = agent.x - axis.startX;
        const dy = agent.y - axis.startY;

        // 正交投影标量: t = (D · V) / |V|^2
        let t = (dx * vx + dy * vy) / lenSq;

        if (repeat) {
            t = t - Math.floor(t);
        } else {
            t = Math.max(0, Math.min(1, t));
        }

        const color = interpolateStops(stops, t);
        result.set(agent.id, color);
    }

    return result;
}
