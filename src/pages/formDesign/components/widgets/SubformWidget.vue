<!-- 
  ========================================================================
  文件名称: SubformWidget.vue
  所属模块: 表单渲染器业务物料库 (components/widgets)
  适用组件: 子表单动态运行态组件 (subform)
  功能说明:
    负责在真机预览和真实业务审批/填单环境中渲染多行动态子表单：
    1. 【子表单】标准卡片/块级模式 (默认): 内部作为一个完整的微型表单画布，
       天然支持栅格布局 (Grid)、多列多行与字段自带 Label，每项作为独立表单卡片呈现；
    2. 【表格表单】紧凑表格模式 (可选): 针对简单数据列场景提供 Excel 风格的紧凑表格呈现；
    3. 响应式二维数组模型: 每一行独立收集列字段值，自动双向聚合回写主表单 formData[subformId]；
    4. 动态增行、复制行、删除行与行列极值保护。
  ========================================================================
-->
<template>
    <div class="subform-runtime-card">
        <!-- 1. 表头与顶部操作栏 -->
        <div class="subform-top-bar">
            <div class="subform-title-group">
                <span class="subform-main-title">{{ item.props?.label || '子表单' }}</span>
                <span class="subform-count-badge">共 {{ tableRows.length }} 项</span>
            </div>
            <!-- 右侧快捷增行按钮 (只读态隐藏) -->
            <el-button
                v-if="!isFormDisabled && !isReadOnly && canAddMore"
                type="primary"
                size="small"
                plain
                :icon="Plus"
                @click="handleAddRow"
            >
                {{ item.props?.addButtonText || '添加' }}
            </el-button>
        </div>

        <!-- 2. 【默认形态：子表单卡片/块级模式】 (用户截图下半部分标准规范，天然支持栅格与丰富排版) -->
        <div v-if="layoutMode !== 'table'" class="subform-card-container">
            <!-- 空数据状态 -->
            <div v-if="tableRows.length === 0" class="empty-data-block">
                <el-empty :image-size="48" description="暂无明细数据，请点击下方或右上角按钮添加" />
            </div>

            <!-- 动态卡片列表渲染 -->
            <div v-else class="row-items-list">
                <SubformRowItem
                    v-for="(row, rIndex) in tableRows"
                    :key="row._rowKey || rIndex"
                    :template-items="templateItems"
                    :row-data="row"
                    :row-index="rIndex"
                    :is-disabled="isFormDisabled"
                    :is-read-only="isReadOnly"
                    :parent-context="formContext"
                    @update-cell="handleRowCellChange"
                    @copy="handleCopyRow"
                    @remove="handleRemoveRow"
                />
            </div>

            <!-- 卡片模式数值汇总统计栏 -->
            <div v-if="item.props?.showSummary !== false && tableRows.length > 0 && summaryResults.length > 0" class="card-summary-bar">
                <div class="summary-label">
                    <el-icon><Odometer /></el-icon>
                    <span>汇总合计：</span>
                </div>
                <div class="summary-tags">
                    <el-tag
                        v-for="s in summaryResults"
                        :key="s.id"
                        type="success"
                        effect="plain"
                        class="summary-tag"
                    >
                        {{ s.label }}: <strong>{{ s.sum }}</strong>
                    </el-tag>
                </div>
            </div>
        </div>

        <!-- 3. 【可选形态：表格表单模式】 (用户截图上半部分紧凑 Excel 表格) -->
        <div v-else class="table-container">
            <table class="subform-custom-table">
                <thead>
                    <tr>
                        <th v-if="item.props?.showIndex !== false" class="th-index">#</th>
                        <th
                            v-for="col in columns"
                            :key="col.id"
                            :style="{ width: col.props?.colWidth ? `${col.props.colWidth}px` : undefined }"
                            class="th-column"
                        >
                            <span v-if="col.props?.required" class="required-star">*</span>
                            {{ col.props?.label || '未命名字段' }}
                        </th>
                        <th v-if="!isFormDisabled && !isReadOnly" class="th-action">操作</th>
                    </tr>
                </thead>

                <tbody>
                    <tr v-if="tableRows.length === 0">
                        <td :colspan="totalColSpan" class="empty-data-cell">
                            <el-empty :image-size="48" description="暂无明细数据" />
                        </td>
                    </tr>
                    <tr
                        v-for="(row, rIndex) in tableRows"
                        :key="row._rowKey || rIndex"
                        class="table-data-row"
                    >
                        <td v-if="item.props?.showIndex !== false" class="td-index">
                            {{ rIndex + 1 }}
                        </td>
                        <td
                            v-for="col in columns"
                            :key="col.id"
                            class="td-field-cell"
                        >
                            <component
                                :is="getFieldComponent(col.type)"
                                :model-value="row[col.id]"
                                v-bind="getFilteredColProps(col)"
                                :placeholder="col.props?.placeholder"
                                :options="getColOptions(col)"
                                :disabled="isFormDisabled || isReadOnly || col.props?.disabled"
                                :size="'small'"
                                @update:model-value="val => handleCellValueChange(rIndex, col.id, val)"
                            />
                        </td>
                        <td v-if="!isFormDisabled && !isReadOnly" class="td-action">
                            <div class="action-btn-group">
                                <el-button
                                    link
                                    type="primary"
                                    size="small"
                                    :icon="CopyDocument"
                                    @click="handleCopyRow(rIndex)"
                                />
                                <el-button
                                    link
                                    type="danger"
                                    size="small"
                                    :icon="Delete"
                                    @click="handleRemoveRow(rIndex)"
                                />
                            </div>
                        </td>
                    </tr>
                </tbody>

                <tfoot v-if="item.props?.showSummary !== false && tableRows.length > 0 && hasNumericColumns">
                    <tr class="table-summary-row">
                        <td v-if="item.props?.showIndex !== false" class="td-summary-label">合计</td>
                        <td
                            v-for="col in columns"
                            :key="col.id"
                            class="td-summary-val"
                        >
                            <span v-if="col.type === 'number'" class="sum-number">
                                {{ formatSumValue(calculateColSum(col.id), col) }}
                            </span>
                            <span v-else class="sum-dash">-</span>
                        </td>
                        <td v-if="!isFormDisabled && !isReadOnly" class="td-summary-action"></td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <!-- 4. 底部居中大增行按钮 -->
        <div v-if="!isFormDisabled && !isReadOnly && canAddMore" class="subform-bottom-add">
            <el-button
                type="primary"
                plain
                size="small"
                :icon="Plus"
                style="width: 100%; border-style: dashed"
                @click="handleAddRow"
            >
                {{ item.props?.addButtonText || '添加' }}
            </el-button>
        </div>
    </div>
