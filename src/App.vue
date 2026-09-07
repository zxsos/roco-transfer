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
            <svg v-if="resolvedTheme === 'light'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </button>
          <!-- 导入/导出 -->
          <button class="btn btn-secondary btn-sm" @click="triggerImportConfig">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span class="btn-text">导入</span>
          </button>
          <button
            class="btn btn-secondary btn-sm"
            :disabled="people.length === 0"
            @click="exportConfig"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span class="btn-text">导出</span>
          </button>
        </div>
      </header>

      <!-- ===== MAIN CONTENT ===== -->
      <div class="content-wrapper" :class="{ 'has-result': planResult && planResult.success }">

        <!-- ===== LEFT COLUMN: CONFIG ===== -->
        <div class="config-column">

          <!-- 档次选择 -->
          <section class="card config-section">
            <h2 class="section-title">档次选择</h2>
            <div class="segment-control">
              <button
                class="segment-btn"
                :class="{ active: tier === 'normal' }"
                @click="tier = 'normal'"
              >
                <span class="segment-text">普通版</span>
                <span class="segment-price">{{ PRICE.normal.pass }}/{{ PRICE.normal.coupon }}元</span>
              </button>
              <button
                class="segment-btn"
                :class="{ active: tier === 'premium' }"
                @click="tier = 'premium'"
              >
                <span class="segment-text">豪华版</span>
                <span class="segment-price">{{ PRICE.premium.pass }}/{{ PRICE.premium.coupon }}元</span>
              </button>
            </div>
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
              <button class="btn btn-primary btn-sm" @click="addPerson">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                添加
              </button>
            </div>

            <!-- 空状态 -->
            <div v-if="people.length === 0" class="empty-state">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="empty-icon">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              <p class="empty-text">还没有添加人物</p>
              <p class="empty-sub">添加拼团成员后，下方将生成传火方案</p>
              <button class="btn btn-primary" @click="addPerson">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
            <input
              ref="fileInputRef"
              type="file"
              accept="application/json,.json"
              style="display: none"
              @change="handleImportConfig"
            />

            <!-- 人物列表 -->
            <TransitionGroup name="list" tag="div" class="person-list">
              <div
                v-for="(person, index) in people"
                :key="person.id"
                class="person-row"
              >
                <!-- 头像 -->
                <div
                  class="person-avatar"
                  :class="{ 'has-image': person.avatar }"
                  :style="person.avatar ? { backgroundImage: `url(${person.avatar})` } : null"
                  tabindex="0"
                  :title="person.avatar ? '点击更换 / 粘贴图片 / Delete 清除' : '点击上传 / 粘贴图片设置头像'"
                  @click="triggerAvatarPicker(person)"
                  @paste="handleAvatarPaste($event, person)"
                  @keydown.delete.prevent="clearAvatar(person)"
                  @keydown.backspace.prevent="clearAvatar(person)"
                >
                  <svg v-if="!person.avatar" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  <button
                    v-if="person.avatar"
                    class="avatar-clear"
                    title="清除头像"
                    @click.stop="clearAvatar(person)"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>

                <!-- 字段 -->
                <div class="person-fields">
                  <div class="person-field name-field">
                    <label class="field-label">姓名</label>
                    <input v-model="person.name" placeholder="输入姓名" class="input" />
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
                  <div class="person-field toggle-field">
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
                  <div class="person-field toggle-field">
                    <label class="field-label">车尾</label>
                    <button
                      class="toggle"
                      :class="{ active: person.isTail }"
                      @click="onTailToggle(person)"
                      :aria-label="person.isTail ? '取消车尾' : '设为车尾'"
                    >
                      <span class="toggle-knob"></span>
                    </button>
                  </div>
                </div>

                <!-- 删除按钮 -->
                <button class="person-delete" @click="removePerson(index)" aria-label="删除">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </TransitionGroup>
          </section>

          <!-- 好友关系矩阵 -->
          <section v-if="people.length >= 2" class="card friend-section">
            <div class="section-header">
              <h2 class="section-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="section-title-icon">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
                </svg>
                好友关系
              </h2>
              <div class="section-actions">
                <span class="friend-count">共 {{ friendCount }} 对好友</span>
                <button class="btn btn-secondary btn-sm" @click="clearAllFriends">清空</button>
              </div>
            </div>
            <p class="section-hint">勾选单元格表示两人互为好友（对角线不可选）</p>
            <div class="matrix-wrapper">
              <table class="friend-matrix">
                <thead>
                  <tr>
                    <th class="matrix-corner"></th>
                    <th v-for="p in people" :key="'h-' + p.id" class="matrix-header">
                      <span class="matrix-name">{{ p.name || '—' }}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, ri) in people" :key="'r-' + row.id">
                    <td class="matrix-row-header">
                      <span class="matrix-name">{{ row.name || '—' }}</span>
                    </td>
                    <td
                      v-for="(col, ci) in people"
                      :key="'c-' + col.id"
                      class="matrix-cell"
                      :class="{
                        'cell-diagonal': ri === ci,
                        'cell-checked': ri !== ci && isFriendPair(row.id, col.id),
                        'cell-hover': hoveredCell && ((hoveredCell.ri === ri && hoveredCell.ci === ci) || (hoveredCell.ri === ci && hoveredCell.ci === ri)),
                      }"
                      @click="ri !== ci && toggleFriendCell(row.id, col.id)"
                      @mouseenter="hoveredCell = { ri, ci }"
                      @mouseleave="hoveredCell = null"
                    >
                      <span v-if="ri === ci" class="cell-diagonal-mark">—</span>
                      <svg v-else-if="isFriendPair(row.id, col.id)" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="cell-check">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- 操作栏 -->
          <div class="action-bar">
            <button
              class="btn btn-large btn-primary"
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
                生成传火方案
              </template>
            </button>
            <button class="btn btn-large btn-ghost" @click="resetAll">重置</button>
          </div>

          <!-- 错误提示 -->
          <Transition name="alert">
            <div v-if="errorMsg" class="alert alert-error">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="alert-icon">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span class="alert-text">{{ errorMsg }}</span>
              <button class="alert-close" @click="errorMsg = ''">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
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
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </Transition>
        </div>

        <!-- ===== RIGHT COLUMN: RESULT ===== -->
        <div class="result-column">
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
                  <div class="export-tier-badge">{{ tier === 'normal' ? '普通版' : '豪华版' }}</div>
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
                      <span v-if="!planResult.collectBill.head.avatar">{{ (planResult.collectBill.head.name || '?').charAt(0) }}</span>
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
                        <span v-if="!it.person.avatar">{{ (it.person.name || '?').charAt(0) }}</span>
                      </div>
                      <span class="wx-collect-member-name">{{ it.person.name }}</span>
                      <span class="wx-collect-item-amount">待支付 ¥{{ it.amount.toFixed(2) }}</span>
                    </li>
                  </ul>
                </section>

                <!-- 传火链条 -->
                <section key="chain" class="card chain-section">
                  <h2 class="section-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="section-title-icon">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                    传火链条
                  </h2>
                  <div class="chain-flow">
                    <template v-for="(item, idx) in planResult.chainWithElf" :key="item.person.id">
                      <div class="chain-node">
                        <div
                          class="chain-avatar"
                          :class="[idx === 0 ? 'head' : idx === planResult.chainWithElf.length - 1 ? 'tail' : 'mid', { 'has-image': item.person.avatar }]"
                          :style="item.person.avatar ? { backgroundImage: `url(${item.person.avatar})` } : null"
                        >
                          <span v-if="!item.person.avatar">{{ (item.person.name || '?').charAt(0) }}</span>
                        </div>
                        <div class="chain-name">{{ item.person.name }}</div>
                        <div v-if="item.person.userId" class="chain-user-id">#{{ item.person.userId }}</div>
                        <div class="chain-elf">{{ getElfName(item.assignedElf) }}</div>
                      </div>
                      <div v-if="idx < planResult.chainWithElf.length - 1" class="chain-arrow">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                        </svg>
                      </div>
                    </template>
                  </div>
                </section>

                <!-- 好友提醒 -->
                <div
                  v-if="planResult.friendWarnings && planResult.friendWarnings.length > 0"
                  key="friend-warn"
                  class="alert alert-warning"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="alert-icon flex-shrink">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
                  </svg>
                  <div class="alert-detail">
                    <span class="alert-text">以下人员需先加好友才能赠送副券</span>
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
                    'card-tail': card.role === '车尾',
                  }"
                >
                  <div class="result-header">
                    <div class="result-identity">
                      <div
                        class="result-avatar"
                        :class="[card.role === '源头' ? 'head' : card.role === '车尾' ? 'tail' : 'mid', { 'has-image': card.person.avatar }]"
                        :style="card.person.avatar ? { backgroundImage: `url(${card.person.avatar})` } : null"
                      >
                        <span v-if="!card.person.avatar">{{ (card.person.name || '?').charAt(0) }}</span>
                      </div>
                      <div>
                        <div class="result-name">
                          <span>{{ card.person.name }}</span>
                          <span v-if="card.person.userId" class="result-user-id">#{{ card.person.userId }}</span>
                        </div>
                        <div class="result-elf-badge">需要「{{ card.myElfName }}」</div>
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

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted } from 'vue'
import { generatePlan, PRICE } from './utils/calculator.js'
import html2canvas from 'html2canvas'

