<template>
    <!-- 🌟 SwarmStudio 1:1 官方级深色悬浮向导面板 (图片生成构型) -->
    <div v-if="visible" class="swarm-official-wizard" :style="panelStyle">
        <!-- 1. 顶部标题栏 (支持拖动) -->
        <div class="wizard-header" @mousedown="handleHeaderMouseDown">
            <span class="wizard-title">图片生成构型</span>
            <div class="wizard-window-actions" @mousedown.stop>
                <button class="win-btn" title="重置当前步骤参数" @click="handleResetCurrentStep">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                    </svg>
                </button>
                <button class="win-btn close" title="关闭向导" @click="closeWizard">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>
        </div>

        <!-- 2. 官方 1:1 步骤指示条 -->
        <div class="stepper-container">
            <!-- 步骤 1 -->
            <div class="step-col" :class="getStepClass(0)" @click="goToStep(0)">
                <div class="step-circle">
                    <span v-if="currentStep > 0">✓</span>
                    <span v-else>1</span>
                </div>
                <span class="step-name">生成预处理图</span>
            </div>

            <!-- 连接线 1 -> 2 -->
            <div class="step-connector" :class="{ 'line-done': currentStep >= 1 }"></div>

            <!-- 步骤 2 -->
            <div class="step-col" :class="getStepClass(1)" @click="currentStep >= 1 ? goToStep(1) : null">
                <div class="step-circle">
                    <span v-if="currentStep > 1">✓</span>
                    <span v-else>2</span>
                </div>
                <span class="step-name">生成中间图</span>
            </div>

            <!-- 连接线 2 -> 3 -->
            <div class="step-connector" :class="{ 'line-done': currentStep >= 2 }"></div>

            <!-- 步骤 3 -->
            <div class="step-col" :class="getStepClass(2)">
                <div class="step-circle">
                    <span>3</span>
                </div>
                <span class="step-name">生成构型</span>
            </div>
        </div>

        <!-- 3. 面板主体内容区域 -->
        <div class="wizard-body">
            <!-- ======================= 步骤一: 生成预处理图 ======================= -->
            <div v-show="currentStep === 0" class="step-pane">
                <div class="field-row">
                    <span class="field-label">识别范围 <span class="help-circle">?</span></span>
                    <div class="field-right-actions">
                        <span class="active-badge">自动 (推荐)</span>
                        <button class="link-action" @click="showManualRange = !showManualRange">手动调整 ›</button>
                    </div>
                </div>

                <!-- 手动调整弹窗/折叠 -->
                <div v-if="showManualRange" class="manual-range-box">
                    <span>拖动画面四周蓝框以微调识别范围</span>
                </div>

                <!-- 高级编辑卡片 -->
                <div class="card-accordion" @click="showAdvancedEdit = !showAdvancedEdit">
                    <div class="card-left">
                        <span class="card-title">高级编辑</span>
                        <span class="card-subtitle">原图调整、背景与颜色</span>
                    </div>
                    <span class="card-chevron" :class="{ rotated: showAdvancedEdit }">›</span>
                </div>

                <div v-show="showAdvancedEdit" class="card-dropdown-content">
                    <div class="slider-param-row">
                        <div class="param-label-row">
                            <span>对比度</span>
                            <span class="val">{{ preprocessOptions.contrast }}</span>
                        </div>
                        <input
                            type="range"
                            min="-100"
                            max="100"
                            v-model.number="preprocessOptions.contrast"
                            @input="triggerPreprocessDebounced"
                            class="official-range"
                        />
                    </div>
                    <div class="slider-param-row">
                        <div class="param-label-row">
                            <span>亮度</span>
                            <span class="val">{{ preprocessOptions.brightness }}</span>
                        </div>
                        <input
                            type="range"
                            min="-100"
                            max="100"
                            v-model.number="preprocessOptions.brightness"
                            @input="triggerPreprocessDebounced"
                            class="official-range"
                        />
                    </div>
                    <div class="toggle-row">
                        <span>反转明暗 (黑底白线)</span>
                        <input
                            type="checkbox"
                            v-model="preprocessOptions.invert"
                            @change="triggerPreprocess"
                            class="official-checkbox"
                        />
                    </div>
                    <div class="toggle-row">
                        <span>抠除白色背景 (转透明)</span>
                        <input
                            type="checkbox"
                            v-model="preprocessOptions.removeBg"
                            @change="triggerPreprocess"
                            class="official-checkbox"
                        />
                    </div>
                </div>

                <!-- 视口预览: 官方灰黑透明棋盘格 -->
                <div class="viewport-box checkerboard-canvas-box">
                    <canvas ref="previewCanvas1" class="preview-canvas"></canvas>
                </div>

                <!-- 底部操作按钮 -->
                <div class="wizard-footer">
                    <button class="btn-cancel" @click="closeWizard">取消</button>
                    <button class="btn-primary" @click="proceedToStep(1)">生成预处理图并继续</button>
                </div>
            </div>

            <!-- ======================= 步骤二: 生成中间图 ======================= -->
            <div v-show="currentStep === 1" class="step-pane">
                <div class="section-title">识别模式</div>

                <div class="pill-segmented-group">
                    <button
                        v-for="m in modeList"
                        :key="m.key"
                        class="pill-seg-item"
                        :class="{ active: intermediateOptions.mode === m.key }"
                        @click="handleSelectMode(m.key)"
                    >
                        {{ m.label }}
                    </button>
                </div>

                <!-- 官方核心独家算法曝光: 单线优化卡片 -->
                <div class="card-accordion" @click="intermediateOptions.singleLineOpt = !intermediateOptions.singleLineOpt; triggerIntermediate()">
                    <div class="card-left">
                        <span class="card-title">单线优化</span>
                        <span class="card-subtitle">合并邻近双线，再提取一条中线</span>
                    </div>
                    <div class="card-right-toggle" @click.stop>
                        <input
                            type="checkbox"
                            v-model="intermediateOptions.singleLineOpt"
                            @change="triggerIntermediate"
                            class="official-checkbox"
                        />
                    </div>
                </div>

                <!-- 对照切换栏与图例 -->
                <div class="compare-bar">
                    <div class="segmented-control">
                        <button
                            v-for="v in ['result', 'overlay', 'diff']"
                            :key="v"
                            class="seg-item"
                            :class="{ active: compareView === v }"
                            @click="compareView = v"
                        >
                            {{ v === 'result' ? '结果' : v === 'overlay' ? '叠加' : '差异' }}
                        </button>
                    </div>

                    <div class="legend-list">
                        <span class="legend-item"><i class="dot dot-gray"></i>输入</span>
                        <span class="legend-item"><i class="dot dot-cyan"></i>输出</span>
                        <span class="legend-item"><i class="dot dot-yellow"></i>重合</span>
                    </div>
                </div>

                <!-- 视口预览: 单线细化与对照叠加视窗 -->
                <div class="viewport-box checkerboard-canvas-box">
                    <canvas ref="previewCanvas2" class="preview-canvas"></canvas>
                </div>

                <!-- 底部操作按钮 -->
                <div class="wizard-footer">
                    <button class="btn-cancel" @click="closeWizard">取消</button>
                    <button class="btn-cancel" @click="goToStep(0)">上一步</button>
                    <button class="btn-primary" @click="proceedToStep(2)">生成中间图并继续</button>
                </div>
            </div>

            <!-- ======================= 步骤三: 生成构型 ======================= -->
            <div v-show="currentStep === 2" class="step-pane">
                <!-- 生成模式 -->
                <div class="form-row">
                    <span class="row-label">生成模式</span>
                    <div class="pill-segmented-group small">
                        <button
                            v-for="g in ['spacing', 'count', 'direct']"
                            :key="g"
                            class="pill-seg-item"
                            :class="{ active: motifOptions.generationMode === g }"
                            @click="handleSelectGenMode(g)"
                        >
                            {{ g === 'spacing' ? '按间距' : g === 'count' ? '按点数' : '识别点画布' }}
                        </button>
                    </div>
                </div>

                <!-- 布点策略 -->
                <div class="form-row">
                    <span class="row-label">布点策略 <span class="help-circle">?</span></span>
                    <div class="pill-segmented-group small">
                        <button
                            v-for="s in ['align', 'uniform', 'follow']"
                            :key="s"
                            class="pill-seg-item"
                            :class="{ active: motifOptions.strategy === s }"
                            @click="handleSelectStrategy(s)"
                        >
                            {{ s === 'align' ? '交叉对齐' : s === 'uniform' ? '间距均匀' : '像素跟随' }}
                        </button>
                    </div>
                </div>

                <!-- 交叉处容差卡片 -->
                <div class="card-accordion" @click="showTolerance = !showTolerance">
                    <div class="card-left">
                        <span class="card-title">交叉处容差</span>
                        <span class="card-subtitle">调整交叉位置的点位疏密</span>
                    </div>
                    <span class="card-chevron" :class="{ rotated: showTolerance }">›</span>
                </div>

                <!-- 点间距滑动条与数字输入 -->
                <div class="spacing-setting-row">
                    <span class="spacing-label">点间距</span>
                    <div class="spacing-slider-wrap">
                        <input
                            type="range"
                            min="0.8"
                            max="4.0"
                            step="0.1"
                            v-model.number="motifOptions.spacing"
                            @input="triggerMotifGenerateDebounced"
                            class="official-range blue-slider"
                        />
                    </div>
                    <div class="official-stepper-box">
                        <span class="stepper-val">{{ motifOptions.spacing.toFixed(1) }}</span>
                        <span class="stepper-unit">m</span>
                        <button class="step-arrow-btn" @click="adjustSpacing(-0.1)">—</button>
                        <button class="step-arrow-btn" @click="adjustSpacing(0.1)">+</button>
                    </div>
                </div>

                <!-- 关键统计状态条: 无人机数 473 | 尺寸 155 × 124.3 m -->
                <div class="stat-meta-bar">
                    <div class="stat-item">
                        <span class="stat-label">无人机数</span>
                        <span class="stat-value highlight">{{ calculatedDroneCount }}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">尺寸</span>
                        <span class="stat-value">{{ physicalWidthM.toFixed(0) }} × {{ physicalHeightM.toFixed(1) }} m</span>
                    </div>
                </div>

                <!-- 复选配置框 -->
                <div class="checkbox-inline-row">
                    <label class="custom-checkbox-label">
                        <input
                            type="checkbox"
                            v-model="motifOptions.showIntermediate"
                            @change="handleIntermediateCheckChange"
                            class="official-checkbox"
                        />
                        <span>显示中间图</span>
                    </label>
                    <label class="custom-checkbox-label">
                        <input
                            type="checkbox"
                            v-model="motifOptions.hideMaterialOnFinish"
                            class="official-checkbox"
                        />
                        <span>生成后隐藏素材</span>
                    </label>
                </div>

                <!-- 构型点阵翠绿发光预览视口 -->
                <div class="viewport-box dark-night-canvas-box">
                    <canvas ref="previewCanvas3" class="preview-canvas"></canvas>
                </div>

                <!-- 底部操作按钮 -->
                <div class="wizard-footer">
                    <button class="btn-cancel" @click="closeWizard">取消</button>
                    <button class="btn-cancel" @click="goToStep(1)">上一步</button>
                    <button class="btn-primary" @click="applyMotifToShow">确认生成点阵</button>
                </div>
            </div>
        </div>

        <!-- 窗口右下角尺寸调节把手装饰 /// -->
        <div class="resize-handle"></div>
    </div>
