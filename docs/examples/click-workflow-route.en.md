# Click: from decorator to callback

Repository: Click

Saved source excerpts, not a live workspace view. File hashes use UTF-8 text with LF line endings.

## 1. src/click/decorators\.py:248-250

Source: Matches commit
Saved: 2026-10-04T15:31:33.999Z
File SHA-256: `16069357615691fcdfc9c794bb515f6009eb35aad6f7a76c017bdce06dae8d55`
Commit: `06b2a678741131fd577ce170e23e5ca0aeba0309`
[Source at commit](https://github.com/pallets/click/blob/06b2a678741131fd577ce170e23e5ca0aeba0309/src/click/decorators.py#L248-L250)

The decorator passes the original function as callback, then returns the command\.

```
        cmd = cls(name=cmd_name, callback=f, params=params, **attrs)
        cmd.__doc__ = f.__doc__
        return cmd
```

## 2. src/click/core\.py:1090-1090

Source: Matches commit
Saved: 2026-10-04T15:31:18.531Z
File SHA-256: `53df54afb5deba7fd7c3a968a2a6284fc2d9dd3892e6939dfbb3092ca3fbca0f`
Commit: `06b2a678741131fd577ce170e23e5ca0aeba0309`
[Source at commit](https://github.com/pallets/click/blob/06b2a678741131fd577ce170e23e5ca0aeba0309/src/click/core.py#L1090-L1090)

Command stores the callback on the instance\.

```
        self.callback = callback
```

## 3. src/click/core\.py:1441-1442

Source: Matches commit
Saved: 2026-10-04T15:31:18.948Z
File SHA-256: `53df54afb5deba7fd7c3a968a2a6284fc2d9dd3892e6939dfbb3092ca3fbca0f`
Commit: `06b2a678741131fd577ce170e23e5ca0aeba0309`
[Source at commit](https://github.com/pallets/click/blob/06b2a678741131fd577ce170e23e5ca0aeba0309/src/click/core.py#L1441-L1442)

Command execution passes parsed parameters to the callback\.

```
        if self.callback is not None:
            return ctx.invoke(self.callback, **ctx.params)
```

GitHub links use the local origin and commit; remote availability and access permissions have not been checked.
