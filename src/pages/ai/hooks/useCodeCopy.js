// hooks/useCodeCopy.js
import { onMounted } from 'vue';

export function useCodeCopy() {
    const handleCopyButtonClick = (event) => {
        const target = event.target;

        // 检查是否点击了复制按钮
        if (target.classList.contains('copy-button')) {
            const button = target;
            const preElement = button.closest('pre'); // 找到最近的 <pre> 元素
            const codeElement = preElement.querySelector('code'); // 获取 <code> 元素
            const codeText = codeElement.textContent; // 获取代码内容

            try {
                // 重置所有按钮状态
                document.querySelectorAll('.copy-button').forEach((btn) => {
                    btn.textContent = '复制';
                });

                // 执行复制操作
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(codeText).then(() => {
                        button.textContent = '已复制';
                    });
                } else {
                    // 备用方案：使用 document.execCommand('copy')
                    const textarea = document.createElement('textarea');
                    textarea.value = codeText;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    button.textContent = '已复制';
                }
                // 自动恢复为“复制”
                // setTimeout(() => {
                //     button.textContent = '复制';
                // }, 2000); // 2秒后恢复
            } catch (error) {
                console.error('复制失败', error);
            }
        }
    };

    onMounted(() => {
        // 使用事件委托监听复制按钮点击事件
        document.body.addEventListener('click', handleCopyButtonClick);

        // 在组件卸载时移除事件监听器
        return () => {
            document.body.removeEventListener('click', handleCopyButtonClick);
        };
    });
}