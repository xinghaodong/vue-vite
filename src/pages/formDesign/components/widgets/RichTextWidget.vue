<!-- 
  ========================================================================
  文件名称: RichTextWidget.vue
  所属模块: 表单渲染器业务物料库 (components/widgets)
  适用组件: 富文本编辑器物料 (richtext)
  功能说明:
    负责在设计态与运行态提供高可用、零闪烁的富文本编辑能力：
    1. 【双模态架构设计】:
       - 设计态 (isDesign: true): 渲染极速仿真骨架，杜绝拖拽画布时的沙盒重复初始化、卡顿与光标夺焦；
       - 运行态 (isDesign: false): 挂载真实的 WangEditor v5，提供完整的图文排版能力；
    2. 【防 Base64 膨胀】: 拦截图片粘贴/上传，统一走后端上传接口转为 URL 插入；
    3. 【安全生命周期】: 卸载时显式调用 editor.destroy() 销毁实例，彻底杜绝内存泄漏。
  ========================================================================
-->
<template>
    <div class="richtext-widget-wrapper" :style="{ width: '100%' }">
        <!-- 1. 设计态：轻量仿真骨架 (防拖拽死锁与频繁重绘) -->
        <div
            v-if="isDesign"
            class="richtext-design-skeleton"
            :style="{ height: `${currentHeight}px` }"
        >
            <div class="skeleton-toolbar">
                <div class="mock-btn-group">
                    <span class="mock-btn font-bold">B</span>
                    <span class="mock-btn font-italic">I</span>
                    <span class="mock-btn font-underline">U</span>
                    <span class="mock-divider"></span>
                    <span class="mock-btn font-h">H1</span>
                    <span class="mock-btn font-h">H2</span>
                    <span class="mock-divider"></span>
                    <span class="mock-btn">居中</span>
                    <span class="mock-btn">列表</span>
                    <span class="mock-btn">图片</span>
                    <span class="mock-btn">表格</span>
                </div>
                <div class="skeleton-tag">
                    <el-tag size="small" type="info" effect="plain">富文本设计态</el-tag>
                </div>
            </div>
            <div class="skeleton-body">
                <span class="mock-placeholder">
                    {{ currentPlaceholder }}
                </span>
            </div>
        </div>

        <!-- 2. 运行态 / 真机预览：真实 WangEditor v5 编辑器 -->
        <div
            v-else
            class="richtext-runtime-box"
            :class="{ 'is-disabled': disabled }"
        >
            <Toolbar
                v-if="!disabled"
                :editor="editorRef"
                :default-config="toolbarConfig"
                :mode="currentToolbarMode"
                class="runtime-toolbar"
            />
            <Editor
                v-model="valueHtml"
                :default-config="editorConfig"
                :mode="currentToolbarMode"
                :style="{ height: `${currentHeight}px`, overflowY: 'hidden' }"
                class="runtime-editor"
                @on-created="handleCreated"
                @on-change="handleChange"
            />
        </div>
    </div>
</template>

<script setup>
import { ref, shallowRef, computed, watch, onBeforeUnmount } from 'vue';
import '@wangeditor/editor/dist/css/style.css';
import { Editor, Toolbar } from '@wangeditor/editor-for-vue';
import axios from 'axios';
import { ElMessage } from 'element-plus';

const props = defineProps({
    modelValue: {
        type: String,
        default: '',
    },
    disabled: {
        type: Boolean,
        default: false,
    },
    isDesign: {
        type: Boolean,
        default: false,
    },
    propsConfig: {
        type: Object,
        default: () => ({}),
    },
    height: {
        type: [Number, String],
        default: 300,
    },
    placeholder: {
        type: String,
        default: '请输入富文本内容...',
    },
    toolbarMode: {
        type: String,
        default: 'default',
    },
});

const emit = defineEmits(['update:modelValue']);
const baseUrl = import.meta.env.VITE_PROXY_DOMAIN || 'http://127.0.0.1:3001/api';
const staticBase = import.meta.env.VITE_STATIC_URL || 'http://127.0.0.1:3001/api/';

// 计算高度
const currentHeight = computed(() => {
    return Number(props.propsConfig?.height || props.height) || 300;
});

// 计算占位提示
const currentPlaceholder = computed(() => {
    return props.propsConfig?.placeholder || props.placeholder || '请输入富文本内容...';
});

// 工具栏模式: 'default' | 'simple'
const currentToolbarMode = computed(() => {
    return props.propsConfig?.toolbarMode || props.toolbarMode || 'default';
});

