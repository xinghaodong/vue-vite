<!-- ApprovalDrawer.vue -->
<template>
    <el-drawer :model-value="visible" :title="formName" direction="rtl" size="70%" class="form-drawer" @update:visible="$emit('update:visible', $event)" @close="$emit('close')">
        <div class="drawer-header">
            <div class="form-title" style="display: flex; align-items: center; gap: 8px">
                <el-tag :type="activeStatusTag" size="large" style="min-width: 88px">
                    <el-icon v-if="status == 0" class="is-loading" style="margin-right: 4px; vertical-align: -1px"><Loading /></el-icon>
                    {{ activeStatus }}
                </el-tag>
                <span v-if="isHitlSuspended && instance?.currentApproverName" style="font-size: 13px; color: #e6a23c; font-weight: 500">
                    (待特批人 [{{ instance.currentApproverName }}] 审批)
                </span>
            </div>
        </div>
        <el-tabs type="border-card" v-model="activeTab" class="form-tabs">
            <el-tab-pane label="表单信息" name="form">
                <div class="form-content">
                    <!-- 🌟 发起人或无审批权限人员查看时，明确提示当前单据卡在谁那里审批特批 -->
                    <div v-if="!noApproval && isHitlSuspended" class="hitl-suspend-banner" style="margin-bottom: 14px">
                        <el-alert
                            :title="`单据已挂起待特批：正在等待特批人 [${instance.currentApproverName}] 审批放行`"
                            type="warning"
                            :closable="false"
                            show-icon
                        >
                            <template #default>
                                <div style="font-size: 13px; color: #b88230; margin-top: 4px; line-height: 1.5">
                                    {{ hitlSuspendInfo?.message }}
                                </div>
                            </template>
                        </el-alert>
                    </div>

                    <template v-if="noApproval">
                        <div class="approval-section">
                            <!-- 🌟 HITL 人机协同挂起专属特批横幅提示 (特批人自己操作时) -->
                            <div v-if="isHitlSuspended" class="hitl-suspend-banner" style="margin-bottom: 12px">
                                <el-alert :title="`AI人机协同挂起：检测到业务异常，等待特批人 [${instance.currentApproverName}] 复核`" type="warning" :closable="false" show-icon>
                                    <template #default>
                                        <div style="font-size: 13px; color: #b88230; margin-top: 4px; line-height: 1.5">
                                            {{ hitlSuspendInfo?.message }}
                                        </div>
                                    </template>
                                </el-alert>
                            </div>

                            <div class="approval-history">
                                <div class="approval-item">
                                    <div class="approval-actions">
                                        <el-radio-group v-model="approvalStatus" @change="handleApprovalStatusChange">
                                            <el-radio label="2">{{ isHitlSuspended ? '同意特批放行' : '同意' }}</el-radio>
                                            <el-radio label="3">{{ isHitlSuspended ? '不予特批·驳回' : '驳回' }}</el-radio>
                                        </el-radio-group>
                                        <el-tag v-if="aiDecisionTag" :type="aiDecisionTag.type" size="small" effect="light" class="ai-decision-tag">
                                            🤖 {{ aiDecisionTag.text }}
                                        </el-tag>
                                    </div>
                                </div>
                                <div class="approval-item current">
                                    <div class="approval-user" style="display: flex; justify-content: space-between; align-items: center; width: 100%">
                                        <span>{{ isHitlSuspended ? '特批复核意见' : '审批意见' }}</span>
                                        <el-button v-if="aiRealSummary" link type="primary" size="small" @click="applyAiSummary" style="font-weight: normal">
                                            引用AI初审结论
                                        </el-button>
                                    </div>
                                    <el-input
                                        v-model="currentApproval"
                                        @input="onApprovalInput"
                                        type="textarea"
                                        :placeholder="isHitlSuspended ? '请输入特批放行理由或驳回说明...' : '请输入审批意见...'"
                                        :rows="3"
                                        class="approval-input"
                                    />
                                </div>
                            </div>
                            <div class="submit-section">
                                <el-button type="primary" @click="handleSubmitApproval">
                                    {{ isHitlSuspended ? '提交特批决定' : '提交审批' }}
                                </el-button>
                            </div>
                        </div>
                        <el-divider />
                    </template>

                    <!-- 🤖 AI 智能初审报告可视化卡片 (支持多 Agent 审查报告列表) -->
                    <div v-if="aiAuditSteps.length > 0" class="ai-audit-cards-wrapper">
                        <div v-for="(step, sIdx) in aiAuditSteps" :key="step.nodeId" class="ai-audit-card" :style="sIdx > 0 ? 'margin-top: 14px;' : ''">
                            <div class="ai-audit-header">
                                <div class="ai-title-wrap">
                                    <span class="ai-badge">🤖 AI 智能审查报告</span>
                                    <span class="ai-role">{{ step.userName }}</span>
                                </div>
                                <div class="ai-score-wrap">
                                    <span class="score-label">合规得分:</span>
                                    <el-tag :type="getStepScoreTagType(step)" size="large" effect="dark" class="score-tag">
                                        {{ step.auditResult.complianceScore }} 分
                                    </el-tag>
                                    <el-tag :type="getStepDecisionTagType(step)" size="small">
                                        {{ getStepDecisionText(step) }}
                                    </el-tag>
                                </div>
                            </div>

                            <!-- 🌟 特批放行 / 驳回 专属说明横幅 -->
                            <div v-if="step.specialApproval" class="special-approval-tip-box" :class="step.specialApproval.approved ? 'is-pass' : 'is-reject'">
                                <div class="tip-header">
                                    <span class="tip-title">{{ step.specialApproval.approved ? '特批放行说明' : '特批驳回原因' }}</span>
                                    <span class="tip-meta">
                                        <span>特批人: {{ step.specialApproval.approverName }}</span>
                                        <span v-if="step.specialApproval.approvedAt">特批时间: {{ step.specialApproval.approvedAt }}</span>
                                    </span>
                                </div>
                                <div class="tip-content">{{ step.specialApproval.comment }}</div>
                            </div>

                            <div class="ai-summary-box"><strong>审查结论：</strong> {{ step.auditResult.summary }}</div>

                            <!-- 存疑异常项清单 -->
                            <div v-if="step.auditResult.anomalyList && step.auditResult.anomalyList.length > 0" class="ai-anomalies-box">
                                <div class="anomaly-title">
                                    <el-icon style="color: #f56c6c; margin-right: 6px"><WarningFilled /></el-icon>
                                    <span>检测到疑似异常项 (共 {{ step.auditResult.anomalyList.length }} 处)：</span>
                                </div>
                                <div class="anomaly-list">
                                    <div v-for="(item, idx) in step.auditResult.anomalyList" :key="idx" class="anomaly-item" :class="'severity-' + item.severity">
                                        <div class="item-head">
                                            <el-tag :type="riskSeverityMap[item.severity]?.type || 'info'" size="small">
                                                {{ riskSeverityMap[item.severity]?.label || '异常' }}
                                            </el-tag>
                                            <span v-if="item.invoiceName" class="file-tag">📄 {{ item.invoiceName }}</span>
                                        </div>
                                        <div class="item-desc">{{ item.description }}</div>
                                    </div>
                                </div>
                            </div>
                            <div v-else class="ai-clean-box">
                                <el-icon style="color: #67c23a; margin-right: 6px">
                                    <CircleCheckFilled />
                                </el-icon>
                                <span>{{ step.auditResult.checkSummary }}</span>
                            </div>
                        </div>
                    </div>
                    <!-- 🤖 AI 后台初审进行中占位卡片 (独立显示，不被前置智能体已完成卡片遮蔽) -->
                    <div v-if="hasPendingAiAgent" class="ai-audit-card ai-processing-card" :style="aiAuditSteps && aiAuditSteps.length > 0 ? 'margin-top: 14px;' : ''">
                        <div class="ai-processing-content">
                            <el-icon class="is-loading" style="font-size: 18px; color: #409eff; margin-right: 8px"><Loading /></el-icon>
                            <span style="color: #409eff; font-weight: 500">{{ aiProcessingMessage }}</span>
                            <el-button link type="primary" size="small" style="margin-left: 12px" @click="getApprovalHistory(true)">刷新结果</el-button>
                        </div>
                    </div>

                    <div class="application-section">
                        <h3>申请信息</h3>
                        <DynamicForm
                            :noApproval="noreq"
                            :schema="formSchema"
                            :ui-config="uiConfig"
                            :model-value="displayFormData"
                            @update:model-value="$emit('update:formData', $event)"
                            class="dynamic-form"
                        />
                    </div>
                </div>
            </el-tab-pane>
            <el-tab-pane label="审批记录" name="workflow">
                <div class="workflow-content">
                    <div class="workflow-steps">
                        <el-steps :active="activeStep" direction="vertical">
                            <el-step
                                v-for="(step, index) in steps"
                                :key="step.nodeId"
                                :title="step.title"
                                :description="getDescription(step, index)"
                                :status="getStepStatus(step.status, index)"
                            />
                        </el-steps>
                    </div>
                </div>
            </el-tab-pane>
            <el-tab-pane lazy label="审批流程图" name="workflow1">
                <LogicFlow :workflow-id="workflowId" :app-id="rowId" />
            </el-tab-pane>
        </el-tabs>
    </el-drawer>
