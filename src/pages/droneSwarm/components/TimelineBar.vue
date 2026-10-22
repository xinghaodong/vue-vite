<template>
    <div class="timeline-bar-container">
        <!-- 播放控制区 -->
        <div class="playback-controls">
            <el-button
                :type="isPlaying ? 'warning' : 'primary'"
                circle
                size="default"
                @click="togglePlay"
            >
                <el-icon :size="16">
                    <VideoPause v-if="isPlaying" />
                    <VideoPlay v-else />
                </el-icon>
            </el-button>

            <div class="time-display">
                <span class="current-time">{{ formatTime(currentTime) }}</span>
                <span class="slash">/</span>
                <span class="total-time">{{ formatTime(totalDuration) }}</span>
            </div>
        </div>

        <!-- 分镜序列胶囊轨道 -->
        <div class="scenes-track">
            <div
                v-for="(scene, index) in scenes"
                :key="scene.id"
                class="scene-capsule"
                :class="{ 'is-active': activeSceneIndex === index }"
                @click="$emit('select-scene', index)"
            >
                <div class="capsule-icon">
                    <span v-if="scene.motifType === 'heart'">❤️</span>
                    <span v-else-if="scene.motifType === 'star'">⭐</span>
                    <span v-else-if="scene.motifType === 'galaxy'">🐉</span>
                    <span v-else>🛸</span>
                </div>
                <div class="capsule-info">
                    <span class="capsule-name">{{ scene.name }}</span>
                    <span class="capsule-duration">{{ scene.duration }}s (航行 {{ scene.transitionTime }}s)</span>
                </div>
                <span v-if="activeSceneIndex === index" class="active-indicator"></span>
            </div>

            <!-- 新增分镜按钮 -->
            <button class="add-scene-btn" @click="$emit('add-scene')">
                <el-icon><Plus /></el-icon>
                <span>新增分镜</span>
            </button>
        </div>

        <!-- 右侧快速分镜操作 -->
        <div class="track-actions">
            <el-button size="small" type="success" plain @click="$emit('export-sdf')">
                导出 SDF 数据
            </el-button>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
    scenes: {
        type: Array,
        default: () => [],
    },
    activeSceneIndex: {
        type: Number,
        default: 0,
    },
});

const emit = defineEmits(['select-scene', 'add-scene', 'export-sdf']);

const isPlaying = ref(false);
const currentTime = ref(0);
let timer = null;

const totalDuration = computed(() => {
    return props.scenes.reduce((acc, cur) => acc + (cur.duration || 5) + (cur.transitionTime || 3), 0);
});

function togglePlay() {
    isPlaying.value = !isPlaying.value;
    if (isPlaying.value) {
        startPlayLoop();
    } else {
        stopPlayLoop();
    }
}

function startPlayLoop() {
    stopPlayLoop();
    let currentIdx = props.activeSceneIndex;
    timer = setInterval(() => {
        currentTime.value += 1;
        if (currentTime.value >= totalDuration.value) {
            currentTime.value = 0;
            currentIdx = 0;
            emit('select-scene', currentIdx);
            return;
        }

        // 简易分镜时间递进
        if (currentTime.value % 6 === 0) {
            currentIdx = (currentIdx + 1) % props.scenes.length;
            emit('select-scene', currentIdx);
        }
    }, 1000);
}

function stopPlayLoop() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
</script>

<style scoped>
.timeline-bar-container {
    height: 64px;
    background: var(--el-bg-color);
    border-top: 1px solid var(--el-border-color-lighter);
    display: flex;
    align-items: center;
    padding: 0 16px;
    gap: 16px;
    user-select: none;
    transition: background-color 0.3s ease, border-color 0.3s ease;
}

.playback-controls {
    display: flex;
    align-items: center;
    gap: 12px;
}

.time-display {
    font-family: var(--app-font-family-mono, monospace);
    font-size: 13px;
    color: var(--el-text-color-secondary);
}

.current-time {
    color: var(--el-color-primary);
    font-weight: 600;
}

.slash {
    margin: 0 4px;
    color: var(--el-border-color);
}

.scenes-track {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    overflow-x: auto;
    padding: 4px 0;
}

.scene-capsule {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    padding: 6px 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    white-space: nowrap;
}

.scene-capsule:hover {
    border-color: var(--el-border-color);
    transform: translateY(-1px);
}

.scene-capsule.is-active {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.capsule-icon {
    font-size: 16px;
}

.capsule-info {
    display: flex;
    flex-direction: column;
}

.capsule-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-primary);
}

.capsule-duration {
    font-size: 10px;
    color: var(--el-text-color-secondary);
    font-family: var(--app-font-family-mono, monospace);
}

.active-indicator {
    position: absolute;
    bottom: -1px;
    left: 20%;
    right: 20%;
    height: 2px;
    background: var(--el-color-primary);
    border-radius: 999px;
    box-shadow: 0 0 6px var(--el-color-primary);
}

.add-scene-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    background: transparent;
    border: 1px dashed var(--el-border-color);
    border-radius: 8px;
    padding: 8px 12px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
}

.add-scene-btn:hover {
    border-color: var(--el-color-primary);
    color: var(--el-color-primary);
}

.track-actions {
    display: flex;
    align-items: center;
}
</style>
