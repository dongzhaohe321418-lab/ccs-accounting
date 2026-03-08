export const CATEGORIES_SEED = [
  { name: '活动经费', type: 'expense' as const },
  { name: '餐饮费', type: 'expense' as const },
  { name: '交通费', type: 'expense' as const },
  { name: '场地租赁', type: 'expense' as const },
  { name: '宣传费', type: 'expense' as const },
  { name: '办公用品', type: 'expense' as const },
  { name: '会员费收入', type: 'income' as const },
  { name: '赞助收入', type: 'income' as const },
  { name: '其他支出', type: 'expense' as const },
  { name: '其他收入', type: 'income' as const },
];

export const REIMBURSEMENT_STATUS_MAP: Record<string, string> = {
  pending: '待审批',
  approved: '已批准',
  rejected: '已拒绝',
  paid: '已付款',
};

export const TRANSACTION_TYPE_MAP: Record<string, string> = {
  expense: '支出',
  income: '收入',
};

export const SYNC_STATUS_MAP: Record<string, string> = {
  pending: '待同步',
  synced: '已同步',
  failed: '同步失败',
};

export const ROLE_MAP: Record<string, string> = {
  admin: '管理员',
  member: '普通成员',
};