</template>

<script setup>
import { ref, computed, watch, getCurrentInstance, onMounted, onUnmounted } from 'vue';
import { WarningFilled, CircleCheckFilled, Loading } from '@element-plus/icons-vue';
import DynamicForm from '@/pages/formDesign/components/DynamicForm.vue';
import LogicFlow from '@/pages/workflowDesigner/logicFlow.vue';
import useUserInfoStore from '@/stortes/user'; //引入仓库
const userInfoStore = useUserInfoStore();
const { proxy } = getCurrentInstance();
const props = defineProps({
    visible: { type: Boolean, default: false },
    formName: { type: String, default: '' },
    formSchema: { type: Object, default: () => ({}) },
    uiConfig: { type: Object, default: () => ({}) },
    formData: { type: Object, default: () => ({}) },
    rowId: { type: [String, Number], default: '' },
    workflowId: { type: [String, Number], default: '' },
    noApproval: { type: Boolean, default: false },
    noreq: { type: Boolean, default: false },
});

const emit = defineEmits(['update:visible', 'close', 'submit', 'update:formData']); // 添加 update:formData

const activeTab = ref('form');
const approvalStatus = ref('2');
const currentApproval = ref('');
const instance = ref({});
const steps = ref([]);
const status = ref(0);

// 用户是否手动编辑了审批意见
const userManuallyEdited = ref(false);
// 记录系统自动预填的意见内容，以便智能切换
const autoGeneratedReason = ref('');

