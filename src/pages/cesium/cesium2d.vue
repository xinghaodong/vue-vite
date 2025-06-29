<template>
    <div id="cesiumContainer" class="cesium-drone-simulator">
        <div class="control-panel">
            <el-button @click="startDrawing" :disabled="isDrawing">开始规划</el-button>
            <!-- <button @click="simulateFlight" :disabled="waypoints.length < 2">模拟飞行</button> -->
            <el-button style="margin-left: 0px" @click="clearAll">清除所有</el-button>
            <div class="status-info">
                <span>当前相机高度：{{ currentHeight.toFixed(1) }}米</span>
                <span>当前无人机高度：{{ airRoute.globalheight.toFixed(1) }}米</span>
                <span>航点数量：{{ airRoute.waypoints.length }}</span>
                <span>朝向：{{ frustumcurrentHeading }}°</span>
            </div>
            <el-form ref="ruleFormRef" :rules="rules" :model="airRoute" label-width="100px" style="max-width: 260px">
                <el-form-item label="航线名称">
                    <el-input v-model="airRoute.name" maxlength="20" prop="name" />
                </el-form-item>
                <el-form-item label="航线预估时间">
                    <el-input v-model="airRoute.time" disabled prop="time" />
                </el-form-item>
                <el-button type="primary" @click="onSubmit(ruleFormRef)" style="width: 100%">保存</el-button>
                <div class="status-info">
                    <span>当前相机高度：{{ currentHeight.toFixed(1) }}米</span>
                    <span>当前无人机高度：{{ airRoute.globalheight.toFixed(1) }}米</span>
                    <span>航点数量：{{ airRoute.waypoints.length }}</span>
                    <span>朝向：{{ frustumcurrentHeading }}°</span>
                </div>
            </el-form>
        </div>

        <div class="virtual-keyboard">
            <div class="keyboard-row">
                <div v-for="key in ['Q', 'W', 'E']" :key="key" class="key" :class="{ active: keyStates[key.toLowerCase()] }">
                    {{ key }}
                </div>
            </div>
            <div class="keyboard-row">
                <div v-for="key in ['A', 'S', 'D']" :key="key" class="key" :class="{ active: keyStates[key.toLowerCase()] }">
                    {{ key }}
                </div>
            </div>
            <div class="keyboard-row">
                <div class="key spacer"></div>
                <div v-for="key in ['Z', 'C']" :key="key" class="key" :class="{ active: keyStates[key.toLowerCase()] }">
                    {{ key }}
                </div>
                <div class="key spacer"></div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, getCurrentInstance, reactive } from 'vue';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { createDroneFrustum } from '@/assets/js/common';
import droneImage from '@/assets/WRJ.png';
const { proxy } = getCurrentInstance();
import { useRouter, useRoute } from 'vue-router';

// 配置Cesium基础URL
window.CESIUM_BASE_URL = './Cesium';

// Cesium Ion访问令牌
Cesium.Ion.defaultAccessToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI5NWEyM2E2Ni1mNDdmLTQ2NjYtYWQ0Mi0xYmE5OWVkYjIxNTUiLCJpZCI6Mjg3NzA3LCJpYXQiOjE3NDI5NTQ1ODR9.iyxiNumkb8sc6jM8EFk72wtwKmLOPAKqsxgeLqs1Nio';

// 常量定义
const MOVE_SPEED = 0.000001; // 移动速度 (经纬度变化量)
const ALTITUDE_STEP = 1; // 高度变化步长 (米)
const ROTATE_STEP = 2; // 旋转步长 (度)

const ruleFormRef = ref(null);
const rules = {
    name: [
        {
            required: true,
            message: '请输入航线名称',
            trigger: 'blur',
        },
    ],
    status: [
        {
            required: true,
            message: '请选择航线状态',
            trigger: 'change',
        },
    ],
};
// 编辑回显获取 vue 路由参数
const route = useRoute();
const { idkey } = route.query;
// 响应式状态
const viewer = ref(null);
const isDrawing = ref(false);
const currentWaypointIndex = ref(-1);
const currentHeight = ref(800);
const currentHeading = ref(0);
const keyStates = ref({
    w: false,
    a: false,
    s: false,
    d: false,
    q: false,
    e: false,
    z: false,
    c: false,
});

