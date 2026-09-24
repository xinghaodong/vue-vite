<!-- logicFlow 流程设计器 -->
<template>
    <div>
        <div class="main-container">
            <!-- 1. DndPanel 容器：插件会自动渲染拖拽面板 -->
            <div id="dnd-panel-container" class="dnd-panel"></div>

            <!-- <div class="toolbar" v-if="!workflowId"> -->

            <el-card style="max-width: 480px" class="toolbar" v-if="!workflowId">
                <el-form ref="ruleFormRef" :model="ruleForm" :rules="rules" label-width="80px" class="demo-ruleForm">
                    <el-form-item label="模板名称" prop="name">
                        <el-input v-model="ruleForm.name"></el-input>
                    </el-form-item>
                    <!-- 关联表单 -->
                    <el-form-item label="关联表单" prop="formId">
                        <!-- <el-input v-model="ruleForm.formId"></el-input> -->
                        <el-select v-model="ruleForm.formId" placeholder="请选择关联表单">
                            <el-option v-for="form in mockFormList" :key="form.id" :label="form.name" :value="form.id"> </el-option>
                        </el-select>
                        <el-button link type="primary" @click="previewForm" style="margin-left: 10px"> 预览 </el-button>
                    </el-form-item>
                </el-form>
                <el-button type="primary" @click="saveWorkflow">保存流程</el-button>
            </el-card>

            <!-- </div> -->

            <!-- 2. LogicFlow 画布容器 -->
            <div id="logic-flow-container" class="canvas"></div>

            <!-- 节点 / 连线配置抽屉 -->
            <el-drawer v-model="drawerVisible" :title="drawerTitle" :with-header="true" size="480px" direction="rtl">
                <div style="padding: 0 16px 20px 16px">
                    <!-- A. 连线（Edge）配置抽屉 -->
                    <el-form label-position="top" v-if="drawerType === 'edge' && currentEdge">
                        <el-alert
                            v-if="currentEdgeConfig.isFromDiamond"
                            title="排他条件网关分支连线"
                            type="info"
                            :closable="false"
                            show-icon
                            style="margin-bottom: 16px"
                        >
                            <template #default>
                                当前连线从【{{ currentEdgeConfig.sourceNodeName }}】流向【{{ currentEdgeConfig.targetNodeName }}】。
                            </template>
                        </el-alert>
                        <el-alert
                            v-else
                            title="普通流转连线"
                            type="info"
                            :closable="false"
                            show-icon
                            style="margin-bottom: 16px"
                        >
                            <template #default>
                                当前连线从【{{ currentEdgeConfig.sourceNodeName }}】流向【{{ currentEdgeConfig.targetNodeName }}】。
                            </template>
                        </el-alert>

                        <el-form-item label="连线名称 / 显示文本">
                            <el-input v-model="currentEdgeConfig.text" placeholder="如: 小额(<=5000)、通过、默认" />
                        </el-form-item>

                        <!-- 从 diamond 出来的分支连线：可配置条件表达式或设为默认分支 -->
                        <template v-if="currentEdgeConfig.isFromDiamond">
                            <el-form-item label="分支类型">
                                <el-radio-group v-model="currentEdgeConfig.isDefault">
                                    <el-radio :label="false">条件分支（按表达式判断）</el-radio>
                                    <el-radio :label="true">默认兜底分支（Else）</el-radio>
                                </el-radio-group>
                            </el-form-item>

                            <el-form-item label="条件表达式" v-if="!currentEdgeConfig.isDefault">
                                <el-input v-model="currentEdgeConfig.condition" placeholder="如: totalAmount <= 5000 或 days > 3" clearable />
                                <div class="quick-tags-box">
                                    <span class="quick-tag-label">快捷插入变量：</span>
                                    <el-tag
                                        v-for="tag in commonVariables"
                                        :key="tag.name"
                                        size="small"
                                        class="quick-tag"
                                        @click="insertVariable(currentEdgeConfig, tag.name)"
                                    >
                                        {{ tag.label }} ({{ tag.name }})
                                    </el-tag>
                                </div>
                            </el-form-item>
                            <div v-else class="default-branch-tip">
                                💡 默认兜底分支：当该网关的其他所有分支条件均不满足时，流程将自动流向此连线目标。
                            </div>
                        </template>

                        <el-form-item label="备注">
                            <el-input type="textarea" v-model="currentEdgeConfig.remark" placeholder="请输入备注" />
                        </el-form-item>

                        <el-form-item>
                            <el-button type="primary" @click="applyConfig">应用配置</el-button>
                        </el-form-item>
                    </el-form>

                    <!-- B. 节点（Node）配置抽屉 -->
                    <el-form label-position="top" v-else-if="drawerType === 'node' && currentNode">
                        <el-form-item label="节点名称">
                            <el-input placeholder="请输入节点名称" v-model="currentNodeConfig.text.value" />
                        </el-form-item>

                        <!-- 1. 审批节点 (rect) -->
                        <template v-if="currentNode?.type === 'rect'">
                            <el-form-item label="审批人">
                                <el-select v-model="currentNodeConfig.properties.assignee" @change="loadApiOptions(currentNodeConfig.properties.assignee)" placeholder="请选择审批人" style="width: 100%">
                                    <el-option v-for="item in options" :key="item.id" :label="item.name" :value="item.id" />
                                </el-select>
                            </el-form-item>
                            <el-form-item label="关联表单">
                                <div style="display: flex; width: 100%; gap: 10px">
                                    <el-select v-model="currentNodeConfig.properties.formId" placeholder="请选择表单" style="flex: 1">
                                        <el-option v-for="form in mockFormList" :key="form.id" :label="form.name" :value="form.id" />
                                    </el-select>
                                    <el-button link type="primary" @click="previewForm">预览</el-button>
                                </div>
                            </el-form-item>
                        </template>

                        <!-- 2. AI 智能体节点 (ai-agent) -->
                        <template v-if="currentNode?.type === 'ai-agent'">
                            <el-form-item label="智能体角色">
                                <el-select
                                    v-model="currentNodeConfig.properties.agentRole"
                                    @change="handleAgentRoleChange"
                                    filterable
                                    clearable
                                    placeholder="请选择或输入搜索智能体角色"
                                    style="width: 100%"
                                >
                                    <el-option-group
                                        v-for="group in agentRoleGroups"
                                        :key="group.domain"
                                        :label="group.domainName"
                                    >
                                        <el-option
                                            v-for="item in group.roles"
                                            :key="item.value"
                                            :label="item.label"
                                            :value="item.value"
                                        />
                                    </el-option-group>
                                </el-select>
                            </el-form-item>
                            <el-form-item label="合规通过分">
                                <el-input-number v-model="currentNodeConfig.properties.riskThreshold" :min="1" :max="100" />
                            </el-form-item>
                            <el-form-item label="人机协同特批人 (HITL)" required>
                                <el-select v-model="currentNodeConfig.properties.specialApproverId" placeholder="必选：请指定特批复核人 (遇存疑/异常时挂起)" clearable style="width: 100%">
                                    <el-option v-for="item in options" :key="item.id" :label="item.name" :value="item.id" />
                                </el-select>
                                <span style="font-size: 12px; color: #e6a23c; margin-top: 4px; display: inline-block; line-height: 1.4;">
                                    ⚠️ 必填项：当 AI 智能体检测到高危、存疑或需特批放行时（如发票超期、预算异常、合规疑点等），流程将自动挂起转交此人特批复核
                                </span>
                            </el-form-item>
                        </template>

                        <!-- 3. 🌟 条件网关 (diamond) 核心排他多分支卡片列表 -->
                        <template v-if="currentNode?.type === 'diamond'">
                            <div class="gateway-branches-section">
                                <div class="gateway-branches-header">
                                    <span class="header-title">分支路由规则（条件挂载于出边）</span>
                                    <span class="header-count">{{ diamondOutgoingEdges.length }} 条出边</span>
                                </div>

                                <div v-if="diamondOutgoingEdges.length === 0" class="empty-branches-tip">
                                    <el-empty description="当前网关暂无出边连线" :image-size="60">
                                        <template #description>
                                            <p style="font-size: 13px; color: #909399; margin: 0">
                                                请在画布上从菱形网关拖出连线，连接至下游节点（如主管审批、总监审批等），然后在此集中配置各分支的条件表达式。
                                            </p>
                                        </template>
                                    </el-empty>
                                </div>

                                <div v-else class="branch-cards-list">
                                    <el-card
                                        v-for="(edge, idx) in diamondOutgoingEdges"
                                        :key="edge.id"
                                        class="branch-card-item"
                                        shadow="hover"
                                    >
                                        <template #header>
                                            <div class="branch-card-header">
                                                <el-tag size="small" :type="edge.isDefault ? 'warning' : 'primary'">
                                                    分支 {{ idx + 1 }}
                                                </el-tag>
                                                <span class="branch-target-info">
                                                    连向: <strong>{{ edge.targetNodeName }}</strong>
                                                </span>
                                            </div>
                                        </template>

                                        <el-form label-position="left" label-width="80px" size="small">
                                            <el-form-item label="显示文本">
                                                <el-input v-model="edge.text" placeholder="如: <=5000、大额、通过" />
                                            </el-form-item>

                                            <el-form-item label="默认分支">
                                                <el-switch
                                                    v-model="edge.isDefault"
                                                    active-text="设为默认兜底 (Else)"
                                                    @change="handleDefaultBranchChange(edge)"
                                                />
                                            </el-form-item>

                                            <el-form-item label="条件表达式" v-if="!edge.isDefault">
                                                <el-input v-model="edge.condition" placeholder="如: totalAmount <= 5000" clearable />
                                                <div class="quick-tags-box mini">
                                                    <el-tag
                                                        v-for="tag in commonVariables"
                                                        :key="tag.name"
                                                        size="small"
                                                        class="quick-tag"
                                                        @click="insertVariable(edge, tag.name)"
                                                    >
                                                        {{ tag.label }}
                                                    </el-tag>
                                                </div>
                                            </el-form-item>
                                            <div v-else class="default-branch-tip">
                                                💡 当上方其他分支均不满足时，自动流向此分支
                                            </div>
                                        </el-form>
                                    </el-card>
                                </div>
                            </div>
                        </template>

                        <el-form-item label="备注">
                            <el-input type="textarea" v-model="currentNodeConfig.properties.remark" placeholder="请输入备注" />
                        </el-form-item>

                        <el-form-item>
                            <el-button type="primary" @click="applyConfig">应用配置</el-button>
                        </el-form-item>
                    </el-form>
                </div>
            </el-drawer>

            <el-dialog v-model="previewVisible" title="表单预览" width="70%" top="5vh" custom-class="code-dialog">
                <div style="height: 70vh; overflow: auto; padding: 10px; border-radius: 4px">
                    <DynamicForm :schema="formSchema" :ui-config="uiConfig" />
                </div>
            </el-dialog>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, nextTick, reactive, getCurrentInstance, computed } from 'vue';
