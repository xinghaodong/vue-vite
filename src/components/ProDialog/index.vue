<template>
  <el-dialog
    v-bind="$attrs"
    v-model="visible"
    :fullscreen="isFullscreen"
    :draggable="draggable && !isFullscreen"
    :class="dialogClasses"
    :width="dialogWidth"
    :show-close="false"
    :align-center="alignCenter && !isFullscreen"
    :destroy-on-close="destroyOnClose"
    class="pro-dialog-root"
  >
    <!-- 自定义 Header 顶栏 -->
    <template #header>
      <div class="pro-dialog-header">
        <div class="pro-dialog-header__left">
          <slot name="header-prefix">
            <span class="pro-dialog-header__accent"></span>
          </slot>
          <div class="pro-dialog-header__title-group">
            <slot name="title">
              <span class="pro-dialog-header__title">{{ title }}</span>
            </slot>
            <span v-if="subTitle" class="pro-dialog-header__subtitle">{{ subTitle }}</span>
          </div>
        </div>

        <div class="pro-dialog-header__actions">
          <slot name="header-actions" />
          
          <!-- 全屏/窗口化切换按钮 -->
          <el-tooltip
            v-if="showFullscreen"
            :content="isFullscreen ? '还原窗口' : '最大化全屏'"
            placement="bottom"
            :show-after="300"
          >
            <button
              type="button"
              class="pro-dialog-icon-btn"
              :class="{ 'is-active': isFullscreen }"
              @click="toggleFullscreen"
            >
              <el-icon :size="15">
                <component :is="isFullscreen ? 'CopyDocument' : 'FullScreen'" />
              </el-icon>
            </button>
          </el-tooltip>

          <!-- 关闭按钮 -->
          <el-tooltip content="关闭 (Esc)" placement="bottom" :show-after="300">
            <button type="button" class="pro-dialog-icon-btn pro-dialog-icon-btn--close" @click="handleCancel">
              <el-icon :size="16"><Close /></el-icon>
            </button>
          </el-tooltip>
        </div>
      </div>
    </template>

    <!-- Body 内容视口 (三段式独立滚动) -->
    <div
      class="pro-dialog-body"
      :style="bodyStyleComputed"
      :class="{ 'is-fullscreen': isFullscreen }"
    >
      <slot />
    </div>

    <!-- Footer 吸底操作栏 -->
    <template v-if="showFooter" #footer>
      <div class="pro-dialog-footer">
        <div class="pro-dialog-footer__left">
          <slot name="footer-left" />
        </div>
        <div class="pro-dialog-footer__right">
          <slot name="footer-right">
            <el-button
              v-if="showCancel"
              :disabled="mergedLoading"
              class="pro-dialog-btn pro-dialog-btn--cancel"
              @click="handleCancel"
            >
              {{ cancelText }}
            </el-button>
            <el-button
              v-if="showConfirm"
              type="primary"
              :loading="mergedLoading"
              class="pro-dialog-btn pro-dialog-btn--confirm"
              @click="handleConfirm"
            >
              {{ confirmText }}
            </el-button>
          </slot>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

defineOptions({
  name: 'ProDialog',
  inheritAttrs: false
});

const props = defineProps({
  /** 是否显示弹窗 (v-model) */
  modelValue: {
    type: Boolean,
    default: false
  },
  /** 弹窗主标题 */
  title: {
    type: String,
    default: '提示'
  },
  /** 弹窗副标题/说明文案 */
  subTitle: {
    type: String,
    default: ''
  },
  /** 弹窗宽度 (支持 px、%、vw 等) */
  width: {
    type: [String, Number],
    default: '680px'
  },
  /** 是否支持拖拽移动 (全屏时自动禁用) */
  draggable: {
    type: Boolean,
    default: true
  },
  /** 是否垂直居中对齐 */
  alignCenter: {
    type: Boolean,
    default: true
  },
  /** 是否显示最大化全屏切换按钮 */
  showFullscreen: {
    type: Boolean,
    default: true
  },
  /** 受控全屏状态 (支持 v-model:fullscreen) */
  fullscreen: {
    type: Boolean,
    default: false
  },
  /** 是否在关闭时销毁 Dialog 内部元素 */
  destroyOnClose: {
    type: Boolean,
    default: false
  },
  /** 内容区最大高度 (超长自动触发独立平滑滚动) */
  maxHeight: {
    type: [String, Number],
    default: 'calc(80vh - 130px)'
  },
  /** 内容区内边距 */
  bodyPadding: {
    type: String,
    default: '20px 24px'
  },
  /** 是否展示底部操作栏 */
  showFooter: {
    type: Boolean,
    default: true
  },
  /** 是否展示取消按钮 */
  showCancel: {
    type: Boolean,
    default: true
  },
  /** 是否展示确定按钮 */
  showConfirm: {
    type: Boolean,
    default: true
  },
  /** 取消按钮文本 */
  cancelText: {
    type: String,
    default: '取消'
  },
  /** 确定按钮文本 */
  confirmText: {
    type: String,
    default: '确定'
  },
  /** 受控的确定按钮 Loading (仅确定按钮本身转圈，不加全窗遮罩) */
  confirmLoading: {
    type: Boolean,
    default: false
  },
  /** 异步确认回调函数 (自动捕获 Loading，返回 false 可阻止关闭弹窗) */
  onConfirm: {
    type: Function,
    default: null
  }
});

