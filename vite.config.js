import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: process.env.BASE_URL || '/',
  server: {
    // 开发容器通过 cnb 分配的代理域名(如 xxx-5173.cnb.run)访问,
    // Vite 默认只放行 localhost,否则直接回 "Blocked request"。
    //
    // 这里只放行 cnb 平台的两个域名后缀(含其子域),**不用** allowedHosts: true
    // —— 那会放行任意 Host,把 dev server 暴露给 DNS rebinding。
    // 必须以 . 开头才表示「含子域」:Vite 的匹配是 hostname.endsWith(allowedHost),
    // 写 'cnb.run' 只精确匹配自身,匹配不到 xxx-5173.cnb.run。
    allowedHosts: ['.cnb.run', '.cnb.cool'],
  },
})