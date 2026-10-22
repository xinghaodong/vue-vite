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

        <!-- 视口右上角专业控制带 (CAD Top-Right Toolstrip，告别底部遮挡) -->
        <div class="hud-top-right">
            <!-- 粒径大小与清晰度调节栏 -->
            <div class="hud-dot-controls">
                <span class="ctrl-tip">点径:</span>
                <el-radio-group v-model="dotScale" size="small">
                    <el-radio-button :value="0.5">细 0.5x</el-radio-button>
                    <el-radio-button :value="0.8">标准 0.8x</el-radio-button>
                    <el-radio-button :value="1.2">粗 1.2x</el-radio-button>
                </el-radio-group>

                <el-switch
                    v-model="constantScreen"
                    active-text="恒定针尖(防糊)"
                    inactive-text="物理尺寸"
                    size="small"
                    style="margin-left: 8px;"
                />

                <el-switch
                    v-model="useGlow"
                    active-text="夜空辉光"
                    inactive-text="CAD极锐"
                    size="small"
                    style="margin-left: 8px;"
                />

                <el-switch
                    v-model="highlightDanger"
                    active-text="碰撞红标"
                    inactive-text="原机灯光"
                    size="small"
                    style="margin-left: 8px;"
                />
            </div>

            <!-- 画布底色选择控制区 (支持跟随主题、快捷工业预设与自由取色) -->
            <div class="hud-bg-select">
                <span class="ctrl-tip">画布底色:</span>
                <el-dropdown trigger="click" @command="handleBgCommand">
                    <span class="bg-picker-pill">
                        <span class="bg-color-swatch" :style="{ backgroundColor: effectiveBgColor }"></span>
                        <span class="bg-label">{{ bgModeLabel }}</span>
                    </span>
                    <template #dropdown>
                        <el-dropdown-menu>
                            <el-dropdown-item command="auto">
                                <span class="swatch-mini auto-swatch"></span>
                                跟随系统主题 ({{ isDark ? '暗黑' : '素白' }})
                            </el-dropdown-item>
                            <el-dropdown-item command="#080a10" divided>
                                <span class="swatch-mini" style="background: #080a10;"></span>
                                🌌 夜空极黑 (#080a10)
                            </el-dropdown-item>
                            <el-dropdown-item command="#1e293b">
                                <span class="swatch-mini" style="background: #1e293b;"></span>
                                📐 CAD 深灰 (#1e293b)
                            </el-dropdown-item>
                            <el-dropdown-item command="#ffffff">
                                <span class="swatch-mini" style="background: #ffffff; border: 1px solid #ccc;"></span>
                                📑 高雅素白 (#ffffff)
                            </el-dropdown-item>
                            <el-dropdown-item command="#f1f5f9">
                                <span class="swatch-mini" style="background: #f1f5f9; border: 1px solid #ccc;"></span>
                                🌫️ 工程浅灰 (#f1f5f9)
                            </el-dropdown-item>
                        </el-dropdown-menu>
                    </template>
                </el-dropdown>
                <el-color-picker
                    v-model="customBgColor"
                    size="small"
                    :predefine="['#080a10', '#1e293b', '#0f172a', '#ffffff', '#f1f5f9', '#e2e8f0']"
                    @change="onCustomColorPick"
                />
            </div>

            <span class="zoom-text">{{ Math.round(viewport.zoom * 100) }}%</span>
            <el-button size="small" type="primary" plain @click="resetCamera">
                视角复位
            </el-button>
        </div>

        <!-- 悬浮操作提示 -->
        <div class="hud-guide-hint">
            <span>💡 鼠标滚轮缩放 / 按住左键平移 / 选中点位实时调光 / 画布底色支持素白与暗黑一键切换</span>
        </div>
    </div>
</template>

<script setup>
/**
 * 2D 创意点阵编辑器组件 (使用 Vue 3.5 useTemplateRef)
 */
import { ref, computed, useTemplateRef, watch } from 'vue';
import { usePixiEditor } from '../composables/usePixiEditor';
import { useTheme } from '@/composables/useTheme';

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

// 获取全局系统黑白/暗黑主题状态
const { isDark } = useTheme();

// 粒径缩放比例、恒定屏幕尺寸、夜空微光与碰撞标红开关
const dotScale = ref(0.8);
const useGlow = ref(false);
const constantScreen = ref(true);
const highlightDanger = ref(true);

// 视口画布底色模式: 'auto' (跟随系统) | '#080a10' | '#ffffff' | 自定义 hex
const bgMode = ref('auto');
const customBgColor = ref(isDark.value ? '#080a10' : '#ffffff');

// 计算当前最终生效的画布底色
const effectiveBgColor = computed(() => {
    if (bgMode.value === 'auto') {
        return isDark.value ? '#080a10' : '#ffffff';
    }
    return customBgColor.value;
});

const bgModeLabel = computed(() => {
    if (bgMode.value === 'auto') return `自适应 (${isDark.value ? '暗黑' : '素白'})`;
    if (bgMode.value === '#080a10') return '夜空黑';
    if (bgMode.value === '#1e293b') return 'CAD深灰';
    if (bgMode.value === '#ffffff') return '素白';
    if (bgMode.value === '#f1f5f9') return '浅灰';
    return customBgColor.value;
});

function handleBgCommand(cmd) {
    bgMode.value = cmd;
    if (cmd !== 'auto') {
        customBgColor.value = cmd;
    }
}

function onCustomColorPick(val) {
    if (val) {
        bgMode.value = 'custom';
        customBgColor.value = val;
    }
}

// 🌟 Vue 3.5 原生专属 Hook: useTemplateRef 绑定模板中的 ref="pixiContainer"
const containerRef = useTemplateRef('pixiContainer');

// 挂载 Pixi 编辑器 Hook
const {
    viewport,
    cursorWorldPos,
    selectedDroneId,
    setCanvasBackgroundColor,
    renderDroneAgents,
    resetCamera,
} = usePixiEditor(containerRef, {
    initialBgColor: effectiveBgColor.value,
    onPointSelect: (agent) => emit('select-agent', agent),
});

// 响应底色变更（系统切换主题或用户手动选色）
watch(effectiveBgColor, (newColor) => {
    setCanvasBackgroundColor(newColor);
});

// 监听无人机点位、危险集合、点径缩放、恒定屏幕尺寸、辉光及碰撞标红变化，热重绘点阵
watch(
    [() => props.agents, () => props.dangerIds, dotScale, useGlow, constantScreen, highlightDanger],
    ([newAgents, dangerIds, scaleVal, glowVal, constScreen, dangerHigh]) => {
        if (newAgents && newAgents.length) {
            renderDroneAgents(newAgents, dangerIds, {
                dotScale: scaleVal,
                useGlow: glowVal,
                constantScreen: constScreen,
                highlightDanger: dangerHigh,
            });
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
    background-color: var(--el-bg-color-page);
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
    background-color: var(--el-color-success);
    box-shadow: 0 0 6px var(--el-color-success);
    animation: pulse 2s infinite;
}

.hud-coords {
    color: var(--el-text-color-secondary);
    font-size: 12px;
    font-family: var(--app-font-family-mono, monospace);
    background: var(--el-bg-color-overlay);
    border: 1px solid var(--el-border-color-lighter);
    padding: 2px 8px;
    border-radius: 4px;
    box-shadow: var(--el-box-shadow-light);
}

.hud-top-right {
    position: absolute;
    top: 14px;
    right: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--el-bg-color-overlay);
    border: 1px solid var(--el-border-color);
    padding: 5px 12px;
    border-radius: 6px;
    backdrop-filter: blur(8px);
    box-shadow: var(--el-box-shadow-light);
    z-index: 10;
}

.hud-dot-controls {
    display: flex;
    align-items: center;
    gap: 6px;
    border-right: 1px solid var(--el-border-color-lighter);
    padding-right: 10px;
    margin-right: 4px;
}

.hud-bg-select {
    display: flex;
    align-items: center;
    gap: 6px;
    border-right: 1px solid var(--el-border-color-lighter);
    padding-right: 10px;
    margin-right: 4px;
}

.bg-picker-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid var(--el-border-color);
    background: var(--el-fill-color-light);
    cursor: pointer;
    font-size: 11px;
    color: var(--el-text-color-primary);
    transition: all 0.2s ease;
}

.bg-picker-pill:hover {
    border-color: var(--el-color-primary);
}

.bg-color-swatch {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    border: 1px solid var(--el-border-color);
    box-shadow: 0 0 2px rgba(0, 0, 0, 0.15);
}

.swatch-mini {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 3px;
    margin-right: 8px;
    vertical-align: middle;
}

.auto-swatch {
    background: linear-gradient(135deg, #080a10 50%, #ffffff 50%);
    border: 1px solid var(--el-border-color);
}

.ctrl-tip {
    font-size: 11px;
    color: var(--el-text-color-secondary);
}

.zoom-text {
    font-size: 12px;
    font-family: var(--app-font-family-mono, monospace);
    color: var(--el-text-color-primary);
    font-weight: 600;
}

.hud-guide-hint {
    position: absolute;
    bottom: 14px;
    left: 14px;
    color: var(--el-text-color-placeholder);
    font-size: 12px;
    pointer-events: none;
}

.hud-danger-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--el-color-danger-light-9);
    border: 1px solid var(--el-color-danger-light-5);
    padding: 3px 10px;
    border-radius: 4px;
    color: var(--el-color-danger);
    font-size: 11px;
    font-weight: 600;
    backdrop-filter: blur(8px);
    pointer-events: auto;
}

.mini-relax-btn {
    background: var(--el-color-danger);
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
    background: var(--el-color-danger-dark-2);
}

.hud-safe-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--el-color-success-light-9);
    border: 1px solid var(--el-color-success-light-5);
    padding: 3px 10px;
    border-radius: 4px;
    color: var(--el-color-success);
    font-size: 11px;
    font-weight: 600;
    backdrop-filter: blur(8px);
}

@keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.85); }
}
</style>
