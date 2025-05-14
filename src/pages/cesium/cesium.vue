<template>
    <div id="cesiumContainer">
        <div class="control-panel">
            <button @click="startDrawing">开始规划</button>
            <button @click="simulateFlight">模拟飞行</button>
            <button @click="clearAll">清除所有</button>
            <div class="status-bar">当前高度：{{ currentHeight.toFixed(1) }}米 | 航点数量：{{ waypoints.length }}</div>
        </div>
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

<script setup>
import * as Cesium from 'cesium';
import '../../../public/Cesium/Widgets/widgets.css';
window.CESIUM_BASE_URL = './Cesium';
import { ref, onMounted, onUnmounted } from 'vue';

Cesium.Ion.defaultAccessToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI5NWEyM2E2Ni1mNDdmLTQ2NjYtYWQ0Mi0xYmE5OWVkYjIxNTUiLCJpZCI6Mjg3NzA3LCJpYXQiOjE3NDI5NTQ1ODR9.iyxiNumkb8sc6jM8EFk72wtwKmLOPAKqsxgeLqs1Nio';
Cesium.Camera.DEFAULT_VIEW_RECTANGLE = Cesium.Rectangle.fromDegrees(73.5, 3.9, 135.0, 55.0);

const viewer = ref(null);
const waypoints = ref([]);
const isDrawing = ref(false);
const currentWaypointIndex = ref(-1);
const currentHeight = ref(0);
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
const fovLines = ref([]);
const currentOrientation = ref(Cesium.Quaternion.IDENTITY);
const MOVE_STEP = 0.000001;
const ALTITUDE_STEP = 1;
const ROTATE_STEP = 10;

class FrustumManager {
    constructor(viewer, position, orientation) {
        this.viewer = viewer;
        this.position = position;
        this.orientation = orientation;
        this.frustumPrimitive = null;
        this.outlinePrimitive = null;
        this.fov = 30;
        this.near = 5;
        this.far = 100;
        this.aspectRatio = 1.0;
    }

    addFrustum() {
        const frustum = new Cesium.PerspectiveFrustum({
            fov: Cesium.Math.toRadians(this.fov),
            aspectRatio: this.aspectRatio,
            near: this.near,
            far: this.far,
        });

        const geometry = new Cesium.FrustumGeometry({
            frustum: frustum,
            origin: this.position,
            orientation: this.orientation,
            vertexFormat: Cesium.VertexFormat.POSITION_ONLY,
        });

        const instance = new Cesium.GeometryInstance({
            geometry: geometry,
            attributes: {
                color: Cesium.ColorGeometryInstanceAttribute.fromColor(new Cesium.Color(0.0, 1.0, 0.0, 0.2)),
            },
        });

        this.frustumPrimitive = this.viewer.scene.primitives.add(
            new Cesium.Primitive({
                geometryInstances: instance,
                appearance: new Cesium.PerInstanceColorAppearance({
                    closed: true,
                    flat: true,
                }),
                asynchronous: false,
            }),
        );
    }

    addOutline() {
        const frustum = new Cesium.PerspectiveFrustum({
            fov: Cesium.Math.toRadians(this.fov),
            aspectRatio: this.aspectRatio,
            near: this.near,
            far: this.far,
        });

        const geometry = new Cesium.FrustumOutlineGeometry({
            frustum: frustum,
            origin: this.position,
            orientation: this.orientation,
            vertexFormat: Cesium.VertexFormat.POSITION_ONLY,
        });

        const instance = new Cesium.GeometryInstance({
            geometry: geometry,
            attributes: {
                color: Cesium.ColorGeometryInstanceAttribute.fromColor(new Cesium.Color(0.0, 1.0, 0.0, 1.0)),
            },
        });

        this.outlinePrimitive = this.viewer.scene.primitives.add(
            new Cesium.Primitive({
                geometryInstances: instance,
                appearance: new Cesium.PerInstanceColorAppearance({
                    closed: true,
                    flat: true,
                }),
                asynchronous: false,
            }),
        );
    }

    update(position, orientation) {
        this.position = position;
        this.orientation = orientation;
        this.clear();
        this.add();
    }

