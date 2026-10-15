<template>
    <div class="reconstruction-container">
        <!-- 顶部搜索与操作筛选栏 -->
        <div class="table-toolbar">
            <el-form :inline="true" :model="queryForm" class="filter-form">
                <el-form-item label="任务名称">
                    <el-input
                        v-model="queryForm.name"
                        placeholder="请输入任务名称搜索"
                        clearable
                        style="width: 200px"
                        @clear="handleSearch"
                        @keyup.enter="handleSearch"
                    />
                </el-form-item>

                <el-form-item label="飞行架次">
                    <el-input
                        v-model="queryForm.flightId"
                        placeholder="请输入架次编号"
                        clearable
                        style="width: 180px"
                        @clear="handleSearch"
                        @keyup.enter="handleSearch"
                    />
                </el-form-item>

                <el-form-item label="状态">
                    <el-select
                        v-model="queryForm.status"
                        placeholder="全部状态"
                        clearable
                        style="width: 140px"
                        @change="handleSearch"
                    >
                        <el-option label="全部状态" value="" />
                        <el-option label="排队中" value="PENDING" />
                        <el-option label="解压相片中" value="EXTRACTING" />
                        <el-option label="上传引擎中" value="UPLOADING" />
                        <el-option label="三维重建中" value="PROCESSING" />
                        <el-option label="建模完成" value="SUCCESS" />
                        <el-option label="建模失败" value="FAILED" />
                        <el-option label="已取消" value="CANCELED" />
                    </el-select>
                </el-form-item>

                <el-form-item>
                    <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
                    <el-button :icon="Refresh" @click="handleReset">重置</el-button>
                </el-form-item>
            </el-form>

            <div class="action-btns">
                <div class="sse-indicator" :class="{ connected: isSseConnected }" :title="isSseConnected ? '实时推送通道已连接' : '实时推送通道连接中...'">
                    <span class="sse-dot"></span>
                    <span>{{ isSseConnected ? '实时推送在线' : '通道连接中...' }}</span>
                </div>
                <el-button type="success" plain :icon="VideoPlay" @click="openRealtimeDemo">
                    🛸 边飞边建流式仿真 (Demo)
                </el-button>
                <el-button type="primary" plain :icon="Plus" @click="openCreateDialog">
                    新建实景三维建模
                </el-button>
            </div>
        </div>

        <!-- 标准 Element Plus 表格 -->
        <el-table
            v-loading="loading"
            :data="tableData"
            border
            style="width: 100%"
        >
            <el-table-column type="index" label="序号" width="60" align="center" />

            <el-table-column prop="name" label="任务名称" min-width="240">
                <template #default="{ row }">
                    <div class="task-name-text">{{ row.name }}</div>
                    <div class="sub-id-text">ID: {{ row.id }}</div>
                </template>
            </el-table-column>

            <el-table-column prop="flightId" label="关联架次" width="160">
                <template #default="{ row }">
                    <span v-if="row.flightId" class="font-mono text-sm">{{ row.flightId }}</span>
                    <span v-else class="sub-placeholder-text">未绑定</span>
                </template>
            </el-table-column>

            <el-table-column prop="photoCount" label="照片数" width="90" align="center">
                <template #default="{ row }">
                    <span class="font-mono">{{ row.photoCount || 0 }}</span>
                </template>
            </el-table-column>

            <el-table-column prop="status" label="状态" width="120" align="center">
                <template #default="{ row }">
                    <el-tag :type="getStatusTagType(row.status)">
                        {{ getStatusText(row.status) }}
                    </el-tag>
                </template>
            </el-table-column>

            <el-table-column label="重建进度与阶段" min-width="220">
                <template #default="{ row }">
                    <div v-if="isWorking(row.status)">
                        <div class="progress-info-row">
                            <span class="stage-text">{{ row.stage || '处理中...' }}</span>
                            <span class="font-mono">{{ Math.round(row.progress || 0) }}%</span>
                        </div>
                        <el-progress
                            :percentage="Math.round(row.progress || 0)"
                            :stroke-width="6"
                            :striped="true"
                            :striped-flow="true"
                            :show-text="false"
                        />
                    </div>
                    <div v-else-if="row.status === 'SUCCESS'" class="status-ready-text">
                        3D Tiles 已就绪 (可直接漫游查看)
                    </div>
                    <div v-else-if="row.status === 'FAILED'" class="status-failed-text truncate" :title="row.errorMessage">
                        {{ row.errorMessage || '引擎处理异常' }}
                    </div>
                    <div v-else class="sub-placeholder-text">
                        {{ row.stage || '--' }}
                    </div>
                </template>
            </el-table-column>

            <el-table-column prop="processingTime" label="耗时(秒)" width="100" align="center">
                <template #default="{ row }">
                    <span v-if="row.processingTime" class="font-mono">{{ row.processingTime }}s</span>
                    <span v-else class="sub-placeholder-text">--</span>
                </template>
            </el-table-column>

            <el-table-column prop="createdAt" label="创建时间" width="170" align="center">
                <template #default="{ row }">
                    <span class="text-xs">{{ formatTime(row.createdAt) }}</span>
                </template>
            </el-table-column>

            <!-- 操作列 -->
            <el-table-column label="操作" width="240" fixed="right">
                <template #default="{ row }">
                    <!-- 漫游至 Cesium 视窗 -->
                    <el-button
                        v-if="row.status === 'SUCCESS' && row.tilesetUrl"
                        link
                        type="success"
                        :icon="View"
                        @click="flyToCesiumViewer(row)"
                    >
                        三维漫游
                    </el-button>

                    <!-- 查看日志 -->
                    <el-button link type="primary" :icon="Document" @click="openLogsDialog(row)">
                        日志
                    </el-button>

                    <!-- 中止任务 -->
                    <el-button
                        v-if="isWorking(row.status)"
                        link
                        type="warning"
                        @click="handleCancel(row.id)"
                    >
                        中止
                    </el-button>

                    <!-- 删除任务 -->
                    <el-button
                        link
                        type="danger"
                        :icon="Delete"
                        @click="handleDelete(row.id)"
                    >
                        删除
                    </el-button>
                </template>
            </el-table-column>
        </el-table>

        <!-- 分页组件 -->
        <el-pagination
            style="padding: 16px 0"
            background
            :current-page="currentPage"
            :page-sizes="[10, 20, 50, 100]"
            :page-size="pageSize"
            layout="total, sizes, ->, prev, pager, next, jumper"
            :total="total"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
        />

        <!-- 新建模任务弹窗 -->
        <el-dialog
            v-model="createDialogVisible"
            title="新建航拍实景三维建模任务"
            width="620px"
            :destroy-on-close="true"
        >
            <el-form label-width="120px" :model="form">
                <el-form-item label="任务名称" required>
                    <el-input v-model="form.name" placeholder="请输入任务名称，例如: 2026东区巡检自动化建模" clearable />
                </el-form-item>

                <el-form-item label="关联飞行架次">
                    <el-input v-model="form.flightId" placeholder="可选，输入架次编号用于台账关联" clearable />
                </el-form-item>

                <el-form-item label="重建精度">
                    <el-select v-model="form.quality" class="w-full">
                        <el-option label="极速预览 (low - 算力开销小，外业快速出实体成果)" value="low" />
                        <el-option label="极低初筛 (lowest - 极低显存/算力，适合低配集显电脑)" value="lowest" />
                        <el-option label="标准精细 (medium - 网格更密、细节丰富，适合正式归档)" value="medium" />
                    </el-select>
                    <div style="font-size: 12px; color: var(--el-text-color-secondary); margin-top: 4px; line-height: 1.4;">
                        说明：输出成果为 Cesium 3D Tiles 实景三维实体网格（带航拍纹理贴图），精度模式决定特征点提取密度与几何细化程度。
                    </div>
                </el-form-item>

                <el-form-item label="数字高程 (DEM)">
                    <el-switch v-model="form.withDem" active-text="同时生成 DSM/DTM 栅格高程" />
                </el-form-item>

                <el-form-item label="照片压缩包" required>
                    <el-upload
                        ref="uploadRef"
                        class="w-full"
                        drag
                        accept=".zip"
                        :auto-upload="false"
                        :limit="1"
                        :on-change="handleFileSelected"
                        :on-remove="() => (selectedFile = null)"
                    >
                        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
                        <div class="el-upload__text">
                            将航拍相片 ZIP 文件拖到此处，或 <em>点击上传</em>
                        </div>
                        <template #tip>
                            <div class="el-upload__tip text-xs">
                                仅支持 .zip 格式压缩包，支持最大 2GB，压缩包内可包含子目录
                            </div>
                        </template>
                    </el-upload>
                </el-form-item>

                <!-- 上传进度条 -->
                <div v-if="uploadProgress > 0 && uploadProgress < 100" class="upload-progress-box">
                    <div class="progress-info-row">
                        <span class="stage-text">正在上传压缩包...</span>
                        <span>{{ uploadProgress }}%</span>
                    </div>
                    <el-progress :percentage="uploadProgress" :stroke-width="6" status="success" :show-text="false" />
                </div>
            </el-form>

            <template #footer>
                <div class="flex justify-end gap-2">
                    <el-button @click="createDialogVisible = false">取消</el-button>
                    <el-button
                        type="primary"
                        :disabled="!selectedFile || submitting"
                        :loading="submitting"
                        @click="submitCreateTask"
                    >
                        提交并启动建模
                    </el-button>
                </div>
            </template>
        </el-dialog>

        <!-- 查看日志弹窗 -->
        <el-dialog
            v-model="logsDialogVisible"
            :title="`引擎运行实时日志 - ${activeTask?.name || ''}`"
            width="820px"
            :destroy-on-close="true"
        >
            <div class="logs-header-meta">
                <span>ODM UUID: {{ activeTask?.odmUuid || '排队中' }}</span>
                <div class="logs-header-actions">
                    <el-checkbox v-model="autoRefreshLogs" size="small">自动刷新 (3秒)</el-checkbox>
                    <el-button size="small" :icon="Refresh" @click="fetchLogs(activeTask?.id)">刷新</el-button>
                </div>
            </div>

            <div ref="logContainerRef" class="terminal-log-viewer">
                <div v-if="logLines.length === 0" class="empty-logs">
                    暂无日志或任务正在排队准备中...
                </div>
                <div v-for="(line, idx) in logLines" :key="idx" class="terminal-row" :class="getLogLineClass(line)">
                    <span class="row-num">{{ idx + 1 }}</span>
                    <span class="row-content">{{ line }}</span>
                </div>
            </div>
        </el-dialog>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import {
    Search,
    Refresh,
    Plus,
    UploadFilled,
    View,
    Document,
    Delete,
    VideoPlay,
} from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
    getReconstructionList,
    uploadReconstructionZip,
    getReconstructionLogs,
    cancelReconstructionTask,
    deleteReconstructionTask,
} from '@/api/reconstruction';
import { useReconstructionStream } from '@/composables/useReconstructionStream';