// ===== 状态 =====
const tier = ref('normal')
const elfName1 = ref('新月鹭')
const elfName2 = ref('热团团')

// 主题: 'system' | 'light' | 'dark'
const themeMode = ref('system')
const resolvedTheme = ref('light')

let nextId = 1
const people = reactive([])
const friendships = reactive(new Map())
const planResult = ref(null)
const errorMsg = ref('')
const importToast = ref('')
const exporting = ref(false)
const computing = ref(false)
const exportContainer = ref(null)
const fileInputRef = ref(null)
const avatarInputRef = ref(null)
let avatarTargetId = null

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
const friendCount = computed(() => {
  let count = 0
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      if (isFriendPair(people[i].id, people[j].id)) count++
    }
  }
  return count
})

const hoveredCell = ref(null)

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

function clearAllFriends() {
  friendships.clear()
}

// ===== 人物管理 =====
function addPerson() {
  people.push({ id: nextId++, name: '', userId: '', avatar: '', needElf: 'elf1', isHead: false, isTail: false })
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
    loaded.push({ id: nextId++, name, userId, avatar: url, needElf: 'any', isHead: false, isTail: false })
  }
  loaded.sort((a, b) => a.name.localeCompare(b.name, 'zh'))
  loaded.forEach((p) => people.push(p))
}