    add() {
        this.addFrustum();
        this.addOutline();
    }

    clear() {
        if (this.frustumPrimitive) {
            this.viewer.scene.primitives.remove(this.frustumPrimitive);
        }
        if (this.outlinePrimitive) {
            this.viewer.scene.primitives.remove(this.outlinePrimitive);
        }
    }
}

const frustumManager = ref(null);

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
        // terrainProvider: await Cesium.createWorldTerrainAsync(),
    });

    viewer.value.imageryLayers.addImageryProvider(
        new Cesium.UrlTemplateImageryProvider({
            url: 'https://webst01.is.autonavi.com/appmaptile?lang=zh_cn&style=6&x={x}&y={y}&z={z}',
        }),
    );

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
});

onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
});

const handleKeyDown = e => {
    const key = e.key.toLowerCase();
    if (key === ' ') {
        e.preventDefault();
        if (!keyStates.value.space && isDrawing.value) {
            keyStates.value.space = true;
            createWaypoint(waypoints.value[currentWaypointIndex.value].position);
        }
        return;
    }
    if (key in keyStates.value && key !== 'space') {
        e.preventDefault();
        keyStates.value[key] = true;
        handleMovement();
    }
};

const handleKeyUp = e => {
    const key = e.key.toLowerCase();
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

const handleMovement = () => {
    if (!isDrawing.value || waypoints.value.length === 0) return;
    const waypoint = waypoints.value[currentWaypointIndex.value];
    const cartographic = Cesium.Cartographic.clone(waypoint.cartographic);
    let needsUpdate = false;

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
    if (keyStates.value.z) {
        cartographic.height = Math.max(0, cartographic.height - ALTITUDE_STEP);
        needsUpdate = true;
    }
    if (keyStates.value.c) {
        cartographic.height += ALTITUDE_STEP;
        needsUpdate = true;
    }
    if (keyStates.value.q) {
        rotateFov(-ROTATE_STEP);
    }
    if (keyStates.value.e) {
        rotateFov(ROTATE_STEP);
    }

    if (needsUpdate) {
        const newPosition = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, cartographic.height);
        waypoint.entity.position.setValue(newPosition);
        updateWaypointData(waypoint, newPosition);
    }
};

const addFovLines = position => {
    // const fovWidth = 20; // 视野宽度（左右各 10 米）
    // const fovHeight = 20; // 视野高度（上下各 5 米）
    // const fovLength = 100; // 视野长度（米）
    // const localDirections = [
    //     new Cesium.Cartesian3(fovLength, fovWidth / 2, fovHeight / 2), // 右上
    //     new Cesium.Cartesian3(fovLength, fovWidth / 2, -fovHeight / 2), // 右下
    //     new Cesium.Cartesian3(fovLength, -fovWidth / 2, fovHeight / 2), // 左上
    //     new Cesium.Cartesian3(fovLength, -fovWidth / 2, -fovHeight / 2), // 左下
    // ];
    // fovLines.value.forEach(line => viewer.value.entities.remove(line));
    // fovLines.value = [];
    // localDirections.forEach(localDir => {
    //     const line = viewer.value.entities.add({
    //         polyline: {
    //             positions: new Cesium.CallbackProperty((time, result) => {
    //                 const wpPos = waypoints.value[currentWaypointIndex.value].position;
    //                 const rotationMatrix = Cesium.Matrix3.fromQuaternion(currentOrientation.value);
    //                 const worldDir = Cesium.Matrix3.multiplyByVector(rotationMatrix, localDir, new Cesium.Cartesian3());
    //                 const endPos = Cesium.Cartesian3.add(wpPos, worldDir, new Cesium.Cartesian3());
    //                 return [wpPos, endPos];
    //             }, false),
    //             width: 2,
    //             material: Cesium.Color.GREEN.withAlpha(0.7),
    //         },
    //     });
    //     fovLines.value.push(line);
    // });
};
// 创建航点
const createWaypoint = position => {
    const cartographic = Cesium.Cartographic.fromCartesian(position);
    const waypoint = viewer.value.entities.add({
        position: position,
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

    const heightPoint = viewer.value.entities.add({
        position: Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, cartographic.height),
        polygon: {
            hierarchy: new Cesium.CallbackProperty(() => {
                const size = 0.3;
                const positions = [
                    Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude + size * 0.00001, cartographic.height),
                    Cesium.Cartesian3.fromRadians(cartographic.longitude - size * 0.000005, cartographic.latitude - size * 0.000005, cartographic.height),
                    Cesium.Cartesian3.fromRadians(cartographic.longitude + size * 0.000005, cartographic.latitude - size * 0.000005, cartographic.height),
                ];
                return new Cesium.PolygonHierarchy(positions);
            }, false),
            material: Cesium.Color.RED,
            outline: true,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
            height: cartographic.height,
        },
    });

    const heightLine = viewer.value.entities.add({
        polyline: {
            positions: new Cesium.CallbackProperty(time => {
                const wpPos = waypoint.position.getValue(time);
                const carto = Cesium.Cartographic.fromCartesian(wpPos);
                const groundPos = Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, 0);
                return [groundPos, wpPos];
            }, false),
            width: 2,
            material: Cesium.Color.YELLOW,
        },
    });

    waypoints.value.push({
        entity: waypoint,
        heightPoint,
        heightLine,
        position,
        cartographic: Cesium.Cartographic.clone(cartographic),
    });

    currentWaypointIndex.value = waypoints.value.length - 1;
    currentHeight.value = cartographic.height;
    updatePath();

    if (waypoints.value.length === 1) {
        // 初始方向设置为正北（Y轴方向）
        currentOrientation.value = Cesium.Quaternion.fromHeadingPitchRoll({
            heading: Cesium.Math.toRadians(90),
            pitch: 0,
            roll: 0,
        });

        frustumManager.value = new FrustumManager(viewer.value, position, currentOrientation.value);
        frustumManager.value.add();
    }
};

