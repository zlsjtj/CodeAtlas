# Click: from decorator to callback

Repository: Click

Saved source excerpts and notes, not a live workspace view.

## 1. Create the command

[src/click/decorators\.py:248\-250](https://github.com/pallets/click/blob/06b2a678741131fd577ce170e23e5ca0aeba0309/src/click/decorators.py#L248-L250)

The decorator passes the original function as callback, then returns the command\.

```python
        cmd = cls(name=cmd_name, callback=f, params=params, **attrs)
        cmd.__doc__ = f.__doc__
        return cmd
```

<details>
<summary>Source and version</summary>

- Source: Matches commit
- Saved: 2026-10-04T16:47:02.534Z
- File SHA-256: `16069357615691fcdfc9c794bb515f6009eb35aad6f7a76c017bdce06dae8d55`
- Commit: `06b2a678741131fd577ce170e23e5ca0aeba0309`

</details>

## 2. Keep the callback

[src/click/core\.py:1090](https://github.com/pallets/click/blob/06b2a678741131fd577ce170e23e5ca0aeba0309/src/click/core.py#L1090-L1090)

Command stores the callback on the instance\.

```python
        self.callback = callback
```

<details>
<summary>Source and version</summary>

- Source: Matches commit
- Saved: 2026-10-04T16:46:46.952Z
- File SHA-256: `53df54afb5deba7fd7c3a968a2a6284fc2d9dd3892e6939dfbb3092ca3fbca0f`
- Commit: `06b2a678741131fd577ce170e23e5ca0aeba0309`

</details>

## 3. Invoke the callback

[src/click/core\.py:1441\-1442](https://github.com/pallets/click/blob/06b2a678741131fd577ce170e23e5ca0aeba0309/src/click/core.py#L1441-L1442)

Command execution passes parsed parameters to the callback\.

```python
        if self.callback is not None:
            return ctx.invoke(self.callback, **ctx.params)
```

<details>
<summary>Source and version</summary>

- Source: Matches commit
- Saved: 2026-10-04T16:46:47.400Z
- File SHA-256: `53df54afb5deba7fd7c3a968a2a6284fc2d9dd3892e6939dfbb3092ca3fbca0f`
- Commit: `06b2a678741131fd577ce170e23e5ca0aeba0309`

</details>

<details>
<summary>About this export</summary>

File hashes use the whole UTF-8 file with LF line endings.

GitHub links use the local origin and commit; remote availability and access permissions have not been checked.

</details>
