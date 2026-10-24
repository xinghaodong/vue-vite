<template>
    <div class="editor-2d-viewport">
        <!-- Pixi.js 画布 DOM 挂载容器 -->
        <div ref="pixiContainer" class="pixi-canvas-container"></div>

        <!-- 画布状态 HUD -->
        <div class="hud-top-left">
            <div class="hud-status-bar">
                <div class="hud-badge">
                    <span class="status-dot"></span>
                    <span>2D · PIXI v8</span>
                </div>
                <div class="hud-coords">
                    X {{ cursorWorldPos.x.toFixed(1) }}m · Y {{ cursorWorldPos.y.toFixed(1) }}m
                </div>
            </div>

            <div v-if="dangerIds && dangerIds.size > 0" class="hud-danger-pill">
                <span class="pill-icon">!</span>
                <span>{{ dangerIds.size }} 架间距 &lt; 1.5m</span>
                <button class="mini-relax-btn" @click="emit('auto-relax')">平滑疏散</button>
            </div>
            <div v-else class="hud-safe-pill">
                <span class="pill-icon pill-icon--safe">✓</span>
                <span>设计态间距校验通过</span>
            </div>
        </div>

        <!-- 2D 编辑工具带：选择 / 平移 / 圈选 / 撤销 / 图层归属 -->
        <div class="hud-edit-toolbar">
            <el-radio-group
                :model-value="toolMode"
                size="small"
                class="tool-mode-group"
                @update:model-value="setToolMode"
            >
                <el-radio-button value="select">选择</el-radio-button>
                <el-radio-button value="pan">平移</el-radio-button>
                <el-radio-button value="lasso">圈选</el-radio-button>
            </el-radio-group>

            <span class="edit-divider"></span>

            <el-button size="small" text class="edit-action-btn" :disabled="!canUndo" @click="emit('undo')">
                撤销
            </el-button>
            <el-button size="small" text class="edit-action-btn" :disabled="!canRedo" @click="emit('redo')">
                重做
            </el-button>

            <span class="edit-divider"></span>

            <span class="selection-count">{{ selectedCount }} 已选</span>
            <el-button
                size="small"
                text
                class="edit-action-btn"
                :disabled="selectedCount === 0"
                @click="assignSelectedToLayer"
            >
                移入当前图层
            </el-button>
            <el-button
                size="small"
                text
                class="edit-action-btn edit-action-btn--danger"
                :disabled="selectedCount === 0"
                @click="deleteSelected"
            >
                删除
            </el-button>
        </div>

        <!-- 画布控制带 -->
        <div class="hud-top-right">
            <div class="hud-toolbar">
                <div class="hud-group">
                    <span class="ctrl-label">点径</span>
                    <el-radio-group v-model="dotScale" size="small" class="dot-size-group">
                        <el-radio-button :value="0.5">细</el-radio-button>
                        <el-radio-button :value="0.8">标准</el-radio-button>
                        <el-radio-button :value="1.2">粗</el-radio-button>
                    </el-radio-group>
                </div>

                <span class="hud-divider"></span>

                <div class="hud-group hud-toggles">
                    <el-tooltip content="点径不随画布缩放变化，保持屏幕针尖尺寸" placement="bottom" :show-after="300">
                        <label class="toggle-chip" :class="{ 'is-off': !constantScreen }">
                            <el-switch v-model="constantScreen" size="small" />
                            <span>针尖</span>
                        </label>
                    </el-tooltip>
                    <el-tooltip content="为点位叠加柔和的霓虹微光" placement="bottom" :show-after="300">
                        <label class="toggle-chip" :class="{ 'is-off': !useGlow }">
                            <el-switch v-model="useGlow" size="small" />
                            <span>辉光</span>
                        </label>
                    </el-tooltip>
                    <el-tooltip content="将间距不足的点位标记为高亮红色" placement="bottom" :show-after="300">
                        <label class="toggle-chip" :class="{ 'is-off': !highlightDanger }">
                            <el-switch v-model="highlightDanger" size="small" />
                            <span>红标</span>
                        </label>
                    </el-tooltip>
                </div>
            </div>

            <div class="hud-toolbar hud-toolbar--secondary">
                <div class="hud-group">
                    <span class="ctrl-label">画布</span>
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
                                    夜空极黑 (#080a10)
                                </el-dropdown-item>
                                <el-dropdown-item command="#1e293b">
                                    <span class="swatch-mini" style="background: #1e293b;"></span>
                                    CAD 深灰 (#1e293b)
                                </el-dropdown-item>
                                <el-dropdown-item command="#ffffff">
                                    <span class="swatch-mini" style="background: #ffffff; border: 1px solid #ccc;"></span>
                                    高雅素白 (#ffffff)
                                </el-dropdown-item>
                                <el-dropdown-item command="#f1f5f9">
                                    <span class="swatch-mini" style="background: #f1f5f9; border: 1px solid #ccc;"></span>
                                    工程浅灰 (#f1f5f9)
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
                <span class="hud-divider"></span>
                <span class="zoom-text">{{ Math.round(viewport.zoom * 100) }}%</span>
                <el-button size="small" class="reset-btn" @click="resetCamera">复位</el-button>
            </div>
        </div>

        <!-- 悬浮操作提示 -->
        <div class="hud-guide-hint">
            <span class="hint-item"><kbd>左键框选</kbd>选择</span>
            <span class="hint-item"><kbd>拖点</kbd>移动</span>
            <span class="hint-item"><kbd>Shift</kbd>加选</span>
            <span class="hint-item"><kbd>空格/中键</kbd>平移</span>
            <span class="hint-item"><kbd>Ctrl+Z</kbd>撤销</span>
        </div>
    </div>
</template>

<script setup>
/**
 * 2D 创意点阵编辑器组件 (使用 Vue 3.5 useTemplateRef)
 */
import { ref, computed, useTemplateRef, watch, onMounted, onBeforeUnmount } from 'vue';
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
    lockedLayerIds: {
        type: Array,
        default: () => [],
    },
    canUndo: {
        type: Boolean,
        default: false,
    },
    canRedo: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits([
    'select-agent',
    'auto-relax',
    'move-agents',
    'nudge-agents',
    'delete-agents',
    'assign-layer',
    'undo',
    'redo',
    'lasso-complete',
    'gradient-axis-change',
    'gradient-axis-commit',
]);

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
    isReady,
    toolMode,
    selectedIds,
    setToolMode,
    clearSelection,
    selectAll,
    setSelection,
    setGradientAxis,
    clearGradientAxis,
    setHideSelectionVisual,
    cursorWorldPos,
    selectedDroneId,
    lassoPath,
    setCanvasBackgroundColor,
    renderDroneAgents,
    resetCamera,
} = usePixiEditor(containerRef, {
    initialBgColor: effectiveBgColor.value,
    onPointSelect: (agent) => emit('select-agent', agent),
    onMoveCommit: (updates) => emit('move-agents', updates),
    onLassoComplete: (ids) => emit('lasso-complete', ids),
    onGradientAxisChange: (axis) => emit('gradient-axis-change', axis),
    onGradientAxisCommit: (axis) => emit('gradient-axis-commit', axis),
});

const selectedCount = computed(() => selectedIds.value.size);

function assignSelectedToLayer() {
    if (selectedIds.value.size === 0) return;
    emit('assign-layer', [...selectedIds.value]);
}

function deleteSelected() {
    if (selectedIds.value.size === 0) return;
    emit('delete-agents', [...selectedIds.value]);
    clearSelection();
}

function isTypingTarget(target) {
    if (!target) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function handleKeyboard(e) {
    if (isTypingTarget(e.target)) return;
    const modifier = e.ctrlKey || e.metaKey;
    const key = String(e.key || '').toLowerCase();

    if (modifier && key === 'z') {
        e.preventDefault();
        emit(e.shiftKey ? 'redo' : 'undo');
        return;
    }
    if (modifier && key === 'y') {
        e.preventDefault();
        emit('redo');
        return;
    }
    if (modifier && key === 'a') {
        e.preventDefault();
        selectAll();
        return;
    }
    if (e.key === 'Escape') {
        clearSelection();
        return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.value.size > 0) {
            e.preventDefault();
            deleteSelected();
        }
        return;
    }

    const step = e.shiftKey ? 10 : 1;
    const directions = {
        ArrowLeft: { dx: -step, dy: 0 },
        ArrowRight: { dx: step, dy: 0 },
        ArrowUp: { dx: 0, dy: step },
        ArrowDown: { dx: 0, dy: -step },
    };
    if (directions[e.key] && selectedIds.value.size > 0) {
        e.preventDefault();
        emit('nudge-agents', { ids: [...selectedIds.value], ...directions[e.key] });
    }
}

onMounted(() => window.addEventListener('keydown', handleKeyboard));
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeyboard));

// 响应底色变更（系统切换主题或用户手动选色）
watch(effectiveBgColor, (newColor) => {
    setCanvasBackgroundColor(newColor);
});

// 监听无人机点位、危险集合、点径缩放、恒定屏幕尺寸、辉光及碰撞标红变化，热重绘点阵
watch(
    [
        () => props.agents,
        () => props.dangerIds,
        () => props.lockedLayerIds,
        dotScale,
        useGlow,
        constantScreen,
        highlightDanger,
        isReady,
    ],
    ([newAgents, dangerIds, lockedIds, scaleVal, glowVal, constScreen, dangerHigh, ready]) => {
        if (ready && Array.isArray(newAgents)) {
            renderDroneAgents(newAgents, dangerIds, {
                dotScale: scaleVal,
                useGlow: glowVal,
                constantScreen: constScreen,
                highlightDanger: dangerHigh,
                lockedIds: new Set(lockedIds),
            });
        }
    },
    { deep: true, immediate: true }
);

defineExpose({
    resetCamera,
    clearSelection,
    selectAll,
    setSelection,
    setToolMode,
    setGradientAxis,
    clearGradientAxis,
    setHideSelectionVisual,
    selectedIds,
    lassoPath,
});
</script>

<style scoped>
.editor-2d-viewport {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #080a10;
    user-select: none;
}

.pixi-canvas-container {
    width: 100%;
    height: 100%;
    cursor: crosshair;
}

.hud-top-left {
    position: absolute;
    top: 12px;
    left: 12px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    max-width: 52%;
    pointer-events: none;
}

.hud-edit-toolbar {
    position: absolute;
    bottom: 12px;
    left: 50%;
    z-index: 6;
    display: flex;
    align-items: center;
    gap: 3px;
    height: 34px;
    padding: 0 8px;
    border-radius: 9px;
    border: 1px solid rgba(148, 163, 184, 0.24);
    background: rgba(15, 23, 42, 0.82);
    box-shadow: 0 12px 28px -18px #000000;
    backdrop-filter: blur(12px);
    transform: translateX(-50%);
    white-space: nowrap;
}

.edit-divider {
    width: 1px;
    height: 16px;
    margin: 0 4px;
    background: rgba(148, 163, 184, 0.24);
}

.selection-count {
    min-width: 48px;
    padding: 0 4px;
    color: #67e8f9;
    font-family: var(--app-font-family-mono, monospace);
    font-size: 10px;
    font-weight: 600;
    text-align: center;
}

.edit-action-btn {
    height: 24px;
    padding: 0 6px;
    color: #cbd5e1;
    font-size: 11px;
}

.edit-action-btn:hover:not(.is-disabled) {
    background: rgba(148, 163, 184, 0.16);
    color: #ffffff;
}

.edit-action-btn--danger:hover:not(.is-disabled) {
    color: #fca5a5;
}

.tool-mode-group :deep(.el-radio-button__inner) {
    height: 24px;
    padding: 0 9px;
    border-color: rgba(148, 163, 184, 0.2);
    background: rgba(148, 163, 184, 0.1);
    color: #cbd5e1;
    font-size: 11px;
    line-height: 22px;
    box-shadow: none;
}

.tool-mode-group :deep(.el-radio-button:first-child .el-radio-button__inner) {
    border-radius: 5px 0 0 5px;
}

.tool-mode-group :deep(.el-radio-button:last-child .el-radio-button__inner) {
    border-radius: 0 5px 5px 0;
}

.tool-mode-group :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
    background: var(--el-color-primary);
    border-color: var(--el-color-primary);
    color: #ffffff;
}

