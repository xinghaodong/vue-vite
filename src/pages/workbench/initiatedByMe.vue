<template>
    <!-- 我发起的 -->
    <div>
        <!-- <div class="mb-4">
            <el-button plain type="primary" @click="govueFlow()">新增</el-button>
        </div> -->
        <el-table :data="tableData" border style="width: 100%">
            <el-table-column prop="title" label="流程名称"> </el-table-column>
            <!-- <el-table-column prop="code" label="code"> </el-table-column> -->
             <!-- 状态 -->
              <el-table-column label="状态" width="100">
                <template #default="scope">
                    <!-- 1=待审批, 2=通过, 3=拒绝, 4=退回 -->
                    <el-tag v-if="scope.row.status == 1" type="success">待审批</el-tag>
                    <el-tag v-if="scope.row.status == 2" type="info">通过</el-tag>
                    <el-tag v-if="scope.row.status == 3" type="danger">拒绝</el-tag>
                </template>
              </el-table-column>
            <el-table-column prop="created_at" label="创建时间" width="180"> </el-table-column>
            <el-table-column prop="updated_at" label="更新时间" width="180"> </el-table-column>
            <!-- 操作 -->
            <el-table-column label="操作" width="130" fixed="right">
                <template #default="scope">
                    <el-button type="primary" link @click="govueFlow(scope.row)">查看表单</el-button>
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
        <el-dialog v-model="showCodeDialog" title="表单预览" width="70%" top="5vh" custom-class="code-dialog">
            <div style="height: 70vh; overflow: auto; padding: 10px; border-radius: 4px">
                <h3>{{ formName }}</h3>
                <DynamicForm :schema="formSchema" :ui-config="uiConfig" v-model="formData" />
            </div>
            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="showCodeDialog = false">关闭</el-button>
                </span>
            </template>
        </el-dialog>
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
const formData  = ref({});

const govueFlow = async row => {
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
    const data = await proxy.$api.getMyInstances({ userId: userInfoStore?.userInfo?.id, page: currentPage.value, pageSize: pageSize.value });
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
