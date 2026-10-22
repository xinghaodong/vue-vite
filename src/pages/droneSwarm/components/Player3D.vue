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
    background-color: var(--el-bg-color-page);
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
    background: var(--el-bg-color-overlay);
    border: 1px solid var(--el-border-color);
    padding: 3px 10px;
    border-radius: 4px;
    color: var(--el-color-primary);
    font-size: 11px;
    font-family: var(--app-font-family-mono, monospace);
    font-weight: 600;
    backdrop-filter: blur(8px);
    box-shadow: var(--el-box-shadow-light);
}

.status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: var(--el-color-primary);
    box-shadow: 0 0 8px var(--el-color-primary);
}

.hud-sub {
    color: var(--el-text-color-secondary);
    font-size: 11px;
    font-family: var(--app-font-family-mono, monospace);
}

.hud-center-hint {
    position: absolute;
    bottom: 14px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--el-bg-color-overlay);
    border: 1px solid var(--el-border-color);
    padding: 5px 14px;
    border-radius: 20px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
    pointer-events: none;
    backdrop-filter: blur(8px);
    box-shadow: var(--el-box-shadow-light);
}
</style>
