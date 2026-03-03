# Git 提交指南 - 数据库对齐工具集归档

## 📝 提交信息模板

### 主提交信息
```
feat(ops): 归档数据库对齐工具集到运维目录

- 添加完整的数据库对齐工具集（14 个文件）
- 包括 7 个 PowerShell 脚本和 1 个批处理脚本
- 包含 6 份详细使用文档
- 支持 Supabase数据库连接验证、表结构对比、数据一致性检查
- 提供 RLS 策略检查、扩展配置检查等功能
- 生成综合报告并支持导出

归档位置：docs/运维类/数据库对齐/
项目 Ref: rfnrosyfeivcbkimjlwo
```

### 详细描述（可选）
```markdown
## 变更说明

### 新增内容
1. **PowerShell 脚本** (7 个)
   - verify-db-connection.ps1 - 数据库连接验证
   - compare-schema.ps1 - 表结构对比
   - check-data-consistency.ps1 - 数据一致性检查
   - check-rls-policies.ps1 - RLS 策略检查
   - check-extensions-config.ps1 - 扩展和配置检查
   - generate-db-alignment-report.ps1 - 综合报告生成
   - create-migrations-table.ps1 - 迁移表修复脚本

2. **批处理脚本** (1 个)
   - check-db-quick.bat - 一键快速检查

3. **文档** (6 个)
   - README.md - 工具集总览
   - DATABASE_ALIGNMENT_GUIDE.md - 详细使用手册
   - PSQL_INSTALL_GUIDE.md - psql 安装指南
   - DELIVERY_CHECKLIST.md - 交付清单
   - DATABASE_ALIGNMENT_SUMMARY.md - 项目总结
   - DATABASE_ALIGNMENT_RESULT.md - 检查结果报告
   - ARCHIVE_README.md - 归档说明

### 功能特性
- ✅ 自动化数据库对齐检查
- ✅ 5 大核心模块覆盖
- ✅ 12 个核心业务表验证
- ✅ RLS 安全策略检查
- ✅ 扩展和函数验证
- ✅ 综合报告生成和导出

### 技术细节
- 支持 PostgreSQL 18.x
- 兼容 Supabase 连接池
- SSL 模式自动处理
- 彩色终端输出
- 友好的错误提示

## 测试验证
- [x] 所有脚本语法正确
- [x] 实际连接测试通过
- [x] 核心表验证通过
- [x] RLS 策略检查通过
- [x] 报告生成功能正常

## 使用示例
```bash
# 快速检查
cd docs/运维类/数据库对齐
.\check-db-quick.bat

# 完整检查
powershell -ExecutionPolicy Bypass -File .\generate-db-alignment-report.ps1 -ExportReport
```

## 相关资源
- Supabase 项目：rfnrosyfeivcbkimjlwo
- psql 版本：PostgreSQL 18.3
- 归档日期：2026-03-03
```

---

## 🚀 Git 提交流程

### 1. 添加文件
```bash
# 进入项目根目录
cd c:\Users\88903\Desktop\yinhezhengquan-zhengyu

# 添加归档目录
git add docs/运维类/数据库对齐/

# 或选择性添加
git add docs/运维类/数据库对齐/*.ps1
git add docs/运维类/数据库对齐/*.bat
git add docs/运维类/数据库对齐/*.md
```

### 2. 查看状态
```bash
# 检查要提交的文件
git status

# 查看具体变更
git diff --cached
```

### 3. 提交变更
```bash
# 使用标准提交信息
git commit -m "feat(ops): 归档数据库对齐工具集到运维目录" -m "- 添加完整的数据库对齐工具集（14 个文件）" -m "- 支持 Supabase数据库连接验证和安全检查" -m "- 归档位置：docs/运维类/数据库对齐/"
```

### 4. 推送到远程
```bash
# 推送到当前分支
git push origin HEAD

# 或推送到指定分支
git push origin main
```

---

## ⚠️ 注意事项

### .gitignore 配置

确保以下文件被排除：

```gitignore
# 敏感信息
.env
.env.local
.env.production

# 生成的报告
database/reports/
database/exports/

# 临时文件
*.log
*.tmp
*.bak

# 系统文件
.DS_Store
Thumbs.db
```

### 文件大小限制

- 单个文件 < 50 MB
- 总提交大小 < 100 MB
- 当前归档总大小：~100 KB ✅

### 分支策略

- **开发分支**: `develop` 或 `dev`
- **生产分支**: `main` 或 `master`
- **特性分支**: `feature/database-alignment-tools`

---

## 📊 提交统计

### 文件统计
```
新增文件：15 个 (包括 ARCHIVE_README.md)
删除文件：0 个
修改文件：0 个
总大小：~105 KB
```

### 代码统计
```
PowerShell 脚本：7 个，约 1,600+ 行
批处理脚本：1 个，73 行
文档文件：7 个，约 50,000+ 字
```

---

## 🔍 提交后验证

### 1. 检查提交历史
```bash
# 查看最近的提交
git log --oneline -5

# 查看详细提交信息
git show HEAD
```

### 2. 验证文件完整性
```bash
# 列出提交的文件
git ls-tree -r HEAD --name-only | grep "运维类/数据库对齐"

# 应该显示 15 个文件
```

### 3. 远程验证
```bash
# 获取远程状态
git fetch origin

# 检查远程分支
git status
```

---

## 📞 回滚方案

### 如果提交有问题

```bash
# 撤销最后一次提交（保留更改）
git reset --soft HEAD~1

# 撤销提交并丢弃更改
git reset --hard HEAD~1

# 修改最后一次提交
git commit --amend -m "新的提交信息"
```

### 恢复已提交文件

```bash
# 从特定提交恢复文件
git checkout <commit-hash> -- docs/运维类/数据库对齐/

# 从远程分支恢复
git checkout origin/main -- docs/运维类/数据库对齐/
```

---

## 📋 提交检查清单

提交前确认：

- [ ] 所有 15 个文件已添加到暂存区
- [ ] `.env` 等敏感文件未包含
- [ ] 提交信息清晰准确
- [ ] 文件路径正确（中文路径无乱码）
- [ ] 文件大小在限制范围内
- [ ] 已通过本地测试验证
- [ ] 已阅读相关文档

---

## 🎯 最佳实践

### 提交信息规范
- 使用动词开头（feat, fix, docs, style, refactor, test, chore）
- 简明扼要描述变更
- 包含必要的上下文信息
- 使用现在时态

### 文件组织
- 保持目录结构清晰
- 使用有意义的文件名
- 包含必要的文档
- 定期清理临时文件

### 版本控制
- 小步提交，频繁推送
- 每个提交完成一个功能
- 保持提交历史清晰
- 及时标记重要版本

---

**创建日期**: 2026-03-03  
**适用项目**: 银河证券管理系统  
**维护者**: 开发团队
