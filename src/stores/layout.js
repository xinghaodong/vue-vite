/**
 * ========================================================================
 * 文件名称: layout.js
 * 所属模块: 布局与偏好设置状态中枢 (src/stores/layout.js)
 * 功能说明:
 *   1. 统一收敛四大布局模式 (vertical/columns/horizontal/mixed) 及折叠控制；
 *   2. 收敛界面功能开关 (面包屑、多标签栏、转场动效、无障碍辅助等)；
 *   3. 实现基于「用户 ID 命名空间」的 LocalStorage 自动化双向持久化；
 *   4. 提供一键恢复默认设置 (Reset) 功能与全局辅助滤镜同步。
 * ========================================================================
 */

import { defineStore } from 'pinia';
import useUserInfoStore from './user.js';

// 系统出厂默认布局配置 (用于初始兜底与一键恢复出厂设置)
export const defaultLayoutSettings = {
    // 1. 核心布局架构: 'vertical' (纵向经典) | 'columns' (分栏双列) | 'horizontal' (横向通栏) | 'mixed' (综合混合)
    layoutMode: 'vertical',
    // 侧边栏折叠状态 (纵向/混合模式)
    isCollapse: false,
    // 分栏模式上次级子菜单栏折叠状态
    isColumnsSubCollapse: false,

    // 2. 界面显示与功能开关
    showBreadcrumb: true,
    showBreadcrumbIcon: true,
    showTabs: true,
    showTabsIcon: true,
    // 标签页风格: 'card' (圆角卡片) | 'capsule' (胶囊) | 'plain' (极简无框)
    tabsStyle: 'card',

    // 3. 路由页面转场动画: 'none' (无) | 'fade' (淡入淡出) | 'fade-transform' (缩放滑动)
    pageTransition: 'fade-transform',

    // 4. 全局组件尺寸: 'small' (紧凑) | 'default' (默认) | 'large' (宽松)
    componentSize: 'default',
};

const STORAGE_PREFIX = 'system-layout-settings';

/**
 * 根据用户 ID 生成本地持久化命名空间 Key
 * @param {string|number} [userId]
 */
export const getLayoutStorageKey = (userId) => {
    return `${STORAGE_PREFIX}_${userId || 'default'}`;
};

/**
 * 从本地存储加载并深合并配置
 * @param {string|number} [userId]
 */
const loadSettingsFromStorage = (userId) => {
    try {
        const key = getLayoutStorageKey(userId);
        const raw = localStorage.getItem(key);
        if (raw) {
            const parsed = JSON.parse(raw);
            return Object.assign({}, defaultLayoutSettings, parsed);
        }
    } catch (e) {
        console.warn('[LayoutStore] 读取本地持久化配置失败，回退默认配置:', e);
    }
    return { ...defaultLayoutSettings };
};

export const useLayoutStore = defineStore('layout', {
    state: () => {
        // 尝试从当前用户会话中提取 ID
        let currentUserId = 'default';
        try {
            const userStore = useUserInfoStore();
            const id = userStore.userInfo?.id || userStore.userInfo?.userId;
            if (id) currentUserId = id;
        } catch (_) {}

        const initialSettings = loadSettingsFromStorage(currentUserId);

        return {
            ...initialSettings,
            // 抽屉显隐属于纯运行时状态，不持久化
            settingDrawerVisible: false,
        };
    },

    getters: {
        // 当前生效的命名空间 Key
        currentStorageKey: () => {
            let uid = 'default';
            try {
                const userStore = useUserInfoStore();
                const id = userStore.userInfo?.id || userStore.userInfo?.userId;
                if (id) uid = id;
            } catch (_) {}
            return getLayoutStorageKey(uid);
        },
    },

    actions: {
        /**
         * 内部同步保存至 LocalStorage
         */
        saveSettingsToStorage() {
            try {
                const key = this.currentStorageKey;
                const persistData = {
                    layoutMode: this.layoutMode,
                    isCollapse: this.isCollapse,
                    isColumnsSubCollapse: this.isColumnsSubCollapse,
                    showBreadcrumb: this.showBreadcrumb,
                    showBreadcrumbIcon: this.showBreadcrumbIcon,
                    showTabs: this.showTabs,
                    showTabsIcon: this.showTabsIcon,
                    tabsStyle: this.tabsStyle,
                    pageTransition: this.pageTransition,
                    componentSize: this.componentSize,
                };
                localStorage.setItem(key, JSON.stringify(persistData));
            } catch (e) {
                console.warn('[LayoutStore] 持久化配置失败:', e);
            }
        },

        /**
         * 设置全局组件尺寸
         * @param {'small'|'default'|'large'} size
         */
        setComponentSize(size) {
            if (!['small', 'default', 'large'].includes(size)) return;
            this.componentSize = size;
            this.saveSettingsToStorage();
        },

        /**
         * 设置布局架构模式
         * @param {'vertical'|'columns'|'horizontal'|'mixed'} mode
         */
        setLayoutMode(mode) {
            if (!['vertical', 'columns', 'horizontal', 'mixed'].includes(mode)) return;
            this.layoutMode = mode;
            this.saveSettingsToStorage();
        },

        /**
         * 切换主侧边栏折叠状态
         * @param {boolean} [forceState]
         */
        toggleCollapse(forceState) {
            this.isCollapse = typeof forceState === 'boolean' ? forceState : !this.isCollapse;
            this.saveSettingsToStorage();
        },

        /**
         * 切换分栏模式下第二列子菜单折叠
         * @param {boolean} [forceState]
         */
        toggleColumnsSubCollapse(forceState) {
            this.isColumnsSubCollapse = typeof forceState === 'boolean' ? forceState : !this.isColumnsSubCollapse;
            this.saveSettingsToStorage();
        },

        /**
         * 切换设置抽屉显隐
         * @param {boolean} [visible]
         */
        setSettingDrawerVisible(visible) {
            this.settingDrawerVisible = typeof visible === 'boolean' ? visible : !this.settingDrawerVisible;
        },

        /**
         * 批量或单项更新配置项
         * @param {Object} partialSettings
         */
        updateSettings(partialSettings = {}) {
            Object.assign(this, partialSettings);
            this.saveSettingsToStorage();
        },

        /**
         * 当用户登录或切换身份时，重新以新用户 ID 重新挂载其专属配置
         * @param {string|number} userId
         */
        initUserLayout(userId) {
            const userSettings = loadSettingsFromStorage(userId);
            Object.assign(this, userSettings);
        },

        /**
         * 恢复系统出厂默认配置
         */
        resetSettings() {
            // 1. 清理该用户专属 LocalStorage
            try {
                localStorage.removeItem(this.currentStorageKey);
            } catch (_) {}

            // 2. 覆盖回默认 State
            Object.assign(this, defaultLayoutSettings);
        },
    },
});

export default useLayoutStore;
