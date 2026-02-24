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

  适用目录：/Users/xujiajun/Developer/frontProj/web/src/store/**
---

# 前端状态管理指南

> **适用于**: 腾云智慧食堂管理系统前端项目（Vue 2.7.16 + Vuex 3.4.0）
>
> **Store 目录**: `/Users/xujiajun/Developer/frontProj/web/src/store/`

---

## 目录结构

```
src/store/
├── index.js           # Store 入口（Vuex 初始化）
├── getters.js         # 全局 getters
└── modules/           # Store 模块（28个）
    ├── user.js        # 用户状态（最核心）
    ├── app.js         # 应用状态（语言/尺寸）
    ├── permission.js  # 权限路由管理
    ├── tagsView.js    # 标签页管理
    ├── settings.js    # 系统设置
    ├── marketing.js   # 营销状态
    ├── order.js       # 订单状态
    ├── stock.js       # 库存状态
    ├── reportcenter.js # 报表状态
    ├── account.js     # 账户状态
    ├── purchase.js    # 采购状态
    ├── chart.js       # 图表状态
    ├── notice.js      # 通知状态
    ├── upload.js      # 上传状态
    ├── menudish.js    # 菜品状态
    ├── supplyChain.js # 供应链状态
    └── ...            # 其他业务模块
```

---

## 全局 Getters（getters.js）

```javascript
// 常用全局 getters（可直接用 mapGetters 访问）
{
  token,            // 登录 token
  name,             // 用户名
  userInfo,         // 完整用户信息对象
  permissions,      // 权限列表
  hasRoles,         // 是否已加载角色（用于路由守卫）
  permission_routes, // 已生成的权限路由
  adminMerchant,    // 是否为超级管理员商户
  url,              // API base URL
  language,         // 当前语言（zh/en）
  size,             // Element UI 组件尺寸
  areaOptions,      // 区域选项（来自 supplyChain）
}
```

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
      const res = await getList({
        page: { current: params.current || 1, size: params.size || 20 },
        object: params
      })
      commit('SET_LIST', res.records || [])
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
    const res = await getDetail({ id })
    commit('SET_CURRENT', res)
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

### 在 index.js 中注册

```javascript
// src/store/index.js
import xxx from './modules/xxx'

export default new Vuex.Store({
  modules: {
    // ... 其他模块
    xxx
  }
})
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
    },
    // 使用全局 getter
    token() {
      return this.$store.getters.token
    },
    userInfo() {
      return this.$store.getters.userInfo
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
    // 模块内 state
    ...mapState('xxx', ['list', 'loading', 'total']),

    // 全局 getters
    ...mapGetters(['token', 'userInfo', 'permissions', 'adminMerchant'])
  },
  methods: {
    ...mapActions('xxx', ['fetchList', 'fetchDetail', 'reset']),

    async getData() {
      await this.fetchList({ ...this.queryParams, ...this.page })
    }
  },
  mounted() {
    this.getData()
  }
}
```

---

## 核心 Store 模块说明

### user.js（用户状态）

最重要的模块，包含：
- `state.token` - 登录 token
- `state.userInfo` - 完整用户信息（userId、roles、roleCode、merchantId 等）
- `state.hasRoles` - 是否已加载角色信息
- `state.adminMerchant` - 是否为超级管理员（`roleCode === 'ROLE_ADMIN'`）
- `state.merchantList` - 商户列表（管理员可切换商户）

```javascript
// 在路由守卫中获取用户信息
const userInfo = await store.dispatch('user/getInfo')

// 登出
await store.dispatch('user/resetToken')
localStorage.clear()
locationHref()
```

### permission.js（权限路由）

- 根据用户角色动态生成路由
- `state.routes` - 完整路由表（用于菜单渲染）
- `state.addRoutes` - 动态添加的路由

```javascript
// 在路由守卫中生成权限路由
const accessRoutes = await store.dispatch('permission/generateRoutes')
accessRoutes.forEach(route => {
  router.addRoute(route)
})
```

### app.js（应用状态）

- `state.language` - 当前语言（zh/en）
- `state.size` - Element UI 组件尺寸

---

## 最佳实践

### 1. 何时使用 Store

| 场景 | 是否使用 Store |
|------|---------------|
| 多个页面/组件共享的数据 | ✅ 使用 |
| 用户登录状态、权限 | ✅ 使用（user 模块） |
| 全局配置（语言、尺寸） | ✅ 使用（app 模块） |
| 页面内部状态（表单数据）| ❌ 用 data |
| 父子组件传值 | ❌ 用 props/emit |
| 兄弟组件通信（简单） | ❌ 用 eventBus |

### 2. 命名规范

```javascript
// ✅ 正确：Mutation 大写字母+下划线
const mutations = {
  SET_LIST: (state, list) => { state.list = list },
  SET_LOADING: (state, v) => { state.loading = v }
}

// ✅ 正确：Action 小驼峰
const actions = {
  fetchList: async ({ commit }, params) => { },
  fetchDetail: async ({ commit }, id) => { }
}

// ✅ 正确：模块文件名小写，匹配业务名
// store/modules/marketing.js
// store/modules/order.js
```

### 3. 登出时重置 Store

```javascript
// 在 user store 中
const actions = {
  async resetToken({ commit }) {
    commit('SET_TOKEN', '')
    commit('SET_HAS_ROLES', false)
    removeToken()
    removeTenant()
  }
}

// 登出时（permission.js 路由守卫中）
await store.dispatch('user/resetToken')
localStorage.clear()
locationHref()  // 使用全局 locationHref 跳转（不用 router.push）
```

### 4. 分页数据格式

```javascript
// 后端返回的分页数据格式
{
  records: [],  // 数据列表（非 rows）
  total: 100,
  current: 1,
  size: 20
}

// 请求分页参数格式
{
  page: { current: 1, size: 20 },
  object: { ...queryParams }  // 查询条件
}
```

---

## 参考文件

| Store | 路径 |
|-------|------|
| Store 入口 | `/Users/xujiajun/Developer/frontProj/web/src/store/index.js` |
| 全局 Getters | `/Users/xujiajun/Developer/frontProj/web/src/store/getters.js` |
| 用户 Store | `/Users/xujiajun/Developer/frontProj/web/src/store/modules/user.js` |
| 权限 Store | `/Users/xujiajun/Developer/frontProj/web/src/store/modules/permission.js` |
| 应用 Store | `/Users/xujiajun/Developer/frontProj/web/src/store/modules/app.js` |
| 设置 Store | `/Users/xujiajun/Developer/frontProj/web/src/store/modules/settings.js` |
| 标签页 Store | `/Users/xujiajun/Developer/frontProj/web/src/store/modules/tagsView.js` |

---

## 注意事项

1. **本项目使用 Vuex 3.x**（非 Pinia），与 Vue 2 配套
2. **Store 模块必须设置 `namespaced: true`**
3. **异步操作放在 Actions 中**，同步操作放在 Mutations 中
4. **分页数据用 `records`**，不是 `rows`（与 RuoYi 后端框架不同）
5. **登出使用 `locationHref()`** 而非 `router.push('/login')`，目的是清除内存中的数据
6. **`adminMerchant` 为 true 时**，用户是超级管理员（`roleCode === 'ROLE_ADMIN'`），可切换商户
