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
        <!-- <el-dialog v-model="showCodeDialog" title="表单预览" width="70%" top="5vh" custom-class="code-dialog">
            <div style="height: 70vh; overflow: auto; padding: 10px; border-radius: 4px">
                <h3>{{ formName }}</h3>
                <DynamicForm :schema="formSchema" :ui-config="uiConfig" v-model="formData" />
            </div>
            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="showCodeDialog = false">关闭</el-button>
                </span>
            </template>
        </el-dialog> -->
        <el-drawer v-model="showCodeDialog" :title="formName" direction="rtl" size="60%" class="form-drawer">
            <!-- 头部信息 -->
            <div class="drawer-header">
                <div class="form-title">
                    <!-- <h2>{{ formName }}</h2> -->
                    <div class="form-status">
                        <span class="status-badge processing">审批中</span>
                    </div>
                </div>
            </div>

            <!-- 标签页 -->
            <el-tabs v-model="activeTab" class="form-tabs">
                <el-tab-pane label="表单信息" name="form">
                    <div class="form-content">
                        <!-- 上半部分：审批意见 -->
                        <div class="approval-section">
                            <div class="approval-history">
                                <div class="approval-item">
                                    <div class="approval-actions">
                                        <!-- 单选框 -->
                                        <el-radio-group v-model="approvalStatus" size="small">
                                            <el-radio-button label="1">同意</el-radio-button>
                                            <el-radio-button label="2">拒绝</el-radio-button>
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
                        <!-- 分割线 -->
                        <el-divider />
                        <!-- 下半部分：申请信息 -->
                        <div class="application-section">
                            <h3>申请信息</h3>
                            <DynamicForm :schema="formSchema" :ui-config="uiConfig" v-model="formData" class="dynamic-form" />
                        </div>
                    </div>
                </el-tab-pane>

                <el-tab-pane label="流程图" name="workflow">
                    <div class="workflow-content">
                        <div class="workflow-steps">
                            <el-steps :active="2" direction="vertical">
                                <el-step title="提交申请" description="2024-12-23 09:06:57" />
                                <el-step title="部门审批" description="审批中..." />
                                <el-step title="HR审批" description="待审批" />
                                <el-step title="完成" description="" />
                            </el-steps>
                        </div>
                    </div>
                </el-tab-pane>

                <!-- <el-tab-pane label="流转记录" name="history">
                    <div class="history-content">
                        <el-timeline>
                            <el-timeline-item timestamp="2024-12-23 09:06:57" type="primary">
                                <h4>申请提交</h4>
                                <p>用户提交了请假申请</p>
                            </el-timeline-item>
                            <el-timeline-item timestamp="2024-12-23 09:03:34" type="success">
                                <h4>部门审批</h4>
                                <p>部门经理审批通过</p>
                            </el-timeline-item>
                            <el-timeline-item timestamp="2024-12-23 08:48:32" type="warning">
                                <h4>等待审批</h4>
                                <p>等待HR审批</p>
                            </el-timeline-item>
                        </el-timeline>
                    </div>
                </el-tab-pane> -->
            </el-tabs>
            <!-- 底部操作按钮 -->
            <!-- <template #footer>
                <div class="drawer-footer">
                    <el-button @click="showCodeDialog = false">关闭</el-button>
                    <el-button type="primary">保存</el-button>
                </div>
            </template> -->
        </el-drawer>
    </div>
</template>

<script setup>
import { ref, onMounted, getCurrentInstance, reactive, toRefs, watch } from 'vue';
import useUserInfoStore from '@/stortes/user'; //引入仓库
import DynamicForm from '@/pages/formDesign/components/DynamicForm.vue';
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
const approvalStatus = ref('1');
const rowId = ref({});


// 提交审批
const handleSubmitApproval = async () => {
    try {
        let obj = {
            id: rowId.value,
            userId: userInfoStore.userInfo.id,
            status: approvalStatus.value,
            comment: currentApproval.value,
        };
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

const govueFlow = async row => {
    rowId.value = row.id;
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

.status-badge {
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
}

.status-badge.processing {
    background: #e6f7ff;
    color: #1890ff;
}

.form-tabs {
    padding: 0 24px;
}

.form-content {
    padding: 14px 0;
}

.approval-section {
    margin-bottom: 24px;
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
