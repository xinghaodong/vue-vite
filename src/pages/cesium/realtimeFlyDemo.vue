<template>
    <div class="realtime-fly-container">
        <!-- Cesium 渲染视窗 -->
        <div id="cesiumRealtimeContainer" class="cesium-container"></div>

        <!-- 顶部全景飞控遥测状态条 (Glassmorphism HUD) -->
        <header class="hud-topbar">
            <div class="topbar-left">
                <el-button
                    size="small"
                    class="back-btn"
                    :icon="Back"
                    @click="goBack"
                >
                    返回列表
                </el-button>
                <div class="hud-brand">
                    <span class="live-dot pulse"></span>
                    <span class="hud-title">无人机“边飞边建”极速流式三维建模 - 概念演示舱</span>
                    <el-tag size="small" type="success" effect="dark" class="mode-tag">
                        双轨流式 PoC 仿真
                    </el-tag>
                </div>
            </div>

            <!-- 飞测核心状态卡片 -->
            <div class="topbar-metrics">
                <div class="metric-card">
                    <span class="metric-label">RTK 状态</span>
                    <span class="metric-val rtk-fixed">厘米级固定解 (FIXED)</span>
                </div>
                <div class="metric-divider"></div>
                <div class="metric-card">
                    <span class="metric-label">飞行器高度 (椭球高)</span>
                    <span class="metric-val">{{ currentTelemetry.altitude.toFixed(1) }} m</span>
                </div>
                <div class="metric-divider"></div>
                <div class="metric-card">
                    <span class="metric-label">航向 / 航速</span>
                    <span class="metric-val">{{ currentTelemetry.yaw.toFixed(0) }}° / {{ flightSpeedLabel }}</span>
                </div>
                <div class="metric-divider"></div>
                <div class="metric-card">
                    <span class="metric-label">航片捕获 (Footprints)</span>
                    <span class="metric-val photo-counter">{{ snappedCount }} / {{ totalWaypoints }} 张</span>
                </div>
                <div class="metric-divider"></div>
                <div class="metric-card">
                    <span class="metric-label">边缘 GPU 重建</span>
                    <span class="metric-val gpu-status">{{ gpuEngineStatus }}</span>
                </div>
            </div>
        </header>

        <!-- 快门闪光反馈蒙层 (拍摄瞬间高光脉冲) -->
        <div class="shutter-flash" :class="{ flashing: isFlashing }"></div>

        <!-- 右侧边栏：微批次滑动窗口流式管线看板 (Micro-Batches Pipeline) -->
        <aside class="hud-sidebar">
            <div class="sidebar-header">
                <div class="sidebar-title">
                    <el-icon><Cpu /></el-icon>
                    <span>边缘计算流式解算看板 (RTX 3060)</span>
                </div>
                <span class="cuda-badge">CUDA 12.4 活跃</span>
            </div>

            <!-- 说明提示 -->
            <div class="pipeline-desc">
                根据航线重叠率，照片流按 <strong>9 张</strong> 自动切片为一个独立微批次 (Block)。每个区块解算完毕即刻并网贴入地表，无缝拼接。
            </div>

            <!-- Block 1 状态卡 -->
            <div class="block-card" :class="block1.status">
                <div class="block-card-header">
                    <span class="block-tag">Block #01</span>
                    <span class="block-range">航片 0018 ~ 0026 (9张)</span>
                    <el-tag size="small" :type="getBlockTagType(block1.status)">
                        {{ getBlockStatusText(block1.status) }}
                    </el-tag>
                </div>
                <div class="block-progress-box">
                    <div class="progress-info">
                        <span class="stage-info">{{ block1.stage }}</span>
                        <span class="pct">{{ block1.progress }}%</span>
                    </div>
                    <el-progress
                        :percentage="block1.progress"
                        :stroke-width="5"
                        :show-text="false"
                        :status="block1.status === 'done' ? 'success' : undefined"
                    />
                </div>
                <div v-if="block1.status === 'done'" class="block-meta">
                    <span>耗时: 4.2s (模拟)</span>
                    <span>瓦片: 3D Tiles 局部并网</span>
                </div>
            </div>

            <!-- Block 2 状态卡 -->
            <div class="block-card" :class="block2.status">
                <div class="block-card-header">
                    <span class="block-tag">Block #02</span>
                    <span class="block-range">航片 0026 ~ 0035 (10张)</span>
                    <el-tag size="small" :type="getBlockTagType(block2.status)">
                        {{ getBlockStatusText(block2.status) }}
                    </el-tag>
                </div>
                <div class="block-progress-box">
                    <div class="progress-info">
                        <span class="stage-info">{{ block2.stage }}</span>
                        <span class="pct">{{ block2.progress }}%</span>
                    </div>
                    <el-progress
                        :percentage="block2.progress"
                        :stroke-width="5"
                        :show-text="false"
                        :status="block2.status === 'done' ? 'success' : undefined"
                    />
                </div>
                <div v-if="block2.status === 'done'" class="block-meta">
                    <span>耗时: 4.8s (模拟)</span>
                    <span>瓦片: 3D Tiles 全量接缝融合</span>
                </div>
            </div>

            <!-- 整体模型挂载指示卡 -->
            <div class="tileset-summary-card">
                <div class="summary-row">
                    <span>地面三维模型状态:</span>
                    <span :class="modelReady ? 'status-green' : 'status-yellow'">
                        {{ modelReady ? '🟢 实景三维全部并网' : '🟡 局部三维动态生长中...' }}
                    </span>
                </div>
                <div class="summary-row">
                    <span>数据来源:</span>
                    <span class="font-mono text-xs">ODM 真实倾斜摄影切片</span>
                </div>
                <div v-if="modelReady" class="summary-actions">
                    <el-button type="success" size="small" :icon="Aim" @click="focusOnModel">
                        聚焦三维成果
                    </el-button>
                </div>
            </div>
        </aside>

        <!-- 底部控制舱悬浮栏 (Floating Controller Dock) -->
        <footer class="hud-controller-dock">
            <!-- 播放控制 -->
            <div class="ctrl-group">
                <el-button
                    type="primary"
                    :icon="isPlaying ? VideoPause : VideoPlay"
                    class="ctrl-main-btn"
                    @click="togglePlay"
                >
                    {{ isPlaying ? '暂停仿真' : isFinished ? '重新播放' : '启动仿真' }}
                </el-button>
                <el-button :icon="RefreshRight" class="ctrl-btn" @click="resetSimulation">
                    重置
                </el-button>
            </div>

            <div class="ctrl-divider"></div>

            <!-- 倍速控制 -->
            <div class="ctrl-group speed-group">
                <span class="ctrl-label">推演倍速:</span>
                <el-radio-group v-model="playSpeed" size="small" class="speed-radio">
                    <el-radio-button :label="1">1x</el-radio-button>
                    <el-radio-button :label="2">2x</el-radio-button>
                    <el-radio-button :label="4">4x 极速</el-radio-button>
                </el-radio-group>
            </div>

            <div class="ctrl-divider"></div>

            <!-- 视角模式切换 -->
            <div class="ctrl-group view-group">
                <span class="ctrl-label">摄影视角:</span>
                <el-radio-group v-model="cameraMode" size="small" class="view-radio" @change="handleCameraModeChange">
                    <el-radio-button label="chase">🚁 伴飞特写</el-radio-button>
                    <el-radio-button label="overhead">🦅 上帝鸟瞰</el-radio-button>
                    <el-radio-button label="free">🌐 自由漫游</el-radio-button>
                </el-radio-group>
            </div>

            <div class="ctrl-divider"></div>

            <!-- 航迹进度条 -->
            <div class="flight-progress-box">
                <span class="progress-title">航线进度:</span>
                <el-slider
                    v-model="flightProgress"
                    :min="0"
                    :max="100"
                    :show-tooltip="false"
                    class="progress-slider"
                    @input="handleProgressSeek"
                />
                <span class="pct-text font-mono">{{ flightProgress.toFixed(0) }}%</span>
            </div>
        </footer>

        <!-- 拍摄成功气泡提示 -->
        <transition name="el-fade-in">
            <div v-if="lastPhotoNotification" class="photo-toast">
                <span class="camera-icon">📷</span>
                <span>已曝光: <strong>{{ lastPhotoNotification.fileName }}</strong> (GPS: {{ lastPhotoNotification.lat.toFixed(5) }}, {{ lastPhotoNotification.lon.toFixed(5) }})</span>
            </div>
        </transition>
    </div>
