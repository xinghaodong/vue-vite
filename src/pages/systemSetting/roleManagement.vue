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
                        <el-button type="text" size="mini" @click="editItem(scope.row.roid)">编辑</el-button>
                        <el-button type="text" size="mini" @click="selectResource(scope.row.roid)">分配资源</el-button>
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

            <el-dialog :title="title" width="700px" v-model:visible="dialogVisible" :before-close="handleClose">
                <el-form :model="ruleForm" :rules="rules" ref="ruleForm" label-width="100px" class="demo-ruleForm">
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
                <span slot="footer">
                    <el-button size="small" @click="handleClose">取消</el-button>
                    <el-button size="small" type="primary" @click="submitForm">保存</el-button>
                </span>
            </el-dialog>

            <!-- Remove "分配员工" dialog -->
            <!-- Remove "角色人员全览" dialog -->
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
// import { useApi } from '@/hooks/useApi'; // assuming you have this hook for API calls
// import TableSearch from '@/components/table/tableSearch.vue';

const title = ref('');
const dialogVisible = ref(false);
const ruleForm = reactive({
    name: '',
    states: 1,
});
const tableData = ref([]);
const loading = ref(false);
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const searchList = [
    {
        name: '角色名称',
        type: '1',
        propName: 'name',
    },
];
const rules = {
    name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
};

// const { getRolsList, updateRols, addRols } = useApi(); // Use custom hook or api call functions

const add = () => {
    title.value = '新增角色';
    dialogVisible.value = true;
    ruleForm.name = '';
    ruleForm.states = 1; // default to active state
};

const handleClose = () => {
    dialogVisible.value = false;
};

const submitForm = () => {
    if (title.value === '修改角色') {
        updateRols(ruleForm).then(() => {
            dialogVisible.value = false;
            getTableData();
        });
    } else {
        addRols(ruleForm).then(() => {
            dialogVisible.value = false;
            getTableData();
        });
    }
};

const editItem = roid => {
    title.value = '修改角色';
    // Fetch the role data
    getRolsList({ roid }).then(res => {
        ruleForm.name = res.data.name;
        ruleForm.states = res.data.states;
        dialogVisible.value = true;
    });
};

const getTableData = () => {
    loading.value = true;
    // getRolsList({ currentPage: currentPage.value, pageSize: pageSize.value }).then(res => {
    //     tableData.value = res.data.content;
    //     total.value = res.data.total;
    //     loading.value = false;
    // });
};

const search = data => {
    // Handle search logic
};

const reset = () => {
    currentPage.value = 1;
    getTableData();
};

const handleSizeChange = val => {
    pageSize.value = val;
    getTableData();
};

const handleCurrentChange = val => {
    currentPage.value = val;
    getTableData();
};

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
