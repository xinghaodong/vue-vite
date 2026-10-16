<template>
  <div class="dialog-showcase-page">
    <div class="showcase-header">
      <div class="showcase-title-row">
        <h2 class="showcase-title">ProDialog & ProDrawer 高定弹窗/抽屉组件</h2>
        <span class="showcase-badge">极简黑白 Design Tokens · 局部 Loading 防连击 · 全屏拖拽三段式</span>
      </div>
      <p class="showcase-desc">
        彻底摆脱原版 Element 对整个弹窗加厚重遮罩的呆板交互。采用确定按键自身局部旋转防连击，内置精致拟物 Header、超长内容独立微滚动、全屏/窗口无缝切换与优雅吸底 Footer。
      </p>
    </div>

    <!-- 演示操作卡片网格 -->
    <div class="demo-cards-grid">
      <!-- 卡片 1: ProDialog 局部 Loading 防连击与表单 -->
      <div class="demo-card">
        <div class="demo-card__header">
          <span class="card-icon">⚡</span>
          <div>
            <div class="card-title">ProDialog 局部按钮防连击</div>
            <div class="card-sub">确定按钮自身转圈，不给整框加遮罩，输入内容清晰可见</div>
          </div>
        </div>
        <div class="demo-card__body">
          <p class="card-intro">
            通过 <code>:on-confirm="asyncFunc"</code> 或受控 <code>:confirm-loading="loading"</code>，提交时确定按钮转圈，取消按钮自动禁用，杜绝误触与重复提交。
          </p>
          <div class="card-actions">
            <el-button type="primary" @click="basicDialogVisible = true">
              打开标准弹窗
            </el-button>
          </div>
        </div>
      </div>

      <!-- 卡片 2: ProDialog 超长内容与三段式微滚动 -->
      <div class="demo-card">
        <div class="demo-card__header">
          <span class="card-icon">📜</span>
          <div>
            <div class="card-title">超长内容独立滚动 & 全屏切换</div>
            <div class="card-sub">Header 与 Footer 严苛吸顶吸底，中间平滑微滚动，一键最大化</div>
          </div>
        </div>
        <div class="demo-card__body">
          <p class="card-intro">
            内置 <code>calc(80vh - 130px)</code> 自适应高度与 6px 胶囊形无边滚动条，内容超长绝不会将底部操作按钮顶出屏幕视口。
          </p>
          <div class="card-actions">
            <el-button type="default" @click="longContentDialogVisible = true">
              打开超长滚动弹窗
            </el-button>
          </div>
        </div>
      </div>

      <!-- 卡片 3: ProDrawer 高定抽屉与全宽扩展 -->
      <div class="demo-card">
        <div class="demo-card__header">
          <span class="card-icon">🗂️</span>
          <div>
            <div class="card-title">ProDrawer 高定抽屉</div>
            <div class="card-sub">一键展开全屏宽度、局部防连击、纯净吸底常驻操作栏</div>
          </div>
        </div>
        <div class="demo-card__body">
          <p class="card-intro">
            适合复杂详情排查、任务配置。支持右上角一键 <code>600px ↔ 100%</code> 全宽切换，左右开合丝滑，深度适配深色模式。
          </p>
          <div class="card-actions">
            <el-button type="primary" plain @click="drawerVisible = true">
              打开业务抽屉
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 1. 标准弹窗 (验证局部 Loading 转圈) -->
    <ProDialog
      v-model="basicDialogVisible"
      title="配置系统协同节点"
      sub-title="NODE-ID: 2026-CLOUD-WEST-01"
      width="580px"
      :on-confirm="handleAsyncSave"
    >
      <el-form label-position="top">
        <el-form-item label="节点集群标识" required>
          <el-input v-model="formData.clusterName" placeholder="例如: 集群A-边缘推流接入点" />
        </el-form-item>
        <el-form-item label="服务分流权重">
          <el-slider v-model="formData.weight" :step="5" show-input />
        </el-form-item>
        <el-form-item label="并发熔断策略">
          <el-radio-group v-model="formData.policy">
            <el-radio-button label="auto">自适应降级</el-radio-button>
            <el-radio-button label="queue">排队限流</el-radio-button>
            <el-radio-button label="reject">快速失败</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <div class="mock-tip-box">
          💡 点击下方「确定」按钮体验：<strong>仅确定按钮本身转圈（旋转 Loading 菊花）</strong>，整个弹窗表单依然清晰呈现，绝不添加刺眼全屏蒙层！
        </div>
      </el-form>
      <template #footer-left>
        <span class="status-indicator">● 草稿已于本地就绪</span>
      </template>
    </ProDialog>

    <!-- 2. 超长内容滚动弹窗 (验证最大化全屏与独立滚动条) -->
    <ProDialog
      v-model="longContentDialogVisible"
      title="集群运行审计明细与长清单"
      sub-title="支持右上角一键最大化全屏 / 还原窗口"
      width="780px"
      confirm-text="确认并归档"
      :on-confirm="handleAsyncArchive"
    >
      <div class="long-list-container">
        <div class="list-meta-banner">
          共检索出 12 项集群事件，拖动中间区域体验独立 6px 极细滚动条，底部确定/取消按钮常驻吸底。
        </div>
        <div v-for="item in auditLogs" :key="item.id" class="audit-item">
          <div class="audit-item__header">
            <span class="audit-id">#{{ item.id }}</span>
            <span class="audit-title">{{ item.title }}</span>
            <span class="audit-time">{{ item.time }}</span>
          </div>
          <p class="audit-item__desc">{{ item.desc }}</p>
        </div>
      </div>
    </ProDialog>

    <!-- 3. 高定抽屉 ProDrawer -->
    <ProDrawer
      v-model="drawerVisible"
      title="边缘服务器拓扑详情"
      sub-title="节点 IP: 192.168.10.128 · 状态: 在线"
      size="580px"
      confirm-text="保存拓扑配置"
      :on-confirm="handleDrawerSave"
    >
      <div class="drawer-content-box">
        <div class="drawer-hero-card">
          <div class="hero-status-row">
            <span class="hero-tag">Active Node</span>
            <span class="hero-ping">RTT: 12ms</span>
          </div>
          <div class="hero-name">Worker-Edge-Node-08</div>
          <div class="hero-stats">
            <div>CPU 负载: <strong>24.6%</strong></div>
            <div>显存占用: <strong>3.8GB / 12GB</strong></div>
          </div>
        </div>

        <el-form label-position="top" class="mt-4">
          <el-form-item label="网关分配域名">
            <el-input v-model="drawerForm.domain" placeholder="edge-cluster.internal.net" />
          </el-form-item>
          <el-form-item label="心跳探针周期 (秒)">
            <el-input-number v-model="drawerForm.interval" :min="1" :max="60" />
          </el-form-item>
          <el-form-item label="实时告警通知">
            <el-switch v-model="drawerForm.alert" active-text="启用钉钉/邮件告警推送" />
          </el-form-item>
        </el-form>

        <div class="mock-tip-box mt-4">
          💡 点击右上角「展开全屏」图标，抽屉瞬间平滑扩展为 100% 全宽视口，适合在抽屉中处理宽表或大图！
        </div>
      </div>
      <template #footer-left>
        <span class="status-indicator text-emerald-500">● 探针连接健康</span>
      </template>
    </ProDrawer>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';

