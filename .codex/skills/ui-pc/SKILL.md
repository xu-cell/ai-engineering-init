---
name: ui-pc
description: |
  前端组件库指南。包含公共组件、业务组件、Element UI 组件使用。

  触发场景：
  - 开发前端后台管理页面
  - 使用 Element UI 组件
  - 表格、表单、弹窗、图表等前端 UI
  - 使用 leniu-components 业务组件
  - 前端权限控制、国际化

  触发词：el-、el-table、el-form、el-dialog、leniu-page、leniu-table、前端组件、后台页面、v-hasPerm

  适用目录：/Users/xujiajun/Developer/frontProj/web/src/**
---

# 前端组件库指南

> **适用于**: 腾云智慧食堂管理系统前端项目（Vue 2.7.16 + Element UI 2.15.9）
>
> **前端项目路径**: `/Users/xujiajun/Developer/frontProj/web`

---

## 目录结构

```
src/
├── components/         # 公共组件（~87个）
├── leniu-components/   # 业务组件（10个核心组件）
├── layout/             # 布局组件（Navbar/Sidebar/AppMain）
├── directive/          # 自定义指令（11个）
└── mixins/             # 全局混入（5个）
```

---

## 业务组件（leniu-components）

| 组件 | 路径 | 用途 |
|------|------|------|
| `leniu-page` | `leniu-components/leniu-page` | 页面布局容器（所有业务页面必用） |
| `leniu-search` | `leniu-components/leniu-search` | 搜索组件（列表页搜索） |
| `leniu-table` | `leniu-components/leniu-table` | 增强表格组件 |
| `leniu-form` | `leniu-components/leniu-form` | 表单组件 |
| `leniu-form-item` | `leniu-components/leniu-form-item` | 表单项组件 |
| `leniu-form-dialog` | `leniu-components/leniu-form-dialog` | 弹窗表单（新增/编辑） |
| `leniu-form-panel` | `leniu-components/leniu-form-panel` | 面板表单（详情展示） |
| `leniu-button-list` | `leniu-components/leniu-button-list` | 按钮组 |
| `leniu-table-toolbar` | `leniu-components/leniu-table-toolbar` | 表格工具栏 |

---

## 常用公共组件（components）

| 组件 | 用途 |
|------|------|
| `Pagination` | 分页组件 |
| `CollapseSearch` | 折叠搜索区域 |
| `Breadcrumb` | 面包屑导航 |
| `Dropzone` | 文件拖拽上传 |
| `ImageCropper` | 图片裁剪 |
| `Tinymce` | 富文本编辑器 |
| `UploadImageList` | 图片上传列表 |

---

## 全局原型方法（main.js 挂载）

在任意组件中可直接使用：

| 方法/属性 | 说明 | 示例 |
|----------|------|------|
| `this.money(fen)` | 分转元（保留2位小数） | `this.money(100)` → `'1.00'` |
| `this.accMul(val, 100)` | 精确乘法（元转分） | `this.accMul(1.5, 100)` → `150` |
| `this.parseTime(time, fmt)` | 格式化时间 | `this.parseTime(new Date(), '{y}-{m}-{d}')` |
| `this.$echarts` | ECharts 实例 | `this.$echarts.init(el)` |
| `this.$hasPerm(['xxx:add'])` | 权限判断（JS中） | 返回 true/false |
| `this.isDevEnv` | 是否纯本地开发环境 | true/false |
| `this.isDevTestEnv` | 是否开发测试环境 | 含 dev/test 域名 |
| `this._` | Lodash 工具库 | `this._.debounce(fn, 300)` |
| `this.validators` | 表单校验规则集 | `this.validators.required()` |
| `this.inputRules` | 输入过滤规则 | `this.inputRules.number(val)` |
| `this.CNEN` | 中英文拼接工具 | 根据 i18n 拼接 |

---

## 自定义指令（directive）

```vue
<!-- 按钮权限（最常用）-->
<el-button v-hasPerm="['xxx:add']">新增</el-button>
<el-button v-hasPerm="['xxx:edit']">修改</el-button>
<el-button v-hasPerm="['xxx:remove']">删除</el-button>

<!-- 角色权限 -->
<el-button v-hasRole="['admin']">管理员按钮</el-button>
```

---

## 国际化（i18n）

```vue
<template>
  <!-- 使用翻译 -->
  <span>{{ $t('规则名称') }}</span>
  <el-button>{{ $t('action.query') }}</el-button>
  <el-button>{{ $t('新增') }}</el-button>
</template>
```

> **注意**：语言文件在 `src/lang/` 目录，支持中文（zh）和英文（en）

---

## 全局 Mixin（mixins/index.js）

所有组件自动混入，提供以下方法：

```javascript
// 金额输入过滤（只允许数字和小数点）
this.oninput(value, decimalLimit, maxLength, maxValue)

// 只允许字母和数字
this.LetterAndNum(value, maxLength)

// 只允许数字
this.Num(value, maxLength)

// 获取当前时间戳字符串
this.getTimestamp()

// 获取图片完整URL
this.getUrl1(path)  // 自动拼接 baseUrl
```

---

## 标准列表页结构

```vue
<template>
  <page-slot>
    <!-- 搜索区域 -->
    <collapse-search slot="search">
      <template v-slot:outerCol>
        <el-col :span="6">
          <el-form-item :label="$t('名称')">
            <el-input v-model="listQuery.name" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item :label="$t('状态')">
            <el-select v-model="listQuery.status" clearable>
              <el-option label="正常" value="1" />
              <el-option label="停用" value="0" />
            </el-select>
          </el-form-item>
        </el-col>
      </template>
      <el-button
        slot="operate"
        type="primary"
        icon="el-icon-search"
        @click="() => (page.current = 1) && getData()"
      >
        {{ $t('action.query') }}
      </el-button>
    </collapse-search>

    <!-- 操作按钮 -->
    <el-button
      slot="tableTopLeft"
      type="primary"
      plain
      icon="el-icon-plus"
      v-hasPerm="['xxx:add']"
      @click="handleAdd"
    >
      {{ $t('新增') }}
    </el-button>

    <!-- 表格 -->
    <el-table
      slot="table"
      height="100%"
      stripe
      :data="tableData"
      v-loading="loading"
    >
      <el-table-column prop="name" :label="$t('名称')" min-width="150" />
      <el-table-column prop="status" :label="$t('状态')">
        <template slot-scope="{ row }">
          <el-tag :type="row.status === '1' ? 'success' : 'danger'">
            {{ row.status === '1' ? '正常' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column :label="$t('操作')" width="180" align="center">
        <template slot-scope="{ row }">
          <el-button type="text" @click="handleEdit(row)" v-hasPerm="['xxx:edit']">
            {{ $t('修改') }}
          </el-button>
          <el-button type="text" @click="handleDelete(row)" v-hasPerm="['xxx:remove']">
            {{ $t('删除') }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </page-slot>
</template>

<script>
import { getList, del } from '@/api/xxx'

export default {
  name: 'XxxList',
  data() {
    return {
      loading: false,
      tableData: [],
      total: 0,
      page: { current: 1, size: 20 },
      listQuery: {
        name: '',
        status: ''
      }
    }
  },
  mounted() {
    this.getData()
  },
  methods: {
    async getData() {
      this.loading = true
      try {
        const res = await getList({
          page: this.page,
          object: this.listQuery
        })
        this.tableData = res.records || []
        this.total = res.total || 0
      } finally {
        this.loading = false
      }
    },
    handleAdd() {
      this.visible = true
      this.form = {}
    },
    handleEdit(row) {
      this.visible = true
      this.form = { ...row }
    },
    handleDelete(row) {
      this.$confirm('确定删除？', '提示', {
        type: 'warning'
      }).then(async () => {
        await del(row.id)
        this.$message.success('删除成功')
        this.getData()
      })
    }
  }
}
</script>
```

---

## 标准表单弹窗

```vue
<template>
  <el-dialog
    :title="form.id ? '编辑' : '新增'"
    :visible.sync="visible"
    width="600px"
    @close="handleClose"
  >
    <el-form ref="form" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" placeholder="请输入名称" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-radio-group v-model="form.status">
          <el-radio label="1">正常</el-radio>
          <el-radio label="0">停用</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <div slot="footer">
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        确定
      </el-button>
    </div>
  </el-dialog>
</template>

<script>
import { add, update } from '@/api/xxx'

export default {
  name: 'XxxForm',
  props: {
    visible: Boolean,
    data: Object
  },
  data() {
    return {
      form: {},
      rules: {
        name: [{ required: true, message: '请输入名称', trigger: 'blur' }]
      },
      submitting: false
    }
  },
  watch: {
    data: {
      immediate: true,
      handler(val) {
        this.form = val ? { ...val } : {}
      }
    }
  },
  methods: {
    handleClose() {
      this.$refs.form.resetFields()
      this.$emit('update:visible', false)
    },
    async handleSubmit() {
      this.$refs.form.validate(async (valid) => {
        if (!valid) return
        this.submitting = true
        try {
          const api = this.form.id ? update : add
          await api(this.form)
          this.$message.success('保存成功')
          this.$emit('success')
          this.handleClose()
        } finally {
          this.submitting = false
        }
      })
    }
  }
}
</script>
```

---

## API 接口定义规范

所有 API 调用通过 `src/utils/request.js` 封装，请求格式有两种：

### 标准请求格式（带 content 包裹）

```javascript
// src/api/xxx.js
import request from '@/utils/request'

// 分页查询
export function getList(data) {
  return request({
    url: '/api/v1/xxx/list',
    method: 'post',
    data: {
      version: '1.0',
      nonceStr: '1212fsadf',
      timestamp: '2020-4-21',
      signType: 'md5',
      content: data,  // 业务数据放在 content 中
      sign: 'xxx'
    }
  })
}

// GET 请求
export function getDetail(id) {
  return request({
    url: `/api/v1/xxx/detail/${id}`,
    method: 'get',
    params: { version: '1.0', content: { id } }
  })
}

// 删除
export function del(id) {
  return request({
    url: `/api/v1/xxx/delete`,
    method: 'post',
    data: { version: '1.0', content: { id } }
  })
}
```

> **注意**：
> - 请求拦截器会自动添加签名（MD5）
> - 所有接口都走 SM4 国密加密（`/security/` 前缀）
> - 响应 `code == 10000` 为成功，返回 `res.data`
> - 响应 `code == 20001` 为登录失效，自动跳转登录

---

## 金额处理规范

```javascript
// ✅ 前端展示：分转元（使用全局 money 方法）
this.money(10000)  // → '100.00'
this.money(null)   // → ''

// ✅ 后端传参：元转分（使用全局 accMul 方法）
this.accMul(100, 100)  // → 10000

// ❌ 禁止直接 / 100 或 * 100（精度问题）
amount / 100  // 禁止
amount * 100  // 禁止
```

---

## 参考文件位置

| 用途 | 路径 |
|------|------|
| 业务组件 | `/Users/xujiajun/Developer/frontProj/web/src/leniu-components/` |
| 公共组件 | `/Users/xujiajun/Developer/frontProj/web/src/components/` |
| 标准列表页 | `/Users/xujiajun/Developer/frontProj/web/src/leniuview/marketing/` |
| API 定义示例 | `/Users/xujiajun/Developer/frontProj/web/src/api/marketing.js` |
| 请求封装 | `/Users/xujiajun/Developer/frontProj/web/src/utils/request.js` |
| Token/租户工具 | `/Users/xujiajun/Developer/frontProj/web/src/utils/auth.js` |
| 全局工具函数 | `/Users/xujiajun/Developer/frontProj/web/src/utils/index.js` |
| 权限守卫 | `/Users/xujiajun/Developer/frontProj/web/src/permission.js` |
| 主入口 | `/Users/xujiajun/Developer/frontProj/web/src/main.js` |
