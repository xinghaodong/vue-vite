/**
 * ========================================================================
 * 文件名称: useContourAlgorithm.js
 * 所属模块: 无人机集群编队系统 - 图像离散化与几何构型引擎
 * 功能说明:
 *   1. OTSU 自适应二值化；
 *   2. Moore-Neighbor 有序轮廓追踪 + 全局弧长配额采样；
 *   3. 确定性几何基元生成（爱心 / 星芒 / 星系 / 同心环）；
 *   4. 同参数、同输入必得同一点阵，点数严格等于目标架数。
 * ========================================================================
 */

import {
    dedupePoints,
    hashString,
    relaxClosePoints,
    resampleChainsExact,
    roundTo,
    sampleCurvesExact,
    selectEvenly,
    traceContours,
} from './swarmGeometry.js';

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function ensureExactCount(points, targetCount) {
    const target = Math.max(0, Math.floor(targetCount));
    const unique = dedupePoints(points, 4);
    if (unique.length >= target) return unique.slice(0, target);

    const result = unique.slice();
    let round = 1;
    while (result.length < target && unique.length > 0) {
        const base = unique[result.length % unique.length];
        const angle = GOLDEN_ANGLE * result.length + round;
        const radius = 0.01 * round;
        result.push({
            ...base,
            x: base.x + Math.cos(angle) * radius,
            y: base.y + Math.sin(angle) * radius,
        });
        if (result.length % unique.length === 0) round++;
    }
    return result;
}

