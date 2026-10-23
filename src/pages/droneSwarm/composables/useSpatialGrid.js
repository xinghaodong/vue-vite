/**
 * ========================================================================
 * 文件名称: useSpatialGrid.js
 * 所属模块: 无人机集群编队系统 - 设计态间距校验与确定性疏散
 * 功能说明:
 *   1. 使用空间哈希网格计算精确最小点间距，而不是只返回冲突对距离；
 *   2. 明确返回 isSafe / collisionPairs / minObservedDistance，绝不虚报通过；
 *   3. 疏散过程不使用 Math.random()，同输入必得同输出；
 *   4. 仅做 2D 设计态点位间距检查，不代表飞控、通信或飞行安全认证。
 * ========================================================================
 */

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export class SpatialHashGrid2D {
    constructor(cellSize = 15) {
        this.cellSize = Math.max(1e-6, cellSize);
        this.grid = new Map();
        this.minCellX = 0;
        this.maxCellX = 0;
        this.minCellY = 0;
        this.maxCellY = 0;
    }

    getKey(cellX, cellY) {
        return `${cellX},${cellY}`;
    }

    build(agents) {
        this.grid.clear();
        this.minCellX = Infinity;
        this.maxCellX = -Infinity;
        this.minCellY = Infinity;
        this.maxCellY = -Infinity;

        for (let index = 0; index < agents.length; index++) {
            const agent = agents[index];
            const cellX = Math.floor(agent.x / this.cellSize);
            const cellY = Math.floor(agent.y / this.cellSize);
            const key = this.getKey(cellX, cellY);
            let cell = this.grid.get(key);
            if (!cell) {
                cell = [];
                this.grid.set(key, cell);
            }
            cell.push({ agent, index });

            if (cellX < this.minCellX) this.minCellX = cellX;
            if (cellX > this.maxCellX) this.maxCellX = cellX;
            if (cellY < this.minCellY) this.minCellY = cellY;
            if (cellY > this.maxCellY) this.maxCellY = cellY;
        }
    }

    getNeighbors(x, y, radius = 1) {
        const centerCellX = Math.floor(x / this.cellSize);
        const centerCellY = Math.floor(y / this.cellSize);
        const neighbors = [];

        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                const cell = this.grid.get(this.getKey(centerCellX + dx, centerCellY + dy));
                if (!cell) continue;
                for (let i = 0; i < cell.length; i++) neighbors.push(cell[i]);
            }
        }
        return neighbors;
    }

    /**
     * 精确最近邻搜索：逐圈扩大搜索半径，直到未搜索区域的几何下界大于当前最优距离。
     */
    findNearest(index, agent) {
        const cellX = Math.floor(agent.x / this.cellSize);
        const cellY = Math.floor(agent.y / this.cellSize);
        const maxRing = Math.max(
            Math.abs(cellX - this.minCellX),
            Math.abs(this.maxCellX - cellX),
            Math.abs(cellY - this.minCellY),
            Math.abs(this.maxCellY - cellY)
        );

        let bestSq = Infinity;
        let bestIndex = -1;

        for (let ring = 0; ring <= maxRing; ring++) {
            if (ring > 0) {
                const lowerBound = (ring - 1) * this.cellSize;
                if (lowerBound * lowerBound >= bestSq) break;
            }

            for (let dx = -ring; dx <= ring; dx++) {
                for (let dy = -ring; dy <= ring; dy++) {
                    if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
                    const cell = this.grid.get(this.getKey(cellX + dx, cellY + dy));
                    if (!cell) continue;
                    for (let i = 0; i < cell.length; i++) {
                        const entry = cell[i];
                        if (entry.index === index) continue;
                        const ddx = agent.x - entry.agent.x;
                        const ddy = agent.y - entry.agent.y;
                        const distSq = ddx * ddx + ddy * ddy;
                        if (distSq < bestSq) {
                            bestSq = distSq;
                            bestIndex = entry.index;
                        }
                    }
                }
            }
        }

        return { distanceSq: bestSq, index: bestIndex };
    }
}

function collectCollisionPairs(agents, grid, minDistance) {
    const pairs = [];
    const minDistanceSq = minDistance * minDistance;

    for (let i = 0; i < agents.length; i++) {
        const a = agents[i];
        const neighbors = grid.getNeighbors(a.x, a.y, 1);
        for (const entry of neighbors) {
            if (entry.index <= i) continue;
            const b = entry.agent;
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < minDistanceSq) {
                pairs.push({
                    a,
                    b,
                    indexA: i,
                    indexB: entry.index,
                    distance: Math.sqrt(distSq),
                    dx,
                    dy,
                });
            }
        }
    }

    return pairs;
}

