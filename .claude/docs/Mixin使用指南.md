# Mixin 使用指南

> **适用于**: 腾云智慧食堂管理系统前端项目（`/Users/xujiajun/Developer/frontProj/web`）

最后更新: 2026-02-18

---

## 概览

Mixin 文件位于 `src/mixins/` 目录，共 5 个（组）：

| Mixin | 文件路径 | 提供的 data | 说明 |
|-------|---------|------------|------|
| `getOrgList` | `mixins/getOrgList.js` | `orgTreeList` | 前场组织树 |
| `getMealTimeList` | `mixins/getMealTimeList.js` | `mealTimeList` | 餐次列表 |
| `settingClomnsMixin` | `mixins/settingClomnsMixin.js` | `settingColimns`, `allColumns` | 表格列设置 |
| `areaCanteenMixin` | `mixins/areaCanteenMixin/areaCanteenForLeniu.js` | `areaOptions`, `canteenOptions`, `canteenOptionsForm` | 区域食堂级联选择 |
| `common` | `mixins/index.js` | - | 通用工具方法 |

---

## 1. getOrgList — 前场组织树

**用途**：自动在 `created` 时拉取组织树数据，挂到 `orgTreeList`

**提供的 data**：
- `orgTreeList: []` — 组织树列表

**使用示例**：

```vue
<script>
import getOrgList from '@/mixins/getOrgList'

export default {
  mixins: [getOrgList],
  // orgTreeList 已自动加载，可直接在模板和方法中使用
  methods: {
    doSomething() {
      console.log(this.orgTreeList)
    }
  }
}
</script>
```

```vue
<template>
  <!-- 直接绑定 orgTreeList -->
  <el-select v-model="form.orgId">
    <el-option
      v-for="item in orgTreeList"
      :key="item.id"
      :label="item.name"
      :value="item.id"
    />
  </el-select>
</template>
```

---

## 2. getMealTimeList — 餐次列表

**用途**：自动在 `created` 时拉取餐次数据，挂到 `mealTimeList`

**提供的 data**：
- `mealTimeList: []` — 餐次列表（records）

**使用示例**：

```vue
<script>
import getMealTimeList from '@/mixins/getMealTimeList'

export default {
  mixins: [getMealTimeList],
  methods: {
    doSomething() {
      console.log(this.mealTimeList) // 餐次数组
    }
  }
}
</script>
```

```vue
<template>
  <el-select v-model="listQuery.mealTimeId">
    <el-option
      v-for="item in mealTimeList"
      :key="item.id"
      :label="item.name"
      :value="item.id"
    />
  </el-select>
</template>
```

---

## 3. settingClomnsMixin — 表格列设置

**用途**：配合 `leniu-table` 的列设置功能，管理可见列与导出列

**提供的 data**：
- `settingColimns: []` — 当前显示的列（计算属性 `computedColumns`）
- `allColumns: []` — 所有列（需组件自己在 `created` 中赋值）

**提供的 computed**：
- `computedColumns` — 返回 `settingColimns`（传给表格组件）
- `exportColumns` — 返回 `allColumns` 中 `hidden !== true` 的列（用于导出）

**提供的方法**：
- `changSettingTableColumn(e)` — 列设置变化时调用

**使用示例**：

```vue
<script>
import settingClomnsMixin from '@/mixins/settingClomnsMixin'

export default {
  mixins: [settingClomnsMixin],
  created() {
    // 初始化所有列定义
    this.allColumns = [
      { key: 'name', title: '姓名' },
      { key: 'age', title: '年龄' },
      { key: 'status', title: '状态' }
    ]
    this.settingColimns = [...this.allColumns]
  }
}
</script>
```

```vue
<template>
  <!-- 传入 computedColumns，监听列设置变化 -->
  <leniu-table
    ref="table"
    :columns="computedColumns"
    :all-columns="allColumns"
    @setting-change="changSettingTableColumn"
  />
</template>
```

---

## 4. areaCanteenMixin — 区域食堂级联选择

> 文件：`src/mixins/areaCanteenMixin/areaCanteenForLeniu.js`

**用途**：提供区域 → 食堂的二级联动数据，区分"查询用"和"表单用"两套食堂列表

**提供的 data**：
- `areaOptions: []` — 区域列表（树形）
- `canteenOptions: []` — 查询条件用的食堂列表
- `canteenOptionsForm: []` — 表单用的食堂列表

