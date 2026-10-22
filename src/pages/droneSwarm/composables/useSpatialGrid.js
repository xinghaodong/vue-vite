/**
 * ========================================================================
 * 文件名称: useSpatialGrid.js
 * 所属模块: 无人机集群编队系统 - 空间防撞安全网格与力导向疏散算法
 * 核心功能:
 *   1. 商业级无人机安全防护核心标准：物理间距必须 >= 1.5 米 (或自定义阈值)；
 *   2. 采用 Spatial Hash Grid (空间哈希网格) 算法，将碰撞检测从 O(N^2) 降至严格的 O(N)；
 *   3. 毫秒级探测千架无人机中的过近危险对 (Collision Pairs)；
 *   4. 基于物理斥力场 (Repulsion Force Field) 提供一键平滑防撞疏散 (Auto-Relaxation)。
 * ========================================================================
 */

export class SpatialHashGrid2D {
    /**
     * @param {number} cellSize 网格单元大小 (通常设为最小安全间距)
     */
    constructor(cellSize = 15) {
        this.cellSize = cellSize;
        this.grid = new Map();
    }

    /**
     * 根据空间坐标计算网格哈希 Key
     * @param {number} x 
     * @param {number} y 
     * @returns {string}
     */
    getKey(x, y) {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        return `${cellX},${cellY}`;
    }

    /**
     * 重建网格哈希表
     * @param {Array<{id: string|number, x: number, y: number}>} agents 
     */
    build(agents) {
        this.grid.clear();
        for (let i = 0; i < agents.length; i++) {
            const agent = agents[i];
            const key = this.getKey(agent.x, agent.y);
            let cell = this.grid.get(key);
            if (!cell) {
                cell = [];
                this.grid.set(key, cell);
            }
            cell.push(agent);
        }
    }

    /**
     * 空间范围查询附近潜在冲突邻居
     * @param {number} x 
     * @param {number} y 
     * @returns {Array}
     */
    getNeighbors(x, y) {
        const centerCellX = Math.floor(x / this.cellSize);
        const centerCellY = Math.floor(y / this.cellSize);
        const neighbors = [];

        // 检索周边 3x3 共 9 个 Cell
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const key = `${centerCellX + dx},${centerCellY + dy}`;
                const cell = this.grid.get(key);
                if (cell) {
                    for (let i = 0; i < cell.length; i++) {
                        neighbors.push(cell[i]);
                    }
                }
            }
        }
        return neighbors;
    }
}

/**
 * 空间碰撞安全检测与力导向疏散 Hook
 */
export function useSpatialGrid() {
    /**
     * 检测点阵是否满足安全距离标准
     * @param {Array<{id: string|number, x: number, y: number}>} agents 点位集合
     * @param {number} minDistance 最小安全间距 (米或画布标定像素，默认 15)
     * @returns {{
     *   isSafe: boolean,
     *   dangerIds: Set<string|number>,
     *   collisionPairs: Array<{a: any, b: any, distance: number}>,
     *   minObservedDistance: number
     * }}
     */
    function checkSafety(agents, minDistance = 15) {
        if (!agents || agents.length < 2) {
            return {
                isSafe: true,
                dangerIds: new Set(),
                collisionPairs: [],
                minObservedDistance: Infinity,
            };
        }

        const grid = new SpatialHashGrid2D(minDistance);
        grid.build(agents);

        const dangerIds = new Set();
        const collisionPairs = [];
        let minObservedDistance = Infinity;
        const checkedPairs = new Set();
        const minDistanceSq = minDistance * minDistance;

        for (let i = 0; i < agents.length; i++) {
            const a = agents[i];
            const neighbors = grid.getNeighbors(a.x, a.y);

            for (let j = 0; j < neighbors.length; j++) {
                const b = neighbors[j];
                if (a.id === b.id) continue;

                // 避免重复检查同一对点 (a, b) 与 (b, a)
                const pairKey = a.id < b.id ? `${a.id}:${b.id}` : `${b.id}:${a.id}`;
                if (checkedPairs.has(pairKey)) continue;
                checkedPairs.add(pairKey);

                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const distSq = dx * dx + dy * dy;

                if (distSq < minDistanceSq) {
                    const actualDist = Math.sqrt(distSq);
                    if (actualDist < minObservedDistance) {
                        minObservedDistance = actualDist;
                    }
                    dangerIds.add(a.id);
                    dangerIds.add(b.id);
                    collisionPairs.push({ a, b, distance: Math.round(actualDist * 100) / 100 });
                }
            }
        }

        return {
            isSafe: dangerIds.size === 0,
            dangerIds,
            collisionPairs,
            minObservedDistance: isFinite(minObservedDistance) ? Math.round(minObservedDistance * 100) / 100 : 0,
        };
    }

    /**
     * 基于物理斥力弹簧场的一键力导向碰撞疏散算法 (Auto-Relaxation)
     * 在保持原本图案几何轮廓最大相似度的前提下，温和推开彼此过近的冲突点
     * 
     * @param {Array} agents 原始点阵
     * @param {number} minDistance 目标安全间距
     * @param {number} iterations 最大松弛迭代轮数 (默认 15)
     * @returns {Array} 疏散优化后的克隆新点位
     */
    function autoRelaxCollisions(agents, minDistance = 15, iterations = 15) {
        if (!agents || agents.length < 2) return agents;

        // 深拷贝点位坐标，避免直接破坏引用
        const relaxed = agents.map((p) => ({ ...p }));
        const grid = new SpatialHashGrid2D(minDistance);

        for (let iter = 0; iter < iterations; iter++) {
            grid.build(relaxed);
            let hasAnyCollision = false;

            for (let i = 0; i < relaxed.length; i++) {
                const a = relaxed[i];
                const neighbors = grid.getNeighbors(a.x, a.y);

                let forceX = 0;
                let forceY = 0;

                for (let j = 0; j < neighbors.length; j++) {
                    const b = neighbors[j];
                    if (a.id === b.id) continue;

                    let dx = a.x - b.x;
                    let dy = a.y - b.y;
                    let dist = Math.sqrt(dx * dx + dy * dy);

                    // 避免完全重合时的除零奇异值
                    if (dist < 0.0001) {
                        dx = (Math.random() - 0.5) * 0.1;
                        dy = (Math.random() - 0.5) * 0.1;
                        dist = Math.sqrt(dx * dx + dy * dy);
                    }

                    if (dist < minDistance) {
                        hasAnyCollision = true;
                        // 斥力位移分量 (胡克弹簧斥力模型，各后退一半重叠距离)
                        const overlap = (minDistance - dist) * 0.5;
                        const nx = dx / dist;
                        const ny = dy / dist;
                        forceX += nx * overlap;
                        forceY += ny * overlap;
                    }
                }

                // 施加阻尼松弛更新，防止震荡
                a.x += forceX * 0.8;
                a.y += forceY * 0.8;
            }

            // 如果已经完全无冲突，提前终止迭代以获得极致性能
            if (!hasAnyCollision) break;
        }

        // 统一四舍五入保留一位小数
        return relaxed.map((p) => ({
            ...p,
            x: Math.round(p.x * 10) / 10,
            y: Math.round(p.y * 10) / 10,
        }));
    }

    return {
        checkSafety,
        autoRelaxCollisions,
    };
}
