import { oGet, oPost } from '@/utils/request';

/**
 * 获取组织架构树形列表
 */
export function getOrganizationList(params = {}) {
    return oGet('/orgManagement', params);
}

/**
 * 新增组织
 */
export function addOrganization(params) {
    return oPost('/orgManagement/add', params);
}

/**
 * 获取组织详情
 */
export function getOrganizationDetail(params) {
    return oGet('/orgManagement/detail', params);
}

/**
 * 修改组织
 */
export function updateOrganization(params) {
    return oPost('/orgManagement/update', params);
}

/**
 * 删除组织
 */
export function deleteOrganization(params) {
    return oPost('/orgManagement/delete', params);
}

/**
 * 别名兼容
 */
export const detailOrganization = getOrganizationDetail;
