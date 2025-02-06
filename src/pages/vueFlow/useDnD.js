import { useVueFlow } from '@vue-flow/core';
import { ref, watch } from 'vue';

let id = 1;
function getNodeId() {
    return `${id++}`;
}

/**
 * In a real world scenario you'd want to avoid creating refs in a global scope like this as they might not be cleaned up properly.
 * @type {{draggedType: Ref<string|null>, isDragOver: Ref<boolean>, isDragging: Ref<boolean>}}
 */
const state = {
    /**
     * The type of the node being dragged.
     */
    draggedType: ref(null),
    isDragOver: ref(false),
    isDragging: ref(false),
    nodeData: ref(null),
};

export default function useDragAndDrop() {
    const { draggedType, isDragOver, isDragging, nodeData } = state;

    const { addNodes, screenToFlowCoordinate, onNodesInitialized, updateNode, toObject } = useVueFlow();

    watch(isDragging, dragging => {
        document.body.style.userSelect = dragging ? 'none' : '';
    });

    function saveData(data) {
        // console.log(data, api.addFlowChart(toObject()), '保存', toObject());
        // 调用接口

        return toObject();
    }

    function onDragStart(event, type) {
        console.log(event, type);
        if (event.dataTransfer) {
            event.dataTransfer.setData('application/vueflow', type);
            event.dataTransfer.effectAllowed = 'move';
        }

        draggedType.value = type;
        isDragging.value = true;

        document.addEventListener('drop', onDragEnd);
    }

    /**
     * Handles the drag over event.
     *
     * @param {DragEvent} event
     */
    function onDragOver(event) {
        event.preventDefault();

        if (draggedType.value) {
            isDragOver.value = true;

            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = 'move';
            }
        }
        console.log(draggedType.value, 'onDragOver');
    }

    function onDragLeave() {
        isDragOver.value = false;
    }

    function onDragEnd() {
        isDragging.value = false;
        isDragOver.value = false;
        draggedType.value = null;
        document.removeEventListener('drop', onDragEnd);
        console.log(isDragOver.value, draggedType.value, 'onDragEnd');
    }

    /**
     * Handles the drop event.
     *
     * @param {DragEvent} event
     */
    function onDrop(event) {
        const position = screenToFlowCoordinate({
            x: event.clientX,
            y: event.clientY,
        });

        const nodeId = getNodeId();

        const newNode = {
            id: nodeId,
            data: {
                label: `节点${nodeId}`,
            },
            type: draggedType.value,
            position,
        };

        /**
         * Align node position after drop, so it's centered to the mouse
         *
         * We can hook into events even in a callback, and we can remove the event listener after it's been called.
         */
        const { off } = onNodesInitialized(() => {
            updateNode(nodeId, node => ({
                position: { x: node.position.x - node.dimensions.width / 2, y: node.position.y - node.dimensions.height / 2 },
            }));

            off();
        });
        console.log(newNode, 'onDropssss');
        addNodes(newNode);
        nodeData.value = newNode;
        // nodeDat pu
    }

    return {
        draggedType,
        isDragOver,
        isDragging,
        onDragStart,
        onDragLeave,
        onDragOver,
        onDrop,
        saveData,
    };
}
