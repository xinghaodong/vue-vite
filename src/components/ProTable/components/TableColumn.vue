<template>
    <!-- 1. 多级表头 / 树形嵌套列 (递归渲染) -->
    <el-table-column
        v-if="column.isShow !== false && column.children && column.children.length"
        v-bind="column"
        :align="column.align || 'center'"
    >
        <template #default>
            <TableColumn
                v-for="child in column.children"
                :key="child.prop || child.label"
                :column="child"
            >
                <template v-for="slotName in Object.keys($slots)" #[slotName]="scope">
                    <slot :name="slotName" v-bind="scope" />
                </template>
            </TableColumn>
        </template>
    </el-table-column>

    <!-- 2. 特殊列（多选 selection、序号 index、展开行 expand） -->
    <el-table-column
        v-else-if="column.isShow !== false && ['selection', 'index', 'expand'].includes(column.type)"
        v-bind="column"
        :width="column.width || (column.type === 'selection' ? 50 : 60)"
        :align="column.align || 'center'"
        :selectable="column.selectable"
    >
        <template v-if="column.type === 'expand'" #default="scope">
            <slot name="expand" v-bind="scope" />
        </template>
    </el-table-column>

    <!-- 3. 常规业务列 (纯 template 模板驱动，告别生硬的 h() 渲染函数) -->
    <el-table-column
        v-else-if="column.isShow !== false"
        v-bind="column"
        :min-width="column.minWidth || 100"
        :show-overflow-tooltip="column.showOverflowTooltip ?? true"
    >
        <!-- 表头自定义渲染 -->
        <template v-if="$slots[`${column.prop}Header`] || column.renderHeader" #header="scope">
            <slot v-if="$slots[`${column.prop}Header`]" :name="`${column.prop}Header`" v-bind="scope" />
            <component v-else-if="column.renderHeader" :is="column.renderHeader(scope)" />
        </template>

        <!-- 单元格内容渲染 -->
        <template #default="scope">
            <!-- (1) 业务页面具名作用域插槽优先（最高自由度） -->
            <slot
                v-if="$slots[column.slotName || column.prop]"
                :name="column.slotName || column.prop"
                v-bind="scope"
            />

            <!-- (2) 动态通用组件 (基于 <component :is="...">，支持 el-tag, el-link, 自定义组件等) -->
            <component
                v-else-if="column.component"
                :is="getDynamicComponent(column, scope.row)"
                v-bind="getComponentProps(column, scope.row, scope.$index)"
                v-on="getComponentEvents(column, scope.row, scope.$index)"
            >
                {{ getCellValue(column, scope.row) }}
            </component>

            <!-- (3) 兼容函数式 render -->
            <component
                v-else-if="column.render && typeof column.render === 'function'"
                :is="column.render(scope)"
            />

            <!-- (4) 自定义纯函数 Formatter -->
            <span v-else-if="column.formatter">
                {{ column.formatter(scope.row, scope.column, scope.row[column.prop], scope.$index) }}
            </span>

            <!-- (5) 默认常规纯文本展示（含空值兜底） -->
            <span v-else>
                {{ getCellValue(column, scope.row) }}
            </span>
        </template>
    </el-table-column>
</template>

<script setup>
import { resolveComponent } from 'vue';

defineOptions({
    name: 'TableColumn'
});

const props = defineProps({
    column: {
        type: Object,
        required: true,
        default: () => ({})
    }
});

/**
 * 解析动态组件：支持字符串（'el-link' / 'a' / 'span'）或实际 Vue 组件对象
 */
const getDynamicComponent = (column, row) => {
    const comp = typeof column.component === 'function' ? column.component(row) : column.component;
    if (typeof comp === 'string') {
        // 原生 HTML 标签直接使用小写标签名，避免 Vue 报 resolveComponent 找不到组件警告
        const nativeTags = ['span', 'a', 'div', 'p', 'b', 'strong', 'i', 'button', 'small'];
        if (nativeTags.includes(comp.toLowerCase())) {
            return comp.toLowerCase();
        }
        try {
            return resolveComponent(comp);
        } catch {
            return comp;
        }
    }
    return comp;
};

/**
 * 获取动态组件 Props（支持静态对象或函数 (row, index) => ({...})）
 */
const getComponentProps = (column, row, index) => {
    if (!column.props) return {};
    return typeof column.props === 'function' ? column.props(row, index) : column.props;
};

/**
 * 获取动态组件事件监听集合（支持静态对象或函数 (row, index) => ({ click: ... })）
 */
const getComponentEvents = (column, row, index) => {
    const events = {};
    if (column.events) {
        const customEvents = typeof column.events === 'function' ? column.events(row, index) : column.events;
        if (customEvents && typeof customEvents === 'object') {
            Object.assign(events, customEvents);
        }
    }
    return events;
};

/**
 * 获取单元格纯文本值与兜底
 */
const getCellValue = (column, row) => {
    if (column.formatter && typeof column.formatter === 'function') {
        return column.formatter(row);
    }
    const rawVal = row[column.prop];
    return (rawVal !== null && rawVal !== undefined && rawVal !== '') ? rawVal : '--';
};
</script>