// 🌟 判定当前单据是否处于人机协同挂起等待特批状态
const isHitlSuspended = computed(() => {
    // 1. 单据未处于待处理状态(status != 1)直接返回 false
    if (status.value != 1) return false;

    // 2. 获取当前流转到的活动步骤
    const currentStep = steps.value.find(s => s.nodeId == instance.value?.currentNodeId);

    // 3. 核心铁律：若当前审批节点是人工审批节点 (rect，如部门经理/财务主管)，100% 属于常规人工审批，绝非 AI 特批！
    if (currentStep && currentStep.type === 'rect') {
        return false;
    }
    if (instance.value?.currentNodeType === 'rect') {
        return false;
    }

    // 4. 只有当当前活动节点本身就是 AI 智能体节点，且处于挂起等待特批时，才判定为 true
    const fd = instance.value?.formData || props.formData || {};
    if (fd._isSuspended && fd._suspendedNodeId === instance.value?.currentNodeId) {
        return true;
    }
    if (currentStep?.type === 'ai-agent' && (currentStep?.isSuspended || currentStep?.status == '1')) {
        return true;
    }

    return false;
});

// 提取挂起上下文信息
const hitlSuspendInfo = computed(() => {
    if (!isHitlSuspended.value) return null;
    const fd = instance.value?.formData || props.formData || {};
    if (fd._suspendedSuspendInfo) return fd._suspendedSuspendInfo;
    const currentStep = steps.value.find(s => s.nodeId == instance.value?.currentNodeId);
    return currentStep?.suspendInfo || currentStep?.auditResult?.suspendInfo || null;
});

