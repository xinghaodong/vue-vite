<!-- 
  ========================================================================
  自闭环多选框组物料: CheckboxWidget.vue
  职责: 自包含 el-checkbox-group 与 el-checkbox 渲染，默认保障安全数组模型
  ========================================================================
-->
<template>
    <el-checkbox-group
        :model-value="safeValue"
        :disabled="disabled"
        @update:model-value="val => $emit('update:modelValue', val)"
    >
        <el-checkbox
            v-for="opt in optionsList"
            :key="opt.value"
            :value="opt.value"
            :label="opt.value"
        >
            {{ opt.label }}
        </el-checkbox>
    </el-checkbox-group>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    modelValue: {
        type: Array,
        default: () => [],
    },
    options: {
        type: Array,
        default: () => [],
    },
    disabled: {
        type: Boolean,
        default: false,
    },
});

defineEmits(['update:modelValue']);

const safeValue = computed(() => (Array.isArray(props.modelValue) ? props.modelValue : []));
const optionsList = computed(() => (Array.isArray(props.options) ? props.options : []));
</script>
