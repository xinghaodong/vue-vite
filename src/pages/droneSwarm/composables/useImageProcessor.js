/**
 * ========================================================================
 * 文件名称: useImageProcessor.js
 * 所属模块: 无人机集群编队系统 - 图片处理三步骤算法引擎
 * 核心规范 (参考 SwarmStudio 工业标准):
 *   步骤一 (原图 -> 预处理图): 亮度/对比度调节、明暗反转、背景色抠除与容差
 *   步骤二 (预处理图 -> 中间图): 轮廓(Contour)、骨架(Zhang-Suen 细化)、圆点(Halftone)、填充(Fill)
 *   步骤三 (中间图 -> 构型点阵): 随形、正交网格、六边形密排策略 + 原图色彩投影赋色 (Color Applicator)
 * ========================================================================
 */

export function useImageProcessor() {
    /**
     * 步骤一：图像预处理渲染
     * @param {HTMLImageElement} img 原始图片
     * @param {Object} options 调参选项
     * @returns {HTMLCanvasElement}
     */
    function preprocessImage(img, options = {}) {
        const {
            brightness = 0,    // -100 ~ 100
            contrast = 0,      // -100 ~ 100
            invert = false,    // 是否明暗反转
            removeBg = false,  // 是否背景抠除
            bgColorHex = '#ffffff', // 背景基准色
            bgTolerance = 25,  // 背景色容差 (0 ~ 100)
            maxWidth = 600,
        } = options;

        // 等比限制最大分辨率，保持算法毫秒级实时响应
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

        // 对比度与亮度转换系数
        const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        const bgR = parseInt(bgColorHex.slice(1, 3), 16) || 255;
        const bgG = parseInt(bgColorHex.slice(3, 5), 16) || 255;
        const bgB = parseInt(bgColorHex.slice(5, 7), 16) || 255;
        const maxDist = (bgTolerance / 100) * 441.67; // 色彩欧式距离 (sqrt(255^2 * 3))

        for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];
            let a = data[i + 3];

            // 1. 扣背景色
            if (removeBg) {
                const colorDist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
                if (colorDist <= maxDist) {
                    data[i + 3] = 0;
                    continue;
                }
            }

            // 2. 对比度与亮度变换
            r = contrastFactor * (r - 128) + 128 + brightness * 1.5;
            g = contrastFactor * (g - 128) + 128 + brightness * 1.5;
            b = contrastFactor * (b - 128) + 128 + brightness * 1.5;

            // 截断到 0 - 255
            r = Math.min(255, Math.max(0, r));
            g = Math.min(255, Math.max(0, g));
            b = Math.min(255, Math.max(0, b));

            // 3. 明暗反相
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
     * 步骤二：从预处理画布生成中间图 (二值化 / 轮廓 / 骨架细化 / 圆点)
     * @param {HTMLCanvasElement} preprocessedCanvas 
     * @param {'contour' | 'skeleton' | 'dot' | 'fill'} mode 提取模式
     * @param {Object} options 模式参数
     * @returns {{
     *   canvas: HTMLCanvasElement,
     *   binaryGrid: Uint8Array,
     *   width: number,
     *   height: number
     * }}
     */
    function generateIntermediateImage(preprocessedCanvas, mode = 'contour', options = {}) {
        const width = preprocessedCanvas.width;
        const height = preprocessedCanvas.height;
        const ctx = preprocessedCanvas.getContext('2d', { willReadFrequently: true });
        const srcData = ctx.getImageData(0, 0, width, height).data;

        // 目标中间图画布
        const outCanvas = document.createElement('canvas');
        outCanvas.width = width;
        outCanvas.height = height;
        const outCtx = outCanvas.getContext('2d', { willReadFrequently: true });
        const outImgData = outCtx.createImageData(width, height);
        const outData = outImgData.data;

        // 二值化网格 (0: 背景, 1: 前景物体)
        const binary = new Uint8Array(width * height);
        const threshold = options.threshold ?? 128;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const alpha = srcData[idx + 3];
                if (alpha < 50) {
                    binary[y * width + x] = 0;
                    continue;
                }
                const gray = 0.299 * srcData[idx] + 0.587 * srcData[idx + 1] + 0.114 * srcData[idx + 2];
                // 默认深色为目标前景 (或根据 threshold)
                binary[y * width + x] = gray < threshold ? 1 : 0;
            }
        }

        let processedGrid = new Uint8Array(width * height);

        if (mode === 'contour') {
            // Sobel 算子边缘提取
            processedGrid = extractSobelContour(binary, width, height);
        } else if (mode === 'skeleton') {
            // Zhang-Suen 二值图像细化中心骨架提取
            processedGrid = zhangSuenThinning(binary, width, height);
        } else if (mode === 'dot') {
            // 半色调圆点采样模式
            processedGrid = extractDotMatrix(binary, width, height, options.dotSpacing || 6);
        } else {
            // solid fill: 直接使用二值填充
            processedGrid = binary;
        }

        // 渲染回输出画布供预览
        for (let i = 0; i < processedGrid.length; i++) {
            const outIdx = i * 4;
            if (processedGrid[i] === 1) {
                outData[outIdx] = 0;       // R
                outData[outIdx + 1] = 242; // G (极客青蓝高亮)
                outData[outIdx + 2] = 254; // B
                outData[outIdx + 3] = 255; // A
            } else {
                outData[outIdx] = 10;
                outData[outIdx + 1] = 12;
                outData[outIdx + 2] = 20;
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
     * Sobel 边缘检测算子
     */
    function extractSobelContour(binary, width, height) {
        const contour = new Uint8Array(width * height);
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                if (binary[idx] === 0) continue;

                // 邻域 4-连通性检查：如果四周有至少一个背景点，则为边界点
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
     * Zhang-Suen 骨架细化经典算法 (将笔画腐蚀为单像素中心骨架线)
     */
    function zhangSuenThinning(binary, width, height) {
        const grid = new Uint8Array(binary);
        let hasChanged = true;
        let iteration = 0;
        const maxIter = 40;

        while (hasChanged && iteration < maxIter) {
            hasChanged = false;
            iteration++;

            // Step 1
            const toDeleteStep1 = [];
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const idx = y * width + x;
                    if (grid[idx] !== 1) continue;

                    // 8-邻域排列: P2(北), P3(东北), P4(东), P5(东南), P6(南), P7(西南), P8(西), P9(西北)
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

                    // 计算 0 到 1 的翻转跃迁次数 A(P1)
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

            // Step 2
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

    /**
     * 半色调圆点网格采样
     */
    function extractDotMatrix(binary, width, height, spacing = 6) {
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
     * 步骤三：从中间图根据排布策略生成构型点阵，并执行原图色彩投影赋色
     * 
     * @param {Object} intermediate 中间图数据 { binaryGrid, width, height }
     * @param {HTMLImageElement} originalImage 原始图片 (用于 Color Applicator 赋色)
     * @param {Object} options 排布参数
     * @returns {Array<import('../types/swarm').Agent>}
     */
    function generateMotifFromIntermediate(intermediate, originalImage, options = {}) {
        const {
            strategy = 'contour', // 'contour' | 'grid' | 'hexagonal'
            targetCount = 800,    // 目标架数配额
            canvasScale = 300,    // 映射到三维/2D世界中的物理尺寸 (米)
            applyOriginalColor = true, // 是否开启原图色彩映射
            fallbackColor = '#00f2fe',
        } = options;

        const { binaryGrid, width, height } = intermediate;

        // 1. 搜集所有候选前景像素点
        const candidatePixels = [];
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (binaryGrid[y * width + x] === 1) {
                    candidatePixels.push({ x, y });
                }
            }
        }

        if (candidatePixels.length === 0) return [];

        let selectedPoints = [];

        if (strategy === 'contour') {
            // 随形模式：弧长累积等距采样
            if (candidatePixels.length <= targetCount) {
                selectedPoints = candidatePixels;
            } else {
                const step = candidatePixels.length / targetCount;
                for (let i = 0; i < targetCount; i++) {
                    const idx = Math.floor(i * step);
                    selectedPoints.push(candidatePixels[idx]);
                }
            }
        } else if (strategy === 'hexagonal') {
            // 六边形密排策略 (蜂窝错排)
            const area = width * height;
            // 估算六边形晶格步长
            const density = targetCount / (candidatePixels.length || 1);
            const step = Math.max(3, Math.round(Math.sqrt((width * height) / targetCount) * 0.9));
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
            // 正交网格策略 (方格平铺)
            const step = Math.max(3, Math.round(Math.sqrt((width * height) / targetCount)));
            for (let y = 0; y < height; y += step) {
                for (let x = 0; x < width; x += step) {
                    if (binaryGrid[y * width + x] === 1) {
                        selectedPoints.push({ x, y });
                    }
                }
            }
        }

        // 如果提取出的点数超过目标架数，进行均匀等距截断或重采样；如果少于，则完全保留
        if (selectedPoints.length > targetCount) {
            const step = selectedPoints.length / targetCount;
            const subsampled = [];
            for (let i = 0; i < targetCount; i++) {
                subsampled.push(selectedPoints[Math.floor(i * step)]);
            }
            selectedPoints = subsampled;
        }

        // 2. 准备原图像素数据 (用于 Color Applicator)
        let origCtx = null;
        let origWidth = 1;
        let origHeight = 1;
        if (applyOriginalColor && originalImage) {
            const off = document.createElement('canvas');
            origWidth = originalImage.naturalWidth || originalImage.width;
            origHeight = originalImage.naturalHeight || originalImage.height;
            off.width = origWidth;
            off.height = origHeight;
            origCtx = off.getContext('2d', { willReadFrequently: true });
            origCtx.drawImage(originalImage, 0, 0);
        }

        // 3. 计算图案中心包围盒并归一化到世界物理坐标 [-scale/2, scale/2]
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

        // 4. 生成规范的无人机 Agent 集合
        return selectedPoints.map((p, index) => {
            // 物理世界坐标 (Y 轴反转，向上为正)
            const worldX = Math.round((p.x - centerX) * scaleFactor * 10) / 10;
            const worldY = Math.round((centerY - p.y) * scaleFactor * 10) / 10;

            let ledColor = fallbackColor;

            // 原图原色映射 (Color Applicator)
            if (applyOriginalColor && origCtx) {
                // 将处理图的坐标 (p.x, p.y) 映射回原始图片的像素坐标
                const origX = Math.min(origWidth - 1, Math.max(0, Math.floor((p.x / width) * origWidth)));
                const origY = Math.min(origHeight - 1, Math.max(0, Math.floor((p.y / height) * origHeight)));
                const pixel = origCtx.getImageData(origX, origY, 1, 1).data;
                // 转为 HEX 颜色
                const hexR = pixel[0].toString(16).padStart(2, '0');
                const hexG = pixel[1].toString(16).padStart(2, '0');
                const hexB = pixel[2].toString(16).padStart(2, '0');
                ledColor = `#${hexR}${hexG}${hexB}`;
            }

            return {
                id: `uav_${index + 1}`,
                x: worldX,
                y: worldY,
                z: 0,
                color: ledColor,
                size: 4,
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
