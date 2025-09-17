<!-- ApprovalDrawer.vue -->
<template>
    <el-drawer :model-value="visible" :title="formName" direction="rtl" size="70%" class="form-drawer" @update:visible="$emit('update:visible', $event)" @close="$emit('close')">
        <div class="drawer-header">
            <div class="form-title">
                <el-tag :type="activeStatusTag" size="large">{{ activeStatus }}</el-tag>
            </div>
        </div>
        <el-tabs type="border-card" v-model="activeTab" class="form-tabs">
            <el-tab-pane label="表单信息" name="form">
                <div class="form-content">
                    <template v-if="noApproval">
                        <div class="approval-section">
                            <div class="approval-history">
                                <div class="approval-item">
                                    <div class="approval-actions">
                                        <el-radio-group v-model="approvalStatus">
                                            <el-radio label="2">同意</el-radio>
                                            <el-radio label="3">驳回</el-radio>
                                        </el-radio-group>
                                    </div>
                                </div>
                                <div class="approval-item current">
                                    <div class="approval-user">
                                        <span>审批意见</span>
                                    </div>
                                    <el-input v-model="currentApproval" type="textarea" placeholder="请输入审批意见..." :rows="3" class="approval-input" />
                                </div>
                            </div>
                            <div class="submit-section">
                                <el-button type="primary" @click="handleSubmitApproval">提交审批</el-button>
                            </div>
                        </div>
                        <el-divider />
                    </template>
                    <div class="application-section">
                        <h3>申请信息</h3>
                        <DynamicForm
                            :noApproval="noreq"
                            :schema="formSchema"
                            :ui-config="uiConfig"
                            :model-value="formData"
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
import { ref, computed, watch, getCurrentInstance, onMounted } from 'vue';
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
const instance = ref([]);
const steps = ref([]);
const status = ref(0);

// 计算当前激活的步骤
const activeStep = computed(() => {
    const currentIndex = steps.value.findIndex(step => step.nodeId == instance.currentNodeId);
    return currentIndex >= 0 ? currentIndex : steps.value.length;
});

const activeStatus = computed(() => {
    if (status.value == 1) return '待审批';
    if (status.value == 2) return '通过';
    if (status.value == 3) return '驳回';
});

const activeStatusTag = computed(() => {
    if (status.value == 1) return 'warning';
    if (status.value == 2) return 'success';
    if (status.value == 3) return 'danger';
});
// 格式化描述信息
const getDescription = (step, index) => {
    if (index == 0) return `申请人: ${step.userName || '未知'}\n发起时间: ${step.approvedAt || '-'}\n`;
    if (step.type == 'circle') return '';
    if (step.status == 0) return `审批人: ${step.userName} 待审批...`;
    if (step.status == 1) return `审批人: ${step.userName} 审批中...`;
    if (step.status == 2) {
        return `审批人: ${step.userName || '未知'}\n审批时间: ${step.approvedAt || '-'}\n备注: ${step.comment || '无'}`;
    }
    if (step.status == 3) {
        return `审批人: ${step.userName || '未知'}\n审批时间: ${step.approvedAt || '-'}\n备注: ${step.comment || '无'}\n状态: 驳回`;
    }
    return '';
};

// 转换步骤状态
const getStepStatus = (status, index) => {
    if (status == 0 && index == steps.length - 1) {
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

const getApprovalHistory = async () => {
    try {
        const data = await proxy.$api.getApprovalHistory({ id: props.rowId });
        instance.value = data.data;
        steps.value = data.data.steps;
        status.value = data.data.status;
    } catch (error) {
        console.log(error);
    }
};

// 监听 activeTab 变化
watch(activeTab, val => {
    if (val === 'workflow') {
        // emit('fetchApprovalHistory', props.rowId);
        getApprovalHistory();
    }
});

onMounted(() => {
    getApprovalHistory();
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
    gap: 8px;
}

.submit-section {
    text-align: center;
    margin-top: 15px;
}
</style>
