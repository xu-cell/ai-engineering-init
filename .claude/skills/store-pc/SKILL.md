---
name: store-pc
description: |
  PC 端（plus-ui）状态管理与 Hooks 指南。包含 Pinia Store、Hooks 组合式函数的创建和使用规范。

  触发场景：
  - 在 PC 后台创建/使用 Store
  - Pinia 状态管理
  - 跨组件数据共享（PC端）
  - 持久化存储（useStorage）
  - 权限判断
  - 字典数据管理

  触发词：PC Store、Pinia、defineStore、useUserStore、useDictStore、PC状态管理、useStorage、持久化、状态管理

  适用目录：plus-ui/**
---

# PC 端状态管理指南

> **适用于**: `plus-ui/` 目录下的 PC 后台管理系统

## 自动导入说明

以下内容**无需手动 import**（通过 unplugin-auto-import 自动导入）：

```typescript
// Vue APIs
ref, reactive, computed, watch, watchEffect, watchPostEffect, watchSyncEffect
onMounted, onUnmounted, onBeforeMount, onBeforeUnmount, onBeforeUpdate, onUpdated
onActivated, onDeactivated, onErrorCaptured, onRenderTracked, onRenderTriggered
onServerPrefetch
nextTick, toRefs, toRef, unref, isRef, isReactive, isReadonly, isProxy
provide, inject, defineProps, defineEmits, defineExpose, defineOptions, defineSlots
withDefaults, useSlots, useAttrs, useCssModule, useCssVars
shallowRef, shallowReactive, shallowReadonly, triggerRef, customRef, toRaw, markRaw
effectScope, getCurrentScope, onScopeDispose

// Pinia
defineStore, storeToRefs, acceptHMRUpdate, createPinia, setActivePinia, getActivePinia
mapStores, mapState, mapWritableState, mapActions

// Vue Router
useRouter, useRoute, useLink, onBeforeRouteLeave, onBeforeRouteUpdate

// @vueuse/core
useStorage, useLocalStorage, useSessionStorage, useMouse, useWindowSize
// ... 以及其他 @vueuse/core 导出的函数

// Element Plus
ElMessage, ElMessageBox, ElNotification, ElLoading
// ... 以及其他 Element Plus 组件和函数
```

**需要手动 import 的**：

```typescript
// Stores（需要手动导入）
import { useUserStore } from '@/store/modules/user'
import { useDictStore } from '@/store/modules/dict'
import { usePermissionStore } from '@/store/modules/permission'
import { useAppStore } from '@/store/modules/app'
import { useSettingsStore } from '@/store/modules/settings'
import { useTagsViewStore } from '@/store/modules/tagsView'
import { useNoticeStore } from '@/store/modules/notice'

// Hooks（需要手动导入）
import useDialog from '@/hooks/useDialog'

// 工具函数（需要手动导入）
import { getToken, setToken, removeToken } from '@/utils/auth'
```

---

## 已有 Store 清单

| Store | 文件 | 用途 | 关键方法 |
|-------|------|------|---------|
| `useUserStore` | `store/modules/user.ts` | 用户认证、权限 | login, logout, getInfo, setAvatar |
| `useDictStore` | `store/modules/dict.ts` | 字典数据缓存 | getDict, setDict, removeDict, cleanDict |
| `usePermissionStore` | `store/modules/permission.ts` | 路由权限 | generateRoutes, setRoutes, setSidebarRouters |
| `useAppStore` | `store/modules/app.ts` | 应用配置（侧边栏、语言、尺寸） | toggleSideBar, closeSideBar, changeLanguage, setSize |
| `useSettingsStore` | `store/modules/settings.ts` | 布局设置 | setTitle |
| `useTagsViewStore` | `store/modules/tagsView.ts` | 标签页管理 | addView, delView, delAllViews, delOthersViews |
| `useNoticeStore` | `store/modules/notice.ts` | 通知消息 | addNotice, removeNotice, readAll, clearNotice |

---

## Hooks 清单

> Hooks 是可复用的组合式函数，封装了特定业务逻辑。

### 已有 Hooks

| Hook | 文件 | 用途 | 关键方法/属性 |
|------|------|------|--------------|
| `useDialog` | `hooks/useDialog.ts` | 弹窗控制 | visible, title, openDialog, closeDialog |

### useDialog 使用示例

```typescript
import useDialog from '@/hooks/useDialog'

// 在组件中使用
const { visible, title, openDialog, closeDialog } = useDialog({ title: '编辑用户' })

// 打开弹窗
const handleEdit = () => {
  openDialog()
}

// 关闭弹窗
const handleClose = () => {
  closeDialog()
}
```

---

## 创建新 Store

### 标准模板

```typescript
// store/modules/xxx.ts
// ✅ defineStore、ref、computed 已自动导入，无需手动 import

export const useXxxStore = defineStore('xxx', () => {
  // ========== 状态 ==========
  const list = ref<XxxVo[]>([])
  const loading = ref(false)
  const current = ref<XxxVo | null>(null)

  // ========== 计算属性 ==========
  const count = computed(() => list.value.length)
  const isEmpty = computed(() => list.value.length === 0)
  const hasSelected = computed(() => current.value !== null)

  // ========== 方法 ==========

  /**
   * 获取列表
   */
  const fetchList = async (params?: XxxQuery) => {
    loading.value = true
    try {
      const res = await pageXxxs(params)
      list.value = res.data.records
    } catch (error) {
      console.error('获取列表失败:', error)
    } finally {
      loading.value = false
    }
  }

  /**
   * 设置当前选中项
   */
  const setCurrent = (item: XxxVo | null) => {
    current.value = item
  }

  /**
   * 重置状态
   */
  const reset = () => {
    list.value = []
    current.value = null
    loading.value = false
  }

  // ========== 返回 ==========
  return {
    // 状态
    list,
    loading,
    current,
    // 计算属性
    count,
    isEmpty,
    hasSelected,
    // 方法
    fetchList,
    setCurrent,
    reset
  }
})
```

---

## 使用 Store

### 基本用法

```typescript
import { useXxxStore } from '@/store/modules/xxx'