.hud-status-bar {
    display: flex;
    align-items: center;
    gap: 8px;
}

.hud-badge,
.hud-coords {
    display: inline-flex;
    align-items: center;
    height: 26px;
    padding: 0 9px;
    border-radius: 7px;
    border: 1px solid rgba(148, 163, 184, 0.26);
    background: rgba(15, 23, 42, 0.72);
    backdrop-filter: blur(12px);
    box-shadow: 0 10px 24px -18px #000000;
}

.hud-badge {
    gap: 6px;
    color: #67e8f9;
    font-family: var(--app-font-family-mono, monospace);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.55px;
    white-space: nowrap;
}

.status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #34d399;
    box-shadow: 0 0 8px #34d399;
    animation: pulse 2s infinite;
}

.hud-coords {
    color: #cbd5e1;
    font-family: var(--app-font-family-mono, monospace);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}

.hud-danger-pill,
.hud-safe-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 28px;
    padding: 0 6px 0 9px;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    backdrop-filter: blur(12px);
    box-shadow: 0 10px 24px -18px #000000;
}

.hud-danger-pill {
    color: #fecaca;
    background: rgba(127, 29, 29, 0.66);
    border: 1px solid rgba(248, 113, 113, 0.42);
    pointer-events: auto;
}

.hud-safe-pill {
    padding-right: 10px;
    color: #a7f3d0;
    background: rgba(6, 78, 59, 0.62);
    border: 1px solid rgba(52, 211, 153, 0.38);
}

