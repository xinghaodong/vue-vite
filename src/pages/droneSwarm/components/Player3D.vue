<template>
    <div class="player-3d-viewport">
        <!-- Three.js 画布 DOM 挂载容器 -->
        <div ref="threeContainer" class="three-canvas-container"></div>

        <!-- 3D 舞台 HUD 态势指示 -->
        <div class="hud-top-left">
            <div class="hud-badge">
                <span class="status-dot"></span>
                <span>3D · NIGHT SKY DIGITAL TWIN</span>
            </div>
            <div class="hud-sub">
                <span>GPU 实例化渲染 · {{ droneCount }} 架</span>
                <span v-if="dangerIds && dangerIds.size > 0" class="hud-alert-text">
                    · ⚠️ {{ dangerIds.size }} 架违规临界间距
                </span>
            </div>
        </div>

        <!-- 快捷机位切换控制栏 -->
        <div class="hud-top-right">
            <div class="camera-presets-bar">
                <button class="cam-btn" title="顶部俯视机位" @click="setCameraPreset('top')">
                    俯视
                </button>
                <button class="cam-btn" title="正立面视角" @click="setCameraPreset('front')">
                    正视
                </button>
                <button class="cam-btn" title="45° 侧空立体视角" @click="setCameraPreset('iso')">
                    45°
                </button>
                <button class="cam-btn" title="复位观众席观察位" @click="setCameraPreset('reset')">
                    复位
                </button>
            </div>
        </div>

        <div class="hud-center-hint">
            <span class="hint-item"><kbd>左键</kbd>三维旋转</span>
            <span class="hint-item"><kbd>滚轮</kbd>景深缩放</span>
            <span class="hint-item"><kbd>右键</kbd>空间平移</span>
        </div>

        <!-- 地面起飞预演按钮 (纯矢量图标) -->
        <button class="takeoff-btn" @click="triggerTakeoff">
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" class="takeoff-svg">
                <line x1="8" y1="14" x2="8" y2="2"/>
                <polyline points="3 7 8 2 13 7"/>
            </svg>
            <span>地面起飞预演 (Takeoff Cue)</span>
        </button>
    </div>
</template>

<script setup>
/**
 * 3D 夜空发光无人机集群表演播放器组件 (支持时间轴 60FPS 瞬时驱动与态势告警)
 */
import { useTemplateRef, watch, onMounted, nextTick } from 'vue';
import { useThreeStage } from '../composables/useThreeStage';

const props = defineProps({
    agents: {
        type: Array,
        default: () => [],
    },
    dangerIds: {
        type: Object,
        default: () => new Set(),
    },
    droneCount: {
        type: Number,
        default: 800,
    },
    isLiveTimeline: {
        type: Boolean,
        default: false,
    },
});

const containerRef = useTemplateRef('threeContainer');

const {
    morphToPattern,
    takeoffToPattern,
    setCameraPreset,
    createInstancedDrones,
    setInstantDrones,
} = useThreeStage(containerRef);

function triggerTakeoff() {
    if (props.agents && props.agents.length) {
        takeoffToPattern(props.agents, 4.0);
    }
}

onMounted(() => {
    nextTick(() => {
        if (props.agents && props.agents.length) {
            setInstantDrones(props.agents, props.dangerIds);
        }
    });
});

watch(
    () => props.agents,
    (newAgents) => {
        if (!newAgents || !newAgents.length) return;
        if (props.isLiveTimeline) {
            // 时间轴驱动状态下：60FPS 极速设置瞬时姿态
            setInstantDrones(newAgents, props.dangerIds);
        } else {
            // 常规切镜：平滑插值飞入
            morphToPattern(newAgents, 1.8);
        }
    },
    { immediate: false }
);

watch(
    () => props.droneCount,
    (newCount) => {
        createInstancedDrones(newCount);
        if (props.agents.length) {
            setInstantDrones(props.agents, props.dangerIds);
        }
    }
);

defineExpose({
    morphToPattern,
    takeoffToPattern,
    setCameraPreset,
    setInstantDrones,
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
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(14, 21, 37, 0.82);
    border: 1px solid rgba(0, 242, 254, 0.35);
    padding: 3px 10px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
    color: #00f2fe;
    letter-spacing: 0.8px;
    backdrop-filter: blur(8px);
}

.status-dot {
    width: 6px;
    height: 6px;
    background: #00f2fe;
    border-radius: 50%;
    box-shadow: 0 0 8px #00f2fe;
}

.hud-sub {
    font-size: 10px;
    color: #94a3b8;
    padding-left: 2px;
    font-family: ui-monospace, SFMono-Regular, monospace;
}

.hud-alert-text {
    color: #f87171;
    font-weight: 600;
}

.hud-top-right {
    position: absolute;
    top: 14px;
    right: 14px;
    z-index: 10;
}

.camera-presets-bar {
    display: flex;
    background: rgba(15, 23, 42, 0.82);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    padding: 2px;
    gap: 2px;
    backdrop-filter: blur(8px);
}

.cam-btn {
    background: transparent;
    border: none;
    color: #94a3b8;
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 3px;
    cursor: pointer;
    transition: all 0.15s ease;
}

.cam-btn:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.1);
}

.hud-center-hint {
    position: absolute;
    bottom: 96px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 16px;
    background: rgba(10, 15, 26, 0.72);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 5px 14px;
    border-radius: 20px;
    pointer-events: none;
    z-index: 10;
    backdrop-filter: blur(6px);
}

.hint-item {
    font-size: 11px;
    color: #94a3b8;
    display: flex;
    align-items: center;
    gap: 4px;
}

.hint-item kbd {
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    padding: 1px 4px;
    font-size: 10px;
    color: #f8fafc;
}

.takeoff-btn {
    position: absolute;
    bottom: 94px;
    right: 16px;
    background: linear-gradient(135deg, rgba(234, 88, 12, 0.85), rgba(249, 115, 22, 0.95));
    border: 1px solid rgba(251, 146, 60, 0.5);
    color: #ffffff;
    font-size: 11px;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(234, 88, 12, 0.35);
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
}

.takeoff-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(234, 88, 12, 0.5);
}

.takeoff-svg {
    flex-shrink: 0;
}
</style>
