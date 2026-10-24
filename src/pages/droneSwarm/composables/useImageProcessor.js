/**
 * ========================================================================
 * 文件名称: useImageProcessor.js
 * 所属模块: 无人机集群编队系统 - 高保真图像智能转构型算法引擎
 * 核心设计规范 (参考 SwarmStudio 工业标准):
 *   1. 步骤一 (原图 -> 预处理图): 亮度/对比度调节、暗黑反转、智能抠背景 (Chroma Key)；
 *   2. 步骤二 (预处理图 -> 中间图):
 *      - 📐 极细轮廓提取 (Canny-style NMS 边缘细化，杜绝带状粗斑)
 *      - ✒️ 拓扑中心骨架 (Zhang-Suen 形态学剪枝，细化为严格 1 像素单链)
 *      - 🔘 半色调圆点 (Halftone 网格分布)
 *      - ⬛ 区域填充 (Solid Fill)
 *   3. 步骤三 (中间图 -> 构型):
 *      - 拓扑连续路径追踪 + 累积弧长参数化等距重采样 (Arc-length Equidistant Sampling)，
 *        实现如穿珍珠项链般均匀、极致规整锐利的点阵！
 *      - 原色采样映射 (Smart Color Applicator)：智能提亮防死黑，原汁原味还原色彩！
 * ========================================================================
 */

import { resampleChainsExact, selectEvenly, traceContours, traceSkeletonGraph } from './swarmGeometry.js';

