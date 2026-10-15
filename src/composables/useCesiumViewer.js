/**
 * ========================================================================
 * 文件名称: useCesiumViewer.js
 * 所属模块: 组合式 API (src/composables)
 * 功能说明:
 *   Cesium 地图视图管控 Hook：
 *   1. 统一管理 Cesium Ion 官方凭证与高并发网络请求调度器；
 *   2. 自动异步加载 Cesium 官方原生全球高精地形 (Cesium World Terrain) 与全球影像底图；
 *   3. 采用 Cesium 官方标准相机控制器，保留防穿地安全俯仰角限制；
 *   4. 实时拾取鼠标悬停经纬度、WGS84 椭球高 (HAE)、EGM96 正高真海拔 (ASL) 与相机姿态；
 *   5. 组件卸载自动释放 WebGL 与事件监听资源。
 * ========================================================================
 */

import { shallowRef, ref, onUnmounted } from 'vue';
import * as Cesium from 'cesium';
import * as egm96 from 'egm96-universal';

// 官方默认 Cesium Ion Token (由用户授权提供)
const DEFAULT_ION_TOKEN =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI5NWEyM2E2Ni1mNDdmLTQ2NjYtYWQ0Mi0xYmE5OWVkYjIxNTUiLCJpZCI6Mjg3NzA3LCJpYXQiOjE3NDI5NTQ1ODR9.iyxiNumkb8sc6jM8EFk72wtwKmLOPAKqsxgeLqs1Nio';

