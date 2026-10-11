<!-- 动态表单设计器 (组件注册制 + 递归渲染) -->
<template>
    <div class="form-design-container">
        <!-- 1. 左侧物料库面板 -->
        <div class="component-list">
            <div class="section-header">
                <h4>物料组件库</h4>
            </div>
            <div class="section-content">
                <!-- 容器布局物料 -->
                <div class="widget-group-title">布局容器</div>
                <draggable
                    :list="containerWidgets"
                    :group="{ name: 'form-items', pull: 'clone', put: false }"
                    :sort="false"
                    :clone="cloneWidget"
                    item-key="type"
                    :animation="200"
                    class="widgets-grid"
                >
                    <template #item="{ element }">
                        <div class="component-item" @click="addWidget(element)">
                            <el-icon><component :is="getIcon(element.icon)" /></el-icon>
                            <span>{{ element.label }}</span>
                        </div>
                    </template>
                </draggable>

                <!-- 基础表单物料 -->
                <div class="widget-group-title" style="margin-top: 14px">基础字段</div>
                <draggable
                    :list="fieldWidgets"
                    :group="{ name: 'form-items', pull: 'clone', put: false }"
                    :sort="false"
                    :clone="cloneWidget"
                    item-key="type"
                    :animation="200"
                    class="widgets-grid"
                >
                    <template #item="{ element }">
                        <div class="component-item" @click="addWidget(element)">
                            <el-icon><component :is="getIcon(element.icon)" /></el-icon>
                            <span>{{ element.label }}</span>
                        </div>
                    </template>
                </draggable>
            </div>
        </div>

        <!-- 2. 中间画布工作区 -->
        <div class="design-area">
            <div class="section-header">
                <div class="canvas-header-bar">
                    <span class="form-title-badge">{{ formConfig.name || '未命名表单' }}</span>
                    <div class="header-actions">
                        <el-button type="success" size="small" :icon="View" @click="handleOpenPreview">真机全屏预览</el-button>
                        <el-button size="small" @click="clearCanvas">清空画布</el-button>
                        <el-button type="primary" size="small" @click="saveFormSchema">保存表单</el-button>
                    </div>
                </div>
            </div>

            <div class="section-content canvas-scroll">
                <div class="form-canvas">
                    <el-form
                        :label-position="formConfig.labelPosition"
                        :size="formConfig.size"
                        :label-width="formConfig.labelWidth + 'px'"
                        style="min-height: 100%"
                    >
                        <draggable
                            v-model="formItems"
                            item-key="id"
                            :group="{ name: 'form-items', pull: true, put: true }"
                            ghost-class="ghost-canvas-item"
                            handle=".drag-handle"
                            :animation="200"
                            style="min-height: 400px; height: 100%"
                            @change="handleCanvasChange"
                        >
                            <template #item="{ element, index }">
                                <div class="canvas-item-slot-wrapper">
                                    <DesignItemRenderer
                                        :element="element"
                                        :current-item="currentItem"
                                        :form-data="formData"
                                        @select="selectItem"
                                        @copy="() => copyItem(index)"
                                        @copy-child="handleCopyChild"
                                        @delete="() => deleteItem(index)"
                                        @delete-child="handleDeleteChild"
                                    />
                                </div>
                            </template>

                            <template #footer>
                                <div v-if="formItems.length === 0" class="canvas-empty-placeholder">
                                    <el-icon :size="48" color="#c0c4cc"><Grid /></el-icon>
                                    <p>从左侧拖拽或点击物料组件添加到画布</p>
                                </div>
                            </template>
                        </draggable>
                    </el-form>
                </div>
            </div>
        </div>

        <!-- 3. 右侧属性配置面板 -->
        <div class="config-panel">
            <div class="section-header tab-header">
                <el-tabs v-model="activeTab" style="width: 100%">
                    <el-tab-pane label="组件配置" name="component" />
                    <el-tab-pane label="表单全局" name="form" />
                </el-tabs>
            </div>

            <div class="section-content config-scroll">
                <!-- 3.1 组件专属配置 -->
                <div v-if="activeTab === 'component'">
                    <div v-if="currentItem">
                        <el-form label-width="85px" label-position="left" size="small">
                            <!-- 公共基础属性（非栅格） -->
                            <template v-if="currentItem.type !== 'grid'">
                                <div class="config-section-title">基础属性</div>
                                <el-form-item label="标签名称">
                                    <el-input v-model="currentItem.props.label" />
                                </el-form-item>
                                <el-form-item label="绑定字段">
                                    <el-input v-model="currentItem.id" placeholder="英文标识，如: reason, amount" />
                                </el-form-item>
                                <el-form-item label="占位提示" v-if="currentItem.props.placeholder !== undefined">
                                    <el-input v-model="currentItem.props.placeholder" />
                                </el-form-item>
                                <el-form-item label="是否必填">
                                    <el-switch v-model="currentItem.props.required" />
                                </el-form-item>
                                <el-form-item label="是否禁用">
                                    <el-switch v-model="currentItem.props.disabled" />
                                </el-form-item>
                            </template>

                            <!-- 物料专属动态属性面板 (组件解耦) -->
                            <div class="config-section-title">专有属性</div>
                            <component
                                :is="activeSettingComponent"
                                v-if="activeSettingComponent"
                                :element="currentItem"
                                :props-data="currentItem.props"
                                :slots-data="currentItem.slots"
                                :type="currentItem.type"
                            />

                            <!-- 计算字段配置 (非容器组件支持) -->
                            <template v-if="!currentItem.slots">
                                <div class="config-section-title">联动与计算</div>
                                <ComputedFieldSetting
                                    :item="currentItem"
                                    :available-fields="getAvailableFields()"
                                />
                            </template>
                        </el-form>
                    </div>
                    <div v-else class="empty-selection-tip">
                        请在中间画布中点击选中要配置的组件
                    </div>
                </div>

                <!-- 3.2 表单全局配置 -->
                <div v-if="activeTab === 'form'">
                    <el-form label-width="85px" size="small" label-position="left">
                        <div class="config-section-title">全局样式</div>
                        <el-form-item label="表单名称">
                            <el-input v-model="formConfig.name" />
                        </el-form-item>
                        <el-form-item label="标签宽度">
                            <el-input-number v-model="formConfig.labelWidth" :min="60" :max="200" :step="10" />
                            <span style="margin-left: 6px; font-size: 12px; color: #909399">px</span>
                        </el-form-item>
                        <el-form-item label="表单尺寸">
                            <el-radio-group v-model="formConfig.size">
                                <el-radio-button value="large">大</el-radio-button>
                                <el-radio-button value="default">中</el-radio-button>
                                <el-radio-button value="small">小</el-radio-button>
                            </el-radio-group>
                        </el-form-item>
                        <el-form-item label="标签对齐">
                            <el-radio-group v-model="formConfig.labelPosition">
                                <el-radio-button value="right">右对齐</el-radio-button>
                                <el-radio-button value="left">左对齐</el-radio-button>
                                <el-radio-button value="top">顶部</el-radio-button>
                            </el-radio-group>
                        </el-form-item>
                    </el-form>
                </div>
            </div>
        </div>
    
        <!-- 4. 🚀 真机全屏实时预览弹窗 (Preview Modal) -->
        <el-dialog
            v-model="previewVisible"
            title="真机表单运行预览"
            width="880px"
            top="5vh"
            destroy-on-close
            class="real-form-preview-dialog"
        >
            <div class="preview-banner-tip">
                <el-icon color="#409eff" style="margin-right: 6px"><View /></el-icon>
                <span>当前环境模拟真实审批/填单运行容器，支持<strong>字段必填校验</strong>、<strong>动态计算公式联动</strong>、<strong>API数据源回显</strong>等完整业务逻辑。</span>
            </div>

            <div class="preview-content-box">
                <el-tabs v-model="previewActiveTab" type="border-card">
                    <el-tab-pane label="表单交互渲染" name="form">
                        <div class="preview-form-wrapper">
                            <DynamicForm
                                ref="previewFormRef"
                                v-model="previewData"
                                :schema="previewSchema"
                                :ui-config="previewUiConfig"
                            />
                        </div>
                    </el-tab-pane>

                    <el-tab-pane label="实时响应式数据 (JSON View)" name="json">
                        <div class="preview-json-wrapper">
                            <pre class="json-code-block">{{ JSON.stringify(previewData, null, 2) }}</pre>
                        </div>
                    </el-tab-pane>
                </el-tabs>
            </div>

            <template #footer>
                <div class="preview-dialog-footer">
                    <div class="footer-left">
                        <el-tag type="info" size="small">物料数量: {{ previewSchema.length }} 个组件</el-tag>
                    </div>
                    <div class="footer-right">
                        <el-button @click="handleResetPreview">重置表单</el-button>
                        <el-button type="success" @click="handleValidatePreview">验证规则 (Validate)</el-button>
                        <el-button type="primary" @click="previewVisible = false">关闭预览</el-button>
                    </div>
                </div>
            </template>
        </el-dialog>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, getCurrentInstance } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import draggable from 'vuedraggable/src/vuedraggable';
