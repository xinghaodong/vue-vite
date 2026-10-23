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
                实例化渲染 · BLOOM 辉光
            </div>
        </div>

        <div class="hud-center-hint">
            <span class="hint-item"><kbd>左键拖拽</kbd>旋转</span>
            <span class="hint-item"><kbd>滚轮</kbd>缩放</span>
            <span class="hint-item"><kbd>右键</kbd>平移</span>
        </div>
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

// 🌟 Vue 3.5 原生专属 Hook: useTemplateRef
const containerRef = useTemplateRef('threeContainer');

const { morphToPattern, createInstancedDrones } = useThreeStage(containerRef);

// 组件首次挂载就绪后，立即调度变轨飞入当前构型 (彻底解决切入 3D 构型丢失的 Bug)
onMounted(() => {
    nextTick(() => {
        if (props.agents && props.agents.length) {
            morphToPattern(props.agents, 1.5);
        }
    });
});

// 监听点阵或构型变化，触发平滑飞行动画过渡
watch(
    () => props.agents,
    (newAgents) => {
        if (newAgents && newAgents.length) {
            morphToPattern(newAgents, 2.0);
        }
    },
    { deep: true }
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

.hud-top-left {
    position: absolute;
    top: 12px;
    left: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    pointer-events: none;
    z-index: 2;
}

.hud-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 26px;
    padding: 0 9px;
    border-radius: 7px;
    border: 1px solid rgba(148, 163, 184, 0.26);
    background: rgba(15, 23, 42, 0.72);
    color: #67e8f9;
    font-size: 10px;
    font-family: var(--app-font-family-mono, monospace);
    font-weight: 700;
    letter-spacing: 0.55px;
    backdrop-filter: blur(12px);
    box-shadow: 0 10px 24px -18px #000000;
}

.status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--el-color-primary);
    box-shadow: 0 0 8px var(--el-color-primary);
}

.hud-sub {
    padding-left: 2px;
    color: #94a3b8;
    font-size: 10px;
    font-family: var(--app-font-family-mono, monospace);
}

.hud-center-hint {
    position: absolute;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 12px;
    height: 28px;
    padding: 0 12px;
    border-radius: 8px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    background: rgba(15, 23, 42, 0.62);
    color: #94a3b8;
    font-size: 10px;
    pointer-events: none;
    white-space: nowrap;
    backdrop-filter: blur(10px);
}

.hint-item {
    display: inline-flex;
    align-items: center;
    gap: 5px;
}

.hud-center-hint kbd {
    padding: 1px 5px;
    border-radius: 4px;
    border: 1px solid rgba(148, 163, 184, 0.25);
    background: rgba(148, 163, 184, 0.18);
    color: #cbd5e1;
    font-family: var(--app-font-family-mono, monospace);
    font-size: 9px;
}
</style>