// 1. 标准弹窗
const basicDialogVisible = ref(false);
const formData = reactive({
  clusterName: '华东区-Cesium-实景三维生产节点',
  weight: 65,
  policy: 'auto'
});

const handleAsyncSave = async () => {
  // 模拟异步请求 1.2 秒：仅确定按钮本身转圈！
  await new Promise((resolve) => setTimeout(resolve, 1200));
  ElMessage.success('配置已成功保存！');
  return true; // 返回 true 自动关闭弹窗
};

// 2. 超长列表弹窗
const longContentDialogVisible = ref(false);
const auditLogs = ref(
  Array.from({ length: 12 }).map((_, i) => ({
    id: i + 1,
    title: `POD-TASK-RECONSTRUCTION-${1000 + i}`,
    time: `2026-10-16 17:${(30 + i).toString().padStart(2, '0')}:24`,
    desc: `执行无人机倾斜摄影特征点解算，完成空三加密（Bundle Adjustment）与稠密点云重建，吞吐吞吐吞吐日志数据包 #${i + 1} 顺利写入磁盘缓存。`
  }))
);

const handleAsyncArchive = async () => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  ElMessage.success('审计日志已打包归档！');
  return true;
};

// 3. 高定抽屉
const drawerVisible = ref(false);
const drawerForm = reactive({
  domain: 'edge-cluster.internal.net',
  interval: 5,
  alert: true
});

const handleDrawerSave = async () => {
  await new Promise((resolve) => setTimeout(resolve, 1100));
  ElMessage.success('抽屉边缘节点信息已更新！');
  return true;
};
</script>

<style scoped>
.dialog-showcase-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.showcase-header {
  margin-bottom: 24px;
}

.showcase-header .showcase-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.showcase-header .showcase-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--el-text-color-primary, #0f172a);
  letter-spacing: -0.02em;
}