// 异常项风险等级映射字典
const riskSeverityMap = {
    high: { type: 'danger', label: '高风险' },
    medium: { type: 'warning', label: '中风险' },
    low: { type: 'info', label: '低风险' },
};

// 审查步骤合规评分 Tag 颜色类型 (纯粹由大模型客观打分分值决定)
const getStepScoreTagType = step => {
    const score = step.auditResult?.complianceScore ?? 0;
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
};

// 审查步骤结论 Tag 类型
const getStepDecisionTagType = step => {
    if (step.specialApproval) {
        return step.specialApproval.approved ? 'warning' : 'danger';
    }
    return step.auditResult?.pass ? 'success' : 'danger';
};

// 审查步骤结论 Tag 文案
const getStepDecisionText = step => {
    if (step.specialApproval) {
        return step.specialApproval.approved ? '特批放行' : '特批驳回';
    }
    return step.auditResult?.pass ? '建议通过' : '建议复核';
};

// 提取 AI 判定结果 (是否通过)
const aiPassStatus = computed(() => {
    const fd = displayFormData.value;
    if (typeof fd.ai_pass === 'boolean') return fd.ai_pass;
    return aiAuditStep.value?.auditResult?.pass ?? null;
});

// 提取 AI 原生总结
const aiRealSummary = computed(() => {
    const fd = displayFormData.value;
    return fd.aiRealSpeech?.summary || aiAuditStep.value?.auditResult?.summary || '';
});

// AI 预选建议标签
const aiDecisionTag = computed(() => {
    if (isHitlSuspended.value) {
        return { type: 'warning', text: '人机协同·需特批复核放行' };
    }
    if (aiPassStatus.value === false) {
        return { type: 'danger', text: 'AI建议驳回（已自动勾选）' };
    }
    if (aiPassStatus.value === true) {
        return { type: 'success', text: 'AI建议通过（已自动勾选）' };
    }
    return null;
});

// 自动根据 AI 初审结果联动勾选与填充审批意见
const autoFillApprovalDecision = (force = false) => {
    // 1. 若处于人机协同挂起状态，优先预选特批放行并填充特批理由
    if (isHitlSuspended.value) {
        approvalStatus.value = '2';
        const isOverdue = hitlSuspendInfo.value?.type === 'OVERDUE_INVOICE' || hitlSuspendInfo.value?.message?.includes('超期');
        const hitlApproveText = isOverdue ? '确认发票超期事由属于业务延期结算，符合报销真实性，同意特批放行报销。' : '确认业务背景与合理性，符合公司特批管理规范，同意特批放行。';
        if (!userManuallyEdited.value || force) {
            currentApproval.value = hitlApproveText;
            autoGeneratedReason.value = hitlApproveText;
        }
        return;
    }

    const pass = aiPassStatus.value;
    const summary = aiRealSummary.value;

    if (pass === null) return;

    if (pass === false) {
        // AI 审核未通过 -> 自动预选驳回（3）
        approvalStatus.value = '3';
        const rejectText = summary || '经AI智能初审，存在严重违规项，予以驳回，请核对后重新发起。';
        if (!userManuallyEdited.value || force) {
            currentApproval.value = rejectText;
            autoGeneratedReason.value = rejectText;
        }
    } else if (pass === true) {
        // AI 审核通过 -> 自动预选同意（2）
        approvalStatus.value = '2';
        const approveText = summary || 'AI智能初审通过，发票真实有效，同意报销。';
        if (!userManuallyEdited.value || force) {
            currentApproval.value = approveText;
            autoGeneratedReason.value = approveText;
        }
    }
};