const emit = defineEmits(['update:modelValue', 'update:fullscreen', 'confirm', 'cancel', 'close']);

// 弹窗可见性
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

// 全屏状态受控与非受控双向同步
const localFullscreen = ref(props.fullscreen);
watch(
  () => props.fullscreen,
  (val) => {
    localFullscreen.value = val;
  }
);

const isFullscreen = computed({
  get: () => (props.fullscreen !== undefined && props.fullscreen !== null ? localFullscreen.value : false),
  set: (val) => {
    localFullscreen.value = val;
    emit('update:fullscreen', val);
  }
});

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value;
};

// 宽度格式化
const dialogWidth = computed(() => {
  if (isFullscreen.value) return '100%';
  return typeof props.width === 'number' ? `${props.width}px` : props.width;
});

// 内部异步确认状态
const innerLoading = ref(false);
const mergedLoading = computed(() => props.confirmLoading || innerLoading.value);

// 计算 Body 样式
const bodyStyleComputed = computed(() => {
  if (isFullscreen.value) {
    return {
      padding: props.bodyPadding,
      height: 'calc(100vh - 128px)',
      maxHeight: 'none'
    };
  }
  const maxH = typeof props.maxHeight === 'number' ? `${props.maxHeight}px` : props.maxHeight;
  return {
    padding: props.bodyPadding,
    maxHeight: maxH
  };
});

// 自定义样式类
const dialogClasses = computed(() => {
  return [
    'pro-dialog-custom',
    isFullscreen.value ? 'is-fullscreen-mode' : 'is-window-mode'
  ];
});

// 处理取消
const handleCancel = () => {
  if (mergedLoading.value) return;
  visible.value = false;
  emit('cancel');
  emit('close');
};

// 处理确认 (防连击：仅确定按钮本身转圈)
const handleConfirm = async () => {
  if (mergedLoading.value) return;

  emit('confirm');

  // 若传入了异步 onConfirm 回调，则由组件自动托管确定按钮 loading 与关闭流
  if (props.onConfirm && typeof props.onConfirm === 'function') {
    try {
      innerLoading.value = true;
      const res = await props.onConfirm();
      // 返回明确的 false 则不关闭弹窗，否则成功关闭
      if (res !== false) {
        visible.value = false;
      }
    } catch (err) {
      console.error('[ProDialog] onConfirm error:', err);
    } finally {
      innerLoading.value = false;
    }
  }
};
</script>

