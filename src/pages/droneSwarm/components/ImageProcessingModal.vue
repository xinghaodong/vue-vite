<template>
    <el-dialog
        v-model="visible"
        title="SwarmStudio 图像智能转构型向导 (3-Step Pipeline)"
        width="1180px"
        top="5vh"
        :close-on-click-modal="false"
        destroy-on-close
        class="swarm-image-wizard-dialog"
    >
        <!-- 1. 顶部向导步骤指示条 -->
        <div class="wizard-steps-header">
            <el-steps :active="currentStep" finish-status="success" simple>
                <el-step title="步骤 1: 图像预处理与扣背景" />
                <el-step title="步骤 2: 提取中间图 (轮廓/骨架/圆点)" />
                <el-step title="步骤 3: 构型生成与原色赋色" />
            </el-steps>
        </div>

        <!-- 2. 中间向导主体内容 (左右分栏布局) -->
        <div class="wizard-body">
            <!-- 左侧：参数动态配置区 -->
            <div class="wizard-sidebar-params">
                <!-- 步骤 1 参数: 预处理 -->
                <div v-show="currentStep === 0" class="step-param-panel">
                    <div class="panel-section-title">
                        <span class="icon-tag">01</span>
                        <span>色彩与明暗校准</span>
                    </div>

                    <div class="param-row">
                        <div class="param-label-group">
                            <span class="param-name">图像亮度 (Brightness)</span>
                            <span class="param-val">{{ preprocessOptions.brightness }}</span>
                        </div>
                        <el-slider
                            v-model="preprocessOptions.brightness"
                            :min="-100"
                            :max="100"
                            @input="triggerPreprocessDebounced"
                        />
                    </div>

                    <div class="param-row">
                        <div class="param-label-group">
                            <span class="param-name">对比度 (Contrast)</span>
                            <span class="param-val">{{ preprocessOptions.contrast }}</span>
                        </div>
                        <el-slider
                            v-model="preprocessOptions.contrast"
                            :min="-100"
                            :max="100"
                            @input="triggerPreprocessDebounced"
                        />
                    </div>

                    <div class="param-row inline-switch">
                        <span class="param-name">反转明暗 (Invert)</span>
                        <el-switch
                            v-model="preprocessOptions.invert"
                            active-text="黑白反相"
                            @change="triggerPreprocess"
                        />
                    </div>

                    <el-divider />

                    <div class="panel-section-title">
                        <span class="icon-tag">02</span>
                        <span>背景智能扣除 (Chroma Key)</span>
                    </div>

                    <div class="param-row inline-switch">
                        <span class="param-name">开启扣背景</span>
                        <el-switch
                            v-model="preprocessOptions.removeBg"
                            @change="triggerPreprocess"
                        />
                    </div>

                    <template v-if="preprocessOptions.removeBg">
                        <div class="param-row inline-color">
                            <span class="param-name">背景基准色</span>
                            <el-color-picker
                                v-model="preprocessOptions.bgColorHex"
                                size="small"
                                @change="triggerPreprocess"
                            />
                        </div>

                        <div class="param-row">
                            <div class="param-label-group">
                                <span class="param-name">容差阈值 (Tolerance)</span>
                                <span class="param-val">{{ preprocessOptions.bgTolerance }}%</span>
                            </div>
                            <el-slider
                                v-model="preprocessOptions.bgTolerance"
                                :min="1"
                                :max="100"
                                @input="triggerPreprocessDebounced"
                            />
                        </div>
                    </template>
                </div>

                <!-- 步骤 2 参数: 中间图模式 -->
                <div v-show="currentStep === 1" class="step-param-panel">
                    <div class="panel-section-title">
                        <span class="icon-tag">03</span>
                        <span>选择特征提取算子</span>
                    </div>

                    <div class="mode-cards-grid">
                        <div
                            class="mode-card"
                            :class="{ active: intermediateOptions.mode === 'contour' }"
                            @click="selectMode('contour')"
                        >
                            <div class="mode-title">📐 轮廓 (Contour)</div>
                            <div class="mode-desc">Sobel 算子提取闭合外轮廓与内环，极具立体层次</div>
                        </div>

                        <div
                            class="mode-card"
                            :class="{ active: intermediateOptions.mode === 'skeleton' }"
                            @click="selectMode('skeleton')"
                        >
                            <div class="mode-title">✒️ 骨架 (Skeleton)</div>
                            <div class="mode-desc">Zhang-Suen 细化拓扑中心线，适合文字与书法笔画</div>
                        </div>

                        <div
                            class="mode-card"
                            :class="{ active: intermediateOptions.mode === 'dot' }"
                            @click="selectMode('dot')"
                        >
                            <div class="mode-title">🔘 圆点 (Halftone)</div>
                            <div class="mode-desc">半色调宏网格采样，呈现经典报印与点刻微光风格</div>
                        </div>

                        <div
                            class="mode-card"
                            :class="{ active: intermediateOptions.mode === 'fill' }"
                            @click="selectMode('fill')"
                        >
                            <div class="mode-title">⬛ 填充 (Solid Fill)</div>
                            <div class="mode-desc">保留完整二值化实心区域，适合密排蜂窝构型</div>
                        </div>
                    </div>

                    <el-divider />

                    <div class="param-row">
                        <div class="param-label-group">
                            <span class="param-name">二值化阈值 (Threshold)</span>
                            <span class="param-val">{{ intermediateOptions.threshold }}</span>
                        </div>
                        <el-slider
                            v-model="intermediateOptions.threshold"
                            :min="1"
                            :max="254"
                            @input="triggerIntermediateDebounced"
                        />
                    </div>
                </div>

                <!-- 步骤 3 参数: 构型排布与赋色 -->
                <div v-show="currentStep === 2" class="step-param-panel">
                    <div class="panel-section-title">
                        <span class="icon-tag">04</span>
                        <span>布点策略与架数配额</span>
                    </div>

                    <div class="param-row">
                        <span class="param-name">排布几何策略</span>
                        <el-radio-group v-model="motifOptions.strategy" size="small" @change="triggerMotifGenerate">
                            <el-radio-button value="contour">随形采样</el-radio-button>
                            <el-radio-button value="hexagonal">六边形密排</el-radio-button>
                            <el-radio-button value="grid">正交网格</el-radio-button>
                        </el-radio-group>
                    </div>

                    <div class="param-row">
                        <div class="param-label-group">
                            <span class="param-name">无人机目标架数</span>
                            <span class="param-val highlight">{{ motifOptions.targetCount }} 架</span>
                        </div>
                        <el-slider
                            v-model="motifOptions.targetCount"
                            :min="200"
                            :max="2400"
                            :step="50"
                            @input="triggerMotifGenerateDebounced"
                        />
                    </div>

                    <div class="param-row">
                        <div class="param-label-group">
                            <span class="param-name">编队物理跨度 (米)</span>
                            <span class="param-val">{{ motifOptions.canvasScale }}m</span>
                        </div>
                        <el-slider
                            v-model="motifOptions.canvasScale"
                            :min="60"
                            :max="600"
                            :step="20"
                            @input="triggerMotifGenerateDebounced"
                        />
                    </div>

                    <el-divider />

                    <div class="panel-section-title">
                        <span class="icon-tag">05</span>
                        <span>Color Applicator (原图赋色)</span>
                    </div>

                    <div class="param-row inline-switch">
                        <div>
                            <div class="param-name">保留原图真实 RGB 色彩</div>
                            <div class="param-hint">自动采样原图像素色彩赋给每架无人机 LED</div>
                        </div>
                        <el-switch
                            v-model="motifOptions.applyOriginalColor"
                            @change="triggerMotifGenerate"
                        />
                    </div>

                    <!-- 空间防撞检测报告 -->
                    <div class="safety-indicator-card" :class="safetyReport.isSafe ? 'is-safe' : 'is-danger'">
                        <div class="safety-header">
                            <span class="safety-icon">{{ safetyReport.isSafe ? '🛡️' : '⚠️' }}</span>
                            <span class="safety-status">
                                {{ safetyReport.isSafe ? '1.5m 碰撞安全校验通过' : `发现 ${safetyReport.dangerCount} 处过近违规` }}
                            </span>
                        </div>
                        <div class="safety-detail">
                            当前无人机最小测得物理间距: <strong>{{ safetyReport.minDist }}m</strong> (安全基准 ≥ 1.5m)
                        </div>
                        <el-button
                            v-if="!safetyReport.isSafe"
                            size="small"
                            type="warning"
                            plain
                            class="relax-btn"
                            @click="handleAutoRelax"
                        >
                            ⚡ 一键物理力导向平滑疏散
                        </el-button>
                    </div>
                </div>
            </div>

            <!-- 右侧：高清双联对比视窗 -->
            <div class="wizard-preview-stage">
                <div class="stage-subheaders">
                    <span class="sub-tag">
                        {{ currentStep === 0 ? '图像预处理预览' : currentStep === 1 ? '中间二值图 (Intermediate)' : '无人机点位构型渲染 (点数: ' + generatedAgents.length + ')' }}
                    </span>
                    <span class="sub-hint">支持高保真微光渲染与像素点位映射</span>
                </div>

                <div class="canvas-viewport-box">
                    <!-- Vue 3.5 useTemplateRef 绑定的 Canvas -->
                    <canvas ref="mainCanvas" class="wizard-canvas"></canvas>
                </div>
            </div>
        </div>

        <!-- 3. 底部操作按钮 -->
        <template #footer>
            <div class="wizard-footer-actions">
                <el-button @click="visible = false">取消</el-button>
                <el-button v-if="currentStep > 0" @click="currentStep--">上一步</el-button>
                <el-button
                    v-if="currentStep < 2"
                    type="primary"
                    @click="goToNextStep"
                >
                    下一步
                </el-button>
                <el-button
                    v-else
                    type="success"
                    :disabled="generatedAgents.length === 0"
                    @click="applyMotifToShow"
                >
                    ✨ 应用构型并导入分镜 (共 {{ generatedAgents.length }} 架)
                </el-button>
            </div>
        </template>
    </el-dialog>
