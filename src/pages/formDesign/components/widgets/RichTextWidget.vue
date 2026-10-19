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
    border: 1px solid #dcdfe6;
    border-radius: 6px;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    user-select: none;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.skeleton-toolbar {
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    padding: 6px 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
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
    color: #64748b;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 3px;
    height: 22px;
}

.mock-divider {
    width: 1px;
    height: 14px;
    background: #cbd5e1;
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
    background: #fafafa;
    display: flex;
    align-items: flex-start;
}

.mock-placeholder {
    font-size: 13px;
    color: #94a3b8;
}

/* 运行态样式 */
.richtext-runtime-box {
    border: 1px solid #dcdfe6;
    border-radius: 6px;
    overflow: hidden;
    background: #ffffff;
    transition: border-color 0.2s ease;
}

.richtext-runtime-box:focus-within {
    border-color: #409eff;
}

.richtext-runtime-box.is-disabled {
    background: #f5f7fa;
    border-color: #e4e7ed;
}

.runtime-toolbar {
    border-bottom: 1px solid #e2e8f0;
    background: #f8fafc;
}

.runtime-editor {
    width: 100%;
}
</style>