export function useCesiumViewer(defaultContainerId = 'cesiumContainer1') {
    // Viewer 实例（使用 shallowRef 避免深层响应式代理损耗 WebGL 性能）
    const viewer = shallowRef(null);

    // 实时鼠标与相机高度、姿态状态
    const cursorLon = ref('--');
    const cursorLat = ref('--');
    const cameraHeight = ref('--');
    const cursorHAE = ref('--'); // WGS84 椭球高 (米)
    const cursorASL = ref('--'); // EGM96 正高真海拔 (米)
    const cameraPitch = ref('--');     // 俯仰角 (deg)
    const cameraHeading = ref('--');   // 偏航角 (deg)

    let altitudeHandler = null;

    /**
     * 判断当前 Viewer 是否存活可用
     */
    const isViewerAlive = () => {
        return !!viewer.value && typeof viewer.value.isDestroyed === 'function' && !viewer.value.isDestroyed();
    };

    /**
     * 初始化 Cesium Viewer 及其全球地形与底图
     * @param {string} [containerId] 容器 DOM ID
     * @param {object} [customOptions] 自定义配置
     */
    const initCesium = async (containerId = defaultContainerId, customOptions = {}) => {
        // 1. 设置并发请求数，大幅减少 3D Tiles 和地形瓦片排队等待时间
        Cesium.RequestScheduler.maximumRequestsPerServer = 18;

        // 2. 配置官方 Cesium Ion Token
        Cesium.Ion.defaultAccessToken = customOptions.ionToken || DEFAULT_ION_TOKEN;

        // 3. 构建全球真实地形提供器
        let terrainProvider = new Cesium.EllipsoidTerrainProvider();
        if (customOptions.terrainProviderPromise) {
            try {
                terrainProvider = await customOptions.terrainProviderPromise;
            } catch (e) {
                console.warn('自定义地形加载异常，回退到平滑椭球面:', e);
            }
        } else if (customOptions.terrainProvider) {
            terrainProvider = customOptions.terrainProvider;
        } else {
            try {
                console.log('正在加载 Cesium 官方原生全球高精地形 (createWorldTerrainAsync)...');
                terrainProvider = await Cesium.createWorldTerrainAsync({
                    requestWaterMask: true,     // 请求水面掩膜反射
                    requestVertexNormals: true, // 请求顶点法线用于光照效果
                });
                console.log('Cesium 官方全球真实地形已成功挂载');
            } catch (err) {
                console.warn('Cesium 全球地形加载受阻，回退到平滑椭球面地形:', err);
                terrainProvider = new Cesium.EllipsoidTerrainProvider();
            }
        }

        // 4. 构建 Viewer 基础参数（直接使用 Cesium 官方原生全球底图与地形，剥离对天地图的依赖）
        const viewerOptions = {
            infoBox: false,
            animation: false,
            baseLayerPicker: false,
            fullscreenButton: false,
            geocoder: false,
            homeButton: false,
            sceneModePicker: false,
            selectionIndicator: false,
            timeline: false,
            navigationHelpButton: false,
            shouldAnimate: true,
            requestRenderMode: customOptions.requestRenderMode ?? false,
            maximumRenderTimeChange: Infinity,
            sceneMode: Cesium.SceneMode.SCENE3D,
            terrainProvider,
            contextOptions: {
                webgl: {
                    alpha: false,
                },
            },
            ...customOptions,
        };

        // 实例化 Viewer
        viewer.value = new Cesium.Viewer(containerId, viewerOptions);

        // 5. 隐藏版权水印信息
        if (viewer.value._cesiumWidget?._creditContainer) {
            viewer.value._cesiumWidget._creditContainer.style.display = 'none';
        }

        // 6. 场景视觉与深度检测配置
        const scene = viewer.value.scene;
        scene.postProcessStages.fxaa.enabled = true;
        scene.globe.enableLighting = false;
        scene.globe.baseColor = Cesium.Color.fromCssColorString('#0d1b2e');
        scene.globe.depthTestAgainstTerrain = customOptions.depthTestAgainstTerrain ?? true;
        scene.globe.maximumScreenSpaceError = customOptions.maximumScreenSpaceError ?? 2;
        scene.globe.preloadAncestors = false;

        // 分辨率缩放适配，避免高分屏严重掉帧
        viewer.value.resolutionScale = Math.min(1.5, customOptions.resolutionScale || window.devicePixelRatio || 1.0);
        scene.debugShowFramesPerSecond = customOptions.debugShowFramesPerSecond ?? false;

        // 7. 相机控制器配置
        const controller = scene.screenSpaceCameraController;
        controller.enableCollisionDetection = true; // 防穿地
        controller.minimumPitch = Cesium.Math.toRadians(-90);
        controller.maximumPitch = Cesium.Math.toRadians(-5);

        // 禁用双击实体默认追踪
        viewer.value.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

        // 8. 注册鼠标移动与高度状态监听
        setupAltitudeTracker();

        // 9. 相机姿态改变监听
        scene.camera.percentageChanged = 0.01;
        scene.camera.changed.addEventListener(updateCameraInfo);
        updateCameraInfo();

        return viewer.value;
    };

    /**
     * 更新相机状态栏高度与俯仰/偏航角
     */
    const updateCameraInfo = () => {
        if (!isViewerAlive() || !viewer.value.scene?.camera) return;

        const camCarto = viewer.value.camera.positionCartographic;
        if (camCarto) {
            const ellipsoidH = camCarto.height;
            const terrainH = viewer.value.scene.globe.getHeight(camCarto);
            if (terrainH !== undefined && terrainH !== null) {
                cameraHeight.value = (ellipsoidH - terrainH).toFixed(1);
            } else {
                cameraHeight.value = ellipsoidH.toFixed(1);
            }
        } else {
            cameraHeight.value = '--';
        }

        cameraPitch.value = Cesium.Math.toDegrees(viewer.value.camera.pitch).toFixed(1);
        cameraHeading.value = Cesium.Math.toDegrees(viewer.value.camera.heading).toFixed(1);
    };

    /**
     * 设置鼠标移动坐标与高程 (HAE / ASL) 实时拾取
     */
    const setupAltitudeTracker = () => {
        if (!isViewerAlive()) return;

        altitudeHandler = new Cesium.ScreenSpaceEventHandler(viewer.value.scene.canvas);
        altitudeHandler.setInputAction((movement) => {
            if (!isViewerAlive()) return;

            // 1. 优先拾取实景三维模型/地形表面实际空间坐标
            let cartesian = viewer.value.scene.pickPosition(movement.endPosition);
            if (!cartesian) {
                const ray = viewer.value.camera.getPickRay(movement.endPosition);
                if (ray) {
                    cartesian = viewer.value.scene.globe.pick(ray, viewer.value.scene);
                }
            }
            if (!cartesian) return;

            // 2. 提取经纬度与地表高程 (WGS84 椭球高 / 地形高程)
            const tmpCarto = Cesium.Cartographic.fromCartesian(cartesian);
            if (!tmpCarto) return;

            const lon = Cesium.Math.toDegrees(tmpCarto.longitude);
            const lat = Cesium.Math.toDegrees(tmpCarto.latitude);

            cursorLon.value = lon.toFixed(6);
            cursorLat.value = lat.toFixed(6);

            // 3. 读取真实地表 / 3D Tiles 模型 WGS84 椭球高 (HAE)
            const hae = tmpCarto.height;
            if (hae !== undefined && hae !== null) {
                cursorHAE.value = hae.toFixed(2);
                try {
                    // 使用 EGM96 全球重力场模型解算大地水准面高差距 N
                    const N = egm96.meanSeaLevel(lat, lon);
                    // 正高真海拔 ASL = HAE - N
                    const asl = hae - N;
                    cursorASL.value = asl.toFixed(2);
                } catch (e) {
                    cursorASL.value = '--';
                }
            } else {
                cursorHAE.value = '--';
                cursorASL.value = '--';
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    };

    /**
     * 彻底销毁 Viewer 与所有事件监听
     */
    const destroyCesium = () => {
        if (altitudeHandler) {
            altitudeHandler.destroy();
            altitudeHandler = null;
        }
        if (isViewerAlive()) {
            viewer.value.destroy();
            viewer.value = null;
        }
    };

    onUnmounted(() => {
        destroyCesium();
    });

    return {
        viewer,
        cursorLon,
        cursorLat,
        cameraHeight,
        cursorHAE,
        cursorASL,
        cameraPitch,
        cameraHeading,
        initCesium,
        destroyCesium,
        isViewerAlive,
    };
}