import {
    View,
    CopyDocument,
    Edit,
    Document,
    Select,
    Switch,
    Calendar,
    List,
    Menu,
    Grid,
    UploadFilled,
    Odometer,
    CreditCard,
    CollectionTag,
    Connection,
    Operation,
    Tickets,
} from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import { fieldWidgets, containerWidgets, getWidget, cloneWidgetWithNewIds, traverseWidgets } from './widgets/index.js';
import DynamicForm from './components/DynamicForm.vue';
import DesignItemRenderer from './designer/DesignItemRenderer.vue';
import ComputedFieldSetting from './designer/ComputedFieldSetting.vue';

const { proxy } = getCurrentInstance();
const route = useRoute();
const router = useRouter();
const { idkey } = route.query;

// 图标字典
const iconMap = {
    Edit,
    Document,
    Select,
    Switch,
    Calendar,
    List,
    Menu,
    Grid,
    UploadFilled,
    Odometer,
    CreditCard,
    CollectionTag,
    Connection,
    Operation,
    Tickets,
};
const getIcon = iconName => iconMap[iconName] || Edit;

// 表单全局配置
const formConfig = reactive({
    name: '未命名动态表单',
    labelWidth: 100,
    size: 'default',
    labelPosition: 'right',
});

// 画布数据模型
const formItems = ref([]);
const currentItem = ref(null);
const formData = reactive({});
const activeTab = ref('form');