import DynamicForm from '@/pages/formDesign/components/DynamicForm.vue';
const { proxy } = getCurrentInstance();
import { useRoute } from 'vue-router';
import LogicFlow from '@logicflow/core';
import { registerCustomNodes } from './customNodes.js';
// 1. 引入 DndPanel 插件及样式
import { Menu, Control, ProximityConnect, DndPanel } from '@logicflow/extension';
import '@logicflow/core/lib/style/index.css';
import '@logicflow/extension/lib/style/index.css';
import { ElMessage } from 'element-plus';

const props = defineProps({
    workflowId: {
        type: Number || String,
    },
    appId: {
        type: Number || String,
    },
});

const formSchema = ref([]); // 从接口获取的 schema
const uiConfig = ref({}); // 从接口获取的 ui_config
// const formData = ref({}); // 表单数据
const formName = ref('');
// 父组件传来的参数

// 2. 注册 DndPanel 插件
LogicFlow.use(Control);
if (!props.workflowId) {
    LogicFlow.use(Menu);
    LogicFlow.use(DndPanel); // 注册拖拽面板插件
}

// 原有表单相关逻辑
const ruleFormRef = ref(null);
const rules = reactive({
    name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
    formId: [{ required: true, message: '请选择关联表单', trigger: 'change' }],
});
const ruleForm = ref({ name: '', formId: '', status: 0, description: '' });
const options = ref([]);

