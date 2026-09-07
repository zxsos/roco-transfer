# 洛克王国通行证拼团结算工具

一个用于计算《洛克王国》通行证「传火」拼团方案的网页工具。自动生成最优传火链条、计算每人应付金额与转账指令，并支持一键导出图片分享。

> 在线体验：<https://rocom-pass-the-torch.pages.dev/>

## 房间：多人一起填

把链接发到群里，每个人点开填自己的信息，所有人看到同一份数据：

1. 点「创建房间」，复制生成的链接发到群里
2. 成员点开链接自动进入同一房间（链接里的 `?r=<房间码>` 生效）
3. 各自填完点「确认」，数据自动汇总；约 15 秒同步一次
4. 任何人都可点「生成传火方案」看结果

- 不建房间也能用，此时就是纯本地（与以前一样），不强制联网
- 头像会随房间同步，群里能看到彼此头像
- 删除成员需二次确认；删除后别人的旧数据不会把它「复活」
- 房间码是 16 位随机串，知道码才能读写；数据 72 小时自动过期，也可手动删除房间
- 头像等数据存在 Cloudflare KV（美国节点），介意的话可以不建房间、纯本地使用

## 功能特性

- 🔥 **传火链条自动编排**：根据每人需要的精灵（精灵1 / 精灵2 / 都行），通过 DFS + 回溯算法生成满足「精灵交替」规则的最优链条。
- 👥 **车头 / 车尾指定**：支持手动锁定链条的起点和终点。
- 🤝 **好友关系优先**：录入好友关系后，链条会优先把好友排在相邻位置（副券需互为好友才能赠送），并对非好友相邻段给出提示。
- 💰 **费用自动结算**：根据档次（普通 68 元 / 高级 128 元）自动计算总价、人均费用、差额平摊和每人的转账指令（向谁转多少、原因）。
- 📊 **方案卡片可视化**：每位成员一张卡片，包含角色（源头 / 中间人 / 车尾）、所购通行证、应收应付明细、好友状态。
- 🖼️ **一键导出图片**：基于 html2canvas 将完整方案导出为 PNG 图片，方便群内分享。
- 🪪 **可选头像与 ID**：每位成员可粘贴（Ctrl+V）/ 上传图片设置头像，自动等比压缩至 128 × 128；可填入自定义 ID / 备注，会在链条与卡片上一并显示。
- 💾 **配置导入 / 导出**：将当前人员、好友关系、档次等配置保存为 JSON 文件，下次直接导入复用，跨设备 / 长期方案管理无忧。
- 📱 **响应式适配**：手机端紧凑单列、PC 端宽屏双列布局（左侧表单常驻，右侧结果卡片），自动跟随系统深色模式。
- 👤 **预置成员**：把 `名称-UID.jpg` 放进 `users/` 目录，页面加载时自动录入（详见该目录的 README）。

## 玩法背景

洛克王国通行证支持「副券」机制：购买通行证后可向好友赠送副券激活其通行证，副券价格远低于通行证原价。多人组成「传火链条」交替购买可让每人均摊到更低的价格。

价格表（默认）：

| 档次 | 通行证 | 副券 |
| --- | --- | --- |
| 普通 | 68 元 | 40 元 |
| 高级 | 128 元 | 80 元 |

链条规则：相邻两人必须购买不同的精灵通行证（即「精灵交替」），且需互为好友才能赠送副券。

> 算法上，**好友关系是软约束**：它不参与可行性判定，只作为优化目标（尽量让好友相邻）
> 与事后提示。硬性要求「相邻必为好友」极易导致无解，而现实中非好友相邻也能靠临时
> 加好友解决。

## 技术栈

- Vue 3 + Vite 6
- html2canvas 导出图片

> 早期版本使用 Element Plus，已于 2026-07 移除以减小打包体积（见 commit `330e7f3`）。

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 本地预览构建产物
npm run preview
```

## 部署

站点跑在 **Cloudflare Pages**（前端 + Functions 同仓库同部署），地址
<https://rocom-pass-the-torch.pages.dev/>。

```bash
npm run build
npx wrangler pages deploy dist --project-name rocom-pass-the-torch
```

房间数据存在 Workers KV（`wrangler.toml` 里的 `ROOMS` 绑定）。首次部署前需要创建它，并把返回的 id 填进 `wrangler.toml`：

```bash
npx wrangler kv namespace create ROOMS
```

> 已从 GitHub Pages 迁移过来，旧的 `zxsos.github.io/roco-transfer/` 不再更新。

## 项目结构

```
.
├── index.html                # 入口 HTML
├── vite.config.js            # Vite 配置（含 BASE_URL）
├── src/
│   ├── main.js               # Vue 应用入口
│   ├── App.vue               # 主界面（人物录入、好友关系、结果展示）
│   └── utils/
│       └── calculator.js     # 链条搜索 & 费用结算核心算法
├── users/                    # 预置成员头像（名称-UID.jpg，自动录入）
├── public/                   # 静态资源
├── functions/api/room.js     # 房间 API（GET 拉取 / POST upsert / DELETE 销毁）
├── wrangler.toml             # Cloudflare Pages 项目 + KV 绑定
```

## 核心算法

`src/utils/calculator.js` 中的 `generatePlan()` 是核心入口：

1. 校验输入：人数 ≥ 2，车头 / 车尾各最多一人且不能相同。
2. 构建好友邻接表：基于双向好友对。
3. DFS 搜索链条：从车尾向车头回溯，每步选择满足「精灵交替」的候选人；以「好友相邻段数量」为评分函数贪心剪枝，保留最高分链条。
4. 结算费用：源头垫付通行证 + 一张副券，其余人各付一张副券给上家，再按差额向源头平摊。

## 配置文件格式

点击页面顶部「导出」按钮可下载当前配置 JSON。文件结构如下：

```json
{
  "version": 1,
  "exportedAt": "2026-05-21T12:00:00.000Z",
  "tier": "normal",
  "elfName1": "迪莫",
  "elfName2": "亚比",
  "people": [
    { "id": 1, "name": "张三", "userId": "QQ123",  "avatar": "data:image/jpeg;base64,...", "needElf": "elf1", "isHead": true,  "isTail": false },
    { "id": 2, "name": "李四", "userId": "",       "avatar": "",                          "needElf": "elf2", "isHead": false, "isTail": false },
    { "id": 3, "name": "王五", "userId": "wuwang", "avatar": "",                          "needElf": "any",  "isHead": false, "isTail": true  }
  ],
  "friendships": [[1, 2], [2, 3]]
}
```

- `tier`：档次，可选 `normal` / `premium`
- `needElf`：精灵需求，可选 `elf1` / `elf2` / `any`
- `userId`：可选字段，自定义的 ID 或备注（如游戏 ID、QQ 号）
- `avatar`：可选字段，`data:image/...` 形式的图片 data URL；导入时仅接受合法图片 data URL，其他值会被清空
- `friendships`：双向好友对，元素为 `[idA, idB]`，使用 `people` 中的 `id` 进行关联

导入时会进行结构校验与 id 合法性检查，非法字段会被忽略而非中断流程。

## 许可

仅供学习交流使用。

本项目 fork 自 [fhyxz001/txz2](https://github.com/fhyxz001/txz2)。
