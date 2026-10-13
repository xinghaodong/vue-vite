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
                            <el-icon :size="14"><component :is="getIcon(element.icon)" /></el-icon>
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
                            <el-icon :size="14"><component :is="getIcon(element.icon)" /></el-icon>
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
                        <el-tooltip content="撤销操作 (Ctrl+Z)" placement="bottom">
                            <el-button size="small" :icon="Back" :disabled="!canUndo" @click="undo">撤销</el-button>
                        </el-tooltip>
                        <el-tooltip content="重做操作 (Ctrl+Y)" placement="bottom">
                            <el-button size="small" :icon="Right" :disabled="!canRedo" @click="redo">重做</el-button>
                        </el-tooltip>
                        <el-divider direction="vertical" style="margin: 0 4px" />
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
                            <!-- 仅基础录入字段展示通用基础属性（纯布局容器如 Grid/Card/Tabs/Subform 零脏属性） -->
                            <template v-if="!currentItem.slots">
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
                            <div class="config-section-title">{{ currentItem.slots ? '容器属性' : '专有属性' }}</div>
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
                                    :available-subforms="getAvailableSubforms()"
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
        <!-- 4. 🚀 真机全屏实时预览弹窗 (Preview Modal) -->
        <el-dialog
            v-model="previewVisible"
            :title="previewDeviceMode === 'mobile' ? '真机运行预览 (iPhone 移动端仿真)' : '真机运行预览 (PC 桌面端)'"
            :width="previewDeviceMode === 'mobile' ? '560px' : '900px'"
            top="4vh"
            destroy-on-close
            class="real-form-preview-dialog"
        >
            <div class="preview-banner-tip">
                <div class="preview-tip-text">
                    <el-icon color="#409eff" style="margin-right: 6px"><View /></el-icon>
                    <span>环境仿真：支持<strong>必填校验</strong>、<strong>公式联动</strong>与<strong>API回显</strong></span>
                </div>
                <!-- 🌟 设备分段切换器 (PC / iPhone) -->
                <el-radio-group v-model="previewDeviceMode" size="small" class="device-switcher">
                    <el-radio-button value="pc">
                        <el-icon style="margin-right: 4px"><Monitor /></el-icon>桌面端
                    </el-radio-button>
                    <el-radio-button value="mobile">
                        <el-icon style="margin-right: 4px"><Iphone /></el-icon>iPhone 移动端
                    </el-radio-button>
                </el-radio-group>
            </div>

            <!-- 1. PC 桌面端宽屏视图 -->
            <div v-if="previewDeviceMode === 'pc'" class="preview-content-box pc-view">
                <el-tabs v-model="previewActiveTab" type="border-card">
                    <el-tab-pane label="表单交互渲染" name="form">
                        <div class="preview-form-wrapper">
                            <DynamicForm
                                ref="previewFormRef"
                                v-model="previewData"
                                :schema="previewSchema"
                                :ui-config="previewUiConfig"
                                device-mode="pc"
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

            <!-- 2. 📱 iPhone 移动端高保真仿真壳 -->
            <div v-else class="preview-content-box mobile-view">
                <div class="iphone-mockup-frame">
                    <!-- 灵动岛 (Dynamic Island) 黑色胶囊打孔 -->
                    <div class="iphone-dynamic-island">
                        <div class="camera-lens"></div>
                    </div>

                    <!-- 状态栏 (Status Bar) -->
                    <div class="iphone-status-bar">
                        <span class="status-time">09:41</span>
                        <div class="status-icons">
                            <span class="signal-tag">5G</span>
                            <div class="battery-shell">
                                <div class="battery-core"></div>
                            </div>
                        </div>
                    </div>

                    <!-- 屏幕内部滚动视口与移动导航头 -->
                    <div class="iphone-screen-viewport">
                        <div class="mobile-nav-header">
                            <div class="nav-title">{{ formConfig.name || '审批申请单' }}</div>
                        </div>
                        <div class="mobile-form-body">
                            <DynamicForm
                                ref="previewMobileFormRef"
                                v-model="previewData"
                                :schema="previewSchema"
                                :ui-config="previewUiConfig"
                                device-mode="mobile"
                            />
                        </div>
                    </div>

                    <!-- 底部 Home Indicator 手势横条 -->
                    <div class="iphone-home-indicator"></div>
                </div>
            </div>

            <template #footer>
                <div class="preview-dialog-footer">
                    <div class="footer-left">
                        <el-tag type="info" size="small">物料: {{ previewSchema.length }} 个组件</el-tag>
                        <el-popover placement="top" :width="360" trigger="click">
                            <template #reference>
                                <el-button size="small" link type="primary" style="margin-left: 8px">查看实时数据 (JSON)</el-button>
                            </template>
                            <div style="max-height: 260px; overflow-y: auto;">
                                <pre style="font-size: 11px; margin: 0; font-family: monospace;">{{ JSON.stringify(previewData, null, 2) }}</pre>
                            </div>
                        </el-popover>
                    </div>
                    <div class="footer-right">
                        <el-button @click="handleResetPreview">重置表单</el-button>
                        <el-button type="success" @click="handleValidatePreview">验证规则</el-button>
                        <el-button type="primary" @click="previewVisible = false">关闭预览</el-button>
                    </div>
                </div>
            </template>
        </el-dialog>
    </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, getCurrentInstance } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import draggable from 'vuedraggable/src/vuedraggable';