const followDrone = ref(true);
const animationFrameId = ref(null);
// 无人机实体
const droneEntity = ref(null);
// 当前飞行器位置和方向
const dronePosition = ref(null);
// 当前视椎体位置和方向
const droneFrustum = ref(null);
const airRoute = ref({
    name: '',
    time: 180,
    waypoints: [],
    status: 1,
    pointNum: 0,

    waypoints: [],
    globalheight: 100,
});
const moveSpeed = ref(0.0000001); // 移动速度
const heightSpeed = ref(1); // 高度变化速度
const droneGroundPoint = ref(null); // 无人机地面投影点实体
const droneHeightLine = ref(null); // 无人机高度连接线实体
const droneOrientation = ref(new Cesium.HeadingPitchRoll(0, 0, 0));
const cameraZoom = ref(2); // 相机变焦
const gimbalPitch = ref(0); //云台俯仰角
const frustumcurrentHeading = ref(0); // 存储当前视椎体航向角
const frustumcurrentGimbalPitch = ref(null); // 存储当前视椎体俯仰角
// 模型
const modelList = ref([{ url: 'http://192.168.8.109:5588/download/Tiles/tileset.json' }]);

// 详情

const getDetail = async idkey => {
    const { data } = await proxy.$api.routeDetail({ id: idkey });
    console.log('详情', data);
};

const onSubmit = formEl => {
    console.log('保存', airRoute.value);

    formEl.validate(async valid => {
        if (valid) {
            if (airRoute.value.waypoints.length < 1) {
                proxy.$message.warning('请至少添加一个航点');
                return;
            }
            // 准备要提交的数据
            const submitData = {
                name: airRoute.value.name,
                time: airRoute.value.time,
                pointNum: airRoute.value.waypoints.length,
                status: airRoute.value.status,
                tempWaypoints: airRoute.value.waypoints.map(wp => ({
                    latitude: wp.latitude,
                    longitude: wp.longitude,
                    height: wp.height,
                })),
            };

            console.log(submitData, 'airForm');
            const data = await proxy.$api.addRoute(submitData);
            if (data.code == 200) {
                if (window.opener && !window.opener.closed) {
                    console.log('父窗口已调用');
                    window.opener.handleSaveSuccess(); // 调用父窗口的方法
                }
                window.close();
            }
        } else {
            return false;
        }
    });

    return;
};

// 创建加载3D Tiles的实例
const create3DTileset = async modelConfig => {
    return await Cesium.Cesium3DTileset.fromUrl(modelConfig.url, {
        maximumScreenSpaceError: 4,
        skipLevelOfDetail: false,
        preferLeaves: true,
        immediatelyLoadDesiredLevelOfDetail: true,

        maximumMemoryUsage: 2048,
        preloadWhenHidden: true,

        dynamicScreenSpaceError: true,
        dynamicScreenSpaceErrorFactor: 4.0,
        dynamicScreenSpaceErrorDensity: 0.002,
        dynamicScreenSpaceErrorHeightFalloff: 0.25,

        cullWithChildrenBounds: false,
        cullRequestsWhileMoving: false,
        cullRequestsWhileMovingMultiplier: 1,
    });
};

// 应用高度偏移
const applyHeightOffset = tileset => {
    const findLowestHeight = tile => {
        const boundingSphere = tile.boundingVolume?.boundingSphere;
        if (!boundingSphere) return Infinity;
        const cartographic = Cesium.Cartographic.fromCartesian(boundingSphere.center);
        return cartographic.height;
    };

    const height = findLowestHeight(tileset.root);
    const heightOffset = -height;
    const boundingSphere = tileset.boundingSphere;
    const cartographic = Cesium.Cartographic.fromCartesian(boundingSphere.center);
    const surface = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0);
    const offset = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, heightOffset);
    const translation = Cesium.Cartesian3.subtract(offset, surface, new Cesium.Cartesian3());
    const modelMatrix = Cesium.Matrix4.fromTranslation(translation);
    tileset.modelMatrix = modelMatrix;
};

// 飞向组合包围球
const flyToCombinedBoundingSphere = (viewerInstance, tilesets) => {
    const boundingSpheres = tilesets.filter(t => t && t.boundingSphere).map(t => t.boundingSphere);

    if (boundingSpheres.length === 0) return;

    const compositeBoundingSphere = Cesium.BoundingSphere.fromBoundingSpheres(boundingSpheres);
    if (compositeBoundingSphere && compositeBoundingSphere.radius > 0) {
        viewerInstance.camera.flyToBoundingSphere(compositeBoundingSphere, {
            offset: new Cesium.HeadingPitchRange(0, -0.5, compositeBoundingSphere.radius * 3.0),
        });
    }
};

// 加载建筑模型
const load3DTilesModels = async () => {
    try {
        const hasTerrain = !(viewer.value.terrainProvider instanceof Cesium.EllipsoidTerrainProvider);
        const loadedTilesets = [];
        for (const model of modelList.value) {
            if (!model.url) continue;
            try {
                const tileset = await create3DTileset({ url: model.url });
                viewer.value.scene.primitives.add(tileset);
                loadedTilesets.push(tileset);

                if (!hasTerrain) {
                    applyHeightOffset(tileset);
                }
            } catch (error) {
                console.error(`加载模型 ${model.url} 失败:`, error);
                continue;
            }
        }
        if (loadedTilesets.length > 0) {
            flyToCombinedBoundingSphere(viewer.value, loadedTilesets);
        }
    } catch (error) {
        console.error('3D Tiles加载失败:', error);
    }
};

