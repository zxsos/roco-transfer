<template>
  <!-- 缩略图:小方块,点一下开大图。
       没配图(src 为空)时整个不渲染 —— 不占地方,也不显示占位框。 -->
  <button
    v-if="src"
    class="elf-figure"
    type="button"
    :title="`查看${name}介绍图`"
    :aria-label="`查看${name}介绍图`"
    @click="onOpen && onOpen({ src, name })"
  >
    <img :src="src" :alt="`${name}介绍图`" loading="lazy" decoding="async" />
    <span class="elf-figure-zoom">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
      </svg>
    </span>
  </button>
</template>

<script setup>
// 精灵介绍图的缩略图入口。
//
// 刻意做成「缩略图 + 点击放大」而不是直接铺开大图:介绍图是 4K(3840×2160),
// 直接内嵌会撑爆卡片布局,也要白白下载 388KB/张。缩略图交给浏览器按 CSS 尺寸
// 缩放渲染,点开看大图时才用得上原图细节。
defineProps({
  src: { type: String, default: '' },
  name: { type: String, default: '精灵' },
  onOpen: { type: Function, default: null },
})
</script>

<style scoped>
.elf-figure {
  flex: none;
  position: relative;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  overflow: hidden;
  background: var(--fill);
  cursor: pointer;
  transition: border-color 0.18s var(--ease-out), transform 0.18s var(--ease-out);
}

.elf-figure:hover {
  border-color: var(--accent);
  transform: scale(1.06);
}

.elf-figure:focus-visible {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft, rgba(255, 107, 53, 0.15));
}

.elf-figure img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 右下角放大镜角标:提示"可点开看大图",否则小方块看着像装饰 */
.elf-figure-zoom {
  position: absolute;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-top-left-radius: 4px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
}
</style>
