// customNodes.js
import { h, RectNode, RectNodeModel, CircleNode, CircleNodeModel, DiamondNode, DiamondNodeModel } from '@logicflow/core';

/**
 * 纯函数：根据节点属性和全局审批状态计算节点填充色和边框色
 * @param {Object} properties - 节点 properties
 * @param {string|number} globalStatus - 流程全局审批状态 (1:进行中, 2:通过, 3:拒绝)
 * @returns {{ fill: string, stroke: string }}
 */
export function calculateNodeColors(properties = {}, globalStatus) {
    const status = properties?.nodeStatus ?? properties?.status;
    const title = properties?.nodeTitle ?? properties?.title;

    // 1. 特殊处理开始和结束节点
    if (title === '开始') {
        return { fill: '#d4edda', stroke: '#155724' }; // 浅绿 / 深绿
    }
    if (title === '结束') {
        if (globalStatus == 2) {
            return { fill: '#c3e6cb', stroke: '#28a745' }; // 全部通过 - 绿
        } else if (globalStatus == 3) {
            return { fill: '#f5c6cb', stroke: '#dc3545' }; // 拒绝 - 红
        } else {
            return { fill: '#ffffff', stroke: '#000000' }; // 未完成 - 白底黑边
        }
    }

    // 2. 普通业务节点根据审批状态着色
    switch (status) {
        case '2':
        case 2: // 通过
            return { fill: '#d4edda', stroke: '#155724' };
        case '3':
        case 3: // 驳回
            return { fill: '#f5c6cb', stroke: '#dc3545' };
        case '1':
        case 1: // 审批中
            return { fill: '#fff3cd', stroke: '#ffc107' };
        default: // 未开始 / 默认
            return { fill: '#ffffff', stroke: '#000000' };
    }
}

/**
 * 注册所有自定义节点（纯函数，解耦闭包）
 * @param {LogicFlow} lf - LogicFlow 实例
 */
export function registerCustomNodes(lf) {
    // 1. 自定义圆形节点 (开始 / 结束)
    class CustomCircleModel extends CircleNodeModel {
        getNodeStyle() {
            const style = super.getNodeStyle();
            const { fill, stroke } = calculateNodeColors(this.properties, this.properties?.globalStatus);
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

    // 2. 自定义矩形节点 (人工审批节点)
    class CustomRectModel extends RectNodeModel {
        getNodeStyle() {
            const style = super.getNodeStyle();
            const { fill, stroke } = calculateNodeColors(this.properties, this.properties?.globalStatus);
            style.fill = fill;
            style.stroke = stroke;
            return style;
        }
    }
    class CustomRectView extends RectNode {
        getShape() {
            const { model } = this.props;
            const { x, y, width, height, properties = {} } = model || {};
            const rectShape = super.getShape();

            const assignees = properties?.assignees || [];
            const mode = properties?.approvalMode || 'or';
            const children = [rectShape];

            // 1. 若配置了多位审批人，在右上角渲染高质感 [会签] / [或签] 胶囊徽章
            if (Array.isArray(assignees) && assignees.length > 1) {
                const isAnd = mode === 'and';
                const badgeWidth = 68;
                const badgeHeight = 16;
                const badgeX = x + width / 2 - badgeWidth - 6;
                const badgeY = y - height / 2 + 5;

                const badgeBg = h('rect', {
                    x: badgeX,
                    y: badgeY,
                    width: badgeWidth,
                    height: badgeHeight,
                    rx: 8,
                    ry: 8,
                    fill: isAnd ? '#EEF2FF' : '#FEF3C7',
                    stroke: isAnd ? '#6366F1' : '#F59E0B',
                    strokeWidth: 1,
                });

                const badgeText = h(
                    'text',
                    {
                        x: badgeX + badgeWidth / 2,
                        y: badgeY + 12,
                        textAnchor: 'middle',
                        fill: isAnd ? '#4338CA' : '#B45309',
                        fontSize: 10,
                        fontWeight: '600',
                    },
                    isAnd ? `会签 · ${assignees.length}人` : `或签 · ${assignees.length}人`,
                );

                children.push(badgeBg, badgeText);
            } else if (properties?.assigneeName) {
                // 2. 单审批人且已指定姓名时，右上角展示小巧人名标签
                const rawName = String(properties.assigneeName);
                const name = rawName.length > 4 ? rawName.slice(0, 4) + '..' : rawName;
                const badgeWidth = 56;
                const badgeHeight = 16;
                const badgeX = x + width / 2 - badgeWidth - 6;
                const badgeY = y - height / 2 + 5;

                const badgeBg = h('rect', {
                    x: badgeX,
                    y: badgeY,
                    width: badgeWidth,
                    height: badgeHeight,
                    rx: 8,
                    ry: 8,
                    fill: '#F1F5F9',
                    stroke: '#CBD5E1',
                    strokeWidth: 1,
                });

                const badgeText = h(
                    'text',
                    {
                        x: badgeX + badgeWidth / 2,
                        y: badgeY + 12,
                        textAnchor: 'middle',
                        fill: '#475569',
                        fontSize: 10,
                    },
                    name,
                );

                children.push(badgeBg, badgeText);
            }

            return h('g', {}, children);
        }
    }
    lf.register({
        type: 'rect',
        view: CustomRectView,
        model: CustomRectModel,
    });

    // 3. 自定义菱形节点 (排他条件网关)
    class CustomDiamondModel extends DiamondNodeModel {
        getNodeStyle() {
            const style = super.getNodeStyle();
            const { fill, stroke } = calculateNodeColors(this.properties, this.properties?.globalStatus);
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

    // 4. 自定义 AI 智能体审查节点 (ai-agent)
    class CustomAiAgentModel extends RectNodeModel {
        getNodeStyle() {
            const style = super.getNodeStyle();
            const calculated = calculateNodeColors(this.properties, this.properties?.globalStatus);
            style.fill = calculated.fill && calculated.fill !== '#ffffff' ? calculated.fill : '#FAF5FF';
            style.stroke = calculated.stroke && calculated.stroke !== '#000000' ? calculated.stroke : '#9333EA';
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
