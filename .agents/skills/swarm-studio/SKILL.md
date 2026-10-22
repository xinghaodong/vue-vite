---
name: swarm-studio
description: >-
  无人机集群编队设计与表演系统 (SwarmStudio) 核心架构规范、算法与工程开发指南。
  涵盖 2D PixiJS 点阵图形编辑器、3D Three.js 夜空辉光渲染、图像二值化与累积弧长等距重采样算法、
  SpatialGrid 空间碰撞防护、SDF 工业协议标准以及匈牙利算法变轨求解。
---

# 无人机集群编队设计与表演系统 (SwarmStudio) 工程指南

本 Skill 沉淀了基于商业级无人机编队系统（SwarmStudio）的底层逆向分析成果、软件工程架构、离散几何算法与实战开发范式。

---

## 一、 系统全景架构与工作流

```
┌────────────────────────────────────────────────────────────────────────┐
│                        1. 2D 创意点阵编辑器 (Pixi.js)                   │
│   导入线稿/图片 ──> 图片处理三步骤 ──> 弧长等距布点 ──> 构型树/变换/调光 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ 导出 Scene 点阵与灯光数据 (JSON / SDF)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        2. 表演剧本时间轴系统 (Timeline)                 │
│   分镜1(鸟) ──(匈牙利最优匹配变轨)──> 分镜2(龙) ──(变轨)──> 分镜3(文字) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ 生成多帧 3D 轨迹时序流 (Trajectory Stream)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 3. 3D 表演播放器 (Three.js WebGL + Bloom)               │
│   暗黑夜空 ──> 1600+ 发光无人机粒子 ──> 时间轴拖拽播放 ──> 免密链接交付  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 二、 核心 DDD 领域模型 (Domain Data Models)

遵循大厂高级前端架构标准，严格隔离**持久化状态 (State)** 与 **渲染投影缓存 (Projection)**：

1. **`Agent` (无人机物理实体)**：
   * `id`: 编号（0 ~ N-1）
   * `x, y, z`: 物理三维空间坐标（单位：米）
   * `color`: 当前 LED 颜色十六进制（如 `#00f2fe`）
   * `group`: 所属构型子队分组
2. **`Motif` (几何构型基元)**：
   * 单个分镜中独立的矢量几何构型（如“龙”、“凤凰”、“文字”），支持图层独立平移/缩放/旋转。
3. **`Scene` (分镜剧本)**：
   * 一场演出的一个关键画面（包含多架无人机状态、停留时长、变轨航行时长）。
4. **`Cue` (时序提示点)**：
   * 时间轴上的关键动作触发点（起飞 Takeoff、变轨 Morph、闪烁 Flash、降落 Land）。
5. **`Show` (整场表演工程)**：
   * 包含总架数（如 800 / 1600 架）、安全间距约束（$\ge 1.5\text{m}$）、分镜剧本序列。
6. **`SDF` (Swarm Data Format)**：
   * 跨平台编队工业标准数据交换协议 JSON 格式。

---

## 三、 SwarmStudio 生产环境关键逆向解密发现

通过 REA 逆向探针分析生产环境 bundle（`swarm_main.js`），证实了以下关键技术实现：

1. **2D 渲染引擎确实采用 Pixi.js**：
   * 生产代码明确包含 `setPixiSelection`、`registerTransformerBridge`、`handlePixiIntent`；
   * 使用 Sprite Batching 实现单屏上万个发光点位 60 帧无卡顿渲染。
2. **空间哈希网格碰撞检测 (SpatialGrid)**：
   * 生产代码包含 `SpatialGrid` 和 `spatialIndexGlobal`；
   * 基于空间桶划分网格，在 $O(N)$ 复杂度内完成邻近点位查询，检测点距是否小于 $1.5\text{m}$ 安全阈值。
3. **灯光涂布器 (Color Applicator)**：
   * 生产代码包含 `setColorApplicator`、`fillUavsWithColor`、`fillUavsWithRandomColors`；
   * 支持从底层图片像素采样，将色彩精准吸附到对应坐标的无人机 LED 上。
4. **3D 实例化夜空 (InstancedMesh)**：
   * 使用单个 DrawCall 批量驱动数千个发光球体，结合 `UnrealBloomPass` 产生黑夜霓虹光晕。

---

## 四、 核心算法引擎实现

### 1. 图片处理三步骤算法 (纯前端轻量 JS)
* **步骤一：原图 ➔ 预处理图**：
  $$\text{Gray} = 0.299R + 0.587G + 0.114B$$
  结合 OTSU 自适应阈值二值化与背景色容差扣除。
* **步骤二：预处理图 ➔ 中间图**：
  提取模式：
  * **轮廓（Contour）**：4-邻域边界追踪；
  * **骨架（Skeleton）**：细化抽取单像素中线；
  * **圆点（Dot）**：检测圆心坐标并去噪、分离粘连点；
  * **填充（Fill）**：保留实心区域。
* **步骤三：中间图 ➔ 构型**：
  * **随形布点**：累积几何周长 $L_{total} = \sum \sqrt{\Delta x^2 + \Delta y^2}$，步长 $\text{step} = L_{total} / N$，沿线步进精准生成 $N$ 架点位；
  * **正交网格**：横竖矩形阵列；
  * **六边形蜂窝密排**：相邻行错位 $\Delta x = \text{step} / 2$，空间填充密度提升 15%。

### 2. 变轨最优匹配算法 (匈牙利算法 / Munkres)
* 构建成本矩阵 $C_{ij} = \text{distance}(P_{\text{from}, i}, P_{\text{to}, j})$；
* 求解最小总飞行距离的二分图最大权匹配，确保无人机航迹线互不缠绕，杜绝空中交叉碰撞。

---

## 五、 使用 REA 持续深入逆向的调试指南

本项目已在 `.agents/mcp_config.json` 中配置了 REA MCP 驱动。智能体可通过以下 CLI/MCP 指令持续解密更新版本：

```bash
# 1. 静态逆向解包前端 JavaScript 模块
npx -y rea-agents@latest recover-javascript-sources "C:/path/to/downloaded/assets" --output "./reverse-src"

# 2. 追踪特定语义或关键函数 (如 SpatialGrid 或 Hungarian 算法)
npx -y rea-agents@latest trace-javascript-semantics --entry "./reverse-src/main.js" --symbol "SpatialGrid"

# 3. 抓取与分析在线页面
npx -y rea-agents@latest inspect-web-page --url "https://swarm.x-itech.com/"
```