</template>

<script setup>
/**
 * ========================================================================
 * 官方 SwarmStudio 1:1 图片生成构型悬浮向导组件
 * ========================================================================
 */
import { ref, reactive, computed, nextTick, useTemplateRef } from 'vue';
import { ElMessage } from 'element-plus';
import { useImageProcessor } from '../composables/useImageProcessor';

const emit = defineEmits([
    'apply-agents',
    'update-canvas-material',
    'update-canvas-agents',
    'hide-canvas-material',
]);

const { preprocessImage, generateIntermediateImage, generateMotifFromIntermediate } = useImageProcessor();

// Canvas Refs
const canvas1Ref = useTemplateRef('previewCanvas1');
const canvas2Ref = useTemplateRef('previewCanvas2');
const canvas3Ref = useTemplateRef('previewCanvas3');

// 浮窗状态与位置
const visible = ref(false);
const currentStep = ref(0);
const panelPos = reactive({ x: window.innerWidth - 460, y: 65 });
const isDragging = ref(false);
let dragOffset = { x: 0, y: 0 };

const panelStyle = computed(() => ({
    left: `${Math.max(16, Math.min(window.innerWidth - 450, panelPos.x))}px`,
    top: `${Math.max(16, Math.min(window.innerHeight - 660, panelPos.y))}px`,
}));

