<template>
    <el-drawer title="Node 控制器" :model-value="visible" @update:model-value="updateVisible" direction="rtl" size="30%">
        <div v-if="node">
            <p>ID: {{ node.id }}</p>
            <p>Type: {{ node.type }}</p>
            <el-form>
                <el-form-item label="审批人">
                    <el-select v-model="selectedApprover" placeholder="请选择审批人">
                        <el-option v-for="approver in approvers" :key="approver.id" :label="approver.label" :value="approver.id"></el-option>
                    </el-select>
                </el-form-item>
            </el-form>
            <div class="button-group">
                <el-button type="primary" @click="confirmSelection">确定</el-button>
                <el-button @click="cancelSelection">取消</el-button>
            </div>
        </div>
    </el-drawer>
</template>

<script setup>
import { ref, watch, onMounted, getCurrentInstance } from 'vue';
import { ElDrawer, ElForm, ElFormItem, ElSelect, ElOption, ElButton } from 'element-plus';
const { proxy } = getCurrentInstance();
import 'element-plus/es/components/drawer/style/css';
import 'element-plus/es/components/form/style/css';
import 'element-plus/es/components/form-item/style/css';
import 'element-plus/es/components/select/style/css';
import 'element-plus/es/components/option/style/css';
import 'element-plus/es/components/button/style/css';

const props = defineProps({
    node: Object,
    visible: Boolean,
});

const emit = defineEmits(['update:visible', 'update-node']);
const selectedApprover = ref(null);
const approvers = ref([]);

onMounted(async () => {
    // 调用接口获取审批人数据
    const data = await proxy.$api.find({ page: '', pageSize: '' });
    approvers.value = data.data.data.map(item => ({
        id: item.id,
        label: item.name,
    }));
});

watch(
    () => props.node,
    newNode => {
        if (newNode) {
            console.log(newNode, 'newNode');
            emit('update:visible', true);
            selectedApprover.value = newNode.data?.id || null;
        } else {
            emit('update:visible', false);
        }
    },
);

function updateVisible(value) {
    emit('update:visible', value);
}

function confirmSelection() {
    if (selectedApprover.value) {
        const approver = approvers.value.find(approver => approver.id === selectedApprover.value);
        emit('update-node', { ...props.node, data: { ...props.node.data, id: approver.id, label: approver.label } });
    }
    emit('update:visible', false);
}

function cancelSelection() {
    emit('update:visible', false);
}
</script>

<style scoped>
.button-group {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}
</style>
