<template>
    <div id="app">
        <router-view></router-view>
    </div>
</template>
<script setup></script>

<style>
html,
body,
#app {
    margin: 0;
    padding: 0;
    height: 100%;
}

#app {
    display: flex;
    /* flex-direction: column; */
    width: 100%;
}
.mb-4 {
    margin-bottom: 16px;
}
.table {
    display: block !important;
}
/*#nprogress .bar {
    background-color: red !important;
}*/
</style>
