---
name: ui-pc
description: |
  前端组件库指南。包含公共组件、业务组件、Element UI 组件使用。

  触发场景：
  - 开发前端后台管理页面
  - 使用 Element UI 组件
  - 表格、表单、弹窗、图表等前端 UI
  - 使用 leniu-components 业务组件

  触发词：el-、el-table、el-form、el-dialog、leniu-page、leniu-table、前端组件、后台页面

  适用目录：src/**
---

# 前端组件库指南

> **适用于**: 腾云智慧食堂管理系统前端项目（Vue 2 + Element UI）

---

## 目录结构

```
src/
├── components/         # 公共组件（~87个）
├── leniu-components/   # 业务组件（~17个）
├── layout/             # 布局组件
└── directive/          # 自定义指令
```

---

## 业务组件（leniu-components）

| 组件 | 用途 | 使用场景 |
|------|------|----------|
| `leniu-page` | 页面布局容器 | 所有业务页面 |
| `leniu-search` | 搜索组件 | 列表页搜索 |
| `leniu-table` | 表格组件 | 数据展示 |
| `leniu-form` | 表单组件 | 数据录入 |
| `leniu-form-item` | 表单项组件 | 表单字段 |
| `leniu-form-dialog` | 弹窗表单 | 新增/编辑 |
| `leniu-form-panel` | 面板表单 | 详情展示 |
| `leniu-button-list` | 按钮组 | 操作按钮 |
| `leniu-table-toolbar` | 表格工具栏 | 表格工具 |

---

## 公共组件（components 部分常用）

| 组件 | 用途 | 使用场景 |
|------|------|----------|
| `Pagination` | 分页组件 | 列表分页 |
| `XnTable` | 增强表格 | 复杂表格 |
| `Tinymce` | 富文本编辑器 | 内容编辑 |
| `SizeSelect` | 尺寸选择 | 界面设置 |
| `UploadImageList` | 图片上传列表 | 图片管理 |
| `CollapseSearch` | 折叠搜索 | 列表搜索 |
| `titleRow` | 标题行 | 区块标题 |
| `xn-tooltip` | 提示工具 | 文字提示 |

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
import commonList from '../mixins/common-list'

export default {
  name: 'XxxList',
  mixins: [commonList],
  data() {
    return {
      listQuery: {
        name: '',
        status: ''
      }
    }
  },
  methods: {
    async getData() {
      this.loading = true
      try {
        const res = await getList(this.listQuery)
        this.tableData = res.rows || []
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
    :title="title"
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
  computed: {
    title() {
      return this.form.id ? '编辑' : '新增'
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

## 权限指令

```vue
<!-- 按钮权限 -->
<el-button v-hasPerm="['xxx:add']">新增</el-button>
<el-button v-hasPerm="['xxx:edit']">修改</el-button>
<el-button v-hasPerm="['xxx:remove']">删除</el-button>

<!-- 角色权限 -->
<el-button v-hasRole="['admin']">管理员按钮</el-button>
```

---

## 国际化

```vue
<template>
  <el-button>{{ $t('action.query') }}</el-button>
  <span>{{ $t('规则名称') }}</span>
</template>
```

---

## 参考文件位置

| 用途 | 路径 |
|------|------|
| 业务组件 | `src/leniu-components/` |
| 公共组件 | `src/components/` |
| 标准列表页 | `src/leniuview/marketing/marketingRules/billingRules/index.vue` |
| 标准表单页 | `src/leniuview/marketing/marketingRules/billingRules/addEdit.vue` |
