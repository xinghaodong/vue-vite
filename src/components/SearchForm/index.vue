<template>
    <div v-if="searchColumns.length" class="pro-search-form">
        <el-form ref="formRef" :model="searchParam" label-width="auto" @submit.prevent>
            <el-row :gutter="20">
                <!-- 动态筛选项渲染 -->
                <el-col
                    v-for="(item, index) in showSearchColumns"
                    :key="item.prop || index"
                    v-bind="getResponsiveSpan(item)"
                >
                    <el-form-item :label="`${item.label} :`">
                        <SearchFormItem
                            :column="item"
                            :search-param="searchParam"
                            @search="search"
                        />
                    </el-form-item>
                </el-col>

                <!-- 搜索操作按钮组（精准停留在第一行末尾，或展开时吸附在最后一行最右侧） -->
                <el-col
                    v-bind="actionColSpan"
                    :offset="actionColOffset"
                    class="search-form-operation"
                >
                    <el-form-item label-width="0">
                        <div class="operation-buttons">
                            <el-button type="primary" :icon="Search" @click="search">
                                查询
                            </el-button>
                            <el-button :icon="Refresh" @click="reset">
                                重置
                            </el-button>
                            <el-button
                                v-if="searchColumns.length > showMaxCount"
                                link
                                type="primary"
                                class="collapse-btn"
                                @click="collapsed = !collapsed"
                            >
                                <span>{{ collapsed ? '展开' : '收起' }}</span>
                                <el-icon class="el-icon--right">
                                    <component :is="collapsed ? ArrowDown : ArrowUp" />
                                </el-icon>
                            </el-button>
                        </div>
                    </el-form-item>
                </el-col>
            </el-row>
        </el-form>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Search, Refresh, ArrowDown, ArrowUp } from '@element-plus/icons-vue';
import SearchFormItem from './components/SearchFormItem.vue';

const props = defineProps({
    // 列配置数组，内部会自动过滤包含 search 配置的列
    columns: {
        type: Array,
        default: () => []
    },
    // 搜索参数对象（双向绑定）
    searchParam: {
        type: Object,
        default: () => ({})
    },
    // 默认展示的筛选项最大个数（折叠时：默认展示3个，与第4格按钮刚好占满第1行）
    defaultShowCount: {
        type: Number,
        default: 3
    }
});

const emit = defineEmits(['search', 'reset']);

// 折叠状态（默认折叠，只展示首行与末尾按钮）
const collapsed = ref(true);
const formRef = ref(null);

// 提取所有配置了 search 的列并按 order 排序
const searchColumns = computed(() => {
    return props.columns
        .filter(item => item.search)
        .sort((a, b) => (a.search?.order ?? 0) - (b.search?.order ?? 0));
});

// 折叠时最大显示数量：默认 3 个，配合按钮刚好占满 1 行 4 列
const showMaxCount = computed(() => props.defaultShowCount);

// 当前实际展示的筛选项列表
const showSearchColumns = computed(() => {
    if (!collapsed.value) {
        return searchColumns.value;
    }
    return searchColumns.value.slice(0, showMaxCount.value);
});

/**
 * 响应式栅格断点系统
 * 针对中宽屏 (>=1200px 如 1707px、1440px、1080P)：单项占 span: 6 (一行 4 格)
 * 使得：[条件1] [条件2] [条件3] + [操作按钮组] = 24，刚好严丝合缝占满第一行！按钮稳居第一行末尾！
 */
const getResponsiveSpan = (item) => {
    return {
        xs: item.search?.span?.xs ?? 24, // 手机：单列
        sm: item.search?.span?.sm ?? 12, // 平板小屏：2 列
        md: item.search?.span?.md ?? 8,  // 普通笔记本：3 列
        lg: item.search?.span?.lg ?? 6,  // 大屏 (1200~1920px，如1707px)：4 列！
        xl: item.search?.span?.xl ?? 6   // 超宽屏：4 列
    };
};

// 操作按钮区域固定占 1 格
const actionColSpan = computed(() => {
    return {
        xs: 24,
        sm: 12,
        md: 8,
        lg: 6,
        xl: 6
    };
});

/**
 * 展开状态下动态计算 offset，使得按钮永远平滑吸附在最后一行的最右侧
 */
const actionColOffset = computed(() => {
    // 折叠状态下，3个条件(18) + 按钮(6) = 24，无需偏移
    if (collapsed.value) return 0;

    // 展开状态下：以 lg 宽屏（一行4列，每列6格）为例动态补齐空位
    const count = searchColumns.value.length;
    const remainder = count % 4; // 最后一排有几个条件
    if (remainder === 0) {
        // 前面正好占满整行，按钮放到下一行末尾 (24 - 6 = 18)
        return 18;
    }
    // 最后一排已有 remainder * 6 格，按钮占 6 格，需偏移 24 - (remainder * 6) - 6
    return 24 - (remainder * 6) - 6;
});

// 触发查询
const search = () => {
    emit('search');
};

// 触发重置
const reset = () => {
    emit('reset');
};

defineExpose({
    formRef
});
</script>

<style scoped>
.pro-search-form {
    padding: 18px 18px 0;
    margin-bottom: 12px;
    background-color: var(--el-bg-color-overlay);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
}

:deep(.el-form-item) {
    margin-bottom: 18px;
}

:deep(.el-form-item__label) {
    font-weight: 500;
    color: var(--el-text-color-regular);
}

.search-form-operation {
    margin-left: auto;
}

.operation-buttons {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    width: 100%;
}

.collapse-btn {
    margin-left: 12px;
    font-size: 13px;
    user-select: none;
}
</style>
