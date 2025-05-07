<script setup>
import * as Cesium from 'cesium';
import '../../../public/Cesium/Widgets/widgets.css';
window.CESIUM_BASE_URL = './Cesium';
import { ref, onMounted, onUnmounted } from 'vue';

// 定义飞行图标的SVG
const planeIcon = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="yellow">
  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
</svg>
`;

Cesium.Ion.defaultAccessToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI5NWEyM2E2Ni1mNDdmLTQ2NjYtYWQ0Mi0xYmE5OWVkYjIxNTUiLCJpZCI6Mjg3NzA3LCJpYXQiOjE3NDI5NTQ1ODR9.iyxiNumkb8sc6jM8EFk72wtwKmLOPAKqsxgeLqs1Nio';
Cesium.Camera.DEFAULT_VIEW_RECTANGLE = Cesium.Rectangle.fromDegrees(73.5, 3.9, 135.0, 55.0);

const viewer = ref(null);
const waypoints = ref([]);
const isDrawing = ref(false);
const selectedWaypoint = ref(null);

onMounted(async () => {
    viewer.value = new Cesium.Viewer('cesiumContainer', {
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
        terrainProvider: await Cesium.createWorldTerrainAsync(),
    });
    viewer.value.imageryLayers.addImageryProvider(
        new Cesium.UrlTemplateImageryProvider({
            url: 'https://webst01.is.autonavi.com/appmaptile?lang=zh_cn&style=6&x={x}&y={y}&z={z}',
        }),
    );

    // 添加地图点击事件监听
    viewer.value.screenSpaceEventHandler.setInputAction(onMapClick, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // 添加拖拽事件监听
    viewer.value.screenSpaceEventHandler.setInputAction(onLeftDown, Cesium.ScreenSpaceEventType.LEFT_DOWN);
    viewer.value.screenSpaceEventHandler.setInputAction(onLeftUp, Cesium.ScreenSpaceEventType.LEFT_UP);
    viewer.value.screenSpaceEventHandler.setInputAction(onMouseMove, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    viewer.value.scene.screenSpaceCameraController.enableRotate = false;
    viewer.value.scene.screenSpaceCameraController.enableTranslate = false;
    viewer.value.scene.screenSpaceCameraController.enableTilt = false;
    // viewer.value.scene.screenSpaceCameraController.enableZoom = false;
});

onUnmounted(() => {
    if (viewer.value) {
        viewer.value.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
        viewer.value.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOWN);
        viewer.value.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_UP);
        viewer.value.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        viewer.value.destroy();
    }
});

// 拖拽相关事件处理
const onLeftDown = event => {
    const pickedObject = viewer.value.scene.pick(event.position);
    if (Cesium.defined(pickedObject) && pickedObject.id) {
        const waypointIndex = waypoints.value.findIndex(wp => wp.entity === pickedObject.id);
        if (waypointIndex !== -1) {
            selectedWaypoint.value = waypointIndex;
            viewer.value.scene.screenSpaceCameraController.enableRotate = false;
            viewer.value.scene.screenSpaceCameraController.enableTranslate = false;
            viewer.value.scene.screenSpaceCameraController.enableZoom = false;
            viewer.value.scene.screenSpaceCameraController.enableTilt = false;
            event.stopPropagation();
        }
    }
};

const onLeftUp = () => {
    if (selectedWaypoint.value !== null) {
        viewer.value.scene.screenSpaceCameraController.enableRotate = true;
        // viewer.value.scene.screenSpaceCameraController.enableTranslate = true;
        viewer.value.scene.screenSpaceCameraController.enableZoom = true;
        // viewer.value.scene.screenSpaceCameraController.enableTilt = true;
        selectedWaypoint.value = null;
    }
};

const onMouseMove = event => {
    if (selectedWaypoint.value !== null) {
        const cartesian = viewer.value.camera.pickEllipsoid(event.endPosition, viewer.value.scene.globe.ellipsoid);
        if (cartesian) {
            const waypoint = waypoints.value[selectedWaypoint.value];
            waypoint.entity.position = cartesian;
            waypoint.position = cartesian;
            waypoint.cartographic = Cesium.Cartographic.fromCartesian(cartesian);
            // 确保在拖动过程中实时更新航线
            const positions = waypoints.value.map(wp => wp.position);
            if (positions.length > 1) {
                const existingPath = viewer.value.entities.getById('flightPath');
                if (existingPath) {
                    existingPath.polyline.positions = positions;
                } else {
                    updatePath();
                }
            }
        }
    }
};

// 地图点击事件处理
const onMapClick = event => {
    if (!isDrawing.value) return;

    const cartesian = viewer.value.camera.pickEllipsoid(event.position, viewer.value.scene.globe.ellipsoid);

    if (cartesian) {
        createWaypoint(cartesian);
    }
};

// 创建航点
const createWaypoint = position => {
    const cartographic = Cesium.Cartographic.fromCartesian(position);
    const isFirstWaypoint = waypoints.value.length === 0;

    const waypoint = viewer.value.entities.add({
        position,
        ...(isFirstWaypoint
            ? {
                  billboard: {
                      image: `data:image/svg+xml;base64,${btoa(planeIcon)}`,
                      verticalOrigin: Cesium.VerticalOrigin.CENTER,
                      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                      scale: 1.5,
                  },
              }
            : {
                  point: {
                      pixelSize: 15,
                      color: Cesium.Color.YELLOW,
                      outlineColor: Cesium.Color.WHITE,
                      outlineWidth: 2,
                  },
              }),
        label: {
            text: `航点 ${waypoints.value.length + 1}`,
            font: '14px sans-serif',
            fillColor: Cesium.Color.WHITE,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 2,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -20),
        },
    });

    waypoints.value.push({
        entity: waypoint,
        position,
        cartographic: Cesium.Cartographic.clone(cartographic),
    });

    updatePath();
};

// 更新路径线
const updatePath = () => {
    viewer.value.entities.removeById('flightPath');
    const positions = waypoints.value.map(wp => wp.position);
    if (positions.length > 1) {
        viewer.value.entities.add({
            id: 'flightPath',
            polyline: {
                positions,
                width: 8,
                material: new Cesium.PolylineGlowMaterialProperty({
                    glowPower: 0.3,
                    color: Cesium.Color.YELLOW,
                }),
            },
        });
    }
};

// 开始绘制
const startDrawing = () => {
    isDrawing.value = true;
};

// 清除所有
const clearAll = () => {
    waypoints.value.forEach(wp => {
        viewer.value.entities.remove(wp.entity);
    });
    waypoints.value = [];
    viewer.value.entities.removeById('flightPath');
};
</script>

<template>
    <div id="cesiumContainer">
        <div class="control-panel">
            <button @click="startDrawing">开始规划</button>
            <button @click="clearAll">清除所有</button>
            <div class="status-bar">航点数量：{{ waypoints.length }}</div>
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
</style>