// 单选框切换事件：随勾选联动变更审批意见
const handleApprovalStatusChange = val => {
    const summary = aiRealSummary.value;
    const isAiPass = aiPassStatus.value;
    // 如果处于特批状态
    if (isHitlSuspended.value) {
        if (!userManuallyEdited.value || currentApproval.value === autoGeneratedReason.value || !currentApproval.value.trim()) {
            const isOverdue = hitlSuspendInfo.value?.type === 'OVERDUE_INVOICE' || hitlSuspendInfo.value?.message?.includes('超期');
            if (val === '2') {
                const text = isOverdue ? '确认发票不符合实际情况，同意特批放行报销。' : '确认业务背景与合理性，符合公司特批管理规范，同意特批放行。';
                currentApproval.value = text;
                autoGeneratedReason.value = text;
            } else if (val === '3') {
                const text = isOverdue ? '发票不符合实际情况，不符合企业财务管理制度，予以驳回。' : '经人工特批复核，核实业务存疑或不符合特批放行准则，予以驳回。';
                currentApproval.value = text;
                autoGeneratedReason.value = text;
            }
        }
        return;
    }

    // 常规状态切换
    if (!userManuallyEdited.value || currentApproval.value === autoGeneratedReason.value || !currentApproval.value.trim()) {
        if (val === '3') {
            const text = summary || '经合规初审存在异常项，予以驳回。';
            currentApproval.value = text;
            autoGeneratedReason.value = text;
        } else if (val === '2') {
            const text = isAiPass === true && summary ? summary : 'AI初审合规，同意报销。';
            currentApproval.value = text;
            autoGeneratedReason.value = text;
        }
    }
};

// 输入框输入事件：标记用户已主动干预
const onApprovalInput = () => {
    if (currentApproval.value !== autoGeneratedReason.value) {
        userManuallyEdited.value = true;
    }
};

// 一键应用 AI 审查结论
const applyAiSummary = () => {
    const summary = aiRealSummary.value;
    if (summary) {
        currentApproval.value = summary;
        autoGeneratedReason.value = summary;
        userManuallyEdited.value = false;
        proxy.$message?.success?.('已填入AI初审结论');
    }
};

// 重置操作状态
const resetApprovalState = () => {
    userManuallyEdited.value = false;
    autoGeneratedReason.value = '';
    currentApproval.value = '';
    approvalStatus.value = '2';
};

// 表单详情优先使用 getApprovalHistory 实时获取的 instance.formData
const displayFormData = computed(() => {
    return instance.value?.formData || props.formData || {};
});

// 获取流程中经过的所有已完成 AI 审查步骤列表 (后端已标准化装配 steps)
const aiAuditSteps = computed(() => {
    return (steps.value || []).filter(step => step.type === 'ai-agent' && step.auditResult);
});

// 首个或当前 AI 审查步骤
const aiAuditStep = computed(() => {
    return aiAuditSteps.value[0] || null;
});

// 🌟 判定流程中是否存在尚未产出结论、正在后台审核中的 AI 智能体节点 (全多智能体串联感知)
const hasPendingAiAgent = computed(() => {
    // 0. 全局流程实例已终结 (2: 已通过, 3: 已驳回)，整个流程已结束，绝无后台运行中的 AI 智能体！
    const globalStatus = status.value !== undefined ? status.value : instance.value?.status;
    if (globalStatus == 2 || globalStatus == 3) {
        return false;
    }

    // 1. 如果当前正好处于人机协同挂起等待特批人决策，属于等待人工操作，不属于后台 AI 运算中
    if (isHitlSuspended.value) {
        return false;
    }

    const currentNodeId = instance.value?.currentNodeId;

    // 2. 检查当前节点或激活节点是否是正在后台运算中的 ai-agent
    return (steps.value || []).some(step => {
        if (step.type !== 'ai-agent') return false;
        // 已有特批放行/驳回记录，说明已完成
        if (step.specialApproval) return false;
        // 已有审核结果，说明已完成
        if (step.auditResult) return false;
        // 若该节点挂起等待特批，不属于后台运算
        if (step.isSuspended) return false;
        // 节点已终结 (2: 已通过, 3: 已驳回)，不属于运行中
        if (step.status == 2 || step.status == 3) return false;

        // 🌟 核心判断：节点必须处于激活执行状态 (正在运行 status == 0，或者正是当前流转停驻的节点 currentNodeId)
        // 绝对不能把下游还未流转到的排队节点 (step.status 为空且非 currentNodeId) 误判为运行中！
        const isCurrentlyActive = step.status == 0 || (globalStatus == 0 && step.nodeId === currentNodeId);
        return isCurrentlyActive;
    });
});

