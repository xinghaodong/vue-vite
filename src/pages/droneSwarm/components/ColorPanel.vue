<template>
    <div class="color-panel">
        <!-- 目标点位状态信息条 -->
        <div class="target-info-card">
            <div class="info-row">
                <span class="info-label">调色目标</span>
                <span class="info-badge">{{ targetLabel }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">作用架数</span>
                <span class="info-count">{{ selectionCount }} 架</span>
            </div>
        </div>

        <!-- 调色模式分段切换 -->
        <div class="mode-switch-row">
            <el-segmented
                v-model="colorMode"
                :options="[
                    { label: '单色', value: 'single' },
                    { label: '渐变', value: 'gradient' },
                    { label: '随机', value: 'random' },
                ]"
                size="small"
                class="segmented-mode"
                @change="handleModeChange"
            />
        </div>

        <!-- 1. 单色上色模式 -->
        <div v-show="colorMode === 'single'" class="panel-section">
            <div class="section-title">
                <span class="title-tag">01</span>
                <span>LED 纯色通道</span>
            </div>

            <div class="color-picker-row">
                <span class="picker-label">机载 LED 颜色</span>
                <div class="picker-wrapper">
                    <el-color-picker
                        v-model="singleColor"
                        size="default"
                        :show-alpha="false"
                        @change="onSingleColorChange"
                    />
                    <span class="color-hex-text">{{ singleColor.toUpperCase() }}</span>
                </div>
            </div>

            <!-- 常用光谱预设色块 -->
            <div class="preset-colors-row">
                <div
                    v-for="c in presetColors"
                    :key="c"
                    class="color-chip"
                    :style="{ backgroundColor: c }"
                    :title="c"
                    @click="applyPresetColor(c)"
                ></div>
            </div>

            <el-button type="primary" size="small" class="apply-btn" @click="emitApplySingle">
                应用单色到目标点位
            </el-button>
        </div>

        <!-- 2. 渐变上色模式 (Direct-Manipulation Gradient Vector) -->
        <div v-show="colorMode === 'gradient'" class="panel-section">
            <div class="section-title">
                <span class="title-tag">02</span>
                <span>物理空间正交渐变</span>
            </div>

            <div class="gradient-tool-row">
                <el-button
                    size="small"
                    :type="canvasAxisActive ? 'success' : 'primary'"
                    :plain="!canvasAxisActive"
                    class="axis-toggle-btn"
                    @click="toggleCanvasAxis"
                >
                    {{ canvasAxisActive ? '✓ 画布渐变轴已激活' : '✏️ 开启画布交互渐变轴' }}
                </el-button>
            </div>

            <div class="param-row">
                <div class="param-label">
                    <span>渐变轴角度 (Angle)</span>
                    <span class="val">{{ axisAngle }}°</span>
                </div>
                <el-slider
                    v-model="axisAngle"
                    :min="0"
                    :max="360"
                    :step="1"
                    size="small"
                    @input="onAngleSliderChange"
                />
            </div>

            <div class="param-row inline-switch">
                <span class="inline-label">循环渐变 (Repeat)</span>
                <el-switch v-model="repeatGradient" size="small" @change="emitApplyGradient" />
            </div>

            <!-- 渐变色标列表 (Color Stops) -->
            <div class="stops-section">
                <div class="stops-header">
                    <span>色标分段 (Color Stops)</span>
                    <el-button size="small" text type="primary" @click="addStop">
                        + 添加色标
                    </el-button>
                </div>

                <div class="stops-preview-bar" :style="gradientPreviewStyle"></div>

                <div class="stops-list">
                    <div v-for="(stop, index) in gradientStops" :key="index" class="stop-item">
                        <el-color-picker
                            v-model="stop.color"
                            size="small"
                            :show-alpha="false"
                            @change="onStopsChange"
                        />
                        <el-slider
                            v-model="stop.offsetPercent"
                            :min="0"
                            :max="100"
                            size="small"
                            class="stop-slider"
                            @input="onStopOffsetInput"
                        />
                        <span class="stop-val">{{ stop.offsetPercent }}%</span>
                        <el-button
                            v-if="gradientStops.length > 2"
                            size="small"
                            text
                            type="danger"
                            class="stop-del"
                            @click="removeStop(index)"
                        >
                            ×
                        </el-button>
                    </div>
                </div>
            </div>

            <el-button type="primary" size="small" class="apply-btn" @click="emitApplyGradient">
                应用渐变到目标点位
            </el-button>
        </div>

        <!-- 3. 离散随机模式 -->
        <div v-show="colorMode === 'random'" class="panel-section">
            <div class="section-title">
                <span class="title-tag">03</span>
                <span>离散随机高频打散</span>
            </div>
            <div class="section-desc">
                在预设的夜空冷霓虹光谱中随机下放色彩，适合流星群、星云或欢腾气氛。
            </div>
            <el-button type="primary" size="small" class="apply-btn" @click="emitApplyRandom">
                🎲 随机打散着色
            </el-button>
        </div>

        <!-- 4. 机载 LED 物理光学防呆与色差预警卡片 (对标 SwarmStudio 视频 D) -->
        <div class="panel-section led-safety-card" :class="safetyReport.alertType">
            <div class="safety-header">
                <span class="safety-icon">🛡️</span>
                <span class="safety-title">实机 LED 发光物理学防呆</span>
            </div>

            <div class="dual-channel-row">
                <div class="channel-box">
                    <span class="ch-label">屏幕设计色</span>
                    <div class="ch-preview" :style="{ backgroundColor: singleColor }"></div>
                    <span class="ch-hex">{{ singleColor.toUpperCase() }}</span>
                </div>
                <div class="delta-arrow">
                    <span class="delta-label">ΔE 色差</span>
                    <span class="delta-val" :class="{ 'is-high': safetyReport.deltaE >= 12 }">
                        {{ safetyReport.deltaE }}
                    </span>
                </div>
                <div class="channel-box">
                    <span class="ch-label">机载 LED 仿真</span>
                    <div class="ch-preview" :style="{ backgroundColor: safetyReport.ledSimColor }"></div>
                    <span class="ch-hex">{{ safetyReport.ledSimColor.toUpperCase() }}</span>
                </div>
            </div>

            <div v-if="safetyReport.alertMessage" class="safety-warning-banner">
                <span class="warn-dot">!</span>
                <span>{{ safetyReport.alertMessage }}</span>
            </div>

            <div class="luminance-bar-row">
                <span class="lum-label">感知亮度: {{ safetyReport.luminance }}%</span>
                <div class="lum-bar">
                    <div
                        class="lum-fill"
                        :style="{ width: `${safetyReport.luminance}%` }"
                        :class="{ 'is-danger': safetyReport.luminance >= 90 }"
                    ></div>
                    <div class="lum-mark" style="left: 90%" title="90% 硬件保护安全红线"></div>
                </div>
            </div>
        </div>

        <!-- 5. 视觉防干扰机制 -->
        <div class="visual-unmask-row">
            <el-checkbox v-model="hideSelectionVisual" @change="onToggleHideSelection">
                上色时隐藏选中标识（仅视觉）
            </el-checkbox>
        </div>
    </div>