const xxxStore = useXxxStore()

// 访问状态（非响应式）
console.log(xxxStore.list)
console.log(xxxStore.count)

// 调用方法
await xxxStore.fetchList()
xxxStore.setCurrent(item)
xxxStore.reset()
```

### 响应式解构

```typescript
import { useXxxStore } from '@/store/modules/xxx'

const xxxStore = useXxxStore()

// ✅ 正确：使用 storeToRefs 解构状态
const { list, loading, current } = storeToRefs(xxxStore)

// ✅ 正确：方法直接解构（方法不需要响应式）
const { fetchList, setCurrent, reset } = xxxStore

// ❌ 错误：直接解构状态会丢失响应式
// const { list, loading } = xxxStore
```

### 在模板中使用

```vue
<template>
  <div v-loading="xxxStore.loading">
    <div v-for="item in xxxStore.list" :key="item.id">
      {{ item.name }}
    </div>
    <div v-if="xxxStore.isEmpty">暂无数据</div>
  </div>
</template>

<script setup lang="ts">
import { useXxxStore } from '@/store/modules/xxx'

const xxxStore = useXxxStore()

onMounted(() => {
  xxxStore.fetchList()
})
</script>
```

---

## 持久化存储

> ⚠️ **重要**：本项目使用 `@vueuse/core` 的 `useStorage` 实现持久化存储，而不是 pinia-plugin-persist 插件。

### useStorage 说明

```typescript
// useStorage 已自动导入，无需手动 import
// 基于 localStorage
const data = useStorage('key', defaultValue)

// 基于 sessionStorage
const data = useSessionStorage('key', defaultValue)

// 基于 localStorage（显式指定）
const data = useLocalStorage('key', defaultValue)
```

### useStorage API

```typescript
// 设置值（自动保存到 localStorage）
const token = useStorage('token', '')
token.value = 'new-token'  // 自动保存

// 获取值
console.log(token.value)

// 删除值
token.value = null

// 带类型的存储
const user = useStorage<UserInfo>('user', null)
user.value = { name: 'admin', age: 18 }
```

### 在 Store 中使用 useStorage

```typescript
// store/modules/app.ts 示例
import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'

export const useAppStore = defineStore('app', () => {
  // ✅ 使用 useStorage 实现持久化
  const sidebarStatus = useStorage('sidebarStatus', '1')
  const size = useStorage<'large' | 'default' | 'small'>('size', 'default')
  const language = useStorage('language', 'zh_CN')

  // 状态会自动持久化到 localStorage
  const sidebar = reactive({
    opened: sidebarStatus.value ? !!+sidebarStatus.value : true,
    withoutAnimation: false,
    hide: false
  })

  const toggleSideBar = (withoutAnimation: boolean) => {
    sidebar.opened = !sidebar.opened
    sidebar.withoutAnimation = withoutAnimation
    // ✅ 修改 sidebarStatus 会自动保存到 localStorage
    sidebarStatus.value = sidebar.opened ? '1' : '0'
  }

  return {
    sidebar,
    size,
    language,
    toggleSideBar
  }
})
```

### Token 管理示例

```typescript
// utils/auth.ts 示例
import { useStorage } from '@vueuse/core'

