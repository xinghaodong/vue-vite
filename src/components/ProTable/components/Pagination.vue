<template>
    <div class="pro-pagination">
        <el-pagination
            :background="true"
            :current-page="pageParam.pageNum"
            :page-size="pageParam.pageSize"
            :page-sizes="pageSizes"
            :total="pageParam.total"
            :layout="layout"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
        />
    </div>
</template>

<script setup>
defineProps({
    pageParam: {
        type: Object,
        required: true,
        default: () => ({
            pageNum: 1,
            pageSize: 10,
            total: 0
        })
    },
    pageSizes: {
        type: Array,
        default: () => [10, 20, 50, 100]
    },
    layout: {
        type: String,
        default: 'total, sizes, prev, pager, next, jumper'
    }
});

const emit = defineEmits(['size-change', 'current-change']);

const handleSizeChange = (val) => {
    emit('size-change', val);
};

const handleCurrentChange = (val) => {
    emit('current-change', val);
};
</script>

<style scoped>
.pro-pagination {
    display: flex;
    justify-content: flex-end;
    padding: 16px 0 4px;
}

:deep(.el-pagination.is-background .el-pager li:not(.is-disabled).is-active) {
    background-color: var(--el-color-primary);
    color: var(--el-color-white);
}

:deep(.el-pagination.is-background .btn-next),
:deep(.el-pagination.is-background .btn-prev),
:deep(.el-pagination.is-background .el-pager li) {
    background-color: var(--el-fill-color-light);
    color: var(--el-text-color-primary);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 6px;
    font-weight: 500;
}
</style>