</template>

<script setup>
import { computed, inject, ref, unref, onMounted } from 'vue';
import { Plus, Delete, CopyDocument, Odometer } from '@element-plus/icons-vue';
import { getFieldComponent } from '../../widgets/index.js';
import SubformRowItem from './SubformRowItem.vue';

const props = defineProps({
    item: {
        type: Object,
        required: true,
    },
});

// 注入顶层表单上下文
const formContext = inject('formContext', {
    formData: ref({}),
    updateFieldValue: () => {},
    optionsMap: {},
    loadingMap: {},
    disabled: ref(false),
    noApproval: ref(false),
});

// 计算是否禁用与只读
const isFormDisabled = computed(() => Boolean(unref(formContext.disabled)));
const isReadOnly = computed(() => Boolean(unref(formContext.noApproval)));

// 布局形态: 默认 'card' (卡片/块级子表单)，可选 'table' (紧凑表格表单)
const layoutMode = computed(() => props.item.props?.layoutMode || 'card');

// 模板子节点 (作为当前行渲染的结构原型，支持栅格及任意普通物料)
const templateItems = computed(() => props.item.slots?.default || []);

// 提取当前表格的所有列定义 (用于表格模式)
const columns = computed(() => {
    const rawList = props.item.slots?.default || [];
    const flattened = [];
    rawList.forEach(node => {
        if (!node) return;
        if (!node.slots) {
            flattened.push(node);
        } else {
            Object.values(node.slots).forEach(slotItems => {
                if (Array.isArray(slotItems)) {
                    slotItems.forEach(child => {
                        if (child && !child.slots) {
                            flattened.push(child);
                        }
                    });
                }
            });
        }
    });
    return flattened;
});

// 当前表格数据列表 (安全从 formContext 取值，保障二维数组结构)
const tableRows = computed({
    get: () => {
        const raw = formContext.formData?.value?.[props.item.id];
        return Array.isArray(raw) ? raw : [];
    },
    set: val => {
        formContext.updateFieldValue(props.item.id, val);
    },
});

// 是否还能继续添加行 (受 maxRows 限制)
const canAddMore = computed(() => {
    const max = Number(props.item.props?.maxRows) || 50;
    return tableRows.value.length < max;
});

// 计算总列跨度 (用于表格模式空状态 colspan)
const totalColSpan = computed(() => {
    let span = columns.value.length;
    if (props.item.props?.showIndex !== false) span++;
    if (!isFormDisabled.value && !isReadOnly.value) span++;
    return span;
});

// 是否包含数字列
const hasNumericColumns = computed(() => columns.value.some(col => col.type === 'number'));

// 过滤每个列组件的 props (表格模式用)
const getFilteredColProps = col => {
    const raw = { ...col.props };
    delete raw.label;
    delete raw.required;
    delete raw.options;
    delete raw.apiUrl;
    delete raw.isComputed;
    delete raw.dependencies;
    delete raw.computedExpression;
    return raw;
};

// 获取列组件的数据选项列表
const getColOptions = col => {
    const dynamicOpts = formContext.optionsMap?.[col.id];
    if (dynamicOpts && Array.isArray(dynamicOpts)) return dynamicOpts;
    return col.props?.options || [];
};

