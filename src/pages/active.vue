<template>
    <div class="mb-4">
        <el-button
            type="primary"
            @click="
                dialogVisible = true;
                resetForm(ruleFormRef);
            "
            >新增</el-button
        >
    </div>
    <el-table :data="tableData" border style="width: 100%">
      
        <el-table-column prop="title" label="活动主题"> </el-table-column>
        <el-table-column prop="statename" label="状态" width="180"> </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180"> </el-table-column>
        <el-table-column prop="updated_at" label="更新时间" width="180"> </el-table-column>
        <el-table-column label="操作" width="180">
            <template #default="scope">
                <el-button v-if="scope.row.state == 1" link type="primary" @click="handleEdit(scope.row)">编辑</el-button>
                <el-button link type="primary" @click="handleDelete(scope.row)">删除</el-button>
            </template>
        </el-table-column>
    </el-table>

    <el-dialog :title="ruleForm.id ? '编辑' : '新增'" v-model="dialogVisible" width="50%">
        <el-form ref="ruleFormRef" :rules="rules" :model="ruleForm" label-width="100px">
            <!-- 主题 -->
            <el-form-item label="主题" prop="title">
                <el-input v-model="ruleForm.title"></el-input>
            </el-form-item>
            <!-- 状态 -->
            <el-form-item label="状态" prop="state">
                <el-radio-group v-model="ruleForm.state">
                    <el-radio label="1">草稿</el-radio>
                    <el-radio label="2">发布</el-radio>
                </el-radio-group>
            </el-form-item>
            <el-form-item label="内容" prop="title">
                <div style="border: 1px solid #ccc">
                    <Toolbar style="border-bottom: 1px solid #ccc" :editor="editorRef" :defaultConfig="toolbarConfig" :mode="mode" />
                    <Editor
                        style="height: 500px; overflow-y: hidden"
                        v-model="valueHtml"
                        :defaultConfig="editorConfig"
                        :mode="mode"
                        @onCreated="handleCreated"
                    />
                </div>
            </el-form-item>
        </el-form>
        <template #footer>
            <span class="dialog-footer">
                <el-button @click="(dialogVisible = false)">取 消</el-button>
                <el-button type="primary" @click="onSubmit(ruleFormRef)">确 定</el-button>
            </span>
        </template>
    </el-dialog>
</template>
<script setup>
import '@wangeditor/editor/dist/css/style.css'; // 引入 css

import { onBeforeUnmount, ref, shallowRef, onMounted, getCurrentInstance, reactive } from 'vue';
import { Editor, Toolbar } from '@wangeditor/editor-for-vue';
const { proxy } = getCurrentInstance();
const tableData = ref([]);
const ruleFormRef = ref(null);
// 初始模板对象
const formTemplate = {
    title: '',
    is_active: '',
    state: '1',
};
let ruleForm = reactive({ ...formTemplate });
// 重置ruleForm数据函数
const rules = {
    name: [{ required: true, message: '请输入账号', trigger: 'blur' }],
    state: [{ required: true, message: '请选择状态', trigger: 'blur' }],
};
// 重置表单sF
const resetForm = () => {
    ruleForm = reactive({ ...formTemplate });
    valueHtml.value = '';
    if (ruleFormRef.value) ruleFormRef.value.resetFields();
};
const dialogVisible = ref(false);
const uploadUrl = `${proxy.$api.baseUrl}/api/upload/uploadFile`;
// 编辑器实例，必须用 shallowRef
const editorRef = shallowRef();
// 内容 HTML
const valueHtml = ref('');
const toolbarConfig = {};
const editorConfig = { placeholder: '请输入内容...', MENU_CONF: {} };
editorConfig.MENU_CONF['uploadImage'] = {
    fieldName: 'file',
    server: uploadUrl,
    base64Limitsize: 5 * 1024,
    headers: {
        Authorization: localStorage.getItem('token'),
    },
    customInsert(res, insertFn) {
        insertFn(proxy.$api.img_url + res.data.avatarPath, res.data.avatarPath, res.data.avatarPath);
    },
};
// 创建编辑器
const handleCreated = (editor) => {
    editorRef.value = editor; // 记录 editor 实例，重要！
};

const onSubmit = (formEl) => {
    formEl.validate(async (valid) => {
        if (valid) {
            ruleForm.cont = valueHtml.value;
            const data = await proxy.$api.addActivity(ruleForm);
            if (data.code == 200) {
                dialogVisible.value = false;
                proxy.$message.success(data.message);
                getInternalUsers();
            }
        } else {
            return false;
        }
    });
};
// 编辑 详情
const handleEdit = async (row) => {
    dialogVisible.value = true;
    // 接口
    const data = await proxy.$api.getActivityDetail({ id: row.id });
    Object.assign(ruleForm, data.data);
    valueHtml.value = data.data.cont;
};
// 删除
const handleDelete = (row) => {
    proxy.$messageBox
        .confirm('确定要删除吗?', '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
        })
        .then(async () => {
            const data = await proxy.$api.deleteActivity({ id: row.id });
            if (data.code == 200) {
                proxy.$message.success(data.message);
                getInternalUsers();
            }
        });
};
const getInternalUsers = async () => {
    const data = await proxy.$api.getActivityList();
    tableData.value = data.data;
};
onMounted(() => {
    getInternalUsers();
});

// 组件销毁时，也及时销毁编辑器
onBeforeUnmount(() => {
    const editor = editorRef.value;
    if (editor == null) return;
    editor.destroy();
});
</script>
