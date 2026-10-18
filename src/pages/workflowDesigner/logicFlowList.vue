<template>
    <div class="logic-flow-list-container">
        <!-- 接入大厂级超级表格 ProTable -->
        <ProTable
            ref="proTableRef"
            title="工作流模板管理"
            :columns="columns"
            :request-api="getLogicList"
            row-key="id"
            :border="true"
        >
            <template #tableHeader>
                <el-button type="primary" :icon="Plus" @click="govueFlow()">新增模板</el-button>
            </template>

            <template #operation="{ row }">
                <el-button type="primary" link @click="govueFlow(row)">编辑</el-button>
                <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
            </template>
        </ProTable>
    </div>
</template>

<script setup>
import { ref, getCurrentInstance } from 'vue';
import { Plus } from '@element-plus/icons-vue';

const { proxy } = getCurrentInstance();
const proTableRef = ref(null);

const columns = [
    { type: 'index', label: '#', width: 60, align: 'center' },
    {
        prop: 'name',
        label: '模板名称',
        minWidth: 180,
        search: {
            el: 'input',
            props: { placeholder: '请输入模板名称' }
        }
    },
    { prop: 'created_at', label: '创建时间', width: 200, align: 'center' },
    { prop: 'updated_at', label: '更新时间', width: 200, align: 'center' },
    { prop: 'operation', label: '操作', width: 140, fixed: 'right', align: 'left' }
];

const getLogicList = async (params = {}) => {
    const { pageNum, pageSize, name } = params;
    const res = await proxy.$api.logicfind({
        page: pageNum,
        pageSize,
        name
    });
    return {
        data: {
            list: res?.data?.data || [],
            total: res?.data?.total || 0
        }
    };
};

const govueFlow = row => {
    proxy.$router.push({
        path: '/home/logicFlow',
        query: { idkey: row ? row.id : '' },
    });
};

const handleDelete = async row => {
    proxy.$messageBox
        .confirm('确定要删除该工作流模板吗?', '提示', {
            type: 'warning',
        })
        .then(async () => {
            const data = await proxy.$api.logicdelete({ id: row.id });
            if (data.code == 200) {
                proxy.$message.success(data.message);
                proTableRef.value?.refresh();
            }
        });
};
</script>

<style scoped>
.logic-flow-list-container {
    width: 100%;
    height: 100%;
}
</style>