</template>

<script setup>
import { ref, reactive, shallowRef, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
    Back,
    VideoPlay,
    VideoPause,
    RefreshRight,
    Aim,
    Cpu,
} from '@element-plus/icons-vue';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { useCesiumViewer } from '@/composables/useCesiumViewer';
import droneGltf from '@/assets/5cb4d4a54db5bef6.gltf';

const router = useRouter();

// ==========================================
// 1. 真实航测数据集 (来自用户的 ODM 实测工程)
// ==========================================
const RAW_WAYPOINTS = [
    { filename: 'DJI_0018.JPG', latitude: 46.84260708, longitude: -91.99455989, altitude: 198.31, yaw: 46.0 },
    { filename: 'DJI_0019.JPG', latitude: 46.84269067, longitude: -91.99442728, altitude: 198.61, yaw: 40.1 },
    { filename: 'DJI_0020.JPG', latitude: 46.84277758, longitude: -91.99429939, altitude: 198.61, yaw: 42.8 },
    { filename: 'DJI_0021.JPG', latitude: 46.84286514, longitude: -91.99417664, altitude: 198.61, yaw: 44.0 },
    { filename: 'DJI_0022.JPG', latitude: 46.84295158, longitude: -91.99405172, altitude: 198.51, yaw: 45.6 },
    { filename: 'DJI_0023.JPG', latitude: 46.84303806, longitude: -91.99392306, altitude: 198.51, yaw: 41.4 },
    { filename: 'DJI_0024.JPG', latitude: 46.84286461, longitude: -91.99369667, altitude: 198.41, yaw: -138.7 },
    { filename: 'DJI_0025.JPG', latitude: 46.84277386, longitude: -91.99382594, altitude: 198.51, yaw: -129.9 },
    { filename: 'DJI_0026.JPG', latitude: 46.84269025, longitude: -91.99395439, altitude: 198.61, yaw: -129.9 },
    { filename: 'DJI_0027.JPG', latitude: 46.84260539, longitude: -91.99408278, altitude: 198.51, yaw: -129.2 },
    { filename: 'DJI_0028.JPG', latitude: 46.84252125, longitude: -91.99420961, altitude: 198.61, yaw: -133.0 },
    { filename: 'DJI_0029.JPG', latitude: 46.84243392, longitude: -91.99433339, altitude: 198.61, yaw: -129.2 },
    { filename: 'DJI_0030.JPG', latitude: 46.84228161, longitude: -91.99408417, altitude: 198.61, yaw: 46.2 },
    { filename: 'DJI_0031.JPG', latitude: 46.84237147, longitude: -91.99395356, altitude: 198.71, yaw: 38.1 },
    { filename: 'DJI_0032.JPG', latitude: 46.84245844, longitude: -91.99382931, altitude: 198.61, yaw: 39.7 },
    { filename: 'DJI_0033.JPG', latitude: 46.84254325, longitude: -91.99370269, altitude: 198.61, yaw: 40.5 },
    { filename: 'DJI_0034.JPG', latitude: 46.84262928, longitude: -91.99357867, altitude: 198.51, yaw: 43.5 },
    { filename: 'DJI_0035.JPG', latitude: 46.84271656, longitude: -91.99345531, altitude: 198.51, yaw: 45.6 },
];

const totalWaypoints = RAW_WAYPOINTS.length;

// 用户已生成的真实 3D Tiles 模型 URL
const MODEL_3D_TILES_URL = 'http://127.0.0.1:3001/api/models/4ba3194c-3cc1-4809-ba47-6295acc508e7/3d_tiles/model/tileset.json';

