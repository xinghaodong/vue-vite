# vue-vite

#### Description

vue3 + vite5 后端管理系统

### 主要功能模块

1. 系统设置模块 ( /src/pages/systemSetting/ )

    - 角色管理：支持角色的增删改查、菜单、按钮权限分配
    - 组织管理：支持组织架构的管理维护
    - 权限控制：基于角色的权限控制系统
    - 实现 RBAC（基于角色的访问控制）模型。
    - 支持菜单权限、按钮权限配置

2. 工作流程模块 ( /src/pages/vueFlow/ )(待完善)

    - 流程设计器：支持拖拽节点创建流程
    - 节点配置：可配置审批人等节点属性
    - 流程模板：支持保存流程模板

3. 地图可视化模块 ( /src/pages/cesium/ )

    - 基于 Cesium 的地图展示
    - 支持地图交互和控制

4. AI 模块 ( /src/pages/ai/ )

    - AI 相关功能实现 SSE

5. 用户认证模块

    - 登录页面 ( /src/pages/login.vue )
    - 用户状态管理 ( /src/stortes/user.js )

6. 可视化表单设计器 (未开始)

7. 核心功能支持

    - 路由管理 ( /src/router/index.js )
    - 状态管理 ( /src/stortes/ )
    - API 请求封装 ( /src/utils/request.js )
    - WebSocket 通信 ( /src/utils/webScoket.js )

### 技术特点

-   使用 Vue3 Composition API
-   基于 Element Plus 的 UI 组件
-   Pinia 状态管理
-   支持权限指令控制
-   集成了多个高级功能组件（VueFlow、Cesium 等）
-   支持动态切换主题色、暗黑模式。

项目结构
src/
├── assets/ # 静态资源
├── components/ # 公共组件
├── directives/ # 自定义指令
├── pages/ # 页面组件
├── router/ # 路由配置
├── stortes/ # 状态管理
└── utils/ # 工具函数
