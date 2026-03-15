/**
 * 银证转账服务
 * 调用 bank-transfer Edge Function
 */

import { supabase } from '@/lib/supabase';

export interface BankAccount {
  id: string;
  user_id: string;
  bank_code: string;
  bank_name: string;
  account_no: string;
  account_name: string;
  balance: number;
  is_default: boolean;
  status: string;
  daily_limit: number;
  single_limit: number;
  created_at: string;
  updated_at: string;
}

export interface BankTransfer {
  id: string;
  user_id: string;
  bank_account_id: string;
  transfer_type: 'IN' | 'OUT';
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  created_at: string;
  processed_at: string;
  remark: string;
  bank_accounts?: {
    bank_name: string;
    account_no: string;
  };
}

export const bankTransferService = {
  /**
   * 获取用户银行卡列表
   */
  async getBankAccounts(): Promise<BankAccount[]> {
    const { data, error } = await supabase.functions.invoke('bank-transfer', {
      body: { action: 'get_bank_accounts' }
    });

    if (error) throw error;
    return data?.data || [];
  },

  /**
   * 绑定银行卡
   */
  async bindBankAccount(params: {
    bank_code: string;
    bank_name: string;
    account_no: string;
    account_name?: string;
  }): Promise<BankAccount> {
    const { data, error } = await supabase.functions.invoke('bank-transfer', {
      body: { 
        action: 'bind_bank_account',
        payload: params
      }
    });

    if (error) throw error;
    return data?.data;
  },

  /**
   * 执行转账
   */
  async transfer(params: {
    transfer_type: 'IN' | 'OUT';
    amount: number;
    bank_account_id?: string;
  }): Promise<{ transfer_id: string; amount: number; type: string }> {
    const { data, error } = await supabase.functions.invoke('bank-transfer', {
      body: {
        action: 'transfer',
        payload: params
      }
    });

    if (error) throw error;
    return data?.data;
  },

  /**
   * 获取转账记录
   */
  async getTransferRecords(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<{
    data: BankTransfer[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const { data, error } = await supabase.functions.invoke('bank-transfer', {
      body: {
        action: 'get_transfer_records',
        payload: params || {}
      }
    });

    if (error) throw error;
    return data || { data: [], total: 0, page: 1, pageSize: 20 };
  },

  /**
   * 银行转证券
   */
  async deposit(amount: number, bankAccountId?: string): Promise<{ transfer_id: string; amount: number }> {
    const result = await this.transfer({
      transfer_type: 'IN',
      amount,
      bank_account_id: bankAccountId
    });
    return { transfer_id: result.transfer_id, amount: result.amount };
  },

  /**
   * 证券转银行
   */
  async withdraw(amount: number, bankAccountId?: string): Promise<{ transfer_id: string; amount: number }> {
    const result = await this.transfer({
      transfer_type: 'OUT',
      amount,
      bank_account_id: bankAccountId
    });
    return { transfer_id: result.transfer_id, amount: result.amount };
  }
};

export default bankTransferService;
