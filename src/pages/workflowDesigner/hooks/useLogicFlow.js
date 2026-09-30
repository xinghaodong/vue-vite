// useLogicFlow.js
import { ref, shallowRef, onBeforeUnmount, unref } from 'vue';
import LogicFlow from '@logicflow/core';
import { DndPanel, SelectionSelect, Menu, Control } from '@logicflow/extension';
import '@logicflow/core/lib/style/index.css';
import '@logicflow/extension/lib/style/index.css';

/**
 * 连线类型常量定义
 */
export const EDGE_TYPES = [
    { label: '贝塞尔曲线 (平滑)', value: 'bezier' },
    { label: '直角折线 (标准)', value: 'polyline' },
    { label: '直线 (简洁)', value: 'line' },
];

/**
 * LogicFlow 核心实例生命周期与画布管理 Hook
 * @param {Object} options - 初始化配置项
 * @param {string} options.defaultEdgeType - 默认连线类型，支持 'bezier' | 'polyline' | 'line'，默认 'bezier'
 * @param {boolean} options.grid - 是否开启网格，默认 true
 * @param {Object} options.background - 背景配置
 */
export function useLogicFlow(options = {}) {
    // 画布 DOM 容器引用
    const containerRef = ref(null);
    // LogicFlow 实例（使用 shallowRef 避免 Vue 深度代理破坏 LF 内部事件与私有属性）
    const lf = shallowRef(null);
    // 动态连线类型（响应式，外部可读写）
    const currentEdgeType = ref(options.defaultEdgeType || 'bezier');

    /**
     * 动态修改默认连线类型（对后续新建连线生效，可联动现有连线）
     * @param {'bezier' | 'polyline' | 'line' | string} type
     * @param {boolean} changeExisting - 是否同步更新画布上已有连线的类型，默认 false
     */
    const setEdgeType = (type, changeExisting = false) => {
        if (!type) return;
        currentEdgeType.value = type;
        if (lf.value) {
            // LogicFlow 官方 API：设置后续新建连线的默认类型
            lf.value.setDefaultEdgeType(type);

            // 如果需要将当前画布上所有连线也一并转换类型
            if (changeExisting) {
                const rawData = lf.value.getGraphRawData ? lf.value.getGraphRawData() : lf.value.getGraphData();
                const edges = rawData?.edges || [];
                edges.forEach(edge => {
                    try {
                        lf.value.changeEdgeType(edge.id, type);
                    } catch (e) {
                        console.warn(`[useLogicFlow] 转换连线 ${edge.id} 为 ${type} 失败:`, e);
                    }
                });
            }
        }
    };

    /**
     * 初始化 LogicFlow 画布
     * @param {Object} customOptions - 自定义覆盖配置项
     * @returns {LogicFlow|null}
     */
    const createLogicFlow = (customOptions = {}) => {
        const container = unref(containerRef);
        if (!container) {
            console.warn('[useLogicFlow] 容器 DOM 尚未挂载，初始化中止');
            return null;
        }

        // 如果已有实例先安全销毁，防止重复挂载
        if (lf.value) {
            try {
                lf.value.destroy();
            } catch (e) {
                console.error('[useLogicFlow] 销毁前序实例异常:', e);
            }
            lf.value = null;
        }

        // 实例化 LogicFlow
        const instance = new LogicFlow({
            container,
            edgeType: currentEdgeType.value, // 🌟 活的 edgeType，响应式配置
            grid: options.grid ?? true,
            background: options.background || { color: '#f8f9fa' },
            keyboard: { enabled: true },
            plugins: [DndPanel, SelectionSelect, Menu, Control],
            // 🌟 开启边动画支持（官方规范：animation: { edge: true }）
            animation: {
                edge: true,
            },
            ...customOptions,
        });

        lf.value = instance;
        return instance;
    };

    /**
     * 开启指定连线的流光动画（按需流转点亮）
     * @param {string} edgeId
     */
    const openEdgeAnimation = (edgeId) => {
        if (!lf.value || !edgeId) return;
        try {
            lf.value.openEdgeAnimation(edgeId);
        } catch (e) {
            console.warn(`[useLogicFlow] 开启边 ${edgeId} 动画失败:`, e);
        }
    };

    /**
     * 关闭指定连线的流光动画
     * @param {string} edgeId
     */
    const closeEdgeAnimation = (edgeId) => {
        if (!lf.value || !edgeId) return;
        try {
            lf.value.closeEdgeAnimation(edgeId);
        } catch (e) {
            console.warn(`[useLogicFlow] 关闭边 ${edgeId} 动画失败:`, e);
        }
    };

    /**
     * 安全销毁 LogicFlow 实例，释放 DOM 和监听器
     */
    const destroyLogicFlow = () => {
        if (lf.value) {
            try {
                lf.value.destroy();
            } catch (e) {
                console.error('[useLogicFlow] 销毁实例异常:', e);
            }
            lf.value = null;
        }
    };

    // 组件卸载时自动销毁，防止 SPA 内存泄漏
    onBeforeUnmount(() => {
        destroyLogicFlow();
    });

    return {
        containerRef,
        lf,
        currentEdgeType,
        setEdgeType,
        createLogicFlow,
        destroyLogicFlow,
        openEdgeAnimation,
        closeEdgeAnimation,
    };
}
