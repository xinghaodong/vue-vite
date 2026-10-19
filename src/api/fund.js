import { oGet, oPost } from '@/utils/request';

/**
 * 分页获取关注的公募基金及重仓股列表
 */
export function getFundList(params = {}) {
    return oGet('/fund-estimate', params);
}

/**
 * 远程检索基金（支持代号、拼音、中文名称联想）
 */
export function getFundSearch(params) {
    return oGet('/fund-estimate/search', params);
}

/**
 * 批量添加/关注基金
 */
export function addFund(params) {
    return oPost('/fund-estimate/batch', params);
}

/**
 * 取消关注/删除基金记录
 */
export function deleteFund(params) {
    return oPost('/fund-estimate/delete', params);
}
