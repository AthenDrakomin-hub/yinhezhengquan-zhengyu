
# 🔐 银河证券正裕交易系统 - 登录指南

## 📋 正确的账号创建流程（安全版）

### 方案一：通过注册页面创建账号（推荐）

#### 1. 注册客户端账号
1. 访问：`http://localhost:5000/auth/register`
2. 填写注册信息：
   - 邮箱：您的邮箱
   - 密码：您的密码（至少6位）
   - 用户名：您的用户名
3. 点击"注册"
4. 系统会自动创建：
   - Auth账号
   - profiles表记录
   - assets表记录（100万初始资金）

#### 2. 升级为管理员（如需管理端权限）
注册成功后，告诉我您的**邮箱地址**，我会通过SQL将您的账号升级为管理员！

---

### 方案二：在Supabase控制台创建账号

#### 1. 创建Auth账号
1. 登录Supabase控制台
2. 进入 **Authentication** → **Users**
3. 点击 **Add user** → **Create new user**
4. 填写：
   - Email address：您的邮箱
   - Password：您的密码
   - 勾选 **Auto Confirm User**
5. 点击 **Create user**

#### 2. 手动创建profiles和assets记录
创建Auth账号后，告诉我您的**用户ID**（在Users列表中可以看到），我会帮您创建profiles和assets记录！

---

## 🔧 我能帮您做的

### 如果您已经注册了账号
告诉我您的**邮箱地址**，我可以：
1. ✅ 查看您的账号信息
2. ✅ 将您的账号升级为超级管理员
3. ✅ 为您配置资金
4. ✅ 验证账号状态

### SQL升级管理员示例（仅供参考）
```sql
-- 升级为超级管理员
UPDATE profiles 
SET role = 'super_admin', 
    admin_level = 'super_admin',
    is_admin = true
WHERE email = '您的邮箱@example.com';
```

---

## ⚠️ 重要安全提醒

1. **不要在代码中明文写密码！**
2. **不要在脚本中硬编码密码！**
3. **所有密码应该由用户自己设置！**
4. **通过正规的注册流程创建账号！**

---

## 🚀 下一步

请选择一种方式：
1. **访问注册页面**：`http://localhost:5000/auth/register` 注册账号
2. **或者**：告诉我您想使用的邮箱，我告诉您如何在Supabase创建

注册完成后，告诉我您的邮箱，我帮您升级为管理员！
