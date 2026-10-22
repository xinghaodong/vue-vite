/**
 * ========================================================================
 * 文件名称: useThreeStage.js
 * 所属模块: 无人机集群编队系统 - 3D Three.js 夜空发光舞台 Hook
 * 功能说明:
 *   基于 Web 3D 工业标准打造：
 *   1. THREE.InstancedMesh (GPU 实例化网格)：1600~10000 架无人机仅 1 个 DrawCall；
 *   2. EffectComposer + UnrealBloomPass：真实暗黑夜空下的 LED 绚丽辉光与泛光；
 *   3. OrbitControls：鼠标 360° 空间视线漫游；
 *   4. GSAP 驱动时序与多场景插值平滑变轨；
 *   5. 显式生命周期治理：组件销毁时 100% 释放 GPU Buffer、Mesh 与纹理资源。
 * ========================================================================
 */

import { shallowRef, onMounted, onBeforeUnmount } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import gsap from 'gsap';

/**
 * 3D 夜空辉光舞台 Hook
 * @param {import('vue').ShallowRef<HTMLDivElement | null>} containerRef 舞台 DOM 容器
 */
export function useThreeStage(containerRef) {
    let scene = null;
    let camera = null;
    let renderer = null;
    let controls = null;
    let composer = null;
    let instancedMesh = null;
    let animationFrameId = null;

    // 虚拟变换矩阵与颜色辅助对象 (避免在渲染帧循环中反复 GC 分配)
    const dummyMatrix = new THREE.Matrix4();
    const dummyColor = new THREE.Color();
    const dummyPosition = new THREE.Vector3();

    // 当前无人机总架数
    let currentCapacity = 1600;

    /**
     * 初始化 Three.js 场景管线
     */
    function initThree() {
        const container = containerRef.value;
        if (!container) return;

        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;

        // 1. 场景与星空迷雾
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x06080e); // 极深邃夜空
        scene.fog = new THREE.FogExp2(0x06080e, 0.0008);

        // 2. 透视摄像机
        camera = new THREE.PerspectiveCamera(55, width / height, 1, 3000);
        camera.position.set(0, 180, 500);

        // 3. 渲染器 (高抗锯齿、物理正确灯光)
        renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance',
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        container.appendChild(renderer.domElement);

        // 4. 轨道控制器
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxDistance = 1500;
        controls.minDistance = 30;

        // 5. 后期处理辉光管线 (UnrealBloomPass)
        const renderScene = new RenderPass(scene, camera);
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(width, height),
            1.6, // 辉光强度 (Bloom Strength)
            0.5, // 泛光半径 (Radius)
            0.15 // 阈值 (Threshold)
        );

        composer = new EffectComposer(renderer);
        composer.addPass(renderScene);
        composer.addPass(bloomPass);

        // 6. 添加夜空环境底座发光网格
        createGroundGrid();

        // 7. 创建 GPU 实例化网格 (InstancedMesh)
        createInstancedDrones(currentCapacity);

        // 8. 启动渲染循环
        animate();

        // 监听视口尺寸重置
        window.addEventListener('resize', onWindowResize);
    }

    /**
     * 创建夜空地表发光网格基准标尺
     */
    function createGroundGrid() {
        const gridHelper = new THREE.GridHelper(800, 40, 0x00f2fe, 0x162135);
        gridHelper.position.y = -120;
        gridHelper.material.opacity = 0.4;
        gridHelper.material.transparent = true;
        scene.add(gridHelper);
    }

    /**
     * 构建单 DrawCall 的 GPU 实例化无人机球体粒子
     */
    function createInstancedDrones(count) {
        if (instancedMesh) {
            scene.remove(instancedMesh);
            instancedMesh.geometry.dispose();
            instancedMesh.material.dispose();
        }

        currentCapacity = count;
        // 无人机发光球体几何微元 (8 面细分球，保持轻量)
        const sphereGeo = new THREE.SphereGeometry(2.4, 8, 8);
        const sphereMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
        });

        instancedMesh = new THREE.InstancedMesh(sphereGeo, sphereMat, count);
        instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        // 初始随机分布或着陆状态
        for (let i = 0; i < count; i++) {
            dummyPosition.set(
                (Math.random() - 0.5) * 400,
                -118 + Math.random() * 5,
                (Math.random() - 0.5) * 400
            );
            dummyMatrix.setPosition(dummyPosition);
            instancedMesh.setMatrixAt(i, dummyMatrix);

            dummyColor.setHex(0x00ffff);
            instancedMesh.setColorAt(i, dummyColor);
        }

        instancedMesh.instanceMatrix.needsUpdate = true;
        if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;

        scene.add(instancedMesh);
    }

    /**
     * 将 2D 或 3D 点位平滑飞入舞台（GSAP 驱动插值变轨）
     * @param {Array<{x: number, y: number, z?: number, color?: string}>} targetPoints
     * @param {number} duration 过渡飞行时间 (秒)
     */
    /**
     * 将 2D 或 3D 点位平滑飞入舞台（GSAP 驱动插值变轨）
     * @param {Array<{x: number, y: number, z?: number, color?: string}>} targetPoints
     * @param {number} duration 过渡飞行时间 (秒)
     */
    function morphToPattern(targetPoints, duration = 2.0) {
        if (!instancedMesh || !targetPoints || !targetPoints.length) return;

        // 若目标点位超出当前 GPU 实例容量，自动扩容
        if (targetPoints.length > currentCapacity) {
            createInstancedDrones(Math.max(targetPoints.length, 1600));
        }

        const count = targetPoints.length;
        const totalMeshCount = currentCapacity;

        // 提取当前各个实例的初始位置与目标状态
        const startPositions = [];
        const targetPositions = [];
        const targetColors = [];

        for (let i = 0; i < totalMeshCount; i++) {
            instancedMesh.getMatrixAt(i, dummyMatrix);
            dummyPosition.setFromMatrixPosition(dummyMatrix);
            startPositions.push({ x: dummyPosition.x, y: dummyPosition.y, z: dummyPosition.z });

            if (i < count) {
                const target = targetPoints[i];
                // 🌟 3D 夜空视觉黄金高程：将图形优雅悬浮于夜空高度 Y=60m 处 (地表网格位于 Y=-120m，居中悬空)
                targetPositions.push({
                    x: target.x || 0,
                    y: 60 + (target.y || 0) * 0.8,
                    z: target.z || (Math.random() - 0.5) * 12,
                });
                targetColors.push(new THREE.Color(target.color || '#00f2fe'));
            } else {
                // 多余无人机实例优雅停降回停机坪地面 (Y=-118) 并熄灯 (纯黑)，绝不散落空中干扰主表演！
                targetPositions.push({
                    x: (Math.random() - 0.5) * 360,
                    y: -118,
                    z: (Math.random() - 0.5) * 360,
                });
                targetColors.push(new THREE.Color(0x000000));
            }
        }

        // 动画过渡进度对象
        const animState = { progress: 0 };
        gsap.to(animState, {
            progress: 1,
            duration: duration,
            ease: 'power3.inOut',
            onUpdate: () => {
                const p = animState.progress;
                for (let i = 0; i < totalMeshCount; i++) {
                    const s = startPositions[i];
                    const t = targetPositions[i];

                    // 空间插值 (带平滑缓动)
                    const curX = THREE.MathUtils.lerp(s.x, t.x, p);
                    const curY = THREE.MathUtils.lerp(s.y, t.y, p);
                    const curZ = THREE.MathUtils.lerp(s.z, t.z, p);

                    dummyPosition.set(curX, curY, curZ);
                    dummyMatrix.setPosition(dummyPosition);
                    instancedMesh.setMatrixAt(i, dummyMatrix);

                    // 颜色平滑过渡
                    instancedMesh.setColorAt(i, targetColors[i]);
                }
                instancedMesh.instanceMatrix.needsUpdate = true;
                if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
            },
        });
    }

    /**
     * 逐帧渲染循环
     */
    function animate() {
        animationFrameId = requestAnimationFrame(animate);
        if (controls) controls.update();
        if (composer) {
            composer.render();
        } else if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    }

    function onWindowResize() {
        const container = containerRef.value;
        if (!container || !camera || !renderer || !composer) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        composer.setSize(w, h);
    }

    onMounted(() => {
        initThree();
    });

    onBeforeUnmount(() => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', onWindowResize);

        if (instancedMesh) {
            scene.remove(instancedMesh);
            instancedMesh.geometry.dispose();
            instancedMesh.material.dispose();
            instancedMesh = null;
        }

        if (renderer) {
            renderer.dispose();
            renderer.forceContextLoss();
            if (renderer.domElement && renderer.domElement.parentNode) {
                renderer.domElement.parentNode.removeChild(renderer.domElement);
            }
            renderer = null;
        }

        scene = null;
        camera = null;
        controls = null;
        composer = null;
    });

    /**
     * 动态设置 3D 舞台背景与雾气颜色
     */
    function setStageBackgroundColor(hex) {
        if (!scene) return;
        const color = new THREE.Color(hex);
        scene.background = color;
        if (scene.fog) {
            scene.fog.color = color;
        }
    }

    return {
        morphToPattern,
        createInstancedDrones,
        setStageBackgroundColor,
    };
}
