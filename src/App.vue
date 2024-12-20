<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="android-app">
    <div class="status-bar"></div>
    <div class="app-content">
      <router-view></router-view>
    </div>
    <div class="navigation-bar"></div>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

body {
  font-family: Roboto, sans-serif;
  background-color: #FFFFFF;
  color: #212121;
  overscroll-behavior: none;
}

.android-app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.status-bar {
  height: env(safe-area-inset-top, 24px);
  background-color: #f5f5f5;
}

.app-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.navigation-bar {
  height: env(safe-area-inset-bottom, 48px);
  background-color: #f5f5f5;
}

/* 안드로이드 스타일 버튼 */
.android-button {
  background-color: #6200EE;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  elevation: 2;
  cursor: pointer;
}

.android-button:active {
  background-color: #3700B3;
}

/* 안드로이드 스타일 입력 필드 */
.android-input {
  width: 100%;
  padding: 12px 16px;
  border: none;
  border-bottom: 1px solid #757575;
  font-size: 16px;
  background-color: transparent;
}

.android-input:focus {
  border-bottom: 2px solid #6200EE;
  outline: none;
}
</style>
