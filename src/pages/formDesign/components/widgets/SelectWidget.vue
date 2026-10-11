<!-- 
  ========================================================================
  自闭环下拉选择物料: SelectWidget.vue
  职责: 自包含 el-select 与 el-option 循环渲染，支持外部 options / loading / 远程数据源
  ========================================================================
-->
<template>
    <el-select
        :model-value="modelValue"
        :placeholder="placeholder || '请选择'"
        :disabled="disabled"
        :loading="loading"
        :clearable="clearable !== false"
        :filterable="filterable"
        style="width: 100%"
        @update:model-value="val => $emit('update:modelValue', val)"
    >
        <el-option
            v-for="opt in optionsList"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
        />
    </el-select>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    modelValue: {
        type: [String, Number, Array],
        default: '',
    },
    options: {
        type: Array,
        default: () => [],
    },
    placeholder: {
        type: String,
        default: '',
    },
    disabled: {
        type: Boolean,
        default: false,
    },
    loading: {
        type: Boolean,
        default: false,
    },
    clearable: {
        type: Boolean,
        default: true,
    },
    filterable: {
        type: Boolean,
        default: false,
    },
});

defineEmits(['update:modelValue']);

const optionsList = computed(() => (Array.isArray(props.options) ? props.options : []));
</script>
