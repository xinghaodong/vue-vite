/**
 * ========================================================================
 * 文件名称: useReconstructionStream.js
 * 所属模块: 组合式 API (src/composables)
 * 功能说明:
 *   实景三维建模任务 SSE (Server-Sent Events) 全局单例按需状态机：
 *   1. 【模块单例模式】：利用 ES Module 作用域常驻共享唯一的 EventSource 实例与响应式状态；
 *   2. 【智能按需启闭 (Smart Lifecycle)】：
 *      - 仅在「处于列表管理页 (subscriberCount > 0)」或「存在进行中任务 (activeTaskCount > 0)」时激活连接；
 *      - 所有任务均完成且已离开管理页时，延迟优雅断开连接，实现真正意义上的「平时 0 资源开销」；
 *   3. 【全局跨页面完成通知】：无论用户切换至哪个路由界面，任务一旦成功生成 3D Tiles，
 *      均能触发全局 ElNotification 桌面级弹窗提醒，并提供一键漫游入口。
 * ========================================================================
 */

import { ref, computed } from 'vue';
import { ElNotification, ElButton } from 'element-plus';
import { h } from 'vue';
import router from '@/router';
import { getReconstructionStreamUrl, getReconstructionList } from '@/api/reconstruction';

// -----------------------------------------------------------------------------
// 全局单例作用域（定义在导出的函数外部，所有调用的组件共享同一闭包引用）
// -----------------------------------------------------------------------------
let eventSource = null;
let disconnectTimer = null;

// 响应式状态
const isSseConnected = ref(false);
const activeTaskIds = ref(new Set()); // 正在执行中的任务 ID 集合
const subscriberCallbacks = new Set(); // 外部组件订阅回调集合
const subscriberCount = ref(0); // 当前活跃订阅组件数 (如处于 reconstructionList 页面)
const lastEvent = ref(null);

// 是否有活跃任务正在跑
const hasActiveTasks = computed(() => activeTaskIds.value.size > 0);

/**
 * 判定状态是否属于正在计算的生命周期
 */
const isTaskWorking = (status) => {
    return status === 'PENDING' || status === 'EXTRACTING' || status === 'UPLOADING' || status === 'PROCESSING';
};

/**
 * 建立/确保 SSE 长连接
 */
const ensureConnection = () => {
    // 若已有断开延迟定时器，立即取消（避免即将断开时又有新任务进来）
    if (disconnectTimer) {
        clearTimeout(disconnectTimer);
        disconnectTimer = null;
    }

    // 若已经处于连接状态，直接复用
    if (eventSource && (eventSource.readyState === EventSource.OPEN || eventSource.readyState === EventSource.CONNECTING)) {
        return;
    }

    const streamUrl = getReconstructionStreamUrl();
    console.log('[SSE 全局单例] 正在激活实时长连接:', streamUrl);

    try {
        eventSource = new EventSource(streamUrl);

        eventSource.onopen = () => {
            console.log('✔ [SSE 全局单例] 通道已建立，当前进行中任务数:', activeTaskIds.value.size);
            isSseConnected.value = true;
        };

        eventSource.onmessage = (event) => {
            try {
                if (!event.data) return;
                const payload = JSON.parse(event.data);
                handleGlobalMessage(payload);
            } catch (err) {
                console.warn('[SSE 全局单例] 消息解析异常:', err);
            }
        };

        eventSource.onerror = (err) => {
            console.warn('[SSE 全局单例] 网络抖动，浏览器正在尝试自动重连...', err);
            isSseConnected.value = false;
        };
    } catch (err) {
        console.error('[SSE 全局单例] 启动失败:', err);
        isSseConnected.value = false;
    }
};

/**
 * 优雅断开连接（带缓冲倒计时，防止最后一条完成消息尚未消费完毕）
 */
const gracefulDisconnect = (delay = 4000) => {
    if (disconnectTimer) return;

    disconnectTimer = setTimeout(() => {
        disconnectTimer = null;
        // 双重校验：依然没有订阅者 且 依然没有运行中任务
        if (subscriberCount.value === 0 && activeTaskIds.value.size === 0) {
            console.log('[SSE 全局单例] 任务均已完成且无活跃页面订阅，自动关闭连接以释放资源。');
            immediateClose();
        }
    }, delay);
};

/**
 * 立即关闭连接
 */
const immediateClose = () => {
    if (eventSource) {
        eventSource.close();
        eventSource = null;
    }
    isSseConnected.value = false;
};

/**
 * 处理服务端广播的业务消息
 */
