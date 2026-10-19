<!-- （Renderer）：FileUploadWidget.vue（附件上传在页面上的实际交互）； -->
<template>
    <div class="file-upload-widget">
        <!-- 上传触发按钮 -->
        <el-upload
            v-if="!noApproval && (!disabled || isDesign)"
            :disabled="disabled || isDesign"
            :action="uploadUrl"
            name="avatar"
            :headers="uploadHeaders"
            :accept="propsConfig.accept || '.jpg,.jpeg,.png,.pdf'"
            :limit="propsConfig.limit || 10"
            :show-file-list="false"
            :on-success="handleUploadSuccess"
            :before-upload="beforeUploadCheck"
        >
            <el-button type="primary" plain size="small">
                <el-icon style="margin-right: 4px"><UploadFilled /></el-icon>
                上传附件
            </el-button>
            <template #tip>
                <div class="el-upload__tip" style="font-size: 12px; color: #909399; margin-top: 4px">
                    {{ propsConfig.tip || '支持jpg/png/pdf格式发票附件，单文件不超过10MB' }}
                </div>
            </template>
        </el-upload>

        <!-- 自定义稳定发票附件卡片列表 (无闪烁、支持PDF专属徽标) -->
        <div v-if="fileList && fileList.length > 0" class="custom-file-list">
            <div
                v-for="(file, fIdx) in fileList"
                :key="file.id || file.fileName || fIdx"
                class="custom-file-item"
            >
                <!-- 左侧图标/缩略图 -->
                <div class="file-icon-box" :class="{ 'is-pdf': isPdf(file) }">
                    <template v-if="isPdf(file)">
                        <div class="pdf-badge">
                            <el-icon :size="16"><Document /></el-icon>
                            <span class="pdf-tag">PDF</span>
                        </div>
                    </template>
                    <template v-else-if="isImage(file)">
                        <img :src="getFileUrl(file)" class="img-thumb" @error="(e) => e.target.style.display = 'none'" />
                        <el-icon :size="20" color="#409EFF" class="img-fallback"><Picture /></el-icon>
                    </template>
                    <template v-else>
                        <el-icon :size="22" color="#409EFF"><Document /></el-icon>
                    </template>
                </div>

                <!-- 中间文件详情 -->
                <div class="file-info-box">
                    <div class="file-name" :title="getFileName(file)">{{ getFileName(file) }}</div>
                    <div class="file-meta">
                        <span v-if="file.size || file.fileSize" class="file-size">{{ formatFileSize(file.size || file.fileSize) }}</span>
                        <span class="file-status-tag">
                            <el-icon color="#67C23A" :size="12"><CircleCheckFilled /></el-icon>
                            已上传
                        </span>
                    </div>
                </div>

                <!-- 右侧操作按钮 -->
                <div class="file-actions-box">
                    <el-tooltip content="在新窗口查看/下载" placement="top">
                        <el-button link type="primary" size="small" @click="handlePreviewFile(file)">
                            <el-icon :size="16"><View /></el-icon>
                        </el-button>
                    </el-tooltip>
                    <el-tooltip content="移除文件" placement="top" v-if="!noApproval && !disabled">
                        <el-button link type="danger" size="small" @click="handleRemoveFile(file)">
                            <el-icon :size="16"><Delete /></el-icon>
                        </el-button>
                    </el-tooltip>
                </div>
            </div>
        </div>

        <div v-else-if="noApproval" class="empty-upload-text">
            未上传发票/附件
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import { UploadFilled, Document, Picture, Delete, View, CircleCheckFilled } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

const baseUrl = import.meta.env.VITE_PROXY_DOMAIN || 'http://127.0.0.1:3001/api';
const staticBase = import.meta.env.VITE_STATIC_URL || 'http://127.0.0.1:3001/api/';