// 折叠状态
const showManualRange = ref(false);
const showAdvancedEdit = ref(false);
const showTolerance = ref(false);
const compareView = ref('overlay');

// 步骤 1 参数
const preprocessOptions = reactive({
    contrast: 0,
    brightness: 0,
    invert: false,
    removeBg: true,
    bgColorHex: '#ffffff',
    bgTolerance: 20,
    maxWidth: 800,
});

// 步骤 2 模式列表与参数
const modeList = [
    { key: 'white', label: '白色' },
    { key: 'skeleton', label: '骨架' },
    { key: 'contour', label: '轮廓' },
    { key: 'dot', label: '圆点' },
    { key: 'polyline', label: '点连线' },
];

const intermediateOptions = reactive({
    mode: 'white',
    threshold: 128,
    singleLineOpt: true, // 🌟 默认开启单线优化 (合并邻近双线，再提取一条中线)
});

// 步骤 3 参数
const motifOptions = reactive({
    generationMode: 'spacing', // 'spacing' | 'count' | 'direct'
    strategy: 'align',         // 'align' | 'uniform' | 'follow'
    spacing: 1.6,              // 官方默认 1.6m (对标截图 473 架)
    targetCount: 500,
    canvasScale: 155,          // 默认物理宽度 155m
    showIntermediate: false,
    hideMaterialOnFinish: true,
    colorPalette: 'mono',
    monoColor: '#00ff88',      // 高光翠绿发光点
});