const flightPathPrimitive = ref(null);

const lastUpdateTime = ref(Date.now());
const updateFlightPathTimeRef = ref(null); // 用于存储当前的事件处理函数

/**
 * 创建航点
 * @param {*} position 位置
 * @param {*} point 编辑回显的数据
 */
const createWaypoint = (position, point, jp, event) => {
    const cartographic = Cesium.Cartographic.fromCartesian(position);
    const height = point ? point.height : jp ? Math.ceil(cartographic.height) : parseFloat(airRoute.value.globalheight);

    // 检查是否已存在相同位置的航点
    const existingWaypoint = airRoute.value.waypoints.find(waypoint => {
        const waypointCartographic = waypoint.cartographic;
        return Math.abs(waypointCartographic.longitude - cartographic.longitude) < 1e-6 && Math.abs(waypointCartographic.latitude - cartographic.latitude) < 1e-6;
    });
    if (existingWaypoint) {
        proxy.$message.error('不能重复创建');
        return;
    }

    position = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, height);

    // 设置航点和地面点的显示层级
    const waypointZIndex = 3;

    let maxId = 0;
    airRoute.value.waypoints.forEach(wp => {
        if (wp.entityId) {
            const id = parseInt(wp.entityId.split('_')[1]);
            maxId = Math.max(maxId, id);
        }
    });

    const entityId = `waypoint_${maxId + 1}`;

    const waypoint = viewer.value.entities.add({
        id: entityId,
        position,
        point: {
            pixelSize: 18,
            color: airRoute.value.waypoints.length === 1 ? Cesium.Color.fromCssColorString('rgba(255, 165, 0, 0.8)') : Cesium.Color.YELLOW,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 1,
            pixelOffset: new Cesium.Cartesian2(0, -20),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            zIndex: waypointZIndex,
            heightReference: Cesium.HeightReference.NONE,
        },
        label: {
            text: `航点 ${airRoute.value.waypoints.length + 1}`,
            font: '14px sans-serif',
            fillColor: Cesium.Color.BLACK,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 1,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -20),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            heightReference: Cesium.HeightReference.NONE,
        },
    });

    const { heightPoint, heightLine } = createGroundPointAndLine(position, cartographic);
    const longitude = Cesium.Math.toDegrees(cartographic.longitude);
    const latitude = Cesium.Math.toDegrees(cartographic.latitude);

    airRoute.value.waypoints.push({
        entityId: waypoint.id,
        entity: waypoint,
        position,
        cartographic,
        longitude,
        latitude,
        height: height,
        speed: point ? point.speed : parseFloat(airRoute.value.globalspeed),
        heading: 0,
        flightMode: 'straight',
        operations: [],
        heightPoint,
        heightLine,
        returnSetting: point ? point.returnSetting : '',
        headingmode: point ? point.headingmode : 1,
        headingangle: point ? point.headingangle : 0,
        id: point ? point.id : '',
        pointindexs: point ? point.pointindexs : '',
        interestHeight: point ? point.interestHeight : 100,
    });

    updatePath();
};

const updatePath = () => {
    if (!airRoute.value?.waypoints || airRoute.value.waypoints.length < 2) {
        cleanupPath();
        return;
    }

    const positions = airRoute.value.waypoints.map(wp => wp.position);

    // 计算路径总长度（单位：米）
    let totalLength = 0;
    for (let i = 1; i < positions.length; i++) {
        totalLength += Cesium.Cartesian3.distance(positions[i - 1], positions[i]);
    }

    cleanupPath();

    flightPathPrimitive.value = new Cesium.Primitive({
        geometryInstances: new Cesium.GeometryInstance({
            geometry: new Cesium.PolylineGeometry({
                positions: positions,
                width: 10.0, // 增加线宽
                vertexFormat: Cesium.PolylineMaterialAppearance.VERTEX_FORMAT,
            }),
        }),
        appearance: new Cesium.PolylineMaterialAppearance({
            material: new Cesium.Material({
                fabric: {
                    type: 'FlowLine',
                    uniforms: {
                        color: new Cesium.Color(0.0, 0.5, 1.0, 0.9), // 加深基础色
                        arrowColor: new Cesium.Color(1.0, 1.0, 1.0, 1.0),
                        speed: 1.5,
                        time: 0,
                        glowPower: 0.15, // 减弱发光
                        arrowSpacing: 30.0, // 更密集的箭头
                        arrowWidth: 0.3, // 更宽的箭头
                        totalLength: totalLength,
                    },
                },
            }),
            translucent: true,
        }),
        asynchronous: false,
    });
    viewer.value.scene.primitives.add(flightPathPrimitive.value);

    // 时间更新函数
    updateFlightPathTimeRef.value = () => {
        const currentTime = Date.now();
        const deltaTime = (currentTime - lastUpdateTime.value) / 1000.0;
        lastUpdateTime.value = currentTime;

        if (flightPathPrimitive.value?.appearance?.material) {
            const material = flightPathPrimitive.value.appearance.material;
            material.uniforms.time += deltaTime * material.uniforms.speed;
        }
    };

    lastUpdateTime.value = Date.now();
    viewer.value.scene.postRender.addEventListener(updateFlightPathTimeRef.value);
};

