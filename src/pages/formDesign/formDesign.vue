<template>
    <div class="form-design-container">
        <!-- 左侧组件列表 -->
        <div class="component-list">
            <div class="section-header">
                <h4 style="margin: 0px">组件列表</h4>
            </div>
            <div class="section-content">
                <draggable :list="componentList" :group="{ name: 'form-items', pull: 'clone', put: false }" :sort="false" :clone="cloneComponent" item-key="type" :animation="200">
                    <template #item="{ element }">
                        <div class="component-item" @click="addComponent(element)">
                            <el-icon>
                                <component :is="element.icon"></component>
                            </el-icon>
                            <span>{{ element.label }}</span>
                        </div>
                    </template>
                </draggable>
                <!-- 栅格布局组件 -->
                <draggable
                    :list="[gridLayoutComponent]"
                    :group="{ name: 'form-items', pull: 'clone', put: false }"
                    :sort="false"
                    :clone="cloneComponent"
                    item-key="type"
                    :animation="200"
                >
                    <template #item="{ element }">
                        <div class="component-item" @click="addComponent(element)">
                            <el-icon><Grid /></el-icon>
                            <span>{{ element.label }}</span>
                        </div>
                    </template>
                </draggable>
            </div>
        </div>

        <!-- 中间设计区域 -->
        <div class="design-area">
            <div class="section-header">
                <h4 style="margin: 0px">{{ formConfig.name }}</h4>
            </div>
            <div class="section-content">
                <div class="form-canvas">
                    <el-form style="height: 100%; width: 100%" :model="formData" :label-width="formConfig.labelWidth + 'px'">
                        <draggable
                            style="width: 100%; height: 100%"
                            v-model="formItems"
                            item-key="id"
                            ghost-class="ghost"
                            handle=".drag-handle"
                            @end="onDragEnd"
                            :animation="200"
                            @drop="onDrop"
                            @dragover.prevent
                            group="form-items"
                        >
                            <template #item="{ element, index }">
                                <div>
                                    <!-- 栅格布局组件 -->
                                    <div
                                        v-if="element.type === 'grid'"
                                        class="form-item-wrapper grid-container"
                                        :class="{ active: currentItem?.id === element.id }"
                                        @click="selectItem(element)"
                                    >
                                        <el-icon class="drag-handle"><Rank /></el-icon>
                                        <el-row :gutter="element.props.gutter">
                                            <el-col v-for="(col, colIndex) in element.props.columns" :key="colIndex" :span="col.span">
                                                <div
                                                    class="grid-col-content"
                                                    :class="{ 'grid-col-active': currentGridCol?.colIndex === colIndex && currentItem?.id === element.id }"
                                                    @click.stop="selectGridCol(element, colIndex)"
                                                >
                                                    <draggable v-model="col.list" item-key="id" ghost-class="ghost" group="form-items" :animation="200">
                                                        <template #item="{ element: colElement, index: colElementIndex }">
                                                            <div
                                                                class="form-item-wrapper"
                                                                :class="{ active: currentColItem?.id === colElement.id }"
                                                                @click.stop="selectColItem(colElement, element, colIndex)"
                                                            >
                                                                <component :is="colElement.component" v-bind="colElement.props"></component>
                                                                <el-icon class="delete-icon" @click.stop="deleteColItem(colIndex, colElementIndex, element)"><Delete /></el-icon>
                                                            </div>
                                                        </template>
                                                    </draggable>
                                                    <div v-if="col.list.length === 0" class="empty-tip grid-empty-tip">拖拽组件到此处</div>
                                                </div>
                                            </el-col>
                                        </el-row>
                                        <el-icon class="delete-icon" @click.stop="deleteItem(index)"><Delete /></el-icon>
                                    </div>
                                    <!-- 普通组件 -->
                                    <div v-else class="form-item-wrapper" :class="{ active: currentItem?.id === element.id }" @click="selectItem(element)">
                                        <el-icon class="drag-handle"><Rank /></el-icon>
                                        <el-form-item :label="element.props.label" :required="element.props.required">
                                            <component :is="element.component" v-bind="element.props"></component>
                                        </el-form-item>
                                        <el-icon class="delete-icon" @click.stop="deleteItem(index)"><Delete /></el-icon>
                                    </div>
                                </div>
                            </template>
                            <template #footer v-if="formItems.length === 0">
                                <div class="empty-tip">请从左侧拖拽组件到此处</div>
                            </template>
                        </draggable>
                    </el-form>
                </div>
            </div>
        </div>

        <!-- 右侧配置面板 -->
        <div class="config-panel">
            <div class="section-header" style="padding: 7px 16px; height: auto">
                <el-tabs v-model="activeTab">
                    <el-tab-pane label="表单配置" name="form"></el-tab-pane>
                    <el-tab-pane label="组件配置" name="component"></el-tab-pane>
                    <el-tab-pane label="栅格配置" name="grid" v-if="currentItem && currentItem.type === 'grid'"></el-tab-pane>
                </el-tabs>
            </div>
            <div class="section-content">
                <!-- 表单配置 -->
                <div v-if="activeTab === 'form'" class="form-config">
                    <el-form label-width="80px" size="mini">
                        <el-form-item label="表单名称" size="mini">
                            <el-input v-model="formConfig.name"></el-input>
                        </el-form-item>
                        <el-form-item label="标签宽度">
                            <el-input-number v-model="formConfig.labelWidth" :min="50" :max="200"></el-input-number>
                        </el-form-item>
                        <el-form-item label="表单尺寸">
                            <el-radio-group v-model="formConfig.size">
                                <el-radio-button label="large">大</el-radio-button>
                                <el-radio-button label="default">中</el-radio-button>
                                <el-radio-button label="small">小</el-radio-button>
                            </el-radio-group>
                        </el-form-item>
                        <el-form-item label="标签位置">
                            <el-radio-group v-model="formConfig.labelPosition">
                                <el-radio-button label="left">左对齐</el-radio-button>
                                <el-radio-button label="right">右对齐</el-radio-button>
                                <el-radio-button label="top">顶部对齐</el-radio-button>
                            </el-radio-group>
                        </el-form-item>
                    </el-form>
                </div>

                <!-- 组件配置 -->
                <div v-if="activeTab === 'component'" class="component-config">
                    <div v-if="currentItem">
                        <el-form label-width="100px">
                            <el-form-item label="标签文本" v-if="currentItem.type !== 'grid'">
                                <el-input v-model="currentItem.props.label"></el-input>
                            </el-form-item>
                            <el-form-item label="占位提示" v-if="currentItem.type !== 'grid'">
                                <el-input v-model="currentItem.props.placeholder"></el-input>
                            </el-form-item>
                            <el-form-item label="是否必填" v-if="currentItem.type !== 'grid'" required>
                                <el-switch v-model="currentItem.props.required"></el-switch>
                            </el-form-item>
                            <el-form-item label="是否禁用" v-if="currentItem.type !== 'grid'">
                                <el-switch v-model="currentItem.props.disabled"></el-switch>
                            </el-form-item>

                            <!-- 针对不同组件类型的特定配置 -->
                            <template v-if="currentItem.type === 'input'">
                                <el-form-item label="最大长度">
                                    <el-input-number v-model="currentItem.props.maxlength"></el-input-number>
                                </el-form-item>
                                <el-form-item label="显示计数">
                                    <el-switch v-model="currentItem.props.showWordLimit"></el-switch>
                                </el-form-item>
                            </template>

                            <template v-if="currentItem.type === 'select'">
                                <el-form-item label="选项">
                                    <div v-for="(option, idx) in currentItem.props.options" :key="idx" class="option-item">
                                        <el-input v-model="option.label" placeholder="选项名称" class="option-input"></el-input>
                                        <el-input v-model="option.value" placeholder="选项值" class="option-input"></el-input>
                                        <el-button @click="removeOption(idx)" type="danger" size="small" circle>
                                            <el-icon><Delete /></el-icon>
                                        </el-button>
                                    </div>
                                    <el-button @click="addOption" type="primary" size="small">添加选项</el-button>
                                </el-form-item>
                                <el-form-item label="多选">
                                    <el-switch v-model="currentItem.props.multiple"></el-switch>
                                </el-form-item>
                            </template>
                        </el-form>
                    </div>
                    <div v-else class="empty-tip">请选择要配置的组件</div>
                </div>

                <!-- 栅格配置 -->
                <div v-if="activeTab === 'grid' && currentItem && currentItem.type === 'grid'" class="grid-config">
                    <el-form label-width="100px">
                        <el-form-item label="栅格间隔">
                            <el-input-number v-model="currentItem.props.gutter" :min="0" :max="40" :step="5"></el-input-number>
                        </el-form-item>
                        <el-form-item label="列配置">
                            <div v-for="(col, idx) in currentItem.props.columns" :key="idx" class="column-config">
                                <div class="column-header">
                                    <span>列 {{ idx + 1 }}</span>
                                    <el-button @click="removeGridColumn(idx)" type="danger" size="small" circle v-if="currentItem.props.columns.length > 1">
                                        <el-icon><Delete /></el-icon>
                                    </el-button>
                                </div>
                                <el-form-item label="宽度占比">
                                    <el-slider v-model="col.span" :min="1" :max="24" :step="1" show-stops></el-slider>
                                    <div class="span-display">{{ col.span }}/24</div>
                                </el-form-item>
                            </div>
                            <el-button @click="addGridColumn" type="primary" size="small" :disabled="currentItem.props.columns.length >= 4">添加列</el-button>
                        </el-form-item>
                    </el-form>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import draggable from 'vuedraggable/src/vuedraggable';
