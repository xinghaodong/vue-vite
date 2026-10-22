<template>
    <div class="editor-2d-viewport">
        <!-- Pixi.js 画布 DOM 挂载容器 -->
        <div ref="pixiContainer" class="pixi-canvas-container"></div>

        <!-- 极客 HUD 悬浮状态仪表盘 -->
        <div class="hud-top-left">
            <div class="hud-badge">
                <span class="status-dot"></span>
                <span>2D PIXI.JS RENDERER v8</span>
            </div>
            <div class="hud-coords">
                X: {{ cursorWorldPos.x.toFixed(1) }}m &nbsp;|&nbsp; Y: {{ cursorWorldPos.y.toFixed(1) }}m
            </div>

            <!-- 1.5m 防撞安全指示胶囊 -->
            <div v-if="dangerIds && dangerIds.size > 0" class="hud-danger-pill">
                <span class="danger-icon">⚠️</span>
                <span>检测到 {{ dangerIds.size }} 架间距 &lt; 1.5m 违规点位</span>
                <button class="mini-relax-btn" @click="emit('auto-relax')">一键平滑疏散</button>
            </div>
            <div v-else class="hud-safe-pill">
                <span class="safe-icon">🛡️</span>
                <span>1.5m 空间安全校验通过</span>
            </div>
        </div>

        <div class="hud-bottom-right">
            <span class="zoom-text">{{ Math.round(viewport.zoom * 100) }}%</span>
            <el-button size="small" type="primary" plain @click="resetCamera">
                视角复位
            </el-button>
        </div>

        <!-- 悬浮操作提示 -->
        <div class="hud-guide-hint">
            <span>💡 鼠标滚轮缩放 / 按住左键平移 / 选中点位实时调光 / 红色点位代表低于 1.5m 间距</span>
        </div>
    </div>
</template>

<script setup>
/**
 * 2D 创意点阵编辑器组件 (使用 Vue 3.5 useTemplateRef)
 */
import { useTemplateRef, watch } from 'vue';
import { usePixiEditor } from '../composables/usePixiEditor';

const props = defineProps({
    agents: {
        type: Array,
        default: () => [],
    },
    dangerIds: {
        type: Object, // Set<string|number>
        default: () => new Set(),
    },
});

const emit = defineEmits(['select-agent', 'auto-relax']);

// 🌟 Vue 3.5 原生专属 Hook: useTemplateRef 绑定模板中的 ref="pixiContainer"
const containerRef = useTemplateRef('pixiContainer');

// 挂载 Pixi 编辑器 Hook
const {
    viewport,
    cursorWorldPos,
    selectedDroneId,
    renderDroneAgents,
    resetCamera,
} = usePixiEditor(containerRef, {
    onPointSelect: (agent) => emit('select-agent', agent),
});

// 监听无人机点位或危险集合变化，热重绘点阵
watch(
    [() => props.agents, () => props.dangerIds],
    ([newAgents, dangerIds]) => {
        if (newAgents && newAgents.length) {
            renderDroneAgents(newAgents, dangerIds);
        }
    },
    { deep: true, immediate: true }
);

defineExpose({
    resetCamera,
});
</script>

<style scoped>
.editor-2d-viewport {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background-color: #080a10;
    user-select: none;
}

.pixi-canvas-container {
    width: 100%;
    height: 100%;
    cursor: crosshair;
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
    border: 1px solid rgba(0, 242, 254, 0.25);
    padding: 3px 10px;
    border-radius: 4px;
    color: #00f2fe;
    font-size: 11px;
    font-family: var(--app-font-family-mono, monospace);
    font-weight: 600;
    backdrop-filter: blur(8px);
}

.status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #00ff88;
    box-shadow: 0 0 6px #00ff88;
    animation: pulse 2s infinite;
}

.hud-coords {
    color: #94a3b8;
    font-size: 12px;
    font-family: var(--app-font-family-mono, monospace);
    background: rgba(15, 23, 42, 0.6);
    padding: 2px 8px;
    border-radius: 4px;
}

.hud-bottom-right {
    position: absolute;
    bottom: 14px;
    right: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(15, 23, 42, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 4px 10px;
    border-radius: 6px;
    backdrop-filter: blur(8px);
}

.zoom-text {
    font-size: 12px;
    font-family: var(--app-font-family-mono, monospace);
    color: #e2e8f0;
    font-weight: 600;
}

.hud-guide-hint {
    position: absolute;
    bottom: 14px;
    left: 14px;
    color: #64748b;
    font-size: 12px;
    pointer-events: none;
}

.hud-danger-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(239, 68, 68, 0.2);
    border: 1px solid rgba(239, 68, 68, 0.5);
    padding: 3px 10px;
    border-radius: 4px;
    color: #f87171;
    font-size: 11px;
    font-weight: 600;
    backdrop-filter: blur(8px);
    pointer-events: auto;
}

.mini-relax-btn {
    background: #ef4444;
    color: #ffffff;
    border: none;
    border-radius: 3px;
    padding: 2px 6px;
    font-size: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
}

.mini-relax-btn:hover {
    background: #dc2626;
}

.hud-safe-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(16, 185, 129, 0.15);
    border: 1px solid rgba(16, 185, 129, 0.3);
    padding: 3px 10px;
    border-radius: 4px;
    color: #34d399;
    font-size: 11px;
    font-weight: 600;
    backdrop-filter: blur(8px);
}

@keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.85); }
}
</style>