const router = useRouter();

// 全局单例按需推送 Hook
const {
    isSseConnected,
    subscribe,
    syncActiveTasks,
    notifyTaskCreated,
} = useReconstructionStream();
let unsubscribeSse = null;

// 搜索查询表单
const queryForm = reactive({
    name: '',
    flightId: '',
    status: '',
});

const loading = ref(false);
const tableData = ref([]);
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);

// 新建弹窗
const createDialogVisible = ref(false);
const submitting = ref(false);
const selectedFile = ref(null);
const uploadProgress = ref(0);
const uploadRef = ref(null);

const form = reactive({
    name: '',
    flightId: '',
    quality: 'low',
    withDem: false,
});

// 日志弹窗
const logsDialogVisible = ref(false);
const activeTask = ref(null);
const logLines = ref([]);
const autoRefreshLogs = ref(true);
let logPollTimer = null;
const logContainerRef = ref(null);

onMounted(() => {
    fetchList();
    // 订阅全局单例事件流
    unsubscribeSse = subscribe(handleRealtimeEvent);
});

onUnmounted(() => {
    if (unsubscribeSse) {
        unsubscribeSse();
        unsubscribeSse = null;
    }
    stopLogPolling();
});

const isWorking = (status) => {
    return status === 'PROCESSING' || status === 'UPLOADING' || status === 'EXTRACTING' || status === 'PENDING';
};

