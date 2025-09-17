<template>
    <!-- 我的代办 -->
    <div>
        <!-- <div class="mb-4">
            <el-button plain type="primary" @click="govueFlow()">新增</el-button>
        </div> -->
        <el-table :data="tableData" border style="width: 100%">
            <el-table-column prop="title" label="审批名称"> </el-table-column>
            <el-table-column prop="userName" label="发起人/申请人"> </el-table-column>
            <!-- <el-table-column prop="code" label="code"> </el-table-column> -->
            <el-table-column prop="created_at" label="创建时间" width="180"> </el-table-column>
            <el-table-column prop="updated_at" label="更新时间" width="180"> </el-table-column>
            <!-- 操作 -->
            <el-table-column label="操作" width="130" fixed="right">
                <template #default="scope">
                    <el-button type="primary" link @click="govueFlow(scope.row)">审批</el-button>
                    <!-- <el-button type="primary" link @click="handleDelete(scope.row)">删除</el-button> -->
                </template>
            </el-table-column>
        </el-table>
        <el-pagination
            style="padding: 16px"
            background
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
            :current-page="currentPage"
            :page-sizes="[10, 20, 50, 100]"
            :page-size="pageSize"
            layout="total, sizes,->, prev, pager, next, jumper"
            :total="total"
        ></el-pagination>
        <!-- 审批相关内容 -->
        <ApprovalDrawer
            v-if="showCodeDialog"
            v-model:visible="showCodeDialog"
            :form-name="formName"
            :form-schema="formSchema"
            :ui-config="uiConfig"
            :form-data="formData"
            :row-id="rowId"
            :workflow-id="workflowId"
            :noApproval="true"
            :noreq="false"
            @close="showCodeDialog = false"
            @submit="handleSubmitApproval"
        />
        <!-- <el-drawer v-model="showCodeDialog" :title="formName" direction="rtl" size="60%" class="form-drawer">
            <div class="drawer-header">
                <div class="form-title">
                    <el-tag type="primary">审批中</el-tag>
                </div>
            </div>

            <el-tabs type="border-card" v-model="activeTab" class="form-tabs">
                <el-tab-pane label="表单信息" name="form">
                    <div class="form-content">
                        <div class="approval-section">
                            <div class="approval-history">
                                <div class="approval-item">
                                    <div class="approval-actions">
                                        <el-radio-group v-model="approvalStatus">
                                            <el-radio label="2">同意</el-radio>
                                            <el-radio label="3">拒绝</el-radio>
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
                                <el-button type="primary" @click="handleSubmitApproval()">提交审批</el-button>
                            </div>
                        </div>
                        <el-divider />
                        <div class="application-section" style="padding-left: 10px">
                            <h3>申请信息</h3>
                            <DynamicForm :schema="formSchema" :ui-config="uiConfig" v-model="formData" class="dynamic-form" />
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
                    <LogicFlow :workflowId="workflowId" :appId="rowId"></LogicFlow>
                </el-tab-pane>
            </el-tabs>
        </el-drawer> -->
    </div>
</template>

<script setup>
import { ref, onMounted, getCurrentInstance, reactive, toRefs, watch, computed } from 'vue';
import ApprovalDrawer from './components/ApprovalDrawer.vue';
import DynamicForm from '@/pages/formDesign/components/DynamicForm.vue';
import LogicFlow from '@/pages/workflowDesigner/logicFlow.vue';
import useUserInfoStore from '@/stortes/user'; //引入仓库
const userInfoStore = useUserInfoStore();
const { proxy } = getCurrentInstance();
const tableData = ref([]);
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const showCodeDialog = ref(false);
const formSchema = ref({});
const uiConfig = ref({});
const formName = ref('');
const formData = ref({});
const currentApproval = ref('');
const activeTab = ref('form');
const approvalStatus = ref('2');
const rowId = ref({});
const instance = ref([]);
const steps = ref([]);
const workflowId = ref('');

// 计算当前激活的步骤
// const activeStep = computed(() => {
//     console.log('instance.value', instance.value, steps.value);
//     const currentIndex = steps.value.findIndex(step => step.nodeId == instance.value.currentNodeId);
//     return currentIndex >= 0 ? currentIndex : steps.value.length;
// });

// 提交审批
const handleSubmitApproval = async () => {
    try {
        let obj = {
            id: rowId.value,
            userId: userInfoStore.userInfo.id,
            status: approvalStatus.value,
            comment: currentApproval.value,
        };
        // return;
        const res = await proxy.$api.approve(obj);
        if (res.code == 200) {
            proxy.$message.success('提交成功');
            showCodeDialog.value = false;
            getList();
        }
    } catch (error) {
        console.log(error);
    }
};
const getApprovalHistory = async () => {
    try {
        console.log('rowId.value', rowId.value);
        const data = await proxy.$api.getApprovalHistory({ id: rowId.value });
        console.log(data);
        // approvalHistory.value = data.data;
        instance.value = data.data;
        steps.value = data.data.steps;
        console.log('steps.value', steps.value);
        if (data.code == 200) {
        }
    } catch (error) {
        console.log(error);
    }
};

const govueFlow = async row => {
    rowId.value = row.id;
    workflowId.value = row.workflowId;
    console.log(row, 'row.id');
    // 路由跳转
    // proxy.$router.push({
    //     path: '/home/logicFlow',
    //     query: { idkey: row ? row.id : '' },
    // });
    // console.log(row);
    //  根据 formId 查询表单数据
    const res = await proxy.$api.designDetail({ id: row.formId });
    console.log(row.formData);

    formData.value = row.formData;
    formSchema.value = JSON.parse(res.data.schema);
    uiConfig.value = res.data.ui_config;
    formName.value = res.data.name;
    activeTab.value = 'form';
    showCodeDialog.value = true;
};
const getList = async () => {
    const data = await proxy.$api.getMyTodoInstances({ userId: userInfoStore?.userInfo?.id, page: currentPage.value, pageSize: pageSize.value });
    if (data.code == 200) {
        tableData.value = data.data.data;
        total.value = data.data.total;
    }
};
const handleSizeChange = val => {
    pageSize.value = val;
    getList();
};

const handleCurrentChange = val => {
    currentPage.value = val;
    getList();
};
const handleDelete = async row => {
    proxy.$messageBox
        .confirm('确定要删除吗?', '提示', {
            type: '提示',
        })
        .then(async () => {
            console.log(row);
            const data = await proxy.$api.logicdelete({ id: row.id });
            if (data.code == 200) {
                proxy.$message.success(data.message);
                getList();
            }
        });
};
// onMounted
onMounted(() => {
    getList();
    proxy.$api.getUserInfo().then(res => {
        console.log(res, '..............');
    });
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

.form-content {
    padding: 14px 0;
}

.approval-section {
    margin-bottom: 24px;
    padding-left: 10px;
}

.approval-section h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
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
