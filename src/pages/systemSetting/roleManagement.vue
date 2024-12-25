<template>
    <div class="table">
        <!-- <table-search :searchList="searchList" @search="search" @reset="reset"></table-search> -->
        <div class="table-box page-main">
            <div class="table-btn" style="margin-bottom: 20px">
                <el-button type="primary" plain @click="add">新增角色</el-button>
                <!-- <el-button style="width: 100px" plain type="primary" @click="getOrganPostCustMsg">角色人员全览</el-button> -->
            </div>
            <el-table :data="tableData" style="width: 100%; margin-bottom: 20px" border>
                <el-table-column label="角色名称" prop="name" width="150"></el-table-column>
                <el-table-column label="角色是否有效" prop="states">
                    <!-- <template v-slot="scope">
                        <span class="iconS">
                            <i style="font-size: 17px; line-height: 32px" :class="scope.row.states == 1 ? 'el-icon-check' : 'el-icon-close'"></i>
                        </span>
                    </template> -->
                </el-table-column>
                <el-table-column label="操作" fixed="right" width="180">
                    <template v-slot="scope">
                        <el-button type="primary" link @click="editItem(scope.row.id)">编辑</el-button>
                        <el-button type="primary" link @click="selectResource(scope.row.id)">分配资源</el-button>
                    </template>
                </el-table-column>
            </el-table>

            <!-- <el-pagination
                style="padding: 16px"
                background
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange"
                :current-page="currentPage"
                :page-sizes="[10, 20, 50, 100]"
                :page-size="pageSize"
                layout="total, sizes,->, prev, pager, next, jumper"
                :total="total"
            ></el-pagination> -->

            <el-dialog :title="title" width="700px" v-model="dialogVisible" :before-close="handleClose">
                <el-form :model="ruleForm" :rules="rules" label-width="100px" class="demo-ruleForm">
                    <el-row>
                        <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                            <el-form-item label="角色名称" prop="name">
                                <el-input v-model="ruleForm.name" placeholder="请输入" maxLength="10"></el-input>
                            </el-form-item>
                        </el-col>
                        <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24" v-if="ruleForm.states !== 2">
                            <el-form-item label="是否有效" prop="states">
                                <el-radio v-model="ruleForm.states" :value="1" border>是</el-radio>
                                <el-radio v-model="ruleForm.states" :value="0" border>否</el-radio>
                            </el-form-item>
                        </el-col>
                    </el-row>
                </el-form>
                <template #footer>
                    <el-button @click="handleClose">取消</el-button>
                    <el-button type="primary" @click="submitForm">保存</el-button>
                </template>
            </el-dialog>
            <!-- Remove "分配员工" dialog -->
            <!-- Remove "角色人员全览" dialog -->
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, getCurrentInstance } from 'vue';
const { proxy } = getCurrentInstance();

const title = ref('');
const dialogVisible = ref(false);
const formTemplate = { name: '', states: 1 };
let ruleForm = reactive({ ...formTemplate });
const tableData = ref([]);
const loading = ref(false);
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const rules = {
    name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
};
const add = () => {
    title.value = '新增角色';
    dialogVisible.value = true;
    Object.assign(ruleForm, formTemplate);
};

const handleClose = () => {
    dialogVisible.value = false;
};

const submitForm = () => {
    if (title.value === '修改角色') {
        proxy.$api.updateRoles(ruleForm).then(() => {
            dialogVisible.value = false;
            getTableData();
        });
    } else {
        proxy.$api.addRoles(ruleForm).then(() => {
            dialogVisible.value = false;
            getTableData();
        });
    }
};

const editItem = async id => {
    title.value = '修改角色';
    dialogVisible.value = true;
    const data = await proxy.$api.detailRoles({ id });
    Object.assign(ruleForm, data.data);
};

const getTableData = async () => {
    loading.value = true;
    const data = await proxy.$api.getRolsList();
    tableData.value = data.data;
};
// const handleSizeChange = val => {
//     pageSize.value = val;
//     getTableData();
// };

// const handleCurrentChange = val => {
//     currentPage.value = val;
//     getTableData();
// };

onMounted(() => {
    getTableData();
});
</script>

<style scoped>
.el-icon-search {
    cursor: pointer;
}
.iconS {
    .el-icon-check {
        color: #00ff00;
        font-weight: 800;
        font-size: 20px;
    }

    .el-icon-close {
        color: #ff0000;
        font-weight: 800;
        font-size: 20px;
    }
}
</style>
