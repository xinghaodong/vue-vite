<!-- 表单渲染器 -->
<template>
    <el-form
        v-if="enhancedSchema.length > 0"
        ref="formRef"
        :rules="formRules"
        :model="innerData"
        :label-position="uiConfig?.labelPosition || 'right'"
        :size="uiConfig?.size || 'default'"
        :label-width="`${uiConfig?.labelWidth || 100}px`"
        class="dynamic-form"
    >
        <template v-for="(item, index) in enhancedSchema" :key="item.id">
            <!-- 栅格布局 -->
            <div v-if="item.type === 'grid'" class="grid-container">
                <el-row :gutter="item.props.gutter">
                    <el-col v-for="(col, colIndex) in item.props.columns" :key="colIndex" :span="col.span">
                        <div class="grid-col-content">
                            <template v-for="(colItem, colItemIndex) in col.list" :key="colItem.id">
                                <el-form-item :label="colItem.props.label" :prop="colItem.id" :required="colItem.props.required" style="margin-bottom: 16px">
                                    <component
                                        :is="colItem.component"
                                        v-model="innerData[colItem.id]"
                                        v-bind="getComponentProps(colItem)"
                                        :placeholder="colItem.props.placeholder"
                                        :loading="colItem.loading"
                                    >
                                        <!-- 下拉选项 -->
                                        <template v-if="colItem.type === 'select'">
                                            <el-option v-for="option in colItem.options" :key="option.value" :label="option.label" :value="option.value" />
                                        </template>
                                        <!-- 单选 -->
                                        <template v-if="colItem.type === 'radio'">
                                            <el-radio v-for="option in colItem.props.options" :key="option.value" :label="option.value">
                                                {{ option.label }}
                                            </el-radio>
                                        </template>
                                        <!-- 多选 -->
                                        <template v-if="colItem.type === 'checkbox'">
                                            <el-checkbox v-for="option in colItem.props.options" :key="option.value" :label="option.value">
                                                {{ option.label }}
                                            </el-checkbox>
                                        </template>
                                    </component>
                                </el-form-item>
                            </template>
                        </div>
                    </el-col>
                </el-row>
            </div>

            <!-- 普通组件 -->
            <el-form-item v-else :label="item.props.label" :prop="item.id" :required="item.props.required" style="margin-bottom: 16px">
                <component :is="item.component" v-model="innerData[item.id]" v-bind="getComponentProps(item)" :placeholder="item.props.placeholder" :loading="item.loading">
                    <!-- 下拉选项（支持动态加载） -->
                    <template v-if="item.type === 'select'">
                        <el-option v-for="option in item.options" :key="option.value" :label="option.label" :value="option.value" />
                    </template>
                    <!-- 单选 -->
                    <template v-if="item.type === 'radio'">
                        <el-radio v-for="option in item.props.options" :key="option.value" :label="option.value">
                            {{ option.label }}
                        </el-radio>
                    </template>
                    <!-- 多选 -->
                    <template v-if="item.type === 'checkbox'">
                        <el-checkbox v-for="option in item.props.options" :key="option.value" :label="option.value">
                            {{ option.label }}
                        </el-checkbox>
                    </template>
                </component>
            </el-form-item>
        </template>
    </el-form>
</template>

<script setup>
import { oGet } from '@/utils/request';
import { ref, reactive, watch, onMounted, getCurrentInstance, computed, nextTick } from 'vue';
const { proxy } = getCurrentInstance();
const formRef = ref(null);

const props = defineProps({
    schema: {
        type: Array,
        required: true,
    },
    uiConfig: {
        type: Object,
        default: () => ({}),
    },
    modelValue: {
        type: Object,
        default: () => ({}),
    },
    noApproval: {
        type: Boolean,
        default: true,
    },
});

const emit = defineEmits(['update:modelValue']);

// 内部数据
const innerData = ref({ ...props.modelValue });

// 动态生成校验规则
const formRules = computed(() => {
    const rules = {};
    const processItem = item => {
        if (item.props?.required) {
            rules[item.id] = [
                {
                    required: true,
                    message: item.props.label ? `${item.props.label}不能为空` : '该字段不能为空',
                    trigger: ['blur', 'change'],
                },
            ];
        }
    };

    enhancedSchema.forEach(item => {
        if (item.type === 'grid') {
            item.props.columns.forEach(col => {
                col.list.forEach(colItem => {
                    processItem(colItem);
                });
            });
        } else {
            processItem(item);
        }
    });

    return rules;
});