// ==========================================
// 2. 状态定义
// ==========================================
const { viewer, initCesium } = useCesiumViewer('cesiumRealtimeContainer');

const isPlaying = ref(false);
const isFinished = ref(false);
const playSpeed = ref(2); // 默认 2x 速度体验最佳
const cameraMode = ref('chase'); // chase | overhead | free
const flightProgress = ref(0);
const snappedCount = ref(0);
const isFlashing = ref(false);
const lastPhotoNotification = ref(null);
const modelReady = ref(false);

const currentTelemetry = reactive({
    longitude: RAW_WAYPOINTS[0].longitude,
    latitude: RAW_WAYPOINTS[0].latitude,
    altitude: RAW_WAYPOINTS[0].altitude,
    yaw: RAW_WAYPOINTS[0].yaw,
});

const block1 = reactive({
    status: 'pending', // pending | processing | done
    stage: '等待航片汇聚 (0/9)',
    progress: 0,
});

const block2 = reactive({
    status: 'pending', // pending | processing | done
    stage: '等待第 2 批航线推进',
    progress: 0,
});

const gpuEngineStatus = computed(() => {
    if (block1.status === 'processing' || block2.status === 'processing') {
        return '⚡ 极速 GPU 解算中';
    }
    if (block1.status === 'done' && block2.status === 'done') {
        return '✔ 算力待命 (就绪)';
    }
    return '待命中';
});

const flightSpeedLabel = computed(() => {
    if (!isPlaying.value) return '0.0 m/s';
    return (5.5 * playSpeed.value).toFixed(1) + ' m/s';
});

// Cesium 图元与航摄几何引用
let droneEntity = null;
let droneGroundPoint = null;
let droneHeightLine = null;
let flightPathEntity = null;
let groundTrackEntities = [];
let footprintEntities = [];
let block1MeshEntity = null;
let block2MeshEntity = null;
let tilesetPrimitive = null;

// 航摄动态光锥体几何与实体
let currentDronePos = null;
let currentFrustumCorners = [];
let currentGroundCenter = null;
let frustumBeamEntities = [];
let frustumBaseLineEntity = null;
let frustumFillEntity = null;
let frustumCenterLineEntity = null;

// 仿真动画帧句柄
let animTimer = null;
let currentProgress = 0; // 0 ~ 1.0

