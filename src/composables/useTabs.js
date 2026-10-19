import { useRoute, useRouter } from 'vue-router';
import useMenuStore from '@/stores/menu.js';

export function useTabs() {
    const route = useRoute();
    const router = useRouter();
    const menuStore = useMenuStore();

    /**
     * 关闭当前页签并跳转到目标路由
     * @param {string|Object} target - 目标路由 (如 '/home/logicFlowList' 或 { path: '...', state: { needRefresh: true } })
     */
    const closeCurrentAndGo = target => {
        // 1. 关闭当前页签并清理视图缓存
        menuStore.changeRemoveTab(route.fullPath);

        // 2. 跳转到目标页面 (若未传 target，则跳到系统自动计算的相邻标签)
        if (target) {
            router.push(target);
        } else {
            router.push(menuStore.editableTabsValue);
        }
    };

    /**
     * 关闭指定页签
     */
    const closeTab = fullPath => {
        menuStore.changeRemoveTab(fullPath);
    };

    return {
        closeCurrentAndGo,
        closeTab,
        menuStore,
    };
}