// 当前正在后台运行中的 AI 智能体步骤
const pendingAiStep = computed(() => {
    if (!hasPendingAiAgent.value) return null;
    const currentNodeId = instance.value?.currentNodeId;
    return (steps.value || []).find(step => step.nodeId === currentNodeId && step.type === 'ai-agent' && !step.auditResult) ||
        (steps.value || []).find(step => step.type === 'ai-agent' && step.status == 0 && !step.auditResult) ||
        (steps.value || []).find(step => step.type === 'ai-agent' && !step.auditResult && !step.specialApproval && !step.isSuspended);
});

// 动态根据智能体角色和表单数据生成审核中文案
const aiProcessingMessage = computed(() => {
    const step = pendingAiStep.value;
    const role = step?.properties?.agentRole || 'finance_reimbursement';
    const roleName = step?.properties?.agentRoleName || step?.userName || 'AI智能初审员';

    // 如果流程设计器中配置了自定义提示语
    if (step?.properties?.processingHint) {
        return `🤖 【${roleName}】${step.properties.processingHint}`;
    }

    switch (role) {
        case 'finance:invoice_audit':
        case 'finance_reimbursement': {
            let invoiceCount = 0;
            const formObj = instance.value?.formData || props.formData || {};
            for (const key of Object.keys(formObj)) {
                const val = formObj[key];
                if (Array.isArray(val) && val.length > 0 && (val[0]?.url || val[0]?.filePath)) {
                    invoiceCount = val.length;
                    break;
                }
            }
            const countText = invoiceCount > 0 ? `对 ${invoiceCount} 张发票凭证` : '对报销发票凭证';
            return `🤖 【${roleName}】正在后台${countText}执行 GB 32100 税号算法核验与发票查重比对，请稍候...`;
        }
        case 'finance:budget_control': {
            return `💰 【${roleName}】正在核查申请人所属部门季度预算额度与超标限额，请稍候...`;
        }
        case 'finance:joint_review': {
            return `🤝 【${roleName}】正在并行执行发票验真 + 预算管控双线合议审查，请稍候...`;
        }
        case 'finance:anti_fraud': {
            return `🔍 【${roleName}】正在核验开票主体关联交易特征、连号集中开票与套现舞弊风险，请稍候...`;
        }
        case 'legal:business_contract':
        case 'contract_compliance': {
            return `📜 【${roleName}】正在后台深度分析商务合同条款权责、付款账期、违约免责与履约风险，请稍候...`;
        }
        case 'legal:labor_compliance': {
            return `⚖️ 【${roleName}】正在审查员工劳动用工协议合规性与竞业限制条款，请稍候...`;
        }
        case 'hr:leave_attendance':
        case 'attendance_compliance': {
            return `📅 【${roleName}】正在比对打卡流水工时、年假额度扣减与考勤冲突规则，请稍候...`;
        }
        default: {
            return `🤖 【${roleName}】正在后台进行智能合规初审，请稍候...`;
        }
    }
});

// 计算当前激活的步骤
const activeStep = computed(() => {
    const currentIndex = steps.value.findIndex(step => step.nodeId == instance.value?.currentNodeId);
    return currentIndex >= 0 ? currentIndex : steps.value.length;
});

const activeStatus = computed(() => {
    if (isHitlSuspended.value && status.value == 1) return '待特批放行';
    if (status.value == 0) return 'AI审核中';
    if (status.value == 1) return '待审批';
    if (status.value == 2) return '通过';
    if (status.value == 3) return '驳回';
    return '流转中';
});

const activeStatusTag = computed(() => {
    if (isHitlSuspended.value && status.value == 1) return 'warning';
    if (status.value == 0) return 'primary';
    if (status.value == 1) return 'warning';
    if (status.value == 2) return 'success';
    if (status.value == 3) return 'danger';
    return 'info';
});