export function useSpatialGrid() {
    /**
     * 设计态 2D 间距校验。返回的 minObservedDistance 是真实最近邻距离。
     */
    function checkSafety(agents, minDistance = 1.5) {
        const list = agents || [];
        if (list.length < 2) {
            return {
                isSafe: true,
                dangerIds: new Set(),
                collisionPairs: [],
                collisionCount: 0,
                minObservedDistance: Infinity,
                checkedAgents: list.length,
            };
        }

        const safeDistance = Math.max(1e-6, minDistance);
        const grid = new SpatialHashGrid2D(safeDistance);
        grid.build(list);

        let globalMinSq = Infinity;
        for (let i = 0; i < list.length; i++) {
            const nearest = grid.findNearest(i, list[i]);
            if (nearest.distanceSq < globalMinSq) globalMinSq = nearest.distanceSq;
        }

        const collisionPairs = collectCollisionPairs(list, grid, safeDistance);
        const dangerIds = new Set();
        for (const pair of collisionPairs) {
            dangerIds.add(pair.a.id);
            dangerIds.add(pair.b.id);
        }

        const minObservedDistance = globalMinSq < Infinity ? Math.sqrt(globalMinSq) : Infinity;

        return {
            isSafe: collisionPairs.length === 0,
            dangerIds,
            collisionPairs,
            collisionCount: collisionPairs.length,
            minObservedDistance,
            checkedAgents: list.length,
        };
    }

    /**
     * 成对对称斥力疏散。返回点位、实际迭代次数和复检报告。
     */
    function relaxCollisions(agents, minDistance = 1.5, iterations = 60) {
        if (!agents || agents.length < 2) {
            return {
                agents: agents || [],
                iterationsRun: 0,
                report: checkSafety(agents || [], minDistance),
            };
        }

        const relaxed = agents.map((agent) => ({ ...agent }));
        // 留出 3cm 余量，抵消坐标四舍五入造成的临界回退。
        const relaxDistance = minDistance + 0.03;
        const grid = new SpatialHashGrid2D(relaxDistance);
        let iterationsRun = 0;

        for (let iteration = 0; iteration < iterations; iteration++) {
            iterationsRun = iteration + 1;
            grid.build(relaxed);
            const pairs = collectCollisionPairs(relaxed, grid, relaxDistance);
            if (pairs.length === 0) break;

            const offsetsX = new Float64Array(relaxed.length);
            const offsetsY = new Float64Array(relaxed.length);

            for (const pair of pairs) {
                let dx = pair.dx;
                let dy = pair.dy;
                let distance = pair.distance;

                if (distance < 1e-6) {
                    const angle = GOLDEN_ANGLE * (pair.indexA + pair.indexB * 7 + 1);
                    dx = Math.cos(angle) * 1e-3;
                    dy = Math.sin(angle) * 1e-3;
                    distance = 1e-3;
                }

                const overlap = relaxDistance - distance;
                const push = Math.max(0, overlap) * 0.5;
                const nx = dx / distance;
                const ny = dy / distance;

                offsetsX[pair.indexA] += nx * push;
                offsetsY[pair.indexA] += ny * push;
                offsetsX[pair.indexB] -= nx * push;
                offsetsY[pair.indexB] -= ny * push;
            }

            const maxStep = relaxDistance * 0.45;
            for (let i = 0; i < relaxed.length; i++) {
                let offsetX = offsetsX[i] * 0.75;
                let offsetY = offsetsY[i] * 0.75;
                const length = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
                if (length > maxStep) {
                    offsetX = (offsetX / length) * maxStep;
                    offsetY = (offsetY / length) * maxStep;
                }
                relaxed[i].x += offsetX;
                relaxed[i].y += offsetY;
            }
        }

        const rounded = relaxed.map((agent) => ({
            ...agent,
            x: Math.round(agent.x * 100) / 100,
            y: Math.round(agent.y * 100) / 100,
        }));

        return {
            agents: rounded,
            iterationsRun,
            report: checkSafety(rounded, minDistance),
        };
    }

    function autoRelaxCollisions(agents, minDistance = 1.5, iterations = 60) {
        return relaxCollisions(agents, minDistance, iterations).agents;
    }

    return {
        checkSafety,
        autoRelaxCollisions,
        relaxCollisions,
    };
}
