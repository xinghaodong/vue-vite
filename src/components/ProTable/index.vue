<template>
    <div class="pro-table-container">
        <!-- 1. 动态自适应搜索表单 -->
        <SearchForm
            v-if="isShowSearch && hasSearchColumns"
            class="pro-table-search"
            :columns="columns"
            :search-param="searchParam"
            :default-show-count="searchDefaultCount"
            :action-position="searchActionPosition"
            @search="search"
            @reset="reset"
        />

        <!-- 2. 表格主体卡片 -->
        <div class="pro-table-card">
            <!-- 表格头部工具栏 -->
            <TableHeader
                v-if="showHeader"
                :title="title"
                :selected-list="selectedList"
                :selected-list-ids="selectedListIds"
                :current-density="tableDensity"
                @refresh="refresh"
                @density-change="handleDensityChange"
                @open-col-setting="openColSetting"
                @clear-selection="clearSelection"
            >
                <template #tableHeader="scope">
                    <slot name="tableHeader" v-bind="scope"></slot>
                </template>
                <template #toolButton="scope">
                    <slot name="toolButton" v-bind="scope"></slot>
                </template>
            </TableHeader>

            <!-- 3. Element Plus 原生表格 (100% 属性与事件精准透传) -->
            <el-table
                ref="tableRef"
                :height="autoHeight ? '100%' : undefined"
                v-bind="$attrs"
                :data="data ?? tableData"
                :size="tableDensity"
                v-loading="loading"
                :border="border"
                :stripe="stripe"
                class="pro-el-table"
                @selection-change="handleSelectionChange"
            >
                <!-- 遍历递归列 -->
                <template v-for="item in tableColumns" :key="item.prop || item.label || item.type">
                    <TableColumn :column="item">
                        <!-- 动态透传作用域插槽至底层列组件 -->
                        <template v-for="slot in Object.keys($slots)" #[slot]="scope">
                            <slot :name="slot" v-bind="scope"></slot>
                        </template>
                    </TableColumn>
                </template>

                <!-- 原生 append 插槽支持 -->
                <template v-if="$slots.append" #append>
                    <slot name="append"></slot>
                </template>
                <!-- 原生 empty 插槽支持 -->
                <template v-if="$slots.empty" #empty>
                    <slot name="empty"></slot>
                </template>
            </el-table>

            <!-- 4. 底部现代化分页器 -->
            <Pagination
                v-if="pagination"
                :page-param="pageParam"
                :page-sizes="pageSizes"
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange"
            />
        </div>

        <!-- 5. 列显隐与排序抽屉 -->
        <ColSetting ref="colSettingRef" :columns="tableColumns" />
    </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, reactive } from 'vue';
import SearchForm from '../SearchForm/index.vue';
import TableHeader from './components/TableHeader.vue';
import TableColumn from './components/TableColumn.vue';
import Pagination from './components/Pagination.vue';
import ColSetting from './components/ColSetting.vue';
import { useTable } from '@/composables/useTable.js';

// 声明组件配置：禁用根节点自动继承，确保 $attrs 精准透传到底层 el-table
defineOptions({
    name: 'ProTable',
    inheritAttrs: false
});

const props = defineProps({
    // 表格列配置
    columns: {
        type: Array,
        required: true,
        default: () => []
    },
    // 数据请求 API 函数 (自动驱动模式)
    requestApi: {
        type: Function,
        default: null
    },
    // 直接传入静态数据 (受控纯展示模式)
    data: {
        type: Array,
        default: null
    },
    // 初始静态查询参数
    initParam: {
        type: Object,
        default: () => ({})
    },
    // 表格标题
    title: {
        type: String,
        default: ''
    },
    // 是否启用分页
    pagination: {
        type: Boolean,
        default: true
    },
    // 是否自适应撑满父容器并在表格内部滚动 (大厂标配模式)
    autoHeight: {
        type: Boolean,
        default: true
    },
    // 是否显示搜索表单
    isShowSearch: {
        type: Boolean,
        default: true
    },
    // 搜索折叠默认显示项数
    searchDefaultCount: {
        type: Number,
        default: 3
    },
    // 搜索操作按钮位置：'end'（吸附末尾）或 'start'（放置在第一列）
    searchActionPosition: {
        type: String,
        default: 'end'
    },
    // 是否显示表头操作工具栏
    showHeader: {
        type: Boolean,
        default: true
    },
    // 是否带边框
    border: {
        type: Boolean,
        default: true
    },
    // 是否带斑马纹
    stripe: {
        type: Boolean,
        default: false
    },
    // 分页规格选择项
    pageSizes: {
        type: Array,
        default: () => [10, 20, 50, 100]
    },
    // 数据清洗加工回调
    dataCallBack: {
        type: Function,
        default: null
    },
    // 是否立即执行数据请求
    immediate: {
        type: Boolean,
        default: true
    }
});