</template>

<script setup>
/**
 * 2D 编队上色与机载 LED 光学防呆面板
 */
import { ref, computed, watch } from 'vue';
import { analyzeLedSafety, defaultGradientStops } from '../composables/useLedSafety';

const props = defineProps({
    targetLabel: {
        type: String,
        default: '当前选中',
    },
    selectionCount: {
        type: Number,
        default: 0,
    },
    axisAngle: {
        type: Number,
        default: 90,
    },
    canvasAxisActive: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits([
    'apply-single',
    'apply-gradient',
    'apply-random',
    'toggle-canvas-axis',
    'angle-sync',
    'stops-change',
    'toggle-hide-selection',
]);

const colorMode = ref('single');
const singleColor = ref('#00f2fe');
const axisAngle = ref(props.axisAngle);
const repeatGradient = ref(false);
const hideSelectionVisual = ref(false);

const presetColors = [
    '#ffffff', // 冷白
    '#00f2fe', // 荧光青
    '#2dff6a', // 激光翠绿
    '#2454ff', // 纯正深蓝
    '#ff007f', // 霓虹粉紫
    '#ffe600', // 耀光亮黄
    '#ff5500', // 焰火暖橙
];

// 渐变色标列表 (offset 0~100)
const gradientStops = ref(
    defaultGradientStops.map((s) => ({
        color: s.color,
        offsetPercent: Math.round(s.offset * 100),
    }))
);

// 光学安全检测分析
const safetyReport = computed(() => {
    return analyzeLedSafety(singleColor.value);
});

// 渐变色标预览条 CSS
const gradientPreviewStyle = computed(() => {
    const stopsStr = gradientStops.value
        .slice()
        .sort((a, b) => a.offsetPercent - b.offsetPercent)
        .map((s) => `${s.color} ${s.offsetPercent}%`)
        .join(', ');
    return {
        background: `linear-gradient(to right, ${stopsStr})`,
    };
});

watch(
    () => props.axisAngle,
    (val) => {
        if (Number.isFinite(val)) axisAngle.value = val;
    }
);

function handleModeChange(val) {
    if (val === 'gradient' && !props.canvasAxisActive) {
        emit('toggle-canvas-axis', true);
    }
}

function onSingleColorChange(val) {
    if (val) emit('apply-single', val);
}

function applyPresetColor(c) {
    singleColor.value = c;
    emit('apply-single', c);
}

function emitApplySingle() {
    emit('apply-single', singleColor.value);
}

function toggleCanvasAxis() {
    emit('toggle-canvas-axis', !props.canvasAxisActive);
}

function onAngleSliderChange(deg) {
    emit('angle-sync', deg);
}

function onStopOffsetInput() {
    emitStops();
}

function onStopsChange() {
    emitStops();
}

function addStop() {
    const mid = gradientStops.value.length >= 2 ? 50 : 0;
    gradientStops.value.push({
        color: '#00f2fe',
        offsetPercent: mid,
    });
    emitStops();
}

function removeStop(index) {
    if (gradientStops.value.length > 2) {
        gradientStops.value.splice(index, 1);
        emitStops();
    }
}

function emitStops() {
    const stops = gradientStops.value.map((s) => ({
        offset: s.offsetPercent / 100,
        color: s.color,
    }));
    emit('stops-change', stops);
}

function emitApplyGradient() {
    const stops = gradientStops.value.map((s) => ({
        offset: s.offsetPercent / 100,
        color: s.color,
    }));
    emit('apply-gradient', {
        stops,
        angleDeg: axisAngle.value,
        repeat: repeatGradient.value,
    });
}

function emitApplyRandom() {
    emit('apply-random');
}

function onToggleHideSelection(val) {
    emit('toggle-hide-selection', Boolean(val));
}
</script>

<style scoped>
.color-panel {
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    color: var(--el-text-color-primary);
}

.target-info-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
}

.info-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.info-label {
    font-size: 11px;
    color: var(--el-text-color-secondary);
}

.info-badge {
    font-size: 11px;
    font-weight: 600;
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    padding: 2px 7px;
    border-radius: 4px;
}

.info-count {
    font-size: 13px;
    font-weight: 700;
}

.mode-switch-row :deep(.el-segmented) {
    width: 100%;
}

.panel-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: var(--el-bg-color-overlay);
    padding: 12px;
    border-radius: 8px;
    border: 1px solid var(--el-border-color-lighter);
}