const route = useRoute();
const idkey = route.query.idkey || props.workflowId;
// 表单数据
const mockFormList = ref([{ id: 'form_leave_001', name: '请假申请表单' }]);

// 抽屉与配置状态
const drawerVisible = ref(false);
const previewVisible = ref(false);
const drawerType = ref('node'); // 'node' | 'edge'

// 节点配置相关逻辑
const currentNode = ref(null);
const currentNodeConfig = ref({});
const approvalHistoryData = ref(null);

// 🌟 连线配置与条件网关多分支配置
const currentEdge = ref(null);
const currentEdgeConfig = ref({
    text: '',
    condition: '',
    isDefault: false,
    remark: '',
    isFromDiamond: false,
    sourceNodeName: '',
    targetNodeName: '',
});
const diamondOutgoingEdges = ref([]);

// 抽屉标题动态计算
const drawerTitle = computed(() => {
    if (drawerType.value === 'edge') {
        return currentEdgeConfig.value.isFromDiamond ? '分支连线配置（条件路由）' : '流转连线配置';
    }
    if (currentNode.value?.type === 'diamond') {
        return '排他条件网关配置（多分支路由）';
    }
    if (currentNode.value?.type === 'ai-agent') {
        return 'AI 智能体节点配置';
    }
    return '节点配置';
});