const emit = defineEmits(['search', 'reset', 'selection-change']);

const tableRef = ref(null);
const colSettingRef = ref(null);
const tableDensity = ref('default');

// 深度复制列配置，赋予 isShow 响应式属性
const tableColumns = reactive(
    props.columns.map(col => ({
        ...col,
        isShow: col.isShow ?? true
    }))
);

// 判断是否存在筛选项
const hasSearchColumns = computed(() => {
    return props.columns.some(col => Boolean(col.search));
});

// 初始化表格驱动内核 (useTable)
const {
    tableData,
    pageParam,
    searchParam,
    searchInitParam,
    loading,
    selectedList,
    selectedListIds,
    getTableList,
    search: innerSearch,
    reset: innerReset,
    refresh,
    handleSizeChange,
    handleCurrentChange,
    selectionChange
} = useTable(
    props.requestApi,
    props.initParam,
    props.pagination,
    props.dataCallBack
);

// 提取默认筛选项初始值
props.columns.forEach(item => {
    if (item.search && item.search.defaultValue !== undefined) {
        searchInitParam.value[item.search.key ?? item.prop] = item.search.defaultValue;
        searchParam.value[item.search.key ?? item.prop] = item.search.defaultValue;
    }
});

// 搜索事件响应
const search = () => {
    innerSearch();
    emit('search', searchParam.value);
};

// 重置事件响应
const reset = () => {
    innerReset();
    emit('reset');
};

// 密度切换
const handleDensityChange = (density) => {
    tableDensity.value = density;
};

// 打开列设置
const openColSetting = () => {
    colSettingRef.value?.openColSetting();
};

// 选择项变化监听
const handleSelectionChange = (selection) => {
    selectionChange(selection);
    emit('selection-change', selection);
};

// 清空选择
const clearSelection = () => {
    tableRef.value?.clearSelection();
};

// 挂载执行首次数据拉取
onMounted(() => {
    if (props.requestApi && props.immediate) {
        getTableList();
    }
});

// 暴露全部必要属性与原生 el-table 方法
defineExpose({
    element: tableRef,
    tableData,
    pageParam,
    searchParam,
    selectedList,
    selectedListIds,
    getTableList,
    search,
    reset,
    refresh,
    clearSelection,
    toggleRowSelection: (...args) => tableRef.value?.toggleRowSelection(...args),
    toggleRowExpansion: (...args) => tableRef.value?.toggleRowExpansion(...args),
    toggleAllSelection: () => tableRef.value?.toggleAllSelection(),
    setCurrentRow: (...args) => tableRef.value?.setCurrentRow(...args)
});
</script>

<style scoped>
.pro-table-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    overflow: hidden;
}

.pro-table-search {
    flex-shrink: 0;
}

.pro-table-card {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 16px;
    background-color: var(--el-bg-color-overlay);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    overflow: hidden;
    min-height: 0;
}

.pro-el-table {
    flex: 1;
    width: 100%;
    min-height: 0;
    --el-table-header-bg-color: var(--el-fill-color-light);
    --el-table-border-color: var(--el-border-color-lighter);
    --el-table-row-hover-bg-color: var(--el-fill-color);
}

:deep(.pro-pagination) {
    flex-shrink: 0;
}

:deep(.el-table__header th) {
    font-weight: 600;
    color: var(--el-text-color-primary);
}

:deep(.el-table__body tr.current-row > td) {
    background-color: var(--el-color-primary-light-9) !important;
}

/* ================= 真实有效的表格密度行高调节 ================= */
:deep(.el-table--large th.el-table__cell),
:deep(.el-table--large td.el-table__cell) {
    padding: 16px 0 !important;
}

:deep(.el-table--default th.el-table__cell),
:deep(.el-table--default td.el-table__cell) {
    padding: 10px 0 !important;
}

:deep(.el-table--small th.el-table__cell),
:deep(.el-table--small td.el-table__cell) {
    padding: 3px 0 !important;
}

:deep(.el-table--small .cell) {
    line-height: 20px;
    font-size: 13px;
}
</style>