// 清理路径函数
const cleanupPath = () => {
    if (flightPathPrimitive.value) {
        viewer.value?.scene?.primitives?.remove(flightPathPrimitive.value);

        // 移除当前的事件监听器
        if (updateFlightPathTimeRef.value) {
            viewer.value?.scene?.postRender?.removeEventListener(updateFlightPathTimeRef.value);
        }

        flightPathPrimitive.value = null;
    }
};
/**
 * 更新流动箭头的时间uniform
 */
// 先定义 updateFlightPathTime
// const updateFlightPathTime = () => {
//     if (flightPathPrimitive.value && flightPathPrimitive.value.appearance.material) {
//         shaderTime.value += 0.01;
//         flightPathPrimitive.value.appearance.material.uniforms.time = shaderTime.value;
//     }
// };
// 创建无人机当前位置的航点
const createDroneWaypoint = () => {
    if (dronePosition.value) {
        // 调用已有的createWaypoint函数，传入当前无人机位置
        createWaypoint(dronePosition.value, null, 'JP');
    }
};

/**
 * 使用w前进a左移s后退d右移 c上升z下降 控制无人机航线规划的，可以支持键盘同时按下操作控制无人机
 */
const initKeyboardControl = () => {
    // 初始化飞行器
    initDrone();
    // 添加键盘事件监听
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    // 启动动画循环
    startAnimationLoop();
};

const startAnimationLoop = () => {
    let animate = () => {
        // 仅在有移动键按下时更新
        if (['w', 'a', 's', 'd', 'c', 'z'].some(k => keyStates.value[k])) {
            updateDronePosition();
            animationFrameId.value = requestAnimationFrame(animate);
            if (followDrone.value) {
                focusOnDrone();
            }
        } else {
            // 停止动画循环
            cancelAnimationFrame(animationFrameId.value);
            animationFrameId.value = null;
        }
    };
    animationFrameId.value = requestAnimationFrame(animate);
};
// 开始规划
const startDrawing = () => {
    isDrawing.value = true;

    viewer.value.camera.flyTo({
        // destination: Cesium.Cartesian3.fromDegrees(116.39135, 39.9065, currentHeight.value),
        destination: Cesium.Cartesian3.fromDegrees(112.85616784, 37.91565036, currentHeight.value),
        duration: 2, // 飞行动画时长（秒）
        maximumHeight: 5000, // 飞行时的最大高度
        orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-90),
            roll: 0.0,
        },
        complete: () => {
            // // 监听相机移动事件
            // this.viewer.camera.changed.addEventListener(this.updateScaleBar);
            // this.updateScaleBar();
            // 初始化键盘控制
            initKeyboardControl();
            // airRoute.value.globalheight = 100
            // // 标记机场点 位置
            // addAirportMarker(obj);
        },
    });
};