// ==========================================
// 3. Cesium 场景实体初始化
// ==========================================
const initSceneEntities = () => {
    if (!viewer.value) return;

    // 清空现有实体
    viewer.value.entities.removeAll();
    groundTrackEntities = [];
    footprintEntities = [];

    // 1. 绘制规划航迹线 (绿色光带)
    const routePositions = RAW_WAYPOINTS.map(wp =>
        Cesium.Cartesian3.fromDegrees(wp.longitude, wp.latitude, wp.altitude)
    );

    flightPathEntity = viewer.value.entities.add({
        name: '无人机预设航迹',
        polyline: {
            positions: routePositions,
            width: 3,
            material: new Cesium.PolylineGlowMaterialProperty({
                glowPower: 0.25,
                color: Cesium.Color.fromCssColorString('#00ffcc'),
            }),
        },
    });

    // 2. 在每个航点放置曝光微标记点
    RAW_WAYPOINTS.forEach((wp, index) => {
        viewer.value.entities.add({
            position: Cesium.Cartesian3.fromDegrees(wp.longitude, wp.latitude, wp.altitude),
            point: {
                pixelSize: 6,
                color: Cesium.Color.fromCssColorString('#00ffff'),
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 1,
            },
        });
    });

    // 3. 创建无人机 3D 模型实体 (具备视距自适应动态缩放与微像素保底)
    const startPos = routePositions[0];
    droneEntity = viewer.value.entities.add({
        name: '航测巡检无人机',
        position: startPos,
        orientation: computeOrientation(startPos, RAW_WAYPOINTS[0].yaw),
        model: {
            uri: droneGltf,
            // 视距自适应动态缩放：根据相机与无人机实时空间距离线性插值计算
            // 靠近时(如特写伴飞)收敛为0.008(~1.96m真实无人机尺寸)，杜绝遮挡屏幕
            // 远离时随视距平滑展开，配合 minimumPixelSize 维持高空巡航辨识度
            scale: new Cesium.CallbackProperty(() => {
                if (!viewer.value || !droneEntity) return 0.01;
                const cameraPosition = viewer.value.camera.positionWC;
                const dronePos = droneEntity.position?.getValue(viewer.value.clock.currentTime);
                if (!Cesium.defined(cameraPosition) || !Cesium.defined(dronePos)) {
                    return 0.01;
                }
                const distance = Cesium.Cartesian3.distance(cameraPosition, dronePos);
                
                const minDistance = 25.0;   // 极近视距
                const maxDistance = 2200.0; // 远景视距
                const minScale = 0.008;     // 靠近时缩放系数 (~1.96m真实尺寸)
                const maxScale = 0.05;      // 远景时缩放系数 (~12.2m标志尺寸)

                if (distance <= minDistance) return minScale;
                if (distance >= maxDistance) return maxScale;

                const factor = (distance - minDistance) / (maxDistance - minDistance);
                return Cesium.Math.lerp(minScale, maxScale, factor);
            }, false),
            minimumPixelSize: 24, // 远距离保底像素，防止完全消失
            maximumScale: 0.065,  // 严格封顶上限，彻底杜绝模型撑爆全屏
            runAnimations: true,
            color: Cesium.Color.fromCssColorString('#00e5ff'),
            colorBlendMode: Cesium.ColorBlendMode.MIX,
            colorBlendAmount: 0.35,
        },
    });

    // 3.1 地面垂足投影光点 (带高程贴地)
    droneGroundPoint = viewer.value.entities.add({
        name: '无人机地面投影基准点',
        position: new Cesium.CallbackProperty(() => {
            const cur = droneEntity?.position?.getValue(viewer.value.clock.currentTime);
            if (!cur) return Cesium.Cartesian3.ZERO;
            const cart = Cesium.Cartographic.fromCartesian(cur);
            return Cesium.Cartesian3.fromRadians(cart.longitude, cart.latitude, 0);
        }, false),
        point: {
            pixelSize: 6,
            color: Cesium.Color.fromCssColorString('#00ffff').withAlpha(0.85),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 1.5,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
    });

    // 3.2 垂直高程激光参考虚线
    droneHeightLine = viewer.value.entities.add({
        name: '无人机高程投影测线',
        polyline: {
            positions: new Cesium.CallbackProperty(() => {
                const cur = droneEntity?.position?.getValue(viewer.value.clock.currentTime);
                if (!cur) return [];
                const cart = Cesium.Cartographic.fromCartesian(cur);
                const ground = Cesium.Cartesian3.fromRadians(cart.longitude, cart.latitude, 0);
                return [cur, ground];
            }, false),
            width: 1.2,
            material: new Cesium.PolylineDashMaterialProperty({
                color: Cesium.Color.fromCssColorString('#00ffff').withAlpha(0.4),
                dashLength: 8,
            }),
        },
    });

    // 4. 创建无人机航摄动态光锥体 (严格与航向、地面网格 100% 对齐)
    currentDronePos = startPos;
    currentFrustumCorners = computeFootprintCorners(
        RAW_WAYPOINTS[0].longitude,
        RAW_WAYPOINTS[0].latitude,
        RAW_WAYPOINTS[0].altitude,
        RAW_WAYPOINTS[0].yaw
    );
    currentGroundCenter = Cesium.Cartesian3.fromDegrees(
        RAW_WAYPOINTS[0].longitude,
        RAW_WAYPOINTS[0].latitude,
        Math.max(0, RAW_WAYPOINTS[0].altitude - 20.0)
    );
    createDynamicCameraFrustum();

    // 5. 定位相机初始视角
    updateCameraView(true);
};

// ==========================================
// 空间解析几何：计算航摄相机在地面投影的 4 个真实旋转角点
// 航向角 yawDeg 顺时针旋转，满足无人机 20m 航高与 24mm 镜头航摄真实视场
// ==========================================
const computeFootprintCorners = (lon, lat, alt, yawDeg) => {
    // 相对地表高度约 20 米 (测区平均地表椭球高约 178m)
    const groundAlt = Math.max(0, alt - 20.0);
    const DEG2RAD = Math.PI / 180;
    const rad = yawDeg * DEG2RAD;

    // 航测相机覆盖范围：半宽 13.0 米 (总宽 26m)，半长 9.5 米 (总长 19m)
    const halfWidthM = 13.0;
    const halfLengthM = 9.5;

    // 航向角旋转基向量 (Yaw: 0°为正北, 90°为正东)
    const sinYaw = Math.sin(rad);
    const cosYaw = Math.cos(rad);

    // 局部相机坐标系 4 个角点 (dx: 横向右+, dy: 纵向前+)
    const localOffsets = [
        { dx:  halfWidthM, dy:  halfLengthM }, // 右前
        { dx: -halfWidthM, dy:  halfLengthM }, // 左前
        { dx: -halfWidthM, dy: -halfLengthM }, // 左后
        { dx:  halfWidthM, dy: -halfLengthM }, // 右后
    ];

    // 米转经纬度系数
    const mPerDegLat = 111139.0;
    const mPerDegLon = 111139.0 * Math.cos(lat * DEG2RAD);

    return localOffsets.map(c => {
        const dEast = c.dx * cosYaw + c.dy * sinYaw;
        const dNorth = -c.dx * sinYaw + c.dy * cosYaw;
        const cornerLon = lon + dEast / mPerDegLon;
        const cornerLat = lat + dNorth / mPerDegLat;
        return Cesium.Cartesian3.fromDegrees(cornerLon, cornerLat, groundAlt);
    });
};

// 创建高拟真动态航摄视锥体 (底面 ≡ 拍摄曝光框，实现 100% 空间几何一致性)
const createDynamicCameraFrustum = () => {
    destroyDynamicCameraFrustum();

    // 1. 底框闭合轮廓线 (高亮青绿色微光线，贴合地表)
    frustumBaseLineEntity = viewer.value.entities.add({
        name: '视锥体地面投影外框',
        polyline: {
            positions: new Cesium.CallbackProperty(() => {
                if (!currentFrustumCorners || currentFrustumCorners.length < 4) return [];
                return [
                    currentFrustumCorners[0],
                    currentFrustumCorners[1],
                    currentFrustumCorners[2],
                    currentFrustumCorners[3],
                    currentFrustumCorners[0],
                ];
            }, false),
            width: 2,
            material: new Cesium.PolylineGlowMaterialProperty({
                glowPower: 0.25,
                color: Cesium.Color.fromCssColorString('#00ffbb'),
            }),
            clampToGround: true,
        },
    });

    // 2. 底面半透明视场扫描面
    frustumFillEntity = viewer.value.entities.add({
        name: '视锥体地面覆盖视场',
        polygon: {
            hierarchy: new Cesium.CallbackProperty(() => {
                if (!currentFrustumCorners || currentFrustumCorners.length < 4) return new Cesium.PolygonHierarchy([]);
                return new Cesium.PolygonHierarchy(currentFrustumCorners);
            }, false),
            material: Cesium.Color.fromCssColorString('#00ffbb').withAlpha(0.12),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
    });

    // 3. 四条空间投影侧棱线 (从无人机镜头射向地面 4 个角点)
    for (let i = 0; i < 4; i++) {
        const beam = viewer.value.entities.add({
            name: `视锥体空间棱光_${i}`,
            polyline: {
                positions: new Cesium.CallbackProperty(() => {
                    if (!currentDronePos || !currentFrustumCorners?.[i]) return [];
                    return [currentDronePos, currentFrustumCorners[i]];
                }, false),
                width: 1.5,
                material: new Cesium.PolylineGlowMaterialProperty({
                    glowPower: 0.2,
                    color: Cesium.Color.fromCssColorString('#00ffbb').withAlpha(0.45),
                }),
            },
        });
        frustumBeamEntities.push(beam);
    }

    // 4. 中心瞄准激光虚线
    frustumCenterLineEntity = viewer.value.entities.add({
        name: '视锥体中心瞄准线',
        polyline: {
            positions: new Cesium.CallbackProperty(() => {
                if (!currentDronePos || !currentGroundCenter) return [];
                return [currentDronePos, currentGroundCenter];
            }, false),
            width: 1.5,
            material: new Cesium.PolylineDashMaterialProperty({
                color: Cesium.Color.fromCssColorString('#00ffff').withAlpha(0.6),
                dashLength: 10,
            }),
        },
    });
};

// 释放动态视锥体图元
const destroyDynamicCameraFrustum = () => {
    frustumBeamEntities.forEach(b => viewer.value?.entities.remove(b));
    frustumBeamEntities = [];
    if (frustumBaseLineEntity) {
        viewer.value?.entities.remove(frustumBaseLineEntity);
        frustumBaseLineEntity = null;
    }
    if (frustumFillEntity) {
        viewer.value?.entities.remove(frustumFillEntity);
        frustumFillEntity = null;
    }
    if (frustumCenterLineEntity) {
        viewer.value?.entities.remove(frustumCenterLineEntity);
        frustumCenterLineEntity = null;
    }
};

// 计算无人机四元数朝向
const computeOrientation = (position, yawDeg) => {
    const heading = Cesium.Math.toRadians(yawDeg);
    const pitch = 0;
    const roll = 0;
    const hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);
    // 旋转修正，对齐 GLTF 坐标系
    const fixRotation = Cesium.Quaternion.fromAxisAngle(Cesium.Cartesian3.UNIT_Z, Cesium.Math.toRadians(-90));
    const hprRotation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
    return Cesium.Quaternion.multiply(hprRotation, fixRotation, new Cesium.Quaternion());
};

// 样条插值获取当前进度下的无人机空间姿态
const sampleDronePose = (t) => {
    const totalSegments = RAW_WAYPOINTS.length - 1;
    const scaledT = Math.max(0, Math.min(0.9999, t)) * totalSegments;
    const segIndex = Math.floor(scaledT);
    const frac = scaledT - segIndex;

    const p0 = RAW_WAYPOINTS[segIndex];
    const p1 = RAW_WAYPOINTS[segIndex + 1];

    const lon = p0.longitude + (p1.longitude - p0.longitude) * frac;
    const lat = p0.latitude + (p1.latitude - p0.latitude) * frac;
    const alt = p0.altitude + (p1.altitude - p0.altitude) * frac;

    // 角度插值 (处理环绕)
    let y0 = p0.yaw;
    let y1 = p1.yaw;
    let diff = (y1 - y0) % 360;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    const yaw = y0 + diff * frac;

    return { lon, lat, alt, yaw, segIndex };
};

// ==========================================
// 4. 快门拍摄与地面视锥体投射动效
// ==========================================
const triggerExposure = (wp, index) => {
    // 快门闪烁
    isFlashing.value = true;
    setTimeout(() => { isFlashing.value = false; }, 120);

    // 曝光提示气泡
    lastPhotoNotification.value = {
        fileName: wp.filename,
        lat: wp.latitude,
        lon: wp.longitude,
    };
    setTimeout(() => {
        if (lastPhotoNotification.value?.fileName === wp.filename) {
            lastPhotoNotification.value = null;
        }
    }, 2500);

    // 计算与当前动态视锥体底面 100% 绝对一致的航向旋转角点
    const photoCorners = computeFootprintCorners(wp.longitude, wp.latitude, wp.altitude, wp.yaw);

    // 绘制地面覆盖底框 (Footprint Polygon: 严格对齐无人机航向角)
    const footprint = viewer.value.entities.add({
        name: `航片曝光框_${wp.filename}`,
        polygon: {
            hierarchy: photoCorners,
            material: Cesium.Color.fromCssColorString('#00ffbb').withAlpha(0.25),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
        polyline: {
            positions: [...photoCorners, photoCorners[0]],
            width: 2,
            material: new Cesium.PolylineGlowMaterialProperty({
                glowPower: 0.2,
                color: Cesium.Color.fromCssColorString('#00ffff'),
            }),
            clampToGround: true,
        },
    });
    footprintEntities.push(footprint);

    // 更新流式批次计算进度
    evalBatchesOnPhotoTaken(index);
};

// ==========================================
// 5. 微批次解算逻辑与三维模型拼图式生长
// ==========================================
const evalBatchesOnPhotoTaken = (photoIndex) => {
    // Block 1 收集：0 ~ 8 (前 9 张)
    if (photoIndex <= 8) {
        block1.status = 'processing';
        block1.stage = `照片采集汇聚中 (${photoIndex + 1}/9)`;
        block1.progress = Math.round(((photoIndex + 1) / 9) * 85);
        if (photoIndex === 8) {
            // 第 9 张到达，触发 GPU 极速解算
            block1.stage = 'GPU 密集点云三角化与 3D Tiles 产出...';
            block1.progress = 92;
            setTimeout(() => {
                finishBlock1();
            }, 1200 / playSpeed.value);
        }
    }

    // Block 2 收集：8 ~ 17 (后 10 张，包含重叠过渡)
    if (photoIndex >= 8) {
        const p2Count = photoIndex - 7;
        block2.status = 'processing';
        block2.stage = `照片采集汇聚中 (${p2Count}/10)`;
        block2.progress = Math.round((p2Count / 10) * 80);
        if (photoIndex === totalWaypoints - 1) {
            // 全航线最后一张拍摄完毕，触发 Block 2 完成与全量模型融合
            block2.stage = 'GPU 网格剖分与缝合并网中...';
            block2.progress = 95;
            setTimeout(() => {
                finishBlock2();
            }, 1500 / playSpeed.value);
        }
    }
};

// Block 1 完成：挂载第 1 块局部三维切片
const finishBlock1 = () => {
    block1.status = 'done';
    block1.stage = '局部 3D Tiles 已并入地表';
    block1.progress = 100;
    ElMessage.success('🎉 [Block #01] 局部三维切片生成完毕，已自动挂载至地表！');

    // 产生第一区块地面网格高亮
    renderBlock1MeshHighlight();
};

// Block 2 完成：挂载第 2 块切片并激活完整真实 3D Tileset
const finishBlock2 = () => {
    block2.status = 'done';
    block2.stage = '全航线三维切片无缝拼接完毕';
    block2.progress = 100;
    modelReady.value = true;
    ElMessage.success('🚀 [Block #02] 接缝融合完成！实景三维模型全量生成并贴合！');

    // 挂载真实 3D Tiles 模型
    loadRealTileset();
};

// 渲染 Block 1 的半透明高科技三维轮廓
const renderBlock1MeshHighlight = () => {
    if (block1MeshEntity) return;
    block1MeshEntity = viewer.value.entities.add({
        name: 'Block 1 局部三维网格',
        rectangle: {
            coordinates: Cesium.Rectangle.fromDegrees(
                -91.99465, 46.84250,
                -91.99380, 46.84310
            ),
            material: new Cesium.GridMaterialProperty({
                color: Cesium.Color.fromCssColorString('#00ffff').withAlpha(0.6),
                cellAlpha: 0.15,
                lineCount: new Cesium.Cartesian2(12, 12),
                lineThickness: new Cesium.Cartesian2(1.5, 1.5),
            }),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
    });
};

// 挂载真实 NodeODM 产出的 3D Tiles 模型
const loadRealTileset = async () => {
    if (tilesetPrimitive) return;
    try {
        console.log('开始并网挂载真实 3D Tiles:', MODEL_3D_TILES_URL);
        const tileset = await Cesium.Cesium3DTileset.fromUrl(MODEL_3D_TILES_URL, {
            maximumScreenSpaceError: 16,
            skipLevelOfDetail: true,
        });

        viewer.value.scene.primitives.add(tileset);
        tilesetPrimitive = tileset;

        // 调整模型到地表贴合视角
        if (block1MeshEntity) {
            viewer.value.entities.remove(block1MeshEntity);
            block1MeshEntity = null;
        }
    } catch (e) {
        console.warn('加载真实 3D Tileset 提示 (本地未启动 ODM 静态服务时展示模拟地网):', e.message);
        // 兜底：展现高拟真三维地网
        showFallback3DMesh();
    }
};

const showFallback3DMesh = () => {
    block2MeshEntity = viewer.value.entities.add({
        name: '全景实景三维生长网格',
        rectangle: {
            coordinates: Cesium.Rectangle.fromDegrees(
                -91.9947, 46.8422,
                -91.9934, 46.8432
            ),
            material: new Cesium.GridMaterialProperty({
                color: Cesium.Color.fromCssColorString('#00ff88').withAlpha(0.7),
                cellAlpha: 0.25,
                lineCount: new Cesium.Cartesian2(24, 24),
                lineThickness: new Cesium.Cartesian2(1.8, 1.8),
            }),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
    });
};

// 聚焦到最终三维成果
const focusOnModel = () => {
    if (!viewer.value) return;
    viewer.value.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(-91.9940, 46.8427, 350),
        orientation: {
            heading: Cesium.Math.toRadians(35),
            pitch: Cesium.Math.toRadians(-45),
            roll: 0,
        },
        duration: 1.8,
    });
};

// ==========================================
// 6. 飞行推演循环 (Tick Loop)
// ==========================================
let lastTickTime = performance.now();
let lastSampledIndex = -1;

const tickSimulation = (now) => {
    if (!isPlaying.value) return;

    const deltaMs = now - lastTickTime;
    lastTickTime = now;

    // 根据倍速推算进度：全航线基准时间为 24 秒
    const baseDurationMs = 24000 / playSpeed.value;
    currentProgress += deltaMs / baseDurationMs;

    if (currentProgress >= 1.0) {
        currentProgress = 1.0;
        isPlaying.value = false;
        isFinished.value = true;
    }

    flightProgress.value = currentProgress * 100;

    // 1. 获取当前插值位姿
    const pose = sampleDronePose(currentProgress);
    currentTelemetry.longitude = pose.lon;
    currentTelemetry.latitude = pose.lat;
    currentTelemetry.altitude = pose.alt;
    currentTelemetry.yaw = pose.yaw;

    const dronePos = Cesium.Cartesian3.fromDegrees(pose.lon, pose.lat, pose.alt);

    // 2. 更新无人机模型位置与朝向
    if (droneEntity) {
        droneEntity.position = dronePos;
        droneEntity.orientation = computeOrientation(dronePos, pose.yaw);
    }

    // 3. 动态更新航摄视锥体空间几何 (航向旋转严格对齐 ≡ 拍照曝光框)
    currentDronePos = dronePos;
    currentFrustumCorners = computeFootprintCorners(pose.lon, pose.lat, pose.alt, pose.yaw);
    currentGroundCenter = Cesium.Cartesian3.fromDegrees(pose.lon, pose.lat, Math.max(0, pose.alt - 20.0));

    // 3. 检查是否越过了新的拍摄航点
    if (pose.segIndex !== lastSampledIndex && pose.segIndex < totalWaypoints) {
        lastSampledIndex = pose.segIndex;
        snappedCount.value = pose.segIndex + 1;
        triggerExposure(RAW_WAYPOINTS[pose.segIndex], pose.segIndex);
    }

    // 4. 仅在伴飞模式下更新相机跟随；自由漫游与鸟瞰模式下完全由用户自由操控
    if (cameraMode.value === 'chase') {
        updateCameraView(false);
    }

    if (isPlaying.value) {
        animTimer = requestAnimationFrame(tickSimulation);
    }
};

// 更新相机视角
const updateCameraView = (isInitial = false) => {
    if (!viewer.value || !droneEntity) return;

    const dronePos = Cesium.Cartesian3.fromDegrees(
        currentTelemetry.longitude,
        currentTelemetry.latitude,
        currentTelemetry.altitude
    );

    if (cameraMode.value === 'chase') {
        // 伴飞特写视角：无人机斜后方跟随，俯角 -25 度
        const headingRad = Cesium.Math.toRadians(currentTelemetry.yaw);
        const pitchRad = Cesium.Math.toRadians(-25);
        let range = 65.0; // 默认伴飞视距 65 米

        if (!isInitial) {
            // 计算当前相机与无人机的实际视距，支持用户鼠标滚轮缩放自由调节伴飞距离
            const currentDist = Cesium.Cartesian3.distance(viewer.value.camera.positionWC, dronePos);
            if (currentDist >= 20.0 && currentDist <= 400.0) {
                range = currentDist;
            }
        }

        viewer.value.camera.lookAt(
            dronePos,
            new Cesium.HeadingPitchRange(headingRad, pitchRad, range)
        );
    } else if (cameraMode.value === 'overhead') {
        // 上帝鸟瞰视角：解除局部参考系锁定，俯视整片航区
        viewer.value.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
        if (isInitial) {
            viewer.value.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(-91.9940, 46.8427, 450),
                orientation: {
                    heading: Cesium.Math.toRadians(0),
                    pitch: Cesium.Math.toRadians(-75),
                    roll: 0,
                },
                duration: 1.2,
            });
        }
    } else {
        // 自由漫游模式：彻底解除 lookAtTransform 锁定
        viewer.value.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    }
};