// 常用表单/流程变量快捷 Tag
const commonVariables = [
    { label: '报销/申请金额', name: 'totalAmount' },
    { label: '天数', name: 'days' },
    { label: '紧急程度', name: 'urgency' },
    { label: '部门', name: 'department' },
];

// 快捷插入变量至表达式输入框
const insertVariable = (targetObj, varName) => {
    if (!targetObj) return;
    if (targetObj.condition && targetObj.condition.trim()) {
        targetObj.condition = `${targetObj.condition.trim()} && ${varName} `;
    } else {
        targetObj.condition = `${varName} `;
    }
};

// 默认兜底分支互斥切换（一个网关只允许一条兜底分支）
const handleDefaultBranchChange = currentBranch => {
    if (currentBranch.isDefault) {
        currentBranch.condition = ''; // 设为兜底分支时清空条件
        diamondOutgoingEdges.value.forEach(e => {
            if (e.id !== currentBranch.id) {
                e.isDefault = false;
            }
        });
    }
};

// 加载指定 diamond 网关的所有出边及其下游目标节点信息
const loadDiamondOutgoingEdges = diamondNodeId => {
    if (!lf) return;
    const graphData = lf.getGraphData();
    const nodes = graphData.nodes || [];
    const edges = graphData.edges || [];
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    const outgoing = edges.filter(e => e.sourceNodeId === diamondNodeId);
    diamondOutgoingEdges.value = outgoing.map(e => {
        const targetNode = nodeMap.get(e.targetNodeId);
        const targetNodeName =
            (typeof targetNode?.text === 'string' ? targetNode.text : targetNode?.text?.value) ||
            targetNode?.id ||
            '未命名节点';
        const edgeText = typeof e.text === 'string' ? e.text : e.text?.value || '';
        return {
            id: e.id,
            sourceNodeId: e.sourceNodeId,
            targetNodeId: e.targetNodeId,
            targetNodeName: targetNodeName,
            text: edgeText,
            condition: e.properties?.condition || '',
            isDefault: !!e.properties?.isDefault,
            branchType: e.properties?.branchType || '',
            remark: e.properties?.remark || '',
        };
    });
};

// 原有流程数据
const dataObj = ref({});