// 当前选中物料的专有属性面板组件
const activeSettingComponent = computed(() => {
    if (!currentItem.value) return null;
    const widget = getWidget(currentItem.value.type);
    return widget?.settingComponent || null;
});

// 初始化加载
onMounted(() => {
    if (idkey) {
        getDesignDetail();
    }
});

const getDesignDetail = async () => {
    try {
        const res = await proxy.$api.designDetail({ id: idkey });
        if (res.code === 200 && res.data) {
            Object.assign(formConfig, res.data.ui_config || {}, {
                name: res.data.name,
                description: res.data.description,
                status: res.data.status,
            });
            formItems.value = JSON.parse(res.data.schema || '[]');
            if (formItems.value.length > 0) {
                selectItem(formItems.value[0]);
            }
        }
    } catch (err) {
        console.error('获取表单详情失败:', err);
    }
};

// 拖拽克隆物料 (深拷贝纯净对象，附带全新高熵 ID)
const cloneWidget = element => {
    const fresh = element.createDefault();
    return JSON.parse(JSON.stringify(fresh));
};

// 点击直接追加物料
const addWidget = element => {
    const newItem = cloneWidget(element);
    formItems.value.push(newItem);
    selectItem(newItem);
    ElMessage.success(`已添加【${element.label}】`);
};

// 监听画布变动（当物料拖入时自动激活选中）
const handleCanvasChange = evt => {
    if (evt.added) {
        selectItem(evt.added.element);
    }
};