// 动态指标
const calculatedDroneCount = ref(473);
const physicalWidthM = ref(155.0);
const physicalHeightM = ref(124.3);
const generatedAgents = ref([]);

// 缓存数据
let sourceImage = null;
let currentPreprocessedCanvas = null;
let currentIntermediateData = null;

// 防抖
let debounceTimer = null;
function debounce(fn, delay = 60) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fn, delay);
}

function getStepClass(stepIdx) {
    if (currentStep.value > stepIdx) return 'step-completed';
    if (currentStep.value === stepIdx) return 'step-active';
    return 'step-upcoming';
}

/**
 * 外部呼起向导入口
 */
function openWizard(img, defaultScale = 200) {
    sourceImage = img;
    motifOptions.canvasScale = defaultScale || 200;
    currentStep.value = 0;
    visible.value = true;

    preprocessOptions.removeBg = true;
    preprocessOptions.invert = true;

    panelPos.x = window.innerWidth - 460;
    panelPos.y = 65;

    nextTick(() => {
        if (!sourceImage) return;
        currentPreprocessedCanvas = preprocessImage(sourceImage, preprocessOptions);
        drawCanvasToPreview(currentPreprocessedCanvas, canvas1Ref.value);
    });
}

function closeWizard() {
    visible.value = false;
    emit('hide-canvas-material');
}

