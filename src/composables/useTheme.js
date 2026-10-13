/**
 * ========================================================================
 * 文件名称: useTheme.js
 * 所属模块: 组合式 API (src/composables)
 * 功能说明:
 *   现代化主题管理方案：
 *   1. 深度适配 Element Plus 暗黑模式 (html.dark) 与本地 localStorage 同步；
 *   2. 基于浏览器原生 View Transitions API 实现 Element Plus / VitePress 官网
 *      同款的“以鼠标点击处为圆心、全屏圆形扩散/收缩”暗黑模式无缝过渡特效；
 *   3. 自动同步后端用户个性化主题配置。
 * ========================================================================
 */

import { ref } from 'vue';
import api from '@/utils/request';

// 全局单例响应式暗黑模式状态
const isDark = ref(localStorage.getItem('theme') === 'dark');

/**
 * 确保初始进入应用时 html.dark 类名与 localStorage 保持绝对同步
 */
export const initTheme = () => {
    if (isDark.value) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
};

export function useTheme() {
    /**
     * 切换暗黑/浅色主题 (带 View Transitions 原生全屏圆形扩散/收缩特效)
     * @param {MouseEvent} [event] 鼠标点击事件对象 (用于精确获取扩散圆心坐标)
     * @param {Object} [userInfo] 当前登录用户信息 (可选，用于同步到后端)
     */
    const toggleTheme = (event, userInfo = null) => {
        // 1. 降级判断：如果浏览器不支持 View Transitions API，则直接切换
        if (!document.startViewTransition) {
            applyTheme(!isDark.value, userInfo);
            return;
        }

        // 2. 稳健获取触发事件的中心坐标 (兼容点击 svg/icon 时的情况)
        let x = window.innerWidth / 2;
        let y = window.innerHeight / 2;
        if (event && typeof event.clientX === 'number') {
            x = event.clientX;
            y = event.clientY;
        }

        // 3. 计算覆盖全屏所需的最大半径
        const endRadius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y)
        );

        // 记录切换前是否处于暗黑模式
        const wasDark = document.documentElement.classList.contains('dark');

        // 4. 开启原生 View Transition 快照
        const transition = document.startViewTransition(async () => {
            applyTheme(!wasDark, userInfo);
        });

        // 5. 动画就绪后，对 DOM 执行自定义圆形裁剪扩散/收缩动画
        transition.ready.then(() => {
            const clipPath = [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${endRadius}px at ${x}px ${y}px)`,
            ];

            const isNowDark = document.documentElement.classList.contains('dark');

            // 浅色 -> 深色：新视图(::view-transition-new)在最顶层，从小圆扩散至全屏
            // 深色 -> 浅色：旧视图(::view-transition-old)在最顶层，从全屏向圆心收缩至0
            document.documentElement.animate(
                {
                    clipPath: isNowDark ? clipPath : [...clipPath].reverse(),
                },
                {
                    duration: 400,
                    easing: 'ease-in-out',
                    pseudoElement: isNowDark
                        ? '::view-transition-new(root)'
                        : '::view-transition-old(root)',
                }
            );
        });
    };

    /**
     * 应用主题状态 (修改 DOM 类名、本地存储、并静默同步后端)
     */
    const applyTheme = (targetDark, userInfo) => {
        isDark.value = targetDark;
        const themeValue = targetDark ? 'dark' : 'light';

        localStorage.setItem('theme', themeValue);

        if (targetDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // 如果传入了用户信息，异步静默同步后端偏好设置
        if (userInfo && userInfo.id) {
            api.updateTheme({
                id: userInfo.id,
                theme: themeValue,
            }).catch(err => {
                console.warn('主题同步后端失败(非阻塞):', err);
            });
        }
    };

    return {
        isDark,
        toggleTheme,
    };
}