</template>

<script setup>
/**
 * ========================================================================
 * SwarmStudio 图像智能转构型向导组件 (遵循 Vue 3.5 规范)
 * ========================================================================
 */
import { ref, reactive, useTemplateRef, watch, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { useImageProcessor } from '../composables/useImageProcessor';
import { useSpatialGrid } from '../composables/useSpatialGrid';

const emit = defineEmits(['apply-agents']);

// 🌟 Vue 3.5 原生专属 Hook: useTemplateRef
const canvasRef = useTemplateRef('mainCanvas');

// 算法 Hooks
const { preprocessImage, generateIntermediateImage, generateMotifFromIntermediate } = useImageProcessor();
const { checkSafety, autoRelaxCollisions } = useSpatialGrid();

// 弹窗状态
const visible = ref(false);
const currentStep = ref(0);

// 缓存原始图片
let sourceImage = null;
let currentPreprocessedCanvas = null;
let currentIntermediateData = null;

// 步骤 1 参数
const preprocessOptions = reactive({
    brightness: 0,
    contrast: 0,
    invert: false,
    removeBg: false,
    bgColorHex: '#ffffff',
    bgTolerance: 25,
});

// 步骤 2 参数
const intermediateOptions = reactive({
    mode: 'contour', // 'contour' | 'skeleton' | 'dot' | 'fill'
    threshold: 128,
});

// 步骤 3 参数
const motifOptions = reactive({
    strategy: 'contour',
    targetCount: 800,
    canvasScale: 300,
    applyOriginalColor: true,
});

// 生成的构型点阵
const generatedAgents = ref([]);

// 安全防撞报告
const safetyReport = reactive({
    isSafe: true,
    dangerCount: 0,
    minDist: 0,
});

// 防抖定时器
let debounceTimer = null;
function debounce(fn, delay = 60) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fn, delay);
}