const TokenKey = 'Admin-Token'
const tokenStorage = useStorage<null | string>(TokenKey, null)

export const getToken = () => tokenStorage.value

export const setToken = (access_token: string) => (tokenStorage.value = access_token)

export const removeToken = () => (tokenStorage.value = null)
```

### 在 useUserStore 中使用

```typescript
// store/modules/user.ts 示例
import { defineStore } from 'pinia'
import { getToken, setToken, removeToken } from '@/utils/auth'

export const useUserStore = defineStore('user', () => {
  // ✅ token 通过 utils/auth.ts 中的 useStorage 持久化
  const token = ref(getToken())
  const roles = ref<Array<string>>([])
  const permissions = ref<Array<string>>([])

  const login = async (userInfo: LoginData): Promise<void> => {
    const res = await loginApi(userInfo)
    const data = res.data
    setToken(data.access_token)  // ✅ 自动保存到 localStorage
    token.value = data.access_token
  }

  const logout = async (): Promise<void> => {
    await logoutApi()
    token.value = ''
    roles.value = []
    permissions.value = []
    removeToken()  // ✅ 自动从 localStorage 删除
  }

  return {
    token,
    roles,
    permissions,
    login,
    logout
  }
})
```

---

## 最佳实践

### 1. 何时使用 Store

| 场景 | 是否使用 Store |
|------|---------------|
| 多个页面/组件共享的数据 | ✅ 使用 |
| 用户登录状态、权限 | ✅ 使用 |
| 全局配置、主题设置 | ✅ 使用 |
| 字典数据缓存 | ✅ 使用 |
| 页面内部状态 | ❌ 用 ref/reactive |
| 组件内部状态 | ❌ 用 ref/reactive |
| 父子组件传值 | ❌ 用 props/emit |
| 兄弟组件通信（简单） | ❌ 用 provide/inject |

### 2. Store 命名规范

```typescript
// ✅ 正确：use + 业务名 + Store
export const useUserStore = defineStore('user', ...)
export const useCartStore = defineStore('cart', ...)
export const useDictStore = defineStore('dict', ...)

// ❌ 错误：不规范的命名
export const userStore = defineStore('user', ...)
export const useUser = defineStore('user', ...)
```

### 3. 避免循环依赖

```typescript
// ❌ 避免 Store 之间循环引用
// userStore.ts
import { useOrderStore } from './order'  // orderStore 又引用 userStore

// ✅ 正确做法：在组件层协调，或使用事件
```

### 4. 重置 Store（登出时）

```typescript
// 在 useUserStore 中
const logout = async () => {
  // 重置所有相关 Store
  const dictStore = useDictStore()
  const permissionStore = usePermissionStore()

  // 重置当前 Store
  token.value = ''
  roles.value = []
  permissions.value = []
  removeToken()

  // 重置其他 Store
  dictStore.cleanDict()

  // 跳转登录页
  router.push('/login')
}
```

### 5. 使用 Setup Syntax

```typescript
// ✅ 推荐：使用 Setup 语法（Composition API）
export const useXxxStore = defineStore('xxx', () => {
  const state = ref(0)
  const increment = () => state.value++
  return { state, increment }
})

// ❌ 不推荐：使用 Options API
export const useXxxStore = defineStore('xxx', {
  state: () => ({ count: 0 }),
  actions: {
    increment() { this.count++ }
  }
})
```

---

## 参考文件

### Stores

- Store 目录：`plus-ui/src/store/modules/`
- 用户 Store：`plus-ui/src/store/modules/user.ts`
- 字典 Store：`plus-ui/src/store/modules/dict.ts`
- 权限 Store：`plus-ui/src/store/modules/permission.ts`
- 应用 Store：`plus-ui/src/store/modules/app.ts`
- 设置 Store：`plus-ui/src/store/modules/settings.ts`
- 标签页 Store：`plus-ui/src/store/modules/tagsView.ts`
- 通知 Store：`plus-ui/src/store/modules/notice.ts`

### Hooks

- Hooks 目录：`plus-ui/src/hooks/`
- 弹窗控制：`plus-ui/src/hooks/useDialog.ts`

### 工具类

- Token 管理：`plus-ui/src/utils/auth.ts`（使用 useStorage）

### 配置文件

- 自动导入配置：`plus-ui/vite/plugins/auto-import.ts`
- Vite 配置：`plus-ui/vite.config.ts`
---

