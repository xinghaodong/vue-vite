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
            <el-table-column prop="name" label="视频预览" min-width="300">
                <template #default="scope">
                    <video :src="`${proxy.$api.baseUrl}/${scope.row.filepath}`" controls style="width: 100%; max-width: 200px; height: auto"></video>
                </template>
            </el-table-column>
            <!-- fps -->
            <el-table-column label="fps" width="120">
                <!-- 自定义表头：文字 + tooltip -->
                <template #header>
                    <el-tooltip effect="dark" content="FPS 表示当前视频每秒拆裁的帧数（比如默认是1代表1秒拆裁1张图片），数值越高需要的时间越久" placement="top">
                        <span>
                            FPS
                            <el-icon><question-filled /></el-icon>
                        </span>
                    </el-tooltip>
                </template>

                <!-- 表格内容 -->
                <template #default="scope">
                    {{ scope.row.fps }}
                </template>
            </el-table-column>
            <el-table-column label="时长(秒)" width="180">
                <template #default="scope">
                    {{ formatDuration(scope.row.duration) }}
                </template>
            </el-table-column>
            <!-- 视频大小 -->
            <el-table-column label="视频大小" width="180">
                <template #default="scope">
                    {{ formatFileSize(scope.row.metadata?.size) }}
                </template>
            </el-table-column>
            <!-- 码率 -->
            <el-table-column label="码率" width="180">
                <template #default="scope">
                    {{ formatBitrate(scope.row.metadata?.bitrate) }}
                </template>
            </el-table-column>
            <!-- 时长 -->
            <el-table-column label="时长(秒)" width="180">
                <template #default="scope">
                    {{ formatDuration(scope.row.duration) }}
                </template>
            </el-table-column>
            <el-table-column label="操作" width="150" fixed="right">
                <template #default="scope">
                    <el-button link type="primary" @click="handlePreview(scope.row)">预览</el-button>
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
                <el-form-item label="fps" prop="fps">
                    <el-input-number v-model="ruleForm.fps" :min="1" :max="10" />
                </el-form-item>
                <el-form-item label="视频上传">
                    <!-- 上传区域 -->
                    <el-upload
                        class="upload-demo"
                        :http-request="uploadVideo"
                        ref="uploadRef"
                        drag
                        :auto-upload="false"
                        :limit="1"
                        :on-change="handleChange"
                        :show-file-list="false"
                        :file-list="fileList"
                    >
                        <!-- 预览区域：如果已有文件，则显示视频 -->
                        <div v-if="previewVideoUrl" class="video-preview-wrapper">
                            <video :src="previewVideoUrl" class="preview-video" controls :style="{ width: '100%', height: '200px', objectFit: 'contain' }"></video>
                            <div class="preview-overlay">
                                <el-button size="small" type="danger" @click.stop="removeFile">重新上传</el-button>
                            </div>
                        </div>
                        <!-- 没有文件时显示上传提示 -->
                        <div v-else>
                            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
                            <div class="el-upload__text">把文件拖到这里<em>或者点击这里</em></div>
                            <template>
                                <div class="el-upload__tip">请上传 mp4 文件</div>
                            </template>
                        </div>
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

        <el-dialog :title="detailsObj.name" v-model="dialogVisibleDetails" width="80%">
            <div class="block text-center">
                <!-- <span class="demonstration">{{detailsObj.name}}</span> motion-blur -->
                <el-carousel height="662px" direction="vertical">
                    <el-carousel-item v-for="item in detailsObj.frames" :key="item">
                        <!-- :src="`${proxy.$api.img_url}${scope.row?.avatar?.filePath}`" -->
                        <el-image :src="`${proxy.$api.img_url}${item}`" />
                    </el-carousel-item>
                </el-carousel>
            </div>
        </el-dialog>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, getCurrentInstance, nextTick } from 'vue';
const { proxy } = getCurrentInstance();
const tableData = ref([]);
const ruleFormRef = ref(null);
const uploadRef = ref(null);
const detailsObj = ref({});
const dialogVisibleDetails = ref(false);
// 初始模板对象
const formTemplate = {
    name: '',
    videoFile: null,
    fps: 1,
};
let ruleForm = reactive({ ...formTemplate });
// 重置ruleForm数据函数
const rules = {
    name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
};
const previewVideoUrl = ref('');
const fileList = ref([]);
// 重置表单sF
const resetForm = () => {
    ruleForm = reactive({ ...formTemplate });
    if (ruleFormRef.value) ruleFormRef.value.resetFields();
    fileList.value = [];
    previewVideoUrl.value = '';
    ruleForm.videoFile = null;
};
const dialogVisible = ref(false);