**提供的方法**：
- `getAreaTree()` — 初始化区域数据（`created` 自动调用）
- `changeArea(areaId, formName, initFlag, type)` — 区域变化时联动食堂

**使用示例**：

```vue
<script>
import areaCanteenMixin from '@/mixins/areaCanteenMixin/areaCanteenForLeniu'

export default {
  mixins: [areaCanteenMixin],
  data() {
    return {
      listQuery: {
        areaIdList: [],
        canteenIdList: []
      },
      // 注意：changeArea 内部会访问 this.config.listQuery 或 this.formData
      config: {
        listQuery: {}
      }
    }
  }
}
</script>
```

```vue
<template>
  <!-- 查询区域：区域选择 -->
  <el-select
    v-model="listQuery.areaIdList"
    multiple
    @change="changeArea($event, 'canteenOptions')"
  >
    <el-option v-for="a in areaOptions" :key="a.id" :label="a.name" :value="a.id" />
  </el-select>

  <!-- 查询区域：食堂选择（区域变化后更新） -->
  <el-select v-model="listQuery.canteenIdList" multiple>
    <el-option v-for="c in canteenOptions" :key="c.id" :label="c.name" :value="c.id" />
  </el-select>

  <!-- 表单中：食堂选择 -->
  <el-select
    v-model="formData.canteenId"
    @change="changeArea($event, 'canteenOptionsForm')"
  >
    <el-option v-for="c in canteenOptionsForm" :key="c.id" :label="c.name" :value="c.id" />
  </el-select>
</template>
```

---

## 5. common — 通用工具 Mixin

> 文件：`src/mixins/index.js`

**用途**：提供图片 URL 拼接、金额输入校验等通用工具方法

**提供的 computed**：
- `baseUrl` — 从 Vuex 获取图片服务器基础地址

**提供的方法**：

| 方法 | 说明 | 示例 |
|------|------|------|
| `getUrl1(item)` | 拼接完整图片 URL（已是 http 则原样返回） | `this.getUrl1(imgPath)` |
| `oninput(num, limit, length, max)` | 金额输入校验（限制小数位、最大值） | `this.oninput(val, 2, 10, 9999)` |
| `LetterAndNum(num, length)` | 只允许字母和数字 | `this.LetterAndNum(val, 20)` |
| `Num(num, length)` | 只允许数字 | `this.Num(val, 10)` |
| `getTimestamp()` | 获取时间戳字符串 | `this.getTimestamp()` |
| `getNowDate()` | 获取当前时间字符串（YYYY-MM-DD HH:mm:ss） | `this.getNowDate()` |

**使用示例**：

```vue
<script>
import common from '@/mixins/index'

export default {
  mixins: [common],
  methods: {
    handleInput(val) {
      // 金额校验：小数2位，最多10位，最大9999
      this.form.amount = this.oninput(val, 2, 10, 9999)
    }
  }
}
</script>
```

```vue
<template>
  <!-- 图片 URL 拼接 -->
  <img :src="getUrl1(item.imgPath)" />

  <!-- 金额输入框 -->
  <el-input
    v-model="form.amount"
    @input="form.amount = oninput(form.amount, 2, 10)"
  />
</template>
```

---

## 4+. areaCanteenSubplaceForLeniu — 区域食堂子场所级联

> 文件：`src/mixins/areaCanteenMixin/areaCanteenSubplaceForLeniu.js`

与 `areaCanteenForLeniu` 类似，增加了**子场所（Subplace）**的第三级联动，用于需要选择 区域 → 食堂 → 子场所 三级的场景。按需引入即可。

---

## 多 Mixin 组合使用

```vue
<script>
import getOrgList from '@/mixins/getOrgList'
import getMealTimeList from '@/mixins/getMealTimeList'
import settingClomnsMixin from '@/mixins/settingClomnsMixin'
import areaCanteenMixin from '@/mixins/areaCanteenMixin/areaCanteenForLeniu'
import common from '@/mixins/index'

export default {
  name: 'XxxList',
  mixins: [getOrgList, getMealTimeList, settingClomnsMixin, areaCanteenMixin, common],
  // 自动获取：orgTreeList, mealTimeList, areaOptions, canteenOptions, baseUrl 等
}
</script>
```

> **注意**：多个 Mixin 都有 `created` 钩子时，Vue 会**按顺序全部执行**，不会覆盖。