// 初始化飞行器
const initDrone = () => {
    if (droneEntity.value) {
        viewer.value.entities.remove(droneEntity.value);
    }
    let cartographic;
    // 获取最后一个航点的位置
    let lastPoint = null;
    if (airRoute.value.waypoints && airRoute.value.waypoints.length > 0) {
        lastPoint = airRoute.value.waypoints[airRoute.value.waypoints.length - 1];
    }
    // 如果有最后一个航点，使用其位置；否则使用相机位置
    if (lastPoint) {
        dronePosition.value = Cesium.Cartesian3.fromDegrees(lastPoint.longitude, lastPoint.latitude, lastPoint.height || airRoute.value.globalheight);
        cartographic = Cesium.Cartographic.fromCartesian(dronePosition.value);
    } else {
        cartographic = viewer.value.camera.positionCartographic;
        dronePosition.value = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, airRoute.value.globalheight);
    }
    // 创建无人机实体
    droneEntity.value = viewer.value.entities.add({
        id: 'drone_simulation',
        position: dronePosition.value,
        orientation: new Cesium.CallbackProperty(() => {
            const heading = Cesium.Math.toRadians(droneOrientation.value.heading);
            const pitch = Cesium.Math.toRadians(droneOrientation.value.pitch);
            const roll = Cesium.Math.toRadians(droneOrientation.value.roll);
            return Cesium.Transforms.headingPitchRollQuaternion(dronePosition.value, new Cesium.HeadingPitchRoll(heading, pitch, roll));
        }, false),
        billboard: {
            image: droneImage,
            width: 40,
            height: 40,
            alignedAxis: Cesium.Cartesian3.UNIT_Z, // 关键修改：设置对齐轴
            rotation: new Cesium.CallbackProperty(() => {
                return Cesium.Math.toRadians(-droneOrientation.value.heading);
            }, false),
            scaleByDistance: new Cesium.NearFarScalar(500, 1.0, 10000000, 0.5),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 100000000),
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        },
    });
    // 使用公共方法创建地面投影点和连接线
    const { heightPoint, heightLine } = createGroundPointAndLine(dronePosition.value, cartographic);
    droneGroundPoint.value = heightPoint;
    droneHeightLine.value = heightLine;
    // 创建视锥体
    createDroneFrustumView();
    // 初始时聚焦到飞行器
    // focusOnDrone(1);
};

// 创建地面投影点和连接线的公共方法
const createGroundPointAndLine = (position, cartographic) => {
    // 创建地面投影点
    const groundPosition = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0);
    // 添加地面投影点
    const heightPoint = viewer.value.entities.add({
        position: groundPosition,
        point: {
            pixelSize: 6,
            color: Cesium.Color.fromCssColorString('rgba(173, 216, 230,0.9)'),
            outlineColor: Cesium.Color.WHITE.withAlpha(0.9),
            outlineWidth: 1,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            // heightReference: Cesium.HeightReference.NONE,
            zIndex: 1,
            pickable: false,
        },
    });

    // 添加虚线连接
    const heightLine = viewer.value.entities.add({
        polyline: {
            positions: [groundPosition, position],
            width: 3,
            material: new Cesium.PolylineDashMaterialProperty({
                color: Cesium.Color.fromCssColorString('rgba(173, 216, 230,0.9)'),
                dashLength: 16.0,
            }),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            // heightReference: Cesium.HeightReference.NONE,
            zIndex: 1,
        },
    });

    return { heightPoint, heightLine };
};

// 创建无人机视锥体
const createDroneFrustumView = () => {
    // 获取当前无人机的方向四元数
    const orientation = Cesium.Transforms.headingPitchRollQuaternion(
        dronePosition.value,
        new Cesium.HeadingPitchRoll(
            Cesium.Math.toRadians(droneOrientation.value.heading - 0),
            Cesium.Math.toRadians(droneOrientation.value.pitch),
            Cesium.Math.toRadians(droneOrientation.value.roll),
        ),
    );
    // 创建视锥体
    droneFrustum.value = createDroneFrustum(viewer.value, dronePosition.value, orientation, cameraZoom.value, gimbalPitch.value);
};

// 相机跟随
const focusOnDrone = val => {
    if (!droneEntity.value || !followDrone.value) return;
    // 获取无人机当前时间下的位置
    const dronePos = droneEntity.value.position.getValue(viewer.value.clock.currentTime);
    if (!dronePos) return;

    // 获取相机当前的方向信息
    const heading = viewer.value.scene.camera.heading;
    const pitch = viewer.value.scene.camera.pitch;
    // 只更新相机的位置，使其始终对准无人机，但保留当前视角
    viewer.value.scene.camera.lookAt(dronePos, new Cesium.HeadingPitchRange(heading, pitch, currentHeight.value));
};

// 更新无人机航向角
const updateDroneOrientation = up => {
    // 保存当前航向角，避免被重置
    let currentHeading = droneOrientation.value.heading - 90;

    droneEntity.value.orientation = new Cesium.CallbackProperty(() => {
        return Cesium.Transforms.headingPitchRollQuaternion(
            dronePosition.value,
            new Cesium.HeadingPitchRoll(
                Cesium.Math.toRadians(currentHeading),
                Cesium.Math.toRadians(droneOrientation.value.pitch),
                Cesium.Math.toRadians(droneOrientation.value.roll),
            ),
        );
    }, false);
    // 同步更新视锥体朝向
    if (droneFrustum.value) {
        updateFrustumOrientation(up);
    }
};

