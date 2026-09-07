<template>
  <div class="app-container" :class="{ 'theme-dark': resolvedTheme === 'dark' }">
    <div class="app-content">

      <!-- ===== HEADER ===== -->
      <header class="app-header">
        <div class="app-title">
          <svg class="app-title-icon" width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C9.5 2 7.5 4.5 8 7C5 6 3 10 5 13C3 16 5 20 9 20.5C10.5 21.5 13 21 14.5 19.5C14 21 14.5 22.5 16.5 22.5C18 22.5 18.5 21 18.5 20C21 19 22 16 20 13C22 10 19 6 16 7C16.5 4.5 14.5 2 12 2Z"
              fill="url(#title-fire-grad)"/>
            <defs>
              <linearGradient id="title-fire-grad" x1="12" y1="2" x2="12" y2="22.5" gradientUnits="userSpaceOnUse">
                <stop stop-color="#FF6B35"/><stop offset="1" stop-color="#FF3B30"/>
              </linearGradient>
            </defs>
          </svg>
          <span class="app-title-text">洛克王国通行证拼团结算</span>
        </div>
        <div class="app-header-actions">
          <!-- 主题切换 -->
          <button
            class="theme-toggle"
            :title="themeToggleLabel"
            @click="cycleTheme"
            aria-label="切换主题"
          >
            <!-- 三态图标:跟随系统 / 浅色 / 深色。
                 原先只按 resolvedTheme 二选一,跟随模式下显示的是太阳或月亮 ——
                 看不出处于跟随态,和它的 title「跟随系统」也对不上。 -->
            <svg v-if="themeMode === 'system'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none"/>
            </svg>
            <svg v-else-if="themeMode === 'light'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </button>
          <!-- 导出方案图:把结果存成图片发群里,是这个工具最常用的一步,
               放顶部比埋在结果区里好找。没有方案时禁用。
               (原先这里的「导入/导出 JSON」用不上 —— 有房间同步了。) -->
          <button
            class="btn btn-secondary btn-sm"
            :disabled="!planResult || exporting"
            @click="exportAllCards"
            title="把传火方案存成图片"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
            <span class="btn-text">{{ exporting ? '生成中…' : '导出方案图' }}</span>
          </button>
        </div>
      </header>

      <!-- ===== 房间条 =====
           未加入时两个按钮；已加入时显示房间码 + 复制 + 状态点 + 删除/退出。 -->
      <section class="card room-bar" :class="{ joined: roomState.joined }">
        <template v-if="!roomState.joined">
          <div class="room-intro">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            </svg>
            <span>建一个房间，把链接发到群里，每个人填自己的信息就会汇总到一起</span>
          </div>
          <div class="room-actions">
            <input
              v-model="roomInput"
              class="input room-code-input"
              placeholder="输入房间码"
              maxlength="16"
              @keydown.enter.prevent="doJoinRoom"
            />
            <button class="btn btn-secondary btn-sm" :disabled="!roomInput.trim()" @click="doJoinRoom">加入</button>
            <button class="btn btn-primary btn-sm" @click="doCreateRoom">创建房间</button>
          </div>
        </template>

        <template v-else>
          <div class="room-meta">
            <span class="room-dot" :class="roomState.status" :title="roomStatusText"></span>
            <span class="room-label">房间码</span>
            <code class="room-code">{{ roomState.code }}</code>
          </div>
          <div class="room-actions">
            <button class="btn btn-secondary btn-sm" @click="copyRoomLink">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              复制链接
            </button>
            <button class="btn btn-secondary btn-sm" @click="confirmDeleteRoom = true">删除房间</button>
            <button class="btn btn-ghost btn-sm" @click="doLeaveRoom">退出</button>
          </div>
        </template>

        <!-- 出错/房间已删的提示 -->
        <p v-if="roomState.lastError" class="room-msg" :class="{ warn: roomState.status === 'gone' }">
          {{ roomState.lastError }}
        </p>

        <!-- 删除房间二次确认:内联条,不用原生 confirm(移动端突兀且风格不统一) -->
        <div v-if="confirmDeleteRoom" class="room-confirm">
          <span>删除后群里所有人都会退回本地模式，且无法恢复。确定删除房间？</span>
          <div class="room-confirm-actions">
            <button class="btn btn-secondary btn-sm" @click="confirmDeleteRoom = false">取消</button>
            <button class="btn btn-danger btn-sm" @click="doDeleteRoom">删除房间</button>
          </div>
        </div>
      </section>

      <!-- ===== MAIN CONTENT ===== -->
      <div class="content-wrapper" :class="{ 'has-result': planResult && planResult.success }">

        <!-- ===== LEFT COLUMN: CONFIG ===== -->
        <div class="config-column">

          <!-- 档次与规则说明。档次已改为**每人独立**(在下方每个人表单里选),
               这里只保留价格表与赠送规则 —— 全局档次在新算法下没有意义。 -->
          <section class="card config-section">
            <h2 class="section-title">档次与规则</h2>
            <div class="tier-table">
              <div class="tier-row">
                <span class="tier-name">普通版</span>
                <span class="tier-price">{{ PRICE.normal.pass }} 元</span>
                <span class="tier-grant">可送 1 张普通副券（{{ PRICE.normal.coupon }} 元）</span>
              </div>
              <div class="tier-row">
                <span class="tier-name">豪华版</span>
                <span class="tier-price">{{ PRICE.premium.pass }} 元</span>
                <span class="tier-grant">可送 1 豪华 + 1 普通副券（{{ PRICE.premium.coupon }}/{{ PRICE.normal.coupon }} 元）</span>
              </div>
            </div>
            <p class="section-hint">
              副券必须是**另一种精灵**；想要豪华的人只能收豪华副券，普通同理。
              档次在下方每个人表单里单独选择。
            </p>
            <div class="elf-name-row">
              <div class="elf-name-field">
                <label class="field-label">精灵1</label>
                <input v-model="elfName1" placeholder="新月鹭" class="input" />
              </div>
              <div class="elf-name-field">
                <label class="field-label">精灵2</label>
                <input v-model="elfName2" placeholder="热团团" class="input" />
              </div>
            </div>

            <!-- 留空人数:0 = 只给确定方案(默认);拖到 1/2 才额外算
                 「再拉 N 个要 X 精灵的人进来能省多少」。 -->
            <div class="gap-field">
              <div class="gap-field-head">
                <label class="field-label" for="gap-range">最多留空</label>
                <span class="gap-value">{{ maxGaps }} 人</span>
              </div>
              <input
                id="gap-range"
                class="gap-range"
                type="range"
                min="0"
                max="2"
                step="1"
                v-model.number="maxGaps"
              />
              <div class="gap-ticks" aria-hidden="true">
                <span :class="{ on: maxGaps === 0 }">0</span>
                <span :class="{ on: maxGaps === 1 }">1</span>
                <span :class="{ on: maxGaps === 2 }">2</span>
              </div>
              <p class="section-hint">
                {{ maxGaps === 0
                  ? '0 = 只给确定的方案，不提示补人'
                  : `凑不齐或补人更划算时，会提示再拉 ${maxGaps} 个人能省多少` }}
              </p>
            </div>
          </section>

          <!-- 人物列表 -->
          <section class="card people-section">
            <div class="section-header">
              <h2 class="section-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="section-title-icon">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                人物列表
              </h2>
              <div class="section-actions-row">
                <button
                  v-if="people.length > 0"
                  class="btn btn-secondary btn-sm"
                  @click="resetAll"
                >重置</button>
                <button class="btn btn-primary btn-sm" @click="addPerson">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  添加
                </button>
              </div>
            </div>

            <!-- 空状态 -->
            <div v-if="people.length === 0" class="empty-state">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="empty-icon">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              <p class="empty-text">还没有添加人物</p>
              <p class="empty-sub">添加拼团成员后，下方将生成传火方案</p>
              <button class="btn btn-primary" @click="addPerson">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                添加第一个人
              </button>
            </div>

            <!-- 隐藏的文件输入 -->
            <input
              ref="avatarInputRef"
              type="file"
              accept="image/*"
              style="display: none"
              @change="handleAvatarFileSelected"
            />


            <!-- 人物列表 -->
            <TransitionGroup name="list" tag="div" class="person-list">
              <div
                v-for="(person, index) in people"
                :key="person.id"
                class="person-row"
                :class="{ 'is-collapsed': person.collapsed }"
              >
                <!-- ===== 折叠态:一行摘要 =====
                     填完后折叠,10 人时列表仍可扫视。整行可点展开编辑。 -->
                <!-- 用 template 包住折叠态的两个元素(摘要 + 删除确认条),
                     这样 v-else 能正确配对。此前确认条直接插在 v-if 与 v-else 之间,
                     破坏了分支 —— 折叠时展开态内容仍被渲染,卡片暴涨成一条。 -->
                <template v-if="person.collapsed">
                <div
                  class="person-summary"
                  role="button"
                  tabindex="0"
                  @click="toggleCollapse(person)"
                  @keydown.enter.prevent="toggleCollapse(person)"
                  @keydown.space.prevent="toggleCollapse(person)"
                  aria-label="展开编辑"
                >
                  <div
                    class="summary-avatar"
                    :class="{ 'has-image': person.avatar, 'has-initial': !person.avatar && person.name.trim() }"
                    :style="person.avatar ? { backgroundImage: `url(${person.avatar})` } : null"
                  >
                    <span v-if="!person.avatar">{{ initialOf(person.name) }}</span>
                  </div>
                  <div class="summary-main">
                    <div class="summary-name">
                      {{ person.name }}
                      <span v-if="person.userId" class="summary-id">#{{ person.userId }}</span>
                      <span v-if="person.isHead" class="summary-badge head">车头</span>
                    </div>
                    <div class="summary-tags">
                      <span class="summary-tag">{{ elfLabel(person.needElf) }}</span>
                      <span class="summary-tag" :class="{ premium: person.tier === 'premium' }">
                        {{ person.tier === 'premium' ? '豪华' : '普通' }}
                      </span>
                      <span v-if="friendCountOf(person.id) > 0" class="summary-tag friend">
                        好友 {{ friendCountOf(person.id) }}
                      </span>
                    </div>
                  </div>
                  <!-- 删除放在摘要行里:原来只在展开态有,删个人得先展开再删,
                       两步操作没必要。放在箭头前并阻止冒泡(否则会顺带展开)。 -->
                  <button
                    class="summary-del"
                    aria-label="删除"
                    title="删除"
                    @click.stop="removePerson(index)"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                  <svg class="summary-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>

                <!-- 折叠态的删除确认条(在折叠分支内,独占一行) -->
                <div v-if="pendingDeleteIndex === index" class="person-confirm-del wide">
                  <span>删除「{{ person.name }}」？</span>
                  <div class="person-confirm-actions">
                    <button class="btn btn-secondary btn-sm" @click="cancelDeletePerson">取消</button>
                    <button class="btn btn-danger btn-sm" @click="confirmDeletePerson">删除</button>
                  </div>
                </div>
                </template>

                <!-- ===== 展开态 ===== -->
                <template v-else>
                <!-- 头像 -->
                <div
                  class="person-avatar"
                  :class="{ 'has-image': person.avatar, 'has-initial': !person.avatar && person.name.trim() }"
                  :style="person.avatar ? { backgroundImage: `url(${person.avatar})` } : null"
                  tabindex="0"
                  :title="person.avatar ? '点击更换 / 粘贴图片 / Delete 清除' : '点击上传 / 粘贴图片设置头像'"
                  @click="triggerAvatarPicker(person)"
                  @paste="handleAvatarPaste($event, person)"
                  @keydown.delete.prevent="clearAvatar(person)"
                  @keydown.backspace.prevent="clearAvatar(person)"
                >
                  <!-- 没传图时显示昵称首字:链条/卡片里认人靠的是名字,一个
                       灰色加号在十几个成员里完全没有辨识度。 -->
                  <span v-if="!person.avatar" class="avatar-initial">{{ initialOf(person.name) }}</span>
                  <svg v-if="!person.avatar && !person.name.trim()" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  <button
                    v-if="person.avatar"
                    class="avatar-clear"
                    title="清除头像"
                    @click.stop="clearAvatar(person)"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>

                <!-- 字段 -->
                <div class="person-fields">
                  <div class="person-field name-field">
                    <label class="field-label">姓名</label>
                    <input
                      v-model="person.name"
                      placeholder="输入姓名"
                      class="input"
                      @keydown.enter.prevent="confirmPerson(person)"
                    />
                  </div>
                  <div class="person-field id-field">
                    <label class="field-label">ID（选填）</label>
                    <input v-model="person.userId" placeholder="游戏 ID / 备注" class="input" />
                  </div>
                  <div class="person-field elf-field">
                    <label class="field-label">需求精灵</label>
                    <div class="elf-radio-group">
                      <button
                        class="elf-radio-btn"
                        :class="{ active: person.needElf === 'elf1' }"
                        @click="person.needElf = 'elf1'"
                      >{{ elfName1 || '新月鹭' }}</button>
                      <button
                        class="elf-radio-btn"
                        :class="{ active: person.needElf === 'elf2' }"
                        @click="person.needElf = 'elf2'"
                      >{{ elfName2 || '热团团' }}</button>
                      <button
                        class="elf-radio-btn"
                        :class="{ active: person.needElf === 'any' }"
                        @click="person.needElf = 'any'"
                      >都行</button>
                    </div>
                  </div>

                  <!-- 档次:每人独立。豪华版能送 1 豪华 + 1 普通副券,普通版只送 1 张普通,
                       这个差异决定树的形状,不能像旧版那样全局统一。 -->
                  <div class="person-field tier-field">
                    <label class="field-label">档次</label>
                    <div class="elf-radio-group tier-radio-group">
                      <button
                        class="elf-radio-btn tier-btn"
                        :class="{ active: person.tier === 'normal' }"
                        :disabled="person.isHead"
                        :title="person.isHead ? '车头必须是豪华版' : null"
                        @click="person.tier = 'normal'"
                      >普通 68</button>
                      <button
                        class="elf-radio-btn tier-btn"
                        :class="{ active: (person.tier || 'normal') === 'premium' }"
                        @click="person.tier = 'premium'"
                      >豪华 128</button>
                    </div>
                  </div>
                  <!-- 车头:自购源头 + 群收款收款人,必须豪华(普通版送不出豪华副券,
                       树会长不开)。设为车头时自动切豪华,故普通按钮在车头态禁用。

                       车头已定时,**其余成员不再显示这个开关** —— 一群人里只能
                       有一个车头,留着开关只会让人反复去点、然后互相顶掉。
                       车头本人保留开关用于取消。 -->
                  <div v-if="showHeadToggle(person)" class="person-field toggle-field">
                    <label class="field-label">车头</label>
                    <button
                      class="toggle"
                      :class="{ active: person.isHead }"
                      @click="onHeadToggle(person)"
                      :aria-label="person.isHead ? '取消车头' : '设为车头'"
                    >
                      <span class="toggle-knob"></span>
                    </button>
                  </div>

                  <!-- 好友勾选:只列**前面已添加**的人。
                       好友关系是双向的(甲是乙的好友 == 乙是甲的好友),所以
                       每对只需要在后添加的那个人身上勾一次 —— 这就是矩阵的
                       下三角,既不会漏也不会重复。
                       原先是一张 n×n 矩阵:10 个人要滚 100 格,而其中一半
                       是另一半的镜像,纯属重复劳动。 -->
                  <div v-if="index > 0" class="person-field friend-field">
                    <label class="field-label">好友</label>
                    <div class="fp-chips">
                      <button
                        v-for="prev in people.slice(0, index)"
                        :key="'f-' + prev.id"
                        class="fp-chip"
                        :class="{ active: isFriendPair(person.id, prev.id) }"
                        @click="toggleFriendCell(person.id, prev.id)"
                        :aria-pressed="isFriendPair(person.id, prev.id)"
                      >
                        <span class="fp-chip-box">
                          <svg v-if="isFriendPair(person.id, prev.id)" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </span>
                        {{ prev.name || '未命名' }}
                      </button>
                    </div>
                  </div>
                  <div v-else class="person-field friend-field">
                    <label class="field-label">好友</label>
                    <p class="friend-hint">第一个人无需选择，后续成员勾选与谁互为好友</p>
                  </div>

                  <!-- 确认:填完点它才折叠并置后。
                       早先是姓名框失焦自动折叠,但那样在只填了姓名、还没选精灵
                       和档次时也会被收起来 —— 点「确认」是明确的「我填完了」。 -->
                  <div class="person-field confirm-field">
                    <button
                      v-if="pendingDeleteIndex !== index"
                      class="btn btn-primary btn-sm person-confirm"
                      :disabled="!isFilled(person)"
                      @click="confirmPerson(person)"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      确认
                    </button>

                    <!-- 删除二次确认:内联在这个人的卡片里,指明删的是谁 -->
                    <div v-else class="person-confirm-del">
                      <span>删除「{{ person.name }}」？他的好友关系也会一并移除</span>
                      <div class="person-confirm-actions">
                        <button class="btn btn-secondary btn-sm" @click="cancelDeletePerson">取消</button>
                        <button class="btn btn-danger btn-sm" @click="confirmDeletePerson">删除</button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 删除按钮 -->
                <button class="person-delete" @click="removePerson(index)" aria-label="删除">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
                </template>
              </div>
            </TransitionGroup>
          </section>


          <!-- 生成/添加统一走底部常驻条;这里只留错误提示,不再重复一套操作按钮。 -->

          <!-- 错误提示 -->
          <Transition name="alert">
            <div v-if="errorMsg" class="alert alert-error">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="alert-icon">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span class="alert-text">{{ errorMsg }}</span>
              <button class="alert-close" @click="errorMsg = ''">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </Transition>

          <!-- 成功提示 -->
          <Transition name="alert">
            <div v-if="importToast" class="alert alert-success">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="alert-icon">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span class="alert-text">{{ importToast }}</span>
              <button class="alert-close" @click="importToast = ''">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </Transition>
        </div>

        <!-- ===== RIGHT COLUMN: RESULT ===== -->
        <div class="result-column">

          <!-- 空态:右列在生成前是空白的,大屏上整页只有左列一条,像"只占半个屏幕"。
               这里给一块与左栏等宽的占位,说明右侧会出现什么、怎么开始。 -->
          <div v-if="!planResult || !planResult.success" class="result-placeholder">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              <path d="M8 21h8"/>
              <path d="M12 17v4"/>
            </svg>
            <p class="ph-title">生成后这里会显示传火方案</p>
            <p class="ph-sub">左侧添加 {{ people.length >= 2 ? '成员信息后点' : '成员（至少 2 人），点' }}「生成传火方案」</p>
            <ul class="ph-list">
              <li>传火链条与每人角色</li>
              <li>每人应付金额与转账指令</li>
              <li>非好友相邻的提醒</li>
            </ul>
          </div>

          <TransitionGroup name="fade" tag="div" class="result-section">
            <template v-if="planResult && planResult.success">

              <!-- 导出按钮 -->
              <div key="export-bar" class="export-bar">
                <button class="btn btn-primary export-btn" :disabled="exporting" @click="exportAllCards">
                  <span v-if="exporting" class="spinner"></span>
                  {{ exporting ? '正在生成...' : '导出图片' }}
                </button>
              </div>

              <!-- 导出容器 -->
              <div ref="exportContainer" key="export-container" class="export-container">
                <div class="export-header">
                  <div class="export-title">洛克王国通行证拼团方案</div>
                  <!-- 档次已是每人独立,徽章改为展示"混合"或人数统计 -->
                  <div class="export-tier-badge">{{ tierSummary }}</div>
                </div>

                <!-- 费用总览 -->
                <section key="summary" class="card summary-section">
                  <h2 class="section-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="section-title-icon">
                      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                    </svg>
                    费用总览
                  </h2>
                  <div class="stat-grid">
                    <div class="stat-item">
                      <div class="stat-value">{{ planResult.chain.length }}<span class="stat-unit">人</span></div>
                      <div class="stat-label">参与人数</div>
                    </div>
                    <div class="stat-item">
                      <div class="stat-value">{{ planResult.totalGamePayment }}<span class="stat-unit">元</span></div>
                      <div class="stat-label">游戏总支付</div>
                    </div>
                    <div class="stat-item stat-highlight">
                      <div class="stat-value">{{ planResult.resultCards[0].perPerson }}<span class="stat-unit">元</span></div>
                      <div class="stat-label">每人均摊</div>
                    </div>
                    <div class="stat-item stat-save">
                      <div class="stat-value">{{ planResult.savings }}<span class="stat-unit">元</span></div>
                      <div class="stat-label">节省总额</div>
                    </div>
                  </div>
                </section>

                <!-- 群收款（微信原生账单） -->
                <section key="collect" class="wx-collect">
                  <!-- 发起人信息 -->
                  <div class="wx-collect-initiator">
                    <div
                      class="wx-collect-initiator-avatar"
                      :class="{ 'has-image': planResult.collectBill.head.avatar }"
                      :style="planResult.collectBill.head.avatar ? { backgroundImage: `url(${planResult.collectBill.head.avatar})` } : null"
                    >
                      <span v-if="!planResult.collectBill.head.avatar">{{ initialOf(planResult.collectBill.head.name) || '?' }}</span>
                    </div>
                    <div class="wx-collect-initiator-text">
                      <div class="wx-collect-initiator-title">{{ planResult.collectBill.head.name }}发起的群收款</div>
                      <div class="wx-collect-initiator-sub">共¥{{ planResult.collectBill.total.toFixed(2) }}，需收¥{{ planResult.collectBill.total.toFixed(2) }}</div>
                    </div>
                  </div>
                  <div class="wx-divider-thin"></div>

                  <!-- 收款状态 -->
                  <div class="wx-collect-status">
                    <span class="wx-collect-tab">拼团收款</span>
                    <div class="wx-collect-status-main">待收款</div>
                    <div class="wx-collect-status-sub">共¥{{ planResult.collectBill.total.toFixed(2) }} 元</div>
                  </div>
                  <div class="wx-divider-band"></div>

                  <!-- 支付统计 -->
                  <div class="wx-collect-stats">{{ planResult.collectBill.items.length }}人待支付</div>
                  <div class="wx-divider-thin"></div>

                  <!-- 成员列表 -->
                  <ul class="wx-collect-list">
                    <li
                      v-for="it in planResult.collectBill.items"
                      :key="'cb-' + it.person.id"
                      class="wx-collect-item"
                    >
                      <div
                        class="wx-collect-avatar"
                        :class="{ 'has-image': it.person.avatar }"
                        :style="it.person.avatar ? { backgroundImage: `url(${it.person.avatar})` } : null"
                      >
                        <span v-if="!it.person.avatar">{{ initialOf(it.person.name) || '?' }}</span>
                      </div>
                      <span class="wx-collect-member-name">{{ it.person.name }}</span>
                      <span class="wx-collect-item-amount">待支付 ¥{{ it.amount.toFixed(2) }}</span>
                    </li>
                  </ul>
                </section>

                <!-- 传火结构:豪华版能送 2 张,所以是**树**不是链。
                     按层分组展示:第 0 层自购,其余各层由上一层赠送激活。 -->
                <section key="chain" class="card chain-section">
                  <h2 class="section-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="section-title-icon">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                    传火结构
                  </h2>

                  <!-- 全员自购:没有任何赠送发生,必须说清楚,否则"省 0 元"像是算错了 -->
                  <div v-if="planResult.noGift" class="gap-tip gap-tip-warn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <span>{{ planResult.noGiftHint }}</span>
                  </div>

                  <!-- 补人建议:凑不齐时(或补人更划算时)给出 -->
                  <div v-if="planResult.gapSuggestion" class="gap-tip">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                    <span>
                      再拉
                      <b>{{ planResult.gapSuggestion.count }}</b>
                      个要「{{ planResult.gapSuggestion.elfName }}」的
                      {{ planResult.gapSuggestion.tier === 'premium' ? '豪华版' : '普通版' }}
                      → 人均
                      <b>{{ planResult.gapSuggestion.avgNow }}</b> 降到
                      <b>{{ planResult.gapSuggestion.avgAfter }}</b> 元
                      （每人省 {{ planResult.gapSuggestion.savePerPerson }} 元）
                    </span>
                  </div>

                  <div
                    v-for="(lv, li) in chainLevels"
                    :key="'lv-' + li"
                    class="chain-level"
                  >
                    <div class="chain-level-tag">{{ li === 0 ? '自购' : '第' + li + '层' }}</div>
                    <div class="chain-flow">
                      <template v-for="(item, idx) in lv" :key="item.person.id">
                        <div class="chain-node">
                          <div
                            class="chain-avatar"
                            :class="[li === 0 ? 'head' : item.children.length ? 'mid' : 'tail', { 'has-image': item.person.avatar }]"
                            :style="item.person.avatar ? { backgroundImage: `url(${item.person.avatar})` } : null"
                          >
                            <span v-if="!item.person.avatar">{{ initialOf(item.person.name) || '?' }}</span>
                          </div>
                          <div class="chain-name">{{ item.person.name }}</div>
                          <div v-if="item.person.userId" class="chain-user-id">#{{ item.person.userId }}</div>
                          <div class="chain-elf">
                            {{ getElfName(item.elf) }}
                            <span class="chain-tier">{{ item.tier === 'premium' ? '豪华' : '普通' }}</span>
                          </div>
                        </div>
                        <div v-if="idx < lv.length - 1" class="chain-arrow chain-arrow-side">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                        </div>
                      </template>
                    </div>
                  </div>
                </section>

                <!-- 确定方案前的待办
                     好友**不是**硬约束:不勾也能出方案(算法只把它当排序偏好)。
                     所以这里不是报错,而是「动手前先加这几对好友」的清单。
                     全部已勾则显示一个已就绪的绿条,让人知道不用额外做什么。 -->
                <div v-if="planResult.friendWarnings.length === 0" key="friend-ok" class="todo-box ok">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <div class="todo-detail">
                    <span class="todo-title">方案已就绪</span>
                    <span class="todo-sub">所有赠送双方都已是好友，可以直接按下面的转账执行</span>
                  </div>
                </div>

                <div v-else key="friend-warn" class="todo-box warn">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
                  </svg>
                  <div class="todo-detail">
                    <span class="todo-title">
                      确定方案前，还有 {{ planResult.friendWarnings.length }} 对需要先加好友
                    </span>
                    <span class="todo-sub">副券只能送给好友；加完后即可按下面的转账执行</span>
                    <div class="alert-tags">
                      <span v-for="(w, idx) in planResult.friendWarnings" :key="idx" class="alert-tag">
                        {{ w.from }} &harr; {{ w.to }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- 个人结算卡 -->
                <section
                  v-for="card in planResult.resultCards"
                  :key="'card-' + card.person.id"
                  class="card result-card"
                  :class="{
                    'card-head': card.role === '源头',
                    'card-end': card.role === '末端',
                  }"
                >
                  <div class="result-header">
                    <div class="result-identity">
                      <div
                        class="result-avatar"
                        :class="[card.role === '源头' ? 'head' : card.role === '末端' ? 'end' : 'mid', { 'has-image': card.person.avatar }]"
                        :style="card.person.avatar ? { backgroundImage: `url(${card.person.avatar})` } : null"
                      >
                        <span v-if="!card.person.avatar">{{ initialOf(card.person.name) || '?' }}</span>
                      </div>
                      <div>
                        <div class="result-name">
                          <span>{{ card.person.name }}</span>
                          <span v-if="card.person.userId" class="result-user-id">#{{ card.person.userId }}</span>
                        </div>
                        <div class="result-elf-badge">
                          {{ card.depth === 0 ? '自购' : '获得' }}「{{ card.myElfName }}」
                          <span class="result-tier-tag">{{ card.tier === 'premium' ? '豪华' : '普通' }}</span>
                        </div>
                      </div>
                    </div>
                    <span class="role-badge" :class="card.role">{{ card.role }}</span>
                  </div>

                  <ul class="line-list">
                    <li
                      v-for="(item, idx) in card.items"
                      :key="'i' + idx"
                      class="line-item"
                      :class="item.type"
                    >
                      <span class="line-amount" :class="item.type === 'expense' ? 'expense' : 'info'">
                        {{ item.type === 'expense' ? `-${item.amount}` : '副券' }}
                      </span>
                      <span class="line-label">{{ item.label }}</span>
                    </li>
                  </ul>

                  <div class="net-summary">
                    <span class="net-summary-label">净支出</span>
                    <span class="net-summary-value">{{ card.netExpense }} 元</span>
                  </div>

                  <div v-if="card.friendHints.length > 0" class="friend-chips">
                    <span
                      v-for="(h, idx) in card.friendHints"
                      :key="idx"
                      class="friend-chip"
                      :class="h.isFriend ? 'ok' : 'need'"
                    >
                      <span class="friend-chip-icon">{{ h.isFriend ? '✓' : '!' }}</span>
                      {{ h.type === 'prev' ? '上家' : '下家' }} {{ h.name }}
                      <span v-if="!h.isFriend" class="friend-chip-tag">需加好友</span>
                    </span>
                  </div>
                </section>
              </div>
            </template>
          </TransitionGroup>
        </div>
      </div>

      <!-- ===== 底部常驻操作条 =====
           全尺寸常驻(桌面端也显示):页面内的 action-bar 已删除,这里是唯一入口。
           结果区很长(树 + 每人一张卡片),滚到底后要一路滑回顶部才能改配置 ——
           常驻条消除这个往返,并把「添加成员」也放进来(主要操作都在手边)。 -->
      <div class="mobile-bar" :class="{ 'has-result': planResult && planResult.success }">
        <div class="mobile-bar-inner">
        <button
          class="btn btn-large mobile-bar-add"
          @click="addPerson"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span class="mobile-bar-add-text">添加成员</span>
        </button>
        <button
          class="btn btn-large btn-primary mobile-bar-main"
          :disabled="people.length < 2 || computing"
          @click="doGenerate"
        >
          <template v-if="computing">
            <span class="spinner"></span>
            计算中...
          </template>
          <template v-else>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            {{ planResult && planResult.success ? '重新生成方案' : '生成传火方案' }}
          </template>
        </button>
        <button
          class="mobile-bar-top"
          @click="scrollTop"
          aria-label="回到顶部"
          title="回到顶部"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
          </svg>
        </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { generatePlan, PRICE } from './utils/calculator.js'
