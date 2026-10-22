<template>
    <div class="drone-swarm-workbench">
        <!-- 1. 顶部极客专业控制台 (Toolbar) -->
        <header class="swarm-header">
            <div class="header-brand">
                <div class="brand-logo">
                    <el-icon :size="20"><Compass /></el-icon>
                </div>
                <div class="brand-titles">
                    <span class="main-title">SwarmStudio 无人机编队设计平台</span>
                    <span class="sub-title">2D 创意点阵 · 3D 夜空辉光表演 · SDF 工业协议</span>
                </div>
            </div>

            <!-- 中间核心操作：预设构型与图像提取 -->
            <div class="header-presets">
                <span class="preset-label">几何基元：</span>
                <el-button-group>
                    <el-button
                        size="small"
                        :type="currentMotif === 'heart' ? 'primary' : 'default'"
                        @click="applyPreset('heart')"
                    >
                        ❤️ 爱心
                    </el-button>
                    <el-button
                        size="small"
                        :type="currentMotif === 'star' ? 'primary' : 'default'"
                        @click="applyPreset('star')"
                    >
                        ⭐ 星芒
                    </el-button>
                    <el-button
                        size="small"
                        :type="currentMotif === 'galaxy' ? 'primary' : 'default'"
                        @click="applyPreset('galaxy')"
                    >
                        🐉 祥龙星系
                    </el-button>
                    <el-button
                        size="small"
                        :type="currentMotif === 'rings' ? 'primary' : 'default'"
                        @click="applyPreset('rings')"
                    >
                        🪐 光环
                    </el-button>
                </el-button-group>

                <!-- 上传图片提取轮廓 -->
                <el-upload
                    action=""
                    :auto-upload="false"
                    :show-file-list="false"
                    accept="image/*"
                    :on-change="handleImageUpload"
                    class="upload-btn"
                >
                    <el-button size="small" type="warning" plain>
                        <el-icon><Upload /></el-icon>
                        <span>上传线稿一键布点</span>
                    </el-button>
                </el-upload>
            </div>

            <!-- 右侧：架数标定、LED 颜色与 2D/3D 模式切换 -->
            <div class="header-actions">
                <div class="stat-pill">
                    <span class="label">编队总架数:</span>
                    <el-select v-model="droneCount" size="small" style="width: 105px" @change="handleCountChange">
                        <el-option :value="400" label="400 架" />
                        <el-option :value="800" label="800 架" />
                        <el-option :value="1600" label="1600 架" />
                    </el-select>
                </div>

                <div class="color-picker-box" title="修改当前分镜无人机 LED 颜色">
                    <span class="color-label">LED:</span>
                    <el-color-picker
                        v-model="currentLedColor"
                        size="small"
                        :show-alpha="false"
                        @change="handleLedColorChange"
                    />
                </div>

                <div class="view-switch">
                    <el-segmented
                        v-model="viewMode"
                        :options="[
                            { label: '2D 点阵编辑', value: '2d' },
                            { label: '3D 夜空试飞', value: '3d' },
                        ]"
                        size="small"
                    />
                </div>
            </div>
        </header>

        <!-- 2. 中央视口核心主舞台 -->
        <main class="swarm-main-stage">
            <!-- 2D PixiJS 点阵图形编辑器 -->
            <Editor2D
                v-show="viewMode === '2d'"
                :agents="currentScene.agents"
                @select-agent="handleSelectAgent"
            />

            <!-- 3D Three.js 夜空发光无人机全景播放器 -->
            <Player3D
                v-if="viewMode === '3d'"
                :agents="currentScene.agents"
                :drone-count="droneCount"
            />
        </main>

        <!-- 3. 底部分镜时间轴控制栏 -->
        <TimelineBar
            :scenes="showProject.scenes"
            :active-scene-index="activeSceneIndex"
            @select-scene="handleSelectScene"
            @add-scene="handleAddScene"
            @export-sdf="handleExportSdf"
        />
    </div>
</template>

<script setup>
/**
 * ========================================================================
 * 无人机集群编队设计与表演系统 - 主工作台容器
 * ========================================================================
 */
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElNotification } from 'element-plus';
import { Compass, Upload } from '@element-plus/icons-vue';

import { createShow, createScene, createAgent } from './types/swarm';
import { useContourAlgorithm } from './composables/useContourAlgorithm';
import Editor2D from './components/Editor2D.vue';
import Player3D from './components/Player3D.vue';
import TimelineBar from './components/TimelineBar.vue';

// 引入原生图像提取算法 Hook
const { generatePresetPattern, extractPointsFromImage } = useContourAlgorithm();

// 工作台视图模式 ('2d' | '3d')
const viewMode = ref('2d');
const droneCount = ref(800);
const currentMotif = ref('heart');
const currentLedColor = ref('#00f2fe');
const activeSceneIndex = ref(0);

// 整场表演工程模型 (Show)
const showProject = reactive(
    createShow({
        title: '星空华彩无人机编队夜空秀',
        droneCount: 800,
        scenes: [],
    })
);

// 当前激活的分镜
const currentScene = computed(() => {
    return showProject.scenes[activeSceneIndex.value] || { agents: [] };
});