// 查询视频
const getDataList = async () => {
    const res = await proxy.$api.getVideoList();
    tableData.value = res.data;
};

// 重新上传
const removeFile = () => {
    uploadRef.value?.handleRemove(fileList.value[0]);
    handleRemove();
};
// 移除文件
const handleRemove = () => {
    if (previewVideoUrl.value) {
        URL.revokeObjectURL(previewVideoUrl.value);
        previewVideoUrl.value = '';
    }
    ruleForm.videoFile = null;
};

// 处理文件变化
const handleChange = (file, uploadFileList) => {
    console.log(' handleChange 触发', file);
    console.log('文件状态:', file.status); // 应该是 'ready'

    const { raw } = file;
    if (!raw) return;

    if (!raw.type.includes('video/mp4')) {
        ElMessage.error('只支持 mp4');
        uploadRef.value?.handleRemove(file);
        return;
    }

    // 释放旧预览
    if (previewVideoUrl.value) {
        URL.revokeObjectURL(previewVideoUrl.value);
    }
    previewVideoUrl.value = URL.createObjectURL(raw);

    fileList.value = [file];
};

// 预览
const handlePreview = row => {
    console.log('handlePreview 触发', row);
    detailsObj.value = row;
    dialogVisibleDetails.value = true;
};

// 编辑回显
const handleEdit = async row => {
    ruleForm = reactive({ ...row });
    // fileList.value.push({ raw: ruleForm.videoFile });
    previewVideoUrl.value = `${proxy.$api.baseUrl}/${row.filepath}`;
    // 模拟文件对象添加到 fileList
    // fileList.value = [
    //     {
    //         name: row.filepath.split('/').pop(), // 提取文件名
    //         url: previewVideoUrl.value,
    //         status: 'success', // 设置为已上传状态
    //     },
    // ];
    dialogVisible.value = true;
};

// 自定义上传方法
const uploadVideo = async ({ file, onSuccess, onError }) => {
    console.log(112211666666);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', ruleForm.name);
    formData.append('fps', ruleForm.fps);
    formData.append('id', ruleForm.id);
    try {
        if (ruleForm.id) {
            const res = await proxy.$api.updateVideo(formData);
            if (res.code == 200) {
                proxy.$message.success('上传成功');
                dialogVisible.value = false;
                getDataList();
                onSuccess(res);
                fileList.value = [];
                previewVideoUrl.value = '';
                ruleForm.videoFile = null;
            }
            return;
        }
        const res = await proxy.$api.addVideo(formData);
        console.log(res);
        if (res.code == 200) {
            proxy.$message.success('上传成功');
            dialogVisible.value = false;
            getDataList();
            onSuccess(res);
            fileList.value = [];
            previewVideoUrl.value = '';
            ruleForm.videoFile = null;
        }
    } catch (err) {
        onError(err);
    }
};

const onSubmit = async formEl => {
    if (!formEl) return;

    await formEl.validate(async valid => {
        if (!valid) {
            proxy.$message.error('验证失败');
            return;
        }

        await nextTick();

        // 检查是否有新上传的文件
        const hasNewFile = fileList.value.some(file => file.status === 'ready');

        if (hasNewFile) {
            // 有新文件，触发上传
            uploadRef.value?.submit();
        } else if (ruleForm.id && previewVideoUrl.value) {
            // 编辑模式且没有新文件，直接调用更新接口
            try {
                const formData = new FormData();
                formData.append('name', ruleForm.name);
                formData.append('fps', ruleForm.fps);
                formData.append('id', ruleForm.id);
                // 如果有现有文件路径，可以传递给后端
                formData.append('filepath', ruleForm.filepath || '');

                const res = await proxy.$api.updateVideo(formData);
                if (res.code === 200) {
                    proxy.$message.success('更新成功');
                    dialogVisible.value = false;
                    getDataList();
                    fileList.value = [];
                    previewVideoUrl.value = '';
                }
            } catch (err) {
                proxy.$message.error('更新失败');
            }
        } else {
            proxy.$message.error('请上传视频文件');
        }
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

const formatDuration = secondsStr => {
    const seconds = parseInt(secondsStr, 10);
    if (isNaN(seconds)) return '-';
    return new Date(seconds * 1000).toISOString().substr(11, 8);
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
