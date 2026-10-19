import { oGet, oPost } from '@/utils/request';

/**
 * 获取全量菜单权限树列表
 */
export function getMenuList(params = {}) {
    return oGet('/menus', params);
}

/**
 * 新增菜单
 */
export function addMenu(params) {
    return oPost('/menus/addmenu', params);
}

/**
 * 修改菜单
 */
export function updateMenu(params) {
    return oPost('/menus/update', params);
}

/**
 * 删除菜单
 */
export function deleteMenu(params) {
    return oPost('/menus/deletemenu', params);
}

/**
 * 获取菜单详情
 */
export function getMenuDetail(params) {
    return oGet('/menus/detail', params);
}

/**
 * 根据父级 ID 获取直接子菜单列表（用于拖拽排序）
 */
export function getMenusByPid(params) {
    return oGet('/menus/getMenusByPid', params);
}

/**
 * 保存菜单排序
 */
export function saveMenuSort(params) {
    return oPost('/menus/saveMenuSort', params);
}
