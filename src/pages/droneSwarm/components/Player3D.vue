<template>
    <div class="player-3d-viewport">
        <!-- Three.js 画布 DOM 挂载容器 -->
        <div ref="threeContainer" class="three-canvas-container"></div>

        <!-- 3D 舞台 HUD 状态 -->
        <div class="hud-top-left">
            <div class="hud-badge">
                <span class="status-dot"></span>
                <span>3D · THREE.JS</span>
            </div>
            <div class="hud-sub">
                GPU 实例化 · 紧凑 BLOOM 泛光
            </div>
        </div>

        <!-- 快捷机位切换控制栏 -->
        <div class="hud-top-right">
            <div class="camera-presets-bar">
                <button class="cam-btn" title="顶部俯视" @click="setCameraPreset('top')">
                    俯视
                </button>
                <button class="cam-btn" title="正立面视角" @click="setCameraPreset('front')">
                    正视
                </button>
                <button class="cam-btn" title="45° 斜角视角" @click="setCameraPreset('iso')">
                    45°
                </button>
                <button class="cam-btn" title="复位观众席机位" @click="setCameraPreset('reset')">
                    复位
                </button>
            </div>
        </div>

        <div class="hud-center-hint">
            <span class="hint-item"><kbd>左键拖拽</kbd>旋转</span>
            <span class="hint-item"><kbd>滚轮</kbd>缩放</span>
            <span class="hint-item"><kbd>右键</kbd>平移</span>
        </div>

        <!-- 起飞预演：从地面停机坪方阵垂直爬升入场（带黄色抗气流扰动引导线） -->
        <button class="takeoff-btn" @click="triggerTakeoff">
            🚀 地面起飞预演 (Takeoff Cue)
        </button>
    </div>
</template>

<script setup>
/**
 * 3D 夜空发光无人机集群表演播放器组件 (使用 Vue 3.5 useTemplateRef)
 */
import { useTemplateRef, watch, onMounted, nextTick } from 'vue';
import { useThreeStage } from '../composables/useThreeStage';

const props = defineProps({
    agents: {
        type: Array,
        default: () => [],
    },
    droneCount: {
        type: Number,
        default: 800,
    },
});

const containerRef = useTemplateRef('threeContainer');

const { morphToPattern, takeoffToPattern, setCameraPreset, createInstancedDrones } = useThreeStage(containerRef);

function triggerTakeoff() {
    if (props.agents && props.agents.length) {
        takeoffToPattern(props.agents, 4.0);
    }
}

onMounted(() => {
    nextTick(() => {
        if (props.agents && props.agents.length) {
            morphToPattern(props.agents, 1.5);
        }
    });
});

// 移除昂贵的 deep: true，通过引用/浅层变化触发变轨，杜绝千架点位下的响应式 GC 停顿
watch(
    () => props.agents,
    (newAgents) => {
        if (newAgents && newAgents.length) {
            morphToPattern(newAgents, 2.0);
        }
    }
);

watch(
    () => props.droneCount,
    (newCount) => {
        createInstancedDrones(newCount);
        if (props.agents.length) {
            morphToPattern(props.agents, 1.0);
        }
    }
);

defineExpose({
    morphToPattern,
    takeoffToPattern,
    setCameraPreset,
});
</script>

<style scoped>
.player-3d-viewport {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #05070d;
    user-select: none;
}

.player-3d-viewport::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(ellipse at center, transparent 52%, rgba(0, 0, 0, 0.42) 100%);
}

.three-canvas-container {
    width: 100%;
    height: 100%;
}

.three-canvas-container :deep(canvas) {
    display: block;
    outline: none;
}

.hud-top-left {
    position: absolute;
    top: 14px;
    left: 14px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    pointer-events: none;
    z-index: 10;
}

.hud-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 8px;
    border-radius: 4px;
    background: rgba(14, 21, 37, 0.85);
    border: 1px solid rgba(0, 242, 254, 0.3);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: #00f2fe;
    backdrop-filter: blur(8px);
    width: fit-content;
}

.status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #00f2fe;
    box-shadow: 0 0 6px #00f2fe;
}

.hud-sub {
    font-size: 10px;
    color: #64748b;
    letter-spacing: 0.3px;
}

.hud-top-right {
    position: absolute;
    top: 14px;
    right: 14px;
    z-index: 10;
}

.camera-presets-bar {
    display: flex;
    gap: 4px;
    background: rgba(14, 21, 37, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    padding: 3px;
    backdrop-filter: blur(8px);
}

.cam-btn {
    border: none;
    background: transparent;
    color: #94a3b8;
    font-size: 11px;
    font-weight: 600;
    padding: 4px 9px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
}

.cam-btn:hover {
    color: #00f2fe;
    background: rgba(0, 242, 254, 0.12);
}

.hud-center-hint {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 14px;
    pointer-events: none;
    z-index: 10;
}

.hint-item {
    font-size: 11px;
    color: #64748b;
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.hint-item kbd {
    background: rgba(15, 23, 42, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 3px;
    padding: 1px 5px;
    color: #cbd5e1;
    font-size: 10px;
}

.takeoff-btn {
    position: absolute;
    bottom: 16px;
    right: 16px;
    z-index: 10;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: 6px;
    border: 1px solid rgba(0, 242, 254, 0.4);
    background: rgba(0, 242, 254, 0.12);
    color: #00f2fe;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    backdrop-filter: blur(8px);
    transition: all 0.2s ease;
}

.takeoff-btn:hover {
    background: rgba(0, 242, 254, 0.25);
    box-shadow: 0 0 14px rgba(0, 242, 254, 0.4);
    transform: translateY(-1px);
}
</style>