const handleGlobalMessage = (payload) => {
    const { type, data } = payload || {};
    if (!type || type === 'ping') return;

    lastEvent.value = payload;

    // 1. 维护正在执行中的任务状态机
    if (type === 'task_created') {
        if (data?.id) activeTaskIds.value.add(data.id);
    } else if (type === 'task_updated') {
        if (data?.id && !isTaskWorking(data.status)) {
            activeTaskIds.value.delete(data.id);
        } else if (data?.id && isTaskWorking(data.status)) {
            activeTaskIds.value.add(data.id);
        }
    } else if (type === 'task_completed') {
        if (data?.id) activeTaskIds.value.delete(data.id);

        // 全局桌面级完成通知（带一键漫游动作）
        showGlobalSuccessNotification(data);
    } else if (type === 'task_failed') {
        if (data?.id) activeTaskIds.value.delete(data.id);

        ElNotification.error({
            title: '实景三维建模异常',
            message: `任务【${data.name || data.id}】执行失败: ${data.errorMessage || data.stage || '未知错误'}`,
            duration: 8000,
            position: 'top-right',
        });
    } else if (type === 'task_deleted') {
        if (data?.id) activeTaskIds.value.delete(data.id);
    }

    // 2. 将消息分发给当前所有活跃订阅组件（如 reconstructionList）
    subscriberCallbacks.forEach((cb) => {
        try {
            cb(payload);
        } catch (cbErr) {
            console.error('[SSE 全局单例] 订阅者处理异常:', cbErr);
        }
    });

    // 3. 检查是否需要自动省电断开
    if (subscriberCount.value === 0 && activeTaskIds.value.size === 0) {
        gracefulDisconnect();
    }
};

/**
 * 弹出全局建模成功通知 (无论处于哪个页面)
 */
const showGlobalSuccessNotification = (taskData) => {
    ElNotification.success({
        title: '🎉 实景三维建模完成！',
        message: h('div', { class: 'global-task-notify' }, [
            h('p', { style: 'margin: 0 0 8px 0; font-size: 13px;' }, `任务【${taskData.name}】已成功生成 3D Tiles 模型！`),
            taskData.tilesetUrl
                ? h(
                      ElButton,
                      {
                          type: 'primary',
                          size: 'small',
                          style: 'margin-top: 4px;',
                          onClick: () => {
                              const routeData = router.resolve({
                                  path: '/newcesium',
                                  query: {
                                      modelUrl: taskData.tilesetUrl,
                                      modelName: taskData.name,
                                      token: sessionStorage.getItem('token') || '',
                                  },
                              });
                              window.open(routeData.href, '_blank');
                          },
                      },
                      () => '立即三维漫游'
                  )
                : null,
        ]),
        duration: 9000,
        position: 'top-right',
    });
};

/**
 * 导出组合式 Hook: useReconstructionStream
 */
export function useReconstructionStream() {
    /**
     * 订阅实时推送消息 (组件级接入)
     * @param {Function} callback (eventPayload) => void
     * @returns {Function} 取消订阅函数
     */
    const subscribe = (callback) => {
        if (typeof callback === 'function') {
            subscriberCallbacks.add(callback);
        }
        subscriberCount.value++;

        // 有页面进入监听，激活长连接
        ensureConnection();

        return () => {
            if (typeof callback === 'function') {
                subscriberCallbacks.delete(callback);
            }
            subscriberCount.value = Math.max(0, subscriberCount.value - 1);

            // 若无订阅者且无运行中任务，优雅断连
            if (subscriberCount.value === 0 && activeTaskIds.value.size === 0) {
                gracefulDisconnect();
            }
        };
    };

    /**
     * 根据传入的任务列表同步活跃任务集合
     * 页面加载完成或分页拉取数据后可调用
     */
    const syncActiveTasks = (taskList = []) => {
        if (!Array.isArray(taskList)) return;

        let foundWorking = false;
        taskList.forEach((task) => {
            if (task?.id && isTaskWorking(task.status)) {
                activeTaskIds.value.add(task.id);
                foundWorking = true;
            } else if (task?.id && !isTaskWorking(task.status)) {
                activeTaskIds.value.delete(task.id);
            }
        });

        if (foundWorking) {
            ensureConnection();
        } else if (subscriberCount.value === 0 && activeTaskIds.value.size === 0) {
            gracefulDisconnect();
        }
    };

    /**
     * 标记新创建了一个任务（提交上传后立即调用，确保即时保活）
     */
    const notifyTaskCreated = (taskId) => {
        if (taskId) {
            activeTaskIds.value.add(taskId);
            ensureConnection();
        }
    };

    /**
     * 全局启动检查：检查后台是否有未完成任务（可在系统 Layout 装载时静默调用一次）
     */
    const checkBackgroundTasks = async () => {
        try {
            const res = await getReconstructionList({ page: 1, pageSize: 20 });
            const list = res?.data?.list || res?.list || [];
            syncActiveTasks(list);
        } catch (e) {
            // 静默处理，不影响主流程
        }
    };

    return {
        // 状态
        isSseConnected,
        hasActiveTasks,
        activeTaskCount: computed(() => activeTaskIds.value.size),
        lastEvent,
        // 方法
        subscribe,
        syncActiveTasks,
        notifyTaskCreated,
        checkBackgroundTasks,
        ensureConnection,
        immediateClose,
    };
}