.section-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
}

.title-tag {
    font-size: 10px;
    font-weight: 700;
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    padding: 1px 4px;
    border-radius: 3px;
}

.section-desc {
    font-size: 11px;
    color: var(--el-text-color-secondary);
    line-height: 1.4;
}

.color-picker-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.picker-label {
    font-size: 12px;
}

.picker-wrapper {
    display: flex;
    align-items: center;
    gap: 10px;
}

.color-hex-text {
    font-size: 12px;
    font-family: monospace;
    font-weight: 600;
}

.preset-colors-row {
    display: flex;
    gap: 8px;
    padding-top: 4px;
}

.color-chip {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.2);
    transition: transform 0.15s ease;
}

.color-chip:hover {
    transform: scale(1.15);
}

.gradient-tool-row {
    display: flex;
}

.axis-toggle-btn {
    width: 100%;
}

.param-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.param-label {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--el-text-color-secondary);
}

.inline-switch {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
}

.inline-label {
    font-size: 12px;
}

.stops-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.stops-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: var(--el-text-color-secondary);
}

.stops-preview-bar {
    height: 14px;
    border-radius: 4px;
    border: 1px solid var(--el-border-color-lighter);
}

.stops-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 160px;
    overflow-y: auto;
}

.stop-item {
    display: flex;
    align-items: center;
    gap: 8px;
}

.stop-slider {
    flex: 1;
}

.stop-val {
    font-size: 11px;
    font-family: monospace;
    width: 32px;
}

.stop-del {
    padding: 0 4px !important;
    font-weight: 700;
}

.apply-btn {
    width: 100%;
    margin-top: 4px;
}

/* LED 光学安全防呆卡片 */
.led-safety-card {
    background: var(--el-fill-color-light);
}

.led-safety-card.warning {
    border-color: var(--el-color-warning);
}

.led-safety-card.danger {
    border-color: var(--el-color-danger);
}

.safety-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
}

.dual-channel-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
}

.channel-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
}

.ch-label {
    font-size: 10px;
    color: var(--el-text-color-secondary);
}

.ch-preview {
    width: 36px;
    height: 36px;
    border-radius: 6px;
    border: 1px solid var(--el-border-color);
}

.ch-hex {
    font-size: 10px;
    font-family: monospace;
}

.delta-arrow {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
}

.delta-label {
    font-size: 10px;
    color: var(--el-text-color-secondary);
}

.delta-val {
    font-size: 14px;
    font-weight: 700;
    color: var(--el-color-success);
}

.delta-val.is-high {
    color: var(--el-color-warning);
}

.safety-warning-banner {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 6px 8px;
    background: var(--el-color-warning-light-9);
    border: 1px solid var(--el-color-warning-light-7);
    border-radius: 4px;
    font-size: 11px;
    color: var(--el-color-warning);
    line-height: 1.4;
}

.warn-dot {
    font-weight: 700;
    background: var(--el-color-warning);
    color: #ffffff;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 10px;
}

.luminance-bar-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.lum-label {
    font-size: 10px;
    color: var(--el-text-color-secondary);
}

.lum-bar {
    position: relative;
    height: 6px;
    background: var(--el-border-color-lighter);
    border-radius: 3px;
    overflow: hidden;
}

.lum-fill {
    height: 100%;
    background: var(--el-color-primary);
    transition: width 0.2s ease;
}

.lum-fill.is-danger {
    background: var(--el-color-warning);
}

.lum-mark {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--el-color-danger);
}

.visual-unmask-row {
    padding: 0 4px;
}
</style>