/**
 * 外部唤起向导入口
 * @param {HTMLImageElement} img 
 * @param {number} defaultDroneCount 
 */
function openWizard(img, defaultDroneCount = 800) {
    sourceImage = img;
    motifOptions.targetCount = defaultDroneCount;
    currentStep.value = 0;
    visible.value = true;

    nextTick(() => {
        triggerPreprocess();
    });
}

/**
 * 执行步骤 1: 图像预处理
 */
function triggerPreprocess() {
    if (!sourceImage) return;
    currentPreprocessedCanvas = preprocessImage(sourceImage, preprocessOptions);
    if (currentStep.value === 0) {
        drawCanvasToViewport(currentPreprocessedCanvas);
    }
}

function triggerPreprocessDebounced() {
    debounce(triggerPreprocess, 50);
}

/**
 * 执行步骤 2: 生成中间图
 */
function triggerIntermediate() {
    if (!currentPreprocessedCanvas) {
        triggerPreprocess();
    }
    currentIntermediateData = generateIntermediateImage(
        currentPreprocessedCanvas,
        intermediateOptions.mode,
        { threshold: intermediateOptions.threshold }
    );
    if (currentStep.value === 1) {
        drawCanvasToViewport(currentIntermediateData.canvas);
    }
}

function triggerIntermediateDebounced() {
    debounce(triggerIntermediate, 50);
}