// 获取表格数据
const fetchList = async () => {
    loading.value = true;
    try {
        const params = {
            page: currentPage.value,
            pageSize: pageSize.value,
            name: queryForm.name || undefined,
            flightId: queryForm.flightId || undefined,
            status: queryForm.status || undefined,
        };
        const res = await getReconstructionList(params);
        const data = res?.data || res;
        tableData.value = data?.list || [];
        total.value = data?.total || 0;
        // 同步当前页任务状态至全局按需单例
        syncActiveTasks(tableData.value);
    } catch (err) {
        console.error('获取实景三维列表失败:', err);
    } finally {
        loading.value = false;
    }
};

const handleSearch = () => {
    currentPage.value = 1;
    fetchList();
};

const handleReset = () => {
    queryForm.name = '';
    queryForm.flightId = '';
    queryForm.status = '';
    currentPage.value = 1;
    fetchList();
};

const handleSizeChange = (val) => {
    pageSize.value = val;
    fetchList();
};

const handleCurrentChange = (val) => {
    currentPage.value = val;
    fetchList();
};

// 处理来自服务端的实时推送事件（更新当前表格视图）
const handleRealtimeEvent = (payload) => {
    if (!payload || !payload.type) return;
    const { type, data } = payload;
    if (type === 'ping') return; // 心跳直接略过

    console.log(`[reconstructionList] 消费实时事件 [${type}]:`, data);

    if (type === 'task_created') {
        // 新任务被提交：若在第一页且本地尚无此项，则直接前置插入
        if (currentPage.value === 1) {
            const exists = tableData.value.some((t) => t.id === data.id);
            if (!exists) {
                tableData.value.unshift(data);
                total.value += 1;
            }
        }
    } else if (type === 'task_updated') {
        // 进度或状态更新：原地响应式更新表格行，无页面刷新与抖动
        const target = tableData.value.find((t) => t.id === data.id);
        if (target) {
            if (data.status !== undefined) target.status = data.status;
            if (data.progress !== undefined) target.progress = data.progress;
            if (data.stage !== undefined) target.stage = data.stage;
            if (data.photoCount !== undefined) target.photoCount = data.photoCount;
            if (data.odmUuid !== undefined) target.odmUuid = data.odmUuid;
        }
        // 如果当前正好在查看该任务的日志，也可同步更新标题与元数据
        if (activeTask.value && activeTask.value.id === data.id) {
            Object.assign(activeTask.value, data);
        }
    } else if (type === 'task_completed') {
        // 建模成功完成：就地更新表格（全局弹窗已由 useReconstructionStream 统一触发）
        const target = tableData.value.find((t) => t.id === data.id);
        if (target) {
            Object.assign(target, data);
        } else if (currentPage.value === 1) {
            tableData.value.unshift(data);
        }
    } else if (type === 'task_failed') {
        // 建模失败或中断：就地更新状态（全局报错弹窗已由 useReconstructionStream 统一触发）
        const target = tableData.value.find((t) => t.id === data.id);
        if (target) {
            if (data.status !== undefined) target.status = data.status;
            if (data.stage !== undefined) target.stage = data.stage;
            if (data.errorMessage !== undefined) target.errorMessage = data.errorMessage;
        }
    } else if (type === 'task_deleted') {
        // 任务被删除
        tableData.value = tableData.value.filter((t) => t.id !== data.id);
        total.value = Math.max(0, total.value - 1);
    }
};

