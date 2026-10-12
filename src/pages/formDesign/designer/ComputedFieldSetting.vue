<!-- 
  ========================================================================
  文件名称: ComputedFieldSetting.vue
  所属模块: 表单设计器 - 联动与计算配置中心 (Dual Mode Computed Setting)
  功能说明:
    提供“简易向导模式 + 自定义公式模式”双模式配置：
    1. 简易向导模式 (Wizard)：针对日期算天数、数值乘积、多项求和提供 0 代码下拉配置；
    2. 自定义公式模式 (Custom)：参考排他网关交互，提供表达式输入框 + 字段胶囊 Tag + 函数胶囊 Tag。
  ========================================================================
-->
<template>
    <div class="computed-field-setting">
        <!-- 1. 计算字段总开关 -->
        <el-form-item label="计算字段">
            <el-switch v-model="item.props.isComputed" @change="handleSwitchChange" />
        </el-form-item>

        <template v-if="item.props.isComputed">
            <!-- 2. 模式切换单选按钮 -->
            <el-form-item label="计算模式">
                <el-radio-group v-model="computeMode" size="small" @change="handleModeChange">
                    <el-radio-button value="wizard">简易向导</el-radio-button>
                    <el-radio-button value="custom">高级公式</el-radio-button>
                </el-radio-group>
            </el-form-item>

            <!-- ==============================
                 模式 A: 简易向导模式 (Wizard) 
                 ============================== -->
            <div v-if="computeMode === 'wizard'" class="wizard-panel">
                <el-form-item label="计算场景">
                    <el-select v-model="wizardData.scene" placeholder="选择预设计算场景" style="width: 100%" @change="applyWizardFormula">
                        <el-option label="日期相减算天数 (如请假/出差)" value="dateDiff" />
                        <el-option label="数值乘法 (如单价 × 数量 = 总价)" value="multiply" />
                        <el-option label="多个数值累加 (如多项津贴求和)" value="sum" />
                        <el-option label="子表单明细汇总 (跨行求和)" value="subformSum" />
                    </el-select>
                </el-form-item>

                <!-- 场景 1: 日期算天数 -->
                <template v-if="wizardData.scene === 'dateDiff'">
                    <el-form-item label="开始日期">
                        <el-select v-model="wizardData.startDate" placeholder="选择开始时间字段" style="width: 100%" @change="applyWizardFormula">
                            <el-option
                                v-for="f in availableFields"
                                :key="f.id"
                                :label="f.props?.label || f.id"
                                :value="f.id"
                            />
                        </el-select>
                    </el-form-item>
                    <el-form-item label="结束日期">
                        <el-select v-model="wizardData.endDate" placeholder="选择结束时间字段" style="width: 100%" @change="applyWizardFormula">
                            <el-option
                                v-for="f in availableFields"
                                :key="f.id"
                                :label="f.props?.label || f.id"
                                :value="f.id"
                            />
                        </el-select>
                    </el-form-item>
                    <el-form-item label="包含当天">
                        <el-switch v-model="wizardData.includeToday" active-text="+1天 (首尾算在内)" @change="applyWizardFormula" />
                    </el-form-item>
                </template>

                <!-- 场景 2: 数值乘法 -->
                <template v-if="wizardData.scene === 'multiply'">
                    <el-form-item label="乘数字段一">
                        <el-select v-model="wizardData.multiA" placeholder="选择第一个数值字段" style="width: 100%" @change="applyWizardFormula">
                            <el-option
                                v-for="f in availableFields"
                                :key="f.id"
                                :label="f.props?.label || f.id"
                                :value="f.id"
                            />
                        </el-select>
                    </el-form-item>
                    <el-form-item label="乘数字段二">
                        <el-select v-model="wizardData.multiB" placeholder="选择第二个数值字段" style="width: 100%" @change="applyWizardFormula">
                            <el-option
                                v-for="f in availableFields"
                                :key="f.id"
                                :label="f.props?.label || f.id"
                                :value="f.id"
                            />
                        </el-select>
                    </el-form-item>
                </template>

                <!-- 场景 3: 多项求和 -->
                <template v-if="wizardData.scene === 'sum'">
                    <el-form-item label="求和字段">
                        <el-select v-model="wizardData.sumFields" multiple placeholder="勾选参与相加的字段" style="width: 100%" @change="applyWizardFormula">
                            <el-option
                                v-for="f in availableFields"
                                :key="f.id"
                                :label="f.props?.label || f.id"
                                :value="f.id"
                            />
                        </el-select>
                    </el-form-item>
                </template>

                <!-- 场景 4: 子表单跨行汇总求和 -->
                <template v-if="wizardData.scene === 'subformSum'">
                    <el-form-item label="目标子表单">
                        <el-select
                            v-model="wizardData.targetSubform"
                            placeholder="请选择要汇总的子表单"
                            style="width: 100%"
                            @change="handleSubformChange"
                        >
                            <el-option
                                v-for="sub in availableSubforms"
                                :key="sub.id"
                                :label="sub.label"
                                :value="sub.id"
                            />
                        </el-select>
                    </el-form-item>
                    <el-form-item label="汇总数值列">
                        <el-select
                            v-model="wizardData.targetSubformCols"
                            multiple
                            collapse-tags
                            collapse-tags-tooltip
                            placeholder="请勾选需要汇总的列 (支持多选合并)"
                            style="width: 100%"
                            :disabled="!wizardData.targetSubform"
                            @change="applyWizardFormula"
                        >
                            <el-option
                                v-for="col in currentSubformColumns"
                                :key="col.id"
                                :label="`${col.label} (${col.id})`"
                                :value="col.id"
                            />
                        </el-select>
                    </el-form-item>
                </template>

                <!-- 向导模式下预览生成的公式 -->
                <div class="wizard-preview-card">
                    <div class="preview-title">
                        <span>自动生成的公式:</span>
                        <el-button link type="primary" size="small" @click="switchToCustomMode">
                            转为自定义编辑 ↗
                        </el-button>
                    </div>
                    <code class="preview-code">{{ item.props.computedExpression || '尚未选择必要字段' }}</code>
                </div>
            </div>

            <!-- ==============================
                 模式 B: 自定义公式模式 (参考排他网关交互) 
                 ============================== -->
            <div v-if="computeMode === 'custom'" class="custom-panel">
                <!-- 依赖字段多选 -->
                <el-form-item label="依赖字段">
                    <el-select
                        v-model="item.props.dependencies"
                        multiple
                        placeholder="选择计算所依赖的字段"
                        style="width: 100%"
                    >
                        <el-option
                            v-for="field in availableFields"
                            :key="field.id"
                            :label="field.props?.label || field.id"
                            :value="field.id"
                        />
                        <el-option
                            v-for="sub in availableSubforms"
                            :key="sub.id"
                            :label="`${sub.label} [子表单]`"
                            :value="sub.id"
                        />
                    </el-select>
                </el-form-item>

                <!-- 公式输入框 -->
                <el-form-item label="计算公式">
                    <el-input
                        ref="exprInputRef"
                        v-model="item.props.computedExpression"
                        type="textarea"
                        :rows="2"
                        placeholder="例如: DATEDIF(startDate, endDate) + 1"
                    />
                </el-form-item>

                <!-- 可用字段快捷胶囊列表 (同排他网关交互) -->
                <div class="tag-section">
                    <div class="tag-label">表单字段 (点击插入变量):</div>
                    <div class="quick-tags-container">
                        <el-tag
                            v-for="f in availableFields"
                            :key="f.id"
                            size="small"
                            class="pill-tag field-pill"
                            @click="insertText(f.id)"
                        >
                            {{ f.props?.label || f.id }}
                        </el-tag>
                        <el-tag
                            v-for="sub in availableSubforms"
                            :key="sub.id"
                            size="small"
                            type="warning"
                            class="pill-tag field-pill"
                            @click="insertText(sub.id)"
                        >
                            {{ sub.label }} [子表单]
                        </el-tag>
                    </div>
                </div>

                <!-- 常用业务函数快捷胶囊列表 -->
                <div class="tag-section">
                    <div class="tag-label">常用函数 (点击插入模板):</div>
                    <div class="quick-tags-container">
                        <el-tag
                            v-for="fn in presetFunctions"
                            :key="fn.name"
                            size="small"
                            type="success"
                            class="pill-tag fn-pill"
                            :title="fn.desc"
                            @click="insertFunctionTemplate(fn)"
                        >
                            {{ fn.label }}
                        </el-tag>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue';