import html2canvas from 'html2canvas'
import * as room from './room.js'

// ===== 状态 =====
const tier = ref('normal')
const elfName1 = ref('新月鹭')
const elfName2 = ref('热团团')

// maxGaps 最多留几个空位(0~2)。默认 0:只给确定方案,不提示补人。
// 使用者想要「再拉人能省多少」时再手动放开 —— 提示是可选信息,不该默认打扰。
const maxGaps = ref(0)

// 主题: 'system' | 'light' | 'dark'
const themeMode = ref('system')
const resolvedTheme = ref('light')

// newId 生成成员 id。
//
// **必须是随机串而不是自增数字**:id 是多人合并的唯一键,自增的话客户端 A、B
// 都会生成 id=1 的不同成员,一合并就互相覆盖。
//
// 用 randomUUID 但带降级:它是 Secure Context 专属,手机通过局域网
// (http://192.168.x.x) 访问时不可用,此时退回 Math.random。
// 取 UUID 前 8 位(hex,不含 '-'),保证好友 key 的 split('-') 仍安全。
function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().slice(0, 8)
  }
  return Math.random().toString(36).slice(2, 10)
}
const people = reactive([])
const friendships = reactive(new Map())
const planResult = ref(null)
const errorMsg = ref('')
const importToast = ref('')
const exporting = ref(false)
const computing = ref(false)
const exportContainer = ref(null)
const avatarInputRef = ref(null)
let avatarTargetId = null

