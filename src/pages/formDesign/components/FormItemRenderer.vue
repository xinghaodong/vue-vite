<!-- 递归表单项/容器解析渲染器 -->
<template>
    <!-- 1. 容器组件：栅格布局 (Grid) -->
    <div v-if="item.type === 'grid'" class="grid-container">
        <el-row :gutter="item.props?.gutter || 0">
            <el-col
                v-for="(col, colIndex) in item.props?.columns || []"
                :key="colIndex"
                :span="col.span"
            >
                <div class="grid-col-content">
                    <!-- 递归渲染列内部的子组件 -->
                    <FormItemRenderer
                        v-for="subItem in col.list || []"
                        :key="subItem.id"
                        :item="subItem"
                        :model-value="modelValue"
                        :options-map="optionsMap"
                        :loading-map="loadingMap"
                        :no-approval="noApproval"
                        @update:model-value="val => $emit('update:modelValue', val)"
                    />
                </div>
            </el-col>
        </el-row>
    </div>

    <!-- 2. 普通字段组件 -->
    <el-form-item
        v-else
        :label="item.props?.label"
        :prop="item.id"
        :required="item.props?.required"
        class="form-field-item"
    >
        <!-- 专用上传附件组件 -->
        <template v-if="item.type === 'upload'">
            <FileUploadWidget
                :model-value="modelValue[item.id] || []"
                :props-config="item.props"
                :disabled="isDisabled"
                :no-approval="noApproval"
                @update:model-value="val => handleValueChange(item.id, val)"
            />
        </template>

        <!-- 下拉选择组件 (支持静态与动态 options) -->
        <template v-else-if="item.type === 'select'">
            <el-select
                :model-value="modelValue[item.id]"
                v-bind="filteredProps"
                :placeholder="item.props?.placeholder"
                :disabled="isDisabled"
                :loading="loadingMap[item.id]"
                @update:model-value="val => handleValueChange(item.id, val)"
            >
                <el-option
                    v-for="opt in currentOptions"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                />
            </el-select>
        </template>

        <!-- 单选框组 -->
        <template v-else-if="item.type === 'radio'">
            <el-radio-group
                :model-value="modelValue[item.id]"
                v-bind="filteredProps"
                :disabled="isDisabled"
                @update:model-value="val => handleValueChange(item.id, val)"
            >
                <el-radio
                    v-for="opt in currentOptions"
                    :key="opt.value"
                    :value="opt.value"
                >
                    {{ opt.label }}
                </el-radio>
            </el-radio-group>
        </template>

        <!-- 多选框组 -->
        <template v-else-if="item.type === 'checkbox'">
            <el-checkbox-group
                :model-value="modelValue[item.id] || []"
                v-bind="filteredProps"
                :disabled="isDisabled"
                @update:model-value="val => handleValueChange(item.id, val)"
            >
                <el-checkbox
                    v-for="opt in currentOptions"
                    :key="opt.value"
                    :value="opt.value"
                >
                    {{ opt.label }}
                </el-checkbox>
            </el-checkbox-group>
        </template>

        <!-- 标准输入框/数字/开关/日期等直接通过 component 渲染 -->
        <component
            v-else
            :is="item.component || 'el-input'"
            :model-value="modelValue[item.id]"
            v-bind="filteredProps"
            :placeholder="item.props?.placeholder"
            :disabled="isDisabled"
            :controls-position="item.component === 'el-input-number' ? 'right' : undefined"
            :style="item.component === 'el-input-number' ? { width: '100%' } : {}"
            @update:model-value="val => handleValueChange(item.id, val)"
        />
    </el-form-item>
</template>

<script setup>
import { computed } from 'vue';
import FileUploadWidget from './widgets/FileUploadWidget.vue';

// 递归组件名称声明
defineOptions({
    name: 'FormItemRenderer',
});

const props = defineProps({
    item: {
        type: Object,
        required: true,
    },
    modelValue: {
        type: Object,
        default: () => ({}),
    },
    optionsMap: {
        type: Object,
        default: () => ({}),
    },
    loadingMap: {
        type: Object,
        default: () => ({}),
    },
    noApproval: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(['update:modelValue']);

// 处理值变更
const handleValueChange = (fieldId, value) => {
    const nextData = { ...props.modelValue, [fieldId]: value };
    emit('update:modelValue', nextData);
};

// 是否禁用
const isDisabled = computed(() => {
    if (props.noApproval) return true;
    return Boolean(props.item.props?.disabled);
});

// 计算选项列表（动态 API 缓存优先，其次静态 options）
const currentOptions = computed(() => {
    const dynamicOpts = props.optionsMap[props.item.id];
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
.grid-container {
    width: 100%;
}
.grid-col-content {
    min-height: 40px;
    padding: 2px 0;
}
</style>