import { Delete, Rank, Edit, Select, Switch, Calendar, Document, List, Menu, Grid } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

// 组件列表数据
const componentList = [
    { type: 'input', label: '单行文本', icon: 'Edit', component: 'el-input' },
    { type: 'select', label: '下拉选择', icon: 'Select', component: 'el-select' },
    { type: 'switch', label: '开关', icon: 'Switch', component: 'el-switch' },
    { type: 'date-picker', label: '日期选择器', icon: 'Calendar', component: 'el-date-picker' },
    { type: 'radio', label: '单选框组', icon: 'List', component: 'el-radio-group' },
    { type: 'checkbox', label: '多选框组', icon: 'Menu', component: 'el-checkbox-group' },
];

// 栅格布局组件
const gridLayoutComponent = {
    type: 'grid',
    label: '栅格布局',
    icon: 'Grid',
    component: 'el-row',
};

// 表单数据
const formData = reactive({});
const formItems = ref([]);
const currentItem = ref(null);
const currentGridCol = ref(null); // 当前选中的栅格列
const currentColItem = ref(null); // 当前选中的栅格列中的组件
const activeTab = ref('form');

// 表单配置
const formConfig = reactive({
    name: '未命名表单',
    labelWidth: 100,
    size: 'default',
    labelPosition: 'right',
});

