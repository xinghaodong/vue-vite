<script setup>
import * as Cesium from 'cesium';
import '../../../public/Cesium/Widgets/widgets.css';
window.CESIUM_BASE_URL = '../../../public/Cesium';
import { ref, onMounted, onUnmounted } from 'vue';

Cesium.Ion.defaultAccessToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI5NWEyM2E2Ni1mNDdmLTQ2NjYtYWQ0Mi0xYmE5OWVkYjIxNTUiLCJpZCI6Mjg3NzA3LCJpYXQiOjE3NDI5NTQ1ODR9.iyxiNumkb8sc6jM8EFk72wtwKmLOPAKqsxgeLqs1Nio';
Cesium.Camera.DEFAULT_VIEW_RECTANGLE = Cesium.Rectangle.fromDegrees(73.5, 3.9, 135.0, 55.0);

const viewer = ref(null);
const waypoints = ref([]);
const droneEntity = ref(null);
const isDrawing = ref(false);
const currentWaypointIndex = ref(-1);
const currentHeight = ref(0);

// 新增键盘状态管理
const keyStates = ref({
    w: false,
    a: false,
    s: false,
    d: false,
    q: false,
    e: false,
    z: false,
    c: false,
    space: false,
});

// 常量配置
const MOVE_STEP = 0.000001; // 经纬度步长（约0.1米）
const ALTITUDE_STEP = 10; // 高度步长
const ROTATE_STEP = 10; // 旋转角度步长

onMounted(async () => {
    // 初始化Cesium Viewer
    viewer.value = new Cesium.Viewer('cesiumContainer', {
        infoBox: false,
        geocoder: false,
        homeButton: false,
        timeline: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        selectionIndicator: false,
        baseLayerPicker: false,

        terrainProvider: await Cesium.createWorldTerrainAsync(),
    });

    // 添加高德影像
    viewer.value.imageryLayers.addImageryProvider(
        new Cesium.UrlTemplateImageryProvider({
            url: 'https://webst01.is.autonavi.com/appmaptile?lang=zh_cn&style=6&x={x}&y={y}&z={z}',
        }),
    );

    // 初始化无人机
    droneEntity.value = viewer.value.entities.add({
        position: Cesium.Cartesian3.fromDegrees(116.397477, 39.908692, 100),
        model: {
            uri: '/parrot_camo_drone.glb',
            minimumPixelSize: 128,
            silhouetteColor: Cesium.Color.WHITE,
        },
        // orientation: new Cesium.VelocityOrientationProperty(),
        orientation: new Cesium.ConstantProperty(
            new Cesium.HeadingPitchRoll(0, 0, 0), // 初始方向设置为0度
        ),
    });

    // 新增键盘事件监听
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
});

onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
});

// 新增键盘事件处理
const handleKeyDown = e => {
    const key = e.key.toLowerCase();
    // 特殊处理空格键
    if (key === ' ') {
        e.preventDefault();
        if (!keyStates.value.space && isDrawing.value) {
            keyStates.value.space = true;
            createWaypoint(waypoints.value[currentWaypointIndex.value].position);
        }
        return;
    }
    // 处理其他按键
    if (key in keyStates.value && key !== 'space') {
        e.preventDefault();
        keyStates.value[key] = true;
        handleMovement();
    }
};

const handleKeyUp = e => {
    const key = e.key.toLowerCase();
    // 处理空格键
    if (key === ' ') {
        e.preventDefault();
        keyStates.value.space = false;
        return;
    }
    if (key in keyStates.value && key !== 'space') {
        e.preventDefault();
        keyStates.value[key] = false;
    }
};

// 组合键移动处理
const handleMovement = () => {
    if (!isDrawing.value || waypoints.value.length === 0) return;
    const waypoint = waypoints.value[currentWaypointIndex.value];
    const cartographic = Cesium.Cartographic.clone(waypoint.cartographic);
    let needsUpdate = false;

    // 处理组合移动
    if (keyStates.value.w) {
        cartographic.latitude += MOVE_STEP;
        needsUpdate = true;
    }
    if (keyStates.value.s) {
        cartographic.latitude -= MOVE_STEP;
        needsUpdate = true;
    }
    if (keyStates.value.a) {
        cartographic.longitude -= MOVE_STEP;
        needsUpdate = true;
    }
    if (keyStates.value.d) {
        cartographic.longitude += MOVE_STEP;
        needsUpdate = true;
    }

    // 处理高度变化
    if (keyStates.value.z) {
        cartographic.height = Math.max(0, cartographic.height - ALTITUDE_STEP);
        needsUpdate = true;
    }
    if (keyStates.value.c) {
        cartographic.height += ALTITUDE_STEP;
        needsUpdate = true;
    }

    // 处理旋转
    if (keyStates.value.q) {
        rotateDrone(-ROTATE_STEP);
    }
    if (keyStates.value.e) {
        rotateDrone(ROTATE_STEP);
    }

    if (needsUpdate) {
        const newPosition = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, cartographic.height);
        waypoint.entity.position.setValue(newPosition);
        updateWaypointData(waypoint, newPosition);
        updatePath();
    }
};
// 创建航点
const createWaypoint = position => {
    const cartographic = Cesium.Cartographic.fromCartesian(position);
    // 主航点（蓝色）
    const waypoint = viewer.value.entities.add({
        position,
        billboard: {
            image: '/Cesium/1743056937000.png',
            width: 32,
            height: 32,
        },
        label: {
            text: `航点 ${waypoints.value.length + 1}`,
            font: '14px sans-serif',
            fillColor: Cesium.Color.WHITE,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 20,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -20),
        },
    });

    // 高度控制点（红色）
    const heightPoint = viewer.value.entities.add({
        position: Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, cartographic.height + 50),
        point: {
            pixelSize: 16,
            color: Cesium.Color.RED,
        },
    });

    waypoints.value.push({
        entity: waypoint,
        heightPoint,
        position,
        cartographic: Cesium.Cartographic.clone(cartographic),
    });

    currentWaypointIndex.value = waypoints.value.length - 1;
    currentHeight.value = cartographic.height;
    updatePath();
};

