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

    </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue';

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
let playbackStartedAt = 0;
let playbackStartTime = 0;
let lastSceneIndex = 0;

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
    playbackStartTime = currentTime.value;
    playbackStartedAt = performance.now();
    lastSceneIndex = props.activeSceneIndex;

    timer = setInterval(() => {
        const elapsed = playbackStartTime + (performance.now() - playbackStartedAt) / 1000;
        if (elapsed >= totalDuration.value) {
            playbackStartTime = 0;
            playbackStartedAt = performance.now();
            currentTime.value = 0;
            lastSceneIndex = -1;
        } else {
            currentTime.value = elapsed;
        }

        const sceneIndex = resolveSceneIndex(currentTime.value);
        if (sceneIndex !== lastSceneIndex) {
            lastSceneIndex = sceneIndex;
            emit('select-scene', sceneIndex);
        }
    }, 100);
}

function resolveSceneIndex(time) {
    let accumulated = 0;
    for (let i = 0; i < props.scenes.length; i++) {
        const scene = props.scenes[i];
        const sceneSpan = (scene.duration || 5) + (scene.transitionTime || 3);
        if (time < accumulated + sceneSpan) return i;
        accumulated += sceneSpan;
    }
    return Math.max(0, props.scenes.length - 1);
}

function stopPlayLoop() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

watch(
    () => props.activeSceneIndex,
    (index) => {
        if (isPlaying.value) return;
        let accumulated = 0;
        for (let i = 0; i < index && i < props.scenes.length; i++) {
            accumulated += (props.scenes[i].duration || 5) + (props.scenes[i].transitionTime || 3);
        }
        currentTime.value = accumulated;
    }
);

watch(
    () => props.scenes.length,
    () => {
        if (currentTime.value > totalDuration.value) currentTime.value = 0;
    }
);

onBeforeUnmount(stopPlayLoop);

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
</script>

<style scoped>
.timeline-bar-container {
    flex: 0 0 68px;
    height: 68px;
    margin: 12px 0 0;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 12px;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 16px 32px -24px rgba(15, 23, 42, 0.5);
    display: flex;
    align-items: center;
    padding: 0 14px;
    gap: 14px;
    user-select: none;
    transition: background-color 0.3s ease, border-color 0.3s ease;
}

.playback-controls {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
}

.playback-controls :deep(.el-button.is-circle) {
    width: 34px;
    height: 34px;
    box-shadow: 0 6px 14px -8px var(--el-color-primary);
}

.time-display {
    font-family: var(--app-font-family-mono, monospace);
    font-size: 12px;
    color: var(--el-text-color-secondary);
    padding: 3px 8px;
    border-radius: 6px;
    background: var(--el-fill-color-lighter);
    white-space: nowrap;
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
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    overflow-x: auto;
    padding: 4px 2px;
    scrollbar-width: thin;
    scrollbar-color: var(--el-border-color) transparent;
}

.scenes-track::-webkit-scrollbar {
    height: 4px;
}

.scenes-track::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: var(--el-border-color);
}

.scene-capsule {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--el-fill-color-lighter);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;
    padding: 7px 12px;
    cursor: pointer;
    transition: border-color 0.2s ease, background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
    position: relative;
    white-space: nowrap;
}

.scene-capsule:hover {
    border-color: var(--el-border-color);
    transform: translateY(-1px);
}

.scene-capsule.is-active {
    background: linear-gradient(180deg, var(--el-color-primary-light-9), var(--el-fill-color-blank));
    border-color: var(--el-color-primary);
    box-shadow: 0 8px 18px -14px var(--el-color-primary), inset 0 0 0 1px var(--el-color-primary-light-8);
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
    left: 12px;
    right: 12px;
    bottom: 0;
    height: 2px;
    background: var(--el-color-primary);
    border-radius: 999px 999px 0 0;
    box-shadow: 0 0 6px var(--el-color-primary);
}

.add-scene-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    background: transparent;
    border: 1px dashed var(--el-border-color-darker);
    border-radius: 10px;
    padding: 9px 12px;
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

</style>