// 新建弹窗操作
const openCreateDialog = () => {
    form.name = '';
    form.flightId = '';
    form.quality = 'low';
    form.withDem = false;
    selectedFile.value = null;
    uploadProgress.value = 0;
    uploadRef.value?.clearFiles();
    createDialogVisible.value = true;
};

const handleFileSelected = (uploadFile) => {
    selectedFile.value = uploadFile.raw;
    if (!form.name && uploadFile.name) {
        form.name = uploadFile.name.replace(/\.zip$/i, '');
    }
};

const submitCreateTask = async () => {
    if (!selectedFile.value) {
        ElMessage.warning('请选择航拍相片 ZIP 文件');
        return;
    }

    submitting.value = true;
    uploadProgress.value = 1;

    try {
        const fd = new FormData();
        fd.append('file', selectedFile.value);
        fd.append('name', form.name || selectedFile.value.name.replace(/\.zip$/i, ''));
        if (form.flightId) fd.append('flightId', form.flightId);
        fd.append('quality', form.quality);
        fd.append('withDem', form.withDem);

        const res = await uploadReconstructionZip(fd, (percent) => {
            uploadProgress.value = percent;
        });

        const taskData = res?.data || res;
        if (taskData?.id) {
            // 标记新任务诞生，通知单例保持活跃
            notifyTaskCreated(taskData.id);
        }

        ElMessage.success('实景建模任务已创建并启动！');
        createDialogVisible.value = false;
        fetchList();
    } catch (err) {
        ElMessage.error(`提交失败: ${err.message || '网络异常'}`);
    } finally {
        submitting.value = false;
    }
};

