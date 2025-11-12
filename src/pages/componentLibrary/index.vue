<template>
    <div>
        <myInput v-model="value" :precision="2" style="width: 240px" text-align="right"> </myInput>
        <MyInputNumber v-model="value1" placeholder="我是安装好的组件" style="width: 240px" :precision="0" text-align="left"></MyInputNumber>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import myInput from './com/myInput.vue';

const value = ref();
const value1 = ref();
</script>

<style lang="css" scoped></style>