// 更新航点数据
const updateWaypointData = (waypoint, newPosition) => {
    const cartographic = Cesium.Cartographic.fromCartesian(newPosition);
    waypoint.cartographic = cartographic;
    waypoint.position = newPosition;
    waypoint.heightPoint.position = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, cartographic.height + 50);
    currentHeight.value = cartographic.height;
};

// 无人机旋转
const rotateDrone = degrees => {
    const heading = Cesium.Math.toRadians(degrees);
    const orientation = droneEntity.value.orientation.getValue();
    droneEntity.value.orientation = new Cesium.HeadingPitchRoll(orientation.heading + heading, orientation.pitch, orientation.roll);
};

// 更新路径
const updatePath = () => {
    viewer.value.entities.removeById('flightPath');
    const positions = waypoints.value.map(wp => wp.position);

    if (positions.length > 1) {
        viewer.value.entities.add({
            id: 'flightPath',
            polyline: {
                positions,
                width: 3,
                material: new Cesium.PolylineGlowMaterialProperty({
                    glowPower: 0.2,
                    color: Cesium.Color.BLUE,
                }),
            },
        });
    }
};

// 开始规划
const startDrawing = () => {
    isDrawing.value = true;
    if (waypoints.value.length === 0) {
        createWaypoint(Cesium.Cartesian3.fromDegrees(116.397477, 39.908692, 100));
    }
};

// 模拟飞行
const simulateFlight = () => {
    if (waypoints.value.length < 2) return;

    const property = new Cesium.SampledPositionProperty();
    waypoints.value.forEach((wp, index) => {
        const time = Cesium.JulianDate.addSeconds(viewer.value.clock.startTime, index * 10, new Cesium.JulianDate());
        property.addSample(time, wp.position);
    });

    droneEntity.value.position = property;
    viewer.value.clock.multiplier = 10;
    viewer.value.clock.shouldAnimate = true;
};

// 清除所有
const clearAll = () => {
    waypoints.value.forEach(wp => {
        viewer.value.entities.remove(wp.entity);
        viewer.value.entities.remove(wp.heightPoint);
    });
    waypoints.value = [];
    viewer.value.entities.removeById('flightPath');
    currentWaypointIndex.value = -1;
    currentHeight.value = 0;
};
</script>

<template>
    <div id="cesiumContainer">
        <div class="control-panel">
            <button @click="startDrawing">开始规划</button>
            <button @click="simulateFlight">模拟飞行</button>
            <button @click="clearAll">清除所有</button>
            <div class="status-bar">当前高度：{{ currentHeight.toFixed(1) }}米 | 航点数量：{{ waypoints.length }}</div>
        </div>

        <!-- 新增可视化键盘 -->
        <div class="virtual-keyboard">
            <div class="keyboard-row">
                <div v-for="key in ['Q', 'W', 'E']" :key="key" class="key" :class="{ active: keyStates[key.toLowerCase()] }">{{ key }}</div>
            </div>
            <div class="keyboard-row">
                <div v-for="key in ['A', 'S', 'D']" :key="key" class="key" :class="{ active: keyStates[key.toLowerCase()] }">{{ key }}</div>
            </div>
            <div class="keyboard-row">
                <div v-for="key in ['Z', 'C']" :key="key" class="key" :class="{ active: keyStates[key.toLowerCase()] }">{{ key }}</div>
            </div>
        </div>
    </div>
</template>

<style>
#cesiumContainer {
    position: relative;
    width: 100vw;
    height: 100vh;
}

.control-panel {
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.7);
    padding: 10px;
    border-radius: 5px;
    color: white;
}

button {
    margin: 5px;
    padding: 8px 15px;
    background: #2196f3;
    border: none;
    border-radius: 3px;
    color: white;
    cursor: pointer;
}

button:hover {
    background: #1976d2;
}

.status-bar {
    margin-top: 10px;
    padding: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    font-size: 12px;
}

/* 新增键盘样式 */
.virtual-keyboard {
    position: absolute;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.7);
    padding: 15px;
    border-radius: 8px;
    display: grid;
    grid-gap: 10px;
}

.keyboard-row {
    display: flex;
    justify-content: center;
    gap: 10px;
}

.key {
    width: 60px;
    height: 60px;
    background: #333;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 18px;
    transition: all 0.2s;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.key.active {
    background: #2196f3;
    transform: scale(1.1);
    box-shadow: 0 4px 8px rgba(33, 150, 243, 0.3);
}

@media (max-width: 768px) {
    .key {
        width: 50px;
        height: 50px;
        font-size: 16px;
    }
}
</style>
