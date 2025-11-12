<template>
    <div>
        <!-- 用 el-input 显示千分位，模拟输入框效果 -->
        <el-input
            v-model="displayValue"
            v-bind="$attrs"
            :style="{ textAlign: textAlign }"
            class="my-input-number"
            :class="{ 'text-left': textAlign === 'left' }"
            @input="handleInput"
            @blur="handleBlur"
        >
            <!-- 插槽转发 -->
            <template v-for="(_, slotName) in $slots" #[slotName]="slotProps" :key="slotName">
                <slot :name="slotName" v-bind="slotProps"></slot>
            </template>
        </el-input>
    </div>
</template>

<script setup>
import { defineProps, ref, watch } from 'vue';

// 接收父组件的 v-model 值
const modelValue = defineModel();

const props = defineProps({
    textAlign: {
        type: String,
        default: 'center',
        validator: val => ['left', 'center', 'right'].includes(val),
    },
    precision: {
        type: Number,
        default: 2,
        validator: val => val >= 0 && Number.isInteger(val), // 确保是非负整数
    },
});

// 显示用的千分位字符串 输入框直接绑定这个值
const displayValue = ref('');

// 当父组件的 modelValue 变化时，同步显示千分位
watch(
    modelValue,
    newVal => {
        if (newVal === null || newVal === undefined || isNaN(Number(newVal))) {
            displayValue.value = '';
            return;
        }
        // 转换为带千分位的字符串 保留指定精度
        displayValue.value = Number(newVal).toLocaleString('zh-CN', {
            minimumFractionDigits: props.precision,
            maximumFractionDigits: props.precision,
        });
    },
    { immediate: true },
); // 初始化时执行一次

// 处理输入事件 用户输入时
const handleInput = str => {
    // 过滤非数字和小数点（保留合法字符）
    const pureStr = str.replace(/[^\d.]/g, '');
    // 限制只能有一个小数点
    const dotIndex = pureStr.indexOf('.');
    if (dotIndex !== -1) {
        const afterDot = pureStr.slice(dotIndex + 1);
        // 限制小数位数不超过 precision
        if (afterDot.length > props.precision) {
            displayValue.value = pureStr.slice(0, dotIndex + 1 + props.precision);
            return;
        }
    }
    displayValue.value = pureStr;
};

// 失去焦点时格式化并同步给父组件 转为数字）
const handleBlur = () => {
    if (!displayValue.value) {
        modelValue.value = null; // 空值处理
        return;
    }
    // 移除千分位（虽然输入时已过滤，但粘贴可能带逗号）
    const num = Number(displayValue.value.replace(/,/g, ''));
    if (isNaN(num)) {
        modelValue.value = null;
        displayValue.value = '';
        return;
    }
    // 保留指定精度的数字
    const fixedNum = Number(num.toFixed(props.precision));
    modelValue.value = fixedNum;
    // 重新格式化显示（确保千分位正确）
    displayValue.value = fixedNum.toLocaleString('zh-CN', {
        minimumFractionDigits: props.precision,
        maximumFractionDigits: props.precision,
    });
};
</script>

<style lang="css"></style>