function handleResetCurrentStep() {
    if (currentStep.value === 0) {
        preprocessOptions.contrast = 0;
        preprocessOptions.brightness = 0;
        preprocessOptions.invert = true;
        triggerPreprocess();
    } else if (currentStep.value === 1) {
        intermediateOptions.mode = 'white';
        intermediateOptions.singleLineOpt = true;
        triggerIntermediate();
    } else if (currentStep.value === 2) {
        motifOptions.spacing = 1.6;
        motifOptions.strategy = 'align';
        triggerMotifGenerate();
    }
}

// 头部拖拽
function handleHeaderMouseDown(e) {
    isDragging.value = true;
    dragOffset.x = e.clientX - panelPos.x;
    dragOffset.y = e.clientY - panelPos.y;

    const onMouseMove = (ev) => {
        if (!isDragging.value) return;
        panelPos.x = ev.clientX - dragOffset.x;
        panelPos.y = ev.clientY - dragOffset.y;
    };
    const onMouseUp = () => {
        isDragging.value = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
}

function goToStep(step) {
    currentStep.value = step;
    nextTick(() => {
        if (step === 0) triggerPreprocess();
        else if (step === 1) triggerIntermediate();
        else if (step === 2) triggerMotifGenerate();
    });
}

function proceedToStep(step) {
    goToStep(step);
}

/**
 * 步骤一: 执行预处理
 */
function triggerPreprocess() {
    if (!sourceImage) return;
    currentPreprocessedCanvas = preprocessImage(sourceImage, preprocessOptions);
    drawCanvasToPreview(currentPreprocessedCanvas, canvas1Ref.value);
    emit('update-canvas-material', currentPreprocessedCanvas, {
        width: physicalWidthM.value,
        height: physicalHeightM.value,
        type: 'preprocessed',
        name: '预处理图',
    });
}

function triggerPreprocessDebounced() {
    debounce(triggerPreprocess, 50);
}

/**
 * 步骤二: 生成中间图
 */
function triggerIntermediate() {
    if (!currentPreprocessedCanvas) triggerPreprocess();
    currentIntermediateData = generateIntermediateImage(
        currentPreprocessedCanvas,
        intermediateOptions.mode,
        {
            threshold: intermediateOptions.threshold,
            singleLineOptimization: intermediateOptions.singleLineOpt,
        }
    );
    drawCanvasToPreview(currentIntermediateData.canvas, canvas2Ref.value);
    emit('update-canvas-material', currentIntermediateData.canvas, {
        width: physicalWidthM.value,
        height: physicalHeightM.value,
        type: 'intermediate',
        name: '中间图',
    });
}

function handleSelectMode(modeKey) {
    intermediateOptions.mode = modeKey;
    triggerIntermediate();
}

/**
 * 步骤三: 构型布点生成
 */
function triggerMotifGenerate() {
    if (!currentIntermediateData) triggerIntermediate();

    const sampleSource = currentPreprocessedCanvas || sourceImage;
    const resultAgents = generateMotifFromIntermediate(
        currentIntermediateData,
        sampleSource,
        {
            generationMode: motifOptions.generationMode,
            strategy: motifOptions.strategy,
            spacing: motifOptions.spacing,
            canvasScale: motifOptions.canvasScale,
            applyOriginalColor: false,
            colorPalette: 'mono',
            monoColor: motifOptions.monoColor,
            minLength: 6,
            spurThreshold: 3,
        }
    );

    generatedAgents.value = resultAgents;
    calculatedDroneCount.value = resultAgents.length;
    physicalWidthM.value = motifOptions.canvasScale;
    physicalHeightM.value = Math.round(motifOptions.canvasScale * (currentIntermediateData.height / currentIntermediateData.width) * 10) / 10;

    drawAgentsToPreview(resultAgents, canvas3Ref.value);
    emit('update-canvas-agents', resultAgents);
}

function triggerMotifGenerateDebounced() {
    debounce(triggerMotifGenerate, 60);
}

function handleSelectGenMode(m) {
    motifOptions.generationMode = m;
    triggerMotifGenerate();
}

function handleSelectStrategy(s) {
    motifOptions.strategy = s;
    triggerMotifGenerate();
}

function adjustSpacing(delta) {
    const next = Math.round((motifOptions.spacing + delta) * 10) / 10;
    motifOptions.spacing = Math.max(0.6, Math.min(6.0, next));
    triggerMotifGenerate();
}

function handleIntermediateCheckChange() {
    if (motifOptions.showIntermediate && currentIntermediateData) {
        emit('update-canvas-material', currentIntermediateData.canvas, {
            width: physicalWidthM.value,
            height: physicalHeightM.value,
        });
    }
}

/**
 * 确认生成点阵并应用到主工程
 */
function applyMotifToShow() {
    if (generatedAgents.value.length === 0) {
        ElMessage.warning('当前点阵为空，请先调整参数生成！');
        return;
    }

    emit('apply-agents', {
        agents: generatedAgents.value,
        widthM: physicalWidthM.value,
        heightM: physicalHeightM.value,
        strategy: motifOptions.strategy,
        mode: intermediateOptions.mode,
    });

    if (motifOptions.hideMaterialOnFinish) {
        emit('hide-canvas-material');
    }

    visible.value = false;
    ElMessage.success(`成功生成 ${generatedAgents.value.length} 架无人机点阵构型！`);
}

/**
 * 缩略图视口绘制辅助函数
 */
function drawCanvasToPreview(sourceCanvas, targetCanvas) {
    if (!sourceCanvas || !targetCanvas) return;
    targetCanvas.width = 390;
    targetCanvas.height = 250;
    const ctx = targetCanvas.getContext('2d');
    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

    const scale = Math.min(targetCanvas.width / sourceCanvas.width, targetCanvas.height / sourceCanvas.height) * 0.94;
    const dw = sourceCanvas.width * scale;
    const dh = sourceCanvas.height * scale;
    const dx = (targetCanvas.width - dw) / 2;
    const dy = (targetCanvas.height - dh) / 2;

    ctx.drawImage(sourceCanvas, dx, dy, dw, dh);
}

function drawAgentsToPreview(agents, targetCanvas) {
    if (!targetCanvas) return;
    targetCanvas.width = 390;
    targetCanvas.height = 250;
    const ctx = targetCanvas.getContext('2d');
    ctx.fillStyle = '#181b20';
    ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);

    if (!agents || agents.length === 0) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    agents.forEach((p) => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    });

    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const scale = Math.min((targetCanvas.width - 32) / spanX, (targetCanvas.height - 32) / spanY);
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    const cx = targetCanvas.width / 2;
    const cy = targetCanvas.height / 2;

    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 4;

    agents.forEach((p) => {
        const sx = cx + (p.x - midX) * scale;
        const sy = cy - (p.y - midY) * scale;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.8, 0, Math.PI * 2);
        ctx.fill();
    });
}

