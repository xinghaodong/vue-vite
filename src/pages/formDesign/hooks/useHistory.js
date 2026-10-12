/**
 * ========================================================================
 * 文件名称: useHistory.js
 * 所属模块: 动态表单设计器 - 画布历史记录管理 (hooks)
 * 功能说明:
 *   提供大厂工业级“撤销/重做（Undo/Redo）”双指针快照栈与快捷键机制：
 *   1. 双指针快照存储：支持最大步数限制（防内存泄漏）与分支截断裁剪；
 *   2. 防抖输入合并：属性面板连续文本输入自动聚合为单次快照；
 *   3. 状态互斥锁保护：Undo/Redo 恢复期间自动闭锁，防止 watch 递归死锁；
 *   4. 还原安全回调：通知设计器恢复 formItems 并自动纠正当前选中项引用。
 * ========================================================================
 */
import { ref, computed, nextTick } from 'vue';

export function useHistory(options = {}) {
    const {
        maxSteps = 30,
        onRestore = null, // 恢复时的回调函数 (snapshot) => void
    } = options;

    const historyStack = ref([]);
    const currentIndex = ref(-1);
    let isNavigating = false;
    let debounceTimer = null;

    // 响应式判断是否允许撤销/重做
    const canUndo = computed(() => currentIndex.value > 0);
    const canRedo = computed(() => currentIndex.value >= 0 && currentIndex.value < historyStack.value.length - 1);

    /**
     * 记录快照
     * @param {Object} snapshotData 要记录的状态纯净数据对象
     * @param {boolean} immediate 是否立即记录（跳过防抖，用于拖拽松手、删除、复制等结构性操作）
     */
    const recordSnapshot = (snapshotData, immediate = false) => {
        if (isNavigating || !snapshotData) return;

        const doRecord = () => {
            if (isNavigating) return;
            const serialized = JSON.stringify(snapshotData);

            // 若与当前指针快照内容完全一致，避免冗余压栈
            if (currentIndex.value >= 0 && historyStack.value[currentIndex.value] === serialized) {
                return;
            }

            // 🌟 剪枝：若游标在中间位置执行了新操作，丢弃游标后的重做栈
            if (currentIndex.value < historyStack.value.length - 1) {
                historyStack.value = historyStack.value.slice(0, currentIndex.value + 1);
            }

            historyStack.value.push(serialized);

            // 🌟 超出最大步数时从头部裁剪，保护内存
            if (historyStack.value.length > maxSteps) {
                historyStack.value.shift();
            }

            currentIndex.value = historyStack.value.length - 1;
        };

        clearTimeout(debounceTimer);
        if (immediate) {
            doRecord();
        } else {
            debounceTimer = setTimeout(doRecord, 300);
        }
    };

    /**
     * 重置并初始化历史栈 (通常在页面加载完已有 Schema 时调用)
     * @param {Object} initialData 
     */
    const initHistory = (initialData) => {
        clearTimeout(debounceTimer);
        isNavigating = false;
        historyStack.value = [JSON.stringify(initialData)];
        currentIndex.value = 0;
    };

    /**
     * 执行撤销 (Undo)
     */
    const undo = async () => {
        if (!canUndo.value || isNavigating) return;
        clearTimeout(debounceTimer);
        isNavigating = true;

        currentIndex.value--;
        const snapshot = JSON.parse(historyStack.value[currentIndex.value]);

        if (typeof onRestore === 'function') {
            await onRestore(snapshot);
        }

        await nextTick();
        setTimeout(() => {
            isNavigating = false;
        }, 60);
    };

    /**
     * 执行重做 (Redo)
     */
    const redo = async () => {
        if (!canRedo.value || isNavigating) return;
        clearTimeout(debounceTimer);
        isNavigating = true;

        currentIndex.value++;
        const snapshot = JSON.parse(historyStack.value[currentIndex.value]);

        if (typeof onRestore === 'function') {
            await onRestore(snapshot);
        }

        await nextTick();
        setTimeout(() => {
            isNavigating = false;
        }, 60);
    };

    return {
        canUndo,
        canRedo,
        undo,
        redo,
        recordSnapshot,
        initHistory,
        historyStack,
        currentIndex,
    };
}