// LogicFlow 实例
let lf = null;
// 初始化 LogicFlow
const initLogicFlow = () => {
    lf = new LogicFlow({
        container: document.querySelector('#logic-flow-container'),
        edgeType: 'bezier',
        grid: true,
        background: { color: '#f8f9fa' },
    });

    // ========== 注册所有自定义节点 ========== //
    registerCustomNodes(lf, calculateNodeColors, approvalHistoryData);
    let nodeData = [
        {
            type: 'circle', // 节点类型：圆形（开始节点）
            text: '开始', // 拖拽到画布后节点的默认文本
            label: '开始节点', // 拖拽面板中显示的节点名称
            properties: {}, // 空对象，不挂业务属性
            icon: './yq.png',
        },
        {
            type: 'rect', // 节点类型：矩形（审批节点）
            text: '审批节点', // 默认文本
            label: '审批节点', // 面板显示名称
            properties: { assignee: '', assigneeName: '', formId: '', remark: '' }, // 默认属性
            icon: './jx.png',
            fill: '#87CEFA',
            stroke: '#1E90FF',
        },
        {
            type: 'diamond', // 节点类型：菱形（排他条件网关）
            text: '条件网关', // 默认文本
            label: '条件网关', // 面板显示名称
            properties: { condition: '' },
            icon: './tj.png',
        },
        {
            type: 'ai-agent', // 节点类型：通用 AI 智能体审查节点
            text: 'AI智能初审',
            label: 'AI智能体',
            properties: {
                agentRole: '',
                agentRoleName: '',
                riskThreshold: 80,
                specialApproverId: '',
                remark: '',
            },
            icon: './jx.png',
            fill: '#FAF5FF',
            stroke: '#9333EA',
        },
        {
            type: 'circle', // 节点类型：圆形（结束节点）
            text: '结束', // 默认文本
            label: '结束节点', // 面板显示名称
            properties: {}, // 默认属性
            icon: './yq.png',
        },
    ];

    // 4. 设置 DndPanel 拖拽项
    if (!props.workflowId) {
        lf.extension.dndPanel.setPatternItems(nodeData);
    }

    // 原有主题适配逻辑
    if (localStorage.getItem('theme') === 'dark') {
        lf.setTheme(
            {
                nodeText: {
                    color: '#333',
                    fontSize: 14,
                },
                edgeText: {
                    color: '#333',
                    fontSize: 12,
                },
            },
            'dark',
        );
    }

    // 🌟 节点点击事件
    lf.on('node:click', ({ data }) => {
        console.log('点击了节点:', data);
        if (props.workflowId) return;
        drawerType.value = 'node';
        currentNode.value = data;
        currentNodeConfig.value = {
            text: { value: typeof data.text === 'string' ? data.text : data.text?.value || '' },
            properties: {
                assignee: data.properties?.assignee || '', // 审批节点挂审批人
                formId: data.properties?.formId || '',
                remark: data.properties?.remark || '',
                condition: data.properties?.condition || '',
                agentRole: data.properties?.agentRole || '',
                agentRoleName: data.properties?.agentRoleName || agentRoleMap[data.properties?.agentRole] || '',
                riskThreshold: data.properties?.riskThreshold ?? 80,
                specialApproverId: data.properties?.specialApproverId || '', // 🌟 回显人机协同特批人
            },
        };
        // 若点击的是条件网关，加载所有出边供集中配置
        if (data.type === 'diamond') {
            loadDiamondOutgoingEdges(data.id);
        }
        drawerVisible.value = true;
    });

    // 🌟 连线点击事件（支持直接点击连线配置条件或兜底）
    lf.on('edge:click', ({ data }) => {
        console.log('点击了连线:', data);
        if (props.workflowId) return;
        drawerType.value = 'edge';
        currentEdge.value = data;

        const graphData = lf.getGraphData();
        const nodes = graphData.nodes || [];
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        const sourceNode = nodeMap.get(data.sourceNodeId);
        const targetNode = nodeMap.get(data.targetNodeId);

        const isFromDiamond = sourceNode?.type === 'diamond';
        const sourceName =
            (typeof sourceNode?.text === 'string' ? sourceNode.text : sourceNode?.text?.value) ||
            sourceNode?.id ||
            '起点';
        const targetName =
            (typeof targetNode?.text === 'string' ? targetNode.text : targetNode?.text?.value) ||
            targetNode?.id ||
            '终点';

        currentEdgeConfig.value = {
            text: typeof data.text === 'string' ? data.text : data.text?.value || '',
            condition: data.properties?.condition || '',
            isDefault: !!data.properties?.isDefault,
            remark: data.properties?.remark || '',
            isFromDiamond,
            sourceNodeName: sourceName,
            targetNodeName: targetName,
        };
        drawerVisible.value = true;
    });

    // 原有画布渲染逻辑
    lf.render();
    // 回显数据
    if (idkey) {
        lf.renderRawData(dataObj.value);
        if (props.appId) {
            getApprovalHistory().then(() => {
                injectNodeStatusIntoGraphData();
            });
        }
    }
};
// 通用的颜色计算函数
const calculateNodeColors = (properties, globalStatus) => {
    const status = properties?.nodeStatus;
    const title = properties?.nodeTitle;

    let fill, stroke;

    // 特殊处理开始和结束节点
    if (title === '开始') {
        fill = '#d4edda'; // 浅绿
        stroke = '#155724'; // 深绿
    } else if (title === '结束') {
        if (globalStatus == 2) {
            fill = '#c3e6cb'; // 整个流程通过 - 绿
            stroke = '#28a745';
        } else if (globalStatus == 3) {
            fill = '#f5c6cb'; // 整个流程拒绝 - 红
            stroke = '#dc3545';
        } else {
            fill = '#fff'; // 流程进行中 - 灰
            stroke = '#000';
        }
    } else {
        // 普通节点按状态着色
        switch (status) {
            case '2' || 2: // 通过
                fill = '#d4edda';
                stroke = '#155724';
                break;
            case '3' || 3: // 驳回
                fill = '#f5c6cb';
                stroke = '#dc3545';
                break;
            case '1' || 1: // 审批中
                fill = '#fff3cd';
                stroke = '#ffc107';
                break;
            default: // 未开始
                fill = '#fff';
                stroke = '#000';
                break;
        }
    }

    return { fill, stroke };
};