import {
    View,
    Back,
    Right,
    Monitor,
    Iphone,
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
import { useHistory } from './hooks/useHistory.js';
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

// ==================== 🌟 撤销与重做 (Undo / Redo) 历史快照栈集成 ====================
// 生成当前状态的纯净快照对象
const getSnapshotData = () => ({
    schema: JSON.parse(JSON.stringify(formItems.value)),
    config: JSON.parse(JSON.stringify(formConfig)),
    selectedId: currentItem.value?.id || null,
});

// 历史快照还原回调 (状态安全还原 + 选中高亮与属性面板双向纠偏)
const handleRestoreSnapshot = snapshot => {
    if (!snapshot) return;
    formItems.value = snapshot.schema || [];
    if (snapshot.config) {
        Object.assign(formConfig, snapshot.config);
    }
    if (snapshot.selectedId) {
        let found = null;
        traverseWidgets(formItems.value, item => {
            if (item.id === snapshot.selectedId) {
                found = item;
            }
        });
        if (found) {
            currentItem.value = found;
            activeTab.value = 'component';
        } else {
            currentItem.value = null;
            activeTab.value = 'form';
        }
    } else {
        currentItem.value = null;
        activeTab.value = 'form';
    }
};

const {
    canUndo,
    canRedo,
    undo,
    redo,
    recordSnapshot,
    initHistory,
} = useHistory({
    maxSteps: 30,
    onRestore: handleRestoreSnapshot,
});

// 深度监听组件树与表单全局设置的变动，防抖记录快照 (300ms 自动合并打字输入)
watch(
    [formItems, () => formConfig],
    () => {
        recordSnapshot(getSnapshotData(), false);
    },
    { deep: true }
);

// 全局键盘快捷键拦截器 (Ctrl+Z 撤销 / Ctrl+Y 重做)
const handleKeyDown = e => {
    if (previewVisible.value) return;

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlOrMeta = isMac ? e.metaKey : e.ctrlKey;
    if (!ctrlOrMeta) return;

    const key = e.key.toLowerCase();
    const targetTag = e.target?.tagName?.toLowerCase();
    const isTyping = targetTag === 'input' || targetTag === 'textarea';

    // Ctrl + Z (Undo)
    if (key === 'z' && !e.shiftKey) {
        if (isTyping) return;
        if (canUndo.value) {
            e.preventDefault();
            undo();
            ElMessage.info('已撤销上一步操作');
        }
    }
    // Ctrl + Y 或 Ctrl + Shift + Z (Redo)
    else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        if (isTyping) return;
        if (canRedo.value) {
            e.preventDefault();
            redo();
            ElMessage.info('已重做上一步操作');
        }
    }
};

// 初始化与卸载生命周期
onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
    if (idkey) {
        getDesignDetail();
    } else {
        initHistory(getSnapshotData());
    }
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
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
            // 🌟 服务端数据装载完毕后，初始化历史记录基准快照
            initHistory(getSnapshotData());
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
    recordSnapshot(getSnapshotData(), true);
    ElMessage.success(`已添加【${element.label}】`);
};

