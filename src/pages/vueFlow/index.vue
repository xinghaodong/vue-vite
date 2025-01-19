<template>
    <div class="dnd-flow" @drop="onDrop">
        <VueFlow @nodeClick="onNodeClick" :nodes="nodes" :edges="edges" :zoom="zoom" @dragover="onDragOver" @dragleave="onDragLeave">
            <DropzoneBackground
                :style="{
                    backgroundColor: isDragOver ? '#e7f3ff' : 'transparent',
                    transition: 'background-color 0.2s ease',
                }"
            >
            </DropzoneBackground>
        </VueFlow>
        <Sidebar />
    </div>
</template>
<script setup>
import { ref, onMounted, getCurrentInstance } from 'vue';
import { VueFlow, useVueFlow } from '@vue-flow/core';
import DropzoneBackground from './DropzoneBackground.vue';
import Sidebar from './Sidebar.vue';
import useDragAndDrop from './useDnD.js';
import { useRoute } from 'vue-router';
const { onConnect, addEdges } = useVueFlow();

const { onDragOver, onDrop, onDragLeave, isDragOver } = useDragAndDrop();
const { proxy } = getCurrentInstance();
// 接受路由参数
const route = useRoute();
// 初始化数据 调用接口
const nodes = ref([]);
const edges = ref([]);
const zoom = ref(1);
const obj = ref({});

// 初始化数据 调用接口

// const queryobj = JSON.parse(route.query.obj);
// const { nodes, edges, zoom } = useVueFlow({
//     nodes: queryobj.nodes,
//     edges: queryobj.edges,
//     zoom: queryobj.zoom,
// });
// console.log(queryobj, 'queryobj', nodes);
onConnect(addEdges);
onMounted(() => {
    if (route.query.id) {
        proxy.$api
            .detailFlowChart({
                id: route.query.id,
            })
            .then(res => {
                nodes.value = res.data.nodes;
                edges.value = res.data.edges;
                zoom.value = res.data.zoom;
                obj.value = res.data;
            });
    }
});

const onNodeClick = (event, node) => {
    console.log('clicked', event, node);
};
</script>
<style>
@import 'https://cdn.jsdelivr.net/npm/@vue-flow/core@1.42.0/dist/style.css';
@import 'https://cdn.jsdelivr.net/npm/@vue-flow/core@1.42.0/dist/theme-default.css';
@import 'https://cdn.jsdelivr.net/npm/@vue-flow/controls@latest/dist/style.css';
@import 'https://cdn.jsdelivr.net/npm/@vue-flow/minimap@latest/dist/style.css';
@import 'https://cdn.jsdelivr.net/npm/@vue-flow/node-resizer@latest/dist/style.css';

.vue-flow__minimap {
    transform: scale(75%);
    transform-origin: bottom right;
}

.dnd-flow {
    flex-direction: column;
    display: flex;
    height: 100%;
}

.dnd-flow aside {
    color: #fff;
    font-weight: 700;
    border-right: 1px solid #eee;
    padding: 15px 10px;
    font-size: 12px;
    background: #10b981bf;
    -webkit-box-shadow: 0px 5px 10px 0px rgba(0, 0, 0, 0.3);
    box-shadow: 0 5px 10px #0000004d;
}

.dnd-flow aside .nodes > * {
    margin-bottom: 10px;
    cursor: grab;
    font-weight: 500;
    -webkit-box-shadow: 5px 5px 10px 2px rgba(0, 0, 0, 0.25);
    box-shadow: 5px 5px 10px 2px #00000040;
}

.dnd-flow aside .description {
    margin-bottom: 10px;
    font-size: 14px;
}

.dnd-flow .vue-flow-wrapper {
    flex-grow: 1;
    height: 100%;
}

.dnd-flow {
    flex-direction: row;
}

.dnd-flow aside {
    min-width: 200px;
    position: absolute;
}

.dropzone-background {
    position: relative;
    height: 100%;
    width: 100%;
}

.dropzone-background .overlay {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
    pointer-events: none;
}
.el-button + .el-button {
    margin-left: 0;
}
</style>
