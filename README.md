# DaySpan

一款本地优先的三日桌面工作台应用，用“昨天、今天、明天”三个时间窗管理待办和 Markdown 随笔。

## 功能

- 默认纵向三日视图，适合窄窗口或桌面侧边停靠。
- 支持横向布局切换，并自动记住用户偏好。
- 支持昨天、今天、明天三天的待办新增、完成、编辑和删除。
- 支持右上角快速新建 Markdown 随笔。
- 支持 Markdown 编辑和预览。
- 支持随笔标签和“今日总结”标记。
- 支持将今日未完成待办顺延到明天。
- 支持历史记录搜索。
- 支持导出本地 JSON 数据。
- 数据保存在浏览器或 Electron 的本地存储中，不需要登录。

## 运行方式

### 直接预览

双击 `index.html` 即可打开。

### 本地服务预览

```bash
npm run serve
```

然后访问 `http://localhost:5173`。

### Electron 桌面运行

先安装依赖：

```bash
npm install
```

再启动：

```bash
npm start
```

### 生成便携版 exe

```bash
npm.cmd run build:portable
```

生成后的启动程序位于：

```text
dist\DaySpan\DaySpan.exe
```

## 项目定位

本项目不做复杂项目管理、云同步或团队协作，而是聚焦个人短周期规划、快速记录和历史回顾。
