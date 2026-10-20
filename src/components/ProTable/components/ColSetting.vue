<template>
    <ProDrawer
        v-model="drawerVisible"
        title="列显示设置"
        sub-title="个性化定制表格当前显示字段"
        size="360px"
        :show-fullscreen="false"
        :show-cancel="false"
        confirm-text="完成"
        :on-confirm="() => (drawerVisible = false)"
        body-padding="16px 20px"
        append-to-body
        class="pro-col-setting-drawer"
    >
        <!-- 次级顶栏：统计与快速重置 -->
        <template #sub-header>
            <div class="col-setting-toolbar">
                <span class="setting-summary">
                    显示列：<b class="highlight-count">{{ visibleCount }}</b> / {{ filterColumns.length }}
                </span>
                <el-button link type="primary" size="small" :icon="RefreshRight" @click="resetColumns">
                    重置为默认
                </el-button>
            </div>
        </template>

        <!-- 列列表 -->
        <div class="col-setting-list">
            <div
                v-for="item in filterColumns"
                :key="item.prop || item.label"
                class="col-setting-item"
                :class="{ 'is-disabled': item.fixed != null && item.fixed !== false }"
            >
                <el-checkbox
                    v-model="item.isShow"
                    :disabled="item.fixed != null && item.fixed !== false"
                >
                    <span class="col-label">{{ item.label }}</span>
                </el-checkbox>

                <el-tag
                    v-if="item.fixed"
                    size="small"
                    type="info"
                    effect="plain"
                    class="fixed-tag"
                >
                    {{ item.fixed === 'right' ? '右固定' : '固定列' }}
                </el-tag>
            </div>
        </div>
    </ProDrawer>
</template>

<script setup>
import { ref, computed } from 'vue';
import { RefreshRight } from '@element-plus/icons-vue';
import ProDrawer from '@/components/ProDrawer/index.vue';

const props = defineProps({
    columns: {
        type: Array,
        default: () => []
    }
});

const drawerVisible = ref(false);

// 过滤掉不可设置的特殊列（如多选框列、展开列、序号列）
const filterColumns = computed(() => {
    return props.columns.filter(
        item => !['selection', 'index', 'expand'].includes(item.type) && item.label
    );
});

// 计算当前显示的列数量
const visibleCount = computed(() => {
    return filterColumns.value.filter(item => item.isShow !== false).length;
});

// 重置所有列为默认显示
const resetColumns = () => {
    props.columns.forEach(col => {
        col.isShow = true;
    });
};

const openColSetting = () => {
    drawerVisible.value = true;
};

defineExpose({
    openColSetting
});
</script>

<style scoped>
.col-setting-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
}

.setting-summary {
    font-size: 13px;
    color: var(--el-text-color-regular);
}

.highlight-count {
    color: var(--el-color-primary);
}

.col-setting-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.col-setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background-color: var(--el-fill-color-lighter);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    transition: all 0.2s ease;
}

.col-setting-item:hover:not(.is-disabled) {
    background-color: var(--el-fill-color);
    border-color: var(--el-color-primary-light-7);
}

.col-setting-item.is-disabled {
    opacity: 0.75;
    background-color: var(--el-fill-color-darker);
}

.col-label {
    font-size: 13px;
    color: var(--el-text-color-primary);
}

.fixed-tag {
    font-size: 11px;
    border-radius: 4px;
}
</style>
