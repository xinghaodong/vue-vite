/**
 * ========================================================================
 * 文件名称: swarmGeometry.js
 * 所属模块: 无人机集群编队系统 - 确定性几何与轮廓内核
 * 功能说明:
 *   1. 可复现的 seeded PRNG，杜绝同参数生成不同点阵；
 *   2. Moore-Neighbor 有序轮廓追踪；
 *   3. 全局弧长配额 + 最大余数法，严格生成指定 N 个点位；
 *   4. 所有采样点去重，便于后续图层、撤销与工程回读。
 * ========================================================================
 */

const EPS = 1e-9;

export function hashString(input) {
    let hash = 2166136261 >>> 0;
    const text = String(input);
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

export function createSeededRandom(seed = 1) {
    let state = (typeof seed === 'string' ? hashString(seed) : seed) >>> 0;
    return function nextRandom() {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function roundTo(value, digits = 2) {
    const power = 10 ** digits;
    return Math.round(value * power) / power;
}

function distance(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
}

function normalizePoints(points) {
    const result = [];
    for (let i = 0; i < points.length; i++) {
        const point = points[i];
        if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
        const prev = result[result.length - 1];
        if (prev && Math.abs(prev.x - point.x) < 1e-7 && Math.abs(prev.y - point.y) < 1e-7) continue;
        result.push(point);
    }
    return result;
}

export function getPolylineLength(points, closed = false) {
    if (!points || points.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < points.length; i++) {
        total += distance(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
    }
    if (closed) {
        const first = points[0];
        const last = points[points.length - 1];
        total += distance(last.x, last.y, first.x, first.y);
    }
    return total;
}

/**
 * 沿折线按弧长等距采样，返回严格 count 个互不重复的点。
 * closed=true 时采用区间中点偏移，避免首尾点重合。
 */
export function samplePolyline(points, count, options = {}) {
    const target = Math.max(0, Math.floor(count));
    if (target === 0) return [];

    const clean = normalizePoints(points || []);
    if (clean.length === 0) return [];
    if (clean.length === 1) return target === 1 ? [{ ...clean[0] }] : [];

    const closed = Boolean(options.closed);
    const line = closed ? [...clean, clean[0]] : clean;
    const cumulative = [0];
    for (let i = 1; i < line.length; i++) {
        cumulative.push(
            cumulative[i - 1] + distance(line[i - 1].x, line[i - 1].y, line[i].x, line[i].y)
        );
    }
    const total = cumulative[cumulative.length - 1];
    if (total <= EPS) return [];

    const result = [];
    let segIndex = 0;

    for (let i = 0; i < target; i++) {
        let targetDistance;
        if (closed) {
            targetDistance = ((i + 0.5) * total) / target;
        } else if (target === 1) {
            targetDistance = 0;
        } else {
            targetDistance = (i * total) / (target - 1);
        }

        while (segIndex < cumulative.length - 2 && cumulative[segIndex + 1] < targetDistance) {
            segIndex++;
        }

        const segStart = cumulative[segIndex];
        const segEnd = cumulative[segIndex + 1];
        const span = segEnd - segStart;
        const t = span > EPS ? (targetDistance - segStart) / span : 0;
        const p1 = line[segIndex];
        const p2 = line[Math.min(segIndex + 1, line.length - 1)];

        result.push({
            x: p1.x + (p2.x - p1.x) * t,
            y: p1.y + (p2.y - p1.y) * t,
        });
    }

    return result;
}

/**
 * 按弧长比例分配整数点数，使用最大余数法保证总和严格等于 totalCount。
 */
export function allocateByLength(lengths, totalCount) {
    const count = Math.max(0, Math.floor(totalCount));
    const weights = (lengths || []).map((value) => (Number.isFinite(value) && value > EPS ? value : 0));
    if (count === 0 || weights.length === 0) return weights.map(() => 0);

    const positiveIndices = [];
    for (let i = 0; i < weights.length; i++) {
        if (weights[i] > EPS) positiveIndices.push(i);
    }
    if (positiveIndices.length === 0) return weights.map(() => 0);

    const allocations = weights.map(() => 0);

    if (count < positiveIndices.length) {
        const ordered = [...positiveIndices].sort((a, b) => weights[b] - weights[a] || a - b);
        for (let i = 0; i < count; i++) allocations[ordered[i]] = 1;
        return allocations;
    }

    // 每条有效曲线至少 1 架，剩余点数按弧长比例分配。
    for (const index of positiveIndices) allocations[index] = 1;
    const remaining = count - positiveIndices.length;
    if (remaining === 0) return allocations;

    const totalWeight = positiveIndices.reduce((sum, index) => sum + weights[index], 0);
    const fractions = [];
    for (const index of positiveIndices) {
        const exact = (remaining * weights[index]) / totalWeight;
        const base = Math.floor(exact);
        allocations[index] += base;
        fractions.push({ index, fraction: exact - base });
    }

    const used = positiveIndices.reduce((sum, index) => sum + allocations[index], 0);
    let leftover = count - used;
    fractions.sort((a, b) => b.fraction - a.fraction || weights[b.index] - weights[a.index] || a.index - b.index);
    for (let i = 0; leftover > 0; i++, leftover--) {
        allocations[fractions[i % fractions.length].index] += 1;
    }

    return allocations;
}

/**
 * 对多条曲线做全局弧长配额采样，严格返回 targetCount 个点。
 * @param {Array<{points: Array<{x:number,y:number}>, closed?: boolean, color?: string, meta?: any}>} curves
 */
export function sampleCurvesExact(curves, targetCount) {
    const target = Math.max(0, Math.floor(targetCount));
    if (target === 0 || !curves || curves.length === 0) return [];

    const infos = [];
    for (let i = 0; i < curves.length; i++) {
        const curve = curves[i];
        const points = normalizePoints(curve?.points || []);
        const closed = Boolean(curve?.closed);
        const length = getPolylineLength(points, closed);
        if (length > EPS) {
            infos.push({ points, closed, length, color: curve.color, meta: curve.meta, index: i });
        }
    }
    if (infos.length === 0) return [];

    const allocations = allocateByLength(infos.map((info) => info.length), target);
    const result = [];

    for (let i = 0; i < infos.length; i++) {
        const count = allocations[i];
        if (!count) continue;
        const info = infos[i];
        const sampled = samplePolyline(info.points, count, { closed: info.closed });
        for (const point of sampled) {
            result.push({
                x: point.x,
                y: point.y,
                color: info.color,
                meta: info.meta,
            });
        }
    }

    return result;
}

/**
 * 确定性等间隔抽样。只做降采样，调用方需保证 count <= points.length。
 */
export function selectEvenly(points, count) {
    const target = Math.max(0, Math.floor(count));
    if (!points || points.length === 0 || target === 0) return [];
    if (target >= points.length) return points.slice();

    const result = [];
    const span = points.length / target;
    for (let i = 0; i < target; i++) {
        const index = Math.min(points.length - 1, Math.floor((i + 0.5) * span));
        result.push(points[index]);
    }
    return result;
}

export function dedupePoints(points, precision = 0.01) {
    if (!points || points.length === 0) return [];
    const factor = 10 ** precision;
    const seen = new Set();
    const result = [];
    for (const point of points) {
        const key = `${Math.round(point.x * factor)}:${Math.round(point.y * factor)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(point);
    }
    return result;
}

/**
 * 确定性最小间距分离。用于构型生成后的尖点/重合点修正。
 */
export function relaxClosePoints(points, minDistance = 1.5, iterations = 24) {
    const list = (points || []).map((point) => ({ ...point }));
    if (list.length < 2 || minDistance <= 0) return { points: list, iterationsRun: 0 };

    const cellSize = Math.max(1e-6, minDistance);
    const minSq = minDistance * minDistance;
    let iterationsRun = 0;

    for (let iteration = 0; iteration < iterations; iteration++) {
        iterationsRun = iteration + 1;
        const grid = new Map();

        for (let i = 0; i < list.length; i++) {
            const key = `${Math.floor(list[i].x / cellSize)},${Math.floor(list[i].y / cellSize)}`;
            const cell = grid.get(key);
            if (cell) cell.push(i);
            else grid.set(key, [i]);
        }

        const pairs = [];
        for (let i = 0; i < list.length; i++) {
            const cellX = Math.floor(list[i].x / cellSize);
            const cellY = Math.floor(list[i].y / cellSize);
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const cell = grid.get(`${cellX + dx},${cellY + dy}`);
                    if (!cell) continue;
                    for (const j of cell) {
                        if (j <= i) continue;
                        const ddx = list[i].x - list[j].x;
                        const ddy = list[i].y - list[j].y;
                        const distSq = ddx * ddx + ddy * ddy;
                        if (distSq < minSq) pairs.push({ i, j, dx: ddx, dy: ddy, distSq });
                    }
                }
            }
        }

        if (pairs.length === 0) break;

        const offsetsX = new Float64Array(list.length);
        const offsetsY = new Float64Array(list.length);

        for (const pair of pairs) {
            let dx = pair.dx;
            let dy = pair.dy;
            let dist = Math.sqrt(pair.distSq);
            if (dist < 1e-6) {
                const angle = Math.PI * (3 - Math.sqrt(5)) * (pair.i + pair.j * 7 + 1);
                dx = Math.cos(angle) * 1e-3;
                dy = Math.sin(angle) * 1e-3;
                dist = 1e-3;
            }
            const push = (minDistance - dist) * 0.5;
            const nx = dx / dist;
            const ny = dy / dist;
            offsetsX[pair.i] += nx * push;
            offsetsY[pair.i] += ny * push;
            offsetsX[pair.j] -= nx * push;
            offsetsY[pair.j] -= ny * push;
        }

        const maxStep = minDistance * 0.5;
        for (let i = 0; i < list.length; i++) {
            let offsetX = offsetsX[i] * 0.8;
            let offsetY = offsetsY[i] * 0.8;
            const length = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
            if (length > maxStep) {
                offsetX = (offsetX / length) * maxStep;
                offsetY = (offsetY / length) * maxStep;
            }
            list[i].x += offsetX;
            list[i].y += offsetY;
        }
    }

    return { points: list, iterationsRun };
}

/**
 * Moore-Neighbor 有序轮廓追踪。
 * @param {Uint8Array} grid 0/1 二值网格
 * @returns {Array<{points: Array<{x:number,y:number}>, closed: boolean}>} 有序折线链
 */
export function traceContours(grid, width, height, options = {}) {
    const { minLength = 3, maxChains = 512 } = options;
    if (!grid || width <= 0 || height <= 0) return [];

    const visited = new Uint8Array(width * height);
    const componentStamp = new Uint32Array(width * height);
    let currentStamp = 0;
    const chains = [];
    const directions = [
        [1, 0],
        [1, 1],
        [0, 1],
        [-1, 1],
        [-1, 0],
        [-1, -1],
        [0, -1],
        [1, -1],
    ];

    const isForeground = (x, y) =>
        x >= 0 && x < width && y >= 0 && y < height && grid[y * width + x] === 1;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const startIndex = y * width + x;
            if (grid[startIndex] !== 1 || visited[startIndex] === 1) continue;

            let hasNeighbor = false;
            for (const [dx, dy] of directions) {
                if (isForeground(x + dx, y + dy)) {
                    hasNeighbor = true;
                    break;
                }
            }
            if (!hasNeighbor) {
                visited[startIndex] = 1;
                continue;
            }

            const chain = [];
            let currentX = x;
            let currentY = y;
            let backtrackDirection = 4; // 初始从西侧进入
            const maxSteps = width * height * 4;
            let steps = 0;
            let closed = false;

            while (steps++ < maxSteps) {
                chain.push({ x: currentX, y: currentY });
                visited[currentY * width + currentX] = 1;

                let nextX = null;
                let nextY = null;
                let nextBacktrack = backtrackDirection;

                for (let k = 1; k <= 8; k++) {
                    const directionIndex = (backtrackDirection + k) % 8;
                    const [dx, dy] = directions[directionIndex];
                    const candidateX = currentX + dx;
                    const candidateY = currentY + dy;
                    if (!isForeground(candidateX, candidateY)) continue;
                    nextX = candidateX;
                    nextY = candidateY;
                    nextBacktrack = (directionIndex + 4) % 8;
                    break;
                }

                if (nextX === null) break;
                if (nextX === x && nextY === y) {
                    closed = true;
                    break;
                }

                currentX = nextX;
                currentY = nextY;
                backtrackDirection = nextBacktrack;
            }

            if (chain.length >= minLength) {
                chains.push({ points: chain, closed });
            }

            // 同一连通域只保留一条轮廓，避免厚线条被重复追踪成多条重叠链。
            currentStamp++;
            const stack = [[x, y]];
            while (stack.length > 0) {
                const [currentX, currentY] = stack.pop();
                const currentIndex = currentY * width + currentX;
                if (componentStamp[currentIndex] === currentStamp || !isForeground(currentX, currentY)) continue;
                componentStamp[currentIndex] = currentStamp;
                visited[currentIndex] = 1;
                for (const [dx, dy] of directions) {
                    const nextX = currentX + dx;
                    const nextY = currentY + dy;
                    if (!isForeground(nextX, nextY)) continue;
                    const nextIndex = nextY * width + nextX;
                    if (visited[nextIndex] === 0) stack.push([nextX, nextY]);
                }
            }
        }
    }

    chains.sort((a, b) => getPolylineLength(b.points, b.closed) - getPolylineLength(a.points, a.closed));
    return chains.slice(0, Math.max(1, maxChains));
}

export function resampleChainsExact(chains, targetCount) {
    if (!chains || chains.length === 0) return [];
    const curves = chains.map((chain) => {
        if (Array.isArray(chain)) return { points: chain, closed: false };
        return { points: chain.points || [], closed: Boolean(chain.closed) };
    });
    return sampleCurvesExact(curves, targetCount);
}
