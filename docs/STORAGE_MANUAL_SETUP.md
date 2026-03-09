# Supabase Storage 手动配置指南

## 问题
执行 SQL 时出现权限错误：`must be owner of table objects`

## 解决方案：通过 Dashboard 手动配置

### 步骤 1：开启 Bucket 的 Public 访问

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 进入你的项目
3. 点击左侧菜单 **Storage**
4. 点击 **Buckets** 标签
5. 找到 `tupian` bucket，点击右侧 **...** 菜单
6. 选择 **Edit bucket**
7. 开启 **Public bucket** 开关
8. 点击 **Save**

### 步骤 2：添加 Storage Policies（策略）

1. 在 Storage 页面，点击 **Policies** 标签
2. 点击 **New Policy** 按钮
3. 选择 **For full custom access**（完整自定义访问）

#### 创建策略 1：允许任何人读取

- **Policy name**: `Allow public read access`
- **Allowed operation**: `SELECT` (读取)
- **Target roles**: `public` (所有人)
- **Policy definition**:
  ```sql
  bucket_id = 'tupian'
  ```
- 点击 **Save policy**

#### 创建策略 2：允许认证用户上传

- **Policy name**: `Allow authenticated uploads`
- **Allowed operation**: `INSERT` (插入)
- **Target roles**: `authenticated` (已认证用户)
- **Policy definition**:
  ```sql
  bucket_id = 'tupian'
  ```
- 点击 **Save policy**

#### 创建策略 3：允许认证用户更新自己的文件

- **Policy name**: `Allow authenticated updates`
- **Allowed operation**: `UPDATE` (更新)
- **Target roles**: `authenticated`
- **Policy definition**:
  ```sql
  bucket_id = 'tupian' AND owner = auth.uid()
  ```
- 点击 **Save policy**

#### 创建策略 4：允许认证用户删除自己的文件

- **Policy name**: `Allow authenticated deletes`
- **Allowed operation**: `DELETE` (删除)
- **Target roles**: `authenticated`
- **Policy definition**:
  ```sql
  bucket_id = 'tupian' AND owner = auth.uid()
  ```
- 点击 **Save policy**

### 步骤 3：配置 CORS（跨域）

1. 在 Storage 页面，点击 **Policies** 标签
2. 点击 **CORS Configuration**
3. 添加你的 Vercel 域名：

```json
{
  "origins": [
    "http://localhost:5000",
    "http://localhost:5173",
    "https://your-vercel-domain.vercel.app"
  ],
  "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  "headers": ["authorization", "x-client-info", "apikey", "content-type"]
}
```

4. 点击 **Save**

### 步骤 4：验证配置

配置完成后，在浏览器中直接访问图片 URL 测试：

```
https://rfnrosyfeivcbkimjlwo.supabase.co/storage/v1/object/public/tupian/logologo-removebg-preview.png
```

如果能看到图片，说明配置成功。

## 常见问题

**Q: 为什么 SQL 执行失败？**
A: 因为 `storage.objects` 表的所有者是 Supabase 系统用户，普通用户没有权限直接修改 RLS 策略。必须通过 Dashboard 界面操作。

**Q: 配置后图片仍然无法访问？**
A: 检查以下几点：
1. Bucket 是否设置为 Public
2. Policies 是否创建成功
3. CORS 是否配置了正确的域名
4. 图片文件是否确实存在于 bucket 中

**Q: 如何查看已创建的 policies？**
A: 在 Dashboard → Storage → Policies 页面可以看到所有策略列表。

## 一键验证 SQL（只读）

执行以下 SQL 查看当前配置（不会修改任何内容）：

```sql
-- 查看 bucket 是否为 public
SELECT name, public FROM storage.buckets WHERE name = 'tupian';

-- 查看已有的 policies
SELECT policyname, permissive, roles::text, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';
```
