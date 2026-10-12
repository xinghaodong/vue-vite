<!-- 动态表单总控渲染器 -->
<template>
    <el-form
        v-if="schema && schema.length > 0"
        ref="formRef"
        :rules="formRules"
        :model="innerData"
        :label-position="actualLabelPosition"
        :size="uiConfig?.size || 'default'"
        :label-width="actualLabelWidth"
        :class="['dynamic-form', { 'mobile-dynamic-form': isMobileMode }]"
    >
        <FormItemRenderer
            v-for="item in schema"
            :key="item.id"
            :item="item"
        />
    </el-form>
</template>

<script setup>
import { ref, reactive, watch, computed, shallowRef, provide } from 'vue';
import { oGet } from '@/utils/request';
import FormItemRenderer from './FormItemRenderer.vue';
import { formulaHelpers } from '../utils/formula.js';
import { traverseWidgets } from '../widgets/index.js';

const props = defineProps({
    schema: {
        type: Array,
        required: true,
        default: () => [],
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
        default: false,
    },
    deviceMode: {
        type: String,
        default: 'pc', // 'pc' | 'mobile'
    },
});

const emit = defineEmits(['update:modelValue']);

const formRef = ref(null);

// 移动端视口自适应配置
const isMobileMode = computed(() => props.deviceMode === 'mobile');
const actualLabelPosition = computed(() => (isMobileMode.value ? 'top' : props.uiConfig?.labelPosition || 'right'));
const actualLabelWidth = computed(() => (isMobileMode.value ? 'auto' : `${props.uiConfig?.labelWidth || 100}px`));

// 表单响应式数据
const innerData = ref({ ...props.modelValue });

// 选项与加载状态字典
const optionsMap = reactive({});
const loadingMap = reactive({});

// 监听外部 modelValue 变更同步到内部
watch(
    () => props.modelValue,
    newVal => {
        innerData.value = { ...newVal };
    },
    { deep: true },
);

// 内部数据变更同步给父组件
const handleUpdateModelValue = nextVal => {
    innerData.value = nextVal;
    emit('update:modelValue', nextVal);
};

// 字段值更新方法 (子组件通过 Context 直接调用)
const updateFieldValue = (fieldId, value) => {
    innerData.value[fieldId] = value;
    handleUpdateModelValue(innerData.value);
};

// 🌟 第二阶段：广播注入全局表单上下文 (消灭多层 Props Drilling)
provide('formContext', {
    formData: innerData,
    updateFieldValue,
    optionsMap,
    loadingMap,
    disabled: computed(() => props.noApproval),
    noApproval: computed(() => props.noApproval),
});

// 1. 扁平化收集所有实际叶子字段（包含容器内部，用于通用 API 加载与公式计算）
const flatFields = computed(() => {
    const list = [];
    traverseWidgets(props.schema, item => {
        if (!item.slots) {
            list.push(item);
        }
    });
    return list;
});

// 2. 仅收集顶层主表单字段（排除子表单内部字段，因为子表单内部字段属于独立的二维明细行数据模型）
const topLevelFormFields = computed(() => {
    const list = [];
    const walk = items => {
        if (!Array.isArray(items)) return;
        items.forEach(item => {
            if (!item) return;
            // 遇见子表单容器则停止向下深入，子表单行属于独立数据模型
            if (item.type === 'subform') return;
            if (!item.slots) {
                list.push(item);
            } else if (item.slots) {
                Object.values(item.slots).forEach(slotList => {
                    if (Array.isArray(slotList)) walk(slotList);
                });
            }
        });
    };
    walk(props.schema);
    return list;
});

// 3. 收集所有子表单容器物料（用于校验时明细行必填规则深度穿透）
const subformWidgets = computed(() => {
    const list = [];
    traverseWidgets(props.schema, item => {
        if (item.type === 'subform') {
            list.push(item);
        }
    });
    return list;
});

// 常用格式预设校验器字典
const presetValidators = {
    number: {
        pattern: /^[0-9]+$/,
        message: '必须为纯数字',
    },
    positiveInteger: {
        pattern: /^[1-9]\d*$/,
        message: '必须为大于0的正整数',
    },
    phone: {
        pattern: /^1[3-9]\d{9}$/,
        message: '请输入有效的11位手机号码',
    },
    email: {
        pattern: /^[\w.-]+@[\w.-]+\.\w+$/,
        message: '请输入有效的电子邮箱地址',
    },
    idCard: {
        pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/,
        message: '请输入有效的身份证号码',
    },
};