.pill-icon {
    width: 15px;
    height: 15px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(248, 113, 113, 0.92);
    color: #450a0a;
    font-size: 10px;
    font-weight: 800;
    line-height: 1;
}

.pill-icon--safe {
    background: rgba(52, 211, 153, 0.92);
    color: #022c22;
}

.mini-relax-btn {
    height: 20px;
    padding: 0 8px;
    border: none;
    border-radius: 5px;
    background: var(--el-color-danger);
    color: #ffffff;
    font-size: 10px;
    font-weight: 700;
    cursor: pointer;
    transition: filter 0.2s ease;
}

.mini-relax-btn:hover {
    filter: brightness(1.12);
}

.hud-top-right {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    max-width: calc(100% - 24px);
}

.hud-toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 7px;
    border-radius: 8px;
    border: 1px solid rgba(148, 163, 184, 0.24);
    background: rgba(15, 23, 42, 0.78);
    backdrop-filter: blur(12px);
    box-shadow: 0 12px 28px -20px #000000;
}

.hud-toolbar--secondary {
    padding: 4px 7px;
}

.hud-group {
    display: flex;
    align-items: center;
    gap: 6px;
}

.ctrl-label {
    font-size: 10px;
    letter-spacing: 0.3px;
    color: #94a3b8;
    white-space: nowrap;
}

