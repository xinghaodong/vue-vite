<template>
    <div>
        商品列表
        <el-input-number v-model="value" @change="inputChange" :min="1" :max="10" aria-label="label"></el-input-number>
    </div>
</template>
<script setup>
import { ref } from 'vue';

const value = ref(1);
const inputChange = val => {
    console.log(val);
};
</script>