const handleCameraModeChange = () => {
    updateCameraView(true);
};

// ==========================================
// 7. 播控交互
// ==========================================
const togglePlay = () => {
    if (isFinished.value) {
        resetSimulation();
    }
    isPlaying.value = !isPlaying.value;
    if (isPlaying.value) {
        lastTickTime = performance.now();
        animTimer = requestAnimationFrame(tickSimulation);
    } else {
        if (animTimer) cancelAnimationFrame(animTimer);
    }
};

const resetSimulation = () => {
    isPlaying.value = false;
    isFinished.value = false;
    currentProgress = 0;
    flightProgress.value = 0;
    snappedCount.value = 0;
    lastSampledIndex = -1;
    modelReady.value = false;

    block1.status = 'pending';
    block1.stage = '等待航片汇聚 (0/9)';
    block1.progress = 0;

    block2.status = 'pending';
    block2.stage = '等待第 2 批航线推进';
    block2.progress = 0;

    // 清理动态图元
    footprintEntities.forEach(f => viewer.value?.entities.remove(f));
    footprintEntities = [];

    if (block1MeshEntity) {
        viewer.value?.entities.remove(block1MeshEntity);
        block1MeshEntity = null;
    }
    if (block2MeshEntity) {
        viewer.value?.entities.remove(block2MeshEntity);
        block2MeshEntity = null;
    }
    if (tilesetPrimitive) {
        viewer.value?.scene.primitives.remove(tilesetPrimitive);
        tilesetPrimitive = null;
    }

    destroyDynamicCameraFrustum();

    initSceneEntities();
};

