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
 *   5. 遵循严格的生命周期治理规范，组件卸载时 100% 释放显存，零内存泄漏。
 * ========================================================================
 */

import { shallowRef, ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { Application, Container, Graphics, Sprite, Texture, FederatedPointerEvent } from 'pixi.js';

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
    } = options;

    /** @type {import('vue').ShallowRef<Application | null>} */
    const pixiApp = shallowRef(null);
    const isReady = ref(false);
    const toolMode = ref(options.initialToolMode || 'select');
    /** @type {import('vue').Ref<Set<string|number>>} */
    const selectedIds = ref(new Set());
    /** @type {import('vue').ShallowRef<Container | null>} */
    const worldContainer = shallowRef(null); // 可自由缩放与平移的无限世界层
    /** @type {import('vue').ShallowRef<Graphics | null>} */
    const gridGraphics = shallowRef(null);
    /** @type {import('vue').ShallowRef<Container | null>} */
    const droneLayer = shallowRef(null);
    /** @type {import('vue').ShallowRef<Graphics | null>} */
    const selectionGraphics = shallowRef(null);
    /** @type {import('vue').ShallowRef<Graphics | null>} */
    const marqueeGraphics = shallowRef(null);

    /** @type {Map<string|number, Sprite>} */
    const spriteMap = new Map();
    /** @type {Map<string|number, Object>} */
    const agentMap = new Map();
    const gesture = {
        mode: null,
        startScreenX: 0,
        startScreenY: 0,
        startPanX: 0,
        startPanY: 0,
        startPositions: new Map(),
        moved: false,
    };
    let isSpacePressed = false;
    let unbindViewportEvents = null;

    // 视口变换状态 (Camera State)
    const viewport = ref({
        zoom: 1.0,
        panX: 0,
        panY: 0,
        isDragging: false,
        dragStartX: 0,
        dragStartY: 0,
    });

    // 鼠标在 CAD 物理世界的实时坐标 (米/像素)
    const cursorWorldPos = ref({ x: 0, y: 0 });

    // 当前画布背景底色 (支持用户任意自定义及跟随主题)
    const currentBgColor = ref(options.initialBgColor || '#0a0c14');

    /**
     * 判断颜色是否为暗色 (标准感知亮度公式)
     */
    function isColorDark(hex) {
        if (!hex) return true;
        const clean = hex.replace('#', '');
        const r = parseInt(clean.substring(0, 2), 16) || 0;
        const g = parseInt(clean.substring(2, 4), 16) || 0;
        const b = parseInt(clean.substring(4, 6), 16) || 0;
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance < 0.5;
    }

    /**
     * 动态设置视口画布背景色并触发网格与对比度重算
     */
    function setCanvasBackgroundColor(colorHex) {
        if (!colorHex) return;
        currentBgColor.value = colorHex;
        if (!pixiApp.value) return;

        const cleanHex = colorHex.replace('#', '');
        const num = parseInt(cleanHex, 16);
        if (!isNaN(num)) {
            pixiApp.value.renderer.background.color = num;
            renderCadGrid();
            // 刷新粒子抗对比度纹理
            if (sharedCrispTexture) {
                try { sharedCrispTexture.destroy(true); } catch (_) {}
                sharedCrispTexture = null;
            }
            if (currentRenderCache.agents && currentRenderCache.agents.length) {
                renderDroneAgents(currentRenderCache.agents, currentRenderCache.dangerIds, currentRenderCache.options);
            }
        }
    }

    // 当前选中的无人机 ID
    const selectedDroneId = ref(null);

    // 缓存离屏粒子纹理与当前渲染上下文
    let sharedCrispTexture = null;
    let sharedGlowTexture = null;
    let currentRenderCache = {
        agents: [],
        dangerIds: new Set(),
        options: { constantScreen: true, dotScale: 0.8, useGlow: false },
    };

    /**
     * 生成 64x64 超采样 CAD 级高锐度矢量微圆点纹理 (边缘绝对光滑锐利，明暗背景高对比)
     */
    function createCrispDotTexture(app) {
        const isDark = isColorDark(currentBgColor.value);
        const cacheKey = isDark ? 'dark' : 'light';
        if (sharedCrispTexture && sharedCrispTexture.__themeMode === cacheKey) {
            return sharedCrispTexture;
        }
        if (sharedCrispTexture) {
            try { sharedCrispTexture.destroy(true); } catch (_) {}
            sharedCrispTexture = null;
        }

        const size = 64;
        const g = new Graphics();

        // 浅色背景模式下：增加细腻微对比暗圈，防止浅色/白芯 LED 点位在白底上发虚
        if (!isDark) {
            g.circle(size / 2, size / 2, 22);
            g.fill({ color: 0x0f172a, alpha: 0.22 });
        }

        // 核心实心高亮圆点 (半径 18px，超清抗锯齿采样)
        g.circle(size / 2, size / 2, 18);
        g.fill({ color: 0xffffff, alpha: 1.0 });

        // 极细腻微亚像素抗锯齿边缘
        g.circle(size / 2, size / 2, 21);
        g.fill({ color: 0xffffff, alpha: isDark ? 0.35 : 0.6 });

        sharedCrispTexture = app.renderer.generateTexture(g);
        sharedCrispTexture.__themeMode = cacheKey;
        return sharedCrispTexture;
    }

    /**
     * 生成柔和霓虹夜空发光微晕纹理
     */
    function createGlowDotTexture(app) {
        if (sharedGlowTexture) return sharedGlowTexture;
        const size = 64;
        const g = new Graphics();
        // 外围柔和微晕
        g.circle(size / 2, size / 2, 28);
        g.fill({ color: 0xffffff, alpha: 0.25 });

        // 核心白芯
        g.circle(size / 2, size / 2, 12);
        g.fill({ color: 0xffffff, alpha: 1.0 });

        sharedGlowTexture = app.renderer.generateTexture(g);
        return sharedGlowTexture;
    }

    /**
     * 动态补偿无人机粒子在屏幕空间的渲染尺寸 (实现 CAD 级放大无模糊、恒定针尖点)
     */
    function updateSpritesScale() {
        if (!droneLayer.value) return;
        const zoom = viewport.value.zoom;
        const { constantScreen = true, dotScale = 0.8 } = currentRenderCache.options;
        const layer = droneLayer.value;

        // CAD 专业视口规范：点位屏幕像素尺寸恒定 (默认 ~5.5px)，
        // 用户放大视口时拉大的是物理空间间距，而点本身永远锐利纤细，绝不糊化变成大圆盘！
        const basePixelSize = 6.0 * dotScale;
        const effectiveSize = constantScreen ? (basePixelSize / zoom) : (basePixelSize * 0.8);

        for (let i = 0; i < layer.children.length; i++) {
            const sprite = layer.children[i];
            const isDanger = sprite.customIsDanger;
            const size = isDanger ? effectiveSize * 1.5 : effectiveSize;
            sprite.width = size;
            sprite.height = size;
        }
        drawSelectionRings();
    }

    function drawSelectionRings() {
        const g = selectionGraphics.value;
        if (!g) return;

        g.clear();
        if (selectedIds.value.size === 0) return;

        const zoom = Math.max(0.05, viewport.value.zoom);
        const radius = 7.5 / zoom;
        const lineWidth = 1.5 / zoom;

        for (const id of selectedIds.value) {
            const sprite = spriteMap.get(id);
            if (sprite) g.circle(sprite.x, sprite.y, radius);
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
        toolMode.value = mode === 'pan' ? 'pan' : 'select';
        updateCursorStyle();
    }

    function updateCursorStyle() {
        const container = containerRef.value;
        if (!container) return;
        container.style.cursor = toolMode.value === 'pan' || isSpacePressed ? 'grab' : 'crosshair';
    }

    function getScreenPoint(clientX, clientY) {
        const container = containerRef.value;
        if (!container) return { x: 0, y: 0 };
        const rect = container.getBoundingClientRect();
        return { x: clientX - rect.left, y: clientY - rect.top };
    }

    /**
     * 以屏幕像素为单位做最近点命中。
     * Pixi Sprite 在“恒定针尖”模式下只有约 5px，直接依赖 Sprite hitArea 很难点中；
     * 这里给选择工具一个 10px 的容差，同时保持缩放后点选手感一致。
     */
    function hitTestAgent(screenX, screenY, threshold = 10) {
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

        // 点中已选点再拖动时保持整组选择；Shift 取消选中则不进入拖拽。
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

    /**
     * 绘制 CAD 风格暗黑网格标尺与中心十字准星
     */
    function renderCadGrid() {
        if (!gridGraphics.value || !pixiApp.value) return;
        const g = gridGraphics.value;
        const { width, height } = pixiApp.value.screen;
        const { zoom, panX, panY } = viewport.value;

        g.clear();

        const isDark = isColorDark(currentBgColor.value);

        // 计算当前视口覆盖的世界坐标边界
        const step = 40 * zoom;
        const majorStep = step * 5;

        // 次级微网格点阵/细线 (暗黑科技蓝 / 浅色高对比优雅灰)
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

        // 主标尺网格粗线 (暗黑灰蓝 / 浅色标尺深灰)
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

        // 世界坐标中心原点十字准星 (0, 0)
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
     * 批量向画布渲染成百上千个无人机发光点位
     * @param {Array<import('../types/swarm').Agent>} agents
     * @param {Set<string|number>} dangerIds 碰撞危险点位 ID 集合
     * @param {Object} renderOptions 渲染配置 (启用高锐度、点径大小、恒定屏幕尺寸等)
     */
    function renderDroneAgents(agents, dangerIds = new Set(), renderOptions = {}) {
        // 先更新渲染上下文缓存：初始化完成前到达的首帧数据也不会丢失
        currentRenderCache.agents = agents;
        currentRenderCache.dangerIds = dangerIds;
        currentRenderCache.options = {
            constantScreen: true,
            dotScale: 0.8,
            useGlow: false,
            ...renderOptions,
        };

        if (!droneLayer.value || !pixiApp.value) return;
        const layer = droneLayer.value;

        // 彻底清空上一帧旧点位，防止对象驻留
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
            sprite.y = -agent.y; // 坐标系反转：数学坐标向上为正，Canvas 默认向下为正
            sprite.customIsDanger = isDanger;
            sprite.customLocked = isLocked;
            sprite.customAgentId = agent.id;

            // 危险点位若开启警报高亮则使用红光 (0xff2255)，否则保持点位原汁原味的 LED 颜色
            if (isDanger && highlightDanger) {
                sprite.tint = 0xff2255;
            } else if (agent.color) {
                const hexNum = parseInt(agent.color.replace('#', ''), 16);
                sprite.tint = isNaN(hexNum) ? 0x00f2fe : hexNum;
            } else {
                sprite.tint = 0x00f2fe;
            }

            sprite.alpha = isDanger ? 1.0 : (agent.alpha ?? 1.0);

            // 启用高灵敏度指针事件
            sprite.eventMode = 'static';
            sprite.cursor = isLocked ? 'not-allowed' : toolMode.value === 'pan' ? 'grab' : 'pointer';

            layer.addChild(sprite);
            spriteMap.set(agent.id, sprite);
            agentMap.set(agent.id, agent);
        });

        const validIds = new Set(agents.map((agent) => agent.id));
        selectedIds.value = new Set([...selectedIds.value].filter((id) => validIds.has(id)));

        // 立即根据当前视口 zoom 更新真实屏幕像素尺寸
        updateSpritesScale();
    }

    /**
     * 初始化 PixiJS v8 实例
     */
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

        // 初始视口居中
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

        // 3. 点阵层挂载在世界容器中
        const drones = new Container();
        world.addChild(drones);
        droneLayer.value = drones;

        // 4. 选中描边层（世界坐标，随视口缩放）
        const selection = new Graphics();
        world.addChild(selection);
        selectionGraphics.value = selection;

        // 5. 框选矩形层（屏幕坐标）
        const marquee = new Graphics();
        app.stage.addChild(marquee);
        marqueeGraphics.value = marquee;

        renderCadGrid();

        // 绑定视口平移与滚轮缩放事件
        unbindViewportEvents = bindViewportEvents(container);
        app.stage.on('pointerdown', handleStagePointerDown);
        app.stage.on('pointerup', handleStagePointerUp);
        app.stage.on('pointerupoutside', handleStagePointerUp);

        // 同步初始化期间发生的主题切换与首帧点阵（修复首屏画布空白 / 底色不一致）
        const activeBg = parseInt(String(currentBgColor.value).replace('#', ''), 16);
        if (!isNaN(activeBg)) {
            app.renderer.background.color = activeBg;
        }
        renderCadGrid();
        if (currentRenderCache.agents.length) {
            renderDroneAgents(currentRenderCache.agents, currentRenderCache.dangerIds, currentRenderCache.options);
        }
        isReady.value = true;
    }

    /**
     * 绑定视口相机漫游与 2D 编辑交互。
     * 选择工具：左键框选/拖点；平移工具或空格/中键：拖动画布。
     */
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

        if (button === 0 && toolMode.value === 'select') {
            const shiftKey = Boolean(e.shiftKey ?? e.nativeEvent?.shiftKey);
            const hit = hitTestAgent(point.x, point.y, 10);
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

        if (mode === 'move') {
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

    /**
     * 视口复位重置 (居中对齐原点)
     */
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
    }

    // 挂载与卸载生命周期管控
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
        setToolMode,
        setSelection,
        clearSelection,
        selectAll,
        viewport,
        cursorWorldPos,
        currentBgColor,
        setCanvasBackgroundColor,
        isColorDark,
        selectedDroneId,
        renderDroneAgents,
        resetCamera,
    };
}
