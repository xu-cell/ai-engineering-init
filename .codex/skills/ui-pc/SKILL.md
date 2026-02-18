---
name: ui-pc
description: |
  前端（plus-ui）组件库指南。包含 21 个自定义组件、7 个 Store 模块、19 个工具模块。

  触发场景：
  - 开发前端后台管理页面
  - 使用 Element Plus 组件
  - 表格、表单、弹窗、图表等前端 UI
  - 使用 useDict、useDictStore 等
  - 使用 Utils 工具函数

  触发词：el-、DictTag、Pagination、RightToolbar、ImagePreview、前端组件、后台页面、管理端、useDict、useDictStore、i18n

  适用目录：plus-ui/**
---

# 前端组件库指南

> **适用于**: `plus-ui/` 目录下的前端后台管理页面开发

---

## 目录结构

```
plus-ui/src/
├── api/                # API 接口定义
├── assets/             # 静态资源
├── components/         # 自定义组件（21个）
├── directive/          # 自定义指令
├── enums/              # 枚举定义
├── hooks/              # Hooks（1个）
├── lang/               # 国际化
├── layout/             # 布局组件
├── plugins/            # 插件
├── router/             # 路由配置
├── store/              # Pinia Store（7个模块）
├── types/              # 类型定义
├── utils/              # 工具函数（19个）
└── views/              # 页面视图
```

---

## 组件总览（21 个）

| 组件 | 用途 | 使用场景 |
|------|------|----------|
| `Breadcrumb` | 面包屑导航 | 页面顶部路径导航 |
| `DictTag` | 字典标签 | 显示字典值对应的标签 |
| `Editor` | 富文本编辑器 | 内容编辑 |
| `FileUpload` | 文件上传 | 附件上传 |
| `Hamburger` | 汉堡菜单按钮 | 侧边栏折叠切换 |
| `IconSelect` | 图标选择器 | 选择系统图标 |
| `iFrame` | 内嵌页面 | 嵌入外部页面 |
| `ImagePreview` | 图片预览 | 表格中图片缩略图 |
| `ImageUpload` | 图片上传 | 头像/图片上传 |
| `LangSelect` | 语言选择 | 切换系统语言 |
| `Pagination` | 分页组件 | 列表分页 |
| `ParentView` | 父级视图 | 路由嵌套容器 |
| `Process` | 流程组件 | 流程展示 |
| `RightToolbar` | 右侧工具栏 | 表格工具栏（搜索/刷新/列设置） |
| `RoleSelect` | 角色选择器 | 选择角色 |
| `RuoYiDoc` | 文档链接 | 跳转官方文档 |
| `RuoYiGit` | Git链接 | 跳转仓库 |
| `Screenfull` | 全屏切换 | 页面全屏 |
| `SizeSelect` | 尺寸选择 | 切换组件尺寸 |
| `SvgIcon` | SVG图标 | 显示 SVG 图标 |
| `TopNav` | 顶部导航 | 顶部菜单导航 |
| `UserSelect` | 用户选择器 | 选择用户 |

### 常用组件示例

#### DictTag - 字典标签

```vue
<template>
  <dict-tag :options="sys_normal_disable" :value="row.status" />
</template>

<script setup lang="ts">
const { sys_normal_disable } = useDict('sys_normal_disable')
</script>
```

#### Pagination - 分页

```vue
<pagination
  v-show="total > 0"
  :total="total"
  v-model:page="queryParams.pageNum"
  v-model:limit="queryParams.pageSize"
  @pagination="getList"
/>
```

#### RightToolbar - 工具栏

```vue
<right-toolbar
  v-model:showSearch="showSearch"
  @queryTable="getList"
/>
```

#### ImagePreview - 图片预览

```vue
<image-preview :src="row.avatar" :width="50" :height="50" />
```

---

## Store 模块（7 个）

| Store | 文件 | 职责 |
|-------|------|------|
| `useUserStore` | `store/modules/user.ts` | 用户信息、登录状态、角色权限 |
| `useAppStore` | `store/modules/app.ts` | 应用状态（侧边栏、设备类型） |
| `useDictStore` | `store/modules/dict.ts` | 字典数据缓存 |
| `useNoticeStore` | `store/modules/notice.ts` | 通知消息 |
| `usePermissionStore` | `store/modules/permission.ts` | 权限路由管理 |
| `useSettingsStore` | `store/modules/settings.ts` | 系统设置 |
| `useTagsViewStore` | `store/modules/tagsView.ts` | 标签页管理 |

### useUserStore 用法

```typescript
import { useUserStore } from '@/store/modules/user'

const userStore = useUserStore()

// 属性
userStore.userId        // 用户ID
userStore.tenantId      // 租户ID
userStore.token         // 登录令牌
userStore.nickname      // 昵称
userStore.avatar        // 头像
userStore.roles         // 角色列表
userStore.permissions   // 权限列表

// 方法
await userStore.login(userInfo)  // 登录
await userStore.getInfo()        // 获取用户信息
await userStore.logout()         // 登出
userStore.setAvatar(url)         // 设置头像
```

### useDictStore 用法

```typescript
import { useDictStore } from '@/store/modules/dict'

const dictStore = useDictStore()
const dicts = dictStore.getDict('sys_normal_disable')
dictStore.setDict('sys_normal_disable', dictData)
```

---

## Hooks（1 个）

### useDialog

```typescript
import useDialog from '@/hooks/useDialog'

const { dialogVisible, openDialog, closeDialog } = useDialog()
```

---

## Utils 工具函数（19 个模块）

### dict.ts - 字典工具（高频使用）

```typescript
import { useDict } from '@/utils/dict'

// 获取字典数据
const { sys_normal_disable, sys_user_sex } = useDict(
  'sys_normal_disable',
  'sys_user_sex'
)

// 返回格式：
// { label: '正常', value: '0', elTagType: 'primary', elTagClass: '' }
```

### request.ts - HTTP 请求

```typescript
import request from '@/utils/request'

// GET 请求
export function listUser(query) {
  return request({
    url: '/system/user/list',
    method: 'get',
    params: query
  })
}

// POST 请求
export function addUser(data) {
  return request({
    url: '/system/user',
    method: 'post',
    data: data
  })
}
```

### auth.ts - 认证工具

```typescript
import { getToken, setToken, removeToken } from '@/utils/auth'

const token = getToken()
setToken('new-token')
removeToken()
```

### ruoyi.ts - 通用工具

```typescript
import {
  parseTime,           // 时间格式化
  resetForm,           // 重置表单
  addDateRange,        // 添加日期范围参数
  selectDictLabel,     // 获取字典标签
  handleTree,          // 构造树形结构
  blobValidate         // Blob 验证
} from '@/utils/ruoyi'

// 日期范围查询
addDateRange(queryParams, dateRange, 'createTime')

// 构造树形结构
const treeData = handleTree(data, 'id', 'parentId')
```

### validate.ts - 验证工具

```typescript
import {
  isURL,
  isLowerCase,
  isUpperCase,
  isAlphabets,
  isEmail,
  isMobile,
  isPhone,
  isIdCard,
  isNumber,
  isIntegerGreaterThanZero
} from '@/utils/validate'

if (isEmail(value)) { ... }
if (isMobile(value)) { ... }
```

### index.ts - 通用工具函数

```typescript
import {
  formatDate,        // 日期格式化
  formatTime,        // 时间格式化（相对时间）
  debounce,          // 防抖
  deepClone,         // 深拷贝
  uniqueArr,         // 数组去重
  hasClass,          // 判断类名
  addClass,          // 添加类名
  removeClass,       // 移除类名
  isExternal         // 是否外部链接
} from '@/utils'
```

### crypto.ts - 加密工具

```typescript
import { encrypt, decrypt } from '@/utils/crypto'

const encrypted = encrypt(data)
const decrypted = decrypt(encrypted)
```

### jsencrypt.ts - RSA 加密

```typescript
import { encrypt, decrypt } from '@/utils/jsencrypt'

const encrypted = encrypt(password)
```

### permission.ts - 权限工具

```typescript
import { checkPermi, checkRole } from '@/utils/permission'

// 检查权限
if (checkPermi(['system:user:add'])) { ... }

// 检查角色
if (checkRole(['admin'])) { ... }
```

### websocket.ts - WebSocket

```typescript
import { initWebSocket, closeWebSocket, sendMessage } from '@/utils/websocket'

initWebSocket(url, onMessage, onError)
sendMessage(data)
closeWebSocket()
```

### sse.ts - Server-Sent Events

```typescript
import { createSSE, closeSSE } from '@/utils/sse'

const sse = createSSE(url, onMessage)
closeSSE(sse)
```

---

## 标准列表页结构

### 1. 搜索区域

```vue
<el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
  <el-form-item label="用户名称" prop="userName">
    <el-input
      v-model="queryParams.userName"
      placeholder="请输入用户名称"
      clearable
      @keyup.enter="handleQuery"
    />
  </el-form-item>
  <el-form-item label="状态" prop="status">
    <el-select v-model="queryParams.status" placeholder="用户状态" clearable>
      <el-option
        v-for="dict in sys_normal_disable"
        :key="dict.value"
        :label="dict.label"
        :value="dict.value"
      />
    </el-select>
  </el-form-item>
  <el-form-item>
    <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
    <el-button icon="Refresh" @click="resetQuery">重置</el-button>
  </el-form-item>
</el-form>
```

### 2. 工具栏区域

```vue
<el-row :gutter="10" class="mb8">
  <el-col :span="1.5">
    <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['system:user:add']">
      新增
    </el-button>
  </el-col>
  <el-col :span="1.5">
    <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['system:user:edit']">
      修改
    </el-button>
  </el-col>
  <el-col :span="1.5">
    <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['system:user:remove']">
      删除
    </el-button>
  </el-col>
  <right-toolbar v-model:showSearch="showSearch" @queryTable="getList" />
</el-row>
```

### 3. 表格区域

```vue
<el-table v-loading="loading" :data="userList" @selection-change="handleSelectionChange">
  <el-table-column type="selection" width="50" align="center" />
  <el-table-column label="用户编号" align="center" prop="userId" />
  <el-table-column label="用户名称" align="center" prop="userName" />
  <el-table-column label="头像" align="center" prop="avatar" width="80">
    <template #default="scope">
      <image-preview :src="scope.row.avatar" :width="50" :height="50" />
    </template>
  </el-table-column>
  <el-table-column label="状态" align="center" prop="status">
    <template #default="scope">
      <dict-tag :options="sys_normal_disable" :value="scope.row.status" />
    </template>
  </el-table-column>
  <el-table-column label="操作" align="center" width="180">
    <template #default="scope">
      <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['system:user:edit']">
        修改
      </el-button>
      <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['system:user:remove']">
        删除
      </el-button>
    </template>
  </el-table-column>
</el-table>

<pagination
  v-show="total > 0"
  :total="total"
  v-model:page="queryParams.pageNum"
  v-model:limit="queryParams.pageSize"
  @pagination="getList"
/>
```

### 4. 弹窗表单

```vue
<el-dialog :title="title" v-model="open" width="500px" append-to-body>
  <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
    <el-form-item label="用户名称" prop="userName">
      <el-input v-model="form.userName" placeholder="请输入用户名称" />
    </el-form-item>
    <el-form-item label="状态" prop="status">
      <el-radio-group v-model="form.status">
        <el-radio
          v-for="dict in sys_normal_disable"
          :key="dict.value"
          :value="dict.value"
        >{{ dict.label }}</el-radio>
      </el-radio-group>
    </el-form-item>
  </el-form>
  <template #footer>
    <div class="dialog-footer">
      <el-button type="primary" @click="submitForm">确 定</el-button>
      <el-button @click="cancel">取 消</el-button>
    </div>
  </template>
</el-dialog>
```

---

## 权限指令

```vue
<!-- 按钮权限 -->
<el-button v-hasPermi="['system:user:add']">新增</el-button>

<!-- 角色权限 -->
<el-button v-hasRole="['admin']">管理员按钮</el-button>
```

---

## 参考文件位置

| 用途 | 路径 |
|------|------|
| 标准 CRUD 页面 | `plus-ui/src/views/system/user/index.vue` |
| API 定义规范 | `plus-ui/src/api/system/user/index.ts` |
| 字典标签组件 | `plus-ui/src/components/DictTag/index.vue` |
| 分页组件 | `plus-ui/src/components/Pagination/index.vue` |
| 工具栏组件 | `plus-ui/src/components/RightToolbar/index.vue` |
| 字典工具 | `plus-ui/src/utils/dict.ts` |
| 通用工具 | `plus-ui/src/utils/ruoyi.ts` |
| 用户 Store | `plus-ui/src/store/modules/user.ts` |