// 初始化默认演示分镜剧本 (爱心 -> 五角星 -> 祥龙)
function initDefaultScenes() {
    const scene1 = createScene({
        name: '分镜 1: 浪漫爱心',
        duration: 6,
        transitionTime: 3,
        motifType: 'heart',
        agents: generatePresetPattern('heart', droneCount.value),
    });

    const scene2 = createScene({
        name: '分镜 2: 璀璨星芒',
        duration: 6,
        transitionTime: 3,
        motifType: 'star',
        agents: generatePresetPattern('star', droneCount.value),
    });

    const scene3 = createScene({
        name: '分镜 3: 祥龙星系',
        duration: 8,
        transitionTime: 4,
        motifType: 'galaxy',
        agents: generatePresetPattern('galaxy', droneCount.value),
    });

    showProject.scenes = [scene1, scene2, scene3];
    activeSceneIndex.value = 0;
}

// 切换几何预设母题
function applyPreset(motifType) {
    currentMotif.value = motifType;
    const newPoints = generatePresetPattern(motifType, droneCount.value);
    currentScene.value.agents = newPoints.map((p) => createAgent({ ...p, color: currentLedColor.value }));
    currentScene.value.motifType = motifType;

    ElMessage.success({
        message: `已应用基元构型: ${motifType} (${droneCount.value} 架无人机)`,
        duration: 1500,
    });
}

// 调整无人机总架数标定
function handleCountChange(newCount) {
    showProject.droneCount = newCount;
    applyPreset(currentMotif.value);
}

// 修改当前分镜 LED 颜色
function handleLedColorChange(newColor) {
    if (!newColor) return;
    currentScene.value.agents.forEach((agent) => {
        agent.color = newColor;
    });
}

// 切换当前激活分镜
function handleSelectScene(index) {
    activeSceneIndex.value = index;
    currentMotif.value = currentScene.value.motifType || 'custom';
}

// 新增分镜
function handleAddScene() {
    const newIdx = showProject.scenes.length + 1;
    const newScene = createScene({
        name: `分镜 ${newIdx}: 构型基元`,
        duration: 5,
        transitionTime: 3,
        motifType: 'rings',
        agents: generatePresetPattern('rings', droneCount.value),
    });
    showProject.scenes.push(newScene);
    activeSceneIndex.value = showProject.scenes.length - 1;
    ElMessage.success('已新建分镜剧本！');
}

// 上传自定义线稿/图片一键二值化布点
async function handleImageUpload(uploadFile) {
    const file = uploadFile.raw;
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const img = new Image();
        img.onload = async () => {
            const startTime = performance.now();
            const extractedPoints = await extractPointsFromImage(img, droneCount.value);
            const costMs = Math.round(performance.now() - startTime);

            currentScene.value.agents = extractedPoints.map((p) =>
                createAgent({ ...p, color: currentLedColor.value })
            );
            currentScene.value.name = `自定义图片: ${file.name.substring(0, 8)}`;
            currentScene.value.motifType = 'image';

            ElNotification({
                title: '图像二值化与等距布点成功',
                message: `成功提取并均匀离散化 ${extractedPoints.length} 架无人机点位，纯前端耗时仅 ${costMs}ms！`,
                type: 'success',
                duration: 3500,
            });
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// 选中某个无人机点位
function handleSelectAgent(agent) {
    ElMessage.info(`选中无人机 #${agent.id} (坐标: X ${agent.x}, Y ${agent.y})`);
}

// 导出 SDF 编队标准工业协议数据
function handleExportSdf() {
    const exportData = {
        meta: {
            app: 'SwarmStudio',
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            totalDrones: droneCount.value,
        },
        project: showProject,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drone_swarm_sdf_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    ElMessage.success('已成功导出标准 SDF 编队工程数据文件！');
}

onMounted(() => {
    initDefaultScenes();
});
</script>

<style scoped>
.drone-swarm-workbench {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: #080a10;
    color: #e2e8f0;
    overflow: hidden;
    font-family: var(--app-font-family);
}

/* 顶部控制台 Header */
.swarm-header {
    height: 56px;
    background: #0f172a;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 18px;
    z-index: 10;
}

.header-brand {
    display: flex;
    align-items: center;
    gap: 12px;
}

.brand-logo {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #080a10;
    box-shadow: 0 0 12px rgba(0, 242, 254, 0.4);
}

.brand-titles {
    display: flex;
    flex-direction: column;
}

.main-title {
    font-size: 14px;
    font-weight: 700;
    color: #f8fafc;
    letter-spacing: 0.5px;
}

.sub-title {
    font-size: 11px;
    color: #64748b;
    font-family: var(--app-font-family-mono, monospace);
}

.header-presets {
    display: flex;
    align-items: center;
    gap: 8px;
}

.preset-label {
    font-size: 12px;
    color: #94a3b8;
}

.upload-btn {
    margin-left: 6px;
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 14px;
}

.stat-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(30, 41, 59, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 2px 8px;
    border-radius: 6px;
}

.stat-pill .label {
    font-size: 12px;
    color: #94a3b8;
}

.color-picker-box {
    display: flex;
    align-items: center;
    gap: 6px;
}

.color-label {
    font-size: 12px;
    font-weight: 600;
    color: #94a3b8;
    font-family: var(--app-font-family-mono, monospace);
}

.view-switch {
    background: rgba(30, 41, 59, 0.8);
    border-radius: 8px;
    padding: 2px;
}

/* 中央主舞台 */
.swarm-main-stage {
    flex: 1;
    position: relative;
    overflow: hidden;
}
</style>
