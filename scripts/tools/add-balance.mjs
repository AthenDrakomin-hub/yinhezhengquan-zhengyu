import pg from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const { Client } = pg;

async function addBalance() {
  console.log('💰 开始上分操作...\n');

  const client = new Client({
    connectionString: process.env.VITE_POSTGRES_URL_NON_POOLING.replace('sslmode=require', 'sslmode=no-verify'),
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // 获取所有用户
    const users = await client.query(`
      SELECT id, email, username, role 
      FROM profiles 
      ORDER BY created_at;
    `);

    console.log(`找到 ${users.rows.length} 个用户\n`);

    for (const user of users.rows) {
      const amount = user.role === 'admin' ? 10000000 : 1000000; // 管理员1000万，普通用户100万
      
      // 检查是否已有资产记录
      const existingAsset = await client.query(`
        SELECT * FROM assets WHERE user_id = $1;
      `, [user.id]);

      if (existingAsset.rows.length === 0) {
        // 创建资产记录
        await client.query(`
          INSERT INTO assets (user_id, available_balance, frozen_balance, total_asset, today_profit_loss)
          VALUES ($1, $2, 0, $2, 0);
        `, [user.id, amount]);
        
        console.log(`✅ ${user.email}`);
        console.log(`   创建资产记录，初始余额: ${amount.toLocaleString()} 元\n`);
      } else {
        // 更新资产记录
        await client.query(`
          UPDATE assets 
          SET available_balance = available_balance + $1,
              total_asset = total_asset + $1,
              updated_at = NOW()
          WHERE user_id = $2;
        `, [amount, user.id]);
        
        const newBalance = parseFloat(existingAsset.rows[0].available_balance) + amount;
        console.log(`✅ ${user.email}`);
        console.log(`   上分: +${amount.toLocaleString()} 元`);
        console.log(`   新余额: ${newBalance.toLocaleString()} 元\n`);
      }

      // 记录资金流水
      await client.query(`
        INSERT INTO fund_flows (user_id, flow_type, amount, balance_after, remark)
        VALUES ($1, 'DEPOSIT', $2, 
          (SELECT available_balance FROM assets WHERE user_id = $1),
          '系统上分');
      `, [user.id, amount]);
    }

    // 显示最终结果
    console.log('📊 最终资产统计:\n');
    const finalAssets = await client.query(`
      SELECT p.email, p.username, p.role, a.available_balance, a.total_asset
      FROM profiles p
      LEFT JOIN assets a ON p.id = a.user_id
      ORDER BY p.created_at;
    `);

    finalAssets.rows.forEach((row, i) => {
      const roleIcon = row.role === 'admin' ? '👑' : '👤';
      console.log(`${i + 1}. ${roleIcon} ${row.email}`);
      console.log(`   可用余额: ${parseFloat(row.available_balance || 0).toLocaleString()} 元`);
      console.log(`   总资产: ${parseFloat(row.total_asset || 0).toLocaleString()} 元\n`);
    });

    console.log('✅ 上分完成！');

  } catch (error) {
    console.error('❌ 上分失败:', error.message);
  } finally {
    await client.end();
  }
}

addBalance();
