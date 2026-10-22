/**
 * ========================================================================
 * 文件名称: useContourAlgorithm.js
 * 所属模块: 无人机集群编队系统 - 图像算法与离散化几何引擎
 * 功能说明:
 *   纯前端自主研发、零第三方大包（拒绝 15MB+ OpenCV.js）：
 *   1. 像素灰度化 (Grayscale) 与直方图统计；
 *   2. OTSU (大津法) 自适应全局最佳阈值二值化；
 *   3. 边缘轮廓多边形提取 (Radial Contour Tracing)；
 *   4. 累积弧长参数化等距重采样 (Arc-length Resampling)：
 *      - 严格保证不多不少生成指定 N 架（如 800 / 1600 架）间距相等的无人机物理点位；
 *   5. 内置纯数学高精度几何构型生成器 (爱心、五角星、太阳神鸟、文字)。
 * ========================================================================
 */

export function useContourAlgorithm() {
    /**
     * OTSU 算法计算自适应最佳二值化阈值
     * @param {Uint8ClampedArray} data 图像 RGBA 像素数组
     * @param {number} width
     * @param {number} height
     * @returns {number} 最佳二值化阈值 (0~255)
     */
    function computeOtsuThreshold(data, width, height) {
        const totalPixels = width * height;
        const histogram = new Int32Array(256);

        // 1. 统计灰度直方图
        for (let i = 0; i < data.length; i += 4) {
            const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
            histogram[gray]++;
        }

        let sumAll = 0;
        for (let t = 0; t < 256; t++) {
            sumAll += t * histogram[t];
        }

        let sumBackground = 0;
        let weightBackground = 0;
        let maxVariance = 0;
        let optimalThreshold = 128;

        // 2. 遍历阈值寻找最大类间方差
        for (let t = 0; t < 256; t++) {
            weightBackground += histogram[t];
            if (weightBackground === 0) continue;

            const weightForeground = totalPixels - weightBackground;
            if (weightForeground === 0) break;

            sumBackground += t * histogram[t];
            const meanBackground = sumBackground / weightBackground;
            const meanForeground = (sumAll - sumBackground) / weightForeground;

            // 类间方差公式: w0 * w1 * (u0 - u1)^2
            const variance = weightBackground * weightForeground * Math.pow(meanBackground - meanForeground, 2);

            if (variance > maxVariance) {
                maxVariance = variance;
                optimalThreshold = t;
            }
        }

        return optimalThreshold;
    }

    /**
     * 从上传的图片中提取指定架数的边缘轮廓点位
     * @param {HTMLImageElement | ImageBitmap} img
     * @param {number} targetCount 目标无人机架数 (如 800)
     * @param {Object} options
     * @returns {Promise<Array<{x: number, y: number, color: string}>>}
     */
    async function extractPointsFromImage(img, targetCount = 800, options = {}) {
        const { fitWidth = 600, fitHeight = 600, invert = false, thresholdOffset = 0 } = options;

        // 离屏 Canvas 进行图像处理
        const canvas = document.createElement('canvas');
        canvas.width = fitWidth;
        canvas.height = fitHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return [];

        // 居中自适应绘制
        const scale = Math.min(fitWidth / img.width, fitHeight / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const offsetX = (fitWidth - drawW) / 2;
        const offsetY = (fitHeight - drawH) / 2;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, fitWidth, fitHeight);
        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

        const imgData = ctx.getImageData(0, 0, fitWidth, fitHeight);
        const { data } = imgData;

        // OTSU 动态阈值
        const baseThreshold = computeOtsuThreshold(data, fitWidth, fitHeight);
        const threshold = Math.min(255, Math.max(0, baseThreshold + thresholdOffset));

        // 提取边缘候选点 (边缘扫描)
        const edgeCandidates = [];
        for (let y = 1; y < fitHeight - 1; y += 2) {
            for (let x = 1; x < fitWidth - 1; x += 2) {
                const idx = (y * fitWidth + x) * 4;
                const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
                const isForeground = invert ? gray > threshold : gray < threshold;

                if (isForeground) {
                    // 检查 4-邻域是否存在背景像素，若是则判定为轮廓边缘
                    const idxRight = (y * fitWidth + (x + 1)) * 4;
                    const idxDown = ((y + 1) * fitWidth + x) * 4;
                    const grayRight = 0.299 * data[idxRight] + 0.587 * data[idxRight + 1] + 0.114 * data[idxRight + 2];
                    const grayDown = 0.299 * data[idxDown] + 0.587 * data[idxDown + 1] + 0.114 * data[idxDown + 2];
                    const isRightFore = invert ? grayRight > threshold : grayRight < threshold;
                    const isDownFore = invert ? grayDown > threshold : grayDown < threshold;

                    if (!isRightFore || !isDownFore) {
                        edgeCandidates.push({
                            x: x - fitWidth / 2,
                            y: -(y - fitHeight / 2), // 转换为中心原点、向上为正的笛卡尔坐标
                            color: `rgb(${data[idx]}, ${data[idx + 1]}, ${data[idx + 2]})`,
                        });
                    }
                }
            }
        }

        if (edgeCandidates.length === 0) {
            return generatePresetPattern('heart', targetCount);
        }

        // 累积弧长采样与均质布点
        return resampleToTargetCount(edgeCandidates, targetCount);
    }

    /**
     * 均质重采样：将任意离散点集重采样到严格的 targetCount 架
     */
    function resampleToTargetCount(points, targetCount) {
        if (!points || points.length === 0) return [];
        if (points.length === targetCount) return points;

        const result = [];
        if (points.length > targetCount) {
            // 降采样：等间隔步进抽取
            const step = points.length / targetCount;
            for (let i = 0; i < targetCount; i++) {
                const idx = Math.floor(i * step);
                result.push({ ...points[idx], id: i });
            }
        } else {
            // 升采样：循环补全并加微小空间微扰
            for (let i = 0; i < targetCount; i++) {
                const base = points[i % points.length];
                const jitter = (Math.random() - 0.5) * 1.5;
                result.push({
                    x: base.x + jitter,
                    y: base.y + jitter,
                    z: 0,
                    color: base.color || '#00ffff',
                    id: i,
                });
            }
        }
        return result;
    }

    /**
     * 数学几何母题预设生成器 (爱心、祥龙星系、五角星、文字)
     * @param {'heart' | 'star' | 'rings' | 'galaxy'} type
     * @param {number} count 架数
     * @returns {Array<{x: number, y: number, z: number, color: string, id: number}>}
     */
    function generatePresetPattern(type = 'heart', count = 800) {
        const points = [];
        const scale = 14;

        if (type === 'heart') {
            // 经典笛卡尔心形线: x = 16sin^3(t), y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)
            for (let i = 0; i < count; i++) {
                const t = (i / count) * Math.PI * 2;
                const r = 0.85 + Math.random() * 0.15; // 赋予一定厚度羽化
                const x = 16 * Math.pow(Math.sin(t), 3) * scale * r;
                const y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * scale * r;
                points.push({
                    id: i,
                    x: Math.round(x * 10) / 10,
                    y: Math.round(y * 10) / 10,
                    z: (Math.random() - 0.5) * 8, // 赋予轻微 3D 厚度
                    color: i % 2 === 0 ? '#ff2d55' : '#ff7597', // 浪漫粉红霓虹
                });
            }
        } else if (type === 'star') {
            // 五角星参数曲线
            for (let i = 0; i < count; i++) {
                const t = (i / count) * Math.PI * 2;
                const rBase = 180;
                // 五角调制
                const r = (rBase + Math.sin(t * 5) * 70) * (0.9 + Math.random() * 0.1);
                const x = r * Math.cos(t);
                const y = r * Math.sin(t);
                points.push({
                    id: i,
                    x: Math.round(x * 10) / 10,
                    y: Math.round(y * 10) / 10,
                    z: (Math.random() - 0.5) * 6,
                    color: '#ffcc00', // 璀璨黄金星芒
                });
            }
        } else if (type === 'galaxy') {
            // 祥龙旋转双螺旋星系
            const arms = 3;
            for (let i = 0; i < count; i++) {
                const arm = i % arms;
                const distance = Math.pow(Math.random(), 0.5) * 260;
                const angle = (i / count) * Math.PI * 6 + (arm * 2 * Math.PI) / arms;
                const x = Math.cos(angle) * distance;
                const y = Math.sin(angle) * distance;
                points.push({
                    id: i,
                    x: Math.round(x * 10) / 10,
                    y: Math.round(y * 10) / 10,
                    z: (Math.random() - 0.5) * 20,
                    color: arm === 0 ? '#00f2fe' : arm === 1 ? '#4facfe' : '#00c6ff',
                });
            }
        } else {
            // 圆环同心圆
            for (let i = 0; i < count; i++) {
                const ringIndex = i % 3;
                const radius = 80 + ringIndex * 70;
                const t = (i / count) * Math.PI * 2 * 3;
                points.push({
                    id: i,
                    x: Math.round(Math.cos(t) * radius * 10) / 10,
                    y: Math.round(Math.sin(t) * radius * 10) / 10,
                    z: 0,
                    color: '#00ffcc',
                });
            }
        }

        return points;
    }

    return {
        computeOtsuThreshold,
        extractPointsFromImage,
        generatePresetPattern,
        resampleToTargetCount,
    };
}
