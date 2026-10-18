<template>
    <div class="cesium-list-container">
        <!-- 接入大厂级超级表格 ProTable -->
        <ProTable
            ref="proTableRef"
            title="三维航线轨迹管理"
            :columns="columns"
            :request-api="getRouteTableData"
            row-key="id"
            :border="true"
        >
            <template #tableHeader>
                <el-button type="primary" :icon="Plus" @click="addList()">新增航线</el-button>
            </template>

            <!-- 状态插槽 -->
            <template #status="{ row }">
                <el-tag :type="row.status == 1 ? 'success' : 'info'">
                    {{ row.status == 1 ? '启用' : '禁用' }}
                </el-tag>
            </template>

            <!-- 操作列 -->
            <template #operation="{ row }">
                <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
                <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
        </ProTable>
    </div>
</template>

<script setup>
import { ref, getCurrentInstance, onUnmounted } from 'vue';
import { Plus } from '@element-plus/icons-vue';

const { proxy } = getCurrentInstance();
const proTableRef = ref(null);

const columns = [
    { type: 'index', label: '#', width: 60, align: 'center' },
    {
        prop: 'name',
        label: '航线名称',
        minWidth: 180,
        search: {
            el: 'input',
            props: { placeholder: '请输入航线名称' }
        }
    },
    { prop: 'pointNum', label: '航点数', width: 120, align: 'center' },
    { prop: 'time', label: '航线预估时间', width: 150, align: 'center' },
    { prop: 'status', label: '状态', width: 120, align: 'center' },
    { prop: 'created_at', label: '创建时间', width: 180, align: 'center' },
    { prop: 'updated_at', label: '更新时间', width: 180, align: 'center' },
    { prop: 'operation', label: '操作', width: 140, fixed: 'right', align: 'left' }
];

// ProTable 数据请求驱动适配
const getRouteTableData = async (params = {}) => {
    const { pageNum, pageSize, name } = params;
    const res = await proxy.$api.getRouteList({
        page: pageNum,
        pageSize,
        name
    });
    return {
        data: {
            list: res?.data?.list || [],
            total: res?.data?.total || 0
        }
    };
};

// 新增航线
const addList = () => {
    const routeData = proxy.$router.resolve({
        path: '/newcesium',
        query: { token: sessionStorage.getItem('token') },
    });
    window.open(routeData.href, '_blank');
};

// 监听子窗口保存完成广播
window.handleSaveSuccess = () => {
    proxy.$message.success('航线保存成功');
    proTableRef.value?.refresh();
};

onUnmounted(() => {
    delete window.handleSaveSuccess;
});

// 编辑
const handleEdit = row => {
    proxy.$router.push({
        path: '/home/newcesium',
        query: { idkey: row ? row.id : '' },
    });
};

// 删除
const handleDelete = row => {
    proxy.$messageBox
        .confirm('确定要删除该航线吗?', '提示', {
            type: 'warning',
        })
        .then(async () => {
            const data = await proxy.$api.routeDelete({ id: row.id });
            if (data.code == 200) {
                proxy.$message.success(data.message);
                proTableRef.value?.refresh();
            }
        })
        .catch(() => {
            proxy.$message.info('已取消');
        });
};
</script>

<style scoped>
.cesium-list-container {
    width: 100%;
    height: 100%;
}
</style>