.showcase-header .showcase-badge {
  padding: 3px 10px;
  font-size: 12px;
  border-radius: 9999px;
  background: var(--el-color-primary-light-9, rgba(24, 144, 255, 0.1));
  color: var(--el-color-primary, #1890ff);
  font-weight: 500;
}

.showcase-header .showcase-desc {
  margin: 0;
  font-size: 13.5px;
  color: var(--el-text-color-secondary, #64748b);
  line-height: 1.6;
}

.demo-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
}

.demo-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: var(--el-bg-color-overlay, var(--app-card-bg, #ffffff));
  border: 1px solid var(--el-border-color-lighter, #e2e8f0);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.25s ease;
}

.demo-card:hover {
  border-color: var(--el-color-primary-light-5, #93c5fd);
  box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.demo-card__header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.demo-card__header .card-icon {
  font-size: 24px;
  line-height: 1;
}

.demo-card__header .card-title {
  font-size: 15.5px;
  font-weight: 600;
  color: var(--el-text-color-primary, #1e293b);
  margin-bottom: 2px;
}

.demo-card__header .card-sub {
  font-size: 12px;
  color: var(--el-text-color-secondary, #94a3b8);
}

.demo-card__body {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  flex: 1;
}

.demo-card__body .card-intro {
  font-size: 13px;
  color: var(--el-text-color-regular, #475569);
  line-height: 1.6;
  margin: 0 0 16px 0;
}

.demo-card__body .card-intro code {
  padding: 2px 5px;
  background: var(--el-fill-color-light, #f1f5f9);
  border-radius: 4px;
  color: var(--el-color-primary, #1890ff);
  font-size: 12px;
}

.demo-card__body .card-actions {
  display: flex;
  gap: 10px;
}

.mock-tip-box {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--el-color-primary-light-9, rgba(24, 144, 255, 0.08));
  border: 1px solid var(--el-color-primary-light-7, rgba(24, 144, 255, 0.25));
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--el-color-primary-dark-2, #1d4ed8);
}

.status-indicator {
  font-size: 12px;
  color: var(--el-text-color-secondary, #94a3b8);
}

.long-list-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.list-meta-banner {
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--el-fill-color-light, #f8fafc);
  font-size: 12.5px;
  color: var(--el-text-color-secondary, #64748b);
  border: 1px solid var(--el-border-color-lighter, #e2e8f0);
}

.audit-item {
  padding: 14px 16px;
  border-radius: 8px;
  background: var(--el-bg-color, #ffffff);
  border: 1px solid var(--el-border-color-light, #e2e8f0);
  transition: all 0.2s ease;
}

.audit-item:hover {
  border-color: var(--el-color-primary-light-5, #93c5fd);
  background: var(--el-fill-color-blank, #fcfdff);
}

.audit-item__header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.audit-item__header .audit-id {
  font-size: 11px;
  font-weight: 700;
  color: var(--el-color-primary, #1890ff);
  background: var(--el-color-primary-light-9, rgba(24, 144, 255, 0.1));
  padding: 1px 6px;
  border-radius: 4px;
}

.audit-item__header .audit-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--el-text-color-primary, #1e293b);
  flex: 1;
}

.audit-item__header .audit-time {
  font-size: 12px;
  color: var(--el-text-color-secondary, #94a3b8);
}

.audit-item__desc {
  margin: 0;
  font-size: 12.5px;
  color: var(--el-text-color-regular, #64748b);
  line-height: 1.5;
}

.drawer-content-box {
  display: flex;
  flex-direction: column;
}

.drawer-hero-card {
  padding: 16px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(24, 144, 255, 0.08) 0%, rgba(59, 130, 246, 0.02) 100%);
  border: 1px solid var(--el-color-primary-light-8, rgba(24, 144, 255, 0.2));
  margin-bottom: 12px;
}

.drawer-hero-card .hero-status-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.drawer-hero-card .hero-status-row .hero-tag {
  font-size: 11px;
  font-weight: 700;
  color: #10b981;
  background: rgba(16, 185, 129, 0.12);
  padding: 2px 8px;
  border-radius: 9999px;
}

.drawer-hero-card .hero-status-row .hero-ping {
  font-size: 12px;
  color: var(--el-text-color-secondary, #64748b);
}

.drawer-hero-card .hero-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--el-text-color-primary, #0f172a);
  margin-bottom: 8px;
}

.drawer-hero-card .hero-stats {
  display: flex;
  gap: 20px;
  font-size: 12.5px;
  color: var(--el-text-color-regular, #475569);
}
</style>
