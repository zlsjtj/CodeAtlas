# Click：从装饰器到回调执行

仓库: Click

以下为保存时的源码摘录，不是当前工作区视图。文件哈希按 UTF-8 文本、LF 换行计算。

## 1. src/click/decorators\.py:248-250

来源: 与提交内容一致
保存时间: 2026-10-04T13:30:58.286Z
文件 SHA-256: `16069357615691fcdfc9c794bb515f6009eb35aad6f7a76c017bdce06dae8d55`
提交: `06b2a678741131fd577ce170e23e5ca0aeba0309`
[该提交中的源码](https://github.com/pallets/click/blob/06b2a678741131fd577ce170e23e5ca0aeba0309/src/click/decorators.py#L248-L250)

装饰器把原函数作为 callback 交给命令对象，再返回这个命令。

```
        cmd = cls(name=cmd_name, callback=f, params=params, **attrs)
        cmd.__doc__ = f.__doc__
        return cmd
```

## 2. src/click/core\.py:1090-1090

来源: 与提交内容一致
保存时间: 2026-10-04T13:30:58.720Z
文件 SHA-256: `53df54afb5deba7fd7c3a968a2a6284fc2d9dd3892e6939dfbb3092ca3fbca0f`
提交: `06b2a678741131fd577ce170e23e5ca0aeba0309`
[该提交中的源码](https://github.com/pallets/click/blob/06b2a678741131fd577ce170e23e5ca0aeba0309/src/click/core.py#L1090-L1090)

Command 将 callback 保存在实例中。

```
        self.callback = callback
```

## 3. src/click/core\.py:1441-1442

来源: 与提交内容一致
保存时间: 2026-10-04T13:30:59.204Z
文件 SHA-256: `53df54afb5deba7fd7c3a968a2a6284fc2d9dd3892e6939dfbb3092ca3fbca0f`
提交: `06b2a678741131fd577ce170e23e5ca0aeba0309`
[该提交中的源码](https://github.com/pallets/click/blob/06b2a678741131fd577ce170e23e5ca0aeba0309/src/click/core.py#L1441-L1442)

执行命令时，将解析后的参数交给 callback。

```
        if self.callback is not None:
            return ctx.invoke(self.callback, **ctx.params)
```

GitHub 链接按本地 origin 和提交生成，未确认提交是否已推送或访问权限。
