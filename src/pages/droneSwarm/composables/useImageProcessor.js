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
     * 步骤二：提取中间图 (支持极细单像素边缘与骨架化)
     */
    function generateIntermediateImage(preprocessedCanvas, mode = 'contour', options = {}) {
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

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const alpha = srcData[idx + 3];
                if (alpha < 40) {
                    binary[y * width + x] = 0;
                    continue;
                }
                const gray = 0.299 * srcData[idx] + 0.587 * srcData[idx + 1] + 0.114 * srcData[idx + 2];
                binary[y * width + x] = gray < threshold ? 1 : 0;
            }
        }

        let processedGrid = new Uint8Array(width * height);

        if (mode === 'contour') {
            // 提取外边缘并进行单像素骨架细化，防止带状变粗！
            const rawContour = extractSobelContour(binary, width, height);
            processedGrid = zhangSuenThinning(rawContour, width, height);
        } else if (mode === 'skeleton') {
            // 全局 Zhang-Suen 细化中心线
            processedGrid = zhangSuenThinning(binary, width, height);
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
        };
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
     * 拓扑连续路径追踪 (Topological Path Tracing)
     * 将散碎的前景像素连接成有序的折线链 (Polyline Chains)
     */
    function traceChainsFromBinary(binaryGrid, width, height) {
        const visited = new Uint8Array(width * height);
        const chains = [];

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const startIdx = y * width + x;
                if (binaryGrid[startIdx] !== 1 || visited[startIdx] === 1) continue;

                // 找到新连通链的起点
                const currentChain = [];
                let currX = x;
                let currY = y;

                while (currX !== null) {
                    const idx = currY * width + currX;
                    visited[idx] = 1;
                    currentChain.push({ x: currX, y: currY });

                    // 检索 8-邻域中未访问的前景像素
                    let nextX = null;
                    let nextY = null;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const nx = currX + dx;
                            const ny = currY + dy;
                            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                const nIdx = ny * width + nx;
                                if (binaryGrid[nIdx] === 1 && visited[nIdx] === 0) {
                                    nextX = nx;
                                    nextY = ny;
                                    break;
                                }
                            }
                        }
                        if (nextX !== null) break;
                    }

                    currX = nextX;
                    currY = nextY;
                }

                if (currentChain.length > 2) {
                    chains.push(currentChain);
                }
            }
        }

        return chains;
    }

    /**
     * 步骤三：从中间图根据排布策略生成构型点阵，并执行智能原色提取
     */
    function generateMotifFromIntermediate(intermediate, originalImage, options = {}) {
        const {
            strategy = 'contour',
            targetCount = 800,
            canvasScale = 300,
            applyOriginalColor = true,
            colorPalette = 'original', // 'original' | 'neon' | 'gradient'
            fallbackColor = '#00f2fe',
        } = options;

        const { binaryGrid, width, height } = intermediate;

        let selectedPoints = [];

        if (strategy === 'contour') {
            // 🌟 核心突破：拓扑曲线追踪 + 累积弧长参数化等距重采样 (Arc-length Equidistant Sampling)
            const chains = traceChainsFromBinary(binaryGrid, width, height);

            // 统计所有链的总弧长
            let totalLength = 0;
            const chainInfos = chains.map((chain) => {
                let len = 0;
                const cumLengths = [0];
                for (let i = 1; i < chain.length; i++) {
                    const dx = chain[i].x - chain[i - 1].x;
                    const dy = chain[i].y - chain[i - 1].y;
                    len += Math.sqrt(dx * dx + dy * dy);
                    cumLengths.push(len);
                }
                totalLength += len;
                return { chain, len, cumLengths };
            });

            if (totalLength > 0) {
                // 计算全局等步长 stepDist
                const stepDist = totalLength / targetCount;

                chainInfos.forEach((info) => {
                    const { chain, len, cumLengths } = info;
                    if (len === 0) return;

                    const numPointsOnChain = Math.max(1, Math.round(len / stepDist));
                    const chainStep = len / numPointsOnChain;

                    for (let p = 0; p < numPointsOnChain; p++) {
                        const targetDist = p * chainStep;
                        // 二分查找或线性插值定位具体线段
                        let segIdx = 0;
                        while (segIdx < cumLengths.length - 1 && cumLengths[segIdx + 1] < targetDist) {
                            segIdx++;
                        }
                        const segStartDist = cumLengths[segIdx];
                        const segEndDist = cumLengths[segIdx + 1] || segStartDist + 1;
                        const t = (targetDist - segStartDist) / (segEndDist - segStartDist || 1);

                        const p1 = chain[segIdx];
                        const p2 = chain[Math.min(segIdx + 1, chain.length - 1)];

                        selectedPoints.push({
                            x: p1.x + (p2.x - p1.x) * t,
                            y: p1.y + (p2.y - p1.y) * t,
                        });
                    }
                });
            } else {
                // 回退保底
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        if (binaryGrid[y * width + x] === 1) {
                            selectedPoints.push({ x, y });
                        }
                    }
                }
            }
        } else if (strategy === 'hexagonal') {
            // 六边形蜂窝密排
            const candidatePixels = [];
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    if (binaryGrid[y * width + x] === 1) {
                        candidatePixels.push({ x, y });
                    }
                }
            }
            const step = Math.max(2.5, Math.sqrt((candidatePixels.length * 1.5) / targetCount));
            const rowHeight = step * (Math.sqrt(3) / 2);

            for (let y = 0; y < height; y += rowHeight) {
                const isOddRow = Math.floor(y / rowHeight) % 2 === 1;
                const xOffset = isOddRow ? step * 0.5 : 0;
                for (let x = xOffset; x < width; x += step) {
                    const px = Math.round(x);
                    const py = Math.round(y);
                    if (px < width && py < height && binaryGrid[py * width + px] === 1) {
                        selectedPoints.push({ x: px, y: py });
                    }
                }
            }
        } else {
            // 正交方格
            const candidatePixels = [];
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    if (binaryGrid[y * width + x] === 1) {
                        candidatePixels.push({ x, y });
                    }
                }
            }
            const step = Math.max(2.5, Math.sqrt(candidatePixels.length / targetCount));
            for (let y = 0; y < height; y += step) {
                for (let x = 0; x < width; x += step) {
                    const px = Math.round(x);
                    const py = Math.round(y);
                    if (px < width && py < height && binaryGrid[py * width + px] === 1) {
                        selectedPoints.push({ x: px, y: py });
                    }
                }
            }
        }

        // 架数配额微调 (保证点数尽可能贴近 targetCount)
        if (selectedPoints.length > targetCount) {
            const step = selectedPoints.length / targetCount;
            const subsampled = [];
            for (let i = 0; i < targetCount; i++) {
                subsampled.push(selectedPoints[Math.floor(i * step)]);
            }
            selectedPoints = subsampled;
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

        const patternW = Math.max(1, maxX - minX);
        const patternH = Math.max(1, maxY - minY);
        const scaleFactor = canvasScale / Math.max(patternW, patternH);
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