// 处理键盘按下事件
const handleKeyDown = e => {
    if (
        e.code == 'KeyW' ||
        e.code == 'KeyS' ||
        e.code == 'KeyA' ||
        e.code == 'KeyD' ||
        e.code == 'KeyE' ||
        e.code == 'KeyQ' ||
        e.code == 'KeyZ' ||
        e.code == 'KeyC' ||
        e.code == 'Space'
    ) {
        // 触发 Cesium 的行为
        switch (e.key.toLowerCase()) {
            case 'q':
                // 逆时针旋转（减小航向角）
                droneOrientation.value.heading = normalizeHeading(droneOrientation.value.heading - 3);
                // airRoute.value.actioncommontext.forEach(item => {
                //     if (item.actiontype == 'rotateYaw') {
                //         item.paramvalue = droneOrientation.value.heading;
                //     }
                //     if (item.actiontype == 'gimbalRotateYaw') {
                //         item.paramvalue = droneOrientation.value.heading;
                //     }
                // });
                frustumcurrentHeading.value = droneOrientation.value.heading;
                updateDroneOrientation();
                break;
            case 'e':
                // 顺时针旋转（增加航向角）
                droneOrientation.value.heading = normalizeHeading(droneOrientation.value.heading + 3);
                // airRoute.value.actioncommontext.forEach(item => {
                //     if (item.actiontype == 'rotateYaw') {
                //         item.paramvalue = droneOrientation.value.heading;
                //     }
                //     if (item.actiontype == 'gimbalRotateYaw') {
                //         item.paramvalue = droneOrientation.value.heading;
                //     }
                // });
                frustumcurrentHeading.value = droneOrientation.value.heading;
                updateDroneOrientation();
                break;
        }
        const key = e.key.toLowerCase();
        if (key in keyStates.value) {
            keyStates.value[key] = true;
            e.preventDefault(); // 防止页面滚动
        }
        // 空格键创建航点
        if (e.code === 'Space') {
            createDroneWaypoint();
            e.preventDefault();
        }
        switch (e.key.toLowerCase()) {
            case 'w':
            case 'a':
            case 's':
            case 'd':
            case 'z':
            case 'c':
                // 控制键按下时重新锁定飞行器
                // viewer.trackedEntity = droneEntity;
                // 用户操作无人机时，启用跟随
                followDrone.value = true;
                // focusOnDrone();
                keyStates.value[e.key.toLowerCase()] = true;
                // 启动动画循环
                if (!animationFrameId.value) {
                    startAnimationLoop();
                }
                break;
        }
    }
};

// 处理键盘释放事件
const handleKeyUp = e => {
    const key = e.key.toLowerCase();
    if (key in keyStates.value) {
        keyStates.value[key] = false;
        // 如果所有移动键都释放，停止动画循环
        if (!['w', 'a', 's', 'd', 'c', 'z'].some(k => keyStates.value[k])) {
            if (animationFrameId.value) {
                cancelAnimationFrame(animationFrameId.value);

                animationFrameId.value = null;
            }
            followDrone.value = false;
            // 恢复默认相机控制器行为
            viewer.value.scene.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
        }
    }
};

