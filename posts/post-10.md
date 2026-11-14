---
title: 给 LaTeX 公式配一张自己的补全表
date: 2025-07-21
tags: [Obsidian, LaTeX, 插件]
summary: 一张 JSON 表决定弹什么，Enter 和 Tab 都归你管；顺手记两个坑——被内置 suggester 抢走的 Enter，以及只能靠数 $ 判断的公式范围。
minutes: 5
---

## 为什么还要一个

在 Obsidian 里打公式，一半时间花在拼命令上：`\alpha` 有没有拼错，`\frac` 的两个括号在哪。Latex Suite 那类插件很强，但配置是另一套语法，改一条要先读懂它的 snippet 规则。

这个反过来：**只有一张 JSON 表**。左边写你打的词，右边写要补成什么，没有第三层。

## 怎么用

装完不用配，默认表里就是希腊字母。

1. 光标落在 `$...$` 或 `$$...$$` 里，开始打字，列表跟着弹出来
2. `↑` `↓` 选，`Enter` 或 `Tab` 应用（用哪个键在设置里选）
3. 敲空格：取消当前这次补全，重新开一个词
4. 补全内容里写 `$1` `$2` 占位符，插入后光标直接停在第一个占位符上

![在 $...$ 里打字，候选列表跟着弹](img/md/latex-autocomplete-demo.gif "公式补全的实际输入过程")

## 只有三个设置项

![插件设置界面](img/md/latex-autocomplete-setting.png "最小触发字符数、映射表、预览符号")

| 设置项 | 作用 | 建议 |
|---|---|---|
| Minimal trigger characters | 打几个字符才弹 | 表大了调到 2，否则一个字就弹一串 |
| LaTeX mappings | 键 → 补全内容 | 只留自己常用的十几条 |
| Preview symbols | 补全内容 → 列表右上的预览字符 | 顺手加，判断快很多 |

```json
{
  "alpha": "\\alpha",
  "->": "\\to",
  "frac": "\\frac{$1}{$2}"
}
```

预览表是**另一张**，键要用补全后的完整内容，不是左边那个词：

```json
{
  "\\alpha": "α",
  "\\to": "→",
  "\\frac{$1}{$2}": "a/b"
}
```

两张表对不上，列表里就只显示原始命令——不报错，只是没预览。这时候点「Restore defaults」比对一下格式最快。

## 两个实现上的坑

### 一、Enter 早被内置 suggester 抢走了

`EditorSuggest` 的 `onKeyEvent` 根本不会被调用，真正管键的是 popup 自己的 scope。更麻烦的是，内置 suggester 构造时往这个 scope 注册了一个**无条件**的 Enter，按下去就应用选中项，还把事件吞掉。

所以「Enter 是否应用补全」这个开关，光加判断没用，得先把内置处理器摘掉：

```js
// 引用没被保存，只能从 scope.keys 的注册表里找
for (const handler of this.scope.keys.slice()) {
  if (handler && handler.key === "Enter") this.scope.unregister(handler);
}
```

`scope.keys` 不是公开 API，这段包了 `try/catch`：哪天真找不到了，Enter 退回默认的「总是应用」，插件不至于整个挂掉。Tab 反而干净——Obsidian 压根没给它注册处理器。处理器返回 `false` 表示消费按键，返回 `true` 放行给编辑器；输入法组字中的 `isComposing` 必须直接放行，否则中文输入会断。

### 二、「在不在公式里」只能数 `$`

看上去该用正则回溯找最近的 `$`，实际不行：`\$` 是转义的美元、`$$` 是块级公式，三种情况混在一行里。

所以逐字符扫，遇到 `\` 标记转义、跳过下一个字符，只计数成对的 `$$`：同一行里单 `$` 出现奇数次 = 在行内公式；块级则往上逐行累计 `$$` 的奇偶来翻转开关。

代价是**每次触发都要往上扫到文件开头**。短笔记没感觉，长文里这是一处可预见的开销——目前没做缓存，也没打算做。

## 它不做什么

匹配用的是 `includes` 而非前缀：打 `alp` 命中 `alpha`，但打 `pha` 也会命中，表一长就杂。所以「最小触发字符数」和「表里只留常用的」得一起调，光靠插件收不干净。

- **不猜上下文**：一张平表，`\frac` 后面填什么它不知道，占位符是你写死的
- **不做替换渲染**：只补文本
- **移动端能装，但不好用**：公式编辑本来就吃键盘

想要「打 `sr` 直接展开成 `^2`」那种手写级速度，还是去看 Latex Suite；这个解决的是另一半——你记不住的命令，和你自己那套写法。

社区页面：[latex-autocomplete-customizable](https://community.obsidian.md/plugins/latex-autocomplete-customizable)，源码 MIT：[github.com/aiksxd/latex-autocomplete](https://github.com/aiksxd/latex-autocomplete)。