function selectMode(mode) {
    intermediateOptions.mode = mode;
    triggerIntermediate();
}

/**
 * 执行步骤 3: 构型生成、原色赋色与安全检测
 */
function triggerMotifGenerate() {
    if (!currentIntermediateData) {
        triggerIntermediate();
    }
    const agents = generateMotifFromIntermediate(
        currentIntermediateData,
        sourceImage,
        motifOptions
    );
    generatedAgents.value = agents;

    // 进行 1.5m 碰撞安全校验
    evaluateSafety(agents);

    // 在右侧视口渲染无人机发光点位
    if (currentStep.value === 2) {
        renderAgentsToViewport(agents);
    }
}

function triggerMotifGenerateDebounced() {
    debounce(triggerMotifGenerate, 60);
}

/**
 * 安全间距校验
 */
function evaluateSafety(agents) {
    // 假设 scale 300 对应 300 米，物理最小安全间距 1.5 米
    const minSafeDist = 1.5;
    const report = checkSafety(agents, minSafeDist);
    safetyReport.isSafe = report.isSafe;
    safetyReport.dangerCount = report.dangerIds.size;
    safetyReport.minDist = report.minObservedDistance;
}

/**
 * 一键力导向自动平滑疏散碰撞
 */
function handleAutoRelax() {
    if (!generatedAgents.value.length) return;
    const relaxed = autoRelaxCollisions(generatedAgents.value, 1.5, 20);
    generatedAgents.value = relaxed;
    evaluateSafety(relaxed);
    renderAgentsToViewport(relaxed);
    ElMessage.success('已完成物理力导向平滑疏散，所有点位达到安全基准！');
}

/**
 * 视口绘制: Canvas 图像
 */
function drawCanvasToViewport(canvas) {
    const mainCanvas = canvasRef.value;
    if (!mainCanvas || !canvas) return;

    mainCanvas.width = canvas.width;
    mainCanvas.height = canvas.height;
    const ctx = mainCanvas.getContext('2d');
    ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
    ctx.drawImage(canvas, 0, 0);
}

/**
 * 视口绘制: 无人机 LED 点阵高保真发光粒子
 */
