<template>
    <div class="pro-table-header">
        <!-- 左侧：标题与业务按钮区 -->
        <div class="header-left">
            <div v-if="title" class="table-title">{{ title }}</div>
            <slot name="tableHeader" :selected-list="selectedList" :selected-list-ids="selectedListIds">
                <!-- 业务按钮插槽 -->
            </slot>
            <!-- 批量选择提示 -->
            <transition name="el-fade-in-linear">
                <div v-if="selectedList.length > 0" class="selection-alert">
                    <span class="selection-tip">已选择 <b>{{ selectedList.length }}</b> 项</span>
                    <el-button link type="primary" size="small" @click="emit('clear-selection')">
                        清空
                    </el-button>
                </div>
            </transition>
        </div>

        <!-- 右侧：大厂级效能工具箱 -->
        <div class="header-right">
            <slot name="toolButton">
                <!-- 1. 局部刷新 -->
                <el-tooltip content="刷新表格" placement="top">
                    <el-button circle :icon="Refresh" @click="emit('refresh')" />
                </el-tooltip>

                <!-- 2. 表格密度调节 -->
                <el-tooltip content="表格密度" placement="top">
                    <el-dropdown trigger="click" @command="handleDensityChange">
                        <el-button circle :icon="Sort" />
                        <template #dropdown>
                            <el-dropdown-menu>
                                <el-dropdown-item command="large" :class="{ 'is-active': currentDensity === 'large' }">
                                    宽松 (大)
                                </el-dropdown-item>
                                <el-dropdown-item command="default" :class="{ 'is-active': currentDensity === 'default' }">
                                    默认 (中)
                                </el-dropdown-item>
                                <el-dropdown-item command="small" :class="{ 'is-active': currentDensity === 'small' }">
                                    紧凑 (小)
                                </el-dropdown-item>
                            </el-dropdown-menu>
                        </template>
                    </el-dropdown>
                </el-tooltip>

                <!-- 3. 列设置 -->
                <el-tooltip content="列设置" placement="top">
                    <el-button circle :icon="Setting" @click="emit('open-col-setting')" />
                </el-tooltip>

                <!-- 4. 全屏放大 -->
                <el-tooltip :content="isFullscreen ? '还原' : '全屏'" placement="top">
                    <el-button circle :icon="FullScreen" @click="toggleFullscreen" />
                </el-tooltip>
            </slot>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Refresh, Setting, FullScreen, Sort } from '@element-plus/icons-vue';

const props = defineProps({
    title: {
        type: String,
        default: ''
    },
    selectedList: {
        type: Array,
        default: () => []
    },
    selectedListIds: {
        type: Array,
        default: () => []
    },
    currentDensity: {
        type: String,
        default: 'default'
    }
});

const emit = defineEmits(['refresh', 'density-change', 'open-col-setting', 'clear-selection']);

const isFullscreen = ref(false);

const densityMap = {
    large: '宽松 (大)',
    default: '默认 (中)',
    small: '紧凑 (小)'
};

const handleDensityChange = (density) => {
    emit('density-change', density);
    ElMessage.success({ message: `表格密度已切换为: ${densityMap[density]}`, duration: 1200 });
};

const toggleFullscreen = () => {
    const tableContainer = document.querySelector('.pro-table-container');
    if (!tableContainer) return;

    if (!document.fullscreenElement) {
        tableContainer.requestFullscreen().then(() => {
            isFullscreen.value = true;
        }).catch(err => {
            console.warn('[ProTable] 全屏请求被拒绝:', err);
        });
    } else {
        document.exitFullscreen().then(() => {
            isFullscreen.value = false;
        });
    }
};
</script>

<style scoped>
.pro-table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}

.table-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    position: relative;
    padding-left: 10px;
}

.table-title::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 14px;
    background-color: var(--el-color-primary);
    border-radius: 2px;
}

.selection-alert {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 2px 10px;
    background-color: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 6px;
    font-size: 13px;
}

.selection-tip b {
    color: var(--el-color-primary);
    margin: 0 2px;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 8px;
}

:deep(.el-dropdown-menu__item.is-active) {
    color: var(--el-color-primary);
    background-color: var(--el-color-primary-light-9);
    font-weight: 600;
}
</style>
