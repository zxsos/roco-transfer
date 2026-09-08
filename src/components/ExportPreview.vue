<template>
  <!-- 导出图的预览层。
       微信内置浏览器不认 a[download](尤其 iOS 的 WKWebView),点「导出」只会
       没反应或被拦。微信里的通用做法是:把图显示出来,让用户**长按**保存/转发。
       所以这个层在微信内就是导出流程的终点;其他浏览器下仍是常规下载。 -->
  <div v-if="src" class="ep-mask" @click.self="emit('close')">
    <div class="ep-panel">
      <!-- 提示必须放在图片**外面**:盖在图上会挡住长按手势 -->
      <div class="ep-tip">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
        </svg>
        <span v-if="isWeixin">长按图片 → 保存图片 / 发送给朋友</span>
        <span v-else>在图片上点右键可保存</span>
      </div>

      <img :src="src" class="ep-img" alt="传火方案" />

      <div class="ep-actions">
        <button class="btn btn-secondary btn-sm" type="button" @click="emit('close')">关闭</button>
        <button
          v-if="!isWeixin"
          class="btn btn-primary btn-sm"
          type="button"
          @click="download"
        >下载</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  src: { type: String, default: '' },
  filename: { type: String, default: '传火方案.png' },
})
const emit = defineEmits(['close'])

const isWeixin = computed(() =>
  typeof navigator !== 'undefined' && /MicroMessenger/i.test(navigator.userAgent || ''),
)

function download() {
  const a = document.createElement('a')
  a.download = props.filename
  a.href = props.src
  a.click()
}
</script>

<style scoped>
.ep-mask {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  justify-content: center;
  padding: 16px 12px 28px;
  background: rgba(0, 0, 0, 0.88);
  /* 长图要能滚着看 */
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.ep-panel {
  width: 100%;
  max-width: 560px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.ep-tip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--radius-full, 999px);
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  font-size: 12.5px;
  font-weight: 600;
}

.ep-img {
  display: block;
  width: 100%;
  border-radius: 10px;
  background: #fff;
}

.ep-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}
</style>
