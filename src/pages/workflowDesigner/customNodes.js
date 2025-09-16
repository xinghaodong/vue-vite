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
}
