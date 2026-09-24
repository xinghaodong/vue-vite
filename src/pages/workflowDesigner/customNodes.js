// customNodes.js
import { h, RectNode, RectNodeModel, CircleNode, CircleNodeModel, DiamondNode, DiamondNodeModel } from '@logicflow/core';

/**
 * 创建并注册所有自定义节点
 * @param {LogicFlow} lf - LogicFlow 实例
 * @param {Function} calculateNodeColors - 颜色计算函数
 * @param {Object} approvalHistoryData - 全局审批数据的 ref（传入 .value 可响应）
 */
export function registerCustomNodes(lf, calculateNodeColors, approvalHistoryData) {
    // 自定义圆形节点
    class CustomCircleModel extends CircleNodeModel {
        getNodeStyle() {
            const style = super.getNodeStyle();
            const { fill, stroke } = calculateNodeColors(this.properties, approvalHistoryData.value?.status);
            style.fill = fill;
            style.stroke = stroke;
            return style;
        }
    }
    class CustomCircleView extends CircleNode {}
    lf.register({
        type: 'circle',
        view: CustomCircleView,
        model: CustomCircleModel,
    });

    // 自定义矩形节点
    class CustomRectModel extends RectNodeModel {
        getNodeStyle() {
            const style = super.getNodeStyle();
            const { fill, stroke } = calculateNodeColors(this.properties, approvalHistoryData.value?.status);
            style.fill = fill;
            style.stroke = stroke;
            return style;
        }
    }
    class CustomRectView extends RectNode {
        getShape() {
            const { model } = this.props;
            const { x, y, width, height, properties } = model;
            const assigneeName = properties?.assigneeName || properties?.userName || '未指定';

            const rectShape = super.getShape();

            const textShape = h(
                'text',
                {
                    x: x - width / 2 + 5,
                    y: y - height / 2 + 14,
                    fill: '#000',
                    fontSize: 13,
                },
                assigneeName,
            );

            return h('g', {}, [rectShape, textShape]);
        }
    }
    lf.register({
        type: 'rect',
        view: CustomRectView,
        model: CustomRectModel,
    });

    // 自定义菱形节点
    class CustomDiamondModel extends DiamondNodeModel {
        getNodeStyle() {
            const style = super.getNodeStyle();
            const { fill, stroke } = calculateNodeColors(this.properties, approvalHistoryData.value?.status);
            style.fill = fill;
            style.stroke = stroke;
            return style;
        }
    }
    class CustomDiamondView extends DiamondNode {}
    lf.register({
        type: 'diamond',
        view: CustomDiamondView,
        model: CustomDiamondModel,
    });

    // 自定义 AI 智能体节点 (ai-agent)
    class CustomAiAgentModel extends RectNodeModel {
        getNodeStyle() {
            const style = super.getNodeStyle();
            const calculated = calculateNodeColors(this.properties, approvalHistoryData.value?.status);
            style.fill = calculated.fill && calculated.fill !== '#fff' ? calculated.fill : '#FAF5FF';
            style.stroke = calculated.stroke && calculated.stroke !== '#000' ? calculated.stroke : '#9333EA';
            style.strokeWidth = 2;
            style.radius = 8;
            return style;
        }
    }
    class CustomAiAgentView extends RectNode {
        getShape() {
            const { model } = this.props;
            const { x, y, width, height, properties } = model;
            const roleName = properties?.agentRoleName || '🤖 AI审查';

            const rectShape = super.getShape();

            const badgeBg = h('rect', {
                x: x - width / 2 + 6,
                y: y - height / 2 + 4,
                width: 58,
                height: 16,
                rx: 3,
                ry: 3,
                fill: '#9333EA',
            });

            const badgeText = h(
                'text',
                {
                    x: x - width / 2 + 10,
                    y: y - height / 2 + 15,
                    fill: '#FFFFFF',
                    fontSize: 10,
                    fontWeight: 'bold',
                },
                'AI Agent',
            );

            const roleText = h(
                'text',
                {
                    x: x - width / 2 + 70,
                    y: y - height / 2 + 16,
                    fill: '#6B21A8',
                    fontSize: 12,
                    fontWeight: 'bold',
                },
                roleName,
            );

            return h('g', {}, [rectShape, badgeBg, badgeText, roleText]);
        }
    }
    lf.register({
        type: 'ai-agent',
        view: CustomAiAgentView,
        model: CustomAiAgentModel,
    });
}
