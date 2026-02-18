---
name: store-pc
description: |
  前端状态管理指南。包含 Vuex Store 的创建和使用规范。

  触发场景：
  - 创建/使用 Vuex Store
  - Vuex 状态管理
  - 跨组件数据共享
  - 全局状态管理

  触发词：Vuex、store、mapState、mapActions、commit、dispatch、状态管理

  适用目录：src/**
---

# 前端状态管理指南

> **适用于**: 腾云智慧食堂管理系统前端项目（Vue 2 + Vuex）

---

## 目录结构

```
src/store/
├── index.js           # Store 入口
├── getters.js         # 全局 getters
└── modules/           # Store 模块（~28个）
    ├── user.js        # 用户状态
    ├── app.js         # 应用状态
    ├── permission.js  # 权限状态
    └── ...
```

---

## 已有 Store 清单

| Store | 文件 | 用途 |
|-------|------|------|
| `user` | `store/modules/user.js` | 用户信息、登录状态 |
| `app` | `store/modules/app.js` | 应用状态（侧边栏、设备类型） |
| `permission` | `store/modules/permission.js` | 权限路由管理 |
| `tagsView` | `store/modules/tagsView.js` | 标签页管理 |
| `settings` | `store/modules/settings.js` | 系统设置 |
| `marketing` | `store/modules/marketing.js` | 营销状态 |
| `order` | `store/modules/order.js` | 订单状态 |
| `stock` | `store/modules/stock.js` | 库存状态 |
| `reportcenter` | `store/modules/reportcenter.js` | 报表状态 |

---

## 创建新 Store

### 标准模板

```javascript
// src/store/modules/xxx.js
import { getList, getDetail } from '@/api/xxx'

const state = {
  list: [],
  current: null,
  loading: false,
  total: 0
}

const mutations = {
  SET_LIST: (state, list) => {
    state.list = list
  },
  SET_CURRENT: (state, current) => {
    state.current = current
  },
  SET_LOADING: (state, loading) => {
    state.loading = loading
  },
  SET_TOTAL: (state, total) => {
    state.total = total
  }
}

const actions = {
  /**
   * 获取列表
   */
  async fetchList({ commit }, params) {
    commit('SET_LOADING', true)
    try {
      const res = await getList(params)
      commit('SET_LIST', res.rows || [])
      commit('SET_TOTAL', res.total || 0)
      return res
    } finally {
      commit('SET_LOADING', false)
    }
  },

  /**
   * 获取详情
   */
  async fetchDetail({ commit }, id) {
    const res = await getDetail(id)
    commit('SET_CURRENT', res.data)
    return res
  },

  /**
   * 重置状态
   */
  reset({ commit }) {
    commit('SET_LIST', [])
    commit('SET_CURRENT', null)
    commit('SET_TOTAL', 0)
  }
}

const getters = {
  list: state => state.list,
  current: state => state.current,
  loading: state => state.loading,
  total: state => state.total
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}
```

---

## 使用 Store

### 方式 1：直接访问

```javascript
export default {
  computed: {
    list() {
      return this.$store.state.xxx.list
    },
    loading() {
      return this.$store.state.xxx.loading
    }
  },
  methods: {
    getData() {
      this.$store.dispatch('xxx/fetchList', this.queryParams)
    }
  }
}
```

### 方式 2：mapState / mapGetters / mapActions

```javascript
import { mapState, mapGetters, mapActions, mapMutations } from 'vuex'

export default {
  computed: {
    // mapState
    ...mapState('xxx', ['list', 'loading', 'total']),

    // mapGetters
    ...mapGetters('xxx', ['current'])
  },
  methods: {
    // mapActions
    ...mapActions('xxx', ['fetchList', 'fetchDetail', 'reset']),

    // mapMutations
    ...mapMutations('xxx', ['SET_CURRENT']),

    // 使用
    async getData() {
      await this.fetchList(this.queryParams)
    }
  },
  mounted() {
    this.getData()
  }
}
```

### 在模板中使用

```vue
<template>
  <div v-loading="loading">
    <div v-for="item in list" :key="item.id">
      {{ item.name }}
    </div>
    <div v-if="list.length === 0">暂无数据</div>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex'

export default {
  computed: {
    ...mapState('xxx', ['list', 'loading'])
  },
  methods: {
    ...mapActions('xxx', ['fetchList'])
  },
  mounted() {
    this.fetchList()
  }
}
</script>
```

---

## 全局 Getters

```javascript
// src/store/getters.js
const getters = {
  token: state => state.user.token,
  avatar: state => state.user.avatar,
  name: state => state.user.name,
  roles: state => state.user.roles,
  permissions: state => state.user.permissions
}
export default getters
```

### 使用全局 Getters

```javascript
export default {
  computed: {
    // 方式 1
    token() {
      return this.$store.getters.token
    },

    // 方式 2
    ...mapGetters(['token', 'name', 'roles'])
  }
}
```

---

## 最佳实践

### 1. 何时使用 Store

| 场景 | 是否使用 Store |
|------|---------------|
| 多个页面/组件共享的数据 | ✅ 使用 |
| 用户登录状态、权限 | ✅ 使用 |
| 全局配置、主题设置 | ✅ 使用 |
| 页面内部状态 | ❌ 用 data |
| 组件内部状态 | ❌ 用 data |
| 父子组件传值 | ❌ 用 props/emit |
| 兄弟组件通信（简单） | ❌ 用 eventBus |

### 2. Store 命名规范

```javascript
// ✅ 正确：小写字母，用 - 分隔
export default {
  namespaced: true,
  // ...
}

// Store 文件命名：xxx.js（小写）
```

### 3. Mutation 命名规范

```javascript
// ✅ 正确：大写字母，下划线分隔（常量风格）
const mutations = {
  SET_LIST: (state, list) => { state.list = list },
  SET_LOADING: (state, loading) => { state.loading = loading },
  ADD_ITEM: (state, item) => { state.list.push(item) }
}
```

### 4. Action 命名规范

```javascript
// ✅ 正确：小驼峰命名
const actions = {
  fetchList: async ({ commit }, params) => { /* ... */ },
  fetchDetail: async ({ commit }, id) => { /* ... */ },
  addItem: async ({ commit }, item) => { /* ... */ }
}
```

### 5. 重置 Store（登出时）

```javascript
// 在 user store 中
const actions = {
  async logout({ commit, dispatch }) {
    // 重置当前 Store
    commit('SET_TOKEN', '')
    commit('SET_ROLES', [])
    commit('SET_PERMISSIONS', [])

    // 重置其他 Store
    dispatch('permission/reset', null, { root: true })
    dispatch('tagsView/delAllViews', null, { root: true })

    // 跳转登录页
    router.push('/login')
  }
}
```

---

## 参考文件

### Stores

- Store 目录：`src/store/modules/`
- 用户 Store：`src/store/modules/user.js`
- 权限 Store：`src/store/modules/permission.js`
- 应用 Store：`src/store/modules/app.js`
- 设置 Store：`src/store/modules/settings.js`
- 标签页 Store：`src/store/modules/tagsView.js`

### 入口文件

- Store 入口：`src/store/index.js`
- 全局 Getters：`src/store/getters.js`

---

## 注意事项

1. **本项目使用 Vuex**，非 Pinia
2. **Store 模块必须设置 `namespaced: true`**
3. **异步操作放在 Actions 中**
4. **同步操作放在 Mutations 中**
5. **不要在 Mutations 中进行异步操作**
