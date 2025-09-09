<template>
    <div>
        <div class="mb-4">
            <el-button type="primary" plain @click="addList()">新增</el-button>
        </div>
        <el-table :data="tableData" border style="width: 100%">
            <el-table-column prop="name" label="航线名称" min-width="180"> </el-table-column>
            <el-table-column prop="pointNum" label="航点数" min-width="180"> </el-table-column>
            <el-table-column prop="time" label="航线预估时间" min-width="180"> </el-table-column>
            <el-table-column prop="status" label="状态" width="180">
                <template #default="scope">
                    <span v-if="scope.row.status == 1">启用</span>
                    <span v-if="scope.row.status == 0">禁用</span>
                </template>
            </el-table-column>
            <el-table-column prop="created_at" label="创建时间" width="180"> </el-table-column>
            <el-table-column prop="updated_at" label="更新时间" width="180"> </el-table-column>
            <!-- 操作 -->
            <el-table-column label="操作" width="130" fixed="right">
                <template #default="scope">
                    <el-button link type="primary" @click="handleEdit(scope.row)">编辑</el-button>
                    <el-button link type="primary" @click="handleDelete(scope.row)">删除</el-button>
                    <!-- <el-button link type="primary" @click="handleRelieve(scope.row)" v-text="scope.row.is_active == 0 ? '解除' : '禁用'"></el-button> -->
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
import { ref, getCurrentInstance, onMounted } from 'vue';
const { proxy } = getCurrentInstance();
const tableData = ref([]);
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);

// 新增航线
const addList = () => {
    const routeData = proxy.$router.resolve({
        path: '/newcesium',
        query: { token: sessionStorage.getItem('token') }, // 添加查询参数
    });
    // 打开新标签页，并保存引用
    window.open(routeData.href, '_blank');
    // 可以挂载一个方法给子窗口调用
};
window.handleSaveSuccess = () => {
    console.log('接收到保存成功的消息');
    proxy.$message.success('成功');
    // 这里可以刷新列表
    getCesiumList();
};

const getCesiumList = async () => {
    let obj = {
        page: currentPage.value,
        pageSize: pageSize.value,
    };
    const { data } = await proxy.$api.getRouteList(obj);
    tableData.value = data.list;
    total.value = data.total;
    console.log(data, '航线列表');
};
const handleSizeChange = val => {
    pageSize.value = val;
    getCesiumList();
};

const handleCurrentChange = val => {
    currentPage.value = val;
    getCesiumList();
};
// 修改
const handleEdit = row => {
    proxy.$router.push({
        path: '/home/newcesium',
        query: { idkey: row ? row.id : '' },
    });
    // const routeData = proxy.$router.resolve({
    //     path: '/cesium2d',
    //     query: { idkey: row ? row.id : '', token: sessionStorage.getItem('token') }, // 添加查询参数
    // });
    // // 打开新标签页，并保存引用
    // window.open(routeData.href, '_blank');
};
// 删除
const handleDelete = row => {
    proxy.$messageBox
        .confirm('确定要删除吗?', '提示', {
            type: '提示',
        })
        .then(async () => {
            const data = await proxy.$api.routeDelete({ id: row.id });
            if (data.code == 200) {
                proxy.$message.success(data.message);
                getCesiumList();
            }
        })
        .catch(() => {
            proxy.$message.info('已取消');
        });
};

onMounted(async () => {
    try {
        await getCesiumList();
    } catch (error) {
        console.error('失败信息:', error);
    }
});
</script>

<style lang="css" scoped></style>