// 创建一个新行的默认数据对象
const createEmptyRow = () => {
    const row = { _rowKey: `row_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` };
    // 递归提取所有字段赋默认值
    columns.value.forEach(col => {
        row[col.id] = col.props?.defaultValue ?? '';
    });
    return row;
};

// 添加一行
const handleAddRow = () => {
    if (!canAddMore.value) return;
    const current = [...tableRows.value];
    current.push(createEmptyRow());
    tableRows.value = current;
};

// 复制某一行
const handleCopyRow = index => {
    if (!canAddMore.value) return;
    const current = [...tableRows.value];
    const source = current[index];
    if (!source) return;
    const copy = { ...source, _rowKey: `row_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` };
    current.splice(index + 1, 0, copy);
    tableRows.value = current;
};

// 删除某一行
const handleRemoveRow = index => {
    const current = [...tableRows.value];
    current.splice(index, 1);
    tableRows.value = current;
};

// 单元格数据变更处理 (来自表格模式)
const handleCellValueChange = (rowIndex, fieldId, value) => {
    const current = [...tableRows.value];
    if (current[rowIndex]) {
        current[rowIndex] = { ...current[rowIndex], [fieldId]: value };
        tableRows.value = current;
    }
};

// 接收来自子表单卡片行组件 (SubformRowItem) 的变更
const handleRowCellChange = ({ rowIndex, fieldId, value }) => {
    handleCellValueChange(rowIndex, fieldId, value);
};

// 计算某数字列的总和
const calculateColSum = fieldId => {
    return tableRows.value.reduce((acc, row) => {
        const num = Number(row[fieldId]);
        return acc + (isNaN(num) ? 0 : num);
    }, 0);
};

// 格式化求和数值
const formatSumValue = (sum, col) => {
    const precision = col?.props?.precision ?? 2;
    return Number(sum).toFixed(precision);
};

// 卡片模式下的数值列汇总清单
const summaryResults = computed(() => {
    const numCols = columns.value.filter(c => c.type === 'number');
    return numCols.map(c => ({
        id: c.id,
        label: c.props?.label || '数值',
        sum: formatSumValue(calculateColSum(c.id), c),
    }));
});

// 初始化校验：若已有 minRows 配置且当前为空，则自动补充初始行
onMounted(() => {
    const minRows = Number(props.item.props?.minRows) || 0;
    if (minRows > 0 && tableRows.value.length < minRows) {
        const initList = [];
        for (let i = 0; i < minRows; i++) {
            initList.push(createEmptyRow());
        }
        tableRows.value = initList;
    }
});
</script>

<style scoped>
.subform-runtime-card {
    width: 100%;
    margin-bottom: 16px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 14px;
    box-sizing: border-box;
}

.subform-top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.subform-title-group {
    display: flex;
    align-items: center;
    gap: 8px;
}

.subform-main-title {
    font-size: 15px;
    font-weight: 600;
    color: #1e293b;
}

.subform-count-badge {
    font-size: 12px;
    color: #64748b;
    background: #e2e8f0;
    padding: 1px 8px;
    border-radius: 10px;
}

/* 卡片模式样式 */
.subform-card-container {
    width: 100%;
}

.empty-data-block {
    background: #ffffff;
    border: 1px dashed #cbd5e1;
    border-radius: 6px;
    padding: 16px;
    margin-bottom: 10px;
}

.row-items-list {
    width: 100%;
}

.card-summary-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 10px;
}

.summary-label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    font-weight: 600;
    color: #475569;
}

.summary-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.summary-tag {
    font-size: 12px;
}

/* 表格模式样式 */
.table-container {
    width: 100%;
    overflow-x: auto;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    margin-bottom: 10px;
}

.subform-custom-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.subform-custom-table th {
    background: #f1f5f9;
    color: #475569;
    font-weight: 600;
    padding: 8px 10px;
    border: 1px solid #e2e8f0;
    text-align: left;
    white-space: nowrap;
}

.th-index {
    width: 48px;
    text-align: center !important;
}

.th-action {
    width: 80px;
    text-align: center !important;
}

.required-star {
    color: #f56c6c;
    margin-right: 2px;
}

.subform-custom-table td {
    padding: 6px 10px;
    border: 1px solid #e2e8f0;
    vertical-align: middle;
}

.td-index {
    text-align: center;
    color: #64748b;
    font-weight: 500;
}

.td-action {
    text-align: center;
}

.action-btn-group {
    display: flex;
    justify-content: center;
    gap: 4px;
}

.table-summary-row {
    background: #f8fafc;
    font-weight: 600;
}

.td-summary-label {
    text-align: center;
    color: #3b82f6;
}

.td-summary-val {
    color: #16a34a;
}

.subform-bottom-add {
    margin-top: 6px;
}
</style>
