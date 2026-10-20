<!-- 
  ========================================================================
  自闭环单选框组物料: RadioWidget.vue
  职责: 自包含 el-radio-group 与 el-radio 渲染
  ========================================================================
-->
<template>
    <el-radio-group
        :model-value="modelValue"
        :disabled="disabled"
        @update:model-value="val => $emit('update:modelValue', val)"
    >
        <el-radio
            v-for="opt in optionsList"
            :key="opt.value"
            :value="opt.value"
        >
            {{ opt.label }}
        </el-radio>
    </el-radio-group>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    modelValue: {
        type: [String, Number, Boolean],
        default: '',
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

const optionsList = computed(() => (Array.isArray(props.options) ? props.options : []));
</script>
