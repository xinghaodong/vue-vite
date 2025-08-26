<template>
    <div>
        <div class="mb-4">
            <el-button
                type="primary"
                plain
                @click="
                    dialogVisible = true;
                    resetForm(ruleFormRef);
                "
                >新增</el-button
            >
        </div>
        <el-table :data="tableData" border style="width: 100%">
            <el-table-column prop="name" label="名称" width="180"> </el-table-column>
            <el-table-column prop="name" label="视频预览">
                <template #default="scope">
                    <video :src="`${proxy.$api.baseUrl}/${scope.row.filepath}`" controls style="width: 100%; max-width: 200px; height: auto"></video>
                </template>
            </el-table-column>
            <!-- 视频大小 -->
            <el-table-column label="视频大小" width="180">
                <template #default="scope">
                    {{ formatFileSize(scope.row.metadata?.size) }}
                </template>
            </el-table-column>

            <!-- 码率 -->
            <el-table-column label="码率">
                <template #default="scope" width="180">
                    {{ formatBitrate(scope.row.metadata?.bitrate) }}
                </template>
            </el-table-column>
            <el-table-column label="操作" width="130" fixed="right">
                <template #default="scope">
                    <el-button link type="primary" @click="handleEdit(scope.row)">编辑</el-button>
                    <el-button link type="primary" @click="handleDelete(scope.row)">删除</el-button>
                </template>
            </el-table-column>
        </el-table>

        <el-dialog :title="ruleForm.id ? '编辑' : '新增'" v-model="dialogVisible" width="50%">
            <el-form ref="ruleFormRef" :rules="rules" :model="ruleForm" label-width="100px">
                <el-form-item label="名称" prop="name">
                    <el-input v-model="ruleForm.name" maxlength="20"></el-input>
                </el-form-item>
                <el-form-item label="视频上传">
                    <el-upload class="upload-demo" :http-request="uploadVideo" ref="uploadRef" drag :auto-upload="false" :limit="1">
                        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
                        <div class="el-upload__text">把文件拖到这里<em>或者点击这里</em></div>
                        <template #tip>
                            <div class="el-upload__tip">请上传mp4文件</div>
                        </template>
                    </el-upload>
                </el-form-item>
            </el-form>
            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="dialogVisible = false">取 消</el-button>
                    <el-button type="success" @click="onSubmit(ruleFormRef)">确 定</el-button>
                </span>
            </template>
        </el-dialog>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, getCurrentInstance } from 'vue';
const { proxy } = getCurrentInstance();
const tableData = ref([]);
const ruleFormRef = ref(null);
const uploadRef = ref(null);
const uploadUrl = `${proxy.$api.baseUrl}/upload/uploadFile`;
// 初始模板对象
const formTemplate = {
    name: '',
};
let ruleForm = reactive({ ...formTemplate });
// 重置ruleForm数据函数
const rules = {
    name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
};
// 重置表单sF
const resetForm = () => {
    ruleForm = reactive({ ...formTemplate });
    if (ruleFormRef.value) ruleFormRef.value.resetFields();
};
const dialogVisible = ref(false);

// 查询视频
const getDataList = async () => {
    const res = await proxy.$api.getVideoList();
    tableData.value = res.data;
};

// 自定义上传方法
const uploadVideo = async ({ file, onSuccess, onError }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', ruleForm.name);
    formData.append('fps', 1);
    try {
        console.log(file);
        const res = await proxy.$api.addVideo(formData);
        console.log(res);
        if (res.code == 200) {
            proxy.$message.success('上传成功');
            dialogVisible.value = false;
            getDataList();
            onSuccess(res);
        }
    } catch (err) {
        onError(err);
    }
};

const onSubmit = async formEl => {
    if (!formEl) return;
    await formEl.validate(async valid => {
        if (!valid) {
            proxy.$message.error('请检查表单填写');
            return;
        }
        // if (!ruleForm.videoFile) {
        //     proxy.$message.error('请上传视频文件');
        //     return;
        // }
        // 手动触发上传
        uploadRef.value?.submit();
    });
};

// 删除
const handleDelete = async row => {
    proxy.$messageBox
        .confirm('确定要删除吗?', '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
        })
        .then(async () => {
            const data = await proxy.$api.deleteVideo({ id: row.id });
            if (data.code == 200) {
                proxy.$message.success(data.message);
                getDataList();
            }
        });
};

// 格式化文件大小：字节 → KB / MB / GB
const formatFileSize = bytesStr => {
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes) || bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
};

// 格式化码率：bps → kbps 或 Mbps
const formatBitrate = bpsStr => {
    const bps = parseInt(bpsStr, 10);
    if (isNaN(bps)) return '-';

    if (bps < 1000) return `${bps} bps`;
    if (bps < 1_000_000) return `${(bps / 1000).toFixed(2)} kbps`;
    return `${(bps / 1_000_000).toFixed(2)} Mbps`;
};

onMounted(() => {
    getDataList();
});
</script>

<style lang="css" scoped></style>
