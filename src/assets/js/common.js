//饿了么 icon 集合
import * as Icons from '@element-plus/icons-vue';
import * as Cesium from 'cesium';

export const iconLists = Object.keys(Icons).map(key => ({
    label: key, // 图标名称
    value: Icons[key], // 图标组件
}));

/**
 * 创建无人机视锥体
 * @param {Object} viewer Cesium viewer实例
 * @param {Cesium.Cartesian3} position 视锥体位置
 * @param {Cesium.Quaternion} orientation 视锥体方向
 * @param {Number} cameraZoom 相机缩放倍率，范围2-200
 * @param {Number} gimbalPitch 云台俯仰角，范围+45到-120度
 * @returns {Object} 包含update和destroy方法的控制器对象
 */
export function createDroneFrustum(viewer, position, orientation, cameraZoom = 3, gimbalPitch = 45) {
    // 创建一个虚拟相机，用于生成视锥体
    const camera = new Cesium.Camera(viewer.scene);
    // 设置相机的视锥体参数
    const baseFov = 80; // 基础视场角
    // 设置相机的视锥体参数
    camera.frustum = new Cesium.PerspectiveFrustum({
        fov: Cesium.Math.toRadians(baseFov / cameraZoom), // 垂直视场角，通过baseFov除以cameraZoom实现缩放效果
        aspectRatio: viewer.scene.canvas.clientWidth / viewer.scene.canvas.clientHeight - 0.5, // 宽高比，基于画布尺寸计算并减去0.5调整
        near: 1.0,
        far: 90.0,
    });
    // 从四元数获取航向角并应用修正
    const hpr = Cesium.HeadingPitchRoll.fromQuaternion(orientation);
    const correctedHeading = hpr.heading + Cesium.Math.toRadians(0);
    const correctedOrientation = Cesium.Quaternion.fromHeadingPitchRoll(new Cesium.HeadingPitchRoll(correctedHeading, hpr.pitch, hpr.roll));
    // 设置相机位置和方向
    camera.position = position;
    camera.setView({
        orientation: correctedOrientation,
    });
    // 应用云台俯仰角
    camera.setView({
        orientation: {
            heading: 0,
            pitch: Cesium.Math.toRadians(Cesium.Math.clamp(gimbalPitch, -120, 45)), // 限制在-120到+45度之间
            roll: 0,
        },
    });
    // 创建视锥体原语
    let frustumOutline = new Cesium.DebugCameraPrimitive({
        camera: camera,
        color: Cesium.Color.fromCssColorString('#00C78C').withAlpha(0.9), // 使用森林绿色并设置透明度
        updateOnChange: false,
    });
    // 创建中心虚线
    let centerLine = viewer.entities.add({
        polyline: {
            positions: new Cesium.CallbackProperty(() => {
                // 获取视锥体顶点（相机位置）
                const start = camera.position;
                // 计算视锥体远平面中心点
                const direction = camera.direction;
                const farDistance = camera.frustum.far;
                const end = Cesium.Cartesian3.add(start, Cesium.Cartesian3.multiplyByScalar(direction, farDistance, new Cesium.Cartesian3()), new Cesium.Cartesian3());
                return [start, end];
            }, false),
            width: 2,
            material: new Cesium.PolylineDashMaterialProperty({
                color: Cesium.Color.fromCssColorString('#00C78C').withAlpha(0.9),
            }),
        },
    });


    // 添加到场景
    viewer.scene.primitives.add(frustumOutline);

    return {
        update: function (newPosition, newOrientation, newCameraZoom, newGimbalPitch) {
            // 移除旧的视锥体
            viewer.scene.primitives.remove(frustumOutline);
            // 更新相机位置
            camera.position = newPosition;
            // 更新相机方向
            camera.direction = Cesium.Matrix3.getColumn(Cesium.Matrix3.fromQuaternion(newOrientation), 1, new Cesium.Cartesian3());
            // 更新相机的up向量
            const newUp = Cesium.Matrix3.getColumn(Cesium.Matrix3.fromQuaternion(newOrientation), 2, new Cesium.Cartesian3());
            camera.up = newUp;
            // 更新相机的right向量
            camera.right = Cesium.Cartesian3.cross(camera.direction, camera.up, new Cesium.Cartesian3());
            // 创建新的视锥体以更新缩放
            camera.frustum = new Cesium.PerspectiveFrustum({
                fov: Cesium.Math.toRadians(baseFov / newCameraZoom),
                aspectRatio: viewer.scene.canvas.clientWidth / viewer.scene.canvas.clientHeight - 0.5,
                near: 1,
                far: 90.0,
            });
            // 将云台俯仰角限制在-120到45度之间
            camera.setView({
                orientation: {
                    heading: camera.heading, // 保持当前航向角
                    pitch: Cesium.Math.toRadians(Cesium.Math.clamp(newGimbalPitch, -120, 45)),
                    roll: camera.roll, // 保持当前横滚角
                },
            });

            // 创建新的视锥体原语
            frustumOutline = new Cesium.DebugCameraPrimitive({
                camera: camera,
                color: Cesium.Color.fromCssColorString('#00C78C').withAlpha(0.9),
                updateOnChange: false,
            });
            // 添加到场景
            viewer.scene.primitives.add(frustumOutline);
        },
        destroy: function () {
            // 移除视锥体
            viewer.scene.primitives.remove(frustumOutline);
            // 移除中心虚线
            viewer.entities.remove(centerLine);
        },
    };
}

/**
 * 计算航线距离和时间
 * @param {*} waypoints 
 * @param {*} globalspeed 
 * @returns 
 */
export function calculateRouteInfo(waypoints, globalspeed) {
    let totalDistance = 0;
    let totalDuration = 0; // 单位：秒
    const positions = waypoints.map(wp => wp.position);
    for (let i = 0; i < positions.length - 1; i++) {
        const start = positions[i];
        const end = positions[i + 1];
        const distance = Cesium.Cartesian3.distance(start, end);
        totalDistance += distance;
        // let speed = i === 0 ? globalspeed : waypoints[i].speed || globalspeed;
        let speed = globalspeed;
        const duration = distance / speed;
        totalDuration += duration;
        if (i >= 0) {
            const waypoint = waypoints[i];
            if (waypoint.actionstext && Array.isArray(waypoint.actionstext)) {
                const waypointActionsDuration = waypoint.actionstext.reduce((sum, action) => {
                    if (action.actiontype == 'hover') {
                        return sum + (Number(action.paramvalue) || 0);
                    }
                    return sum;
                }, 0);
                totalDuration += waypointActionsDuration;
            }
        }
    }

    const lastWaypoint = waypoints[waypoints.length - 1];
    if (lastWaypoint && lastWaypoint.actionstext && Array.isArray(lastWaypoint.actionstext)) {
        const lastHoverDuration = lastWaypoint.actionstext.reduce((sum, action) => {
            if (action.actiontype == 'hover') {
                return sum + (Number(action.paramvalue) || 0);
            }
            return sum;
        }, 0);
        totalDuration += lastHoverDuration;
    }
    // 将总时长转换为 分钟 + 秒
    const minutes = Math.floor(totalDuration / 60);
    const seconds = Math.round(totalDuration % 60); // 可选：使用 Math.floor 或者四舍五入

    return {
        trackmileage: totalDistance.toFixed(1), // 米
        totalDuration: Math.round(totalDuration),
        trackduration_minutes: minutes,
        trackduration_seconds: seconds,
    };
}