// 格式化描述信息
const getDescription = (step, index) => {
    if (index == 0) return `申请人: ${step.userName}\n发起时间: ${step.approvedAt}\n`;
    if (step.type == 'circle') return '';
    if (step.type == 'ai-agent') {
        // 场景 1：如果存在人工特批放行/驳回记录 (HITL 人机协同特批)
        if (step.specialApproval) {
            const action = step.specialApproval.approved ? '特批放行通过' : '特批驳回';
            return `智能体角色: ${step.userName}\n处理结果: 经特批人 [${step.specialApproval.approverName}] ${action}\n特批意见: ${step.specialApproval.comment}\n特批时间: ${step.specialApproval.approvedAt}`;
        }

        // 场景 2：当前正在挂起等待特批复核
        if (step.isSuspended || (step.status == 1 && isHitlSuspended.value && step.nodeId == instance.value?.currentNodeId)) {
            const approver = step.specialApproverName || instance.value?.currentApproverName;
            return `智能体角色: ${step.userName}\n当前状态: 检测到业务异常已挂起，等待特批人 [${approver}] 复核...`;
        }

        // 场景 3：后台合规审查中
        if (step.status == 0 || !step.auditResult) {
            return `智能体角色: ${step.userName}\n当前状态: 正在后台合规审查中...`;
        }

        // 场景 4：正常 AI 初审完成
        return `智能体角色: ${step.userName}\n合规得分: ${step.auditResult.complianceScore} 分\n初审意见: ${step.comment || step.auditResult.summary}\n审查时间: ${step.approvedAt}`;
    }
    if (step.status == 0) return `审批人: ${step.userName} 待审批...`;
    if (step.status == 1) return `审批人: ${step.userName} 审批中...`;
    if (step.status == 2) {
        return `审批人: ${step.userName}\n审批时间: ${step.approvedAt}\n备注: ${step.comment || '无'}`;
    }
    if (step.status == 3) {
        return `审批人: ${step.userName}\n审批时间: ${step.approvedAt}\n备注: ${step.comment || '无'}\n状态: 驳回`;
    }
    return '';
};

// 转换步骤状态
const getStepStatus = (status, index) => {
    if (status == 0 && index == steps.value.length - 1) {
        return 'process';
    }
    if (index == 0) return 'finish';
    if (status == 0) return index == 0 ? 'finish' : 'wait';
    if (status == 1) return 'process';
    if (status == 2) return 'finish';
    if (status == 3) return 'error';
    return 'wait';
};

// 提交审批
const handleSubmitApproval = async () => {
    const obj = {
        id: props.rowId,
        userId: userInfoStore.userInfo.id,
        status: approvalStatus.value,
        comment: currentApproval.value,
    };
    emit('submit', obj);
};

let pollTimer = null;
const stopPolling = () => {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
};

const checkAndStartPolling = () => {
    stopPolling();
    // 整个流程已被驳回 (3) 或已通过 (2)，流程彻底终结，绝不启动轮询
    const globalStatus = status.value !== undefined ? status.value : instance.value?.status;
    if (globalStatus == 2 || globalStatus == 3) {
        return;
    }
    // 只有在真正存在运行中的 AI 智能体时才启动轮询 (每 1.5 秒一次，最多 25 次)
    if (hasPendingAiAgent.value) {
        let pollCount = 0;
        pollTimer = setInterval(async () => {
            pollCount++;
            if (pollCount > 25) {
                stopPolling();
                return;
            }
            await getApprovalHistory(false);
            const currentStatus = status.value !== undefined ? status.value : instance.value?.status;
            if (!hasPendingAiAgent.value || currentStatus == 2 || currentStatus == 3) {
                stopPolling();
            }
        }, 1500);
    }
};

const getApprovalHistory = async (startPoll = true) => {
    try {
        const data = await proxy.$api.getApprovalHistory({ id: props.rowId });
        instance.value = data.data || {};
        steps.value = data.data?.steps || [];
        status.value = data.data?.status;
        if (data.data?.formData) {
            emit('update:formData', data.data.formData);
        }
        // 🌟 自动根据 AI 初审结果联动勾选与填充审批意见
        autoFillApprovalDecision();

        if (startPoll) {
            checkAndStartPolling();
        }
    } catch (error) {
        console.log(error);
        stopPolling();
    }
};

// 监听 activeTab 变化
watch(activeTab, val => {
    if (val === 'workflow') {
        getApprovalHistory(false);
    }
});

watch(
    () => props.rowId,
    () => {
        resetApprovalState();
    },
);