// 编辑器实例引用 (必须使用 shallowRef，避免 Vue 深度代理导致不可预知的问题)
const editorRef = shallowRef(null);
const valueHtml = ref(props.modelValue || '');

// 监听外部 modelValue 变更同步内部
watch(
    () => props.modelValue,
    newVal => {
        if (newVal !== valueHtml.value) {
            valueHtml.value = newVal || '';
        }
    }
);

// 工具栏配置
const toolbarConfig = {};

// 编辑器配置
const editorConfig = {
    placeholder: currentPlaceholder.value,
    readOnly: props.disabled,
    MENU_CONF: {},
};

// 配置图片上传拦截 (采用 customUpload 钩子，精确传参 avatar 字段，彻底避免 Unexpected field 报错)
editorConfig.MENU_CONF['uploadImage'] = {
    base64LimitSize: 5 * 1024, // 5KB 以下小图标直接 base64
    async customUpload(file, insertFn) {
        if (!file) return;
        const uploadUrl = `${baseUrl}/upload/uploadFile`;
        const formData = new FormData();
        formData.append('avatar', file); // 🌟 字段名严格设为后端 Multer 指定的 avatar

        const token = sessionStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            const res = await axios.post(uploadUrl, formData, { headers });
            const data = res.data?.data || res.data;
            if (!data) {
                ElMessage.error('上传接口未返回文件数据');
                return;
            }

            // 计算完整的图片访问绝对路径 (与 FileUploadWidget 统一规范)
            let fullImgUrl = '';
            const filePath = data.filePath || data.path;
            if (filePath) {
                const cleanPath = String(filePath).replace(/\\/g, '/').replace(/^\/+/, '');
                fullImgUrl = `${staticBase.replace(/\/+$/, '')}/${cleanPath}`;
            } else if (data.fileName) {
                fullImgUrl = `${staticBase.replace(/\/+$/, '')}/uploads/${data.fileName}`;
            } else if (data.avatarPath) {
                fullImgUrl = `${staticBase.replace(/\/+$/, '')}/${String(data.avatarPath).replace(/^\/+/, '')}`;
            } else if (typeof data === 'string' && data.startsWith('http')) {
                fullImgUrl = data;
            }

            if (fullImgUrl) {
                insertFn(fullImgUrl, file.name || 'image', fullImgUrl);
                ElMessage.success(`${file.name || '图片'} 上传成功`);
            } else {
                ElMessage.error('无法解析图片在线访问路径');
            }
        } catch (error) {
            console.error('富文本上传图片失败:', error);
            ElMessage.error(error?.response?.data?.message || error?.message || '图片上传失败');
        }
    },
};

// 编辑器创建就绪
const handleCreated = editor => {
    editorRef.value = editor;
    if (props.disabled) {
        editor.disable();
    }
};

// 内容变更通知外部
const handleChange = editor => {
    const html = editor.getHtml();
    // 当内容完全为空时统一规整为 ''
    const isEmpty = editor.isEmpty();
    const finalVal = isEmpty ? '' : html;
    valueHtml.value = finalVal;
    emit('update:modelValue', finalVal);
};

// 监听 disabled 状态动态切换只读
watch(
    () => props.disabled,
    isDisabled => {
        const editor = editorRef.value;
        if (!editor) return;
        if (isDisabled) {
            editor.disable();
        } else {
            editor.enable();
        }
    }
);

// 安全销毁实例，释放内存
onBeforeUnmount(() => {
    const editor = editorRef.value;
    if (editor == null) return;
    editor.destroy();
});
</script>

<style scoped>
.richtext-widget-wrapper {
    width: 100%;
}

/* 设计态仿真骨架 */
.richtext-design-skeleton {
    width: 100%;
    border: 1px solid var(--el-border-color-light);
    border-radius: 6px;
    background: var(--el-bg-color);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    user-select: none;
    transition: background-color 0.3s ease, border-color 0.3s ease;
}

.skeleton-toolbar {
    background: var(--el-fill-color-light);
    border-bottom: 1px solid var(--el-border-color-lighter);
    padding: 6px 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: background-color 0.3s ease, border-color 0.3s ease;
}

.mock-btn-group {
    display: flex;
    align-items: center;
    gap: 6px;
}

.mock-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 2px 6px;
    font-size: 11px;
    color: var(--el-text-color-regular);
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-light);
    border-radius: 3px;
    height: 22px;
}

.mock-divider {
    width: 1px;
    height: 14px;
    background: var(--el-border-color-light);
    margin: 0 2px;
}

.font-bold {
    font-weight: 700;
}
.font-italic {
    font-style: italic;
}
.font-underline {
    text-decoration: underline;
}
.font-h {
    font-size: 10px;
    font-weight: 700;
}

