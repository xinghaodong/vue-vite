import { oGet, oPost } from '@/utils/request';

/**
 * 获取角色列表
 */
export function getRoleList(params = {}) {
    return oGet('/role/findAll', params);
}

/**
 * 添加角色
 */
export function addRoles(params) {
    return oPost('/role/create', params);
}

/**
 * 修改角色
 */
export function updateRoles(params) {
    return oPost('/role/update', params);
}

/**
 * 获取角色详情
 */
export function detailRoles(params) {
    return oGet('/role/detail', params);
}

/**
 * 删除角色
 */
export function deleteRoles(params) {
    return oPost('/role/remove', params);
}

/**
 * 获取角色已分配的菜单权限ID列表
 */
export function getRoleMenus(params) {
    return oGet('/role/getRoleMenus', params);
}

/**
 * 给角色分配菜单权限
 */
export function assignMenusToRole(params) {
    return oPost('/role/assignMenusToRole', params);
}

/**
 * 获取所有菜单权限树资源
 */
export function getAllMenus(params = {}) {
    return oGet('/menus', params);
}
