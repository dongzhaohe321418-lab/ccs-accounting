export type UserRole = 'admin' | 'member';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  type: 'expense' | 'income';
  is_active: number;
}

export type TransactionType = 'expense' | 'income';
export type SyncStatus = 'pending' | 'synced' | 'failed';

export interface Transaction {
  id: number;
  user_id: number;
  type: TransactionType;
  amount: number;
  category_id: number;
  date: string;
  description: string;
  receipt_path: string | null;
  reimbursement_id: number | null;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
  sync_status: SyncStatus;
  // Joined fields
  user_name?: string;
  category_name?: string;
}

export type ReimbursementStatus = 'pending' | 'approved' | 'rejected' | 'paid';

export interface Reimbursement {
  id: number;
  user_id: number;
  amount: number;
  category_id: number;
  date: string;
  description: string;
  receipt_path: string | null;
  status: ReimbursementStatus;
  reviewed_by: number | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
  sync_status: SyncStatus;
  // Joined fields
  user_name?: string;
  category_name?: string;
  reviewer_name?: string;
}

export interface SyncLog {
  id: number;
  entity_type: 'transaction' | 'reimbursement';
  entity_id: number;
  action: 'create' | 'update' | 'delete';
  status: 'success' | 'failed' | 'retrying';
  error_message: string | null;
  retry_count: number;
  created_at: string;
}

export interface DashboardStats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  pendingReimbursements: number;
  totalMembers: number;
  recentTransactions: Transaction[];
}

export interface AuthPayload {
  userId: number;
  email: string;
  role: UserRole;
}