defineExpose({
    openWizard,
    closeWizard,
});
</script>

<style scoped>
/* 🌟 1:1 复刻 SwarmStudio 工业深色质感弹窗 */
.swarm-official-wizard {
    position: fixed;
    width: 440px;
    background: #2b2f37;
    border: 1px solid #3c414d;
    border-radius: 8px;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.75), 0 0 1px rgba(255, 255, 255, 0.15);
    color: #e5e7eb;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
    font-size: 12px;
    z-index: 2000;
    user-select: none;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
}

/* 顶部标题栏 */
.wizard-header {
    height: 42px;
    padding: 0 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #383d47;
    cursor: move;
}

.wizard-title {
    font-size: 13px;
    font-weight: 500;
    color: #f3f4f6;
}

.wizard-window-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.win-btn {
    background: transparent;
    border: none;
    color: #9ca3af;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.win-btn:hover {
    color: #ffffff;
    background: #383d47;
}

.win-btn.close:hover {
    background: #ef4444;
    color: #ffffff;
}

/* 官方 1:1 步骤指示条 */
.stepper-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 24px;
    border-bottom: 1px solid #383d47;
}

.step-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    flex-shrink: 0;
}

.step-circle {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 600;
    transition: all 0.2s ease;
}

.step-name {
    font-size: 11px;
    transition: all 0.2s ease;
}

