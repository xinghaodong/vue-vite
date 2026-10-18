<template>
    <div class="ffmpeg-container">
        <!-- 接入大厂级超级表格 ProTable -->
        <ProTable
            ref="proTableRef"
            title="音视频与 FFmpeg 抽帧管理"
            :columns="columns"
            :request-api="getVideoTableData"
            row-key="id"
            :border="true"
        >
            <template #tableHeader>
                <el-button
                    type="primary"
                    :icon="Plus"
                    @click="handleAdd"
                >
                    新增视频
                </el-button>
            </template>

            <!-- 视频预览 -->
            <template #preview="{ row }">
                <video
                    v-if="row.filepath"
                    :src="`${proxy.$api.baseUrl}/${row.filepath}`"
                    muted
                    autoplay
                    loop
                    class="table-video-preview"
                />
                <span v-else class="text-gray-400">无视频文件</span>
            </template>

            <!-- fps 列头及内容 -->
            <template #fpsHeader>
                <el-tooltip effect="dark" content="FPS 表示当前视频每秒拆裁的帧数（数值越高解析耗时越长）" placement="top">
                    <span class="inline-flex items-center gap-1">
                        FPS <el-icon><QuestionFilled /></el-icon>
                    </span>
                </el-tooltip>
            </template>
            <template #fps="{ row }">
                <el-tag type="info">{{ row.fps }} fps</el-tag>
            </template>

            <!-- 时长 -->
            <template #duration="{ row }">
                {{ formatDuration(row.duration) }}
            </template>

            <!-- 视频大小 -->
            <template #fileSize="{ row }">
                {{ formatFileSize(row.metadata?.size) }}
            </template>

            <!-- 码率 -->
            <template #bitrate="{ row }">
                {{ formatBitrate(row.metadata?.bitrate) }}
            </template>

            <!-- 操作列 -->
            <template #operation="{ row }">
                <el-button link type="primary" @click="handlePreview(row)">预览</el-button>
                <el-button link type="primary" @click="handleFrame(row)">查看帧</el-button>
                <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
                <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
        </ProTable>

        <!-- 编辑 / 新增视频弹窗 -->
        <ProDialog
            v-model="dialogVisible"
            :title="ruleForm.id ? '编辑视频与抽帧参数' : '新增视频并自动拆帧'"
            sub-title="配置视频名称、解析 FPS 频率，并上传 MP4 原片"
            width="600px"
            :on-confirm="() => onSubmit(ruleFormRef)"
        >
            <el-form ref="ruleFormRef" :rules="rules" :model="ruleForm" label-width="100px">
                <el-form-item label="名称" prop="name">
                    <el-input v-model="ruleForm.name" maxlength="50" placeholder="请输入视频名称" />
                </el-form-item>
                <el-form-item label="FPS 频率" prop="fps">
                    <el-input-number style="width: 200px" v-model="ruleForm.fps" :min="1" :max="10" />
                </el-form-item>
                <el-form-item label="视频上传">
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
                        <div v-if="previewVideoUrl" class="video-preview-wrapper">
                            <video :src="previewVideoUrl" class="preview-video" controls style="width: 100%; height: 200px; object-fit: contain;"></video>
                            <div class="preview-overlay">
                                <el-button size="small" type="danger" @click.stop="removeFile">重新上传</el-button>
                            </div>
                        </div>
                        <div v-else>
                            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
                            <div class="el-upload__text">把视频拖到这里或<em>点击上传</em></div>
                            <div class="el-upload__tip text-gray-400">仅支持 mp4 格式文件</div>
                        </div>
                    </el-upload>
                </el-form-item>
            </el-form>
        </ProDialog>

        <!-- 关键帧轮播详情弹窗 -->
        <ProDialog
            v-model="dialogVisibleDetails"
            :title="detailsObj.name || '视频关键帧切片'"
            sub-title="展示 FFmpeg 逐秒拆解出的高清帧序列"
            width="850px"
            :show-confirm="false"
            cancel-text="关闭"
        >
            <div class="text-center" v-if="detailsObj.frames?.length">
                <el-carousel height="560px" direction="vertical">
                    <el-carousel-item v-for="item in detailsObj.frames" :key="item">
                        <el-image
                            :src="`${proxy.$api.img_url}${item}`"
                            fit="contain"
                            style="width: 100%; height: 100%;"
                        />
                    </el-carousel-item>
                </el-carousel>
            </div>
            <el-empty v-else description="暂无切片关键帧数据" />
        </ProDialog>
    </div>
</template>

<script setup>
defineOptions({
    name: 'ffmpegs',
});
import { ref, reactive, getCurrentInstance, nextTick } from 'vue';
import { Plus, QuestionFilled, UploadFilled } from '@element-plus/icons-vue';

const { proxy } = getCurrentInstance();
const proTableRef = ref(null);
const ruleFormRef = ref(null);
const uploadRef = ref(null);
const detailsObj = ref({});
const dialogVisibleDetails = ref(false);
const dialogVisible = ref(false);

const formTemplate = {
    name: '',
    videoFile: null,
    fps: 1,
};
let ruleForm = reactive({ ...formTemplate });

const rules = {
    name: [{ required: true, message: '请输入视频名称', trigger: 'blur' }],
};

const previewVideoUrl = ref('');
const fileList = ref([]);