// 克隆组件
const cloneComponent = item => {
    return createComponentConfig(item);
};

// 拖拽结束
const onDragEnd = () => {
    // 可以在这里添加拖拽结束后的逻辑
};

// 处理拖拽放置
const onDrop = event => {
    // 使用draggable组件的内部处理，不需要手动处理
    event.preventDefault();
};

// 添加组件
const addComponent = item => {
    const newItem = createComponentConfig(item);
    formItems.value.push(newItem);
    selectItem(newItem);
    ElMessage.success(`已添加${item.label}组件`);
};

// 创建组件配置
const createComponentConfig = item => {
    const baseConfig = {
        id: Date.now(),
        component: item.component,
        type: item.type,
        props: {
            label: item.label,
            placeholder: `请输入${item.label}`,
            required: false,
            disabled: false,
        },
    };

    // 根据组件类型添加特定配置
    switch (item.type) {
        case 'input':
            baseConfig.props.maxlength = 100;
            baseConfig.props.showWordLimit = true;
            break;
        case 'textarea':
            baseConfig.props.type = 'textarea';
            baseConfig.props.rows = 3;
            baseConfig.props.maxlength = 300;
            baseConfig.props.showWordLimit = true;
            break;
        case 'select':
            baseConfig.props.options = [
                { label: '选项1', value: 'option1' },
                { label: '选项2', value: 'option2' },
            ];
            baseConfig.props.multiple = false;
            break;
        case 'radio':
            baseConfig.props.options = [
                { label: '选项1', value: 'option1' },
                { label: '选项2', value: 'option2' },
            ];
            break;
        case 'checkbox':
            baseConfig.props.options = [
                { label: '选项1', value: 'option1' },
                { label: '选项2', value: 'option2' },
            ];
            break;
        case 'date-picker':
            baseConfig.props.type = 'date';
            baseConfig.props.placeholder = '请选择日期';
            break;
        case 'grid':
            baseConfig.props.gutter = 20;
            baseConfig.props.columns = [
                { span: 12, list: [] },
                { span: 12, list: [] },
            ];
            break;
    }

    return baseConfig;
};

