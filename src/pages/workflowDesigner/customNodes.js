// customNodes.js
import { h, RectNode, RectNodeModel, CircleNode, CircleNodeModel, DiamondNode, DiamondNodeModel } from '@logicflow/core';

/**
 * 纯函数：根据节点属性、全局审批状态以及当前暗黑模式，自适应计算节点填充色和边框色
 * @param {Object} properties - 节点 properties
 * @param {string|number} globalStatus - 流程全局审批状态 (1:进行中, 2:通过, 3:拒绝)
 * @param {boolean} [isDark] - 是否为暗黑模式 (默认自动从 document.documentElement 嗅探)
 * @returns {{ fill: string, stroke: string }}
 */
export function calculateNodeColors(properties = {}, globalStatus, isDark) {
    const dark = isDark ?? (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
    const status = properties?.nodeStatus ?? properties?.status;
    const title = properties?.nodeTitle ?? properties?.title;

    // 1. 特殊处理开始和结束节点
    if (title === '开始') {
        return dark
            ? { fill: '#064e3b', stroke: '#10b981' } // 暗黑：深邃翠绿 / 亮绿边框
            : { fill: '#d4edda', stroke: '#155724' }; // 亮色：浅绿 / 深绿边框
    }
    if (title === '结束') {
        if (globalStatus == 2) {
            return dark ? { fill: '#064e3b', stroke: '#10b981' } : { fill: '#c3e6cb', stroke: '#28a745' }; // 全部通过
        } else if (globalStatus == 3) {
            return dark ? { fill: '#450a0a', stroke: '#ef4444' } : { fill: '#f5c6cb', stroke: '#dc3545' }; // 驳回
        } else {
            return dark ? { fill: '#1e293b', stroke: '#64748b' } : { fill: '#ffffff', stroke: '#94a3b8' }; // 未完成
        }
    }

    // 2. 普通业务节点根据审批状态着色
    switch (status) {
        case '2':
        case 2: // 通过
            return dark ? { fill: '#064e3b', stroke: '#10b981' } : { fill: '#d4edda', stroke: '#155724' };
        case '3':
        case 3: // 驳回
            return dark ? { fill: '#450a0a', stroke: '#ef4444' } : { fill: '#f5c6cb', stroke: '#dc3545' };
        case '1':
        case 1: // 审批中
            return dark ? { fill: '#451a03', stroke: '#f59e0b' } : { fill: '#fff3cd', stroke: '#ffc107' };
        default: // 未开始 / 默认待审批节点
            return dark ? { fill: '#1e293b', stroke: '#475569' } : { fill: '#ffffff', stroke: '#cbd5e1' };
    }
}

/**
 * 注册所有自定义节点（纯函数，解耦闭包）
 * @param {LogicFlow} lf - LogicFlow 实例
 */
export function registerCustomNodes(lf) {
    // 1. 自定义开始节点 (start-node)
    class StartNodeModel extends CircleNodeModel {
        getNodeStyle() {
            const style = super.getNodeStyle();
            const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
            style.fill = dark ? '#064e3b' : '#d4edda';
            style.stroke = dark ? '#10b981' : '#155724';
            style.strokeWidth = 2;
            return style;
        }
        getTextStyle() {
            const style = super.getTextStyle();
            const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
            style.color = dark ? '#f1f5f9' : '#1e293b';
            return style;
        }
    }
    class StartNodeView extends CircleNode {}
    lf.register({
        type: 'start-node',
        view: StartNodeView,
        model: StartNodeModel,
    });

    // 2. 自定义结束节点 (end-node, BPMN 规范加粗边框)
    class EndNodeModel extends CircleNodeModel {
        getNodeStyle() {
            const style = super.getNodeStyle();
            const globalStatus = this.properties?.globalStatus;
            const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
            if (globalStatus == 2) {
                style.fill = dark ? '#064e3b' : '#c3e6cb';
                style.stroke = dark ? '#10b981' : '#28a745';
            } else if (globalStatus == 3) {
                style.fill = dark ? '#450a0a' : '#f5c6cb';
                style.stroke = dark ? '#ef4444' : '#dc3545';
            } else {
                style.fill = dark ? '#1e293b' : '#ffffff';
                style.stroke = dark ? '#64748b' : '#94a3b8';
            }
            style.strokeWidth = 3; // 结束事件经典粗边框
            return style;
        }
        getTextStyle() {
            const style = super.getTextStyle();
            const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
            style.color = dark ? '#f1f5f9' : '#1e293b';
            return style;
        }
    }
    class EndNodeView extends CircleNode {}
    lf.register({
        type: 'end-node',
        view: EndNodeView,
        model: EndNodeModel,
    });

    // 3. 自定义矩形节点 (人工审批节点)
    class CustomRectModel extends RectNodeModel {
        getNodeStyle() {
            const style = super.getNodeStyle();
            const { fill, stroke } = calculateNodeColors(this.properties, this.properties?.globalStatus);
            style.fill = fill;
            style.stroke = stroke;
            style.radius = 6;
            return style;
        }
        getTextStyle() {
            const style = super.getTextStyle();
            const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
            style.color = dark ? '#f1f5f9' : '#1e293b';
            return style;
        }
    }
    class CustomRectView extends RectNode {
        getShape() {
            const { model } = this.props;
            const { x, y, width, height, properties = {} } = model || {};
            const rectShape = super.getShape();
            const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

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
                    fill: dark ? (isAnd ? '#2b2650' : '#3e2a10') : (isAnd ? '#EEF2FF' : '#FEF3C7'),
                    stroke: dark ? (isAnd ? '#818cf8' : '#fbbf24') : (isAnd ? '#6366F1' : '#F59E0B'),
                    strokeWidth: 1,
                });

                const badgeText = h(
                    'text',
                    {
                        x: badgeX + badgeWidth / 2,
                        y: badgeY + 12,
                        textAnchor: 'middle',
                        fill: dark ? (isAnd ? '#c7d2fe' : '#fde68a') : (isAnd ? '#4338CA' : '#B45309'),
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
                    fill: dark ? '#334155' : '#F1F5F9',
                    stroke: dark ? '#475569' : '#CBD5E1',
                    strokeWidth: 1,
                });

                const badgeText = h(
                    'text',
                    {
                        x: badgeX + badgeWidth / 2,
                        y: badgeY + 12,
                        textAnchor: 'middle',
                        fill: dark ? '#e2e8f0' : '#475569',
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

    // 4. 自定义菱形节点 (排他条件网关)
    class CustomDiamondModel extends DiamondNodeModel {
        getNodeStyle() {
            const style = super.getNodeStyle();
            const { fill, stroke } = calculateNodeColors(this.properties, this.properties?.globalStatus);
            style.fill = fill;
            style.stroke = stroke;
            return style;
        }
        getTextStyle() {
            const style = super.getTextStyle();
            const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
            style.color = dark ? '#f1f5f9' : '#1e293b';
            return style;
        }
    }
    class CustomDiamondView extends DiamondNode {}
    lf.register({
        type: 'diamond',
        view: CustomDiamondView,
        model: CustomDiamondModel,
    });

    // 5. 自定义 AI 智能体审查节点 (ai-agent)
    class CustomAiAgentModel extends RectNodeModel {
        getNodeStyle() {
            const style = super.getNodeStyle();
            const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
            const calculated = calculateNodeColors(this.properties, this.properties?.globalStatus);
            style.fill = calculated.fill && calculated.fill !== '#ffffff' && calculated.fill !== '#1e293b'
                ? calculated.fill
                : (dark ? '#221938' : '#FAF5FF');
            style.stroke = calculated.stroke && calculated.stroke !== '#cbd5e1' && calculated.stroke !== '#475569'
                ? calculated.stroke
                : (dark ? '#a855f7' : '#9333EA');
            style.strokeWidth = 2;
            style.radius = 8;
            return style;
        }
        getTextStyle() {
            const style = super.getTextStyle();
            const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
            style.color = dark ? '#f1f5f9' : '#1e293b';
            return style;
        }
    }
    class CustomAiAgentView extends RectNode {
        getShape() {
            const { model } = this.props;
            const { x, y, width, height, properties } = model;
            const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
            const roleName = properties?.agentRoleName || '🤖 AI审查';

            const rectShape = super.getShape();

            const badgeBg = h('rect', {
                x: x - width / 2 + 6,
                y: y - height / 2 + 4,
                width: 58,
                height: 16,
                rx: 3,
                ry: 3,
                fill: dark ? '#7c3aed' : '#9333EA',
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
                    fill: dark ? '#d8b4fe' : '#6B21A8',
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
