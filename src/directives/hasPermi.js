import useMenuStore from '@/stortes/menu'; // 引入仓库
// 自定义指令 v-has-permi
export default {
    mounted(el, binding) {
        const useMenuStoresdata = useMenuStore();
        const permissions = useMenuStoresdata.btnPermsArry;
        const requiredPermissions = binding.value; // 获取传递的权限数组
        const all_permission = '*:*:*'; // 假设有一个表示所有权限的值

        // 判断是否拥有权限
        const hasPermission = permissions.some(permission => {
            return all_permission === permission || requiredPermissions.includes(permission);
        });

        // 如果没有权限，隐藏元素
        if (!hasPermission) {
            el.style.display = 'none';
        } else {
            el.style.display = ''; // 如果有权限，显示元素
        }
    },
};