const updateWaypointData = (waypoint, newPosition) => {
    console.log('updateWaypointData');
    const cartographic = Cesium.Cartographic.fromCartesian(newPosition);
    waypoint.cartographic = cartographic;
    waypoint.position = newPosition;

    // 同步更新高度点和高度线
    waypoint.heightPoint.position = newPosition;
    waypoint.heightLine.polyline.positions = new Cesium.CallbackProperty((time, result) => {
        const wpPos = waypoint.position;
        const carto = Cesium.Cartographic.fromCartesian(wpPos);
        const groundPos = Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, 0);
        return [groundPos, wpPos];
    }, false);

    // 更新三角形位置，确保与高度线同步
    const size = 0.3;
    const rotationMatrix = Cesium.Matrix3.fromQuaternion(currentOrientation.value);
    const positions = [
        Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude + size * 0.00001, cartographic.height),
        Cesium.Cartesian3.fromRadians(cartographic.longitude - size * 0.000005, cartographic.latitude - size * 0.000005, cartographic.height),
        Cesium.Cartesian3.fromRadians(cartographic.longitude + size * 0.000005, cartographic.latitude - size * 0.000005, cartographic.height),
    ].map(pos => {
        const rotatedPos = new Cesium.Cartesian3();
        Cesium.Matrix3.multiplyByVector(rotationMatrix, pos, rotatedPos);
        return rotatedPos;
    });

    waypoint.heightPoint.polygon.hierarchy = new Cesium.CallbackProperty(() => {
        return new Cesium.PolygonHierarchy(positions);
    }, false);

    // 强制更新高度点实体
    viewer.value.entities.remove(waypoint.heightPoint);
    waypoint.heightPoint = viewer.value.entities.add({
        position: newPosition,
        polygon: {
            hierarchy: new Cesium.CallbackProperty(() => {
                const size = 0.3;
                const positions = [
                    Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude + size * 0.00001, cartographic.height),
                    Cesium.Cartesian3.fromRadians(cartographic.longitude - size * 0.000005, cartographic.latitude - size * 0.000005, cartographic.height),
                    Cesium.Cartesian3.fromRadians(cartographic.longitude + size * 0.000005, cartographic.latitude - size * 0.000005, cartographic.height),
                ];
                return new Cesium.PolygonHierarchy(positions);
            }, false),
            material: Cesium.Color.RED,
            outline: true,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
            height: cartographic.height,
        },
    });

    currentHeight.value = cartographic.height;
    addFovLines(newPosition); // 更新视野线位置
};