// 🌟 应用配置逻辑（适配连线及节点两种模式）
const applyConfig = () => {
    try {
        // 1. 连线（Edge）配置应用
        if (drawerType.value === 'edge') {
            if (!currentEdge.value?.id) {
                ElMessage.error('当前连线无效');
                return;
            }
            const edgeId = currentEdge.value.id;
            lf.setProperties(edgeId, {
                ...currentEdge.value.properties,
                condition: currentEdgeConfig.value.condition,
                isDefault: currentEdgeConfig.value.isDefault,
                remark: currentEdgeConfig.value.remark,
                branchType: currentEdgeConfig.value.isDefault ? 'default' : currentEdgeConfig.value.condition ? 'condition' : '',
            });
            lf.updateText(edgeId, currentEdgeConfig.value.text);
            ElMessage.success('连线配置更新成功');
            drawerVisible.value = false;
            return;
        }

        // 2. 节点（Node）配置应用
        if (!currentNode.value?.id) {
            ElMessage.error('当前节点无效');
            return;
        }
        // 🌟 强校验：若为 AI 智能审查节点，特批人必选
        if (currentNode.value.type === 'ai-agent') {
            if (!currentNodeConfig.value.properties.specialApproverId) {
                ElMessage.warning('人机协同特批人 (HITL) 为必选项，请选择特批复核人员');
                return;
            }
        }
        const nodeId = currentNode.value.id;
        lf.setProperties(nodeId, {
            ...currentNode.value.properties,
            ...currentNodeConfig.value.properties,
        });
        lf.updateText(nodeId, currentNodeConfig.value.text.value);

        // 若当前是条件网关（diamond），将出边卡片列表中的所有修改同步写入出边 properties 和文本
        if (currentNode.value.type === 'diamond' && diamondOutgoingEdges.value.length > 0) {
            diamondOutgoingEdges.value.forEach(edge => {
                lf.setProperties(edge.id, {
                    condition: edge.condition,
                    isDefault: edge.isDefault,
                    remark: edge.remark,
                    branchType: edge.isDefault ? 'default' : edge.condition ? 'condition' : '',
                });
                if (edge.text !== undefined) {
                    lf.updateText(edge.id, edge.text);
                }
            });
        }

        ElMessage.success('节点配置更新成功');
        drawerVisible.value = false;
    } catch (error) {
        console.error('更新配置失败:', error);
        ElMessage.error('更新失败: ' + (error.message || '未知错误'));
    }
};

const loadApiOptions = () => {
    let item = options.value.find(option => option.id == currentNodeConfig.value.properties.assignee);
    currentNodeConfig.value.properties.assigneeName = item ? item.name : '';
};
// 智能体字典定义（支持按领域分组，纯净无 icon 格式，支持快速拼音/关键字搜索）
const agentRoleGroups = [
    {
        domain: 'finance',
        domainName: '财务领域',
        roles: [
            { label: '财务-发票验真与查重初审专员', value: 'finance:invoice_audit' },
            { label: '财务-部门预算与额度管控专员', value: 'finance:budget_control' },
            { label: '财务-内控防舞弊与关联交易专员', value: 'finance:anti_fraud' },
            { label: '财务-合议风控并行审查专员', value: 'finance:joint_review' },
        ],
    },
    {
        domain: 'legal',
        domainName: '法务领域',
        roles: [
            { label: '法务-商务合同合规审查专员', value: 'legal:business_contract' },
            { label: '法务-劳动用工合规审查专员', value: 'legal:labor_compliance' },
        ],
    },
    {
        domain: 'hr',
        domainName: '人事领域',
        roles: [
            { label: '人事-考勤假勤与工时冲突核验员', value: 'hr:leave_attendance' },
        ],
    },
];

// 智能体名称速查字典
const agentRoleMap = {
    'finance:invoice_audit': '财务-发票验真与查重初审专员',
    'finance:budget_control': '财务-部门预算与额度管控专员',
    'finance:anti_fraud': '财务-内控防舞弊与关联交易专员',
    'finance:joint_review': '财务-合议风控并行审查专员',
    'legal:business_contract': '法务-商务合同合规审查专员',
    'legal:labor_compliance': '法务-劳动用工合规审查专员',
    'hr:leave_attendance': '人事-考勤假勤与工时冲突核验员',
};

