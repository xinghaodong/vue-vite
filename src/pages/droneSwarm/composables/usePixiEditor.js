/**
 * ========================================================================
 * 文件名称: usePixiEditor.js
 * 所属模块: 无人机集群编队系统 - 2D PixiJS 点阵图形编辑器 Hook
 * 功能说明:
 *   基于 Vue 3.5 现代组合式 API 架构：
 *   1. 使用 Vue 3.5 useTemplateRef 优雅解耦 DOM 容器；
 *   2. 基于 Pixi.js v8 构建极致流畅的 2D 暗黑 CAD 画布；
 *   3. 标配矩阵视口漫游系统 (Pan 平移 / Zoom 滚轮缩放 / 坐标逆变换)；
 *   4. 单批次渲染数千架无人机发光粒子（Sprite 批处理）；
 *   5. 遵循严格的生命周期治理规范，组件卸载时 100% 释放显存，零内存泄漏；
 *   6. 支持 Ordered Lasso 按时序圈选拓扑追踪与青色引导线；
 *   7. 支持画布直接操纵式渐变控制轴 (Direct Manipulation Vector)；
 *   8. 支持上色时视觉防干扰机制 (hideSelectionVisual)。
 * ========================================================================
 */

import { shallowRef, ref, onMounted, onBeforeUnmount } from 'vue';
import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js';

let sharedCrispTexture = null;
let sharedGlowTexture = null;

function createCrispDotTexture(app) {
    if (sharedCrispTexture) return sharedCrispTexture;
    const g = new Graphics();
    g.circle(16, 16, 14);
    g.fill({ color: 0xffffff, alpha: 1.0 });
    sharedCrispTexture = app.renderer.generateTexture(g);
    return sharedCrispTexture;
}

function createGlowDotTexture(app) {
    if (sharedGlowTexture) return sharedGlowTexture;
    const g = new Graphics();
    g.circle(24, 24, 22);
    g.fill({ color: 0xffffff, alpha: 0.18 });
    g.circle(24, 24, 14);
    g.fill({ color: 0xffffff, alpha: 0.45 });
    g.circle(24, 24, 8);
    g.fill({ color: 0xffffff, alpha: 1.0 });
    sharedGlowTexture = app.renderer.generateTexture(g);
    return sharedGlowTexture;
}

/**
 * 2D 创意点阵编辑器 Hook
 * @param {import('vue').ShallowRef<HTMLDivElement | null>} containerRef 画布挂载容器
 * @param {Object} options 配置参数
 */
