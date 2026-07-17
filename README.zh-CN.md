# Java Sorter (Eclipse Style)

[English](README.md) | [中文](README.zh-CN.md)

VS Code 扩展：对 Java 文件的类成员进行排序，**只排序，不格式化**，排序规则与 Eclipse 的 "Sort Members" 功能一致。

## 排序规则

默认情况下，类成员排序时的物理位置大顺序为（严格对齐 Eclipse 默认）：

1. **嵌套类型**（类/接口/枚举）➡️ **默认排最前面**。
2. **静态字段 / 实例字段**（整体按大组排队，组内保持相对原序）。
3. **静态初始化块 / 实例初始化块**（整体按大组排队，组内保持相对原序）。
4. **静态方法 / 构造方法 / 实例方法**（按顺序分组排序）。

| 成员类型 | 默认是否排序 | 排序方式 |
|----------|:------:|----------|
| 字段 (fields) | ❌ 默认不排 | 整体按大组排队，组内保持相对原序（若开启 `sortAllMembers`，则在组内排序） |
| 枚举常量 (enum constants) | ❌ 默认不排 | 整体按大组排队，组内保持相对原序（若开启 `sortAllMembers`，则在组内排序） |
| 初始化块 (initializers) | ❌ 默认不排 | 整体按大组排队，组内保持相对原序（若开启 `sortAllMembers`，静态块排在实例块前面） |
| 构造方法 (constructors) | ✅ 默认排序 | 按参数数量升序 ➡️ 字母序 |
| 静态方法 (staticMethods) | ✅ 默认排序 | 默认按字母序（若配置了 `visibilityOrder` 则先按可见性排序） |
| 实例方法 (methods) | ✅ 默认排序 | 默认按字母序（若配置了 `visibilityOrder` 则先按可见性排序） |
| 嵌套类型 (types) | ✅ 默认排序 | 静态优先 ➡️ 类 ➡️ 接口 ➡️ 枚举 ➡️ 字母序 |

- 所有成员前的**注解、Javadoc 注释**都会跟随成员一起移动。
- 嵌套内部类的成员保持原样不参与排序，仅作为整体随外层类排序移动。
- getter/setter 方法不做特殊处理。
- 支持在 VS Code **首选项设置**中根据个人或团队风格自定义所有的排序开关和细节规则。

## 安装与构建

### 1. 快捷开发与打包命令

在项目根目录下运行以下命令进行构建和打包：

* **一键打包**（免全局安装 `vsce`）：
  ```bash
  npm install
  npm run package
  ```
  *(该指令会自动编译 TypeScript，并在根目录下生成 `vscode-java-sorter-${version}.vsix` 插件包)*

* **一键清理构建垃圾**：
  ```bash
  npm run clean
  ```
  *(会物理删除 `out/` 输出目录和所有的 `.vsix` 文件包)*

* **本地一键编译**：
  ```bash
  npm run compile
  ```

### 2. 手动安装插件

打包生成 `.vsix` 文件后，你可以直接通过 VS Code 界面进行安装：
1. 打开 VS Code 的命令面板（`Ctrl+Shift+P`）。
2. 输入并选择 `Extensions: Install from VSIX...`（从 VSIX 安装...）。
3. 选中项目根目录下打包出来的 `vscode-java-sorter-${version}.vsix` 文件，即可完成安装。
4. 安装后，重新加载 VS Code 窗口（Reload Window）即可生效。

## 使用方法

1. 打开一个 Java 文件。
2. 打开命令面板（`Ctrl+Shift+P`），搜索 "Java Sorter: Sort Members"。
3. 执行命令即可对类成员排序。

### 配置快捷键

本扩展**不预设默认快捷键**。你可以自行绑定：

1. 打开 `文件 → 首选项 → 键盘快捷方式`。
2. 搜索 `vscode-java-sorter.sort-members`。
3. 点击编辑按钮，按下你想要的组合键（如 `Ctrl+Shift+S`）。

## 插件配置

你可以打开 VS Code 的设置（`Ctrl+,`），搜索 `javaSorter` 来可视化定制以下排序行为：

| 配置项 | 类型 | 默认值 | 描述 |
|--------|:----:|:------:|------|
| `javaSorter.memberOrder` | `string[]` | `["types", "staticFields", "staticInitializers", "staticMethods", "fields", "initializers", "constructors", "methods"]` | 指定不同类别成员的物理排列顺序大链条（首位为优先级最高）。 |
| `javaSorter.visibilityOrder` | `string[]` | `[]` | 指定组内可见性的排序顺序（如 `["public", "protected", "package", "private"]`）。保留空数组则关闭可见性排序，纯按字母序排。 |
| `javaSorter.sortAllMembers` | `boolean` | `false` | 是否对所有类成员进行排序。若为 `false`（默认），则字段、枚举常量和初始化块将钉在原地不动，只重排方法、构造器和内部类。 |

## 技术细节

- **高保真格式还原**：排序时将完美保留每个成员原本的前导注释（包括 Javadoc、多行/单行注释）、首行前导缩进以及原有的空行结构，确保代码重排后格式不发生任何粘连或错乱。
- **Eclipse 规则兼容**：排序结果和优先级逻辑与 Eclipse 默认的 "Sort Members" 机制对齐。
- **系统集成**：基于 VS Code 标准的 `WorkspaceEdit` API 进行文件重写，完美融合 VS Code 原生的撤销/重做（Undo/Redo）管理机制。

## 许可

本项目采用 [MIT](LICENSE) 许可证开源。

关于第三方依赖项的版权及许可声明，请参阅 [THIRD-PARTY-NOTICES](THIRD-PARTY-NOTICES)。