const handleAgentRoleChange = val => {
    currentNodeConfig.value.properties.agentRoleName = agentRoleMap[val] || '';
};
// 获取审批历史 主要用于给流程设计器显示状态
const getApprovalHistory = async () => {
    try {
        let data = await proxy.$api.getApprovalHistory({ id: props.appId });
        if (data.code == 200) {
            approvalHistoryData.value = data.data;
            return approvalHistoryData.value;
        }
    } catch (error) {
        console.log(error);
    }
};

// 预览表单
const previewForm = async () => {
    const formId = ruleForm.value.formId || currentNodeConfig.value.properties.formId;
    if (!formId) {
        proxy.$message.warning('请先选择表单');
        return;
    }
    previewVisible.value = true;
    // 根据formId 查询表单接口
    const data = await proxy.$api.designDetail({ id: formId });
    if (data.code == 200) {
        formSchema.value = JSON.parse(data.data.schema);
        uiConfig.value = data.data.ui_config;
        formName.value = data.data.name;
    }
};

// 🌟 保存工作流（增加前端完整性强校验）
const saveWorkflow = async () => {
    const graphData = lf.getGraphData();
    const nodes = graphData.nodes || [];
    const edges = graphData.edges || [];

    // 1. 基础校验：必须有开始和结束节点
    const hasStart = nodes.some(n => n.type === 'circle' && (n.text === '开始' || n.text?.value === '开始'));
    const hasEnd = nodes.some(n => n.type === 'circle' && (n.text === '结束' || n.text?.value === '结束'));
    if (!hasStart || !hasEnd) {
        ElMessage.warning('流程必须包含【开始】和【结束】节点');
        return;
    }

    // 2. 🌟 排他条件网关强校验：至少 2 条出边，且必须配置分支条件
    for (const node of nodes) {
        if (node.type === 'diamond') {
            const nodeName = (typeof node.text === 'string' ? node.text : node.text?.value) || '条件网关';
            const outgoing = edges.filter(e => e.sourceNodeId === node.id);
            if (outgoing.length < 2) {
                ElMessage.warning(`条件网关【${nodeName}】必须至少连接 2 条分支连线（当前仅有 ${outgoing.length} 条）`);
                return;
            }
            const hasEdgeCond = outgoing.some(e => e.properties?.condition || e.properties?.isDefault);
            const hasNodeCond = !!node.properties?.condition;
            if (!hasEdgeCond && !hasNodeCond) {
                ElMessage.warning(`条件网关【${nodeName}】尚未配置分支条件，请点击该网关配置条件表达式或兜底分支`);
                return;
            }
        }
    }

    // 3. 🌟 节点人员必选强校验 (人工审批节点 assignee & AI智能体节点 specialApproverId)
    for (const node of nodes) {
        const nodeName = (typeof node.text === 'string' ? node.text : node.text?.value) || node.id;
        if (node.type === 'rect' && !node.properties?.assignee) {
            ElMessage.warning(`审批节点【${nodeName}】未配置审批人，请点击该节点配置审批人！`);
            return;
        }
        if (node.type === 'ai-agent' && !node.properties?.specialApproverId) {
            ElMessage.warning(`AI智能审查节点【${nodeName}】必须配置【人机协同特批人 (HITL)】，以防智能体检测异常挂起时无人复核！`);
            return;
        }
    }

    let obj = { ...ruleForm.value, graphData: graphData };
    let res = null;
    if (idkey) {
        obj.id = idkey;
    }
    try {
        res = await proxy.$api.logicadd(obj);
        if (res && res.code == 200) {
            ElMessage.success('保存成功');
            proxy.$router.push({ path: '/home/logicFlowList' });
        } else {
            ElMessage.error(res?.message || '保存失败');
        }
    } catch (error) {
        console.error('保存流程异常:', error);
        ElMessage.error(error.response?.data?.message || error.message || '保存失败');
    }
};
// 获取流程设计器
const getLogicdetail = async () => {
    try {
        const res = await proxy.$api.logicdetail({ id: idkey });
        if (res.code === 200) {
            ruleForm.value = res.data;
            dataObj.value = res.data.graphData;
            if (dataObj.value && dataObj.value.nodes) {
                dataObj.value.nodes = dataObj.value.nodes.map(node => {
                    let newType = node.type;
                    // 根据原始类型映射到自定义类型
                    if (node.type === 'rect') {
                        newType = 'rect';
                    } else if (node.type === 'circle') {
                        newType = 'circle';
                    } else if (node.type === 'diamond') {
                        newType = 'diamond';
                    } else if (node.type === 'ai-agent') {
                        newType = 'ai-agent';
                    }
                    return {
                        ...node,
                        type: newType,
                    };
                });
            }
            initLogicFlow();
        }
    } catch (error) {
        console.log(error);
    }
};
// 将审批状态的颜色直接注入到 graphData 中
const injectNodeStatusIntoGraphData = () => {
    lf.setProperties({ globalStatus: approvalHistoryData.value?.status });
    if (approvalHistoryData.value && approvalHistoryData.value.steps) {
        const { steps } = approvalHistoryData.value;
        steps.forEach(step => {
            // console.log('step', step);
            const { nodeId, status, title, userName, comment } = step;
            try {
                // 关键：只更新 properties，不碰 fill/stroke
                lf.setProperties(nodeId, {
                    nodeStatus: status, // 将状态存入 properties
                    nodeTitle: title, // 将标题存入 properties
                    assigneeName: userName || '', //设置审批人姓名
                    comment: comment || '', //设置审批人意见
                });
                // console.log(`节点 ${nodeId} 状态属性更新为: ${status}`, step);
            } catch (error) {
                console.warn(`节点 ${nodeId} 不存在或更新失败:`, error.message);
            }
        });
    }
};