// 选择组件
const selectItem = item => {
    currentItem.value = item;
    currentGridCol.value = null;
    currentColItem.value = null;
    activeTab.value = item.type === 'grid' ? 'grid' : 'component';
};

// 选择栅格列
const selectGridCol = (gridItem, colIndex) => {
    currentItem.value = gridItem;
    currentGridCol.value = { colIndex };
    currentColItem.value = null;
    activeTab.value = 'grid';
};

// 选择栅格列中的组件
const selectColItem = (colElement, gridItem, colIndex) => {
    currentItem.value = gridItem;
    currentGridCol.value = { colIndex };
    currentColItem.value = colElement;
    activeTab.value = 'component';
};

// 删除组件
const deleteItem = index => {
    if (currentItem.value && currentItem.value.id === formItems.value[index].id) {
        currentItem.value = null;
        currentGridCol.value = null;
        currentColItem.value = null;
    }
    formItems.value.splice(index, 1);
    ElMessage.success('已删除组件');
};

// 删除栅格列中的组件
const deleteColItem = (colIndex, itemIndex, gridItem) => {
    if (currentColItem.value && currentColItem.value.id === gridItem.props.columns[colIndex].list[itemIndex].id) {
        currentColItem.value = null;
    }
    gridItem.props.columns[colIndex].list.splice(itemIndex, 1);
    ElMessage.success('已删除组件');
};

// 添加栅格列
const addGridColumn = () => {
    if (!currentItem.value || currentItem.value.type !== 'grid') return;

    const columns = currentItem.value.props.columns;
    if (columns.length >= 4) {
        ElMessage.warning('最多支持4列');
        return;
    }

    // 重新计算每列的宽度，保持总宽度为24
    const newColCount = columns.length + 1;
    const baseSpan = Math.floor(24 / newColCount);
    const remainder = 24 % newColCount;

    // 更新现有列的宽度
    columns.forEach((col, index) => {
        col.span = baseSpan + (index < remainder ? 1 : 0);
    });

    // 添加新列
    columns.push({
        span: baseSpan,
        list: [],
    });

    ElMessage.success('已添加新列');
};

// 删除栅格列
const removeGridColumn = index => {
    if (!currentItem.value || currentItem.value.type !== 'grid') return;

    const columns = currentItem.value.props.columns;
    if (columns.length <= 1) {
        ElMessage.warning('至少保留一列');
        return;
    }

    // 删除列
    columns.splice(index, 1);

    // 重新计算每列的宽度
    const totalCols = columns.length;
    const baseSpan = Math.floor(24 / totalCols);
    const remainder = 24 % totalCols;

    columns.forEach((col, idx) => {
        col.span = baseSpan + (idx < remainder ? 1 : 0);
    });

    // 重置当前选中的列
    if (currentGridCol.value && currentGridCol.value.colIndex === index) {
        currentGridCol.value = null;
    }

    ElMessage.success('已删除列');
};