/* 步骤状态色彩 (1:1 对标截图 3、4、5) */
.step-upcoming .step-circle {
    background: #3c404b;
    color: #8c92a0;
}
.step-upcoming .step-name {
    color: #8c92a0;
}

.step-active .step-circle {
    background: #2f80ed;
    color: #ffffff;
}
.step-active .step-name {
    color: #2f80ed;
    font-weight: 500;
}

.step-completed .step-circle {
    background: #22c55e;
    color: #ffffff;
}
.step-completed .step-name {
    color: #22c55e;
    font-weight: 500;
}

.step-connector {
    flex: 1;
    height: 2px;
    background: #464c58;
    margin: 0 10px -16px 10px;
}

.step-connector.line-done {
    background: #2f80ed;
}

/* 面板主体 */
.wizard-body {
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
}

.step-pane {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

/* 字段行 */
.field-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.field-label {
    font-size: 12px;
    color: #e5e7eb;
}

.help-circle {
    display: inline-flex;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #404552;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: #9ca3af;
    margin-left: 2px;
}

.field-right-actions {
    display: flex;
    align-items: center;
    gap: 10px;
}

.active-badge {
    color: #f3f4f6;
    font-size: 12px;
}

.link-action {
    background: transparent;
    border: none;
    color: #2f80ed;
    font-size: 12px;
    cursor: pointer;
    padding: 0;
}

.manual-range-box {
    background: #24272f;
    border: 1px dashed #404552;
    border-radius: 6px;
    padding: 8px 12px;
    color: #9ca3af;
    font-size: 11px;
}

/* 官方深灰功能卡片 (高级编辑 / 单线优化 / 交叉处容差) */
.card-accordion {
    background: #343842;
    border: 1px solid #434854;
    border-radius: 6px;
    padding: 10px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    transition: background-color 0.2s, border-color 0.2s;
}

.card-accordion:hover {
    background: #3a3f4a;
    border-color: #505664;
}

.card-left {
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.card-title {
    font-size: 13px;
    font-weight: 500;
    color: #f3f4f6;
}

.card-subtitle {
    font-size: 11px;
    color: #8e94a3;
}

.card-chevron {
    color: #9ca3af;
    font-size: 14px;
    transition: transform 0.2s;
}

.card-chevron.rotated {
    transform: rotate(90deg);
}

.card-dropdown-content {
    background: #272a31;
    border: 1px solid #3c414d;
    border-radius: 6px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.slider-param-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.param-label-row {
    display: flex;
    justify-content: space-between;
    color: #cbd5e1;
    font-size: 11px;
}

.toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: #cbd5e1;
    font-size: 11px;
}

/* 官方胶囊式多选按钮组 */
.pill-segmented-group {
    display: flex;
    align-items: center;
    background: #24272f;
    border: 1px solid #3a3f4c;
    border-radius: 4px;
    padding: 2px;
    gap: 2px;
}

.pill-seg-item {
    flex: 1;
    height: 28px;
    background: transparent;
    border: none;
    border-radius: 3px;
    color: #9ca3af;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s ease;
}

.pill-seg-item:hover {
    color: #f3f4f6;
}

.pill-seg-item.active {
    background: #424754;
    color: #ffffff;
    font-weight: 500;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
}

.pill-segmented-group.small .pill-seg-item {
    height: 24px;
    font-size: 11px;
}

.section-title {
    font-size: 12px;
    color: #9da2af;
}

/* 步骤二对照条与图例 */
.compare-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.segmented-control {
    display: flex;
    background: #24272f;
    border: 1px solid #3a3f4c;
    border-radius: 4px;
    padding: 2px;
}

.seg-item {
    padding: 3px 10px;
    background: transparent;
    border: none;
    border-radius: 3px;
    color: #9ca3af;
    font-size: 11px;
    cursor: pointer;
}

.seg-item.active {
    background: #424754;
    color: #ffffff;
}

.legend-list {
    display: flex;
    align-items: center;
    gap: 10px;
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: #9ca3af;
}

.dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
}
.dot-gray { background: #8a909e; }
.dot-cyan { background: #38bdf8; }
.dot-yellow { background: #facc15; }

/* 视口预览盒子 */
.viewport-box {
    width: 100%;
    height: 250px;
    border-radius: 6px;
    border: 1px solid #3c414d;
    overflow: hidden;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* 官方深色透明棋盘格背景 */
.checkerboard-canvas-box {
    background-color: #22262e;
    background-image:
        linear-gradient(45deg, #282d37 25%, transparent 25%),
        linear-gradient(-45deg, #282d37 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #282d37 75%),
        linear-gradient(-45deg, transparent 75%, #282d37 75%);
    background-size: 16px 16px;
    background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
}

.dark-night-canvas-box {
    background: #181b20;
}

.preview-canvas {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

/* 步骤三表单行 */
.form-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.row-label {
    font-size: 12px;
    color: #e5e7eb;
}

/* 点间距滑动条与步进输入器 */
.spacing-setting-row {
    display: flex;
    align-items: center;
    gap: 12px;
}

.spacing-label {
    font-size: 12px;
    color: #e5e7eb;
    flex-shrink: 0;
}

.spacing-slider-wrap {
    flex: 1;
}

.official-stepper-box {
    display: flex;
    align-items: center;
    background: #24272f;
    border: 1px solid #3a3f4c;
    border-radius: 4px;
    padding: 2px 6px;
    gap: 4px;
    flex-shrink: 0;
}

.stepper-val {
    font-size: 13px;
    font-weight: 500;
    color: #f3f4f6;
    font-family: monospace;
    min-width: 24px;
    text-align: center;
}

.stepper-unit {
    font-size: 11px;
    color: #8c92a0;
}

.step-arrow-btn {
    background: transparent;
    border: none;
    color: #9ca3af;
    cursor: pointer;
    font-size: 12px;
    padding: 0 4px;
}

.step-arrow-btn:hover {
    color: #ffffff;
}

/* 关键统计条 */
.stat-meta-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 2px 0;
}

.stat-item {
    display: flex;
    align-items: baseline;
    gap: 8px;
}

.stat-label {
    font-size: 12px;
    color: #9da2af;
}

.stat-value {
    font-size: 13px;
    font-weight: 600;
    color: #e5e7eb;
    font-family: monospace;
}

.stat-value.highlight {
    font-size: 16px;
    color: #ffffff;
}

/* 复选配置行 */
.checkbox-inline-row {
    display: flex;
    align-items: center;
    gap: 20px;
}

.custom-checkbox-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #cbd5e1;
    cursor: pointer;
}

/* 原生控键样式 */
.official-checkbox {
    width: 14px;
    height: 14px;
    accent-color: #2f80ed;
    cursor: pointer;
}

.official-range {
    width: 100%;
    accent-color: #2f80ed;
    height: 4px;
    background: #383d47;
    border-radius: 2px;
    cursor: pointer;
}

/* 底部操作按钮 */
.wizard-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 4px;
}

.btn-cancel {
    height: 32px;
    padding: 0 16px;
    background: #3a3e48;
    border: 1px solid #4a505c;
    border-radius: 4px;
    color: #d1d5db;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.15s;
}

.btn-cancel:hover {
    background: #444955;
    color: #ffffff;
}

.btn-primary {
    height: 32px;
    padding: 0 18px;
    background: #2f80ed;
    border: none;
    border-radius: 4px;
    color: #ffffff;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
}

.btn-primary:hover {
    background: #3b8bf5;
}

/* 右下角拉手 */
.resize-handle {
    position: absolute;
    right: 4px;
    bottom: 4px;
    width: 10px;
    height: 10px;
    background: repeating-linear-gradient(
        -45deg,
        transparent,
        transparent 2px,
        #525866 2px,
        #525866 4px
    );
    cursor: nwse-resize;
}
</style>
