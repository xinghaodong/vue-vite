<!-- 递归表单项/容器解析渲染器 -->
<template>
    <!-- 1. 🌟 所有容器物料统合运行时渲染 (基于统一 slots 协议，零 if/else 特判) -->
    <div v-if="item.slots" class="container-runtime-box">
        <!-- 1.1 业务自闭环运行态容器 (如 SubformWidget 负责多行明细数据数组与汇总计算) -->
        <component
            :is="getRuntimeContainerComponent(item.type)"
            v-if="getRuntimeContainerComponent(item.type)"
            :item="item"
        />

        <!-- 1.2 纯净排版容器 (Grid / Card / Tabs 递归渲染子插槽) -->
        <component
            :is="getContainerComponent(item.type)"
            v-else
            :props-data="item.props"
        >
            <template v-for="(slotList, slotKey) in item.slots" :key="slotKey" #[slotKey]>
                <!-- 纯净递归: 依赖 Context 直连，无需任何业务数据与事件透传 -->
                <FormItemRenderer
                    v-for="subItem in slotList || []"
                    :key="subItem.id"
                    :item="subItem"
                />
            </template>
        </component>
    </div>

    <!-- 2. 普通字段组件 (零 if/else 分支，纯动态物料驱动) -->
    <el-form-item
        v-else
        :label="item.props?.label"
        :prop="item.id"
        :required="item.props?.required"
        class="form-field-item"
    >
        <component
            :is="getFieldComponent(item.type)"
            :model-value="fieldValue"
            v-bind="filteredProps"
            :options="currentOptions"
            :loading="isLoading"
            :placeholder="item.props?.placeholder"
            :disabled="isDisabled"
            :no-approval="isNoApproval"
            :props-config="item.props"
            :controls-position="item.component === 'el-input-number' ? 'right' : undefined"
            @update:model-value="val => handleValueChange(item.id, val)"
        />
    </el-form-item>
</template>

<script setup>
import { computed, inject, ref, unref } from 'vue';
import { getContainerComponent, getRuntimeContainerComponent, getFieldComponent } from '../widgets/index.js';

// 递归组件名称声明
defineOptions({
    name: 'FormItemRenderer',
});

const props = defineProps({
    item: {
        type: Object,
        required: true,
    },
});

// 🌟 第二阶段：直接注入顶层表单上下文 (消灭 3~4 层 Props Drilling)
const formContext = inject('formContext', {
    formData: ref({}),
    updateFieldValue: () => {},
    optionsMap: {},
    loadingMap: {},
    disabled: ref(false),
    noApproval: ref(false),
});

// 当前字段绑定值 (安全响应式获取)
const fieldValue = computed(() => formContext.formData?.value?.[props.item.id]);

// 处理值变更 (直接调用 Context 注入的方法，告别层层 $emit)
const handleValueChange = (fieldId, value) => {
    formContext.updateFieldValue(fieldId, value);
};

// 是否禁用
const isDisabled = computed(() => {
    if (unref(formContext.disabled)) return true;
    return Boolean(props.item.props?.disabled);
});

// 是否处于无审批/查看态 (使用 unref 精准取值，防止 Ref 对象被当做 truthy)
const isNoApproval = computed(() => Boolean(unref(formContext.noApproval)));

// 是否加载中
const isLoading = computed(() => Boolean(formContext.loadingMap?.[props.item.id]));

// 计算选项列表（动态 API 缓存优先，其次静态 options）
const currentOptions = computed(() => {
    const dynamicOpts = formContext.optionsMap?.[props.item.id];
    if (dynamicOpts && Array.isArray(dynamicOpts)) {
        return dynamicOpts;
    }
    return props.item.props?.options || [];
});

// 过滤传递给底层组件的 props
const filteredProps = computed(() => {
    const raw = { ...props.item.props };
    // 排除特定外层属性
    delete raw.label;
    delete raw.required;
    delete raw.options;
    delete raw.apiUrl;
    delete raw.isComputed;
    delete raw.dependencies;
    delete raw.computedExpression;
    return raw;
});
</script>

<style scoped>
.form-field-item {
    margin-bottom: 18px;
    width: 100%;
}
/* 统一保证所有输入控件撑满栅格容器，使用 :not 排除滑块内置附属输入框 */
.form-field-item :deep(.el-cascader),
.form-field-item :deep(.el-date-editor),
.form-field-item :deep(.el-select),
.form-field-item :deep(.el-slider),
.form-field-item :deep(.el-input-number:not(.el-slider__input)) {
    width: 100% !important;
}
.container-runtime-box {
    margin-bottom: 18px;
    width: 100%;
}
</style>