// ===== 房间 =====
const roomInput = ref('')
const confirmDeleteRoom = ref(false)

// 暴露给模板:roomState 是 reactive,模板里直接 roomState.xxx 即可(自动解包)
const roomState = room.roomState

const roomStatusText = computed(() => {
  const s = roomState.status
  return s === 'synced' ? '已同步' : s === 'syncing' ? '同步中' : s === 'gone' ? '房间已删除' : s === 'error' ? '同步出错' : '未加入房间'
})

// 交给 room.js 的两个钩子:它不知道 people 的内部结构,只认这两件事。
// readLocal 导出当前配置,applyRemote 用远端快照覆盖本地。
room.setRoomHooks({
  readLocal: () => ({
    elfName1: elfName1.value,
    elfName2: elfName2.value,
    maxGaps: maxGaps.value,
    people: people.map((p) => ({
      id: p.id,
      name: p.name,
      userId: p.userId || '',
      avatar: p.avatar || '',
      tier: p.tier || 'normal',
      needElf: p.needElf,
      isHead: !!p.isHead,
    })),
    friendships: buildFriendMatrix(),
  }),
  // applyRemote 用 applyConfig 的同款逻辑:它已处理字符串 id、去重、
  // 车头唯一等,不另写一套。
  //
  // **但要先存后还 collapsed**:applyConfig 会重建 people,而 collapsed
  // 是纯前端状态(服务端不存)。不还原的话有两个后果:
  //   1. 刚点「确认」折叠的人,推送回来又被展开;
  //   2. 正在展开编辑的人,被 15 秒一次的轮询强制收起 —— 直接打断输入。
  //
  // preserveEditing:展开编辑中的人**整条保留本地**,不用远端覆盖。
  // 他确认时会推送,那时才与远端合并。
  applyRemote: (cfg) => {
    const editing = new Set(people.filter((p) => !p.collapsed).map((p) => p.id))
    const prev = new Map(people.map((p) => [p.id, p]))
    applyConfig(cfg)
    for (let i = 0; i < people.length; i++) {
      const id = people[i].id
      if (editing.has(id) && prev.has(id)) {
        people[i] = prev.get(id) // 编辑中:保留本地,含正在输入的内容
      } else if (prev.has(id)) {
        people[i].collapsed = prev.get(id).collapsed
      }
    }
  },
})

async function doCreateRoom() {
  const ok = await room.createRoom()
  showImportToast(ok ? '房间已创建，复制链接发到群里' : room.roomState.lastError)
}

async function doJoinRoom() {
  const ok = await room.joinRoom(roomInput.value)
  if (ok) {
    roomInput.value = ''
    showImportToast('已加入房间')
  } else {
    showImportToast(room.roomState.lastError || '加入失败')
  }
}

function doLeaveRoom() {
  room.leaveRoom()
  showImportToast('已退出房间，现为本地模式')
}

async function doDeleteRoom() {
  confirmDeleteRoom.value = false
  const ok = await room.deleteRoom()
  showImportToast(ok ? '房间已删除' : room.roomState.lastError)
}

async function copyRoomLink() {
  const url = room.roomUrl(room.roomState.code)
  try {
    await navigator.clipboard.writeText(url)
    showImportToast('链接已复制，发到群里即可')
  } catch {
    // 剪贴板 API 在非 HTTPS 下不可用(局域网访问时),退回选中提示
    showImportToast(url || '复制失败，请手动复制地址栏')
  }
}

// ===== 主题系统 =====
function applyTheme(mode) {
  if (mode === 'light') {
    resolvedTheme.value = 'light'
  } else if (mode === 'dark') {
    resolvedTheme.value = 'dark'
  } else {
    resolvedTheme.value = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
}

applyTheme(themeMode.value)

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (themeMode.value === 'system') applyTheme('system')
})

