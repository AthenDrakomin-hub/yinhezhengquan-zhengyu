/**
 * 修复用户身份记录
 */
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 1 });

async function fixIdentities() {
  console.log('🔧 修复用户身份记录...\n');

  const users = await sql`
    SELECT id, email FROM auth.users WHERE email LIKE '%@yinhe.test'
  `;

  for (const user of users) {
    console.log(`处理: ${user.email}`);

    const existing = await sql`
      SELECT * FROM auth.identities WHERE user_id = ${user.id}::uuid
    `;

    if (existing.length > 0) {
      console.log(`  已有 identity，跳过`);
      continue;
    }

    // 创建 identity
    const identityData = JSON.stringify({
      sub: user.id,
      email: user.email
    });

    await sql`
      INSERT INTO auth.identities (
        provider_id, user_id, provider, identity_data, created_at, updated_at
      ) VALUES (
        ${user.id},
        ${user.id},
        'email',
        ${identityData}::jsonb,
        NOW(),
        NOW()
      )
    `;
    console.log(`  ✅ identity 创建成功`);
  }

  console.log('\n完成！');
  await sql.end();
}

fixIdentities().catch(console.error);