// 监听画布变动（当物料拖入或调序时自动激活选中并即时压栈）
const handleCanvasChange = evt => {
    if (evt.added) {
        selectItem(evt.added.element);
    }
    recordSnapshot(getSnapshotData(), true);
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
    recordSnapshot(getSnapshotData(), true);
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
        recordSnapshot(getSnapshotData(), true);
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
        recordSnapshot(getSnapshotData(), true);
        ElMessage.success('画布已清空');
    });
};

// 收集可供计算字段依赖的普通主字段 (排除任何容器物料，并排除子表单内部局部字段防混淆)
const getAvailableFields = () => {
    const fields = [];
    const traverse = (items, inSubform = false) => {
        if (!Array.isArray(items)) return;
        items.forEach(item => {
            if (!item || typeof item !== 'object') return;
            const isSub = inSubform || item.type === 'subform';
            if (!item.slots && !isSub && item.id !== currentItem.value?.id) {
                fields.push(item);
            }
            if (item.slots && typeof item.slots === 'object') {
                Object.values(item.slots).forEach(slotList => {
                    traverse(slotList, isSub);
                });
            }
        });
    };
    traverse(formItems.value, false);
    return fields;
};

// 收集当前画布上所有可供聚合计算的子表单及其内部列
const getAvailableSubforms = () => {
    const subforms = [];
    traverseWidgets(formItems.value, item => {
        if (item.type === 'subform' && item.slots) {
            const innerCols = [];
            const extractCols = list => {
                if (!Array.isArray(list)) return;
                list.forEach(node => {
                    if (!node) return;
                    if (!node.slots) {
                        innerCols.push({
                            id: node.id,
                            label: node.props?.label || node.label || node.id,
                            type: node.type,
                        });
                    } else {
                        Object.values(node.slots).forEach(slotList => extractCols(slotList));
                    }
                });
            };
            extractCols(item.slots.default || []);
            subforms.push({
                id: item.id,
                label: item.props?.label || '子表单',
                columns: innerCols,
            });
        }
    });
    return subforms;
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
            ...(idkey ? {} : { status: 2 }), // 仅新增表单时默认设为草稿(2)，编辑保存时不传 status，防止将已发布表单降级
        };

        const res = idkey ? await proxy.$api.designUpdate(payload) : await proxy.$api.designAdd(payload);
        if (res.code === 200) {
            ElMessage.success(idkey ? '表单已成功更新！' : '表单已成功保存！');
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
    recordSnapshot(getSnapshotData(), true);
    ElMessage.success(`已复制【${cloned.props?.label || cloned.type}】`);
};

// 复制容器内的子组件 (基于统一 slots 协议，零兼容分支)
const handleCopyChild = ({ parent, slotKey, index }) => {
    const targetList = parent?.slots?.[slotKey];
    if (targetList && targetList[index]) {
        const cloned = cloneWidgetWithNewIds(targetList[index]);
        targetList.splice(index + 1, 0, cloned);
        selectItem(cloned);
        recordSnapshot(getSnapshotData(), true);
        ElMessage.success(`已复制【${cloned.props?.label || cloned.type}】`);
    }
};

// ==================== 2. 真机全屏实时预览逻辑 (Live Simulation) ====================
const previewVisible = ref(false);
const previewFormRef = ref(null);
const previewMobileFormRef = ref(null);
const previewDeviceMode = ref('pc'); // 'pc' | 'mobile'
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

// 预览内点击“校验规则” (自适应 PC 桌面端与 iPhone 移动端实例)
const handleValidatePreview = async () => {
    const targetRef = previewDeviceMode.value === 'mobile' ? previewMobileFormRef.value : previewFormRef.value;
    if (!targetRef) return;
    try {
        const valid = await targetRef.validate();
        if (valid) {
            ElMessage.success('表单校验全部通过！数据结构合法完整');
        }
    } catch (err) {
        ElMessage.error(err?.message || '表单存在未满足规则的字段，请检查输入');
    }
};

// 预览内点击“重置清空”
const handleResetPreview = () => {
    const targetRef = previewDeviceMode.value === 'mobile' ? previewMobileFormRef.value : previewFormRef.value;
    if (targetRef) {
        targetRef.resetFields();
    }
    previewData.value = {};
    ElMessage.info('已重置预览表单');
};
</script>