// 添加选项（用于select、radio、checkbox等）
const addOption = () => {
    if (!currentItem.value || !currentItem.value.props.options) return;

    const options = currentItem.value.props.options;
    options.push({
        label: `选项${options.length + 1}`,
        value: `option${options.length + 1}`,
    });
};

// 删除选项
const removeOption = index => {
    if (!currentItem.value || !currentItem.value.props.options) return;

    if (currentItem.value.props.options.length <= 1) {
        ElMessage.warning('至少保留一个选项');
        return;
    }

    currentItem.value.props.options.splice(index, 1);
};
</script>

<style scoped>
.form-design-container {
    display: flex;
    height: 100vh;
    background-color: #f5f7fa;
}

/* 通用样式 - 固定标题和滚动内容 */
.component-list,
.design-area,
.config-panel {
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.section-header {
    padding: 15px 20px;
    background-color: #fff;
    border-bottom: 1px solid #ebeef5;
    z-index: 10;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.section-content {
    flex: 1;
    overflow-y: auto;
    padding: 14px;
}

/* 左侧组件列表 */
.component-list {
    width: 250px;
    border-right: 1px solid #dcdfe6;
    background-color: #fff;
}

.component-item {
    display: flex;
    align-items: center;
    padding: 8px;
    margin-bottom: 10px;
    cursor: pointer;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    font-size: 14px;
}

.component-item:hover {
    background-color: #f5f7fa;
    border-color: #409eff;
}

.component-item .el-icon {
    margin-right: 8px;
    font-size: 18px;
}

/* 中间设计区域 */
.design-area {
    flex: 1;
}

.form-canvas {
    height: 100%;
    padding: 20px;
    background-color: #fff;
    border-radius: 4px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.form-item-wrapper {
    position: relative;
    padding: 10px;
    margin-bottom: 10px;
    border: 1px dashed #dcdfe6;
    border-radius: 4px;
}

.form-item-wrapper:hover {
    border-color: #409eff;
}

.form-item-wrapper.active {
    border: 1px solid #409eff;
    background-color: #ecf5ff;
}

/* 栅格布局样式 */
.grid-container {
    padding: 15px;
}

.grid-col-content {
    min-height: 80px;
    padding: 10px;
    border: 1px dashed #dcdfe6;
    border-radius: 4px;
    margin-bottom: 10px;
}

.grid-col-content:hover {
    border-color: #409eff;
}

.grid-col-active {
    border: 1px solid #409eff;
    background-color: #f0f9ff;
}

.grid-empty-tip {
    margin: 5px 0;
    padding: 10px;
    font-size: 12px;
}

.column-config {
    margin-bottom: 20px;
    padding: 15px;
    border: 1px solid #ebeef5;
    border-radius: 4px;
    background-color: #f9fafc;
}

.column-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    font-weight: bold;
}

.span-display {
    text-align: center;
    margin-top: 5px;
    color: #606266;
}

.drag-handle {
    cursor: move;
    position: absolute;
    left: -20px;
    top: 50%;
    transform: translateY(-50%);
    color: #909399;
}

.delete-icon {
    position: absolute;
    right: 5px;
    bottom: 5px;
    cursor: pointer;
    color: #f56c6c;
}

.delete-icon:hover {
    color: #f78989;
}

/* 右侧配置面板 */
.config-panel {
    width: 300px;
    border-left: 1px solid #dcdfe6;
    background-color: #fff;
}

.empty-tip {
    text-align: center;
    color: #909399;
    padding: 20px;
    border: 1px dashed #dcdfe6;
    border-radius: 4px;
    margin: 20px 0;
}

.ghost {
    opacity: 0.5;
    background: #c8ebfb;
}

.option-item {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
}

.option-input {
    margin-right: 10px;
}
</style>
<style>
.el-tabs__header {
    margin-bottom: 0;
}
</style>
