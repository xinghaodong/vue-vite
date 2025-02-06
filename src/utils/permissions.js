import useMenuStore from '@/stortes/menu'; // 引入仓库
// 把函数proxy 代理到vue 全局 在模板的用法 v-if="proxy.$checkPermissions(['add:user'])"
export function checkPermissions(value) {
    const useMenuStoresdata = useMenuStore();
    if (value && value instanceof Array && value.length > 0) {
        const permissions = useMenuStoresdata.btnPermsArry;
        const permissionDatas = value;
        const all_permission = '*:*:*';

        const hasPermission = permissions.some(permission => {
            return all_permission === permission || permissionDatas.includes(permission);
        });

        if (!hasPermission) {
            return false;
        }
        return true;
    } else {
        return false;
    }
}
