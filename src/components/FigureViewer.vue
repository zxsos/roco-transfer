<template>
  <!-- 大图预览:点缩略图后全屏铺开。
       不用 <dialog> 或依赖库 —— 一个 fixed 层 + 点击关闭就够了,
       也避免在微信内置浏览器里踩 <dialog> 的兼容坑。 -->
  <Transition name="fv">
    <div
      v-if="fig"
      class="fv-mask"
      role="dialog"
      aria-modal="true"
      :aria-label="`${fig.name}介绍图`"
      @click.self="close"
    >
      <div class="fv-box">
        <div class="fv-head">
          <span class="fv-title">{{ fig.name }} · 介绍图</span>
          <button class="fv-close" type="button" aria-label="关闭" @click="close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div class="fv-body" @click.self="close">
          <img :src="fig.src" :alt="`${fig.name}介绍图`" />
        </div>

        <p class="fv-hint">点击空白处或按 Esc 关闭</p>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  fig: { type: Object, default: null }, // { src, name } | null
})
const emit = defineEmits(['close'])

function close() {
  emit('close')
}

function onKey(e) {
  if (e.key === 'Escape') close()
}

// 锁背景滚动:否则手机上滑大图会带动后面的页面。
//
// **用 watch 而不是 onMounted**:本组件由父级的 v-if 控制显示,每次打开都是
// 新的挂载吗?—— 不是,父级传的是同一个 <FigureViewer>,靠 fig 是否为 null
// 决定内部 v-if。所以 onMounted 只跑一次,关掉后再打开就不会再锁;
// 而 onUnmounted 也不会执行,于是 overflow 卡在 hidden,页面再也滚不动。
let prevOverflow = ''

watch(
  () => !!props.fig,
  (open) => {
    if (open) {
      prevOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    } else {
      // 还原成打开前的值(而不是清空)—— 页面自身可能本来就设了 overflow
      document.body.style.overflow = prevOverflow
    }
  },
)

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  // 兜底:组件真被卸载时确保恢复,避免异常路径下锁死滚动
  document.body.style.overflow = prevOverflow
})
</script>

<style scoped>
.fv-mask {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.fv-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: min(100%, 1000px);
  max-height: 100%;
}

.fv-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #fff;
}

.fv-title {
  font-size: 14px;
  font-weight: 600;
}

.fv-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  cursor: pointer;
  transition: background 0.18s var(--ease-out);
}

.fv-close:hover {
  background: rgba(255, 255, 255, 0.26);
}

.fv-body {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  overflow: auto;
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.06);
}

.fv-body img {
  display: block;
  max-width: 100%;
  max-height: 100%;
  /* 大图按容器等比缩放,不裁切 —— 介绍图的信息要完整可见 */
  object-fit: contain;
}

.fv-hint {
  margin: 0;
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

/* 进出场:淡入 + 轻微放大 */
.fv-enter-active,
.fv-leave-active {
  transition: opacity 0.22s var(--ease-out);
}
.fv-enter-from,
.fv-leave-to {
  opacity: 0;
}
.fv-enter-active .fv-box,
.fv-leave-active .fv-box {
  transition: transform 0.22s var(--ease-out);
}
.fv-enter-from .fv-box,
.fv-leave-to .fv-box {
  transform: scale(0.96);
}

@media (prefers-reduced-motion: reduce) {
  .fv-enter-active,
  .fv-leave-active,
  .fv-enter-active .fv-box,
  .fv-leave-active .fv-box {
    transition: none;
  }
}

@media (max-width: 560px) {
  .fv-mask {
    padding: 10px;
  }
}
</style>