function cycleTheme() {
  const modes = ['system', 'light', 'dark']
  const idx = modes.indexOf(themeMode.value)
  themeMode.value = modes[(idx + 1) % modes.length]
  applyTheme(themeMode.value)
}

const themeToggleLabel = computed(() => {
  return themeMode.value === 'system' ? '跟随系统 (点击切换)' : themeMode.value === 'light' ? '浅色模式 (点击切换)' : '深色模式 (点击切换)'
})

// ===== 计算属性 =====
// chainLevels 把结果按层分组:第 0 层是自购的源头,其余各层由上一层赠送激活。
// 豪华版能送 2 张,所以同一层可能有多个人 —— 这正是"树"和"链"的区别,
// 用一条带箭头的直线画不出来(一个父节点会有两个分支)。
const chainLevels = computed(() => {
  const r = planResult.value
  if (!r || !r.cards) return []
  const byDepth = new Map()
  for (const c of r.cards) {
    const d = c.depth || 0
    if (!byDepth.has(d)) byDepth.set(d, [])
    byDepth.get(d).push(c)
  }
  return [...byDepth.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v)
})

// tierSummary 档次已是每人独立,导出图徽章改成显示人数分布。
const tierSummary = computed(() => {
  const list = people.filter((p) => p.name.trim())
  if (!list.length) return '混合'
  const p = list.filter((x) => (x.tier || 'normal') === 'premium').length
  const n = list.length - p
  return p === 0 ? `全普通 ${n} 人` : n === 0 ? `全豪华 ${p} 人` : `豪华 ${p} + 普通 ${n}`
})

const friendCount = computed(() => {
  let count = 0
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      if (isFriendPair(people[i].id, people[j].id)) count++
    }
  }
  return count
})

// friendCountOf 某人被勾选的好友数(折叠摘要行显示用)。
// 注意与 friendCount 区分:那是全群总对数,这是单人的。
function friendCountOf(id) {
  let n = 0
  for (const p of people) {
    if (p.id !== id && isFriendPair(id, p.id)) n++
  }
  return n
}

// elfLabel 需求精灵的显示名。'any' 显示「都行」而不是某个具体精灵 ——
// 折叠行里写「新月鹭」会让人误以为他指定了精灵。
function elfLabel(needElf) {
  if (needElf === 'any') return '都行'
  if (needElf === 'elf1') return elfName1.value || '精灵1'
  if (needElf === 'elf2') return elfName2.value || '精灵2'
  return '未选'
}


// ===== 好友关系 =====
function getFriendKey(idA, idB) {
  return idA < idB ? `${idA}-${idB}` : `${idB}-${idA}`
}

function isFriendPair(idA, idB) {
  return !!friendships.get(getFriendKey(idA, idB))
}

function toggleFriendCell(idA, idB) {
  const key = getFriendKey(idA, idB)
  if (friendships.has(key)) {
    friendships.delete(key)
  } else {
    friendships.set(key, true)
  }
}


// ===== 人物管理 =====
function addPerson() {
  // tier 是**每人独立**的档次(普通/豪华)。旧版是全局一个档次,但豪华版能送
  // 1 豪华 + 1 普通副券、普通版只能送 1 张普通 —— 这个差异直接决定树怎么长,
  // 所以必须落到每个人身上。
  // collapsed:点「确认」后折叠成摘要行(见 confirmPerson)。
  people.push({ id: newId(), name: '', userId: '', avatar: '', needElf: 'elf1', tier: 'normal', isHead: false, collapsed: false })

  // 新卡片落在列表末尾(**不能**改成插到顶部):好友勾选只列「前面已添加的人」,
  // 插到顶部会让 index=0 的人一个好友都选不到。人多了末尾看不见,所以这里
  // 主动滚到视野内并聚焦姓名框 —— 点「添加」后不用自己找新卡片在哪。
  nextTick(() => {
    const rows = document.querySelectorAll('.person-row')
    const last = rows[rows.length - 1]
    if (!last) return
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    last.scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'auto' })
    const input = last.querySelector('input')
    if (input) input.focus()
  })
}

// isFilled 判定「填完了」:姓名非空即算。姓名是唯一必填项(精灵与档次都有默认值)。
function isFilled(p) {
  return !!(p && p.name && p.name.trim())
}

// confirmPerson 点「确认」后折叠并置后。
//
// 早先是姓名框失焦自动折叠,但那样在只填了姓名、还没选精灵和档次时也会被收起来
// —— 失焦是「离开这个输入框」,不是「我填完了」。改成显式确认。
//
// 置后安全性:好友对按 id 存储,chip 取「当前顺序中排在前面的人」。对任意一对
// (X,Y),数组中必有一方在前,所以无论怎么重排,每对好友都恰好显示一次 ——
// 不会丢,也不会重复显示。
function confirmPerson(person) {
  if (!isFilled(person)) return
  person.collapsed = true
  const i = people.indexOf(person)
  if (i >= 0 && i !== people.length - 1) {
    people.splice(i, 1)
    people.push(person)
  }
  // 确认 = 一次明确的「我改完了」,此刻才推送,避免打字过程中反复写 KV
  if (room.roomState.joined) room.pushLocal()
}

function toggleCollapse(person) {
  person.collapsed = !person.collapsed
}

// showHeadToggle 车头开关是否显示:还没人当车头时人人可设;已定时只有车头本人
// 保留开关(用来取消),其余人不再显示 —— 避免多人反复互顶。
function showHeadToggle(person) {
  const hasHead = people.some((p) => p.isHead)
  return !hasHead || !!person.isHead
}

// ===== 自动录入 users 目录角色 =====
// 图片命名规则: 名称-UID.jpg，例如 星窈窈-671379437.jpg
const userAvatars = import.meta.glob('../users/*.jpg', { eager: true, query: '?url', import: 'default' })

function loadUsersFromDir() {
  const loaded = []
  for (const [path, url] of Object.entries(userAvatars)) {
    const base = path.split('/').pop() || ''
    const dot = base.lastIndexOf('.')
    const dash = base.lastIndexOf('-')
    if (dash <= 0 || dot <= dash) continue
    const name = base.slice(0, dash).trim()
    const userId = base.slice(dash + 1, dot).trim()
    if (!name) continue
    // 预置成员(users/ 目录)姓名/头像已齐,默认折叠;精灵与档次仍需补选,
    // 点摘要行即可展开。手动添加的新成员则保持展开待填。
    loaded.push({ id: newId(), name, userId, avatar: url, needElf: 'any', tier: 'normal', isHead: false, collapsed: true })
  }
  loaded.sort((a, b) => a.name.localeCompare(b.name, 'zh'))
  loaded.forEach((p) => people.push(p))
}

onMounted(async () => {
  loadUsersFromDir()
  room.installVisibilityHook()
  // 分享链接带 ?r=<码>,打开即自动加入
  const code = room.codeFromUrl()
  if (code) {
    const ok = await room.joinRoom(code)
    showImportToast(ok ? '已加入房间' : room.roomState.lastError || '加入房间失败')
  }
})

onUnmounted(() => {
  room.stopPolling()
})

// removePerson 删除成员。
// 加了房间时走「二次确认 + 显式删除」:直接删的话,别人的旧数据一推送就会把
// 这个人复活(详见 room.js 的墓碑机制说明)。
function removePerson(index) {
  const person = people[index]
  if (!person) return
  pendingDeleteIndex.value = index
}

// pendingDeleteIndex 非空表示正在等二次确认;确认后才真正移除。
const pendingDeleteIndex = ref(-1)

function cancelDeletePerson() {
  pendingDeleteIndex.value = -1
}

function confirmDeletePerson() {
  const index = pendingDeleteIndex.value
  if (index < 0 || !people[index]) return
  const removed = people.splice(index, 1)[0]
  const keysToDelete = []
  for (const [key] of friendships) {
    if (key.includes(`${removed.id}-`) || key.includes(`-${removed.id}`)) {
      keysToDelete.push(key)
    }
  }
  keysToDelete.forEach((k) => friendships.delete(k))
  pendingDeleteIndex.value = -1
  // 在房间里就记一笔待删,随下次提交发给服务端;否则本地删掉即可
  if (room.roomState.joined) {
    room.markDeleted(removed.id)
    room.pushLocal()
  }
  planResult.value = null
}

function onHeadToggle(person) {
  person.isHead = !person.isHead
  if (person.isHead) {
    people.forEach((p) => {
      if (p.id !== person.id) p.isHead = false
    })
    // 车头必须豪华:直接切换而不是报错 —— 用户点开关的意图很明确,
    // 让他再手动去改档次是多余的摩擦。
    person.tier = 'premium'
  }
}

// ===== 精灵名称 =====
function getElfName(elf) {
  if (elf === 'elf1') return elfName1.value || '新月鹭'
  if (elf === 'elf2') return elfName2.value || '热团团'
  return '都行'
}

// ===== 重置 =====
function resetAll() {
  people.length = 0
  friendships.clear()
  maxGaps.value = 0
  elfName1.value = '新月鹭'
  elfName2.value = '热团团'
  planResult.value = null
  errorMsg.value = ''
  computing.value = false
}

// ===== 生成方案 =====
function buildFriendMatrix() {
  const matrix = []
  for (const [key] of friendships) {
    // id 是字符串,**不要** map(Number)。随机 id 为 hex(不含 '-'),split 安全。
    const [idA, idB] = key.split('-')
    matrix.push([idA, idB])
  }
  return matrix
}

// initialOf 取昵称首字,供未上传头像时占位。
//
// 用 Array.from 而非 [0]:后者按 UTF-16 码元取,遇到 emoji 或超出 BMP 的生僻字
// (如「𠮷」)会取到半个字符、渲染成乱码。Intl.Segmenter 更准,但兼容性稍差,
// 这里 Array.from 已足够覆盖人名场景。
// 空昵称返回空串 —— 由调用方回退到加号图标。
function initialOf(name) {
  const s = (name || '').trim()
  return s ? Array.from(s)[0] : ''
}

// scrollTop 移动端底部操作条的「回到顶部」。
// 用 behavior:'smooth' 但在减弱动效偏好下退回瞬间跳转 —— 后者是前庭敏感用户
// 的明确偏好,不是可选项。
function scrollTop() {
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' })
}

async function doGenerate() {
  errorMsg.value = ''
  planResult.value = null

  if (people.length < 2) { errorMsg.value = '至少需要 2 个人才能生成传火方案'; return }
  if (people.some((p) => !p.name.trim())) { errorMsg.value = '请为所有人填写姓名'; return }
  if (people.some((p) => !p.needElf)) { errorMsg.value = '请为所有人选择需求精灵版本'; return }

  computing.value = true
  // 使用 nextTick 确保 UI 更新后再执行（对于大量数据可能需要稍长时间）
  await nextTick()

  const result = generatePlan(
    [...people],
    { elf1: elfName1.value || '新月鹭', elf2: elfName2.value || '热团团' },
    buildFriendMatrix(),
    { maxGaps: maxGaps.value }
  )

  computing.value = false

  if (!result.success) { errorMsg.value = result.error; return }
  planResult.value = result
}

// ===== 头像上传 =====
function triggerAvatarPicker(person) {
  avatarTargetId = person.id
  if (avatarInputRef.value) {
    avatarInputRef.value.value = ''
    avatarInputRef.value.click()
  }
}

async function handleAvatarFileSelected(event) {
  const file = event.target.files && event.target.files[0]
  event.target.value = ''
  if (!file || !file.type.startsWith('image/')) {
    if (file) errorMsg.value = '请选择图片文件'
    return
  }
  const person = people.find((p) => p.id === avatarTargetId)
  if (!person) return
  try {
    person.avatar = await fileToCompressedAvatar(file)
  } catch (e) {
    errorMsg.value = '头像处理失败：' + (e?.message || e)
  }
}

async function handleAvatarPaste(event, person) {
  const items = event.clipboardData && event.clipboardData.items
  if (!items) return
  for (const item of items) {
    if (item.type && item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        event.preventDefault()
        try {
          person.avatar = await fileToCompressedAvatar(file)
        } catch (e) {
          errorMsg.value = '头像处理失败：' + (e?.message || e)
        }
        return
      }
    }
  }
}

