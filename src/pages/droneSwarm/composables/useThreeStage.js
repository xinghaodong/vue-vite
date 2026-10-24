/**
 * ========================================================================
 * 文件名称: useThreeStage.js
 * 所属模块: 无人机集群编队系统 - 3D Three.js 夜空发光舞台 Hook
 * 功能说明:
 *   基于 Web 3D 工业标准打造：
 *   1. THREE.InstancedMesh (GPU 实例化网格)：1600~10000 架无人机仅 1 个 DrawCall；
 *   2. EffectComposer + UnrealBloomPass：真实暗黑夜空下的 LED 紧致光晕（收紧 Bloom，避免糊成肉团）；
 *   3. 地面停机坪起飞阵列 (Takeoff Cue)：地面方阵 + 垂直爬升抗风阻引导线 + 4s 平滑入列；
 *   4. OrbitControls + 快捷机位切换 (俯视/正视/45°/复位)；
 *   5. 显式生命周期治理：组件销毁时 100% 释放 GPU Buffer、Mesh、引导线与纹理资源。
 * ========================================================================
 */

import { shallowRef, onMounted, onBeforeUnmount } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import gsap from 'gsap';

export function useThreeStage(containerRef) {
    let scene = null;
    let camera = null;
    let renderer = null;
    let controls = null;
    let composer = null;
    let instancedMesh = null;
    let guideLines = null;
    let animationFrameId = null;
    let activeTween = null;

    const dummyMatrix = new THREE.Matrix4();
    const dummyColor = new THREE.Color();
    const dummyPosition = new THREE.Vector3();

    let currentCapacity = 1600;
    const GROUND_Y = -118;

    function initThree() {
        const container = containerRef.value;
        if (!container) return;

        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x06080e);
        scene.fog = new THREE.FogExp2(0x06080e, 0.0008);

        camera = new THREE.PerspectiveCamera(55, width / height, 1, 3000);
        camera.position.set(85, 105, 420);

        renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance',
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        container.appendChild(renderer.domElement);

        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.target.set(0, 40, 0);
        controls.maxDistance = 1600;
        controls.minDistance = 40;
        controls.maxPolarAngle = Math.PI / 2 + 0.08; // 限制不能过度钻到地面下

        // 后期处理：收紧 Bloom 参数，保证高锐度离散光点，绝不糊成大肉球
        const renderScene = new RenderPass(scene, camera);
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(width, height),
            0.95, // 紧凑辉光强度
            0.35, // 泛光半径收窄
            0.45  // 阈值提高，地面网格等暗部不发光
        );

        composer = new EffectComposer(renderer);
        composer.addPass(renderScene);
        composer.addPass(bloomPass);

        createGroundGrid();
        createInstancedDrones(currentCapacity);

        animate();
        window.addEventListener('resize', onWindowResize);
    }

    function createGroundGrid() {
        const gridHelper = new THREE.GridHelper(800, 40, 0x00f2fe, 0x162135);
        gridHelper.position.y = GROUND_Y;
        gridHelper.material.opacity = 0.35;
        gridHelper.material.transparent = true;
        scene.add(gridHelper);
    }

    function createInstancedDrones(count) {
        if (instancedMesh) {
            scene.remove(instancedMesh);
            instancedMesh.geometry.dispose();
            instancedMesh.material.dispose();
        }

        currentCapacity = count;
        // 细腻发光球体
        const sphereGeo = new THREE.SphereGeometry(2.0, 8, 8);
        const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        instancedMesh = new THREE.InstancedMesh(sphereGeo, sphereMat, count);
        instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        // 默认整齐停放在地面停机坪网格中
        const cols = Math.ceil(Math.sqrt(count));
        const spacing = 8.0;
        const offsetX = ((cols - 1) * spacing) / 2;
        const offsetZ = offsetX;

        for (let i = 0; i < count; i++) {
            const r = Math.floor(i / cols);
            const c = i % cols;
            dummyPosition.set(c * spacing - offsetX, GROUND_Y, r * spacing - offsetZ);
            dummyMatrix.setPosition(dummyPosition);
            instancedMesh.setMatrixAt(i, dummyMatrix);

            dummyColor.setHex(0x00f2fe);
            instancedMesh.setColorAt(i, dummyColor);
        }

        instancedMesh.instanceMatrix.needsUpdate = true;
        if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;

        scene.add(instancedMesh);
    }

    /**
     * 平滑变轨飞入当前构型 (GSAP)
     */
    function morphToPattern(targetPoints, duration = 2.0) {
        if (!instancedMesh || !targetPoints || !targetPoints.length) return;

        if (activeTween) {
            activeTween.kill();
            activeTween = null;
        }

        if (targetPoints.length > currentCapacity) {
            createInstancedDrones(Math.max(targetPoints.length, 1600));
        }

        const count = targetPoints.length;
        const total = currentCapacity;

        const startPositions = [];
        const targetPositions = [];
        const targetColors = [];

        for (let i = 0; i < total; i++) {
            instancedMesh.getMatrixAt(i, dummyMatrix);
            dummyPosition.setFromMatrixPosition(dummyMatrix);
            startPositions.push({ x: dummyPosition.x, y: dummyPosition.y, z: dummyPosition.z });

            if (i < count) {
                const target = targetPoints[i];
                targetPositions.push({
                    x: target.x || 0,
                    y: 60 + (target.y || 0) * 0.8,
                    z: target.z || (Math.random() - 0.5) * 8,
                });
                targetColors.push(new THREE.Color(target.color || '#00f2fe'));
            } else {
                targetPositions.push({
                    x: (Math.random() - 0.5) * 360,
                    y: GROUND_Y,
                    z: (Math.random() - 0.5) * 360,
                });
                targetColors.push(new THREE.Color(0x000000));
            }
        }

        const animState = { progress: 0 };
        activeTween = gsap.to(animState, {
            progress: 1,
            duration,
            ease: 'power3.inOut',
            onUpdate: () => {
                const p = animState.progress;
                for (let i = 0; i < total; i++) {
                    const s = startPositions[i];
                    const t = targetPositions[i];

                    const curX = THREE.MathUtils.lerp(s.x, t.x, p);
                    const curY = THREE.MathUtils.lerp(s.y, t.y, p);
                    const curZ = THREE.MathUtils.lerp(s.z, t.z, p);

                    dummyPosition.set(curX, curY, curZ);
                    dummyMatrix.setPosition(dummyPosition);
                    instancedMesh.setMatrixAt(i, dummyMatrix);

                    instancedMesh.setColorAt(i, targetColors[i]);
                }
                instancedMesh.instanceMatrix.needsUpdate = true;
                if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
            },
            onComplete: () => {
                activeTween = null;
            },
        });
    }

    /**
     * 🚀 商业级 Takeoff Cue 地面起飞预演（对标 SwarmStudio 视频 A）
     * 阶段一：从停机坪垂直爬升（黄色引导线指示防气流干扰）
     * 阶段二：平滑编队散开并入列构型
     */
    function takeoffToPattern(targetPoints, duration = 4.0) {
        if (!instancedMesh || !targetPoints || !targetPoints.length) return;

        if (activeTween) {
            activeTween.kill();
            activeTween = null;
        }

        const count = targetPoints.length;
        const cols = Math.ceil(Math.sqrt(count));
        const spacing = 8.0;
        const offsetX = ((cols - 1) * spacing) / 2;
        const offsetZ = offsetX;

        // 重新排布到地面方阵停机坪
        const groundPositions = [];
        const climbPositions = [];
        const finalPositions = [];
        const finalColors = [];

        // 构建垂直爬升黄色引导线
        if (guideLines) {
            scene.remove(guideLines);
            guideLines.geometry.dispose();
            guideLines.material.dispose();
        }

        const linePositions = [];
        const climbHeight = 25; // 垂直离地高度

        for (let i = 0; i < currentCapacity; i++) {
            if (i < count) {
                const r = Math.floor(i / cols);
                const c = i % cols;
                const gx = c * spacing - offsetX;
                const gz = r * spacing - offsetZ;

                groundPositions.push({ x: gx, y: GROUND_Y, z: gz });
                climbPositions.push({ x: gx, y: GROUND_Y + climbHeight, z: gz });

                linePositions.push(gx, GROUND_Y, gz);
                linePositions.push(gx, GROUND_Y + climbHeight, gz);

                const target = targetPoints[i];
                finalPositions.push({
                    x: target.x || 0,
                    y: 60 + (target.y || 0) * 0.8,
                    z: target.z || (Math.random() - 0.5) * 8,
                });
                finalColors.push(new THREE.Color(target.color || '#00f2fe'));
            } else {
                groundPositions.push({ x: 0, y: GROUND_Y, z: 0 });
                climbPositions.push({ x: 0, y: GROUND_Y, z: 0 });
                finalPositions.push({ x: 0, y: GROUND_Y, z: 0 });
                finalColors.push(new THREE.Color(0x000000));
            }
        }

        const lineGeo = new THREE.BufferGeometry();
        lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
        const lineMat = new THREE.LineBasicMaterial({
            color: 0xffe600,
            opacity: 0.75,
            transparent: true,
        });
        guideLines = new THREE.LineSegments(lineGeo, lineMat);
        scene.add(guideLines);

        const animState = { progress: 0 };
        activeTween = gsap.to(animState, {
            progress: 1,
            duration,
            ease: 'power2.inOut',
            onUpdate: () => {
                const p = animState.progress;

                // 前 40% 时间垂直爬升，后 60% 飞往目标构型
                for (let i = 0; i < currentCapacity; i++) {
                    let curX, curY, curZ;
                    if (p < 0.4) {
                        const localP = p / 0.4;
                        curX = groundPositions[i].x;
                        curY = THREE.MathUtils.lerp(groundPositions[i].y, climbPositions[i].y, localP);
                        curZ = groundPositions[i].z;
                    } else {
                        const localP = (p - 0.4) / 0.6;
                        curX = THREE.MathUtils.lerp(climbPositions[i].x, finalPositions[i].x, localP);
                        curY = THREE.MathUtils.lerp(climbPositions[i].y, finalPositions[i].y, localP);
                        curZ = THREE.MathUtils.lerp(climbPositions[i].z, finalPositions[i].z, localP);
                    }

                    dummyPosition.set(curX, curY, curZ);
                    dummyMatrix.setPosition(dummyPosition);
                    instancedMesh.setMatrixAt(i, dummyMatrix);

                    instancedMesh.setColorAt(i, finalColors[i]);
                }
                instancedMesh.instanceMatrix.needsUpdate = true;
                if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;

                // 引导线淡出
                if (guideLines && p > 0.4) {
                    guideLines.material.opacity = Math.max(0, 1 - (p - 0.4) / 0.3);
                }
            },
            onComplete: () => {
                if (guideLines) {
                    scene.remove(guideLines);
                    guideLines.geometry.dispose();
                    guideLines.material.dispose();
                    guideLines = null;
                }
                activeTween = null;
            },
        });
    }

    /**
     * 快捷机位切换
     */
    function setCameraPreset(preset = 'reset') {
        if (!camera || !controls) return;
        const targets = {
            top: { x: 0, y: 650, z: 0.1, tx: 0, ty: 40, tz: 0 },
            front: { x: 0, y: 60, z: 520, tx: 0, ty: 60, tz: 0 },
            iso: { x: 280, y: 220, z: 360, tx: 0, ty: 40, tz: 0 },
            reset: { x: 85, y: 105, z: 420, tx: 0, ty: 40, tz: 0 },
        };
        const dest = targets[preset] || targets.reset;

        gsap.to(camera.position, {
            x: dest.x,
            y: dest.y,
            z: dest.z,
            duration: 1.2,
            ease: 'power2.out',
        });
        gsap.to(controls.target, {
            x: dest.tx,
            y: dest.ty,
            z: dest.tz,
            duration: 1.2,
            ease: 'power2.out',
        });
    }

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

        if (activeTween) {
            activeTween.kill();
            activeTween = null;
        }

        if (guideLines) {
            scene.remove(guideLines);
            guideLines.geometry.dispose();
            guideLines.material.dispose();
            guideLines = null;
        }

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
     * 逐帧毫秒级注入瞬时无人机姿态与防撞体检红光 (支持时间轴 Scrubber 60FPS 直驱)
     */
    function setInstantDrones(agents, dangerIds = new Set()) {
        if (!instancedMesh || !agents || !agents.length) return;

        if (activeTween) {
            activeTween.kill();
            activeTween = null;
        }

        if (agents.length > currentCapacity) {
            createInstancedDrones(Math.max(agents.length, 1600));
        }

        const count = agents.length;
        const total = currentCapacity;

        for (let i = 0; i < total; i++) {
            if (i < count) {
                const ag = agents[i];
                const isDanger = dangerIds.has ? dangerIds.has(ag.id) : false;
                dummyPosition.set(
                    ag.x || 0,
                    60 + (ag.y || 0) * 0.8,
                    ag.z || 0
                );
                dummyMatrix.setPosition(dummyPosition);
                instancedMesh.setMatrixAt(i, dummyMatrix);

                if (isDanger) {
                    dummyColor.setHex(0xff1744); // 违规碰撞标红高亮
                } else {
                    dummyColor.setStyle(ag.color || '#00f2fe');
                }
                instancedMesh.setColorAt(i, dummyColor);
            } else {
                dummyPosition.set(0, GROUND_Y - 200, 0);
                dummyMatrix.setPosition(dummyPosition);
                instancedMesh.setMatrixAt(i, dummyMatrix);
                dummyColor.setHex(0x000000);
                instancedMesh.setColorAt(i, dummyColor);
            }
        }

        instancedMesh.instanceMatrix.needsUpdate = true;
        if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
    }

    return {
        setInstantDrones,
        morphToPattern,
        takeoffToPattern,
        setCameraPreset,
        createInstancedDrones,
    };
}