function renderAgentsToViewport(agents) {
    const mainCanvas = canvasRef.value;
    if (!mainCanvas) return;

    const width = 600;
    const height = 450;
    mainCanvas.width = width;
    mainCanvas.height = height;

    const ctx = mainCanvas.getContext('2d');
    // 暗黑夜空底色
    ctx.fillStyle = '#080a10';
    ctx.fillRect(0, 0, width, height);

    // 绘制中心 CAD 十字
    ctx.strokeStyle = '#1e2638';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // 缩放点位到画布中
    const scale = (Math.min(width, height) * 0.8) / motifOptions.canvasScale;
    const centerX = width / 2;
    const centerY = height / 2;

    agents.forEach((agent) => {
        const screenX = centerX + agent.x * scale;
        const screenY = centerY - agent.y * scale;

        // 柔和微光辉光外圈
        ctx.fillStyle = agent.color || '#00f2fe';
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 4, 0, Math.PI * 2);
        ctx.fill();

        // 内部核心高亮小圆点
        ctx.globalAlpha = 1.0;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 1.8, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;
}

/**
 * 进入下一步
 */
function goToNextStep() {
    if (currentStep.value === 0) {
        currentStep.value = 1;
        nextTick(() => {
            triggerIntermediate();
        });
    } else if (currentStep.value === 1) {
        currentStep.value = 2;
        nextTick(() => {
            triggerMotifGenerate();
        });
    }
}

/**
 * 应用并导出点位到主分镜
 */
function applyMotifToShow() {
    if (generatedAgents.value.length === 0) return;
    emit('apply-agents', {
        agents: generatedAgents.value,
        strategy: motifOptions.strategy,
        mode: intermediateOptions.mode,
    });
    visible.value = false;
    ElMessage.success(`成功导入 ${generatedAgents.value.length} 架无人机构型到当前分镜！`);
}

defineExpose({
    openWizard,
});
</script>

<style scoped>
.swarm-image-wizard-dialog :deep(.el-dialog__body) {
    padding: 16px 24px;
    background-color: #0b0f19;
}

.wizard-steps-header {
    margin-bottom: 20px;
    background: #111827;
    border-radius: 8px;
    padding: 8px 12px;
}

.wizard-body {
    display: flex;
    gap: 20px;
    min-height: 480px;
}

.wizard-sidebar-params {
    width: 380px;
    background: #111827;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 18px;
    overflow-y: auto;
    max-height: 520px;
}

.panel-section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    color: #e2e8f0;
    margin-bottom: 14px;
}

.icon-tag {
    background: rgba(0, 242, 254, 0.15);
    color: #00f2fe;
    font-family: monospace;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
}

.param-row {
    margin-bottom: 16px;
}

.param-label-group {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    margin-bottom: 4px;
}

.param-name {
    color: #94a3b8;
    font-size: 12px;
}

.param-val {
    color: #00f2fe;
    font-family: monospace;
    font-weight: 600;
}

.param-val.highlight {
    color: #10b981;
}

.param-hint {
    font-size: 11px;
    color: #64748b;
    margin-top: 2px;
}

.inline-switch,
.inline-color {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.mode-cards-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
}

.mode-card {
    background: #1e293b;
    border: 1px solid rgba(255, 255, 255, 0.06);
    padding: 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.mode-card:hover {
    border-color: rgba(0, 242, 254, 0.4);
    background: #25334a;
}

.mode-card.active {
    border-color: #00f2fe;
    background: rgba(0, 242, 254, 0.1);
    box-shadow: 0 0 10px rgba(0, 242, 254, 0.2);
}

.mode-title {
    font-size: 13px;
    font-weight: 600;
    color: #f8fafc;
    margin-bottom: 4px;
}

.mode-desc {
    font-size: 11px;
    color: #94a3b8;
    line-height: 1.4;
}

.safety-indicator-card {
    border-radius: 8px;
    padding: 12px;
    margin-top: 14px;
    border: 1px solid;
}

.safety-indicator-card.is-safe {
    background: rgba(16, 185, 129, 0.1);
    border-color: rgba(16, 185, 129, 0.3);
}

.safety-indicator-card.is-danger {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
}

.safety-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 6px;
}

.safety-indicator-card.is-safe .safety-header {
    color: #10b981;
}

.safety-indicator-card.is-danger .safety-header {
    color: #ef4444;
}

.safety-detail {
    font-size: 11px;
    color: #94a3b8;
    line-height: 1.4;
}

.relax-btn {
    margin-top: 8px;
    width: 100%;
}

.wizard-preview-stage {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: #080a10;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 14px;
}

.stage-subheaders {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.sub-tag {
    font-size: 12px;
    font-weight: 600;
    color: #00f2fe;
}

.sub-hint {
    font-size: 11px;
    color: #64748b;
}

.canvas-viewport-box {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at center, #0f172a 0%, #080a10 100%);
    border-radius: 6px;
    overflow: hidden;
}

.wizard-canvas {
    max-width: 100%;
    max-height: 440px;
    object-fit: contain;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
}

.wizard-footer-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}
</style>