const handleProgressSeek = (val) => {
    currentProgress = val / 100;
    const pose = sampleDronePose(currentProgress);
    currentTelemetry.longitude = pose.lon;
    currentTelemetry.latitude = pose.lat;
    currentTelemetry.altitude = pose.alt;
    currentTelemetry.yaw = pose.yaw;

    if (droneEntity) {
        const dronePos = Cesium.Cartesian3.fromDegrees(pose.lon, pose.lat, pose.alt);
        droneEntity.position = dronePos;
        droneEntity.orientation = computeOrientation(dronePos, pose.yaw);

        // 同步更新航测视锥体空间几何
        currentDronePos = dronePos;
        currentFrustumCorners = computeFootprintCorners(pose.lon, pose.lat, pose.alt, pose.yaw);
        currentGroundCenter = Cesium.Cartesian3.fromDegrees(pose.lon, pose.lat, Math.max(0, pose.alt - 20.0));
    }
    snappedCount.value = Math.min(totalWaypoints, pose.segIndex + 1);
    updateCameraView(false);
};

const goBack = () => {
    router.push('/reconstruction');
};

const getBlockTagType = (status) => {
    if (status === 'done') return 'success';
    if (status === 'processing') return 'warning';
    return 'info';
};

const getBlockStatusText = (status) => {
    if (status === 'done') return '已完成';
    if (status === 'processing') return '解算中';
    return '未开始';
};