<style scoped>
.form-design-container {
    display: flex;
    height: calc(100vh - 108px);
    /* background-color: #f0f2f5; */
    overflow: hidden;
    border: 1px solid #e4e7ed;
}

/* 1. 左侧物料库 */
.component-list {
    width: 250px;
    /* background: #ffffff; */
    border-right: 1px solid #e4e7ed;
    display: flex;
    flex-direction: column;
}

.widget-group-title {
    font-size: 12px;
    font-weight: 600;
    /* color: #909399; */
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
    /* background: #f8fafc; */
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    cursor: move;
    font-size: 12px;
    /* color: #334155; */
    transition: all 0.2s ease;
    user-select: none;
}

.component-item:hover {
    /* color: #409eff; */
    border-color: #b3d8ff;
    /* background: #ecf5ff; */
}

/* 2. 中间画布区 */
.design-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    /* background: #f1f5f9; */
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
    /* color: #1e293b; */
}

.canvas-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
}

.form-canvas {
    /* background: #ffffff; */
    min-height: calc(100vh - 204px);
    /* padding: 12px; */
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
    /* background: #ffffff; */
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
    /* background: #ffffff; */
}

.section-header h4 {
    margin: 0;
    font-size: 14px;
    /* color: #1e293b; */
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
    /* color: #475569; */
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
    padding: 12px 18px 18px;
}

.preview-banner-tip {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 8px;
    padding: 8px 14px;
    font-size: 13px;
    color: #166534;
    margin-bottom: 14px;
}

.preview-tip-text {
    display: flex;
    align-items: center;
}

.device-switcher :deep(.el-radio-button__inner) {
    display: flex;
    align-items: center;
    font-size: 12px;
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

/* ==================== 📱 iPhone 仿真机壳大厂级工艺设计 ==================== */
.mobile-view {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 12px 0;
    background: #f1f5f9;
    border-radius: 12px;
}

.iphone-mockup-frame {
    position: relative;
    width: 375px;
    height: 620px;
    background: #ffffff;
    /* 曜石黑铝合金精密金属外壳 */
    border: 11px solid #0f172a;
    border-radius: 48px;
    box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.12) inset;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    user-select: none;
}

/* 灵动岛 (Dynamic Island) 黑色打孔胶囊 */
.iphone-dynamic-island {
    position: absolute;
    top: 9px;
    left: 50%;
    transform: translateX(-50%);
    width: 94px;
    height: 23px;
    background: #000000;
    border-radius: 20px;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 9px;
}

.camera-lens {
    width: 9px;
    height: 9px;
    background: #1e1b4b;
    border-radius: 50%;
    border: 1px solid #312e81;
}

/* iOS 顶部状态栏 */
.iphone-status-bar {
    position: relative;
    height: 38px;
    background: #ffffff;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 22px;
    font-size: 12px;
    font-weight: 600;
    color: #0f172a;
    z-index: 10;
    border-bottom: 1px solid #f8fafc;
}

.status-time {
    letter-spacing: -0.2px;
}

.status-icons {
    display: flex;
    align-items: center;
    gap: 6px;
}

.signal-tag {
    font-size: 10px;
    font-weight: 700;
    color: #334155;
}

.battery-shell {
    width: 19px;
    height: 10px;
    border: 1.5px solid #0f172a;
    border-radius: 3px;
    padding: 1px;
    display: flex;
    align-items: center;
}

.battery-core {
    width: 11px;
    height: 100%;
    background: #22c55e;
    border-radius: 1px;
}

/* 手机屏幕内部可滚动视口 */
.iphone-screen-viewport {
    flex: 1;
    overflow-y: auto;
    background: #f8fafc;
    display: flex;
    flex-direction: column;
}

.mobile-nav-header {
    background: #ffffff;
    padding: 10px 14px;
    border-bottom: 1px solid #e2e8f0;
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
    text-align: center;
    position: sticky;
    top: 0;
    z-index: 5;
}

.mobile-form-body {
    padding: 12px 10px 24px;
}

/* 底部 Home Indicator 手势操作横条 */
.iphone-home-indicator {
    height: 18px;
    background: #ffffff;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10;
}

.iphone-home-indicator::after {
    content: '';
    width: 112px;
    height: 4px;
    background: #334155;
    border-radius: 10px;
}
</style>