<style>
/* 全局重置与注入 ProDialog 顶级定制容器 */
.el-dialog.pro-dialog-root {
  display: flex;
  flex-direction: column;
  padding: 0 !important;
  border-radius: 14px;
  overflow: hidden;
  background: var(--el-bg-color-overlay, var(--app-card-bg, #ffffff)) !important;
  border: 1px solid var(--el-border-color-lighter, rgba(226, 232, 240, 0.8));
  box-shadow: 0 20px 45px -10px rgba(0, 0, 0, 0.16), 0 0 1px 1px rgba(0, 0, 0, 0.04) !important;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.el-dialog.pro-dialog-root.is-fullscreen {
  border-radius: 0 !important;
  border: none !important;
  box-shadow: none !important;
  max-height: 100vh;
  height: 100vh;
}

.el-dialog.pro-dialog-root .el-dialog__header {
  margin: 0 !important;
  padding: 0 !important;
  border-bottom: 1px solid var(--el-border-color-lighter, rgba(226, 232, 240, 0.8));
  background: var(--el-bg-color-overlay, var(--app-card-bg, #ffffff));
  user-select: none;
}

.el-dialog.pro-dialog-root .el-dialog__body {
  flex: 1;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden;
  background: var(--el-bg-color-overlay, var(--app-card-bg, #ffffff));
}

.el-dialog.pro-dialog-root .el-dialog__footer {
  margin: 0 !important;
  padding: 0 !important;
  border-top: 1px solid var(--el-border-color-lighter, rgba(226, 232, 240, 0.8));
  background: var(--el-bg-color-overlay, var(--app-card-bg, #ffffff));
}

/* 深色模式适配 */
html.dark .el-dialog.pro-dialog-root {
  border-color: rgba(255, 255, 255, 0.08) !important;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.06) !important;
}
</style>

<style scoped>
/* 1. Header 顶栏样式 */
.pro-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  min-height: 52px;
  box-sizing: border-box;
}

.pro-dialog-header__left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  overflow: hidden;
}

.pro-dialog-header__accent {
  width: 3.5px;
  height: 16px;
  border-radius: 2px;
  background: var(--el-color-primary, #1890ff);
  flex-shrink: 0;
}

.pro-dialog-header__title-group {
  display: flex;
  align-items: baseline;
  gap: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pro-dialog-header__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary, #1e293b);
  line-height: 1.4;
  letter-spacing: -0.01em;
}

.pro-dialog-header__subtitle {
  font-size: 12px;
  font-weight: 400;
  color: var(--el-text-color-secondary, #94a3b8);
  line-height: 1.4;
}

.pro-dialog-header__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 16px;
}

/* 拟物灵动操作小图标按钮 */
.pro-dialog-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--el-text-color-secondary, #64748b);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
}

.pro-dialog-icon-btn:hover {
  color: var(--el-text-color-primary, #0f172a);
  background-color: var(--el-fill-color-light, rgba(0, 0, 0, 0.04));
  border-color: var(--el-border-color-lighter, rgba(0, 0, 0, 0.06));
  transform: translateY(-0.5px);
}

.pro-dialog-icon-btn:active {
  transform: translateY(0.5px);
}

.pro-dialog-icon-btn.is-active {
  color: var(--el-color-primary, #1890ff);
  background-color: var(--el-color-primary-light-9, rgba(24, 144, 255, 0.1));
}

.pro-dialog-icon-btn--close:hover {
  color: #ef4444;
  background-color: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.2);
}

/* 2. Body 内容视口 (自带独立定制微滚动条) */
.pro-dialog-body {
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
  color: var(--el-text-color-regular, #334155);
  font-size: 14px;
  line-height: 1.6;
}

/* 极致细腻现代滚动条 */
.pro-dialog-body::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.pro-dialog-body::-webkit-scrollbar-track {
  background: transparent;
}

.pro-dialog-body::-webkit-scrollbar-thumb {
  background-color: var(--el-border-color-light, rgba(0, 0, 0, 0.15));
  border-radius: 10px;
  transition: background-color 0.2s ease;
}

.pro-dialog-body::-webkit-scrollbar-thumb:hover {
  background-color: var(--el-border-color-darker, rgba(0, 0, 0, 0.3));
}

/* 3. Footer 底部吸底操作栏 */
.pro-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  box-sizing: border-box;
  min-height: 54px;
  background: var(--el-fill-color-blank, var(--app-card-bg, #ffffff));
}

.pro-dialog-footer__left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--el-text-color-secondary, #64748b);
}

.pro-dialog-footer__right {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

/* 底部按钮高级视觉质感 */
.pro-dialog-btn {
  height: 34px;
  padding: 0 18px;
  font-size: 13.5px;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.pro-dialog-btn--cancel {
  border-color: var(--el-border-color-light, #e2e8f0);
  color: var(--el-text-color-regular, #475569);
  background-color: var(--el-bg-color, #ffffff);
}

.pro-dialog-btn--cancel:hover:not(:disabled) {
  color: var(--el-text-color-primary, #0f172a);
  border-color: var(--el-border-color-dark, #cbd5e1);
  background-color: var(--el-fill-color-light, #f8fafc);
  transform: translateY(-0.5px);
}

.pro-dialog-btn--confirm {
  box-shadow: 0 2px 6px -1px var(--el-color-primary-light-5, rgba(24, 144, 255, 0.35));
}

.pro-dialog-btn--confirm:hover:not(:disabled) {
  box-shadow: 0 4px 12px -2px var(--el-color-primary-light-3, rgba(24, 144, 255, 0.45));
  transform: translateY(-0.5px);
}

.pro-dialog-btn--confirm:active:not(:disabled) {
  transform: translateY(0.5px);
}
</style>