// 动态构建顶层主表单校验规则 (仅约束顶层表单字段，不污染子表单行数据)
const formRules = computed(() => {
    const rules = {};
    topLevelFormFields.value.forEach(item => {
        const itemRules = [];

        // 1. 必填校验
        if (item.props?.required) {
            itemRules.push({
                required: true,
                message: item.props.label ? `${item.props.label}不能为空` : '该字段不能为空',
                trigger: ['blur', 'change'],
            });
        }

        // 2. 格式校验 (ruleType)
        const ruleType = item.props?.ruleType;
        if (ruleType && ruleType !== 'none' && presetValidators[ruleType]) {
            itemRules.push({
                pattern: presetValidators[ruleType].pattern,
                message: item.props.label ? `${item.props.label}${presetValidators[ruleType].message}` : presetValidators[ruleType].message,
                trigger: ['blur', 'change'],
            });
        }

        if (itemRules.length > 0) {
            rules[item.id] = itemRules;
        }
    });
    return rules;
});

// 加载动态 API 选项与用户信息
const loadFieldOptions = async field => {
    // 纯配置驱动：由 Schema 属性显式声明（开启了默认当前人开关或配置了 /internalusers/getUserInfo 接口）
    const isCurrentUserTarget = Boolean(
        field.props?.defaultCurrentUser ||
        field.props?.apiUrl?.includes('/internalusers/getUserInfo')
    );

    if (isCurrentUserTarget) {
        // 场景 A: 表单已有用户ID (审批/查看历史已填数据场景)，根据ID反查用户详情回显
        if (innerData.value[field.id]) {
            const savedValue = innerData.value[field.id];
            try {
                const userRes = await oGet(`/internalusers/detail?id=${savedValue}`);
                const user = userRes.data || userRes;
                optionsMap[field.id] = [
                    {
                        label: user.name || user.realName || user.username || `用户(${savedValue})`,
                        value: savedValue,
                    },
                ];
            } catch (error) {
                optionsMap[field.id] = [{ label: `用户(${savedValue})`, value: savedValue }];
            }
            return;
        }

        // 场景 B: 表单当前无值 (新建申请填单场景)，自动调用 /internalusers/getUserInfo 回显登录人自己！
        if (!props.noApproval) {
            loadingMap[field.id] = true;
            try {
                const res = await oGet('/internalusers/getUserInfo');
                const currentUser = res.data || res;
                if (currentUser && currentUser.id) {
                    const userName = currentUser.name || currentUser.realName || currentUser.username || '当前用户';
                    optionsMap[field.id] = [
                        {
                            label: userName,
                            value: currentUser.id,
                        },
                    ];
                    // 自动给表单字段填入当前登录人 ID
                    innerData.value[field.id] = currentUser.id;
                    emit('update:modelValue', { ...innerData.value });
                }
            } catch (err) {
                console.error('自动拉取当前登录人信息失败:', err);
            } finally {
                loadingMap[field.id] = false;
            }
            return;
        }
    }

    if (!field.props?.apiUrl) return;

    loadingMap[field.id] = true;
    try {
        const res = await oGet(field.props.apiUrl);
        let data = [];
        if (Array.isArray(res)) {
            data = res;
        } else if (res.data && Array.isArray(res.data)) {
            data = res.data;
        } else if (res.list && Array.isArray(res.list)) {
            data = res.list;
        } else if (res.data) {
            data.push(res.data);
        }

        // 支持扁平数组与树形层级数据的通用递归规范化
        const formatTreeNodes = list => {
            if (!Array.isArray(list)) return [];
            return list.map(d => {
                const node = {
                    label: d.label || d.name || d.title || String(d),
                    value: d.value ?? d.id ?? d.code ?? d,
                };
                if (d.children && Array.isArray(d.children)) {
                    node.children = formatTreeNodes(d.children);
                }
                return node;
            });
        };

        const formatted = formatTreeNodes(data);
        optionsMap[field.id] = formatted;

        // 若仅有 1 项且当前无值时默认选中
        if (formatted.length === 1 && innerData.value[field.id] === undefined) {
            innerData.value[field.id] = formatted[0].value;
            emit('update:modelValue', { ...innerData.value });
        }
    } catch (err) {
        console.error(`加载数据源失败 [${field.props.apiUrl}]:`, err);
        optionsMap[field.id] = [];
    } finally {
        loadingMap[field.id] = false;
    }
};

