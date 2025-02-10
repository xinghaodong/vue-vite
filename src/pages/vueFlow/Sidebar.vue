<template>
    <aside>
        <div class="description">拖拽节点</div>

        <div class="nodes" style="display: flex; flex-direction: column; width: 197px; margin-left: 81px">
            <el-button :draggable="true" @dragstart="onDragStart($event, 'input')">开始</el-button>
            <el-button :draggable="true" @dragstart="onDragStart($event, 'default')">默认节点</el-button>
            <el-button :draggable="true" @dragstart="onDragStart($event, 'output')">结束</el-button>
        </div>
        <div class="description">表单内容</div>
        <!-- 表单 字段有 模板名称 name 模板编码 code -->
        <el-form ref="ruleFormRef" :model="ruleForm" :rules="rules" label-width="80px" class="demo-ruleForm">
            <el-form-item label="模板名称" prop="name">
                <el-input v-model="ruleForm.name"></el-input>
            </el-form-item>
            <el-form-item label="模板编码" prop="code">
                <el-input v-model="ruleForm.code"></el-input>
            </el-form-item>
        </el-form>
        <div class="description">保存</div>
        <div class="nodes" style="display: flex; flex-direction: column">
            <el-button type="primary" @click="save(ruleForm, 'save')">保存</el-button>
        </div>
    </aside>
</template>
<script setup>
import useDragAndDrop from './useDnD';
import { ref, reactive, onMounted, getCurrentInstance } from 'vue';
import menuStore from '@/stortes/menu'; //引入仓库
import { storeToRefs } from 'pinia'; //引入pinia转换
const menuInfoStore = menuStore();
const { editableTabsValue } = storeToRefs(menuInfoStore); // 响应式
const { proxy } = getCurrentInstance();

const { onDragStart, saveData, nodeData } = useDragAndDrop();
const ruleFormRef = ref(null);
const rules = reactive({
    name: [
        {
            required: true,
            message: '请输入节点名称',
            trigger: 'blur',
        },
    ],
    code: [
        {
            required: true,
            message: '请输入节点编码',
            trigger: 'blur',
        },
    ],
});
const ruleForm = reactive({
    name: '',
    code: '',
});
const save = (form, type) => {
    let obj = { ...ruleForm, ...saveData() };
    ruleFormRef.value.validate(valid => {
        if (valid) {
            const data = proxy.$api.addFlowChart(obj);
            if (data.code == 200) {
                // 路由替换 replace
                router.replace({ path: '/flowList' });
                proxy.$message.success(data.message);
                ruleFormRef.value.resetFields();
                // 关闭当前路由页面
                menuInfoStore.changeRemoveTab(editableTabsValue.value);
                proxy.$router.push(editableTabsValue.value);
            }
        } else {
            return false;
        }
    });
};
onMounted(() => {
    // ruleForm.name = '测试';
    // ruleForm.code = 'test';
});
</script>
<style></style>
