<template>
    <div class="player-3d-viewport">
        <!-- Three.js 画布 DOM 挂载容器 -->
        <div ref="threeContainer" class="three-canvas-container"></div>

        <!-- 3D 舞台 HUD 状态 -->
        <div class="hud-top-left">
            <div class="hud-badge">
                <span class="status-dot"></span>
                <span>3D THREE.JS INSTANCED MESH (1 DRAW CALL)</span>
            </div>
            <div class="hud-sub">
                BLOOM POST-PROCESSING: ACTIVE
            </div>
        </div>

        <div class="hud-center-hint">
            <span>🌌 按住左键 360° 旋转视角 / 滚轮缩放 / 右键平移</span>
        </div>
    </div>
</template>

<script setup>
/**
 * 3D 夜空发光无人机集群表演播放器组件 (使用 Vue 3.5 useTemplateRef)
 */
import { useTemplateRef, watch } from 'vue';
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

// 监听点阵或构型变化，触发平滑飞行动画过渡
watch(
    () => props.agents,
    (newAgents) => {
        if (newAgents && newAgents.length) {
            morphToPattern(newAgents, 2.2);
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
    background-color: #06080e;
    user-select: none;
}

.three-canvas-container {
    width: 100%;
    height: 100%;
}

.hud-top-left {
    position: absolute;
    top: 14px;
    left: 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    pointer-events: none;
}

.hud-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(15, 23, 42, 0.75);
    border: 1px solid rgba(168, 85, 247, 0.3);
    padding: 3px 10px;
    border-radius: 4px;
    color: #c084fc;
    font-size: 11px;
    font-family: var(--app-font-family-mono, monospace);
    font-weight: 600;
    backdrop-filter: blur(8px);
}

.status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #a855f7;
    box-shadow: 0 0 8px #a855f7;
}

.hud-sub {
    color: #64748b;
    font-size: 11px;
    font-family: var(--app-font-family-mono, monospace);
}

.hud-center-hint {
    position: absolute;
    bottom: 14px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(15, 23, 42, 0.65);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 5px 14px;
    border-radius: 20px;
    color: #94a3b8;
    font-size: 12px;
    pointer-events: none;
    backdrop-filter: blur(8px);
}
</style>