import { presetFunctions } from '../utils/formula.js';

const props = defineProps({
    item: {
        type: Object,
        required: true,
    },
    availableFields: {
        type: Array,
        default: () => [],
    },
    availableSubforms: {
        type: Array,
        default: () => [],
    },
});

const exprInputRef = ref(null);

// 计算模式：'wizard' (向导) | 'custom' (自定义)
const computeMode = ref(props.item.props.computeMode || 'wizard');

// 向导配置数据对象
const wizardData = reactive({
    scene: props.item.props.wizardConfig?.scene || 'dateDiff',
    startDate: props.item.props.wizardConfig?.startDate || '',
    endDate: props.item.props.wizardConfig?.endDate || '',
    includeToday: props.item.props.wizardConfig?.includeToday ?? true,
    multiA: props.item.props.wizardConfig?.multiA || '',
    multiB: props.item.props.wizardConfig?.multiB || '',
    sumFields: props.item.props.wizardConfig?.sumFields || [],
    targetSubform: props.item.props.wizardConfig?.targetSubform || '',
    targetSubformCols: Array.isArray(props.item.props.wizardConfig?.targetSubformCols)
        ? props.item.props.wizardConfig.targetSubformCols
        : (props.item.props.wizardConfig?.targetSubformCol ? [props.item.props.wizardConfig.targetSubformCol] : []),
});