export function useContourAlgorithm() {
    /**
     * OTSU 算法计算自适应最佳二值化阈值
     */
    function computeOtsuThreshold(data, width, height) {
        const totalPixels = width * height;
        const histogram = new Int32Array(256);

        for (let i = 0; i < data.length; i += 4) {
            const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
            histogram[gray]++;
        }

        let sumAll = 0;
        for (let t = 0; t < 256; t++) sumAll += t * histogram[t];

        let sumBackground = 0;
        let weightBackground = 0;
        let maxVariance = 0;
        let optimalThreshold = 128;

        for (let t = 0; t < 256; t++) {
            weightBackground += histogram[t];
            if (weightBackground === 0) continue;

            const weightForeground = totalPixels - weightBackground;
            if (weightForeground === 0) break;

            sumBackground += t * histogram[t];
            const meanBackground = sumBackground / weightBackground;
            const meanForeground = (sumAll - sumBackground) / weightForeground;
            const variance = weightBackground * weightForeground * Math.pow(meanBackground - meanForeground, 2);

            if (variance > maxVariance) {
                maxVariance = variance;
                optimalThreshold = t;
            }
        }

        return optimalThreshold;
    }

    /**
     * 从上传图片提取有序轮廓点位。点数严格 = targetCount。
     */
    async function extractPointsFromImage(img, targetCount = 800, options = {}) {
        const { fitWidth = 600, fitHeight = 600, invert = false, thresholdOffset = 0 } = options;

        const canvas = document.createElement('canvas');
        canvas.width = fitWidth;
        canvas.height = fitHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return [];

        const scale = Math.min(fitWidth / img.width, fitHeight / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const offsetX = (fitWidth - drawW) / 2;
        const offsetY = (fitHeight - drawH) / 2;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, fitWidth, fitHeight);
        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

        const { data } = ctx.getImageData(0, 0, fitWidth, fitHeight);
        const baseThreshold = computeOtsuThreshold(data, fitWidth, fitHeight);
        const threshold = Math.min(255, Math.max(0, baseThreshold + thresholdOffset));

        // 先建立完整二值网格，再交给 Moore 邻域追踪，避免隔行扫描造成断链。
        const binary = new Uint8Array(fitWidth * fitHeight);
        for (let y = 0; y < fitHeight; y++) {
            for (let x = 0; x < fitWidth; x++) {
                const idx = (y * fitWidth + x) * 4;
                const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
                const isForeground = invert ? gray > threshold : gray < threshold;
                binary[y * fitWidth + x] = isForeground ? 1 : 0;
            }
        }

        const chains = traceContours(binary, fitWidth, fitHeight, { minLength: 4, maxChains: 512 });
        if (chains.length === 0) {
            return generatePresetPattern('heart', targetCount);
        }

        const sampled = resampleChainsExact(chains, targetCount);
        const points = sampled.map((point, index) => ({
            id: `uav_${index + 1}`,
            x: roundTo(point.x - fitWidth / 2, 2),
            y: roundTo(-(point.y - fitHeight / 2), 2),
            z: 0,
            color: `rgb(${data[(Math.round(point.y) * fitWidth + Math.round(point.x)) * 4]}, ${data[(Math.round(point.y) * fitWidth + Math.round(point.x)) * 4 + 1]}, ${data[(Math.round(point.y) * fitWidth + Math.round(point.x)) * 4 + 2]})`,
        }));

        return ensureExactCount(points, targetCount);
    }

    /**
     * 确定性重采样。降采样保持原始点位顺序；升采样围绕局部点位做固定黄金角展开。
     */
    function resampleToTargetCount(points, targetCount) {
        const target = Math.max(0, Math.floor(targetCount));
        const clean = dedupePoints(points || [], 4);
        if (target === 0 || clean.length === 0) return [];
        if (clean.length === target) {
            return clean.map((point, index) => ({ ...point, id: `uav_${index + 1}` }));
        }

        if (clean.length > target) {
            return selectEvenly(clean, target).map((point, index) => ({
                ...point,
                id: `uav_${index + 1}`,
            }));
        }

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        for (const point of clean) {
            if (point.x < minX) minX = point.x;
            if (point.x > maxX) maxX = point.x;
            if (point.y < minY) minY = point.y;
            if (point.y > maxY) maxY = point.y;
        }
        const area = Math.max(1, (maxX - minX) * (maxY - minY));
        const localRadius = Math.max(0.05, Math.sqrt(area / clean.length) * 0.12);

        const baseCopies = Math.floor(target / clean.length);
        const extra = target % clean.length;
        const expanded = [];

        clean.forEach((point, pointIndex) => {
            const copies = baseCopies + (pointIndex < extra ? 1 : 0);
            for (let copy = 0; copy < copies; copy++) {
                if (copy === 0) {
                    expanded.push({ ...point });
                    continue;
                }
                const angle = GOLDEN_ANGLE * copy + (hashString(`${point.x}:${point.y}`) % 360) * (Math.PI / 180);
                const radius = localRadius * (0.35 + 0.2 * (copy - 1));
                expanded.push({
                    ...point,
                    x: roundTo(point.x + Math.cos(angle) * radius, 2),
                    y: roundTo(point.y + Math.sin(angle) * radius, 2),
                });
            }
        });

        const separated = relaxClosePoints(expanded, 1.55, 24).points;
        return ensureExactCount(separated, target).map((point, index) => ({
            ...point,
            id: `uav_${index + 1}`,
            color: point.color || '#00f2fe',
            z: point.z || 0,
        }));
    }

    /**
     * 数学几何母题预设生成器。多环/多臂 + 全局弧长配额，点数严格 = count。
     */
    function generatePresetPattern(type = 'heart', count = 800) {
        const target = Math.max(1, Math.floor(count));
        const curves = [];
        const scale = 14;

        const bandCount = target <= 400 ? 2 : target <= 800 ? 3 : target <= 1600 ? 5 : 8;

        if (type === 'heart') {
            for (let band = 0; band < bandCount; band++) {
                const bandScale = 1 - band * (0.3 / Math.max(1, bandCount - 1));
                const points = [];
                for (let i = 0; i < 2048; i++) {
                    const t = (i / 2048) * Math.PI * 2;
                    const x = 16 * Math.pow(Math.sin(t), 3) * scale * bandScale;
                    const y =
                        (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) *
                        scale *
                        bandScale;
                    points.push({ x, y });
                }
                curves.push({
                    points,
                    closed: true,
                    color: band % 2 === 0 ? '#ff2d55' : '#ff7597',
                });
            }
        } else if (type === 'star') {
            for (let band = 0; band < bandCount; band++) {
                const bandScale = 1 - band * (0.28 / Math.max(1, bandCount - 1));
                const points = [];
                for (let i = 0; i < 2048; i++) {
                    const t = (i / 2048) * Math.PI * 2;
                    const radius = (180 + Math.sin(t * 5) * 70) * bandScale;
                    points.push({ x: Math.cos(t) * radius, y: Math.sin(t) * radius });
                }
                curves.push({ points, closed: true, color: '#ffcc00' });
            }
        } else if (type === 'galaxy') {
            const arms = 3;
            const tracks = 2;
            for (let arm = 0; arm < arms; arm++) {
                for (let track = 0; track < tracks; track++) {
                    const points = [];
                    const pointsPerArm = 900;
                    const angleOffset = (arm * Math.PI * 2) / arms + track * 0.16;
                    for (let i = 0; i < pointsPerArm; i++) {
                        const t = i / (pointsPerArm - 1);
                        const angle = t * Math.PI * 4.2 + angleOffset;
                        const radius = 24 + t * 238 - track * 10;
                        points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
                    }
                    curves.push({
                        points,
                        closed: false,
                        color: arm === 0 ? '#00f2fe' : arm === 1 ? '#4facfe' : '#00c6ff',
                    });
                }
            }
        } else {
            const ringCount = Math.max(3, Math.min(8, Math.round(target / 350)));
            for (let ring = 0; ring < ringCount; ring++) {
                const radius = 80 + (ring * 180) / Math.max(1, ringCount - 1);
                const points = [];
                for (let i = 0; i < 1024; i++) {
                    const t = (i / 1024) * Math.PI * 2;
                    points.push({ x: Math.cos(t) * radius, y: Math.sin(t) * radius });
                }
                curves.push({ points, closed: true, color: '#00ffcc' });
            }
        }

        const sampled = sampleCurvesExact(curves, target);
        const separated = relaxClosePoints(sampled, 1.55, 40).points;
        const exact = ensureExactCount(separated, target);

        return exact.map((point, index) => ({
            id: `uav_${index + 1}`,
            x: roundTo(point.x, 2),
            y: roundTo(point.y, 2),
            z: type === 'galaxy' ? roundTo(Math.sin(index * 0.017) * 10, 2) : 0,
            color: point.color || '#00f2fe',
        }));
    }

    return {
        computeOtsuThreshold,
        extractPointsFromImage,
        generatePresetPattern,
        resampleToTargetCount,
    };
}