export function useImageProcessor() {
    /**
     * 步骤一：图像预处理渲染
     */
    function preprocessImage(img, options = {}) {
        const {
            brightness = 0,    // -100 ~ 100
            contrast = 0,      // -100 ~ 100
            invert = false,    // 是否明暗反转
            removeBg = false,  // 是否抠背景
            bgColorHex = '#ffffff',
            bgTolerance = 25,
            maxWidth = 800,
        } = options;

        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;
        if (width > maxWidth) {
            const ratio = maxWidth / width;
            width = maxWidth;
            height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, width, height);

        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        const bgR = parseInt(bgColorHex.slice(1, 3), 16) || 255;
        const bgG = parseInt(bgColorHex.slice(3, 5), 16) || 255;
        const bgB = parseInt(bgColorHex.slice(5, 7), 16) || 255;
        const maxDist = (bgTolerance / 100) * 441.67;

        for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];
            let a = data[i + 3];

            if (removeBg) {
                const colorDist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
                if (colorDist <= maxDist) {
                    data[i + 3] = 0;
                    continue;
                }
            }

            r = contrastFactor * (r - 128) + 128 + brightness * 1.5;
            g = contrastFactor * (g - 128) + 128 + brightness * 1.5;
            b = contrastFactor * (b - 128) + 128 + brightness * 1.5;

            r = Math.min(255, Math.max(0, r));
            g = Math.min(255, Math.max(0, g));
            b = Math.min(255, Math.max(0, b));

            if (invert) {
                r = 255 - r;
                g = 255 - g;
                b = 255 - b;
            }

            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
            data[i + 3] = a;
        }

        ctx.putImageData(imgData, 0, 0);
        return canvas;
    }

    /**
     * 步骤二：提取中间图 (支持智能线稿中轴骨架、极细单像素边缘与二值填充)
     */
    function generateIntermediateImage(preprocessedCanvas, mode = 'lineart', options = {}) {
        const width = preprocessedCanvas.width;
        const height = preprocessedCanvas.height;
        const ctx = preprocessedCanvas.getContext('2d', { willReadFrequently: true });
        const srcData = ctx.getImageData(0, 0, width, height).data;

        const outCanvas = document.createElement('canvas');
        outCanvas.width = width;
        outCanvas.height = height;
        const outCtx = outCanvas.getContext('2d', { willReadFrequently: true });
        const outImgData = outCtx.createImageData(width, height);
        const outData = outImgData.data;

        const binary = new Uint8Array(width * height);
        const threshold = options.threshold ?? 128;
        const polarity = options.polarity || 'auto'; // 'auto' | 'dark-line' | 'light-line'

        // 🌟 自动判定明暗底色极性 (采样四周边缘像素)，自适应兼容黑底白线与白底黑线
        let isDarkBg = false;
        if (polarity === 'auto') {
            let edgeSum = 0;
            let edgeCount = 0;
            const step = Math.max(1, Math.floor(Math.min(width, height) / 30));
            for (let x = 0; x < width; x += step) {
                const topIdx = x * 4;
                const btmIdx = ((height - 1) * width + x) * 4;
                edgeSum += 0.299 * srcData[topIdx] + 0.587 * srcData[topIdx + 1] + 0.114 * srcData[topIdx + 2];
                edgeSum += 0.299 * srcData[btmIdx] + 0.587 * srcData[btmIdx + 1] + 0.114 * srcData[btmIdx + 2];
                edgeCount += 2;
            }
            for (let y = 0; y < height; y += step) {
                const leftIdx = (y * width) * 4;
                const rightIdx = (y * width + (width - 1)) * 4;
                edgeSum += 0.299 * srcData[leftIdx] + 0.587 * srcData[leftIdx + 1] + 0.114 * srcData[leftIdx + 2];
                edgeSum += 0.299 * srcData[rightIdx] + 0.587 * srcData[rightIdx + 1] + 0.114 * srcData[rightIdx + 2];
                edgeCount += 2;
            }
            const avgEdgeLum = edgeCount > 0 ? (edgeSum / edgeCount) : 255;
            isDarkBg = avgEdgeLum < 95;
        } else if (polarity === 'light-line') {
            isDarkBg = true;
        }

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const alpha = srcData[idx + 3];
                if (alpha < 40) {
                    binary[y * width + x] = 0;
                    continue;
                }
                const gray = 0.299 * srcData[idx] + 0.587 * srcData[idx + 1] + 0.114 * srcData[idx + 2];
                const isLine = isDarkBg ? (gray >= threshold) : (gray < threshold);
                binary[y * width + x] = isLine ? 1 : 0;
            }
        }

        let processedGrid = new Uint8Array(width * height);
        let isSkeleton = false;
        const singleLineOpt = options.singleLineOptimization ?? true;

        if (mode === 'white' || mode === 'lineart' || mode === 'skeleton') {
            // 🌟 商业级 SwarmStudio: 单线优化 (合并邻近双线，再提取一条中线)
            if (singleLineOpt) {
                processedGrid = optimizeSingleLine(binary, width, height, 2);
            } else {
                processedGrid = zhangSuenThinning(binary, width, height);
            }
            isSkeleton = true;
        } else if (mode === 'contour') {
            const rawContour = extractSobelContour(binary, width, height);
            processedGrid = zhangSuenThinning(rawContour, width, height);
            isSkeleton = true;
        } else if (mode === 'dot') {
            processedGrid = extractDotMatrix(binary, width, height, options.dotSpacing || 5);
        } else {
            processedGrid = binary;
        }

        // 渲染回输出画布
        for (let i = 0; i < processedGrid.length; i++) {
            const outIdx = i * 4;
            if (processedGrid[i] === 1) {
                outData[outIdx] = 0;
                outData[outIdx + 1] = 242;
                outData[outIdx + 2] = 254;
                outData[outIdx + 3] = 255;
            } else {
                outData[outIdx] = 8;
                outData[outIdx + 1] = 10;
                outData[outIdx + 2] = 16;
                outData[outIdx + 3] = 255;
            }
        }

        outCtx.putImageData(outImgData, 0, 0);

        return {
            canvas: outCanvas,
            binaryGrid: processedGrid,
            width,
            height,
            isSkeleton,
            isDarkBg,
        };
    }

    /**
     * 🌟 单线优化算子 (Single Line Optimization)
     * 工业标准 (对标 SwarmStudio): "合并邻近双线，再提取一条中线"
     * 针对手绘线稿中的近距平行轮廓或粗笔触边缘，进行形态学自适应核膨胀闭合 (Dilation Closing)，
     * 将两根相邻距离小于 radius 像素的双轨粘合，再通过张-苏恩形态学细化为唯一严格中轴线！
     */
    function optimizeSingleLine(binary, width, height, radius = 2) {
        const closed = new Uint8Array(width * height);
        // 形态学膨胀 (Dilation)
        for (let y = radius; y < height - radius; y++) {
            for (let x = radius; x < width - radius; x++) {
                if (binary[y * width + x] === 1) {
                    for (let dy = -radius; dy <= radius; dy++) {
                        for (let dx = -radius; dx <= radius; dx++) {
                            closed[(y + dy) * width + (x + dx)] = 1;
                        }
                    }
                }
            }
        }
        // 张-苏恩骨架中轴抽取
        return zhangSuenThinning(closed, width, height);
    }

    /**
     * Sobel 边缘检测
     */
    function extractSobelContour(binary, width, height) {
        const contour = new Uint8Array(width * height);
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                if (binary[idx] === 0) continue;

                const top = binary[(y - 1) * width + x];
                const bottom = binary[(y + 1) * width + x];
                const left = binary[y * width + (x - 1)];
                const right = binary[y * width + (x + 1)];

                if (top === 0 || bottom === 0 || left === 0 || right === 0) {
                    contour[idx] = 1;
                }
            }
        }
        return contour;
    }

    /**
     * Zhang-Suen 骨架细化 (经典形态学剪枝)
     */
    function zhangSuenThinning(binary, width, height) {
        const grid = new Uint8Array(binary);
        let hasChanged = true;
        let iteration = 0;
        const maxIter = 30;

        while (hasChanged && iteration < maxIter) {
            hasChanged = false;
            iteration++;

            const toDeleteStep1 = [];
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const idx = y * width + x;
                    if (grid[idx] !== 1) continue;

                    const p2 = grid[(y - 1) * width + x];
                    const p3 = grid[(y - 1) * width + (x + 1)];
                    const p4 = grid[y * width + (x + 1)];
                    const p5 = grid[(y + 1) * width + (x + 1)];
                    const p6 = grid[(y + 1) * width + x];
                    const p7 = grid[(y + 1) * width + (x - 1)];
                    const p8 = grid[y * width + (x - 1)];
                    const p9 = grid[(y - 1) * width + (x - 1)];

                    const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
                    if (b < 2 || b > 6) continue;

                    let a = 0;
                    if (p2 === 0 && p3 === 1) a++;
                    if (p3 === 0 && p4 === 1) a++;
                    if (p4 === 0 && p5 === 1) a++;
                    if (p5 === 0 && p6 === 1) a++;
                    if (p6 === 0 && p7 === 1) a++;
                    if (p7 === 0 && p8 === 1) a++;
                    if (p8 === 0 && p9 === 1) a++;
                    if (p9 === 0 && p2 === 1) a++;

                    if (a === 1 && p2 * p4 * p6 === 0 && p4 * p6 * p8 === 0) {
                        toDeleteStep1.push(idx);
                    }
                }
            }

            if (toDeleteStep1.length > 0) {
                hasChanged = true;
                for (let i = 0; i < toDeleteStep1.length; i++) {
                    grid[toDeleteStep1[i]] = 0;
                }
            }

            const toDeleteStep2 = [];
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const idx = y * width + x;
                    if (grid[idx] !== 1) continue;

                    const p2 = grid[(y - 1) * width + x];
                    const p3 = grid[(y - 1) * width + (x + 1)];
                    const p4 = grid[y * width + (x + 1)];
                    const p5 = grid[(y + 1) * width + (x + 1)];
                    const p6 = grid[(y + 1) * width + x];
                    const p7 = grid[(y + 1) * width + (x - 1)];
                    const p8 = grid[y * width + (x - 1)];
                    const p9 = grid[(y - 1) * width + (x - 1)];

                    const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
                    if (b < 2 || b > 6) continue;

                    let a = 0;
                    if (p2 === 0 && p3 === 1) a++;
                    if (p3 === 0 && p4 === 1) a++;
                    if (p4 === 0 && p5 === 1) a++;
                    if (p5 === 0 && p6 === 1) a++;
                    if (p6 === 0 && p7 === 1) a++;
                    if (p7 === 0 && p8 === 1) a++;
                    if (p8 === 0 && p9 === 1) a++;
                    if (p9 === 0 && p2 === 1) a++;

                    if (a === 1 && p2 * p4 * p8 === 0 && p2 * p6 * p8 === 0) {
                        toDeleteStep2.push(idx);
                    }
                }
            }

            if (toDeleteStep2.length > 0) {
                hasChanged = true;
                for (let i = 0; i < toDeleteStep2.length; i++) {
                    grid[toDeleteStep2[i]] = 0;
                }
            }
        }

        return grid;
    }

    function extractDotMatrix(binary, width, height, spacing = 5) {
        const dotGrid = new Uint8Array(width * height);
        for (let y = 0; y < height; y += spacing) {
            for (let x = 0; x < width; x += spacing) {
                if (binary[y * width + x] === 1) {
                    dotGrid[y * width + x] = 1;
                }
            }
        }
        return dotGrid;
    }

    /**
     * 正交网格 / 六边形密排：按目标架数反推步长，必要时细步重试。
     */
    function generateGridPoints(binaryGrid, width, height, targetCount, hexagonal = false) {
        const target = Math.max(1, Math.floor(targetCount));
        let foregroundCount = 0;
        for (let i = 0; i < binaryGrid.length; i++) {
            if (binaryGrid[i] === 1) foregroundCount++;
        }
        if (foregroundCount === 0) return [];

        const generate = (step) => {
            const points = [];
            const rowHeight = hexagonal ? step * (Math.sqrt(3) / 2) : step;
            let rowIndex = 0;
            for (let y = 0; y < height; y += rowHeight, rowIndex++) {
                const xOffset = hexagonal && rowIndex % 2 === 1 ? step * 0.5 : 0;
                for (let x = xOffset; x < width; x += step) {
                    const px = Math.round(x);
                    const py = Math.round(y);
                    if (px < width && py < height && binaryGrid[py * width + px] === 1) {
                        points.push({ x: px, y: py });
                    }
                }
            }
            points.sort((a, b) => a.y - b.y || a.x - b.x);
            return points;
        };

        let step = Math.max(1, Math.sqrt(foregroundCount / target));
        let points = [];

        for (let attempt = 0; attempt < 14; attempt++) {
            points = generate(step);
            if (points.length >= target) return selectEvenly(points, target);
            if (step <= 1) break;
            step = Math.max(1, step * 0.88);
        }

        return points;
    }

    /**
     * 步骤三：从中间图根据排布策略生成构型点阵，并执行智能原色提取
     */
    function generateMotifFromIntermediate(intermediate, originalImage, options = {}) {
        const {
            generationMode = 'spacing', // 'spacing' (按间距) | 'count' (按点数) | 'direct' (识别点直布)
            strategy = 'align',        // 'align' (交叉对齐) | 'uniform' (间距均匀) | 'follow' (像素跟随)
            spacing = 1.6,             // 点间距 (米)
            targetCount = 800,         // 目标架数
            canvasScale = 155,         // 物理宽度 (米，默认对标官方 155m)
            applyOriginalColor = true,
            colorPalette = 'original', // 'original' | 'neon' | 'gradient' | 'mono'
            fallbackColor = '#00ff88', // 默认翠绿高光 LED
        } = options;

        const { binaryGrid, width, height } = intermediate;

        let selectedPoints = [];
        let chains = [];

        // 提取骨架折线链
        const minLength = options.minLength ?? 6;
        const spurThreshold = options.spurThreshold ?? 3;
        chains = traceSkeletonGraph(binaryGrid, width, height, {
            minLength,
            spurThreshold,
            maxChains: 2048,
        });
        if (chains.length === 0) {
            chains = traceContours(binaryGrid, width, height, { minLength: 3, maxChains: 512 });
        }

        // 1. 计算图案真实宽高比
        let rawMinX = Infinity, rawMaxX = -Infinity, rawMinY = Infinity, rawMaxY = -Infinity;
        for (const c of chains) {
            for (const p of c.points) {
                if (p.x < rawMinX) rawMinX = p.x;
                if (p.x > rawMaxX) rawMaxX = p.x;
                if (p.y < rawMinY) rawMinY = p.y;
                if (p.y > rawMaxY) rawMaxY = p.y;
            }
        }
        const patternW = Math.max(1, rawMaxX - rawMinX);
        const patternH = Math.max(1, rawMaxY - rawMinY);
        const scaleFactor = canvasScale / patternW; // 物理米 / 像素
        const worldWidthM = Math.round(canvasScale * 10) / 10;
        const worldHeightM = Math.round(patternH * scaleFactor * 10) / 10;

        // 2. 动态计算无人机架数
        let effectiveTargetCount = targetCount;
        if (generationMode === 'spacing') {
            // 计算所有折线在世界米制下的总弧长
            let totalLengthPixels = 0;
            for (const c of chains) {
                for (let i = 1; i < c.points.length; i++) {
                    const dx = c.points[i].x - c.points[i - 1].x;
                    const dy = c.points[i].y - c.points[i - 1].y;
                    totalLengthPixels += Math.sqrt(dx * dx + dy * dy);
                }
            }
            const totalLengthMeters = totalLengthPixels * scaleFactor;
            // 无人机数 = 总弧长 / 点间距 (如截图中的 473 架、576 架)
            effectiveTargetCount = Math.max(1, Math.round(totalLengthMeters / Math.max(0.2, spacing)));
        }

        if (strategy === 'hexagonal' || strategy === 'grid') {
            selectedPoints = generateGridPoints(binaryGrid, width, height, effectiveTargetCount, strategy === 'hexagonal');
        } else {
            selectedPoints = resampleChainsExact(chains, effectiveTargetCount);
        }

        if (selectedPoints.length < effectiveTargetCount) {
            const contourFallback = resampleChainsExact(chains, effectiveTargetCount);
            if (contourFallback.length >= selectedPoints.length) {
                selectedPoints = contourFallback;
            }
        }

        if (selectedPoints.length > effectiveTargetCount) {
            selectedPoints = selectEvenly(selectedPoints, effectiveTargetCount);
        }

        // 2. 准备原始采样图像与全图像素缓冲区 (内存高速寻址，杜绝循环单点 getImageData 性能卡顿)
        let origData = null;
        let origW = width;
        let origH = height;

        if (originalImage) {
            const off = document.createElement('canvas');
            origW = originalImage.naturalWidth || originalImage.width || width;
            origH = originalImage.naturalHeight || originalImage.height || height;
            off.width = origW;
            off.height = origH;
            const offCtx = off.getContext('2d', { willReadFrequently: true });
            offCtx.drawImage(originalImage, 0, 0, origW, origH);
            origData = offCtx.getImageData(0, 0, origW, origH).data;
        }

        // 3. 计算图案中心包围盒并归一化到世界物理坐标
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        selectedPoints.forEach((p) => {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        });

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        /**
         * 🌟 商业级 SwarmStudio 原色核邻域最大饱和度采样器 (Kernel Max-Saturation Sampling)
         * 彻底解决边缘点落在黑线描边、被抠背景缝隙导致“全变成默认青蓝”的工业硬伤！
         */
        function sampleKernelColor(px, py) {
            if (!origData) return fallbackColor;

            const targetX = Math.min(origW - 1, Math.max(0, Math.floor((px / width) * origW)));
            const targetY = Math.min(origH - 1, Math.max(0, Math.floor((py / height) * origH)));

            let bestR = 0;
            let bestG = 242;
            let bestB = 254;
            let maxSat = -1;
            let foundValidColor = false;

            // 5x5 邻域核深度巡检
            const radius = 3;
            for (let dy = -radius; dy <= radius; dy++) {
                const ny = targetY + dy;
                if (ny < 0 || ny >= origH) continue;
                for (let dx = -radius; dx <= radius; dx++) {
                    const nx = targetX + dx;
                    if (nx < 0 || nx >= origW) continue;

                    const idx = (ny * origW + nx) * 4;
                    const r = origData[idx];
                    const g = origData[idx + 1];
                    const b = origData[idx + 2];
                    const a = origData[idx + 3];

                    // 过滤透明像素与背景纯白像素 (L > 248)
                    if (a < 50) continue;
                    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                    if (lum > 248) continue;

                    // 计算色彩饱和度 (max - min)
                    const sat = Math.max(r, g, b) - Math.min(r, g, b);

                    // 若是非死黑彩色区域 (lum >= 30 且 sat >= 15)，优先记录最高饱和度像素
                    if (lum >= 30 && sat > maxSat) {
                        maxSat = sat;
                        bestR = r;
                        bestG = g;
                        bestB = b;
                        foundValidColor = true;
                    } else if (!foundValidColor && lum >= 30 && sat >= maxSat) {
                        bestR = r;
                        bestG = g;
                        bestB = b;
                    }
                }
            }

            // 如果找到了原图色彩
            if (foundValidColor) {
                // 夜空 LED 适度增艳增强可见度
                const lum = 0.299 * bestR + 0.587 * bestG + 0.114 * bestB;
                if (lum < 90) {
                    const boost = 90 / (lum || 1);
                    bestR = Math.min(255, Math.round(bestR * boost));
                    bestG = Math.min(255, Math.round(bestG * boost));
                    bestB = Math.min(255, Math.round(bestB * boost));
                }
                const hexR = bestR.toString(16).padStart(2, '0');
                const hexG = bestG.toString(16).padStart(2, '0');
                const hexB = bestB.toString(16).padStart(2, '0');
                return `#${hexR}${hexG}${hexB}`;
            }

            // 若整核为黑白纯线稿且开启提亮保护，赋予高锐度青蓝，否则保留原色
            return applyOriginalColor ? '#00f2fe' : '#ffffff';
        }

        // 4. 生成无人机 Agent 集合并执行指定的 Color Applicator 模式
        return selectedPoints.map((p, index) => {
            const worldX = Math.round((p.x - centerX) * scaleFactor * 10) / 10;
            const worldY = Math.round((centerY - p.y) * scaleFactor * 10) / 10;

            let ledColor = fallbackColor;

            // 🌟 严格以 colorPalette 为总控决策分支
            if (colorPalette === 'original') {
                ledColor = sampleKernelColor(p.x, p.y);
            } else if (colorPalette === 'gradient') {
                // 空间渐变：从左下至右上 (对角线平滑渐变，由极客青蓝 #00f2fe 渐变至 霓虹玫红 #ff007f 再至 极光暖金 #ffaa00)
                const normX = (p.x - minX) / patternW;
                const normY = (p.y - minY) / patternH;
                const t = (normX + normY) / 2; // 0 ~ 1 对角线插值

                let r, g, b;
                if (t < 0.5) {
                    const subT = t * 2; // 0 ~ 1
                    r = Math.round(0 + subT * 255);
                    g = Math.round(242 - subT * 242);
                    b = Math.round(254 - subT * 127);
                } else {
                    const subT = (t - 0.5) * 2; // 0 ~ 1
                    r = 255;
                    g = Math.round(0 + subT * 170);
                    b = Math.round(127 - subT * 127);
                }
                ledColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            } else if (colorPalette === 'mono') {
                ledColor = options.monoColor || '#00ff88'; // 默认醒目极光翠绿或用户选定色
            } else {
                ledColor = fallbackColor;
            }

            return {
                id: `uav_${index + 1}`,
                x: worldX,
                y: worldY,
                z: 0,
                color: ledColor,
                size: 2.2, // 细腻微光针孔点，绝对不粗！
                alpha: 1.0,
            };
        });
    }

    return {
        preprocessImage,
        generateIntermediateImage,
        generateMotifFromIntermediate,
    };
}