export function usePixiEditor(containerRef, options = {}) {
    const {
        onPointSelect = null,
        onSelectionChange = null,
        onMoveCommit = null,
        onLassoComplete = null,
        onGradientAxisChange = null,
        onGradientAxisCommit = null,
    } = options;

    /** @type {import('vue').ShallowRef<Application | null>} */
    const pixiApp = shallowRef(null);
    const isReady = ref(false);
    const toolMode = ref(options.initialToolMode || 'select'); // 'select' | 'pan' | 'lasso'
    /** @type {import('vue').Ref<Set<string|number>>} */
    const selectedIds = ref(new Set());
    const selectedDroneId = ref(null);

    /** @type {import('vue').ShallowRef<Container | null>} */
    const worldContainer = shallowRef(null);
    /** @type {import('vue').ShallowRef<Graphics | null>} */
    const gridGraphics = shallowRef(null);
    /** @type {import('vue').ShallowRef<Container | null>} */
    const droneLayer = shallowRef(null);
    /** @type {import('vue').ShallowRef<Graphics | null>} */
    const selectionGraphics = shallowRef(null);
    /** @type {import('vue').ShallowRef<Graphics | null>} */
    const marqueeGraphics = shallowRef(null);
    /** @type {import('vue').ShallowRef<Graphics | null>} */
    const gradientGraphics = shallowRef(null);

    /** @type {import('vue').Ref<{startX:number,startY:number,endX:number,endY:number} | null>} */
    const gradientAxis = ref(null);
    const hideSelectionVisual = ref(false);

    /** @type {import('vue').Ref<Array<string|number>>} Ordered Lasso 按时序记录的点位 ID */
    const lassoPath = ref([]);
    const lassoRecorded = new Set();
    let lassoTrail = []; // 屏幕像素点列轨迹

    /** @type {Map<string|number, Sprite>} */
    const spriteMap = new Map();
    /** @type {Map<string|number, Object>} */
    const agentMap = new Map();

    const gesture = {
        mode: null, // 'pan' | 'move' | 'marquee' | 'lasso' | 'drag_grad_start' | 'drag_grad_end' | 'drag_grad_mid'
        startScreenX: 0,
        startScreenY: 0,
        startPanX: 0,
        startPanY: 0,
        startPositions: new Map(),
        moved: false,
    };

    let isSpacePressed = false;
    let unbindViewportEvents = null;

    // 视口相机变换状态
    const viewport = ref({
        zoom: 1.0,
        panX: 0,
        panY: 0,
    });

    const cursorWorldPos = ref({ x: 0, y: 0 });
    const currentBgColor = ref(options.initialBgColor || '#0a0c14');

    const currentRenderCache = {
        agents: [],
        dangerIds: new Set(),
        options: {
            constantScreen: true,
            dotScale: 0.8,
            useGlow: false,
            highlightDanger: true,
            lockedIds: new Set(),
        },
    };

    function isColorDark(hex) {
        if (!hex) return true;
        const clean = hex.replace('#', '');
        const r = parseInt(clean.substring(0, 2), 16) || 0;
        const g = parseInt(clean.substring(2, 4), 16) || 0;
        const b = parseInt(clean.substring(4, 6), 16) || 0;
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance < 0.5;
    }

    function setCanvasBackgroundColor(colorHex) {
        if (!colorHex) return;
        currentBgColor.value = colorHex;
        if (!pixiApp.value) return;
        const cleanHex = colorHex.replace('#', '');
        const num = parseInt(cleanHex, 16);
        if (!isNaN(num)) {
            pixiApp.value.renderer.background.color = num;
            renderCadGrid();
            drawSelectionRings();
            drawGradientAxis();
        }
    }

    function updateSpritesScale() {
        const { constantScreen = true, dotScale = 0.8 } = currentRenderCache.options;
        const basePx = 5.0 * dotScale;
        const zoom = Math.max(0.05, viewport.value.zoom);
        const effectiveSize = constantScreen ? basePx / zoom : basePx;

        for (const [id, sprite] of spriteMap) {
            const isDanger = currentRenderCache.dangerIds && currentRenderCache.dangerIds.has(id);
            const size = isDanger ? effectiveSize * 1.5 : effectiveSize;
            sprite.width = size;
            sprite.height = size;
        }
        drawSelectionRings();
        drawGradientAxis();
    }

    function drawSelectionRings() {
        const g = selectionGraphics.value;
        if (!g) return;
        g.clear();

        // 视觉防干扰机制：上色时隐藏高亮外圈
        if (hideSelectionVisual.value) return;
        if (selectedIds.value.size === 0) return;

        const zoom = Math.max(0.05, viewport.value.zoom);
        const radius = 7.5 / zoom;
        const lineWidth = 1.5 / zoom;

        for (const id of selectedIds.value) {
            const sprite = spriteMap.get(id);
            if (sprite) {
                g.circle(sprite.x, sprite.y, radius);
            }
        }
        g.stroke({ width: lineWidth, color: 0x67e8f9, alpha: 0.95 });
    }

    function emitSelectionChange() {
        drawSelectionRings();
        if (onSelectionChange) onSelectionChange([...selectedIds.value]);
    }

    function setSelection(ids) {
        selectedIds.value = new Set(ids || []);
        emitSelectionChange();
    }

    function clearSelection() {
        selectedIds.value = new Set();
        emitSelectionChange();
    }

    function selectAll() {
        const ids = [];
        for (const [id, sprite] of spriteMap) {
            if (!sprite.customLocked) ids.push(id);
        }
        setSelection(ids);
    }

    function setToolMode(mode) {
        toolMode.value = mode === 'pan' ? 'pan' : mode === 'lasso' ? 'lasso' : 'select';
        updateCursorStyle();
    }

    function setHideSelectionVisual(val) {
        hideSelectionVisual.value = Boolean(val);
        drawSelectionRings();
    }

    function updateCursorStyle() {
        const container = containerRef.value;
        if (!container) return;
        if (toolMode.value === 'pan' || isSpacePressed) {
            container.style.cursor = 'grab';
        } else if (toolMode.value === 'lasso') {
            container.style.cursor = 'crosshair';
        } else {
            container.style.cursor = 'default';
        }
    }

    function getScreenPoint(clientX, clientY) {
        const container = containerRef.value;
        if (!container) return { x: 0, y: 0 };
        const rect = container.getBoundingClientRect();
        return { x: clientX - rect.left, y: clientY - rect.top };
    }

    /**
     * 以屏幕像素容差 hitTest 最近无人机点位
     */
    function hitTestAgent(screenX, screenY, threshold = 12) {
        const zoom = viewport.value.zoom;
        const panX = viewport.value.panX;
        const panY = viewport.value.panY;
        let nearest = null;

        for (const [id, sprite] of spriteMap) {
            if (sprite.customLocked) continue;
            const dx = sprite.x * zoom + panX - screenX;
            const dy = sprite.y * zoom + panY - screenY;
            const distanceSq = dx * dx + dy * dy;
            if (distanceSq <= threshold * threshold && (!nearest || distanceSq < nearest.distanceSq)) {
                nearest = { id, distanceSq };
            }
        }
        return nearest;
    }

    /**
     * 渐变轴控制手柄命中检测
     */
    function hitTestGradientHandles(worldX, worldY) {
        if (!gradientAxis.value) return null;
        const zoom = viewport.value.zoom;
        const handleRadius = 14 / zoom;
        const { startX, startY, endX, endY } = gradientAxis.value;

        // 起点手柄
        const dStart = Math.hypot(worldX - startX, worldY - (-startY));
        if (dStart <= handleRadius) return 'drag_grad_start';

        // 终点手柄
        const dEnd = Math.hypot(worldX - endX, worldY - (-endY));
        if (dEnd <= handleRadius) return 'drag_grad_end';

        // 中心轴线
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        const dMid = Math.hypot(worldX - midX, worldY - (-midY));
        if (dMid <= handleRadius) return 'drag_grad_mid';

        return null;
    }

    /**
     * 绘制 2D 画布渐变直接操纵控制轴
     */
    function drawGradientAxis() {
        const g = gradientGraphics.value;
        if (!g) return;
        g.clear();
        if (!gradientAxis.value) return;

        const { startX, startY, endX, endY } = gradientAxis.value;
        const zoom = Math.max(0.05, viewport.value.zoom);
        const lineWidth = 2 / zoom;
        const handleR = 6 / zoom;
        const ringR = 10 / zoom;

        // 注意世界坐标系 Y 轴翻转
        const pyStart = -startY;
        const pyEnd = -endY;

        // 1. 轴线基线
        g.moveTo(startX, pyStart);
        g.lineTo(endX, pyEnd);
        g.stroke({ width: lineWidth, color: 0x00f2fe, alpha: 0.9 });

        // 2. 起始手柄 (绿色点 + 光环)
        g.circle(startX, pyStart, ringR);
        g.stroke({ width: 1.5 / zoom, color: 0x2dff6a, alpha: 0.8 });
        g.circle(startX, pyStart, handleR);
        g.fill({ color: 0x2dff6a, alpha: 1.0 });

        // 3. 终点手柄 (蓝色点 + 光环)
        g.circle(endX, pyEnd, ringR);
        g.stroke({ width: 1.5 / zoom, color: 0x2454ff, alpha: 0.8 });
        g.circle(endX, pyEnd, handleR);
        g.fill({ color: 0x2454ff, alpha: 1.0 });

        // 4. 中点角度旋转手柄 (青金准星)
        const midX = (startX + endX) / 2;
        const midY = (pyStart + pyEnd) / 2;
        g.circle(midX, midY, handleR * 0.9);
        g.fill({ color: 0x00f2fe, alpha: 0.95 });
        g.circle(midX, midY, ringR * 0.8);
        g.stroke({ width: 1 / zoom, color: 0xffffff, alpha: 0.7 });
    }

    function setGradientAxis(axis) {
        if (!axis) {
            gradientAxis.value = null;
        } else {
            gradientAxis.value = {
                startX: axis.startX ?? -40,
                startY: axis.startY ?? 0,
                endX: axis.endX ?? 40,
                endY: axis.endY ?? 0,
            };
        }
        drawGradientAxis();
    }

    function clearGradientAxis() {
        gradientAxis.value = null;
        drawGradientAxis();
    }

    function beginMoveGesture(startScreenX, startScreenY) {
        gesture.mode = 'move';
        gesture.moved = false;
        gesture.startScreenX = startScreenX;
        gesture.startScreenY = startScreenY;
        gesture.startPositions.clear();
        for (const id of selectedIds.value) {
            const sprite = spriteMap.get(id);
            if (!sprite || sprite.customLocked) continue;
            gesture.startPositions.set(id, { x: sprite.x, y: sprite.y });
        }
    }

    function selectAgentAtPoint(agentId, shiftKey, screenX, screenY) {
        const next = new Set(selectedIds.value);
        if (shiftKey) {
            if (next.has(agentId)) next.delete(agentId);
            else next.add(agentId);
        } else if (!next.has(agentId)) {
            next.clear();
            next.add(agentId);
        }

        selectedIds.value = next;
        selectedDroneId.value = agentId;
        const agent = agentMap.get(agentId);
        if (agent && onPointSelect) onPointSelect(agent);
        emitSelectionChange();

        if (next.has(agentId)) beginMoveGesture(screenX, screenY);
    }

    function drawMarquee(startX, startY, endX, endY) {
        const g = marqueeGraphics.value;
        if (!g) return;
        const left = Math.min(startX, endX);
        const top = Math.min(startY, endY);
        const width = Math.abs(endX - startX);
        const height = Math.abs(endY - startY);
        g.clear();
        g.rect(left, top, width, height);
        g.fill({ color: 0x67e8f9, alpha: 0.08 });
        g.rect(left, top, width, height);
        g.stroke({ width: 1, color: 0x67e8f9, alpha: 0.9 });
    }

    function drawLassoTrail(trail) {
        const g = marqueeGraphics.value;
        if (!g) return;
        g.clear();
        if (!trail || trail.length < 2) return;

        g.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length; i++) {
            g.lineTo(trail[i].x, trail[i].y);
        }
        g.stroke({ width: 2, color: 0x00f2fe, alpha: 0.95 });
    }

    /**
     * 绘制 CAD 风格暗黑网格标尺、200m 物理边界与中心十字准星
     */
    function renderCadGrid() {
        if (!gridGraphics.value || !pixiApp.value) return;
        const g = gridGraphics.value;
        const { width, height } = pixiApp.value.screen;
        const { zoom, panX, panY } = viewport.value;

        g.clear();

        const isDark = isColorDark(currentBgColor.value);
        const step = 40 * zoom;
        const majorStep = step * 5;

        // 次级微网格细线
        const subGridColor = isDark ? 0x243149 : 0xe2e8f0;
        const subGridAlpha = isDark ? 0.72 : 0.85;
        g.setStrokeStyle({ width: 1, color: subGridColor, alpha: subGridAlpha });
        const startX = panX % step;
        for (let x = startX; x < width; x += step) {
            g.moveTo(x, 0);
            g.lineTo(x, height);
        }
        const startY = panY % step;
        for (let y = startY; y < height; y += step) {
            g.moveTo(0, y);
            g.lineTo(width, y);
        }
        g.stroke();

        // 主标尺粗线
        const majorGridColor = isDark ? 0x33445f : 0x94a3b8;
        const majorGridAlpha = isDark ? 0.9 : 0.75;
        g.setStrokeStyle({ width: 1, color: majorGridColor, alpha: majorGridAlpha });
        const majorStartX = panX % majorStep;
        for (let x = majorStartX; x < width; x += majorStep) {
            g.moveTo(x, 0);
            g.lineTo(x, height);
        }
        const majorStartY = panY % majorStep;
        for (let y = majorStartY; y < height; y += majorStep) {
            g.moveTo(0, y);
            g.lineTo(width, y);
        }
        g.stroke();

        // 🌟 200m × 200m 工业级实机物理安全包络框 (坐标 [-100, 100])
        const halfBox = 100;
        const screenX1 = (-halfBox) * zoom + panX;
        const screenY1 = (-halfBox) * zoom + panY;
        const screenBoxSize = (halfBox * 2) * zoom;
        g.rect(screenX1, screenY1, screenBoxSize, screenBoxSize);
        g.stroke({ width: 1.5, color: 0x00f2fe, alpha: 0.35 });

        // 原点十字准星 (0, 0)
        const crossColor = isDark ? 0x00f2fe : 0x2563eb;
        g.setStrokeStyle({ width: 1.5, color: crossColor, alpha: 0.9 });
        g.moveTo(panX - 20, panY);
        g.lineTo(panX + 20, panY);
        g.moveTo(panX, panY - 20);
        g.lineTo(panX, panY + 20);
        g.stroke();
        g.circle(panX, panY, 4);
        g.fill({ color: crossColor, alpha: 0.4 });
    }

    /**
     * 批量向画布渲染无人机发光点位
     */
    function renderDroneAgents(agents, dangerIds = new Set(), renderOptions = {}) {
        currentRenderCache.agents = agents;
        currentRenderCache.dangerIds = dangerIds;
        currentRenderCache.options = {
            constantScreen: true,
            dotScale: 0.8,
            useGlow: false,
            highlightDanger: true,
            lockedIds: new Set(),
            ...renderOptions,
        };

        if (!droneLayer.value || !pixiApp.value) return;
        const layer = droneLayer.value;

        layer.removeChildren();
        spriteMap.clear();
        agentMap.clear();

        const { useGlow = false, highlightDanger = true, lockedIds = new Set() } = currentRenderCache.options;
        const texture = useGlow
            ? createGlowDotTexture(pixiApp.value)
            : createCrispDotTexture(pixiApp.value);

        agents.forEach((agent) => {
            const isDanger = dangerIds && dangerIds.has(agent.id);
            const isLocked = lockedIds instanceof Set
                ? lockedIds.has(agent.layerId || 'layer_main')
                : Array.isArray(lockedIds) && lockedIds.includes(agent.layerId || 'layer_main');

            const sprite = new Sprite(texture);
            sprite.anchor.set(0.5);
            sprite.x = agent.x;
            sprite.y = -agent.y; // 数学世界向上为正，Canvas 默认向下为正
            sprite.customIsDanger = isDanger;
            sprite.customLocked = isLocked;
            sprite.customAgentId = agent.id;

            if (isDanger && highlightDanger) {
                sprite.tint = 0xff2255;
            } else if (agent.color) {
                const hexNum = parseInt(agent.color.replace('#', ''), 16);
                sprite.tint = isNaN(hexNum) ? 0x00f2fe : hexNum;
            } else {
                sprite.tint = 0x00f2fe;
            }

            sprite.alpha = isDanger ? 1.0 : (agent.alpha ?? 1.0);
            sprite.eventMode = 'static';
            sprite.cursor = isLocked ? 'not-allowed' : toolMode.value === 'pan' ? 'grab' : 'pointer';

            layer.addChild(sprite);
            spriteMap.set(agent.id, sprite);
            agentMap.set(agent.id, agent);
        });

        const validIds = new Set(agents.map((agent) => agent.id));
        selectedIds.value = new Set([...selectedIds.value].filter((id) => validIds.has(id)));

        updateSpritesScale();
    }

    async function initPixi() {
        const container = containerRef.value;
        if (!container) return;

        const cleanHex = currentBgColor.value.replace('#', '');
        const bgNum = parseInt(cleanHex, 16) || 0x0a0c14;

        const app = new Application();
        await app.init({
            resizeTo: container,
            backgroundColor: bgNum,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
        });

        container.appendChild(app.canvas);
        pixiApp.value = app;
        app.stage.eventMode = 'static';
        app.stage.hitArea = app.screen;

        viewport.value.panX = app.screen.width / 2;
        viewport.value.panY = app.screen.height / 2;

        // 1. 底层：CAD 背景网格
        const grid = new Graphics();
        app.stage.addChild(grid);
        gridGraphics.value = grid;

        // 2. 中层：可漫游缩放的世界容器
        const world = new Container();
        world.x = viewport.value.panX;
        world.y = viewport.value.panY;
        world.scale.set(viewport.value.zoom);
        app.stage.addChild(world);
        worldContainer.value = world;

        // 3. 点阵层
        const drones = new Container();
        world.addChild(drones);
        droneLayer.value = drones;

        // 4. 选中圈层
        const selection = new Graphics();
        world.addChild(selection);
        selectionGraphics.value = selection;

        // 5. 渐变直接操纵控制轴
        const gradG = new Graphics();
        world.addChild(gradG);
        gradientGraphics.value = gradG;

        // 6. 顶层框选 / Lasso 轨迹层 (屏幕坐标)
        const marquee = new Graphics();
        app.stage.addChild(marquee);
        marqueeGraphics.value = marquee;

        renderCadGrid();

        unbindViewportEvents = bindViewportEvents(container);
        app.stage.on('pointerdown', handleStagePointerDown);
        app.stage.on('pointerup', handleStagePointerUp);
        app.stage.on('pointerupoutside', handleStagePointerUp);

        if (currentRenderCache.agents.length) {
            renderDroneAgents(currentRenderCache.agents, currentRenderCache.dangerIds, currentRenderCache.options);
        }
        isReady.value = true;
    }

    function bindViewportEvents(container) {
        const onMouseMove = (e) => {
            const point = getScreenPoint(e.clientX, e.clientY);
            const worldX = (point.x - viewport.value.panX) / viewport.value.zoom;
            const worldY = -(point.y - viewport.value.panY) / viewport.value.zoom;
            cursorWorldPos.value = {
                x: Math.round(worldX * 100) / 100,
                y: Math.round(worldY * 100) / 100,
            };

            if (gesture.mode === 'pan') {
                viewport.value.panX = gesture.startPanX + (point.x - gesture.startScreenX);
                viewport.value.panY = gesture.startPanY + (point.y - gesture.startScreenY);
                if (worldContainer.value) {
                    worldContainer.value.x = viewport.value.panX;
                    worldContainer.value.y = viewport.value.panY;
                }
                renderCadGrid();
                drawSelectionRings();
                drawGradientAxis();
                return;
            }

            if (gesture.mode === 'lasso') {
                lassoTrail.push(point);
                drawLassoTrail(lassoTrail);

                // 实时捕捉光标扫过的无人机点位并按序入列
                const hit = hitTestAgent(point.x, point.y, 16);
                if (hit && !lassoRecorded.has(hit.id)) {
                    lassoRecorded.add(hit.id);
                    lassoPath.value.push(hit.id);
                    selectedIds.value.add(hit.id);
                    drawSelectionRings();
                }
                return;
            }

            if (gesture.mode === 'drag_grad_start' || gesture.mode === 'drag_grad_end' || gesture.mode === 'drag_grad_mid') {
                if (gradientAxis.value) {
                    if (gesture.mode === 'drag_grad_start') {
                        gradientAxis.value.startX = Math.round(worldX * 10) / 10;
                        gradientAxis.value.startY = Math.round(worldY * 10) / 10;
                    } else if (gesture.mode === 'drag_grad_end') {
                        gradientAxis.value.endX = Math.round(worldX * 10) / 10;
                        gradientAxis.value.endY = Math.round(worldY * 10) / 10;
                    } else if (gesture.mode === 'drag_grad_mid') {
                        const dx = worldX - (gradientAxis.value.startX + gradientAxis.value.endX) / 2;
                        const dy = worldY - (gradientAxis.value.startY + gradientAxis.value.endY) / 2;
                        gradientAxis.value.startX = Math.round((gradientAxis.value.startX + dx) * 10) / 10;
                        gradientAxis.value.startY = Math.round((gradientAxis.value.startY + dy) * 10) / 10;
                        gradientAxis.value.endX = Math.round((gradientAxis.value.endX + dx) * 10) / 10;
                        gradientAxis.value.endY = Math.round((gradientAxis.value.endY + dy) * 10) / 10;
                    }
                    drawGradientAxis();
                    if (onGradientAxisChange) {
                        const deg = Math.round((Math.atan2(gradientAxis.value.endY - gradientAxis.value.startY, gradientAxis.value.endX - gradientAxis.value.startX) * 180 / Math.PI + 360) % 360);
                        onGradientAxisChange({ ...gradientAxis.value, angleDeg: deg });
                    }
                }
                return;
            }

            if (gesture.mode === 'marquee') {
                drawMarquee(gesture.startScreenX, gesture.startScreenY, point.x, point.y);
                return;
            }

            if (gesture.mode === 'move') {
                const dx = (point.x - gesture.startScreenX) / viewport.value.zoom;
                const dy = (point.y - gesture.startScreenY) / viewport.value.zoom;
                if (Math.abs(point.x - gesture.startScreenX) > 2 || Math.abs(point.y - gesture.startScreenY) > 2) {
                    gesture.moved = true;
                }
                for (const [id, start] of gesture.startPositions) {
                    const sprite = spriteMap.get(id);
                    if (!sprite) continue;
                    sprite.x = start.x + dx;
                    sprite.y = start.y + dy;
                }
                drawSelectionRings();
            }
        };

        const onMouseUp = (e) => finishGesture(e.clientX, e.clientY, e.shiftKey);

        const onWheel = (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
            const newZoom = Math.min(5.0, Math.max(0.15, viewport.value.zoom * zoomFactor));
            const point = getScreenPoint(e.clientX, e.clientY);

            viewport.value.panX = point.x - (point.x - viewport.value.panX) * (newZoom / viewport.value.zoom);
            viewport.value.panY = point.y - (point.y - viewport.value.panY) * (newZoom / viewport.value.zoom);
            viewport.value.zoom = newZoom;

            if (worldContainer.value) {
                worldContainer.value.scale.set(newZoom);
                worldContainer.value.x = viewport.value.panX;
                worldContainer.value.y = viewport.value.panY;
            }
            renderCadGrid();
            updateSpritesScale();
            drawGradientAxis();
        };

        const isTypingTarget = (target) => {
            if (!target) return false;
            const tag = target.tagName;
            return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
        };

        const onKeyDown = (e) => {
            if (isTypingTarget(e.target)) return;
            if (e.code === 'Space') {
                isSpacePressed = true;
                updateCursorStyle();
                e.preventDefault();
            }
        };

        const onKeyUp = (e) => {
            if (e.code === 'Space') {
                isSpacePressed = false;
                updateCursorStyle();
            }
        };

        const onResize = () => {
            if (pixiApp.value) pixiApp.value.stage.hitArea = pixiApp.value.screen;
            renderCadGrid();
            drawSelectionRings();
            drawGradientAxis();
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        container.addEventListener('wheel', onWheel, { passive: false });
        window.addEventListener('resize', onResize);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            container.removeEventListener('wheel', onWheel);
            window.removeEventListener('resize', onResize);
        };
    }

    function handleStagePointerDown(e) {
        const button = e.button ?? 0;
        if (button === 2) return;

        const clientX = e.clientX ?? e.nativeEvent?.clientX ?? 0;
        const clientY = e.clientY ?? e.nativeEvent?.clientY ?? 0;
        const point = getScreenPoint(clientX, clientY);
        const wantsPan = button === 1 || toolMode.value === 'pan' || isSpacePressed;

        if (wantsPan) {
            gesture.mode = 'pan';
            gesture.startScreenX = point.x;
            gesture.startScreenY = point.y;
            gesture.startPanX = viewport.value.panX;
            gesture.startPanY = viewport.value.panY;
            if (containerRef.value) containerRef.value.style.cursor = 'grabbing';
            return;
        }

        const worldX = (point.x - viewport.value.panX) / viewport.value.zoom;
        const worldY = -(point.y - viewport.value.panY) / viewport.value.zoom;

        // 检查渐变轴手柄命中
        const gradHandle = hitTestGradientHandles(worldX, worldY);
        if (gradHandle) {
            gesture.mode = gradHandle;
            gesture.startScreenX = point.x;
            gesture.startScreenY = point.y;
            return;
        }

        // Ordered Lasso 工具模式
        if (toolMode.value === 'lasso') {
            gesture.mode = 'lasso';
            lassoTrail = [point];
            lassoPath.value = [];
            lassoRecorded.clear();
            const hit = hitTestAgent(point.x, point.y, 16);
            if (hit) {
                lassoRecorded.add(hit.id);
                lassoPath.value.push(hit.id);
                selectedIds.value = new Set([hit.id]);
                drawSelectionRings();
            }
            return;
        }

        // 默认选择工具模式
        if (button === 0 && toolMode.value === 'select') {
            const shiftKey = Boolean(e.shiftKey ?? e.nativeEvent?.shiftKey);
            const hit = hitTestAgent(point.x, point.y, 12);
            if (hit) {
                selectAgentAtPoint(hit.id, shiftKey, point.x, point.y);
                return;
            }

            gesture.mode = 'marquee';
            gesture.startScreenX = point.x;
            gesture.startScreenY = point.y;
            if (!shiftKey) {
                selectedIds.value = new Set();
                emitSelectionChange();
            }
            drawMarquee(point.x, point.y, point.x, point.y);
        }
    }

    function handleStagePointerUp(e) {
        const clientX = e.clientX ?? e.nativeEvent?.clientX ?? 0;
        const clientY = e.clientY ?? e.nativeEvent?.clientY ?? 0;
        finishGesture(clientX, clientY, Boolean(e.shiftKey));
    }

    function finishGesture(clientX, clientY, shiftKey = false) {
        if (!gesture.mode) return;
        const mode = gesture.mode;
        gesture.mode = null;

        if (mode === 'lasso') {
            if (marqueeGraphics.value) marqueeGraphics.value.clear();
            lassoTrail = [];
            emitSelectionChange();
            if (onLassoComplete) onLassoComplete([...lassoPath.value]);
        } else if (mode === 'drag_grad_start' || mode === 'drag_grad_end' || mode === 'drag_grad_mid') {
            if (gradientAxis.value && onGradientAxisCommit) {
                const deg = Math.round((Math.atan2(gradientAxis.value.endY - gradientAxis.value.startY, gradientAxis.value.endX - gradientAxis.value.startX) * 180 / Math.PI + 360) % 360);
                onGradientAxisCommit({ ...gradientAxis.value, angleDeg: deg });
            }
        } else if (mode === 'move') {
            if (gesture.moved && onMoveCommit) {
                const updates = [];
                for (const id of gesture.startPositions.keys()) {
                    const sprite = spriteMap.get(id);
                    if (!sprite) continue;
                    updates.push({
                        id,
                        x: Math.round(sprite.x * 100) / 100,
                        y: Math.round(-sprite.y * 100) / 100,
                    });
                }
                if (updates.length > 0) onMoveCommit(updates);
            }
        } else if (mode === 'marquee') {
            const point = getScreenPoint(clientX, clientY);
            const left = Math.min(gesture.startScreenX, point.x);
            const right = Math.max(gesture.startScreenX, point.x);
            const top = Math.min(gesture.startScreenY, point.y);
            const bottom = Math.max(gesture.startScreenY, point.y);

            const worldLeft = (left - viewport.value.panX) / viewport.value.zoom;
            const worldRight = (right - viewport.value.panX) / viewport.value.zoom;
            const worldTop = (top - viewport.value.panY) / viewport.value.zoom;
            const worldBottom = (bottom - viewport.value.panY) / viewport.value.zoom;

            const next = shiftKey ? new Set(selectedIds.value) : new Set();
            if (right - left > 2 && bottom - top > 2) {
                for (const [id, sprite] of spriteMap) {
                    if (sprite.customLocked) continue;
                    if (sprite.x >= worldLeft && sprite.x <= worldRight && sprite.y >= worldTop && sprite.y <= worldBottom) {
                        next.add(id);
                    }
                }
            }
            selectedIds.value = next;
            emitSelectionChange();
            if (marqueeGraphics.value) marqueeGraphics.value.clear();
        }

        gesture.startPositions.clear();
        gesture.moved = false;
        updateCursorStyle();
    }

    function resetCamera() {
        if (!pixiApp.value || !worldContainer.value) return;
        viewport.value.zoom = 1.0;
        viewport.value.panX = pixiApp.value.screen.width / 2;
        viewport.value.panY = pixiApp.value.screen.height / 2;

        worldContainer.value.scale.set(1.0);
        worldContainer.value.x = viewport.value.panX;
        worldContainer.value.y = viewport.value.panY;
        renderCadGrid();
        updateSpritesScale();
        drawSelectionRings();
        drawGradientAxis();
    }

    onMounted(() => {
        initPixi();
    });

    onBeforeUnmount(() => {
        if (unbindViewportEvents) {
            unbindViewportEvents();
            unbindViewportEvents = null;
        }
        if (pixiApp.value) {
            try {
                pixiApp.value.stage.off('pointerdown', handleStagePointerDown);
                pixiApp.value.stage.off('pointerup', handleStagePointerUp);
                pixiApp.value.stage.off('pointerupoutside', handleStagePointerUp);
                pixiApp.value.destroy(true, { children: true, texture: true });
            } catch (err) {
                console.warn('[PixiEditor] App destroy warning:', err);
            }
            pixiApp.value = null;
        }
        if (sharedCrispTexture) {
            try { sharedCrispTexture.destroy(true); } catch (_) {}
            sharedCrispTexture = null;
        }
        if (sharedGlowTexture) {
            try { sharedGlowTexture.destroy(true); } catch (_) {}
            sharedGlowTexture = null;
        }
    });

    return {
        pixiApp,
        isReady,
        toolMode,
        selectedIds,
        selectedDroneId,
        lassoPath,
        gradientAxis,
        viewport,
        cursorWorldPos,
        currentBgColor,
        setToolMode,
        setSelection,
        clearSelection,
        selectAll,
        setCanvasBackgroundColor,
        isColorDark,
        setHideSelectionVisual,
        setGradientAxis,
        clearGradientAxis,
        renderDroneAgents,
        resetCamera,
    };
}