// 添加航向角归一化方法
const normalizeHeading = heading => {
    // 确保航向角在-180到180度范围内
    heading = heading % 360;
    if (heading > 180) {
        heading -= 360;
    } else if (heading < -180) {
        heading += 360;
    }
    return heading;
};
// 更新无人机位置
const updateDronePosition = up => {
    if (!dronePosition.value) return;
    const cartographic = Cesium.Cartographic.fromCartesian(dronePosition.value);
    let needsUpdate = false;
    if (up) needsUpdate = true;
    // 计算实际航向角（考虑-90度校准）
    const actualHeading = Cesium.Math.toRadians(droneOrientation.value.heading);
    let deltaLat = 0;
    let deltaLon = 0;
    // 前后移动（使用实际航向角）
    if (keyStates.value.w || keyStates.value.s) {
        const moveMultiplier = keyStates.value.w ? 1 : -1;
        // 使用cos和sin计算正确的移动方向
        deltaLat = Math.cos(actualHeading) * moveSpeed.value * moveMultiplier;
        deltaLon = Math.sin(actualHeading) * moveSpeed.value * moveMultiplier;
        needsUpdate = true;
    }
    // 左右移动（垂直于航向角）
    if (keyStates.value.a || keyStates.value.d) {
        const moveMultiplier = keyStates.value.d ? 1 : -1;
        // 左右移动方向需要旋转90度
        deltaLat -= Math.sin(actualHeading) * moveSpeed.value * moveMultiplier;
        deltaLon += Math.cos(actualHeading) * moveSpeed.value * moveMultiplier;
        needsUpdate = true;
    }
    // 应用位置变化
    if (deltaLat !== 0 || deltaLon !== 0) {
        cartographic.latitude += deltaLat;
        cartographic.longitude += deltaLon;
    }
    const maxHeight = 10000;
    const minHeight = 0;

    if (keyStates.value.c) {
        // 上升，但不超过最大值
        if (cartographic.height + heightSpeed.value <= maxHeight) {
            cartographic.height += heightSpeed.value;
            airRoute.value.globalheight = cartographic.height;
            needsUpdate = true;
        }
    }

    if (keyStates.value.z) {
        // 下降，但不低于最小值
        if (cartographic.height - heightSpeed.value >= minHeight) {
            cartographic.height -= heightSpeed.value;
            airRoute.value.globalheight = cartographic.height;
            needsUpdate = true;
        }
    }
    // 更新位置
    if (needsUpdate) {
        const globalheight = airRoute.value.globalheight == 0 ? 0 : null;
        const newPosition = Cesium.Cartesian3.fromRadians(
            cartographic.longitude,
            cartographic.latitude,
            globalheight ?? cartographic.height ?? airRoute.value.waypoints[selectedIndex.value]?.height,
        );
        dronePosition.value = newPosition;
        droneEntity.value.position = newPosition;
        // 更新地面投影点位置
        const groundPosition = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0);
        if (droneGroundPoint.value) {
            droneGroundPoint.value.position = groundPosition;
        }
        // 更新视锥体
        updateFrustumOrientation();
        // 更新连接线位置
        if (droneHeightLine.value) {
            // 使用CallbackProperty来动态更新连接线位置
            if (!droneHeightLine.value._positionsCallback) {
                droneHeightLine.value.polyline.positions = new Cesium.CallbackProperty(() => {
                    const currentGroundPosition = Cesium.Cartesian3.fromRadians(
                        Cesium.Cartographic.fromCartesian(dronePosition.value).longitude,
                        Cesium.Cartographic.fromCartesian(dronePosition.value).latitude,
                        0,
                    );
                    return [currentGroundPosition, dronePosition.value];
                }, false);
                droneHeightLine.value._positionsCallback = true;
            }
        }
    }
};

// 更新视锥体朝向
const updateFrustumOrientation = up => {
    if (!droneFrustum.value || !dronePosition.value) return;
    // 获取当前无人机的方向四元数，不需要减去90度
    if (up) {
        // 可以在这里添加up为true时的逻辑
    }
    const orientation = Cesium.Transforms.headingPitchRollQuaternion(
        dronePosition.value,
        new Cesium.HeadingPitchRoll(
            Cesium.Math.toRadians(frustumcurrentHeading.value || droneOrientation.value.heading),
            Cesium.Math.toRadians(droneOrientation.value.pitch),
            Cesium.Math.toRadians(droneOrientation.value.roll),
        ),
    );
    // 更新视锥体的朝向，同时传入当前的 cameraZoom 和 gimbalPitch
    droneFrustum.value.update(dronePosition.value, orientation, cameraZoom.value, frustumcurrentGimbalPitch.value == null ? gimbalPitch.value : frustumcurrentGimbalPitch.value);
};

const handleMouseWheel = e => {
    e.preventDefault();
    if (viewer.value) {
        const camera = viewer.value.camera;
        currentHeight.value = camera.positionCartographic.height;
        // 根据滚轮方向决定放大还是缩小
        if (e.deltaY < 0) {
            // 向上滚动，放大
            camera.zoomIn(currentHeight.value * 0.05);
        } else {
            // 向下滚动，缩小
            camera.zoomOut(currentHeight.value * 0.05);
        }
    }
};

// 模拟飞行
const simulateFlight = () => {};

// 清除所有
const clearAll = () => {
    currentWaypointIndex.value = -1;
    currentHeight.value = 0;
    currentHeading.value = 0;
    isDrawing.value = false;
    viewer.value.entities.removeById('flightPath');
};

