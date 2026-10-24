/**
 * ========================================================================
 * 文件名称: useDistributionEngine.js
 * 所属模块: 无人机集群编队系统 - 分布与连续曲线等距重排计算几何引擎
 * 功能说明:
 *   1. Ordered Lasso 连续曲线向心 Catmull-Rom 样条拟合与累积弧长等距重排 (N -> N)；
 *   2. 基础几何生成器：直线、折线、矩形、圆弧、圆周、十字、正多边形、五角星；
 *   3. 离散点集主成分主轴 (PCA / Principal Axis) 与包围盒分析；
 *   4. 面状闭合区域六边形密排与正交网格填充；
 *   5. 严格保证架数守恒与确定性输出，杜绝随机抖动。
 * ========================================================================
 */

const EPS = 1e-9;

/**
 * 欧氏距离
 */
export function distance(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 计算点集的主轴方向向量与几何中心 (PCA 主成分方向分析)
 * @param {Array<{x: number, y: number}>} points
 * @returns {{ cx: number, cy: number, ux: number, uy: number, theta: number }}
 */
export function calculatePrincipalAxis(points) {
    if (!points || points.length === 0) {
        return { cx: 0, cy: 0, ux: 1, uy: 0, theta: 0 };
    }

    let sumX = 0;
    let sumY = 0;
    for (const p of points) {
        sumX += p.x;
        sumY += p.y;
    }
    const cx = sumX / points.length;
    const cy = sumY / points.length;

    if (points.length < 2) {
        return { cx, cy, ux: 1, uy: 0, theta: 0 };
    }

    // 协方差矩阵元素
    let sxx = 0;
    let sxy = 0;
    let syy = 0;
    for (const p of points) {
        const dx = p.x - cx;
        const dy = p.y - cy;
        sxx += dx * dx;
        sxy += dx * dy;
        syy += dy * dy;
    }

    // 最大特征值对应的特征向量方向 (即主走向角度)
    const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    const ux = Math.cos(theta);
    const uy = Math.sin(theta);

    return { cx, cy, ux, uy, theta };
}

/**
 * 向心 Catmull-Rom 样条参数插值 (Centripetal Catmull-Rom Spline, alpha = 0.5)
 * 工业级特性：数学上严格消除自交环路与锐角突变抖动
 */
function evaluateCatmullRom(p0, p1, p2, p3, t, alpha = 0.5) {
    function getTime(pPrev, pNext, tPrev) {
        const d = distance(pPrev.x, pPrev.y, pNext.x, pNext.y);
        return tPrev + Math.pow(Math.max(d, 1e-6), alpha);
    }

    const t0 = 0;
    const t1 = getTime(p0, p1, t0);
    const t2 = getTime(p1, p2, t1);
    const t3 = getTime(p2, p3, t2);

    // 将归一化 t (0~1) 映射到 [t1, t2]
    const evalT = t1 + t * (t2 - t1);

    const a1x = ((t1 - evalT) / (t1 - t0)) * p0.x + ((evalT - t0) / (t1 - t0)) * p1.x;
    const a1y = ((t1 - evalT) / (t1 - t0)) * p0.y + ((evalT - t0) / (t1 - t0)) * p1.y;

    const a2x = ((t2 - evalT) / (t2 - t1)) * p1.x + ((evalT - t1) / (t2 - t1)) * p2.x;
    const a2y = ((t2 - evalT) / (t2 - t1)) * p1.y + ((evalT - t1) / (t2 - t1)) * p2.y;

    const a3x = ((t3 - evalT) / (t3 - t2)) * p2.x + ((evalT - t2) / (t3 - t2)) * p3.x;
    const a3y = ((t3 - evalT) / (t3 - t2)) * p2.y + ((evalT - t2) / (t3 - t2)) * p3.y;

    const b1x = ((t2 - evalT) / (t2 - t0)) * a1x + ((evalT - t0) / (t2 - t0)) * a2x;
    const b1y = ((t2 - evalT) / (t2 - t0)) * a1y + ((evalT - t0) / (t2 - t0)) * a2y;

    const b2x = ((t3 - evalT) / (t3 - t1)) * a2x + ((evalT - t1) / (t3 - t1)) * a3x;
    const b2y = ((t3 - evalT) / (t3 - t1)) * a2y + ((evalT - t1) / (t3 - t1)) * a3y;

    const cx = ((t2 - evalT) / (t2 - t1)) * b1x + ((evalT - t1) / (t2 - t1)) * b2x;
    const cy = ((t2 - evalT) / (t2 - t1)) * b1y + ((evalT - t1) / (t2 - t1)) * b2y;

    return { x: cx, y: cy };
}

/**
 * 连续曲线向心 Catmull-Rom 样条等距重采样 (N -> N 守恒)
 * @param {Array<{x: number, y: number}>} orderedPoints 按顺序记录的点列
 * @param {number} targetCount 目标重排点数 (默认保持输入点数 N)
 * @param {number} smoothness 平滑度系数 (默认 0.5)
 * @returns {Array<{x: number, y: number}>}
 */
export function catmullRomEquidistantResample(orderedPoints, targetCount = null, smoothness = 0.5) {
    if (!orderedPoints || orderedPoints.length === 0) return [];
    const count = targetCount || orderedPoints.length;
    if (orderedPoints.length === 1 || count === 1) {
        return [{ x: orderedPoints[0].x, y: orderedPoints[0].y }];
    }
    if (orderedPoints.length === 2) {
        // 两点直接线性等距
        const p1 = orderedPoints[0];
        const p2 = orderedPoints[1];
        const result = [];
        for (let i = 0; i < count; i++) {
            const t = count === 1 ? 0 : i / (count - 1);
            result.push({
                x: Math.round((p1.x + (p2.x - p1.x) * t) * 100) / 100,
                y: Math.round((p1.y + (p2.y - p1.y) * t) * 100) / 100,
            });
        }
        return result;
    }

    // 1. 构建端点外推虚点
    const pts = [...orderedPoints];
    const first = pts[0];
    const second = pts[1];
    const last = pts[pts.length - 1];
    const prevLast = pts[pts.length - 2];

    const pStart = { x: 2 * first.x - second.x, y: 2 * first.y - second.y };
    const pEnd = { x: 2 * last.x - prevLast.x, y: 2 * last.y - prevLast.y };
    const padded = [pStart, ...pts, pEnd];

    // 2. 高密度样条采样以构建累积弧长样条
    const finePoints = [];
    const numSegments = pts.length - 1;
    const stepsPerSegment = 30; // 每一段采样 30 个微元，积分精度极高

    for (let seg = 0; seg < numSegments; seg++) {
        const p0 = padded[seg];
        const p1 = padded[seg + 1];
        const p2 = padded[seg + 2];
        const p3 = padded[seg + 3];

        for (let step = 0; step < stepsPerSegment; step++) {
            const t = step / stepsPerSegment;
            const pt = evaluateCatmullRom(p0, p1, p2, p3, t, smoothness);
            finePoints.push(pt);
        }
    }
    finePoints.push({ x: last.x, y: last.y });

    // 3. 计算累积弧长
    const cumulativeLengths = [0];
    for (let i = 1; i < finePoints.length; i++) {
        const prev = finePoints[i - 1];
        const curr = finePoints[i];
        const d = distance(prev.x, prev.y, curr.x, curr.y);
        cumulativeLengths.push(cumulativeLengths[i - 1] + d);
    }

    const totalLength = cumulativeLengths[cumulativeLengths.length - 1];
    if (totalLength < EPS) {
        return Array.from({ length: count }, () => ({ x: first.x, y: first.y }));
    }

    // 4. 等距下放采样 (0 ~ totalLength)
    const resampled = [];
    let searchIdx = 0;

    for (let i = 0; i < count; i++) {
        const targetDist = count === 1 ? 0 : (i / (count - 1)) * totalLength;

        while (searchIdx < cumulativeLengths.length - 1 && cumulativeLengths[searchIdx + 1] < targetDist) {
            searchIdx++;
        }

        const segStartDist = cumulativeLengths[searchIdx];
        const segEndDist = cumulativeLengths[searchIdx + 1] || segStartDist;
        const segLen = segEndDist - segStartDist;
        const t = segLen > 1e-6 ? (targetDist - segStartDist) / segLen : 0;

        const pA = finePoints[searchIdx];
        const pB = finePoints[Math.min(searchIdx + 1, finePoints.length - 1)];

        resampled.push({
            x: Math.round((pA.x + (pB.x - pA.x) * t) * 100) / 100,
            y: Math.round((pA.y + (pB.y - pA.y) * t) * 100) / 100,
        });
    }

    return resampled;
}

/**
 * 基础几何折线生成器
 */
export function generateGeometryCurves(type, params) {
    const curves = [];

    if (type === 'line') {
        const { x1 = -50, y1 = 0, x2 = 50, y2 = 0 } = params;
        curves.push({
            points: [{ x: x1, y: y1 }, { x: x2, y: y2 }],
            closed: false,
        });
    } else if (type === 'polyline') {
        const { points = [] } = params;
        if (points.length >= 2) {
            curves.push({ points, closed: false });
        }
    } else if (type === 'rect') {
        const { cx = 0, cy = 0, width = 100, height = 60, angleDeg = 0 } = params;
        const rad = (angleDeg * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const hw = width / 2;
        const hh = height / 2;

        const corners = [
            { x: -hw, y: -hh },
            { x: hw, y: -hh },
            { x: hw, y: hh },
            { x: -hw, y: hh },
        ].map((c) => ({
            x: cx + c.x * cos - c.y * sin,
            y: cy + c.x * sin + c.y * cos,
        }));

        curves.push({ points: corners, closed: true });
    } else if (type === 'circle') {
        const { cx = 0, cy = 0, radius = 50, segments = 64 } = params;
        const points = [];
        for (let i = 0; i < segments; i++) {
            const rad = (i / segments) * 2 * Math.PI;
            points.push({
                x: cx + Math.cos(rad) * radius,
                y: cy + Math.sin(rad) * radius,
            });
        }
        curves.push({ points, closed: true });
    } else if (type === 'arc') {
        const { cx = 0, cy = 0, radius = 50, startDeg = 0, sweepDeg = 180, segments = 40 } = params;
        const startRad = (startDeg * Math.PI) / 180;
        const sweepRad = (sweepDeg * Math.PI) / 180;
        const points = [];
        for (let i = 0; i <= segments; i++) {
            const rad = startRad + (i / segments) * sweepRad;
            points.push({
                x: cx + Math.cos(rad) * radius,
                y: cy + Math.sin(rad) * radius,
            });
        }
        curves.push({ points, closed: false });
    } else if (type === 'cross') {
        const { cx = 0, cy = 0, size = 80, angleDeg = 0 } = params;
        const rad = (angleDeg * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const half = size / 2;

        // 横线
        curves.push({
            points: [
                { x: cx - half * cos, y: cy - half * sin },
                { x: cx + half * cos, y: cy + half * sin },
            ],
            closed: false,
        });
        // 竖线
        curves.push({
            points: [
                { x: cx + half * sin, y: cy - half * cos },
                { x: cx - half * sin, y: cy + half * cos },
            ],
            closed: false,
        });
    } else if (type === 'polygon') {
        const { cx = 0, cy = 0, radius = 50, sides = 6, angleDeg = 0 } = params;
        const baseRad = (angleDeg * Math.PI) / 180;
        const points = [];
        for (let i = 0; i < sides; i++) {
            const rad = baseRad + (i / sides) * 2 * Math.PI;
            points.push({
                x: cx + Math.cos(rad) * radius,
                y: cy + Math.sin(rad) * radius,
            });
        }
        curves.push({ points, closed: true });
    } else if (type === 'star') {
        const { cx = 0, cy = 0, outerRadius = 50, innerRatio = 0.5, pointsCount = 5, angleDeg = -90 } = params;
        const innerRadius = outerRadius * innerRatio;
        const totalVerts = pointsCount * 2;
        const baseRad = (angleDeg * Math.PI) / 180;
        const points = [];

        for (let i = 0; i < totalVerts; i++) {
            const r = i % 2 === 0 ? outerRadius : innerRadius;
            const rad = baseRad + (i / totalVerts) * 2 * Math.PI;
            points.push({
                x: cx + Math.cos(rad) * r,
                y: cy + Math.sin(rad) * r,
            });
        }
        curves.push({ points, closed: true });
    }

    return curves;
}

/**
 * 沿生成的曲线集合等距分配 N 个点 (严格配额下放)
 */
export function sampleCurvesExact(curves, totalCount) {
    if (!curves || curves.length === 0 || totalCount <= 0) return [];
    if (curves.length === 1) {
        return catmullRomEquidistantResample(curves[0].points, totalCount);
    }

    // 计算各曲线弧长
    const lengths = curves.map((c) => {
        let len = 0;
        for (let i = 1; i < c.points.length; i++) {
            len += distance(c.points[i - 1].x, c.points[i - 1].y, c.points[i].x, c.points[i].y);
        }
        if (c.closed && c.points.length >= 2) {
            const pFirst = c.points[0];
            const pLast = c.points[c.points.length - 1];
            len += distance(pLast.x, pLast.y, pFirst.x, pFirst.y);
        }
        return Math.max(len, 1e-4);
    });

    const sumLength = lengths.reduce((acc, l) => acc + l, 0);

    // 最大余数法配额分配
    const quotas = [];
    const remainders = [];
    let allocated = 0;

    for (let i = 0; i < curves.length; i++) {
        const exact = (lengths[i] / sumLength) * totalCount;
        const floor = Math.max(1, Math.floor(exact));
        quotas.push(floor);
        allocated += floor;
        remainders.push({ idx: i, rem: exact - floor });
    }

    // 多退少补
    if (allocated < totalCount) {
        remainders.sort((a, b) => b.rem - a.rem);
        let diff = totalCount - allocated;
        for (let i = 0; i < diff; i++) {
            quotas[remainders[i % remainders.length].idx]++;
        }
    } else if (allocated > totalCount) {
        remainders.sort((a, b) => a.rem - b.rem);
        let diff = allocated - totalCount;
        for (let i = 0; i < diff; i++) {
            const q = quotas[remainders[i % remainders.length].idx];
            if (q > 1) {
                quotas[remainders[i % remainders.length].idx]--;
            }
        }
    }

    const allPoints = [];
    for (let i = 0; i < curves.length; i++) {
        const pts = catmullRomEquidistantResample(curves[i].points, quotas[i]);
        allPoints.push(...pts);
    }
    return allPoints.slice(0, totalCount);
}

/**
 * 闭合包围盒内蜂窝密排与正交网格填充点位生成器
 */
export function generateFillPoints({ minX, maxX, minY, maxY, count, mode = 'hexagonal' }) {
    if (count <= 0) return [];
    const width = Math.max(10, maxX - minX);
    const height = Math.max(10, maxY - minY);
    const area = width * height;

    const points = [];

    if (mode === 'hexagonal') {
        // 六边形最密空间堆积
        const cellArea = area / count;
        const step = Math.sqrt(cellArea / 0.866);
        const rowHeight = step * 0.866;

        let row = 0;
        for (let y = minY + rowHeight / 2; y <= maxY && points.length < count; y += rowHeight) {
            const offsetX = (row % 2) * (step / 2);
            for (let x = minX + offsetX + step / 2; x <= maxX && points.length < count; x += step) {
                points.push({
                    x: Math.round(x * 10) / 10,
                    y: Math.round(y * 10) / 10,
                });
            }
            row++;
        }
    } else {
        // 正交网格
        const step = Math.sqrt(area / count);
        for (let y = minY + step / 2; y <= maxY && points.length < count; y += step) {
            for (let x = minX + step / 2; x <= maxX && points.length < count; x += step) {
                points.push({
                    x: Math.round(x * 10) / 10,
                    y: Math.round(y * 10) / 10,
                });
            }
        }
    }

    // 补齐或微调
    while (points.length < count) {
        const last = points[points.length - 1] || { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
        points.push({ x: last.x + 1.5, y: last.y });
    }

    return points.slice(0, count);
}