// 监听 Schema 初始化动态加载与计算字段
let computedCleanups = [];
watch(
    () => props.schema,
    newSchema => {
        if (!newSchema || newSchema.length === 0) return;

        // 1. 加载 API 数据源与用户信息 (纯 Schema 配置驱动)
        flatFields.value.forEach(field => {
            const isCurrentUserTarget = Boolean(
                field.props?.defaultCurrentUser ||
                field.props?.apiUrl?.includes('/internalusers/getUserInfo')
            );

            if (field.props?.apiUrl || isCurrentUserTarget) {
                loadFieldOptions(field);
            }
        });

        // 2. 注册计算字段依赖
        computedCleanups.forEach(cleanup => cleanup());
        computedCleanups = [];

        flatFields.value.forEach(field => {
            if (field.props?.isComputed && field.props.dependencies?.length && field.props.computedExpression) {
                const unwatch = watch(
                    () => field.props.dependencies.map(dep => innerData.value[dep]),
                    newValues => {
                        try {
                            // 构建执行上下文，既提供依赖字段值，又注入公式函数库 (DATEDIF, SUM, MULTIPLY 等)
                            const context = {
                                ...formulaHelpers,
                                ...field.props.dependencies.reduce((acc, dep, idx) => {
                                    let val = newValues[idx];
                                    acc[dep] = val;
                                    // 兼容原生时间戳计算 (如果是日期字符串，额外注入带 _ts 后缀的时间戳)
                                    if (typeof val === 'string' && !isNaN(Date.parse(val))) {
                                        acc[`${dep}_ts`] = new Date(val).getTime();
                                    }
                                    return acc;
                                }, {}),
                            };

                            const exprFn = new Function('context', `with(context) { return ${field.props.computedExpression}; }`);
                            const result = exprFn(context);
                            let finalVal = '';
                            if (result !== undefined && result !== null && !Number.isNaN(result)) {
                                finalVal = Number.isFinite(result) ? (Number.isInteger(result) ? String(result) : result.toFixed(1)) : String(result);
                            }

                            if (innerData.value[field.id] !== finalVal) {
                                innerData.value[field.id] = finalVal;
                                emit('update:modelValue', { ...innerData.value });
                            }
                        } catch (e) {
                            console.error(`计算字段 ${field.id} 执行失败:`, e);
                        }
                    },
                    { immediate: true, deep: true },
                );
                computedCleanups.push(unwatch);
            }
        });
    },
    { immediate: true, deep: true },
);

// 对外暴露方法
defineExpose({
    async validate() {
        if (!formRef.value) return true;
        // 1. 优先校验顶层主表单
        await formRef.value.validate();

        // 2. 深度穿透校验所有子表单明细行中的必填项
        for (const subform of subformWidgets.value) {
            const rows = innerData.value[subform.id];
            const subName = subform.props?.label || '子表单';

            // 若子表单自身配置了必填且当前没有行数据
            if (subform.props?.required && (!Array.isArray(rows) || rows.length === 0)) {
                throw new Error(`请至少添加一条【${subName}】明细数据`);
            }

            if (Array.isArray(rows) && rows.length > 0) {
                // 收集该子表单内部定义的所有必填字段
                const requiredCols = [];
                traverseWidgets(subform.slots?.default || [], col => {
                    if (!col.slots && col.props?.required) {
                        requiredCols.push(col);
                    }
                });

                for (let rIndex = 0; rIndex < rows.length; rIndex++) {
                    const row = rows[rIndex];
                    for (const col of requiredCols) {
                        const val = row[col.id];
                        const isEmpty =
                            val === undefined ||
                            val === null ||
                            val === '' ||
                            (Array.isArray(val) && val.length === 0);
                        if (isEmpty) {
                            const colName = col.props?.label || '字段';
                            throw new Error(`【${subName}】第 ${rIndex + 1} 项的【${colName}】不能为空`);
                        }
                    }
                }
            }
        }
        return true;
    },
    resetFields() {
        formRef.value?.resetFields();
    },
    getFormData() {
        return innerData.value;
    },
    formData: innerData,
});
</script>

<style scoped>
.dynamic-form {
    width: 100%;
}

.mobile-dynamic-form {
    padding: 0 4px;
}

/* 移动端栅格自适应流式折行为 100% 单列 */
.mobile-dynamic-form :deep(.el-col) {
    max-width: 100% !important;
    flex: 0 0 100% !important;
    width: 100% !important;
}

/* 移动端标签与表单项紧凑排版 */
.mobile-dynamic-form :deep(.el-form-item) {
    margin-bottom: 14px;
}

.mobile-dynamic-form :deep(.el-form-item__label) {
    font-size: 13px;
    font-weight: 500;
    line-height: 1.4;
    padding-bottom: 4px;
    color: #475569;
}

/* 移动端卡片容器阴影与边距紧凑化 */
.mobile-dynamic-form :deep(.el-card) {
    border-radius: 8px;
    margin-bottom: 12px;
}

.mobile-dynamic-form :deep(.el-card__body) {
    padding: 12px;
}
</style>
