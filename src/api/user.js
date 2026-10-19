import { oGet, oPost } from '@/utils/request';

/**
 * 分页查询内部用户列表
 */
export function getUserList(params = {}) {
    return oGet('/internalusers/find', params);
}

/**
 * 获取全量用户列表（不分页）
 */
export function getAllUsers(params = {}) {
    return oGet('/internalusers/findAll', params);
}

/**
 * 新增内部用户
 */
export function addUser(params) {
    return oPost('/internalusers/add', params);
}

/**
 * 更新内部用户
 */
export function updateUser(params) {
    return oPost('/internalusers/update', params);
}

/**
 * 删除内部用户
 */
export function deleteUser(params) {
    return oPost('/internalusers/delete', params);
}

/**
 * 获取用户详情
 */
export function getUserDetail(params) {
    return oGet('/internalusers/detail', params);
}

/**
 * 切换用户启用/禁用状态
 */
export function banUser(params) {
    return oPost('/internalusers/ban', params);
}

/**
 * 更新当前用户主题
 */
export function updateTheme(params) {
    return oPost('/internalusers/updateTheme', params);
}

/**
 * 获取当前登录用户信息
 */
export function getUserInfo(params = {}) {
    return oGet('/internalusers/getUserInfo', params);
}