const columns = [
    { type: 'index', label: '#', width: 60, align: 'center' },
    {
        prop: 'name',
        label: '视频名称',
        minWidth: 160,
        search: {
            el: 'input',
            props: { placeholder: '请输入视频名称' }
        }
    },
    { prop: 'preview', label: '视频预览', width: 200, align: 'center' },
    { prop: 'fps', label: 'FPS', width: 110, align: 'center', headerSlot: 'fpsHeader' },
    { prop: 'duration', label: '时长', width: 120, align: 'center' },
    { prop: 'fileSize', label: '视频大小', width: 130, align: 'center' },
    { prop: 'bitrate', label: '码率', width: 130, align: 'center' },
    { prop: 'operation', label: '操作', width: 220, fixed: 'right', align: 'left' }
];

// ProTable 数据请求驱动适配
const getVideoTableData = async (params = {}) => {
    const { pageNum, pageSize, name } = params;
    const res = await proxy.$api.getVideoList({
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

const handleAdd = () => {
    resetForm();
    dialogVisible.value = true;
};

const resetForm = () => {
    Object.assign(ruleForm, JSON.parse(JSON.stringify(formTemplate)));
    delete ruleForm.id;
    delete ruleForm.filepath;
    if (ruleFormRef.value) ruleFormRef.value.resetFields();
    fileList.value = [];
    previewVideoUrl.value = '';
};

const removeFile = () => {
    uploadRef.value?.handleRemove(fileList.value[0]);
    handleRemove();
};

const handleRemove = () => {
    if (previewVideoUrl.value) {
        URL.revokeObjectURL(previewVideoUrl.value);
        previewVideoUrl.value = '';
    }
    ruleForm.videoFile = null;
};

const handleChange = (file) => {
    const { raw } = file;
    if (!raw) return;

    if (!raw.type.includes('video/mp4')) {
        proxy.$message.error('只支持 mp4 格式文件');
        uploadRef.value?.handleRemove(file);
        return;
    }

    if (previewVideoUrl.value) {
        URL.revokeObjectURL(previewVideoUrl.value);
    }
    previewVideoUrl.value = URL.createObjectURL(raw);
    fileList.value = [file];
};

const handlePreview = async row => {
    const routeData = proxy.$router.resolve({
        path: '/ffmpegGsap',
        query: { idkey: row ? row.id : '', token: sessionStorage.getItem('token') },
    });
    window.open(routeData.href, '_blank');
};

const handleFrame = row => {
    detailsObj.value = row;
    dialogVisibleDetails.value = true;
};

const handleEdit = async row => {
    resetForm();
    Object.assign(ruleForm, row);
    previewVideoUrl.value = `${proxy.$api.baseUrl}/${row.filepath}`;
    dialogVisible.value = true;
};

const uploadVideo = async ({ file, onError }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', ruleForm.name);
    formData.append('fps', ruleForm.fps);
    formData.append('id', ruleForm.id || '');

    try {
        const apiMethod = ruleForm.id ? proxy.$api.updateVideo : proxy.$api.addVideo;
        const res = await apiMethod(formData);
        if (res.code == 200) {
            proxy.$message.success('上传成功');
            dialogVisible.value = false;
            proTableRef.value?.refresh();
            fileList.value = [];
            previewVideoUrl.value = '';
            ruleForm.videoFile = null;
        }
    } catch (err) {
        onError(err);
    }
};

const onSubmit = async formEl => {
    if (!formEl) return false;

    return new Promise((resolve) => {
        formEl.validate(async valid => {
            if (!valid) {
                proxy.$message.error('请填写必填项');
                return resolve(false);
            }

            await nextTick();
            const hasNewFile = fileList.value.some(file => file.status === 'ready');

            if (hasNewFile) {
                uploadRef.value?.submit();
                resolve(true);
            } else if (ruleForm.id && previewVideoUrl.value) {
                try {
                    const formData = new FormData();
                    formData.append('name', ruleForm.name);
                    formData.append('fps', ruleForm.fps);
                    formData.append('id', ruleForm.id);
                    formData.append('filepath', ruleForm.filepath || '');

                    const res = await proxy.$api.updateVideo(formData);
                    if (res.code === 200) {
                        proxy.$message.success('更新成功');
                        dialogVisible.value = false;
                        proTableRef.value?.refresh();
                        fileList.value = [];
                        previewVideoUrl.value = '';
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                } catch (err) {
                    proxy.$message.error('更新失败');
                    resolve(false);
                }
            } else {
                proxy.$message.error('请上传视频文件');
                resolve(false);
            }
        });
    });
};

const handleDelete = async row => {
    proxy.$messageBox
        .confirm('确定要删除该视频及所有切片帧吗?', '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
        })
        .then(async () => {
            const data = await proxy.$api.deleteVideo({ id: row.id });
            if (data.code == 200) {
                proxy.$message.success(data.message);
                proTableRef.value?.refresh();
            }
        });
};

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

const formatBitrate = bpsStr => {
    const bps = parseInt(bpsStr, 10);
    if (isNaN(bps)) return '-';

    if (bps < 1000) return `${bps} bps`;
    if (bps < 1_000_000) return `${(bps / 1000).toFixed(2)} kbps`;
    return `${(bps / 1_000_000).toFixed(2)} Mbps`;
};
</script>

<style scoped>
.ffmpeg-container {
    width: 100%;
    height: 100%;
}
.table-video-preview {
    width: 100%;
    max-width: 180px;
    height: 90px;
    object-fit: cover;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.video-preview-wrapper {
    position: relative;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
}
.preview-overlay {
    position: absolute;
    top: 8px;
    right: 8px;
}
</style>