// 跳转到 Cesium 全景漫游 (在新标签页打开，保持列表状态)
const flyToCesiumViewer = (row) => {
    if (!row.tilesetUrl) return;
    const routeData = router.resolve({
        path: '/newcesium',
        query: {
            modelUrl: row.tilesetUrl,
            modelName: row.name,
            token: sessionStorage.getItem('token') || '',
        },
    });
    window.open(routeData.href, '_blank');
};

// 打开边飞边建流式仿真演示 (新标签页)
const openRealtimeDemo = () => {
    const routeData = router.resolve({
        path: '/realtime-fly-demo',
    });
    window.open(routeData.href, '_blank');
};

// 日志操作
const openLogsDialog = (row) => {
    activeTask.value = row;
    logsDialogVisible.value = true;
    fetchLogs(row.id);
    startLogPolling(row.id);
};

const fetchLogs = async (taskId) => {
    if (!taskId) return;
    try {
        const res = await getReconstructionLogs(taskId, 80);
        const data = res?.data || res;
        logLines.value = data?.logs || [];
        nextTick(() => {
            if (logContainerRef.value) {
                logContainerRef.value.scrollTop = logContainerRef.value.scrollHeight;
            }
        });
    } catch (e) {
        console.warn('获取日志失败:', e);
    }
};

const startLogPolling = (taskId) => {
    stopLogPolling();
    logPollTimer = setInterval(() => {
        if (autoRefreshLogs.value && logsDialogVisible.value) {
            fetchLogs(taskId);
        }
    }, 3000);
};

const stopLogPolling = () => {
    if (logPollTimer) {
        clearInterval(logPollTimer);
        logPollTimer = null;
    }
};

// 中止任务
const handleCancel = (id) => {
    ElMessageBox.confirm('确认强行中止正在执行的建模任务？', '操作确认', {
        type: 'warning',
        confirmButtonText: '确定中止',
        cancelButtonText: '取消',
    }).then(async () => {
        try {
            await cancelReconstructionTask(id);
            ElMessage.info('已发送中止指令');
            fetchList();
        } catch (err) {
            ElMessage.error(`中止失败: ${err.message}`);
        }
    });
};

// 删除任务
const handleDelete = (id) => {
    ElMessageBox.confirm('确认彻底删除该任务及其所有三维成果？', '警告', {
        type: 'error',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
    }).then(async () => {
        try {
            await deleteReconstructionTask(id);
            ElMessage.success('任务已删除');
            fetchList();
        } catch (err) {
            ElMessage.error(`删除失败: ${err.message}`);
        }
    });
};

