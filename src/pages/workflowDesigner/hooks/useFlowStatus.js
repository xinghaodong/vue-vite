// useFlowStatus.js
import { calculateNodeColors } from '../customNodes.js';

/**
 * 流程审批状态回显与连线流光动画 Hook
 */
export function useFlowStatus() {
    /**
     * 将审批历史数据注入画布节点，并智能点亮正在流转中的边动画
     * @param {LogicFlow} lf - LogicFlow 实例
     * @param {Object} approvalHistory - 审批历史数据 (包含 status, steps)
     */
    const injectApprovalStatus = (lf, approvalHistory) => {
        if (!lf || !approvalHistory) return;

        const globalStatus = approvalHistory.status; // 1: 审批中, 2: 已通过, 3: 已驳回
        const steps = approvalHistory.steps || [];

        // 1. 设置画布全局属性
        try {
            lf.setProperties({ globalStatus });
        } catch (e) {
            // ignore
        }

        // 收集各节点状态与当前激活节点
        const nodeStatusMap = new Map();
        let activeNodeId = null;

        steps.forEach(step => {
            const { nodeId, status, title, userName, comment } = step;
            if (!nodeId) return;

            nodeStatusMap.set(nodeId, status);
            if (String(status) === '1') {
                activeNodeId = nodeId; // 当前审批中的节点
            }

            try {
                // 关键：只更新 properties，由节点自身的 Model 自驱着色
                lf.setProperties(nodeId, {
                    nodeStatus: status,
                    nodeTitle: title,
                    assigneeName: userName || '',
                    comment: comment || '',
                    globalStatus: globalStatus,
                });
            } catch (error) {
                console.warn(`[useFlowStatus] 节点 ${nodeId} 属性注入失败:`, error.message);
            }
        });

        // 2. 智能点亮当前审批中的连线动画（流光动效）
        try {
            const graphData = lf.getGraphRawData ? lf.getGraphRawData() : lf.getGraphData();
            const edges = graphData.edges || [];

            edges.forEach(edge => {
                // 如果边的目标节点正好是当前正在审批中的节点（或来源是已通过节点流向待审批节点）
                const isTargetActive = edge.targetNodeId === activeNodeId;
                const sourceStatus = nodeStatusMap.get(edge.sourceNodeId);
                const isRunningEdge = isTargetActive || (String(sourceStatus) === '2' && isTargetActive);

                if (isRunningEdge && String(globalStatus) === '1') {
                    // 🌟 开启流光动画
                    lf.openEdgeAnimation(edge.id);
                } else {
                    lf.closeEdgeAnimation(edge.id);
                }
            });
        } catch (e) {
            console.warn('[useFlowStatus] 连线动画设置失败:', e);
        }
    };

    return {
        injectApprovalStatus,
        calculateNodeColors,
    };
}