// 生命周期钩子
onMounted(async () => {
    // initCesium();

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
        // terrainProvider: await Cesium.createWorldTerrainAsync(), // 添加地形
    });
    // 飞向中国 Cesium.Camera.DEFAULT_VIEW_RECTANGLE = Cesium.Rectangle.fromDegrees(73.5, 3.9, 135.0, 55.0);
    var target = Cesium.Cartesian3.fromDegrees(116.4074, 39.9042, 16500000);

    // 使用flyTo方法飞向目标点
    viewer.value.camera.flyTo({
        destination: target,
        orientation: {
            heading: Cesium.Math.toRadians(0), // 方向角，例如向东为0度
            pitch: Cesium.Math.toRadians(-90), // 俯仰角，例如垂直向下为-90度
            roll: 0.0, // 翻滚角
        },
        duration: 3, // 飞行持续时间，单位为秒
    });

    // setTimeout(() => {
    //     viewer.value.clock.onTick.addEventListener(function () {
    //         viewer.value.camera.rotate(Cesium.Cartesian3.UNIT_Z, -0.001); // 调整速度
    //     });
    // }, 4000);

    viewer.value.canvas.addEventListener('wheel', handleMouseWheel);
    setTimeout(() => {
        load3DTilesModels();
    }, 6000);

    // 编辑回显
    if (idkey) {
        // 调用详情接口
        getDetail(idkey);
    }

    // 大气颜色
    // viewer.value.scene.atmosphere.dynamicLighting = Cesium.DynamicAtmosphereLightingType.SUNLIGHT;
    // viewer.value.scene.atmosphere.atmosphereLightingIntensity = 1.2;
    // viewer.value.scene.atmosphere.groundAtmosphereIntensity = 0.8;

    // // 设置黄昏色调
    // viewer.value.scene.skyAtmosphere.hueShift = -0.8;
    // viewer.value.scene.skyAtmosphere.saturationShift = -0.3;

    // 注册自定义材质
    Cesium.Material.FlowLineType = 'FlowLine';
    Cesium.Material._materialCache.addMaterial(Cesium.Material.FlowLineType, {
        fabric: {
            type: 'FlowLine',
            uniforms: {
                color: new Cesium.Color(0.0, 0.7, 1.0, 0.8),
                arrowColor: new Cesium.Color(1.0, 1.0, 1.0, 1.0),
                speed: 1,
                time: 0,
                glowPower: 0.3,
                arrowSpacing: 50.0, // 使用实际距离单位（米）
                arrowWidth: 0.2,
                totalLength: 100.0, // 必须与着色器中的变量名一致
            },
            source: `
            czm_material czm_getMaterial(czm_materialInput materialInput)
            {
                czm_material material = czm_getDefaultMaterial(materialInput);

                vec2 st = materialInput.st;
                float time = time;

                // 基础颜色和发光效果（减弱发光效果）
                vec4 baseColor = color;
                float glow = glowPower * 0.3 * (1.0 + cos(time * 3.0 - st.s * 8.0));
                baseColor.rgb += glow;

                // 标准化位置计算
                float normalizedPos = st.s * (totalLength / arrowSpacing);
                float arrowPos = fract(normalizedPos - time * speed);

                // 尝试模拟三角形
                float arrowHead = smoothstep(0.0, 0.05, arrowPos) *
                                (1.0 - smoothstep(0.05, 0.15, arrowPos));

                // 箭头尾部（更细的线条）
                float arrowTail = smoothstep(0.15, 0.2, arrowPos) *
                                 (1.0 - smoothstep(0.2, 0.3, arrowPos)) * 0.7;

                // 组合箭头形状（增强对比度）
                float arrowShape = min(1.0, max(arrowHead * 1.5, arrowTail));

                // 最终颜色混合（增强白色箭头效果）
                material.diffuse = mix(baseColor.rgb, arrowColor.rgb, pow(arrowHead, 2.0));
                material.alpha = mix(baseColor.a, 1.0, arrowHead);

                return material;
            }
        `,
        },
        translucent: true,
    });
});

onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
    if (viewer.value && !viewer.value.isDestroyed()) {
        viewer.value.destroy();
    }
});
</script>

<style scoped>
#cesiumContainer {
    position: relative;
    width: 100vw;
    height: 100vh;
}
.cesium-drone-simulator {
    position: relative;
    width: 100%;
    height: 100vh;
}

.control-panel {
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 999;
    background: rgba(0, 0, 0, 0.7);
    padding: 12px;
    border-radius: 8px;
    color: white;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

button {
    padding: 8px 16px;
    background: #2196f3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.2s;
}

button:hover {
    background: #1976d2;
}

button:disabled {
    background: #757575;
    cursor: not-allowed;
}

.status-info {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 14px;
    margin-top: 8px;
}

.virtual-keyboard {
    position: absolute;
    bottom: 20px;
    right: 20px;
    z-index: 999;
    padding: 15px;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.keyboard-row {
    display: flex;
    justify-content: center;
    gap: 10px;
}

.key {
    width: 50px;
    height: 50px;
    background: #333;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 18px;
    font-weight: bold;
    transition: all 0.2s;
    user-select: none;
}

.key.active {
    background: #2196f3;
    transform: scale(1.1);
    box-shadow: 0 0 10px rgba(33, 150, 243, 0.5);
}

.key.spacer {
    background: transparent;
    pointer-events: none;
}

@media (max-width: 768px) {
    .key {
        width: 40px;
        height: 40px;
        font-size: 16px;
    }

    .control-panel {
        padding: 10px;
        font-size: 12px;
    }
}
</style>
