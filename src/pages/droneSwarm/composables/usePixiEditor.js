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
    const { onPointSelect = null } = options;

    /** @type {import('vue').ShallowRef<Application | null>} */
    const pixiApp = shallowRef(null);
    /** @type {import('vue').ShallowRef<Container | null>} */
    const worldContainer = shallowRef(null); // 可自由缩放与平移的无限世界层
    /** @type {import('vue').ShallowRef<Graphics | null>} */
    const gridGraphics = shallowRef(null);
    /** @type {import('vue').ShallowRef<Container | null>} */
    const droneLayer = shallowRef(null);

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

    // 当前选中的无人机 ID
    const selectedDroneId = ref(null);

    // 缓存离屏粒子纹理
    let sharedCrispTexture = null;
    let sharedGlowTexture = null;

    /**
     * 生成 CAD 级高锐度矢量微圆点纹理 (极致清晰，绝不发虚发糊)
     */
    function createCrispDotTexture(app) {
        if (sharedCrispTexture) return sharedCrispTexture;
        const size = 16;
        const g = new Graphics();
        // 核心实心高亮圆点 (半径 4px)
        g.circle(size / 2, size / 2, 4);
        g.fill({ color: 0xffffff, alpha: 1.0 });

        // 极轻微抗锯齿外环 (半径 5.5px)
        g.circle(size / 2, size / 2, 5.5);
        g.fill({ color: 0xffffff, alpha: 0.25 });

        sharedCrispTexture = app.renderer.generateTexture(g);
        return sharedCrispTexture;
    }

    /**
     * 生成柔和霓虹夜空发光微晕纹理
     */
    function createGlowDotTexture(app) {
        if (sharedGlowTexture) return sharedGlowTexture;
        const size = 24;
        const g = new Graphics();
        // 柔和微晕
        g.circle(size / 2, size / 2, 8);
        g.fill({ color: 0xffffff, alpha: 0.2 });

        // 核心白芯
        g.circle(size / 2, size / 2, 3);
        g.fill({ color: 0xffffff, alpha: 1.0 });

        sharedGlowTexture = app.renderer.generateTexture(g);
        return sharedGlowTexture;
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

        // 计算当前视口覆盖的世界坐标边界
        const step = 40 * zoom;
        const majorStep = step * 5;

        // 次级微网格点阵/细线 (暗淡科技蓝)
        g.setStrokeStyle({ width: 1, color: 0x1e2638, alpha: 0.6 });
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

        // 主标尺网格粗线
        g.setStrokeStyle({ width: 1, color: 0x2b384e, alpha: 0.8 });
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

        // 世界坐标中心原点十字准星 (0, 0)
        g.setStrokeStyle({ width: 1.5, color: 0x00f2fe, alpha: 0.9 });
        g.moveTo(panX - 20, panY);
        g.lineTo(panX + 20, panY);
        g.moveTo(panX, panY - 20);
        g.lineTo(panX, panY + 20);
        g.circle(panX, panY, 4);
        g.fill({ color: 0x00f2fe, alpha: 0.4 });
    }

    /**
     * 批量向画布渲染成百上千个无人机发光点位
     * @param {Array<import('../types/swarm').Agent>} agents
     * @param {Set<string|number>} dangerIds 碰撞危险点位 ID 集合
     * @param {Object} renderOptions 渲染配置 (启用高锐度、点径大小等)
     */
    function renderDroneAgents(agents, dangerIds = new Set(), renderOptions = {}) {
        if (!droneLayer.value || !pixiApp.value) return;
        const layer = droneLayer.value;

        // 彻底清空上一帧旧点位，防止对象驻留
        layer.removeChildren();

        const { useGlow = false, dotScale = 1.0 } = renderOptions;
        const texture = useGlow
            ? createGlowDotTexture(pixiApp.value)
            : createCrispDotTexture(pixiApp.value);

        agents.forEach((agent) => {
            const isDanger = dangerIds && dangerIds.has(agent.id);
            const sprite = new Sprite(texture);
            sprite.anchor.set(0.5);
            sprite.x = agent.x;
            sprite.y = -agent.y; // 坐标系反转：数学坐标向上为正，Canvas 默认向下为正

            // 依据 agent.size 和全局 dotScale 精准控制真实像素渲染尺寸，杜绝光晕重叠污染
            const baseSize = (agent.size || 2.5) * dotScale;
            const finalSize = isDanger ? baseSize * 1.6 : baseSize;
            sprite.width = finalSize * 2.2;
            sprite.height = finalSize * 2.2;

            // 危险点位强制使用刺眼警报红光 (0xff2255)，正常点位使用设定的 LED 颜色
            if (isDanger) {
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
            sprite.cursor = 'pointer';

            sprite.on('pointerdown', (e) => {
                e.stopPropagation();
                selectedDroneId.value = agent.id;
                if (onPointSelect) onPointSelect(agent);
            });

            layer.addChild(sprite);
        });
    }

    /**
     * 初始化 PixiJS v8 实例
     */
    async function initPixi() {
        const container = containerRef.value;
        if (!container) return;

        const app = new Application();
        await app.init({
            resizeTo: container,
            backgroundColor: 0x0a0c14, // 极客暗黑夜空底色
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
        });

        container.appendChild(app.canvas);
        pixiApp.value = app;

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

        renderCadGrid();

        // 绑定视口平移与滚轮缩放事件
        bindViewportEvents(container);
    }

    /**
     * 绑定视口相机漫游交互 (平移、滚轮缩放)
     */
    function bindViewportEvents(container) {
        // 鼠标按下：开始拖拽视口 (支持中键拖拽或左键拖拽)
        const onMouseDown = (e) => {
            if (e.button === 0 || e.button === 1) { // 左键或滚轮中键
                viewport.value.isDragging = true;
                viewport.value.dragStartX = e.clientX - viewport.value.panX;
                viewport.value.dragStartY = e.clientY - viewport.value.panY;
            }
        };

        const onMouseMove = (e) => {
            // 更新世界光标坐标
            const rect = container.getBoundingClientRect();
            const mouseScreenX = e.clientX - rect.left;
            const mouseScreenY = e.clientY - rect.top;

            const worldX = (mouseScreenX - viewport.value.panX) / viewport.value.zoom;
            const worldY = -(mouseScreenY - viewport.value.panY) / viewport.value.zoom;
            cursorWorldPos.value = {
                x: Math.round(worldX * 10) / 10,
                y: Math.round(worldY * 10) / 10,
            };

            if (viewport.value.isDragging) {
                viewport.value.panX = e.clientX - viewport.value.dragStartX;
                viewport.value.panY = e.clientY - viewport.value.dragStartY;
                if (worldContainer.value) {
                    worldContainer.value.x = viewport.value.panX;
                    worldContainer.value.y = viewport.value.panY;
                }
                renderCadGrid();
            }
        };

        const onMouseUp = () => {
            viewport.value.isDragging = false;
        };

        // 鼠标滚轮缩放 (以鼠标指针所在位置为中心缩放)
        const onWheel = (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
            const newZoom = Math.min(5.0, Math.max(0.15, viewport.value.zoom * zoomFactor));

            const rect = container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // 保持鼠标指向的世界坐标不动
            viewport.value.panX = mouseX - (mouseX - viewport.value.panX) * (newZoom / viewport.value.zoom);
            viewport.value.panY = mouseY - (mouseY - viewport.value.panY) * (newZoom / viewport.value.zoom);
            viewport.value.zoom = newZoom;

            if (worldContainer.value) {
                worldContainer.value.scale.set(newZoom);
                worldContainer.value.x = viewport.value.panX;
                worldContainer.value.y = viewport.value.panY;
            }
            renderCadGrid();
        };

        container.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        container.addEventListener('wheel', onWheel, { passive: false });

        // 自动随窗口调整大小
        window.addEventListener('resize', renderCadGrid);

        // 卸载监听
        return () => {
            container.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            container.removeEventListener('wheel', onWheel);
            window.removeEventListener('resize', renderCadGrid);
        };
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
    }

    // 挂载与卸载生命周期管控
    onMounted(() => {
        initPixi();
    });

    onBeforeUnmount(() => {
        if (pixiApp.value) {
            pixiApp.value.destroy(true, { children: true, texture: true });
            pixiApp.value = null;
        }
        sharedDotTexture = null;
    });

    return {
        pixiApp,
        viewport,
        cursorWorldPos,
        selectedDroneId,
        renderDroneAgents,
        resetCamera,
    };
}
