# Click：从装饰器到回调执行

仓库: Click

源码摘录与笔记保存于阅读时，不随当前工作区变化。

## 1. 创建命令

[src/click/decorators\.py:248\-250](https://github.com/pallets/click/blob/06b2a678741131fd577ce170e23e5ca0aeba0309/src/click/decorators.py#L248-L250)

装饰器把原函数作为 callback 交给命令对象，再返回这个命令。

```python
        cmd = cls(name=cmd_name, callback=f, params=params, **attrs)
        cmd.__doc__ = f.__doc__
        return cmd
```

<details>
<summary>来源与版本</summary>

- 来源: 与提交内容一致
- 保存时间: 2026-10-04T16:45:43.773Z
- 文件 SHA-256: `16069357615691fcdfc9c794bb515f6009eb35aad6f7a76c017bdce06dae8d55`
- 提交: `06b2a678741131fd577ce170e23e5ca0aeba0309`

</details>

## 2. 保存回调

[src/click/core\.py:1090](https://github.com/pallets/click/blob/06b2a678741131fd577ce170e23e5ca0aeba0309/src/click/core.py#L1090-L1090)

Command 将 callback 保存在实例中。

```python
        self.callback = callback
```

<details>
<summary>来源与版本</summary>

- 来源: 与提交内容一致
- 保存时间: 2026-10-04T16:45:28.304Z
- 文件 SHA-256: `53df54afb5deba7fd7c3a968a2a6284fc2d9dd3892e6939dfbb3092ca3fbca0f`
- 提交: `06b2a678741131fd577ce170e23e5ca0aeba0309`

</details>

## 3. 执行回调

[src/click/core\.py:1441\-1442](https://github.com/pallets/click/blob/06b2a678741131fd577ce170e23e5ca0aeba0309/src/click/core.py#L1441-L1442)

执行命令时，将解析后的参数交给 callback。

```python
        if self.callback is not None:
            return ctx.invoke(self.callback, **ctx.params)
```

<details>
<summary>来源与版本</summary>

- 来源: 与提交内容一致
- 保存时间: 2026-10-04T16:45:28.720Z
- 文件 SHA-256: `53df54afb5deba7fd7c3a968a2a6284fc2d9dd3892e6939dfbb3092ca3fbca0f`
- 提交: `06b2a678741131fd577ce170e23e5ca0aeba0309`

</details>

<details>
<summary>关于这份导出</summary>

文件哈希按整个 UTF-8 文件计算，换行统一为 LF。

GitHub 链接按本地 origin 和提交生成，未确认提交是否已推送或访问权限。

</details>
