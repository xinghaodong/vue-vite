<template>
    <!-- 模板列表 -->
    <div>
        <!--用户管理 -->
        <div class="mb-4">
            <el-button type="primary" @click="govueFlow()">新增</el-button>
        </div>
        <el-table :data="tableData" border style="width: 100%">
            <el-table-column prop="name" label="模板名称"> </el-table-column>
            <el-table-column prop="code" label="code"> </el-table-column>
            <el-table-column prop="created_at" label="创建时间" width="180"> </el-table-column>
            <el-table-column prop="updated_at" label="更新时间" width="180"> </el-table-column>
            <!-- 操作 -->
            <el-table-column label="操作" width="130" fixed="right">
                <template #default="scope">
                    <el-button link type="primary" @click="govueFlow(scope.row)">编辑</el-button>
                    <el-button link type="primary" @click="handleDelete(scope.row)">删除</el-button>
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
    </div>
</template>

<script setup>
import { ref, onMounted, getCurrentInstance, reactive, toRefs, watch } from 'vue';
const { proxy } = getCurrentInstance();
const tableData = ref([]);
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);

const govueFlow = row => {
    // 路由跳转
    proxy.$router.push({
        path: '/home/vueFlow',
        query: { id: row ? row.id : '' },
    });
};
const getList = async () => {
    const data = await proxy.$api.getFlowChartList({ page: currentPage.value, pageSize: pageSize.value });
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
            const data = await proxy.$api.deleteFlowChart({ id: row.id });
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