watch(
    () => props.visible,
    val => {
        if (!val) {
            stopPolling();
        } else {
            resetApprovalState();
            getApprovalHistory(true);
        }
    },
);

onMounted(() => {
    getApprovalHistory(true);
});

onUnmounted(() => {
    stopPolling();
});
</script>

<style scoped>
.drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    padding-top: 10px;
}

.form-title {
    display: flex;
    align-items: center;
    gap: 12px;
}

.form-title h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
}

.form-tabs {
    padding: 0 24px;
}

.approval-section {
    margin-bottom: 24px;
    padding-left: 10px;
}

.approval-section h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
    margin-top: 0px;
}

.approval-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
}

.approval-item.current {
    flex-direction: column;
    gap: 12px;
}

.approval-user {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
}

.approval-actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

.ai-decision-tag {
    font-weight: 500;
}

.submit-section {
    text-align: center;
    margin-top: 15px;
}

/* AI 智能审查卡片美化 */
.ai-audit-card {
    background: linear-gradient(135deg, #fbfaff 0%, #f8f6ff 100%);
    border: 1px solid #dcd1f6;
    border-radius: 8px;
    padding: 16px 18px;
    margin-bottom: 20px;
    box-shadow: 0 2px 8px rgba(124, 58, 237, 0.06);
}

.ai-audit-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.ai-title-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
}

.ai-badge {
    font-size: 15px;
    font-weight: 700;
    color: #6366f1;
}

.ai-role {
    font-size: 12px;
    color: #64748b;
    background: #ede9fe;
    padding: 2px 8px;
    border-radius: 12px;
}

.ai-score-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
}

.score-label {
    font-size: 13px;
    color: #475569;
}

.score-tag {
    font-weight: bold;
    font-size: 14px;
}

/* 🌟 特批放行 / 驳回 说明横幅样式 */
.special-approval-tip-box {
    margin-top: 10px;
    margin-bottom: 12px;
    padding: 10px 14px;
    border-radius: 6px;
    font-size: 13px;
    line-height: 1.6;
}

.special-approval-tip-box.is-pass {
    background: #fdf6ec;
    border: 1px solid #faecd8;
    color: #b88230;
}

.special-approval-tip-box.is-reject {
    background: #fef0f0;
    border: 1px solid #fde2e2;
    color: #f56c6c;
}

.special-approval-tip-box .tip-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
}

.special-approval-tip-box .tip-title {
    font-weight: 600;
}

.special-approval-tip-box .tip-meta {
    font-size: 12px;
    display: flex;
    gap: 12px;
    opacity: 0.85;
}

.special-approval-tip-box .tip-content {
    word-break: break-word;
}

.ai-summary-box {
    font-size: 14px;
    color: #334155;
    background: #ffffff;
    padding: 10px 14px;
    border-radius: 6px;
    border: 1px solid #f1f5f9;
    margin-bottom: 12px;
    line-height: 1.6;
}

.ai-anomalies-box {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 6px;
    padding: 12px 14px;
}

.anomaly-title {
    display: flex;
    align-items: center;
    font-size: 14px;
    font-weight: 600;
    color: #dc2626;
    margin-bottom: 8px;
}

.anomaly-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.anomaly-item {
    background: #ffffff;
    border-radius: 4px;
    padding: 8px 12px;
    border-left: 3px solid #ef4444;
}

.anomaly-item.severity-medium {
    border-left-color: #f59e0b;
}

.anomaly-item.severity-low {
    border-left-color: #3b82f6;
}

.item-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
}

.file-tag {
    font-size: 12px;
    color: #64748b;
}

.item-desc {
    font-size: 13px;
    color: #1e293b;
    line-height: 1.5;
}

.ai-clean-box {
    display: flex;
    align-items: center;
    font-size: 13px;
    color: #15803d;
    background: #f0fdf4;
    padding: 10px 14px;
    border-radius: 6px;
    border: 1px solid #bbf7d0;
}

.ai-processing-card {
    border-left: 4px solid #409eff;
    background: #f0f9ff;
    padding: 14px 18px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(64, 158, 255, 0.08);
    margin-bottom: 20px;
}

.ai-processing-content {
    display: flex;
    align-items: center;
    font-size: 14px;
}
</style>