.hud-divider {
    width: 1px;
    height: 16px;
    flex-shrink: 0;
    background: rgba(148, 163, 184, 0.22);
}

.dot-size-group :deep(.el-radio-button__inner) {
    height: 24px;
    line-height: 22px;
    padding: 0 9px;
    border-color: rgba(148, 163, 184, 0.2);
    background: rgba(148, 163, 184, 0.1);
    color: #cbd5e1;
    font-size: 11px;
    box-shadow: none;
}

.dot-size-group :deep(.el-radio-button:first-child .el-radio-button__inner) {
    border-radius: 5px 0 0 5px;
}

.dot-size-group :deep(.el-radio-button:last-child .el-radio-button__inner) {
    border-radius: 0 5px 5px 0;
}

.dot-size-group :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
    background: var(--el-color-primary);
    border-color: var(--el-color-primary);
    color: #ffffff;
    box-shadow: 0 4px 10px -6px var(--el-color-primary);
}

.hud-toggles {
    gap: 10px;
}

.toggle-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: #cbd5e1;
    font-size: 11px;
    white-space: nowrap;
    cursor: pointer;
    transition: color 0.2s ease;
}

.toggle-chip.is-off {
    color: #64748b;
}

.bg-picker-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 24px;
    padding: 0 7px;
    border-radius: 6px;
    border: 1px solid rgba(148, 163, 184, 0.2);
    background: rgba(148, 163, 184, 0.1);
    color: #e2e8f0;
    font-size: 11px;
    white-space: nowrap;
    cursor: pointer;
    transition: background-color 0.2s ease, border-color 0.2s ease;
}

