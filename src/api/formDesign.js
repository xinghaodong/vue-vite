import { oGet, oPost } from '@/utils/request';

/**
 * 分页查询动态表单列表
 */
export function getFormDesignList(params = {}) {
    return oGet('/form-design/find', params);
}

/**
 * 不分页获取所有表单设计列表
 */
export function getAllFormDesigns(params = {}) {
    return oGet('/form-design/findAll', params);
}

/**
 * 获取动态表单设计详情
 */
export function getFormDesignDetail(params) {
    return oGet('/form-design/detail', params);
}

/**
 * 新增动态表单设计
 */
export function addFormDesign(params) {
    return oPost('/form-design/add', params);
}

/**
 * 更新动态表单设计
 */
export function updateFormDesign(params) {
    return oPost('/form-design/update', params);
}

/**
 * 删除动态表单设计
 */
export function deleteFormDesign(params) {
    return oPost('/form-design/remove', params);
}

/**
 * 修改表单设计状态
 */
export function updateFormDesignStatus(params) {
    return oPost('/form-design/updateStatus', params);
}

/**
 * 别名兼容导出
 */
export const designDetail = getFormDesignDetail;
export const designQuery = getFormDesignList;
export const designNoPage = getAllFormDesigns;
export const designAdd = addFormDesign;
export const designUpdate = updateFormDesign;
export const designDelete = deleteFormDesign;
export const designStatus = updateFormDesignStatus;
