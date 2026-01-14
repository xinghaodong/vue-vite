<script setup>
import MarkdownRender from 'markstream-vue';
import { ref } from 'vue';

const content = ref('');
const fullContent = `# 以下是两段简单的 JavaScript 代码示例：

\`\`\`javascript
// 示例1：初始化一个空数组并输出结果
let arr = [];
console.log(arr);

// 示例2：创建一个包含数字0到5的数组，并输出结果
let numbers = [0, 1, 2, 3, 4, 5];
console.log(numbers);
\`\`\`

这两段代码展示了 JavaScript 的基本语法和用法，能够帮助你学习基础 JavaScript 知识。`;

let i = 0;
const interval = setInterval(() => {
    if (i < fullContent.length) {
        content.value += fullContent[i];
        i++;
    } else {
        clearInterval(interval);
    }
}, 50);
</script>

<template>
    <MarkdownRender :content="content" />
</template>