.bg-picker-pill:hover {
    border-color: rgba(103, 232, 249, 0.55);
    background: rgba(148, 163, 184, 0.16);
}

.hud-toolbar :deep(.el-color-picker__trigger) {
    width: 24px;
    height: 24px;
    padding: 2px;
    border-radius: 5px;
    border-color: rgba(148, 163, 184, 0.22);
    background: rgba(148, 163, 184, 0.1);
}

.hud-toolbar :deep(.el-color-picker__color) {
    border: none;
    border-radius: 3px;
}

.bg-color-swatch {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    border: 1px solid rgba(255, 255, 255, 0.35);
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.2);
}

.swatch-mini {
    display: inline-block;
    width: 12px;
    height: 12px;
    margin-right: 8px;
    border-radius: 3px;
    vertical-align: middle;
}

.auto-swatch {
    background: linear-gradient(135deg, #080a10 50%, #ffffff 50%);
    border: 1px solid var(--el-border-color);
}

.zoom-text {
    min-width: 36px;
    color: #67e8f9;
    font-family: var(--app-font-family-mono, monospace);
    font-size: 11px;
    font-weight: 600;
    text-align: right;
}

.reset-btn {
    height: 24px;
    padding: 0 8px;
    border-radius: 6px;
    border-color: rgba(148, 163, 184, 0.22);
    background: rgba(148, 163, 184, 0.12);
    color: #e2e8f0;
    font-size: 11px;
}

.reset-btn:hover {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary);
    color: #ffffff;
}

.hud-guide-hint {
    position: absolute;
    bottom: 12px;
    left: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    height: 26px;
    padding: 0 9px;
    border-radius: 7px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    background: rgba(15, 23, 42, 0.62);
    color: #94a3b8;
    font-size: 10px;
    backdrop-filter: blur(10px);
    pointer-events: none;
}

.hint-item {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    white-space: nowrap;
}

.hud-guide-hint kbd {
    padding: 1px 5px;
    border-radius: 4px;
    border: 1px solid rgba(148, 163, 184, 0.25);
    background: rgba(148, 163, 184, 0.18);
    color: #cbd5e1;
    font-family: var(--app-font-family-mono, monospace);
    font-size: 9px;
}

@keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.85); }
}

@media (max-width: 900px) {
    .hud-toolbar {
        flex-wrap: wrap;
        justify-content: flex-end;
    }

    .hud-guide-hint {
        display: none;
    }
}

@media (max-width: 1100px) {
    .hud-guide-hint {
        display: none;
    }

    .hud-edit-toolbar {
        max-width: calc(100% - 24px);
        overflow-x: auto;
    }
}
</style>