.skeleton-body {
    flex: 1;
    padding: 12px;
    background: var(--el-bg-color-page);
    display: flex;
    align-items: flex-start;
    transition: background-color 0.3s ease;
}

.mock-placeholder {
    font-size: 13px;
    color: var(--el-text-color-placeholder);
}

/* 运行态样式 */
.richtext-runtime-box {
    border: 1px solid var(--el-border-color-light);
    border-radius: 6px;
    overflow: hidden;
    background: var(--el-bg-color);
    transition: border-color 0.2s ease, background-color 0.3s ease;
}

.richtext-runtime-box:focus-within {
    border-color: var(--el-color-primary);
}

.richtext-runtime-box.is-disabled {
    background: var(--el-fill-color-light);
    border-color: var(--el-border-color-lighter);
}

.runtime-toolbar {
    border-bottom: 1px solid var(--el-border-color-lighter) !important;
}

.runtime-editor {
    width: 100%;
}
</style>

<style>
/* ========================================================================
 * 🌟 WangEditor v5 暗黑模式全套原生自适应映射
 * ======================================================================== */
html.dark {
    /* 1. 核心 CSS 变量注入，驱动 WangEditor 内部体系 */
    --w-e-textarea-bg-color: var(--el-bg-color, #141414);
    --w-e-textarea-color: var(--el-text-color-primary, #e2e8f0);
    --w-e-textarea-border-color: var(--el-border-color-light, #334155);
    --w-e-textarea-slight-border-color: var(--el-border-color-lighter, #1e293b);
    --w-e-textarea-slight-color: var(--el-text-color-placeholder, #64748b);
    --w-e-textarea-slight-bg-color: var(--el-fill-color-darker, #1e293b);
    --w-e-textarea-selected-border-color: var(--el-color-primary, #409eff);
    --w-e-textarea-handler-bg-color: var(--el-color-primary, #409eff);

    --w-e-toolbar-color: var(--el-text-color-regular, #94a3b8);
    --w-e-toolbar-bg-color: var(--el-bg-color-overlay, #1d1e1f);
    --w-e-toolbar-active-color: #ffffff;
    --w-e-toolbar-active-bg-color: var(--el-fill-color, #262727);
    --w-e-toolbar-disabled-color: var(--el-text-color-disabled, #475569);
    --w-e-toolbar-border-color: var(--el-border-color-lighter, #262727);

    --w-e-modal-button-bg-color: var(--el-bg-color-overlay, #1d1e1f);
    --w-e-modal-button-border-color: var(--el-border-color-light, #334155);
}

/* 2. 暗黑模式下 WangEditor 悬浮下拉菜单、颜色拾取器、弹窗模态层深度适配 */
html.dark .w-e-drop-panel,
html.dark .w-e-select-list,
html.dark .w-e-modal,
html.dark .w-e-hover-bar {
    background-color: var(--el-bg-color-overlay) !important;
    border-color: var(--el-border-color-light) !important;
    color: var(--el-text-color-primary) !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45) !important;
}

html.dark .w-e-select-list ul li:hover,
html.dark .w-e-select-list ul .selected {
    background-color: var(--el-fill-color) !important;
    color: var(--el-color-primary) !important;
}

html.dark .w-e-modal input[type='text'],
html.dark .w-e-modal input[type='number'],
html.dark .w-e-modal textarea {
    background-color: var(--el-bg-color) !important;
    border-color: var(--el-border-color-light) !important;
    color: var(--el-text-color-primary) !important;
}

html.dark .w-e-modal button {
    background-color: var(--el-fill-color-light) !important;
    border-color: var(--el-border-color-light) !important;
    color: var(--el-text-color-primary) !important;
}

html.dark .w-e-modal button:hover {
    background-color: var(--el-color-primary) !important;
    color: #ffffff !important;
    border-color: var(--el-color-primary) !important;
}

/* 3. 编辑器内容区 placeholder 暗黑颜色 */
html.dark .w-e-text-placeholder {
    color: var(--el-text-color-placeholder) !important;
}

/* 4. 代码块与引用块暗黑样式 */
html.dark .w-e-text-container [data-slate-editor] code {
    background-color: var(--el-fill-color-darker) !important;
    color: #e2e8f0 !important;
}
html.dark .w-e-text-container [data-slate-editor] blockquote {
    background-color: var(--el-fill-color-darker) !important;
    border-left-color: var(--el-color-primary) !important;
    color: var(--el-text-color-regular) !important;
}
</style>