// ==========================================
// 8. 生命周期
// ==========================================
onMounted(async () => {
    await initCesium('cesiumRealtimeContainer', {
        requestRenderMode: false,
    });
    initSceneEntities();
});

onUnmounted(() => {
    if (animTimer) {
        cancelAnimationFrame(animTimer);
        animTimer = null;
    }
    destroyDynamicCameraFrustum();
    if (viewer.value) {
        viewer.value.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
        if (tilesetPrimitive) {
            viewer.value.scene.primitives.remove(tilesetPrimitive);
            tilesetPrimitive = null;
        }
    }
});
</script>

<style scoped>
.realtime-fly-container {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: #000;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    user-select: none;
}

.cesium-container {
    width: 100%;
    height: 100%;
}

/* ============================================================
   HUD 顶栏 (Glassmorphism)
============================================================ */
.hud-topbar {
    position: absolute;
    top: 16px;
    left: 20px;
    right: 20px;
    height: 60px;
    background: rgba(13, 20, 36, 0.78);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(0, 229, 255, 0.25);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    z-index: 100;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.topbar-left {
    display: flex;
    align-items: center;
    gap: 16px;
}

.back-btn {
    background: rgba(255, 255, 255, 0.08) !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    color: #e2e8f0 !important;
}
.back-btn:hover {
    background: rgba(0, 229, 255, 0.2) !important;
    border-color: #00e5ff !important;
    color: #00e5ff !important;
}

.hud-brand {
    display: flex;
    align-items: center;
    gap: 10px;
}

.live-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #00e5ff;
    box-shadow: 0 0 10px #00e5ff;
}