const rotateFov = degrees => {
    const hpr = Cesium.HeadingPitchRoll.fromQuaternion(currentOrientation.value);
    hpr.heading += Cesium.Math.toRadians(degrees); // 调整 Heading
    hpr.pitch = 0; // 强制保持水平
    hpr.roll = 0; // 防止侧倾
    currentOrientation.value = Cesium.Quaternion.fromHeadingPitchRoll(hpr);

    // 更新三角形实体的朝向
    if (waypoints.value.length > 0 && currentWaypointIndex.value >= 0) {
        const waypoint = waypoints.value[currentWaypointIndex.value];
        const cartographic = waypoint.cartographic;
        const size = 0.3;

        // 计算相对于航点中心的三角形顶点位置
        const center = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, cartographic.height);
        const positions = [
            new Cesium.Cartesian3(0, size * 0.00001, 0), // 顶部顶点
            new Cesium.Cartesian3(-size * 0.000005, -size * 0.000005, 0), // 左下顶点
            new Cesium.Cartesian3(size * 0.000005, -size * 0.000005, 0), // 右下顶点
        ];

        // 应用旋转矩阵
        const rotationMatrix = Cesium.Matrix3.fromQuaternion(currentOrientation.value);
        const rotatedPositions = positions.map(pos => {
            const rotatedPos = new Cesium.Cartesian3();
            Cesium.Matrix3.multiplyByVector(rotationMatrix, pos, rotatedPos);
            // 将旋转后的位置加回到中心点
            return Cesium.Cartesian3.add(center, rotatedPos, new Cesium.Cartesian3());
        });

        // 更新三角形实体的位置
        waypoint.heightPoint.polygon.hierarchy = new Cesium.CallbackProperty(() => {
            return new Cesium.PolygonHierarchy(rotatedPositions);
        }, false);
    }

    addFovLines(waypoints.value[currentWaypointIndex.value].position); // 重新生成视野线
};

const updatePath = () => {
    viewer.value.entities.removeById('flightPath');
    const positions = waypoints.value.map(wp => wp.position);
    if (positions.length > 1) {
        viewer.value.entities.add({
            id: 'flightPath',
            polyline: {
                positions,
                width: 18,
                material: new Cesium.PolylineGlowMaterialProperty({
                    glowPower: 0.2,
                    color: Cesium.Color.GREEN,
                }),
            },
        });
    }
};

const startDrawing = () => {
    isDrawing.value = true;
    if (waypoints.value.length === 0) {
        const position = Cesium.Cartesian3.fromDegrees(116.397477, 39.908692, 100);
        createWaypoint(position);
        viewer.value.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(116.397477, 39.908692, 500),
            orientation: {
                heading: Cesium.Math.toRadians(0),
                pitch: Cesium.Math.toRadians(-30),
                roll: 0,
            },
        });
    }
};

const simulateFlight = () => {
    if (waypoints.value.length < 2) return;
    const property = new Cesium.SampledPositionProperty();
    waypoints.value.forEach((wp, index) => {
        const time = Cesium.JulianDate.addSeconds(viewer.value.clock.startTime, index * 10, new Cesium.JulianDate());
        property.addSample(time, wp.position);
    });
    viewer.value.clock.multiplier = 10;
    viewer.value.clock.shouldAnimate = true;
    viewer.value.trackedEntity = waypoints.value[0].entity;
};

const clearAll = () => {
    waypoints.value.forEach(wp => {
        viewer.value.entities.remove(wp.entity);
        viewer.value.entities.remove(wp.heightPoint);
        viewer.value.entities.remove(wp.heightLine);
    });
    fovLines.value.forEach(line => viewer.value.entities.remove(line));
    fovLines.value = [];
    waypoints.value = [];
    viewer.value.entities.removeById('flightPath');
    currentWaypointIndex.value = -1;
    currentHeight.value = 0;
    currentOrientation.value = Cesium.Quaternion.IDENTITY;
    frustumManager.value?.clear();
};
</script>

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