const findAll = async () => {
    const res = await proxy.$api.findAll();
    if (res.code === 200) {
        options.value = res.data;
    }
};

const designNoPage = async () => {
    const res = await proxy.$api.designNoPage({ status: '1' });
    if (res.code === 200) {
        console.log('表单列表', res.data);
        mockFormList.value = res.data;
    }
};

// 初始化
onMounted(() => {
    if (idkey) {
        getLogicdetail();
    } else {
        nextTick().then(initLogicFlow());
    }
    findAll();
    designNoPage();
});
</script>

<style scoped>
.main-container {
    display: flex;
    height: calc(100vh - 116px);
    position: relative;
}

.dnd-panel {
    position: absolute;
    left: 10px;
    top: 10px;
    width: 180px;
    background-color: #10b981bf;
    box-shadow: 0 0 10px 1px #e4e0db;
    border-radius: 6px;
    z-index: 101;
    /* 插件默认标题样式调整 */
}

.toolbar {
    position: absolute;
    right: 10px;
    top: 68px;
    width: 253px;
    padding: 16px 10px;
    text-align: center;
    z-index: 1;
    border-radius: 5px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
    margin: 5px;
}

.canvas {
    flex: 1;
    height: 100%;
    position: relative;
}

.demo-ruleForm {
    margin-top: 20px;
}

.lf-node text {
    white-space: nowrap;
}

/* 🌟 网关多分支卡片与快捷标签样式 */
.gateway-branches-section {
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 16px;
}

.gateway-branches-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #edf2f7;
}

.gateway-branches-header .header-title {
    font-size: 13px;
    font-weight: 600;
    color: #1e293b;
}

.gateway-branches-header .header-count {
    font-size: 12px;
    color: #64748b;
    background-color: #e2e8f0;
    padding: 2px 8px;
    border-radius: 10px;
}

.empty-branches-tip {
    padding: 10px 0;
}

.branch-cards-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.branch-card-item {
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    background-color: #ffffff;
}

:deep(.branch-card-item .el-card__header) {
    padding: 8px 12px;
    background-color: #f8fafc;
    border-bottom: 1px solid #f1f5f9;
}

:deep(.branch-card-item .el-card__body) {
    padding: 12px;
}

.branch-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.branch-target-info {
    font-size: 12px;
    color: #475569;
}

.quick-tags-box {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
}

.quick-tags-box.mini {
    gap: 4px;
    margin-top: 4px;
}

.quick-tag-label {
    font-size: 12px;
    color: #94a3b8;
}

.quick-tag {
    cursor: pointer;
    transition: all 0.2s;
    user-select: none;
}

.quick-tag:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.default-branch-tip {
    font-size: 12px;
    color: #e6a23c;
    background-color: #fdf6ec;
    border-radius: 4px;
    padding: 6px 10px;
    line-height: 1.5;
}
</style>

<style>
.lf-control-text {
    color: black !important;
}
.el-drawer__body {
    padding: 0px;
}
.el-drawer__header {
    margin-bottom: 16px;
}
</style>