// 当前选中子表单内部的可用列清单
const currentSubformColumns = computed(() => {
    if (!wizardData.targetSubform) return [];
    const target = props.availableSubforms.find(s => s.id === wizardData.targetSubform);
    return target?.columns || [];
});

// 切换子表单时默认全选内部所有列（多列合并累加）
const handleSubformChange = () => {
    wizardData.targetSubformCols = currentSubformColumns.value.map(c => c.id);
    applyWizardFormula();
};

// 开关变更
const handleSwitchChange = val => {
    if (val) {
        if (!props.item.props.dependencies) props.item.props.dependencies = [];
        if (!props.item.props.computedExpression) {
            applyWizardFormula();
        }
    }
};

// 模式切换
const handleModeChange = val => {
    props.item.props.computeMode = val;
    if (val === 'wizard') {
        applyWizardFormula();
    }
};

// 从向导切换到自定义模式
const switchToCustomMode = () => {
    computeMode.value = 'custom';
    props.item.props.computeMode = 'custom';
};

// 根据向导选择自动生成公式与依赖
const applyWizardFormula = () => {
    if (computeMode.value !== 'wizard') return;

    let expr = '';
    const deps = [];

    if (wizardData.scene === 'dateDiff') {
        if (wizardData.startDate && wizardData.endDate) {
            deps.push(wizardData.startDate, wizardData.endDate);
            expr = wizardData.includeToday
                ? `DATEDIF(${wizardData.startDate}, ${wizardData.endDate}) + 1`
                : `DATEDIF(${wizardData.startDate}, ${wizardData.endDate})`;
        }
    } else if (wizardData.scene === 'multiply') {
        if (wizardData.multiA && wizardData.multiB) {
            deps.push(wizardData.multiA, wizardData.multiB);
            expr = `MULTIPLY(${wizardData.multiA}, ${wizardData.multiB})`;
        }
    } else if (wizardData.scene === 'sum') {
        if (wizardData.sumFields && wizardData.sumFields.length > 0) {
            deps.push(...wizardData.sumFields);
            expr = `SUM(${wizardData.sumFields.join(', ')})`;
        }
    } else if (wizardData.scene === 'subformSum') {
        if (wizardData.targetSubform && wizardData.targetSubformCols && wizardData.targetSubformCols.length > 0) {
            deps.push(wizardData.targetSubform);
            if (wizardData.targetSubformCols.length === 1) {
                expr = `SUM_SUBFORM(${wizardData.targetSubform}, '${wizardData.targetSubformCols[0]}')`;
            } else {
                const colsFormatted = JSON.stringify(wizardData.targetSubformCols).replace(/"/g, "'");
                expr = `SUM_SUBFORM(${wizardData.targetSubform}, ${colsFormatted})`;
            }
        }
    }

    props.item.props.dependencies = Array.from(new Set(deps));
    props.item.props.computedExpression = expr;
    props.item.props.computeMode = 'wizard';
    props.item.props.wizardConfig = { ...wizardData };
};

// 在公式输入框中插入字符
const insertText = text => {
    if (!props.item.props.computedExpression) {
        props.item.props.computedExpression = text;
    } else {
        props.item.props.computedExpression += ` ${text}`;
    }
    // 自动补充依赖字段
    if (!props.item.props.dependencies) props.item.props.dependencies = [];
    if (!props.item.props.dependencies.includes(text)) {
        props.item.props.dependencies.push(text);
    }
};

// 插入函数模板
const insertFunctionTemplate = fn => {
    props.item.props.computedExpression = fn.template;
};
</script>

<style scoped>
.computed-field-setting {
    width: 100%;
}

.wizard-panel {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px 12px;
    margin-bottom: 12px;
}

.wizard-preview-card {
    margin-top: 8px;
    padding: 8px 10px;
    background: #ffffff;
    border: 1px dashed #cbd5e1;
    border-radius: 4px;
}

.preview-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: #64748b;
    margin-bottom: 4px;
}

.preview-code {
    font-family: monospace;
    font-size: 12px;
    color: #0369a1;
    word-break: break-all;
}

.custom-panel {
    width: 100%;
}

.tag-section {
    margin-top: 8px;
    margin-bottom: 8px;
}

.tag-label {
    font-size: 12px;
    color: #64748b;
    margin-bottom: 6px;
}

.quick-tags-container {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.pill-tag {
    cursor: pointer;
    user-select: none;
    transition: all 0.2s ease;
}

.field-pill {
    background-color: #eff6ff;
    border-color: #bfdbfe;
    color: #1d4ed8;
}

.field-pill:hover {
    background-color: #dbeafe;
    border-color: #93c5fd;
    transform: translateY(-1px);
}

.fn-pill:hover {
    transform: translateY(-1px);
}
</style>
