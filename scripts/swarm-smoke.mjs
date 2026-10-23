import { useContourAlgorithm } from '../src/pages/droneSwarm/composables/useContourAlgorithm.js';
import { useSpatialGrid } from '../src/pages/droneSwarm/composables/useSpatialGrid.js';
import { resampleChainsExact, traceContours } from '../src/pages/droneSwarm/composables/swarmGeometry.js';

const { generatePresetPattern, resampleToTargetCount } = useContourAlgorithm();
const { checkSafety, relaxCollisions } = useSpatialGrid();

function uniqueCount(points) {
    return new Set(points.map((point) => `${point.x.toFixed(4)}:${point.y.toFixed(4)}`)).size;
}

let failed = false;
function assert(condition, message) {
    if (!condition) {
        failed = true;
        console.error('FAIL:', message);
    }
}

for (const type of ['heart', 'star', 'galaxy', 'rings']) {
    for (const count of [400, 800, 1600, 2400]) {
        const first = generatePresetPattern(type, count);
        const second = generatePresetPattern(type, count);
        const unique = uniqueCount(first);
        const report = checkSafety(first, 1.5);
        console.log(
            `${type.padEnd(6)} ${String(count).padStart(4)} -> ${first.length}, unique=${unique}, dmin=${Number.isFinite(report.minObservedDistance) ? report.minObservedDistance.toFixed(2) : '—'}, pairs=${report.collisionCount}, deterministic=${JSON.stringify(first) === JSON.stringify(second)}`
        );
        assert(first.length === count, `${type} ${count} length`);
        assert(unique === count, `${type} ${count} unique`);
        assert(JSON.stringify(first) === JSON.stringify(second), `${type} ${count} deterministic`);
        assert(Math.abs(report.minObservedDistance - report.minObservedDistance) < 1e-9, `${type} dmin finite`);
    }
}

const source = generatePresetPattern('heart', 400);
for (const count of [400, 800, 1600, 2400]) {
    const resampled = resampleToTargetCount(source, count);
    console.log(`resample 400 -> ${count} = ${resampled.length}, unique=${uniqueCount(resampled)}`);
    assert(resampled.length === count, `resample ${count} length`);
    assert(uniqueCount(resampled) === count, `resample ${count} unique`);
}

const width = 240;
const height = 240;
const grid = new Uint8Array(width * height);
for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
        const distance = Math.hypot(x - width / 2, y - height / 2);
        if (Math.abs(distance - 90) < 1.5) grid[y * width + x] = 1;
    }
}
const chains = traceContours(grid, width, height);
for (const count of [400, 800, 1600, 2400]) {
    const points = resampleChainsExact(chains, count);
    console.log(`contour chains=${chains.length} -> ${count} = ${points.length}, unique=${uniqueCount(points)}`);
    assert(points.length === count, `contour ${count} length`);
    assert(uniqueCount(points) === count, `contour ${count} unique`);
}

const unsafe = generatePresetPattern('heart', 800).map((point) => ({ ...point, x: point.x * 0.35, y: point.y * 0.35 }));
const before = checkSafety(unsafe, 1.5);
const relaxed = relaxCollisions(unsafe, 1.5, 80);
console.log(`relax: before pairs=${before.collisionCount} dmin=${before.minObservedDistance.toFixed(2)} -> after pairs=${relaxed.report.collisionCount} dmin=${relaxed.report.minObservedDistance.toFixed(2)} iterations=${relaxed.iterationsRun}`);
assert(relaxed.report.collisionCount <= before.collisionCount, 'relax must not increase collisions');

if (failed) process.exit(1);
