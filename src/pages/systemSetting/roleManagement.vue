<template>
    <div class="tables">
        <!-- <table-search :searchList="searchList" @search="search" @reset="reset"></table-search> -->
        <div class="table-box page-main">
            <div class="table-btn">
                <el-button type="primary" plain @click="add">新增角色</el-button>
            </div>
            <el-table :data="tableData" highlight-current-row style="width: 100%" height="100%" v-loading="loading" border row-key="roid">
                <el-table-column label="角色名称" prop="name"></el-table-column>
                <el-table-column label="角色是否有效">
                    <template v-slot="scope">
                        <el-icon class="tooltip-icon" :class="scope.row.states == 1 ? 'green-icon' : 'red-icon'">
                            <component :is="scope.row.states == 1 ? 'check' : 'close'" />
                        </el-icon>
                    </template>
                </el-table-column>
                <el-table-column label="操作" fixed="right">
                    <template v-slot="scope">
                        <el-button link size="small" type="primary" @click="editItem(scope.row.id)">编辑</el-button>
                        <el-button link size="small" type="primary" @click="selectResource(scope.row.id)">分配资源</el-button>
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
            >
            </el-pagination>

            <el-dialog :title="title" width="700px" v-model="dialogVisible" :before-close="handleClose">
                <el-form :model="ruleForm" :rules="rules" ref="ruleFormRef" label-width="100px" class="demo-ruleForm">
                    <el-row>
                        <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                            <el-form-item label="角色名称" prop="name">
                                <el-input v-model="ruleForm.name" placeholder="请输入" maxLength="10"></el-input>
                            </el-form-item>
                        </el-col>
                        <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24" v-if="ruleForm.states !== 2">
                            <el-form-item label="是否有效" prop="states">
                                <el-radio v-model="ruleForm.states" :label="1" border>是</el-radio>
                                <el-radio v-model="ruleForm.states" :label="0" border>否</el-radio>
                            </el-form-item>
                        </el-col>
                    </el-row>
                </el-form>
                <template #footer>
                    <el-button @click="handleClose">取消</el-button>
                    <el-button type="primary" @click="submitForm(ruleFormRef)">保存</el-button>
                </template>
            </el-dialog>

            <el-dialog title="分配资源" width="700px" v-model="dialogVisibleResource" :before-close="handleClose1">
                <el-form v-if="dialogVisibleResource" ref="ruleFormRef" :model="ruleData" label-width="100px" class="demo-ruleForm">
                    <el-form-item label="资源权限">
                        <el-checkbox v-model="ruleData.menucheckstrictly" :true-value="1" :false-value="0">父子联动</el-checkbox>
                    </el-form-item>
                </el-form>
                <el-tree
                    style="height: 400px; overflow: auto"
                    ref="tree"
                    :data="resourceList"
                    show-checkbox
                    node-key="id"
                    :props="{ children: 'children', label: 'name' }"
                    :check-strictly="!ruleData.menucheckstrictly"
                >
                </el-tree>
                <template #footer>
                    <el-button @click="handleClose1">取消</el-button>
                    <el-button type="primary" @click="submitResource">保存</el-button>
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
const ruleFormRef = ref(null);
const dialogVisible = ref(false);
const defaultRuleFormState = {
    name: '',
    states: 1,
};
let ruleForm = reactive({ ...defaultRuleFormState }); // 或者改为 ref
const tableData = ref([]);
const loading = ref(false);
let total = 0;
let pageSize = 10;
let currentPage = 1;
const rules = {
    name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
};
const dialogVisibleResource = ref(false);
const defaultRuleDataState = {
    menucheckstrictly: 0,
};
let ruleData = reactive({ ...defaultRuleDataState });
let resourceList = ref([]);
const tree = ref(null);

const resetForm = () => {
    if (ruleFormRef.value) ruleFormRef.value.resetFields();
    Object.assign(ruleForm, defaultRuleFormState); // 或者 ruleForm.value = { ...defaultRuleFormState };
    console.log(ruleForm, 'ruleForm');
};

const add = () => {
    title.value = '新增';
    dialogVisible.value = true;
    resetForm();
};

const handleClose = () => {
    resetForm();
    dialogVisible.value = false;
};

const handleClose1 = () => {
    dialogVisibleResource.value = false;
};

// 分配资源
const selectResource = async id => {
    const res = await proxy.$api.getRoleMenus({ id });
    console.log(res.data, 'res');
    dialogVisibleResource.value = true;
    setTimeout(() => {
        tree.value.setCheckedKeys(res.data);
    }, 10);
};

// 分配资源保存
const submitResource = async () => {
    let treeArray = tree.value.getCheckedKeys();
    let treeArray1 = tree.value.getHalfCheckedKeys();
    if (!treeArray.length) {
        treeArray = 0;
    } else {
        treeArray = treeArray.concat(treeArray1);
    }
    let obj = {
        id: 1,
        menuIds: treeArray,
    };
    console.log(obj, 5555);
    const res = await proxy.$api.assignMenusToRole(obj);
    if (res.code == 200) {
        proxy.$message.success(res.message);
        dialogVisibleResource.value = false;
    }
};

const submitForm = formEl => {
    if (!formEl) return;
    formEl.validate(valid => {
        if (valid) {
            console.log(ruleForm, '455');
            if (title.value === '修改角色') {
                proxy.$api.updateRole(ruleForm).then(() => {
                    dialogVisible.value = false;
                    getTableData();
                });
            } else {
                proxy.$api.addRole(ruleForm).then(() => {
                    dialogVisible.value = false;
                    getTableData();
                });
            }
        } else {
            console.log('error submit!');
            return false;
        }
    });
};

const editItem = id => {
    title.value = '修改角色';
    proxy.$api.getRoleDetail({ id }).then(res => {
        Object.assign(ruleForm, res.data);
        dialogVisible.value = true;
    });
};

const getTableData = () => {
    loading.value = true;
    proxy.$api.getRoleList({ currentPage: currentPage, pageSize: pageSize }).then(res => {
        tableData.value = res.data;
        // total = res.total; // 假设返回的总条数字段为 total
        loading.value = false;
    });
};

const getmenu = async () => {
    const res = await proxy.$api.menus();
    resourceList.value = res.data;
    console.log(resourceList.value, 'resourceList');
};

const handleSizeChange = val => {
    pageSize = val;
    getTableData();
};

const handleCurrentChange = val => {
    currentPage.value = val;
    getTableData();
};

onMounted(() => {
    getTableData();
    getmenu();
});
</script>

<style scoped>
.el-icon-search {
    cursor: pointer;
}

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

.table-btn:not(:empty) {
    padding: 0 16px 16px 0;
}
.green-icon {
    color: green;
    font-size: 18px;
    font-weight: 600;
}
.red-icon {
    color: red;
    font-size: 18px;
    font-weight: 600;
}
</style>