const props = defineProps({
    modelValue: {
        type: Array,
        default: () => [],
    },
    propsConfig: {
        type: Object,
        default: () => ({}),
    },
    disabled: {
        type: Boolean,
        default: false,
    },
    noApproval: {
        type: Boolean,
        default: false,
    },
    isDesign: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(['update:modelValue']);

const fileList = computed(() => (Array.isArray(props.modelValue) ? props.modelValue : []));

const uploadUrl = computed(() => `${baseUrl}/upload/uploadFile`);
const uploadHeaders = computed(() => {
    const token = sessionStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
});

const isPdf = file => {
    const name = file?.name || file?.fileName || file?.url || '';
    return name.toLowerCase().endsWith('.pdf') || (file?.contentType && file.contentType.includes('pdf'));
};

const isImage = file => {
    const name = file?.name || file?.fileName || file?.url || '';
    return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name) || (file?.contentType && file.contentType.startsWith('image/'));
};

const formatFileSize = bytes => {
    if (!bytes || isNaN(bytes)) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const getFileName = file => {
    return file?.name || file?.fileName || '发票凭证附件';
};

const getFileUrl = file => {
    if (!file) return '';
    if (file.url && file.url.startsWith('http')) return file.url;
    const filePath = file.filePath || file.path;
    if (filePath) {
        const cleanPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
        return `${staticBase.replace(/\/+$/, '')}/${cleanPath}`;
    }
    if (file.fileName) {
        return `${staticBase.replace(/\/+$/, '')}/uploads/${file.fileName}`;
    }
    return file.url || '';
};

const handlePreviewFile = file => {
    const url = getFileUrl(file);
    if (url) {
        window.open(url, '_blank');
    } else {
        ElMessage.warning('暂无可用预览地址');
    }
};

const handleRemoveFile = targetFile => {
    const nextList = fileList.value.filter(
        f => f !== targetFile && (f.id ? f.id !== targetFile.id : f.fileName !== targetFile.fileName)
    );
    emit('update:modelValue', nextList);
    ElMessage.info('已移除该附件');
};

const beforeUploadCheck = file => {
    const maxSize = (props.propsConfig?.maxSize || 10) * 1024 * 1024;
    if (file.size > maxSize) {
        ElMessage.error(`上传文件大小不能超过 ${props.propsConfig?.maxSize || 10}MB`);
        return false;
    }
    return true;
};

const handleUploadSuccess = (response, file) => {
    const fileData = response?.data || response;
    const itemInfo = {
        id: fileData?.id,
        name: file.name || fileData?.fileName,
        fileName: fileData?.fileName,
        filePath: fileData?.filePath,
        contentType: fileData?.contentType || file?.raw?.type || (file.name?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : ''),
        size: file.size || fileData?.fileSize,
        url: getFileUrl(fileData),
    };
    const nextList = [...fileList.value, itemInfo];
    emit('update:modelValue', nextList);
    ElMessage.success(`${file.name} 上传成功`);
};
</script>

<style scoped>
.file-upload-widget {
    width: 100%;
}

.empty-upload-text {
    color: #909399;
    font-size: 13px;
    padding: 4px 0;
}

.custom-file-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 10px;
    width: 100%;
}

.custom-file-item {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 6px;
    transition: all 0.2s ease;
    box-sizing: border-box;
}

.custom-file-item:hover {
    border-color: #cbd5e1;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.file-icon-box {
    width: 44px;
    height: 44px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #eff6ff;
    margin-right: 12px;
    flex-shrink: 0;
    overflow: hidden;
    position: relative;
    border: 1px solid #dbeafe;
}

.file-icon-box.is-pdf {
    background: #fef2f2;
    border: 1px solid #fee2e2;
}

.pdf-badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #ef4444;
}

.pdf-tag {
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
    margin-top: 2px;
    letter-spacing: 0.5px;
}

.img-thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.img-fallback {
    display: none;
}

.file-info-box {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
}

.file-name {
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 22px;
}

.file-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    color: #94a3b8;
    line-height: 22px;
}

.file-status-tag {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    color: #16a34a;
    font-size: 11px;
}

.file-actions-box {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: 10px;
    flex-shrink: 0;
}
</style>