function clearAvatar(person) {
  person.avatar = ''
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(String(e.target.result || ''))
    reader.onerror = () => reject(new Error('读取失败'))
    reader.readAsDataURL(file)
  })
}

async function fileToCompressedAvatar(file, maxSize = 128) {
  const dataUrl = await fileToDataUrl(file)
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const w0 = img.naturalWidth || img.width
      const h0 = img.naturalHeight || img.height
      if (!w0 || !h0) {
        resolve(dataUrl)
        return
      }
      const side = Math.min(w0, h0)
      const sx = (w0 - side) / 2
      const sy = (h0 - side) / 2
      const target = Math.min(maxSize, side)
      const canvas = document.createElement('canvas')
      canvas.width = target
      canvas.height = target
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, sx, sy, side, side, 0, 0, target, target)
      try {
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      } catch {
        resolve(dataUrl)
      }
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

// ===== 导入/导出配置 =====
// applyConfig 用一份配置覆盖本地。
//
// opts.preserveEditing:房间同步时传 true。含义是**不打断正在编辑的人** ——
// 展开着(未折叠)的卡片保留本地版本,哪怕远端有更新的数据。否则别人每加一个人,
// 我正在打字的那张卡片就会被远端快照冲掉。
// 同理,collapsed 状态按 id 保留:不然刚点「确认」折叠,下一次轮询就把它展开了。
function applyConfig(config, opts = {}) {
  if (!config || typeof config !== 'object') {
    throw new Error('配置文件格式无效')
  }
  if (typeof config.elfName1 === 'string') elfName1.value = config.elfName1
  if (typeof config.elfName2 === 'string') elfName2.value = config.elfName2
  // 老配置没有 maxGaps,缺省按 0(只给确定方案),与默认值一致。
  const g = Number(config.maxGaps)
  maxGaps.value = Number.isFinite(g) && g >= 0 && g <= 2 ? Math.round(g) : 0

  const prevById = new Map(people.map((p) => [p.id, p]))
  const preserveEditing = !!opts.preserveEditing

  people.length = 0
  const seen = new Set()
  const oldToNew = new Map()
  if (Array.isArray(config.people)) {
    for (const p of config.people) {
      if (!p || typeof p !== 'object') continue
      // id 是字符串:老配置(数字自增)用 String() 兼容,缺 id 的补一个随机的。
      // 重复 id 直接跳过 —— 多人合并后可能出现,保留第一条。
      let pid = p.id != null && String(p.id).trim() !== '' ? String(p.id).trim() : newId()
      if (seen.has(pid)) continue
      seen.add(pid)
      // 老配置是数字 id,转成字符串后好友对也要跟着转,否则匹配不上
      oldToNew.set(String(p.id ?? ''), pid)
      const needElf = ['elf1', 'elf2', 'any'].includes(p.needElf) ? p.needElf : 'elf1'
      const avatar = typeof p.avatar === 'string' && p.avatar.startsWith('data:image/') ? p.avatar : ''
      people.push({
        id: pid,
        name: typeof p.name === 'string' ? p.name : '',
        userId: typeof p.userId === 'string' ? p.userId : '',
        avatar,
        needElf,
        // 兼容老配置(没有 tier 字段):按普通处理
        tier: p.tier === 'premium' ? 'premium' : 'normal',
        isHead: !!p.isHead,
        // 已填完的默认折叠(预置成员/房间同步回来的都是这种情况);
        // 房间同步时会被 applyRemote 的 prev 覆盖成本地真实状态。
        collapsed: !!name,
      })
    }
  }
  const headList = people.filter((p) => p.isHead)
  if (headList.length > 1) headList.slice(1).forEach((p) => (p.isHead = false))

  friendships.clear()
  if (Array.isArray(config.friendships)) {
    const validIds = new Set(people.map((p) => p.id))
    for (const pair of config.friendships) {
      if (!Array.isArray(pair) || pair.length !== 2) continue
      // 保持字符串,不做 Number 转换;老配置经 oldToNew 映射后再比对
      let a = String(pair[0]).trim()
      let b = String(pair[1]).trim()
      if (oldToNew.has(a)) a = oldToNew.get(a)
      if (oldToNew.has(b)) b = oldToNew.get(b)
      if (!validIds.has(a) || !validIds.has(b) || a === b) continue
      friendships.set(getFriendKey(a, b), true)
    }
  }

  planResult.value = null
  return { peopleCount: people.length, friendCount: friendships.size }
}

let toastTimer = null
function showImportToast(msg) {
  importToast.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    importToast.value = ''
  }, 2800)
}