.live-dot.pulse {
    animation: livePulse 1.8s infinite;
}

@keyframes livePulse {
    0% { transform: scale(0.9); opacity: 0.7; }
    50% { transform: scale(1.3); opacity: 1; box-shadow: 0 0 18px #00e5ff; }
    100% { transform: scale(0.9); opacity: 0.7; }
}

.hud-title {
    font-size: 15px;
    font-weight: 600;
    color: #f8fafc;
    letter-spacing: 0.5px;
}

.mode-tag {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.5px;
}

.topbar-metrics {
    display: flex;
    align-items: center;
    gap: 16px;
}

.metric-card {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
}

.metric-label {
    font-size: 11px;
    color: #94a3b8;
    margin-bottom: 2px;
}

.metric-val {
    font-size: 13px;
    font-weight: 600;
    color: #e2e8f0;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.rtk-fixed {
    color: #10b981;
}

.photo-counter {
    color: #00e5ff;
}

.gpu-status {
    color: #f59e0b;
}

.metric-divider {
    width: 1px;
    height: 24px;
    background: rgba(255, 255, 255, 0.12);
}

/* ============================================================
   快门闪光反馈
============================================================ */
.shutter-flash {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: rgba(255, 255, 255, 0.4);
    opacity: 0;
    transition: opacity 0.1s ease-out;
    z-index: 99;
}
.shutter-flash.flashing {
    opacity: 1;
}

/* ============================================================
   右侧边栏：微批次看板
============================================================ */
.hud-sidebar {
    position: absolute;
    top: 92px;
    right: 20px;
    width: 320px;
    background: rgba(13, 20, 36, 0.82);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(0, 229, 255, 0.2);
    border-radius: 12px;
    padding: 18px;
    z-index: 100;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    color: #f1f5f9;
}

.cuda-badge {
    font-size: 11px;
    color: #10b981;
    background: rgba(16, 185, 129, 0.12);
    border: 1px solid rgba(16, 185, 129, 0.3);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
}

.pipeline-desc {
    font-size: 11px;
    line-height: 1.5;
    color: #94a3b8;
    background: rgba(0, 0, 0, 0.25);
    padding: 8px 10px;
    border-radius: 6px;
    border-left: 3px solid #00e5ff;
}

.block-card {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 12px;
    transition: all 0.3s;
}

.block-card.processing {
    border-color: rgba(245, 158, 11, 0.5);
    background: rgba(245, 158, 11, 0.05);
    box-shadow: 0 0 12px rgba(245, 158, 11, 0.15);
}

.block-card.done {
    border-color: rgba(16, 185, 129, 0.5);
    background: rgba(16, 185, 129, 0.05);
}

.block-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
}

.block-tag {
    font-weight: 700;
    font-size: 12px;
    color: #f8fafc;
}

.block-range {
    font-size: 11px;
    color: #94a3b8;
}

.progress-info {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #cbd5e1;
    margin-bottom: 4px;
}

.pct {
    font-family: monospace;
    font-weight: 600;
    color: #00e5ff;
}

.block-meta {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #10b981;
    margin-top: 8px;
    padding-top: 6px;
    border-top: 1px dashed rgba(255, 255, 255, 0.08);
}

.tileset-summary-card {
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(0, 229, 255, 0.2);
    border-radius: 8px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.summary-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #cbd5e1;
}

.status-green {
    color: #10b981;
    font-weight: 600;
}
.status-yellow {
    color: #f59e0b;
    font-weight: 600;
}

.summary-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 4px;
}

/* ============================================================
   底部控制悬浮栏 (Floating Dock)
============================================================ */
.hud-controller-dock {
    position: absolute;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    height: 58px;
    background: rgba(13, 20, 36, 0.85);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border: 1px solid rgba(0, 229, 255, 0.28);
    border-radius: 30px;
    display: flex;
    align-items: center;
    padding: 0 24px;
    gap: 18px;
    z-index: 100;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.65), 0 0 20px rgba(0, 229, 255, 0.15);
}

.ctrl-group {
    display: flex;
    align-items: center;
    gap: 10px;
}

.ctrl-main-btn {
    border-radius: 20px;
    padding: 8px 18px;
    font-weight: 600;
    background: linear-gradient(135deg, #0ea5e9, #0284c7) !important;
    border: none !important;
    box-shadow: 0 4px 14px rgba(14, 165, 233, 0.4);
}

.ctrl-btn {
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.08) !important;
    border: 1px solid rgba(255, 255, 255, 0.18) !important;
    color: #e2e8f0 !important;
}

.ctrl-label {
    font-size: 12px;
    color: #94a3b8;
    white-space: nowrap;
}

.ctrl-divider {
    width: 1px;
    height: 24px;
    background: rgba(255, 255, 255, 0.15);
}

:deep(.speed-radio .el-radio-button__inner),
:deep(.view-radio .el-radio-button__inner) {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.15);
    color: #cbd5e1;
    font-size: 11px;
}
:deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
    background: #0ea5e9;
    border-color: #0ea5e9;
    color: #fff;
    box-shadow: -1px 0 0 0 #0ea5e9;
}

.flight-progress-box {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 220px;
}

.progress-title {
    font-size: 11px;
    color: #94a3b8;
    white-space: nowrap;
}

.progress-slider {
    flex: 1;
}

.pct-text {
    font-size: 11px;
    color: #00e5ff;
    width: 34px;
    text-align: right;
}

/* ============================================================
   照片通知气泡
============================================================ */
.photo-toast {
    position: absolute;
    top: 92px;
    left: 20px;
    background: rgba(13, 20, 36, 0.85);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(0, 229, 255, 0.35);
    border-radius: 8px;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: #e2e8f0;
    z-index: 101;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}

.camera-icon {
    font-size: 16px;
}
</style>
