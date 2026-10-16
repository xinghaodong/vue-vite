<template>
    <!-- 1. 下拉选择器 -->
    <el-select
        v-if="column.search?.el === 'select'"
        v-bind="{ ...handleSearchProps, ...placeholder, clearable }"
        v-model="_searchParam[column.search?.key ?? handleProp(column.prop)]"
        @keyup.enter="handleEnter"
    >
        <el-option
            v-for="(col, index) in column.search?.options ?? []"
            :key="index"
            :label="col[fieldNames.label]"
            :value="col[fieldNames.value]"
            :disabled="col.disabled"
        />
    </el-select>

    <!-- 2. 级联选择器 -->
    <el-cascader
        v-else-if="column.search?.el === 'cascader'"
        v-bind="{ ...handleSearchProps, ...placeholder, clearable }"
        v-model="_searchParam[column.search?.key ?? handleProp(column.prop)]"
        :options="column.search?.props?.options ?? []"
    />

    <!-- 3. 树选择器 -->
    <el-tree-select
        v-else-if="column.search?.el === 'tree-select'"
        v-bind="{ ...handleSearchProps, ...placeholder, clearable }"
        v-model="_searchParam[column.search?.key ?? handleProp(column.prop)]"
        :data="column.search?.props?.data ?? []"
    />

    <!-- 4. 其他输入类及日期组件 (input, date-picker, input-number, switch 等) -->
    <component
        v-else
        :is="column.search?.render ?? (componentMap[column.search?.el] || 'el-input')"
        v-bind="{ ...handleSearchProps, ...placeholder, clearable }"
        v-model="_searchParam[column.search?.key ?? handleProp(column.prop)]"
        @keyup.enter="handleEnter"
    />
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    column: {
        type: Object,
        default: () => ({})
    },
    searchParam: {
        type: Object,
        default: () => ({})
    }
});

const emit = defineEmits(['search']);

// 双向响应式代理
const _searchParam = computed(() => props.searchParam);

// 组件映射表
const componentMap = {
    input: 'el-input',
    'input-number': 'el-input-number',
    select: 'el-select',
    'select-v2': 'el-select-v2',
    'tree-select': 'el-tree-select',
    cascader: 'el-cascader',
    date: 'el-date-picker',
    time: 'el-time-picker',
    'time-select': 'el-time-select',
    switch: 'el-switch',
    slider: 'el-slider'
};

// 字段名映射兼容
const fieldNames = computed(() => {
    return {
        label: props.column.search?.props?.label || props.column.search?.fieldNames?.label || 'label',
        value: props.column.search?.props?.value || props.column.search?.fieldNames?.value || 'value',
        children: props.column.search?.props?.children || props.column.search?.fieldNames?.children || 'children'
    };
});

// 处理清除按钮
const clearable = computed(() => {
    const search = props.column.search;
    return search?.props?.clearable ?? (search?.defaultValue == null || search?.defaultValue === '');
});

// 处理 props 属性及事件
const handleSearchProps = computed(() => {
    const search = props.column.search;
    const label = props.column.label ?? '';
    const el = search?.el;

    // 默认日期格式处理
    let dateDefaultProps = {};
    if (el === 'date') {
        const type = search?.props?.type ?? 'date';
        dateDefaultProps = {
            type,
            valueFormat: search?.props?.valueFormat ?? (type.includes('time') ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD'),
            rangeSeparator: search?.props?.rangeSeparator ?? '至',
            startPlaceholder: search?.props?.startPlaceholder ?? '开始日期',
            endPlaceholder: search?.props?.endPlaceholder ?? '结束日期'
        };
    }

    return {
        ...dateDefaultProps,
        ...(search?.props ?? {})
    };
});

// 处理占位符 Placeholder
const placeholder = computed(() => {
    const search = props.column.search;
    if (['date', 'time'].includes(search?.el) && search?.props?.type?.includes('range')) {
        return {};
    }
    const label = props.column.label ?? '';
    const placeholderText = search?.props?.placeholder ?? (search?.el?.includes('select') || search?.el?.includes('date') ? `请选择${label}` : `请输入${label}`);
    return { placeholder: placeholderText };
});

// 提取实际绑定的 prop 属性名（兼容多级 a.b 结构）
const handleProp = (prop) => {
    if (!prop) return '';
    return prop.includes('.') ? prop.split('.').join('_') : prop;
};

// 回车触发搜索
const handleEnter = () => {
    emit('search');
};
</script>