// ===== 导出图片 =====
async function exportAllCards() {
  if (!exportContainer.value || exporting.value) return
  exporting.value = true
  try {
    await nextTick()
    const el = exportContainer.value
    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: null,
      useCORS: true,
      logging: false,
      onclone: (doc) => {
        const cloned = doc.querySelector('.export-container')
        if (cloned) {
          cloned.style.padding = '24px 20px'
          cloned.style.background = resolvedTheme.value === 'dark'
            ? 'linear-gradient(180deg, #1C1C1E 0%, #000000 100%)'
            : 'linear-gradient(180deg, #F2F2F7 0%, #E5E5EA 100%)'
          cloned.style.borderRadius = '0'
          cloned.style.width = el.offsetWidth + 'px'
        }
      },
    })
    const link = document.createElement('a')
    const names = planResult.value.chain.map((p) => p.name).join('-')
    link.download = `传火方案_${names}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  } catch (e) {
    console.error('导出失败:', e)
    errorMsg.value = '导出图片失败，请重试'
  } finally {
    exporting.value = false
  }
}
</script>

<style>
/* ===== GLOBAL RESET & DESIGN TOKENS ===== */
*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  /* Brand Colors */
  --accent: #FF6B35;
  --accent-hover: #E55A2B;

  /* Light Theme */
  --bg: #F2F2F7;
  --bg-gradient: linear-gradient(180deg, #F2F2F7 0%, #E5E5EA 100%);
  --surface: rgba(255, 255, 255, 0.72);
  --surface-solid: #FFFFFF;
  --surface-hover: rgba(255, 255, 255, 0.88);
  --border: rgba(60, 60, 67, 0.10);
  --border-strong: rgba(60, 60, 67, 0.16);
  --text: #1C1C1E;
  --text-secondary: #636366;
  --text-tertiary: #AEAEB2;
  --separator: rgba(60, 60, 67, 0.12);
  --fill: rgba(120, 120, 128, 0.08);
  --fill-secondary: rgba(120, 120, 128, 0.13);

  /* Semantic Colors */
  --blue: #007AFF;
  --blue-bg: rgba(0, 122, 255, 0.08);
  --blue-border: rgba(0, 122, 255, 0.16);
  --green: #34C759;
  --green-bg: rgba(52, 199, 89, 0.08);
  --green-border: rgba(52, 199, 89, 0.16);
  --orange: #FF9500;
  --orange-bg: rgba(255, 149, 0, 0.08);
  --orange-border: rgba(255, 149, 0, 0.16);
  --red: #FF3B30;
  --red-bg: rgba(255, 59, 48, 0.08);
  --red-border: rgba(255, 59, 48, 0.16);
  --purple: #AF52DE;

  /* Surfaces */
  --shadow-sm: 0 1px 4px rgba(0, 0, 0, 0.04), 0 0 1px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.06), 0 0 1px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.10);

  /* Radii */
  --radius-xs: 8px;
  --radius-sm: 12px;
  --radius: 16px;
  --radius-lg: 20px;
  --radius-full: 100px;

  /* Typography */
  --font: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --font-mono: 'SF Mono', 'JetBrains Mono', 'Cascadia Code', monospace;

  /* Transitions */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* Dark Theme */
.theme-dark {
  --bg: #1C1C1E;
  --bg-gradient: linear-gradient(180deg, #1C1C1E 0%, #0A0A0B 100%);
  --surface: rgba(44, 44, 46, 0.78);
  --surface-solid: #2C2C2E;
  --surface-hover: rgba(58, 58, 60, 0.88);
  --border: rgba(255, 255, 255, 0.08);
  --border-strong: rgba(255, 255, 255, 0.12);
  --text: #F5F5F7;
  --text-secondary: #98989D;
  --text-tertiary: #636366;
  --separator: rgba(84, 84, 88, 0.36);
  --fill: rgba(120, 120, 128, 0.20);
  --fill-secondary: rgba(120, 120, 128, 0.28);

  --blue: #0A84FF;
  --blue-bg: rgba(10, 132, 255, 0.12);
  --blue-border: rgba(10, 132, 255, 0.20);
  --green: #30D158;
  --green-bg: rgba(48, 209, 88, 0.12);
  --green-border: rgba(48, 209, 88, 0.20);
  --orange: #FF9F0A;
  --orange-bg: rgba(255, 159, 10, 0.12);
  --orange-border: rgba(255, 159, 10, 0.20);
  --red: #FF453A;
  --red-bg: rgba(255, 69, 58, 0.12);
  --red-border: rgba(255, 69, 58, 0.20);
  --purple: #BF5AF2;

  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.20), 0 0 1px rgba(0, 0, 0, 0.24);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.24), 0 0 1px rgba(0, 0, 0, 0.28);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.30), 0 0 1px rgba(0, 0, 0, 0.32);
}

html {
  -webkit-text-size-adjust: 100%;
  -webkit-tap-highlight-color: transparent;
}

body {
  background: var(--bg);
  min-height: 100vh;
  font-family: var(--font);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  color: var(--text);
}

#app {
  min-height: 100vh;
}

/* 减弱动效:系统里开了「减少动态效果」的用户(前庭敏感 / 易晕动)明确要求
   少动。这里统一压到近乎瞬时,而不是逐个 transition 去改 —— 漏一处就是
   一整页的位移/缩放动画。滚动平滑另见 scrollTop 的运行时判断。 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
</style>

<style scoped>
/* ===== APP CONTAINER ===== */
.app-container {
  min-height: 100vh;
  background: var(--bg-gradient);
  position: relative;
  overflow-x: hidden;
  transition: background 0.5s var(--ease-out);
}

/* Background image layer */
.app-container::before {
  content: '';
  position: fixed;
  inset: 0;
  background: url('/bg.png') no-repeat center center;
  background-size: cover;
  z-index: 0;
  opacity: 0.15;
  transition: opacity 0.6s var(--ease-out);
}

.theme-dark::before {
  opacity: 0.08;
}

/* Content wrapper */
.app-content {
  position: relative;
  z-index: 1;
  max-width: 1320px;
  margin: 0 auto;
  /* 底部留白用 safe-area 兜底:iPhone 的 Home Indicator 会盖住最后一张卡片。
     96px = 常驻操作条(~68px) + 余量 —— 条在所有尺寸都常驻,故这里也要让位。 */
  padding: 24px 20px calc(96px + env(safe-area-inset-bottom, 0px));
}

/* ===== HEADER ===== */
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 20px;
  margin-bottom: 20px;
  background: var(--surface);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}

.app-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.app-title-icon {
  flex-shrink: 0;
}

.app-title-text {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* Theme toggle */
.theme-toggle {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-xs);
  border: 1px solid var(--border);
  background: var(--fill);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.25s var(--ease-out);
}

.theme-toggle:hover {
  background: var(--fill-secondary);
  color: var(--text);
  border-color: var(--border-strong);
}

.theme-toggle:active {
  transform: scale(0.94);
}

/* ===== TWO-COLUMN LAYOUT ===== */
.content-wrapper {
  display: flex;
  flex-direction: column;
  /* 纵向时**不给** gap:卡片自带 margin-bottom,再叠 gap 会变成 36px 的
     双倍间距(横向时 gap 才是列间距,那时没有 margin 叠加的问题)。 */
  gap: 0;
}

/* Desktop: side-by-side */
@media (min-width: 960px) {
  .content-wrapper {
    flex-direction: row;
    align-items: flex-start;
    gap: 24px;
  }

  .config-column {
    flex: 1 1 420px;
    max-width: 520px;
    position: sticky;
    top: 24px;
    /* sticky 列整体不该再吃最后一卡的 margin,否则 sticky 高度虚高、
       滚到底时会出现一段空白 */
    padding-bottom: 0;
  }

  .result-column {
    flex: 1 1 500px;
    min-width: 0;
  }

  .content-wrapper.has-result .config-column {
    max-width: 440px;
  }
}

@media (min-width: 1200px) {
  .content-wrapper {
    gap: 32px;
  }
  .config-column { max-width: 560px; }
  .content-wrapper.has-result .config-column { max-width: 480px; }
}

/* 宽屏:容器随视口放宽,并把列间距拉开 —— 固定 1320px 时,1920 屏上两侧
   各留 300px、2560 屏上各留 620px,大片留白看着像"只占半个屏幕"。
   这里用 min(视口 - 边距, 上限) 让它跟着屏走,并再抬一档上限(1600→1760)。
   上限仍要保留:无限宽的行长会难读(一行超过 ~100 字符),不是越宽越好。 */
@media (min-width: 1440px) {
  .app-content {
    max-width: min(calc(100vw - 80px), 1600px);
  }
  .content-wrapper {
    gap: 40px;
  }
  .config-column { max-width: 600px; }
  .content-wrapper.has-result .config-column { max-width: 520px; }
}

@media (min-width: 1800px) {
  .app-content {
    max-width: min(calc(100vw - 120px), 1760px);
  }
  .content-wrapper {
    gap: 48px;
  }
  .config-column { max-width: 640px; }
  .content-wrapper.has-result .config-column { max-width: 560px; }
}

/* ===== CARD ===== */
.card {
  background: var(--surface);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  padding: 20px;
  margin-bottom: 16px;
  transition: box-shadow 0.3s var(--ease-out);
}

/* 只在真有指针悬停的设备上做 hover:触屏上 :hover 会在点过一次后
   「粘住」(sticky hover),卡片保持高亮直到点了别处。 */
@media (hover: hover) {
  .card:hover {
    box-shadow: var(--shadow-md);
  }
}

/* ===== SECTION ===== */
.section-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.3px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.section-title-icon {
  color: var(--accent);
  flex-shrink: 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-header .section-title {
  margin-bottom: 0;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-hint {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 14px;
  line-height: 1.5;
}

/* ===== BUTTONS ===== */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 9px 18px;
  border-radius: var(--radius-full);
  border: none;
  font-size: 14px;
  font-weight: 600;
  font-family: var(--font);
  cursor: pointer;
  transition: all 0.25s var(--spring);
  white-space: nowrap;
  user-select: none;
}

.btn:active { transform: scale(0.95); }
.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none !important;
}

.btn-primary {
  background: var(--blue);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  box-shadow: 0 4px 16px rgba(0, 122, 255, 0.32);
}

.btn-secondary {
  background: var(--fill-secondary);
  color: var(--blue);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--fill);
  color: var(--blue);
}

.btn-ghost {
  background: var(--fill);
  color: var(--text-secondary);
}

.btn-ghost:hover:not(:disabled) {
  background: var(--fill-secondary);
  color: var(--text);
}

.btn-sm {
  padding: 6px 13px;
  font-size: 13px;
  gap: 4px;
}

.btn-large {
  padding: 14px 28px;
  font-size: 17px;
  border-radius: var(--radius);
}

.btn-text {
  display: inline;
}

@media (max-width: 380px) {
  .btn-sm .btn-text { display: none; }
}

/* ===== INPUTS ===== */
.input {
  width: 100%;
  padding: 10px 14px;
  border-radius: var(--radius-xs);
  border: 1px solid var(--border);
  background: var(--fill);
  color: var(--text);
  font-size: 15px;
  font-family: var(--font);
  outline: none;
  transition: all 0.25s var(--ease-out);
}

.input:focus {
  border-color: var(--blue);
  box-shadow: 0 0 0 3px var(--blue-bg);
  background: var(--surface-solid);
}

.input::placeholder {
  color: var(--text-tertiary);
}

.field-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* ===== SEGMENT CONTROL ===== */
.segment-control {
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
}

.segment-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 14px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--fill);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s var(--spring);
  font-family: var(--font);
}

.segment-btn:active { transform: scale(0.97); }

.segment-btn.active {
  background: var(--blue);
  border-color: var(--blue);
  color: #fff;
  box-shadow: 0 4px 16px rgba(0, 122, 255, 0.28);
  transform: scale(1.02);
}

.segment-text {
  font-size: 15px;
  font-weight: 600;
}

.segment-price {
  font-size: 12px;
  font-weight: 400;
  opacity: 0.75;
}

/* ===== ELF NAME ROW ===== */
.elf-name-row {
  display: flex;
  gap: 12px;
}

.elf-name-field {
  flex: 1;
  min-width: 0;
}

/* ===== EMPTY STATE ===== */
.empty-state {
  text-align: center;
  padding: 40px 20px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.empty-icon {
  color: var(--text-tertiary);
  margin-bottom: 8px;
  opacity: 0.5;
}

.empty-text {
  font-size: 17px;
  font-weight: 600;
  color: var(--text);
}

.empty-sub {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

/* ===== PERSON LIST ===== */
.person-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.person-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  background: var(--fill);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  transition: background 0.25s var(--ease-out);
}

.person-row:hover {
  background: var(--fill-secondary);
}

/* ===== AVATAR ===== */
.person-avatar {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--surface-solid);
  border: 1.5px dashed var(--border);
  background-size: cover;
  background-position: center;
  cursor: pointer;
  outline: none;
  transition: all 0.2s var(--ease-out);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  overflow: hidden;
  align-self: center;
}

.person-avatar:hover {
  border-color: var(--blue);
}

.person-avatar:focus-visible {
  border-style: solid;
  border-color: var(--blue);
  box-shadow: 0 0 0 3px var(--blue-bg);
}

.person-avatar.has-image {
  border-style: solid;
  border-color: var(--border);
}

/* 首字占位:没传头像时顶替加号图标。
   有名字时改成实线边框 —— 虚线是"请上传"的语义,而首字已经是有效内容了。 */
.avatar-initial {
  font-size: 19px;
  font-weight: 600;
  color: var(--text-secondary);
  user-select: none;
  line-height: 1;
}

/* 用 class 而非 :has() 选择器控制:微信内置浏览器等旧内核不支持 :has(),
   在那里会静默失效、边框保持虚线(不影响功能,但样式不对)。 */
.person-avatar.has-initial {
  border-style: solid;
  border-color: var(--border-strong);
  background: var(--fill);
}

.avatar-clear {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.55);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s var(--ease-out);
  padding: 0;
}

.person-avatar.has-image:hover .avatar-clear,
.person-avatar:focus-visible .avatar-clear {
  opacity: 1;
}

/* ===== PERSON FIELDS ===== */
.person-fields {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  min-width: 0;
}

/* 好友勾选独占整行:人数一多 chip 会换行,挤在半列里没法点 */
.person-field.friend-field {
  grid-column: 1 / -1;
}

/* 确认按钮独占整行并右对齐:它是这张卡片的收尾动作,放在字段流里
   会和上面的精灵/档次按钮视觉上混在一起 */
.person-field.confirm-field {
  grid-column: 1 / -1;
  min-width: 0;
  display: flex;
  justify-content: flex-end;
  margin-top: 2px;
}

.person-confirm {
  min-width: 84px;
}

/* 确认按钮在窄屏占满整行更好点(它是这张卡的主操作) */
@media (max-width: 480px) {
  .person-field.confirm-field {
    justify-content: stretch;
  }
  .person-confirm {
    flex: 1;
    width: 100%;
  }
}

/* ===== 折叠摘要行 =====
   填完后替代表单:一行 56px,10 人时列表仍可扫视。整行可点展开。 */
.person-row.is-collapsed {
  padding: 6px 10px;
}

.person-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 48px;
  padding: 4px 2px;
  cursor: pointer;
  border-radius: var(--radius-xs);
  transition: background 0.18s var(--ease-out);
}

.person-summary:hover {
  background: var(--fill);
}

.person-summary:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--blue-bg);
}

.summary-avatar {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--fill);
  border: 1px solid var(--border);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  background-size: cover;
  background-position: center;
  user-select: none;
}

.summary-avatar.has-image,
.summary-avatar.has-initial {
  background-color: var(--surface-solid);
}

.summary-main {
  flex: 1;
  min-width: 0;
}

.summary-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-id {
  font-size: 11px;
  font-weight: 400;
  color: var(--text-tertiary);
}

.summary-badge {
  flex: none;
  padding: 1px 6px;
  border-radius: 5px;
  font-size: 10px;
  font-weight: 600;
  background: var(--red-bg);
  color: var(--red);
}

.summary-tags {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 3px;
  flex-wrap: wrap;
}

.summary-tag {
  padding: 1px 7px;
  border-radius: 5px;
  font-size: 11px;
  background: var(--fill);
  color: var(--text-secondary);
}

/* 豪华用金色点出:档次直接决定能不能分叉,值得在摘要里一眼看到 */
.summary-tag.premium {
  background: rgba(var(--c-wealth-rgb, 212, 175, 55), 0.14);
  color: var(--accent);
  font-weight: 600;
}

.summary-tag.friend {
  color: var(--green);
  background: var(--green-bg);
}

.summary-arrow {
  flex: none;
  color: var(--text-tertiary);
  transition: transform 0.22s var(--ease-out);
}

/* 人物区标题右侧的按钮组(重置 + 添加) */
.section-actions-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

/* ===== 留空滑块 ===== */
.gap-field {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--separator);
}

.gap-field-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 6px;
}

.gap-value {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
}

.gap-range {
  width: 100%;
  height: 22px;
  margin: 0;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  cursor: pointer;
}

/* 轨道与滑块:手写以匹配设计 token,原生样式在各浏览器差异太大 */
.gap-range::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 2px;
  background: var(--fill-secondary);
}
.gap-range::-moz-range-track {
  height: 4px;
  border-radius: 2px;
  background: var(--fill-secondary);
}
.gap-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  margin-top: -7px;
  border-radius: 50%;
  background: var(--accent);
  border: 2px solid var(--surface-solid);
  box-shadow: var(--shadow-sm);
  transition: transform 0.15s var(--ease-out);
}
.gap-range::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent);
  border: 2px solid var(--surface-solid);
  box-shadow: var(--shadow-sm);
}
.gap-range:active::-webkit-slider-thumb { transform: scale(1.15); }
.gap-range:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 3px var(--accent-soft, var(--blue-bg)); }

.gap-ticks {
  display: flex;
  justify-content: space-between;
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

.gap-ticks .on {
  color: var(--accent);
  font-weight: 700;
}

/* ===== 确定方案前的待办 =====
   好友不是硬约束,所以这不是「错误」,而是动手前的确认清单。
   绿条表示无需额外操作 —— 明确告诉用户"可以执行了",比只在不通过时出现更有用。 */
.todo-box {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  margin-bottom: 14px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
}

.todo-box svg {
  flex: none;
  margin-top: 1px;
}

.todo-detail {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.todo-title {
  font-size: 13.5px;
  font-weight: 600;
}

.todo-sub {
  font-size: 12px;
  opacity: 0.85;
  line-height: 1.5;
}

.todo-box.warn {
  background: var(--orange-bg);
  border-color: var(--orange-border);
  color: var(--orange);
}

.todo-box.ok {
  background: var(--green-bg);
  border-color: var(--green-border);
  color: var(--green);
}

.todo-box .alert-tags {
  margin-top: 6px;
}

.todo-box .alert-tag {
  background: var(--surface-solid);
  color: var(--text);
  border: 1px solid var(--border);
}

/* ===== 房间条 ===== */
.room-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 16px;
  margin-bottom: 16px;
}

.room-intro {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: 1;
  min-width: 200px;
  font-size: 12.5px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.room-intro svg {
  flex: none;
  color: var(--accent);
}

.room-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.room-code-input {
  width: 130px;
  font-family: var(--font-mono);
  letter-spacing: 0.5px;
}

.room-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.room-label {
  font-size: 12px;
  color: var(--text-tertiary);
}

.room-code {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 1px;
  padding: 3px 8px;
  border-radius: var(--radius-xs);
  background: var(--fill);
  color: var(--text);
  user-select: all;
}

/* 状态点:颜色即状态,不占横向空间 */
.room-dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-tertiary);
  transition: background 0.2s var(--ease-out);
}

.room-dot.synced { background: var(--green); }
.room-dot.syncing { background: var(--orange); animation: room-pulse 1.2s ease-in-out infinite; }
.room-dot.error { background: var(--red); }
.room-dot.gone { background: var(--text-tertiary); }

@keyframes room-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

.room-msg {
  flex-basis: 100%;
  margin: 0;
  font-size: 12px;
  color: var(--text-tertiary);
}

.room-msg.warn { color: var(--red); }

/* 内联确认条 */
.room-confirm,
.person-confirm-del {
  flex-basis: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 9px 12px;
  border-radius: var(--radius-xs);
  background: var(--red-bg);
  border: 1px solid var(--red-border);
  font-size: 12.5px;
  color: var(--red);
  line-height: 1.5;
}

.room-confirm-actions,
.person-confirm-actions {
  display: flex;
  gap: 8px;
  flex: none;
}

.person-confirm-del {
  margin-left: auto;
  width: auto;
  flex-basis: auto;
}

/* 折叠态的删除确认条需要独占一整行(它在摘要行下方) */
.person-confirm-del.wide {
  margin-left: 0;
  flex-basis: 100%;
  width: auto;
}

/* 摘要行里的删除按钮:默认极淡,hover/focus 才显形 ——
   避免每个折叠行都有个显眼的叉,看着像「待处理」 */
.summary-del {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-tertiary);
  opacity: 0.55;
  cursor: pointer;
  transition: opacity 0.15s var(--ease-out), background 0.15s var(--ease-out), color 0.15s var(--ease-out);
}

.summary-del:hover,
.summary-del:focus-visible {
  opacity: 1;
  background: var(--red-bg);
  color: var(--red);
  outline: none;
}

/* 减弱动效时不闪 */
@media (prefers-reduced-motion: reduce) {
  .room-dot.syncing { animation: none; }
}

@media (max-width: 560px) {
  .room-bar { align-items: flex-start; }
  .room-actions { width: 100%; }
  .room-code-input { flex: 1; width: auto; min-width: 0; }
  .room-code { overflow-x: auto; }
}

/* 精灵/档次按钮的微交互:选中态给一点"按下去了"的手感。
   只动 transform 与 box-shadow,不触发重排。 */
.elf-radio-btn {
  transition: transform 0.12s var(--ease-out), background 0.18s var(--ease-out),
    border-color 0.18s var(--ease-out), color 0.18s var(--ease-out);
}

.elf-radio-btn:not(.active):hover {
  transform: translateY(-1px);
}

.elf-radio-btn.active {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.10);
}

/* 禁用态说清楚原因(车头必须豪华),不只是变灰 */
.tier-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  text-decoration: line-through;
}

/* 档次与规则表(替换原先的全局档次选择器) */
.tier-table {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.tier-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 12.5px;
  padding: 7px 10px;
  border-radius: var(--radius-xs);
  background: var(--fill);
}

.tier-name {
  flex: none;
  font-weight: 600;
  color: var(--text);
  min-width: 48px;
}

.tier-price {
  flex: none;
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--accent);
  min-width: 52px;
}

.tier-grant {
  color: var(--text-secondary);
  line-height: 1.5;
}

/* 档次按钮沿用精灵按钮的样式,只是稍窄一点 */
.tier-radio-group {
  display: flex;
  gap: 6px;
}

.tier-btn {
  flex: 1;
}

/* 补人建议 */
.gap-tip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 12px;
  border-radius: var(--radius-sm);
  background: var(--orange-bg);
  border: 1px solid var(--orange-border);
  color: var(--orange);
  font-size: 12.5px;
  line-height: 1.6;
}

.gap-tip svg {
  flex: none;
  margin-top: 2px;
}

.gap-tip b {
  font-weight: 700;
}

/* 全员自购用红色警示(补人建议是可选的省钱技巧,这个是"方案没生效") */
.gap-tip-warn {
  background: var(--red-bg);
  border-color: var(--red-border);
  color: var(--red);
}

/* 层级:每层一行,层标签在左 */
.chain-level {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.chain-level + .chain-level {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--separator);
}

.chain-level-tag {
  flex: none;
  width: 44px;
  padding-top: 2px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-align: center;
}

/* 同层之间用短横线(不是箭头):同层是并列分支,不存在先后 */
.chain-arrow-side {
  color: var(--text-tertiary);
}

.result-tier-tag {
  margin-left: 4px;
  padding: 0 5px;
  border-radius: 4px;
  font-size: 10px;
  background: var(--fill-secondary);
  color: var(--text-secondary);
}

.chain-tier {
  margin-left: 4px;
  padding: 0 5px;
  border-radius: 4px;
  font-size: 10px;
  background: var(--fill-secondary);
  color: var(--text-secondary);
}

.friend-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.5;
  padding-top: 2px;
}

.fp-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* 类名与结果区的 .friend-chip 刻意区分开:那个是只读的「是/否好友」标记,
   这个是可点的复选框,共用一套样式会互相污染。 */
.fp-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px 5px 7px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border);
  background: var(--surface-solid);
  color: var(--text-secondary);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  max-width: 100%;
  transition: border-color 0.18s var(--ease-out), background 0.18s var(--ease-out), color 0.18s var(--ease-out);
}

.fp-chip:active {
  transform: scale(0.96);
}

.fp-chip.active {
  border-color: var(--green-border);
  background: var(--green-bg);
  color: var(--green);
}

/* 复选框方块:未勾选是空心描边,勾选后填绿 + 白勾 */
.fp-chip-box {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  border-radius: 4px;
  border: 1.5px solid var(--border-strong);
  background: transparent;
  transition: background 0.18s var(--ease-out), border-color 0.18s var(--ease-out);
}

.fp-chip.active .fp-chip-box {
  background: var(--green);
  border-color: var(--green);
  color: #fff;
}

.person-field {
  min-width: 0;
}

.name-field { grid-column: 1; }
.id-field { grid-column: 2; }
.elf-field { grid-column: 1 / -1; }
.toggle-field {
  display: flex;
  flex-direction: column;
  align-items: center;
}

@media (max-width: 480px) {
  /* 窄屏整行堆叠。**同时**要把 .person-fields 的宽度放开:
     它在 .person-row 里是 flex:1,而 flex 子项默认 min-width:auto 会被
     头像挤到只剩 187px;单列网格下 1/-1 指向同一列,于是好友与确认这两个
     独占字段被压进一条窄竖条(界面扭曲)。加 min-width:0 + flex-basis:100%
     让它占满整行。 */
  .person-row {
    flex-wrap: wrap;
  }
  .person-fields {
    flex: 1 1 100%;
    min-width: 0;
    grid-template-columns: 1fr;
  }
  .person-field {
    grid-column: 1 / -1;
    min-width: 0;
  }
  .toggle-field {
    align-items: flex-start;
  }
}

/* ===== ELF RADIO GROUP ===== */
.elf-radio-group {
  display: flex;
  border-radius: var(--radius-xs);
  overflow: hidden;
  border: 1px solid var(--border);
}

.elf-radio-btn {
  flex: 1;
  padding: 7px 10px;
  font-size: 13px;
  font-weight: 500;
  font-family: var(--font);
  border: none;
  background: var(--fill);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s var(--ease-out);
  white-space: nowrap;
}

.elf-radio-btn + .elf-radio-btn {
  border-left: 1px solid var(--border);
}

.elf-radio-btn.active {
  background: var(--blue);
  color: #fff;
}

/* ===== TOGGLE SWITCH ===== */
.toggle {
  width: 48px;
  height: 28px;
  border-radius: 14px;
  border: none;
  background: var(--fill-secondary);
  position: relative;
  cursor: pointer;
  transition: background 0.3s var(--spring);
  padding: 0;
}

.toggle.active {
  background: var(--green);
}

.toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
  transition: transform 0.3s var(--spring);
}

.toggle.active .toggle-knob {
  transform: translateX(20px);
}

/* ===== DELETE BUTTON ===== */
.person-delete {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: var(--fill-secondary);
  color: var(--red);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s var(--spring);
  padding: 0;
  align-self: center;
}

.person-delete:hover {
  background: var(--red);
  color: #fff;
}

.person-delete:active {
  transform: scale(0.88);
}

/* ===== FRIEND MATRIX ===== */
/* ===== ACTION BAR ===== */

/* ===== ALERT ===== */
.alert {
  padding: 14px 16px;
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
}

.alert-error    { background: var(--red-bg);    border: 1px solid var(--red-border);    color: var(--red); }
.alert-warning  { background: var(--orange-bg); border: 1px solid var(--orange-border); color: var(--orange); }
.alert-success  { background: var(--green-bg);  border: 1px solid var(--green-border);  color: var(--green); }

.alert-icon {
  flex-shrink: 0;
  margin-top: 1px;
}

.alert-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  line-height: 1.5;
  flex: 1;
}

.alert-detail {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.alert-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.alert-tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  background: var(--orange-bg);
  font-size: 13px;
  font-weight: 500;
  color: var(--orange);
}

.alert-close {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: var(--fill-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s var(--ease-out);
  padding: 0;
}

.alert-close:active {
  transform: scale(0.9);
}

/* ===== STAT GRID ===== */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

@media (min-width: 480px) {
  .stat-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.stat-item {
  text-align: center;
  padding: 14px 8px;
  border-radius: var(--radius-sm);
  background: var(--fill);
  border: 1px solid var(--border);
}

.stat-highlight {
  background: var(--blue-bg);
  border-color: var(--blue-border);
}

.stat-save {
  background: var(--green-bg);
  border-color: var(--green-border);
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.5px;
  font-variant-numeric: tabular-nums;
}

.stat-unit {
  font-size: 13px;
  font-weight: 400;
  color: var(--text-secondary);
  margin-left: 2px;
}

.stat-highlight .stat-value { color: var(--blue); }
.stat-save .stat-value { color: var(--green); }

.stat-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* ===== CHAIN FLOW ===== */
.chain-flow {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 0;
}

.chain-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: transform 0.3s var(--spring);
}

.chain-node:hover {
  transform: translateY(-2px);
}

.chain-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  transition: transform 0.3s var(--spring);
}

.chain-avatar.head { background: linear-gradient(135deg, #FF6B6B, #FF3B30); }
.chain-avatar.mid  { background: linear-gradient(135deg, #5AC8FA, #007AFF); }
.chain-avatar.tail { background: linear-gradient(135deg, #63E6BE, #34C759); }

.chain-avatar.has-image {
  background-size: cover;
  background-position: center;
  color: transparent;
}

.chain-avatar.has-image.head { box-shadow: 0 0 0 2px var(--red); }
.chain-avatar.has-image.mid  { box-shadow: 0 0 0 2px var(--blue); }
.chain-avatar.has-image.tail { box-shadow: 0 0 0 2px var(--green); }

.chain-node:hover .chain-avatar {
  transform: scale(1.1);
}

.chain-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.chain-user-id {
  font-size: 10px;
  font-weight: 500;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}

.chain-elf {
  font-size: 11px;
  color: var(--text-secondary);
}

.chain-arrow {
  display: flex;
  align-items: center;
  color: var(--text-tertiary);
  padding-top: 14px;
}

/* ===== RESULT COLUMN ===== */
.result-section {
  display: flex;
  flex-direction: column;
}

.export-bar {
  margin-bottom: 16px;
}

.export-btn {
  width: 100%;
  justify-content: center;
}

/* ===== EXPORT CONTAINER ===== */
.export-container {
  display: flex;
  flex-direction: column;
}

.export-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 12px;
}

.export-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.export-tier-badge {
  padding: 3px 10px;
  border-radius: var(--radius-full);
  background: var(--blue-bg);
  color: var(--blue);
  font-size: 12px;
  font-weight: 600;
}

/* ===== 群收款（微信原生账单） ===== */
.wx-collect {
  margin-bottom: 16px;
  background: #fff;
  border-radius: 6px;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: #111;
}

/* 分隔线 */
.wx-divider-thin {
  height: 1px;
  background: #EEEEEE;
}

/* 10px 深色粗分隔带 */
.wx-divider-band {
  height: 10px;
  background: #F2F2F2;
  border-top: 1px solid #ECECEC;
  border-bottom: 1px solid #ECECEC;
}

/* 第一部分：发起人信息 */
.wx-collect-initiator {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 16px;
}

.wx-collect-initiator-avatar {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #5AC8FA, #007AFF);
  background-size: cover;
  background-position: center;
}

.wx-collect-initiator-avatar.has-image {
  color: transparent;
}

.wx-collect-initiator-text {
  min-width: 0;
}

.wx-collect-initiator-title {
  font-size: 17px;
  font-weight: 700;
  color: #111;
  letter-spacing: -0.3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wx-collect-initiator-sub {
  font-size: 13px;
  color: #9A9A9A;
  margin-top: 3px;
  font-variant-numeric: tabular-nums;
}

/* 第二部分：收款状态 */
.wx-collect-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 16px 44px;
  gap: 6px;
}

.wx-collect-tab {
  font-size: 12px;
  color: #8A8A8A;
  letter-spacing: 1px;
  padding: 2px 8px;
  border: 1px solid #DADADA;
  border-radius: 4px;
}

.wx-collect-status-main {
  font-size: 34px;
  font-weight: 600;
  color: #9A9A9A;
  letter-spacing: 2px;
  margin-top: 18px;
}

.wx-collect-status-sub {
  font-size: 13px;
  color: #9A9A9A;
  font-variant-numeric: tabular-nums;
}

/* 第四部分：支付统计 */
.wx-collect-stats {
  font-size: 13px;
  color: #8A8A8A;
  padding: 12px 16px;
}

/* 第五部分：成员列表 */
.wx-collect-list {
  list-style: none;
  padding: 0;
  margin: 0;
  background: #fff;
}

.wx-collect-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 16px;
  border-top: 1px solid #EEEEEE;
}

.wx-collect-item:first-child {
  border-top: none;
}

.wx-collect-avatar {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #5AC8FA, #007AFF);
  background-size: cover;
  background-position: center;
}

.wx-collect-avatar.has-image {
  color: transparent;
}

.wx-collect-member-name {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 400;
  color: #111;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wx-collect-item-amount {
  font-size: 15px;
  color: #111;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

/* ===== RESULT CARD ===== */
.result-card {
  overflow: hidden;
}

.result-card.card-head {
  border-left: 3px solid var(--red);
}

.result-card.card-end {
  border-left: 3px solid var(--green);
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.result-identity {
  display: flex;
  align-items: center;
  gap: 12px;
}

.result-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.result-avatar.head { background: linear-gradient(135deg, #FF6B6B, #FF3B30); }
.result-avatar.mid  { background: linear-gradient(135deg, #5AC8FA, #007AFF); }
.result-avatar.end  { background: linear-gradient(135deg, #63E6BE, #34C759); }

.result-avatar.has-image {
  background-size: cover;
  background-position: center;
  color: transparent;
}

.result-avatar.has-image.head { box-shadow: 0 0 0 2px var(--red); }
.result-avatar.has-image.mid  { box-shadow: 0 0 0 2px var(--blue); }
.result-avatar.has-image.tail { box-shadow: 0 0 0 2px var(--green); }

.result-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.result-user-id {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}

.result-elf-badge {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.role-badge {
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.role-badge.源头   { background: var(--red-bg);    color: var(--red); }
.role-badge.中间人 { background: var(--blue-bg);   color: var(--blue); }
.role-badge.末端   { background: var(--green-bg);  color: var(--green); }

/* ===== LINE LIST ===== */
.line-list {
  list-style: none;
  padding: 0;
  margin: 14px 0 0;
  display: flex;
  flex-direction: column;
}

.line-item {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 8px 0;
  border-top: 1px solid var(--separator);
}

.line-item:first-child {
  border-top: none;
  padding-top: 0;
}

.line-amount {
  flex: 0 0 auto;
  min-width: 56px;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.2px;
  font-variant-numeric: tabular-nums;
  color: var(--text);
}

.line-amount.expense,
.line-amount.out {
  color: var(--red);
}

.line-amount.in {
  color: var(--green);
}

.line-amount.info {
  color: var(--blue);
  font-size: 13px;
  font-weight: 600;
}

.line-label {
  flex: 1;
  font-size: 14px;
  line-height: 1.45;
  color: var(--text);
  word-break: break-word;
}

.line-note {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-left: 4px;
}

/* ===== NET SUMMARY ===== */
.net-summary {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 12px 14px;
  margin-top: 12px;
  border-radius: var(--radius-sm);
  background: var(--red-bg);
  border: 1px solid var(--red-border);
}

.net-summary-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.net-summary-value {
  font-size: 22px;
  font-weight: 800;
  color: var(--red);
  letter-spacing: -0.5px;
  font-variant-numeric: tabular-nums;
}

/* ===== FRIEND CHIPS ===== */
.friend-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.friend-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.friend-chip-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
}

.friend-chip.ok {
  background: var(--green-bg);
  color: var(--green);
}

.friend-chip.ok .friend-chip-icon {
  background: var(--green);
}

.friend-chip.need {
  background: var(--orange-bg);
  color: var(--orange);
}

.friend-chip.need .friend-chip-icon {
  background: var(--orange);
}

.friend-chip-tag {
  font-size: 10px;
  background: var(--orange-bg);
  padding: 1px 6px;
  border-radius: 4px;
  color: var(--orange);
}

.flex-shrink {
  flex-shrink: 0;
}

/* ===== SPINNER ===== */
.spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ===== TRANSITIONS ===== */
.list-enter-active,
.list-leave-active {
  transition: all 0.4s var(--spring);
}

/* 纵向入场:卡片是竖着堆叠的,从侧面滑进来与阅读方向不一致,
   且宽度变化时会挤到旁边的删除按钮。改成从下方淡入 + 轻微上浮。 */
.list-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.985);
}

.list-leave-to {
  opacity: 0;
  transform: scale(0.97);
}

.list-leave-active {
  position: absolute;
  /* 离场时收窄整行,给下方卡片让位(配合 .list-move 的位移) */
  left: 0;
  right: 0;
}

.list-move {
  transition: transform 0.4s var(--spring);
}

/* Alert transitions */
.alert-enter-active,
.alert-leave-active {
  transition: all 0.35s var(--spring);
}

.alert-enter-from,
.alert-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.96);
}

/* Fade transitions */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.45s var(--ease-out);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

.fade-move {
  transition: transform 0.45s var(--ease-out);
}

/* ===== RESULT PLACEHOLDER =====
   只在大屏(双列)显示:单列时右列在下方,空态会变成两块"什么都没有"
   的空白区,反而不如直接接着配置区更紧凑。 */
.result-placeholder {
  display: none;
}

@media (min-width: 960px) {
  .result-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 8px;
    min-height: 420px;
    padding: 40px 32px;
    /* 半透明底 + 毛玻璃:页面有背景图,纯透明会让虚线框里的字和背景糊在一起 */
    background: var(--surface);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1.5px dashed var(--border-strong);
    border-radius: var(--radius);
    color: var(--text-tertiary);
  }

  .result-placeholder svg {
    color: var(--text-tertiary);
    opacity: 0.7;
    margin-bottom: 6px;
  }

  .result-placeholder .ph-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .result-placeholder .ph-sub {
    font-size: 13px;
    color: var(--text-tertiary);
    max-width: 320px;
    line-height: 1.6;
  }

  /* 列出"生成后能得到什么"——比干说"暂无数据"更能说明这块区域的价值 */
  .result-placeholder .ph-list {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid var(--separator);
    list-style: none;
    font-size: 12.5px;
    color: var(--text-tertiary);
    line-height: 2;
  }

  .result-placeholder .ph-list li::before {
    content: '·';
    margin-right: 8px;
    color: var(--accent);
    font-weight: 700;
  }
}

/* ===== MOBILE ACTION BAR =====
   仅在单列(<960px)出现:桌面左栏已 sticky,不需要。
   固定底部会盖住内容,故同时给 .app-content 补上等高底部留白。 */
/* 常驻(所有尺寸):页面内 action-bar 已删除,这是唯一入口。
   通栏 + 内层与内容同宽居中,桌面端看着像一条工具条而非移动端浮层。 */
.mobile-bar {
  display: block;
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0px));
  background: var(--surface);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border-top: 1px solid var(--border);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.06);
}

/* 内层容器:与 .app-content 同宽居中,按钮跟着内容列走 */
.mobile-bar-inner {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 1320px;
  margin: 0 auto;
}

@media (min-width: 1440px) {
  .mobile-bar-inner { max-width: min(calc(100vw - 80px), 1600px); }
}
@media (min-width: 1800px) {
  .mobile-bar-inner { max-width: min(calc(100vw - 120px), 1760px); }
}

.mobile-bar-add {
  flex: none;
  margin: 0;
}

@media (max-width: 959px) {
  .mobile-bar {
    padding-left: 12px;
    padding-right: 12px;
  }

  .mobile-bar-main {
    flex: 1 1 auto;
    min-width: 0;
    margin: 0;
  }

  /* 回顶按钮:方形、与主按钮等高,只占必要宽度 */
  .mobile-bar-top {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 46px;
    height: 46px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-strong);
    background: var(--surface-solid);
    color: var(--text-secondary);
    cursor: pointer;
    transition: background 0.2s var(--ease-out), color 0.2s var(--ease-out);
  }
  .mobile-bar-top:active {
    background: var(--fill);
    color: var(--text);
  }
}

/* ===== RESPONSIVE ENHANCEMENTS ===== */
@media (max-width: 959px) {
  .app-content {
    /* 底部让出操作条的高度(条 ~68px + 一点余量),否则最后一张卡片被盖住 */
    padding: 16px 12px calc(96px + env(safe-area-inset-bottom, 0px));
  }

  .app-header {
    padding: 10px 14px;
    margin-bottom: 16px;
    border-radius: var(--radius-sm);
    gap: 8px;
  }

  /* 窄屏:标题截断而不是把右侧按钮挤出去。min-width:0 是 flex 子项
     能收缩的前提,缺了它 ellipsis 不生效、header 会横向溢出。 */
  .app-title-text {
    font-size: 15px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* 导入/导出在窄屏只留图标 —— 文字留着会把主题切换挤出可视区 */
  .btn-text {
    display: none;
  }

  .btn-sm {
    padding: 7px 10px;
  }

  .card {
    padding: 16px;
    border-radius: var(--radius-sm);
  }

  .section-title {
    font-size: 17px;
  }

  .stat-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .stat-value {
    font-size: 22px;
  }
}

@media (max-width: 420px) {
  /* 极窄屏:标题不再缩字号(16px 在 320px 宽下仍会挤),保持与 959 断点
     一致的截断处理,只把内边距再收紧一点 */
  .app-title-text {
    font-size: 14px;
  }

  .btn-large {
    padding: 12px 20px;
    font-size: 15px;
  }

  .segment-btn {
    padding: 12px 8px;
  }

  /* 触摸目标 ≥44px(Apple HIG / WCAG 2.5.5 的实用下限):
     窄屏上小图标按钮最容易点错 */
  .theme-toggle,
  .btn-sm {
    min-width: 44px;
    min-height: 44px;
  }

  .segment-text {
    font-size: 14px;
  }
}
</style>
