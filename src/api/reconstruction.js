import { request, oGet, oPost } from '@/utils/request';

/**
 * 分页获取三维建模任务列表
 */
export function getReconstructionList(params = {}) {
    return oGet('/reconstruction/list', params);
}

/**
 * 获取任务详情与实时进度
 */
export function getReconstructionDetail(id) {
    return oGet(`/reconstruction/detail/${id}`);
}

/**
 * 获取底层 NodeODM 运行日志
 */
export function getReconstructionLogs(id, lines = 60) {
    return oGet(`/reconstruction/logs/${id}`, { lines });
}

/**
 * 手动取消正在进行的建模任务
 */
export function cancelReconstructionTask(id) {
    return oPost(`/reconstruction/cancel/${id}`);
}

/**
 * 删除任务记录与缓存
 */
export function deleteReconstructionTask(id) {
    return request.delete(`/reconstruction/${id}`);
}

/**
 * 上传无人机相片压缩包并创建建模任务（支持上传进度回调）
 * @param {FormData} formData
 * @param {Function} onProgress 上传进度回调 (0-100)
 */
export function uploadReconstructionZip(formData, onProgress) {
    return request.post('/reconstruction/upload-zip', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        timeout: 10 * 60 * 1000, // 允许大文件上传 10 分钟超时
        onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percent);
            }
        },
    });
}

/**
 * 获取实景三维建模 SSE 实时推送地址
 */
export function getReconstructionStreamUrl() {
    // 兼容环境变量配置基地址，与 axios 通道保持一致
    const base = import.meta.env.VITE_PROXY_DOMAIN || import.meta.env.VITE_APP_BASE_API || (import.meta.env.DEV ? 'http://127.0.0.1:3001/api' : '/api');
    return `${base.replace(/\/+$/, '')}/reconstruction/stream`;
}