// 加载 API 数据源
const loadApiOptions = async item => {
    if (!item.props.apiUrl) return;
    item.loading = true;
    try {
        const res = await oGet(item.props.apiUrl);
        let data = [];
        if (Array.isArray(res)) {
            data = res;
        } else if (res.data && Array.isArray(res.data)) {
            data = res.data;
        } else if (res.list && Array.isArray(res.list)) {
            data = res.list;
        } else {
            data.push(res.data);
        }
        // 默认取 label/value，可以扩展字段映射
        item.options = data.map(d => ({
            label: d.label || d.name || d.title || String(d),
            value: d.value || d.id || d.code || d,
        }));
        // 如果只有一项的话就默认选中
        if (item.options.length == 1) {
            innerData.value[item.id] = item.options[0].value;
        }
    } catch (error) {
        console.error(`加载数据源失败 ${item.props.apiUrl}:`, error);
        item.options = [];
    } finally {
        item.loading = false;
    }
};

// 获取组件属性
const getComponentProps = item => {
    const propsCol = { ...item.props };
    // 检查 propsCol 自身没有disabled 属性
    // if (!propsCol.hasOwnProperty('disabled')) {
    //     propsCol.disabled = props.noApproval;
    // }
    if (propsCol.disabled === false) {
        propsCol.disabled = props.noApproval;
    }

    // 删除不需要传递给组件的属性
    // delete props.label;
    // delete props.options;
    // delete props.apiUrl;
    return propsCol;
};

// 监听外部数据变化
watch(
    () => props.modelValue,
    newVal => {
        innerData.value = { ...newVal };
    },
    { deep: true },
);

// 监听内部数据变化，同步到外部
watch(
    innerData,
    newVal => {
        // 避免循环，检查是否有实际变化
        const hasChanges = Object.keys(newVal).some(key => newVal[key] !== props.modelValue[key]);
        if (hasChanges) {
            emit('update:modelValue', { ...newVal }); // 浅拷贝发送
        }
    },
    { deep: true },
);

// 增强 schema，添加 options 和 loading 状态
let enhancedSchema = reactive([]);

watch(
    () => props.schema,
    async newSchema => {
        if (!newSchema || newSchema.length === 0) return;

        // 清空并重新构建
        enhancedSchema.length = 0; //  清空数组

        // 复制并增强每个组件
        for (let item of newSchema) {
            let newItem;
            if (item.type === 'grid') {
                newItem = {
                    ...item,
                    props: {
                        ...item.props,
                        columns: item.props.columns.map(col => ({
                            ...col,
                            list: col.list.map(colItem => ({
                                ...colItem,
                                options: colItem.props?.options || [],
                                loading: false,
                            })),
                        })),
                    },
                };
            } else {
                newItem = {
                    ...item,
                    options: item.props?.options || [],
                    loading: false,
                };
            }
            enhancedSchema.push(newItem);
        }
        console.log('enhancedSchema:', enhancedSchema);

        // 加载动态数据源
        for (let item of enhancedSchema) {
            if (item.type === 'grid') {
                for (let col of item.props.columns) {
                    for (let colItem of col.list) {
                        if (colItem.type === 'select' && colItem.props.apiUrl) {
                            await loadApiOptions(colItem);
                        }
                    }
                }
            } else if (item.type === 'select' && item.props.apiUrl) {
                await loadApiOptions(item);
            }
        }
        setupComputedFields(); // 设置计算字段
    },
    { immediate: true, deep: true },
);

const setupComputedFields = () => {
    // 辅助函数：处理单个字段的计算逻辑
    const processField = field => {
        if (field.props?.isComputed && field.props.dependencies?.length && field.props.computedExpression) {
            watch(
                () => field.props.dependencies.map(dep => innerData.value[dep]),
                newValues => {
                    try {
                        // 构建上下文：{ fieldId: value, ... }
                        const context = field.props.dependencies.reduce((acc, dep, idx) => {
                            let val = newValues[idx];
                            if (typeof val === 'string' && !isNaN(Date.parse(val))) {
                                val = new Date(val).getTime(); // 日期字符串转时间戳
                            } else if (val instanceof Date) {
                                val = val.getTime(); // Date 对象转时间戳
                            }
                            acc[dep] = val;
                            return acc;
                        }, {});
                        // 使用 new Function 执行表达式
                        const exprFn = new Function('context', `with(context) { return ${field.props.computedExpression}; }`);
                        const result = exprFn(context);
                        innerData.value[field.id] = Number.isFinite(result) ? result.toFixed(1) : '';
                    } catch (error) {
                        console.error(`计算字段 ${field.id} 失败:`, error);
                        innerData.value[field.id] = '计算错误';
                    }
                },
                { immediate: true, deep: true },
            );
        }
    };

    // 遍历 enhancedSchema，处理非 grid 和 grid 内的字段
    enhancedSchema.forEach(item => {
        if (item.type !== 'grid') {
            processField(item); // 处理普通字段
        } else {
            // 处理 grid 内的字段
            item.props.columns.forEach(col => {
                col.list.forEach(field => {
                    processField(field); // 处理 grid 内的每个字段
                });
            });
        }
    });
};

defineExpose({
    async validate() {
        await formRef.value.validate();
    },
});
</script>

<style scoped>
.dynamic-form {
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