// 选中某个组件
const selectItem = item => {
    currentItem.value = item;
    activeTab.value = 'component';
};

// 删除顶级组件
const deleteItem = index => {
    const deleted = formItems.value[index];
    if (currentItem.value?.id === deleted.id) {
        currentItem.value = null;
        activeTab.value = 'form';
    }
    delete formData[deleted.id];
    formItems.value.splice(index, 1);
    ElMessage.success('已删除组件');
};

// 删除容器内的子组件 (基于统一 slots 协议，零兼容分支)
const handleDeleteChild = ({ parent, slotKey, index }) => {
    const targetList = parent?.slots?.[slotKey];
    if (targetList && targetList[index]) {
        const deleted = targetList[index];
        if (currentItem.value?.id === deleted.id) {
            currentItem.value = null;
            activeTab.value = 'form';
        }
        delete formData[deleted.id];
        targetList.splice(index, 1);
        ElMessage.success('已删除子组件');
    }
};

// 清空画布
const clearCanvas = () => {
    ElMessageBox.confirm('确定清空当前画布上的全部组件吗？', '提示', {
        type: 'warning',
    }).then(() => {
        formItems.value = [];
        currentItem.value = null;
        activeTab.value = 'form';
        ElMessage.success('画布已清空');
    });
};

// 收集可供计算字段依赖的普通字段 (排除任何容器物料)
const getAvailableFields = () => {
    const fields = [];
    traverseWidgets(formItems.value, item => {
        if (!item.slots && item.id !== currentItem.value?.id) {
            fields.push(item);
        }
    });
    return fields;
};

// 保存表单结构至后端
const saveFormSchema = async () => {
    try {
        const payload = {
            id: idkey || '',
            name: formConfig.name,
            description: '',
            schema: JSON.stringify(formItems.value),
            ui_config: {
                labelWidth: formConfig.labelWidth,
                size: formConfig.size,
                labelPosition: formConfig.labelPosition,
            },
            status: 2, // 1=发布, 2=草稿
        };

        const res = await proxy.$api.designAdd(payload);
        if (res.code === 200) {
            ElMessage.success('表单已成功保存！');
            router.push('/home/formDesignList');
        } else {
            ElMessage.error(res.message || '保存失败');
        }
    } catch (error) {
        console.error('保存表单异常:', error);
    }
};

// ==================== 1. 一键复制组件逻辑 (深度克隆 + 高熵ID重置，未来容器零返工) ====================
// 复制顶级物料组件
const copyItem = index => {
    const original = formItems.value[index];
    if (!original) return;
    const cloned = cloneWidgetWithNewIds(original);
    formItems.value.splice(index + 1, 0, cloned);
    selectItem(cloned);
    ElMessage.success(`已复制【${cloned.props?.label || cloned.type}】`);
};

// 复制容器内的子组件 (基于统一 slots 协议，零兼容分支)
const handleCopyChild = ({ parent, slotKey, index }) => {
    const targetList = parent?.slots?.[slotKey];
    if (targetList && targetList[index]) {
        const cloned = cloneWidgetWithNewIds(targetList[index]);
        targetList.splice(index + 1, 0, cloned);
        selectItem(cloned);
        ElMessage.success(`已复制【${cloned.props?.label || cloned.type}】`);
    }
};

// ==================== 2. 真机全屏实时预览逻辑 (Live Simulation) ====================
const previewVisible = ref(false);
const previewFormRef = ref(null);
const previewData = ref({});
const previewSchema = ref([]);
const previewUiConfig = ref({});
const previewActiveTab = ref('form');

const handleOpenPreview = () => {
    if (formItems.value.length === 0) {
        ElMessage.warning('画布暂无组件，请先添加表单物料');
        return;
    }
    // 深拷贝当前 Schema 与 UI 样式配置
    previewSchema.value = JSON.parse(JSON.stringify(formItems.value));
    previewUiConfig.value = {
        labelWidth: formConfig.labelWidth,
        size: formConfig.size,
        labelPosition: formConfig.labelPosition,
    };
    previewData.value = {};
    previewActiveTab.value = 'form';
    previewVisible.value = true;
};

