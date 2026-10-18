/**
 * ========================================================================
 * 文件名称: useLayoutMenu.js
 * 所属模块: 布局菜单数据联动组合式函数 (src/layout/composables/useLayoutMenu.js)
 * 功能说明:
 *   1. 纯前端闭环生成「物理级强唯一 key」，完全无需修改后端数据；
 *   2. 基于当前路由深度反推命中对应的一级模块，彻底杜绝多个一级菜单同时高亮；
 *   3. 为分栏双列 (columns) 与综合混合 (mixed) 模式提供一二级树解耦计算。
 * ========================================================================
 */

import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import menuStore from '@/stores/menu.js';

export function useLayoutMenu() {
    const route = useRoute();
    const router = useRouter();
    const menuInfoStore = menuStore();
    const { allArray } = storeToRefs(menuInfoStore);

    // 当前激活的一级菜单强唯一 _key
    const activeFirstKey = ref('');

    /**
     * 规范化路径用于对比 (去除末尾斜杠与多余前缀)
     */
    const normalizePath = (p) => {
        if (!p) return '';
        let clean = String(p).trim();
        if (clean.length > 1 && clean.endsWith('/')) {
            clean = clean.slice(0, -1);
        }
        return clean;
    };

    /**
     * 提取系统一级模块菜单列表 (纯前端注入强唯一 _key，杜绝重名碰撞)
     */
    const firstLevelMenus = computed(() => {
        return (allArray.value || []).map((item, index) => {
            // 提取唯一标识：优先主键 id/menuId/code，若无则结合下标强行唯一
            const rawId = item.id ?? item.menuId ?? item.code ?? '';
            const uniqueKey = `menu_first_${rawId !== '' ? rawId : index}_${index}`;

            return {
                ...item,
                _key: uniqueKey,
                _hasChildren: Array.isArray(item.children) && item.children.length > 0,
            };
        });
    });

    /**
     * 根据当前激活的一级菜单，派生其子级菜单树 (二级/三级)
     */
    const subMenuList = computed(() => {
        if (!activeFirstKey.value) return [];
        const found = firstLevelMenus.value.find((item) => item._key === activeFirstKey.value);
        if (found && Array.isArray(found.children)) {
            return found.children;
        }
        return [];
    });

    /**
     * 递归判断某个菜单项或其子树是否包含指定的路由 path
     */
    const matchRouteInTree = (menuItem, currentPath) => {
        if (!menuItem) return false;
        const normCurrent = normalizePath(currentPath);

        // 如果节点自身配置了有效且非根路径的 url
        if (menuItem.url && menuItem.url !== '/') {
            const normItem = normalizePath(menuItem.url);
            if (normItem === normCurrent) return true;
        }

        // 递归检查子树
        if (Array.isArray(menuItem.children) && menuItem.children.length > 0) {
            return menuItem.children.some((child) => matchRouteInTree(child, currentPath));
        }

        return false;
    };

    /**
     * 路由反查定位算法：根据当前 route.path 自动反推高亮的一级菜单
     */
    const matchActiveFirstLevel = () => {
        const currentPath = route.path;
        if (!firstLevelMenus.value.length) return;

        // 1. 优先深度匹配子路由
        for (const first of firstLevelMenus.value) {
            if (matchRouteInTree(first, currentPath)) {
                activeFirstKey.value = first._key;
                return;
            }
        }

        // 2. 如果当前路由未直接命中任何子树且当前 activeFirstKey 已经失效，兜底选中第一项
        const exists = firstLevelMenus.value.some((it) => it._key === activeFirstKey.value);
        if (!exists && firstLevelMenus.value.length > 0) {
            activeFirstKey.value = firstLevelMenus.value[0]._key;
        }
    };

    // 监听全量菜单加载完成或路由路径变化，实时反推高亮项
    watch(
        () => [allArray.value, route.path],
        () => {
            matchActiveFirstLevel();
        },
        { immediate: true, deep: true }
    );

    /**
     * 点击一级菜单时的交互响应
     * @param {Object} item 一级菜单对象
     */
    const handleSelectFirstLevel = (item) => {
        activeFirstKey.value = item._key;

        // 1. 如果该一级菜单没有子菜单，且配有有效 url，直接触发路由跳转
        if (!item._hasChildren && item.url && item.url !== '/') {
            menuInfoStore.changeMenu({
                name: item.name,
                url: item.url,
                icon: item.icon,
                code: item.code,
            });
            menuInfoStore.changeTabsValue(item.url);
            router.push(item.url);
            return;
        }

        // 2. 如果有子菜单，且当前路由不在该子树内，默认跳转至该子树下的第一个叶子有效路由
        if (item._hasChildren && !matchRouteInTree(item, route.path)) {
            const findFirstLeaf = (node) => {
                if (!node.children || node.children.length === 0) {
                    return node.url && node.url !== '/' ? node : null;
                }
                for (const c of node.children) {
                    const leaf = findFirstLeaf(c);
                    if (leaf) return leaf;
                }
                return null;
            };
            const leaf = findFirstLeaf(item);
            if (leaf && leaf.url) {
                menuInfoStore.changeMenu({
                    name: leaf.name,
                    url: leaf.url,
                    icon: leaf.icon,
                    code: leaf.code,
                });
                menuInfoStore.changeTabsValue(leaf.url);
                router.push(leaf.url);
            }
        }
    };

    return {
        allArray,
        firstLevelMenus,
        subMenuList,
        activeFirstKey,
        handleSelectFirstLevel,
    };
}