onMounted(loadUsersFromDir)

function removePerson(index) {
  const removed = people.splice(index, 1)[0]
  const keysToDelete = []
  for (const [key] of friendships) {
    if (key.includes(`${removed.id}-`) || key.includes(`-${removed.id}`)) {
      keysToDelete.push(key)
    }
  }
  keysToDelete.forEach((k) => friendships.delete(k))
}

function onHeadToggle(person) {
  person.isHead = !person.isHead
  if (person.isHead) {
    people.forEach((p) => {
      if (p.id !== person.id) p.isHead = false
    })
  }
}

function onTailToggle(person) {
  person.isTail = !person.isTail
  if (person.isTail) {
    people.forEach((p) => {
      if (p.id !== person.id) p.isTail = false
    })
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
  nextId = 1
  tier.value = 'normal'
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
    const [idA, idB] = key.split('-').map(Number)
    matrix.push([idA, idB])
  }
  return matrix
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
    [...people], tier.value,
    { elf1: elfName1.value || '新月鹭', elf2: elfName2.value || '热团团' },
    buildFriendMatrix()
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
function exportConfig() {
  if (people.length === 0) return
  const config = {
    version: 1,
    exportedAt: new Date().toISOString(),
    tier: tier.value,
    elfName1: elfName1.value,
    elfName2: elfName2.value,
    people: people.map((p) => ({
      id: p.id,
      name: p.name,
      userId: p.userId || '',
      avatar: p.avatar || '',
      needElf: p.needElf,
      isHead: !!p.isHead,
      isTail: !!p.isTail,
    })),
    friendships: Array.from(friendships.keys()).map((k) => k.split('-').map(Number)),
  }
  try {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
    link.download = `传火配置_${stamp}.json`
    link.href = url
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showImportToast(`已导出 ${people.length} 人配置`)
  } catch (e) {
    errorMsg.value = '导出配置失败：' + (e?.message || e)
  }
}

function triggerImportConfig() {
  if (fileInputRef.value) fileInputRef.value.click()
}

function handleImportConfig(event) {
  const file = event.target.files && event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const text = String(e.target.result || '')
      const config = JSON.parse(text)
      const summary = applyConfig(config)
      errorMsg.value = ''
      showImportToast(`已导入 ${summary.peopleCount} 人、${summary.friendCount} 对好友关系`)
    } catch (err) {
      errorMsg.value = '导入失败：' + (err?.message || err)
    }
  }
  reader.onerror = () => {
    errorMsg.value = '导入失败：无法读取文件'
  }
  reader.readAsText(file, 'utf-8')
  event.target.value = ''
}

function applyConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('配置文件格式无效')
  }
  if (config.tier === 'normal' || config.tier === 'premium') {
    tier.value = config.tier
  }
  if (typeof config.elfName1 === 'string') elfName1.value = config.elfName1
  if (typeof config.elfName2 === 'string') elfName2.value = config.elfName2

  people.length = 0
  let maxId = 0
  const idMap = new Map()
  if (Array.isArray(config.people)) {
    for (const p of config.people) {
      if (!p || typeof p !== 'object') continue
      const originalId = Number(p.id)
      const newId = Number.isFinite(originalId) && originalId > 0 ? originalId : maxId + 1
      if (idMap.has(newId)) continue
      idMap.set(originalId, newId)
      maxId = Math.max(maxId, newId)
      const needElf = ['elf1', 'elf2', 'any'].includes(p.needElf) ? p.needElf : 'elf1'
      const avatar = typeof p.avatar === 'string' && p.avatar.startsWith('data:image/') ? p.avatar : ''
      people.push({
        id: newId,
        name: typeof p.name === 'string' ? p.name : '',
        userId: typeof p.userId === 'string' ? p.userId : '',
        avatar,
        needElf,
        isHead: !!p.isHead,
        isTail: !!p.isTail,
      })
    }
  }
  nextId = maxId + 1

  const headList = people.filter((p) => p.isHead)
  if (headList.length > 1) headList.slice(1).forEach((p) => (p.isHead = false))
  const tailList = people.filter((p) => p.isTail)
  if (tailList.length > 1) tailList.slice(1).forEach((p) => (p.isTail = false))

  friendships.clear()
  if (Array.isArray(config.friendships)) {
    const validIds = new Set(people.map((p) => p.id))
    for (const pair of config.friendships) {
      if (!Array.isArray(pair) || pair.length !== 2) continue
      const a = Number(pair[0])
      const b = Number(pair[1])
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
  padding: 24px 20px 64px;
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
  gap: 20px;
}

/* Desktop: side-by-side */
@media (min-width: 960px) {
  .content-wrapper {
    flex-direction: row;
    align-items: flex-start;
  }

  .config-column {
    flex: 1 1 420px;
    max-width: 520px;
    position: sticky;
    top: 24px;
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

.card:hover {
  box-shadow: var(--shadow-md);
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
  .person-fields {
    grid-template-columns: 1fr;
  }
  .name-field, .id-field, .elf-field {
    grid-column: 1 / -1;
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
.matrix-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 4px;
  margin: 0 -4px;
}

.friend-matrix {
  border-collapse: separate;
  border-spacing: 4px;
  margin: 0 auto;
}

.matrix-corner {
  width: 48px;
}

.matrix-header,
.matrix-row-header {
  padding: 6px 8px;
  font-weight: 600;
  font-size: 13px;
  color: var(--text);
  background: var(--fill);
  border-radius: 6px;
  min-width: 44px;
}

.matrix-row-header {
  text-align: right;
}

.matrix-name {
  display: inline-block;
  max-width: 56px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}

.matrix-cell {
  width: 40px;
  height: 40px;
  text-align: center;
  vertical-align: middle;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s var(--ease-out);
  background: var(--fill);
  border: 1px solid var(--border);
  user-select: none;
  color: var(--blue);
}

.matrix-cell:hover:not(.cell-diagonal) {
  background: var(--fill-secondary);
}

.matrix-cell.cell-hover:not(.cell-diagonal) {
  background: var(--blue-bg);
  border-color: var(--blue-border);
}

.matrix-cell.cell-checked {
  background: var(--blue-bg);
  border-color: var(--blue-border);
}

.matrix-cell.cell-checked.cell-hover {
  background: rgba(0, 122, 255, 0.15);
  border-color: rgba(0, 122, 255, 0.28);
}

.cell-diagonal {
  cursor: default;
  background: transparent;
  border-color: transparent;
}

.cell-diagonal-mark {
  color: var(--text-tertiary);
  font-size: 14px;
}

.cell-check {
  color: var(--blue);
}

.friend-count {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-right: 4px;
}

/* ===== ACTION BAR ===== */
.action-bar {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin: 24px 0;
}

.action-bar .btn-large {
  flex: 0 1 auto;
}

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

.result-card.card-tail {
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
.result-avatar.tail { background: linear-gradient(135deg, #63E6BE, #34C759); }

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
.role-badge.车尾   { background: var(--green-bg);  color: var(--green); }

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

.list-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.list-leave-active {
  position: absolute;
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

/* ===== RESPONSIVE ENHANCEMENTS ===== */
@media (max-width: 959px) {
  .app-content {
    padding: 16px 12px 48px;
  }

  .app-header {
    padding: 12px 16px;
    margin-bottom: 16px;
    border-radius: var(--radius-sm);
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
  .app-title-text {
    font-size: 16px;
  }

  .btn-large {
    padding: 12px 20px;
    font-size: 15px;
  }

  .segment-btn {
    padding: 12px 8px;
  }

  .segment-text {
    font-size: 14px;
  }
}
</style>