// 预览内点击“校验规则”
const handleValidatePreview = async () => {
    if (!previewFormRef.value) return;
    try {
        const valid = await previewFormRef.value.validate();
        if (valid) {
            ElMessage.success('表单校验全部通过！数据结构合法完整');
        }
    } catch (err) {
        ElMessage.error('表单存在未满足规则的字段，请检查输入');
    }
};

// 预览内点击“重置清空”
const handleResetPreview = () => {
    if (previewFormRef.value) {
        previewFormRef.value.resetFields();
    }
    previewData.value = {};
    ElMessage.info('已重置预览表单');
};
</script>

<style scoped>
.form-design-container {
    display: flex;
    height: calc(100vh - 106px);
    background-color: #f0f2f5;
    overflow: hidden;
}

/* 1. 左侧物料库 */
.component-list {
    width: 250px;
    background: #ffffff;
    border-right: 1px solid #e4e7ed;
    display: flex;
    flex-direction: column;
}

.widget-group-title {
    font-size: 12px;
    font-weight: 600;
    color: #909399;
    margin-bottom: 8px;
    padding-left: 2px;
}

.widgets-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
}

.component-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    cursor: move;
    font-size: 12px;
    color: #334155;
    transition: all 0.2s ease;
    user-select: none;
}

.component-item:hover {
    color: #409eff;
    border-color: #b3d8ff;
    background: #ecf5ff;
}

/* 2. 中间画布区 */
.design-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #f1f5f9;
}

.canvas-header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
}

.form-title-badge {
    font-weight: 600;
    font-size: 15px;
    color: #1e293b;
}

.canvas-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
}

.form-canvas {
    background: #ffffff;
    min-height: calc(100vh - 204px);
    padding: 12px;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.canvas-item-slot-wrapper {
    width: 100%;
}

.canvas-empty-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 380px;
    color: #94a3b8;
    gap: 12px;
}

.ghost-canvas-item {
    border: 2px dashed #409eff !important;
    background: #ecf5ff !important;
    opacity: 0.7;
}

/* 3. 右侧配置面板 */
.config-panel {
    width: 320px;
    background: #ffffff;
    border-left: 1px solid #e4e7ed;
    display: flex;
    flex-direction: column;
}

.section-header {
    height: 48px;
    padding: 0 16px;
    display: flex;
    align-items: center;
    border-bottom: 1px solid #e4e7ed;
    background: #ffffff;
}

.section-header h4 {
    margin: 0;
    font-size: 14px;
    color: #1e293b;
}

.tab-header {
    height: auto;
    padding: 4px 16px 0;
}

.section-content {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
}

.config-scroll {
    padding: 16px;
}

.config-section-title {
    font-size: 12px;
    font-weight: 700;
    color: #475569;
    margin: 12px 0 10px;
    padding-bottom: 4px;
    border-bottom: 1px solid #f1f5f9;
}

.config-section-title:first-child {
    margin-top: 0;
}

.empty-selection-tip {
    text-align: center;
    color: #94a3b8;
    font-size: 13px;
    padding-top: 80px;
}

.field-hint {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
    line-height: 1.4;
}

/* 4. 真机预览弹窗样式 */
.real-form-preview-dialog :deep(.el-dialog__body) {
    padding: 14px 20px 20px;
}

.preview-banner-tip {
    display: flex;
    align-items: center;
    background: #ecf5ff;
    border: 1px solid #d9ecff;
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 13px;
    color: #409eff;
    margin-bottom: 14px;
}

.preview-form-wrapper {
    padding: 16px 8px;
    min-height: 260px;
    max-height: 60vh;
    overflow-y: auto;
}

.preview-json-wrapper {
    background: #1e1e1e;
    border-radius: 6px;
    padding: 12px;
    max-height: 55vh;
    overflow-y: auto;
}

.json-code-block {
    margin: 0;
    color: #4ec9b0;
    font-family: Consolas, Monaco, monospace;
    font-size: 13px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-all;
}

.preview-dialog-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
}
</style>