// 状态标签
const getStatusTagType = (status) => {
    switch (status) {
        case 'SUCCESS':
            return 'success';
        case 'PROCESSING':
            return 'primary';
        case 'UPLOADING':
        case 'EXTRACTING':
        case 'PENDING':
            return 'info';
        case 'FAILED':
            return 'danger';
        case 'CANCELED':
            return 'warning';
        default:
            return '';
    }
};

const getStatusText = (status) => {
    const map = {
        PENDING: '排队就绪',
        EXTRACTING: '解压相片中',
        UPLOADING: '上传引擎中',
        PROCESSING: '三维重建中',
        SUCCESS: '建模完成',
        FAILED: '建模失败',
        CANCELED: '已取消',
    };
    return map[status] || status;
};

const formatTime = (timeStr) => {
    if (!timeStr) return '--';
    const d = new Date(timeStr);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

const getLogLineClass = (line) => {
    if (/\[ERROR\]|error|failed/i.test(line)) return 'line-error';
    if (/\[WARNING\]|warn/i.test(line)) return 'line-warn';
    if (/\[INFO\]|success/i.test(line)) return 'line-info';
    return '';
};
</script>

<style scoped>
.reconstruction-container {
    width: 100%;
}

.table-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 12px;
}

.filter-form {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
}

.filter-form :deep(.el-form-item) {
    margin-bottom: 0 !important;
}

.task-name-text {
    font-weight: 500;
    font-size: 14px;
    line-height: 1.4;
    color: var(--el-text-color-primary);
}

.sub-id-text {
    font-size: 12px;
    margin-top: 2px;
    color: var(--el-text-color-secondary);
}

.sub-placeholder-text {
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

.progress-info-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    margin-bottom: 4px;
}

.stage-text {
    color: var(--el-color-primary);
    font-weight: 500;
}

.status-ready-text {
    font-size: 12px;
    color: var(--el-color-success);
    font-weight: 500;
}

.status-failed-text {
    font-size: 12px;
    color: var(--el-color-danger);
}

.upload-progress-box {
    padding: 8px 16px;
}

.logs-header-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-bottom: 8px;
}

.logs-header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.empty-logs {
    color: var(--el-text-color-placeholder);
    text-align: center;
    padding: 32px 0;
}

/* 终端日志自适应主题查看器：严格使用 Element Plus 官方设计令牌 */
.terminal-log-viewer {
    background-color: var(--el-fill-color-darker);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 6px;
    padding: 12px;
    height: 480px;
    overflow-y: auto;
    font-family: 'Fira Code', Consolas, Monaco, monospace;
    font-size: 12px;
    line-height: 1.6;
}

.terminal-row {
    display: flex;
    gap: 10px;
    word-break: break-all;
    white-space: pre-wrap;
}

.row-num {
    color: var(--el-text-color-secondary);
    user-select: none;
    min-width: 28px;
    text-align: right;
}

.row-content {
    color: var(--el-text-color-regular);
}

.line-error .row-content {
    color: var(--el-color-danger);
    font-weight: 600;
}

.line-warn .row-content {
    color: var(--el-color-warning);
}

.line-info .row-content {
    color: var(--el-color-success);
}

/* SSE 实时推送状态指示徽章 */
.sse-indicator {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 14px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    background-color: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    margin-right: 8px;
    user-select: none;
    transition: all 0.3s ease;
}

.sse-indicator.connected {
    color: var(--el-color-success);
    background-color: var(--el-color-success-light-9);
    border-color: var(--el-color-success-light-5);
}

.sse-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background-color: var(--el-color-info);
    display: inline-block;
    transition: all 0.3s ease;
}

.sse-indicator.connected .sse-dot {
    background-color: var(--el-color-success);
    box-shadow: 0 0 6px var(--el-color-success);
    animation: ssePulse 2s infinite ease-in-out;
}

@keyframes ssePulse {
    0%, 100% {
        opacity: 1;
        transform: scale(1);
    }
    50% {
        opacity: 0.4;
        transform: scale(0.85);
    }
}
</style>
