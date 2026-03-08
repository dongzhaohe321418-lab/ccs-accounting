'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { DashboardStats, Transaction } from '@/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setStats);
  }, []);

  if (!stats) return <div className="text-muted-foreground">加载中...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">首页</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">总收入</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">£{stats.totalIncome.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">总支出</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">£{stats.totalExpense.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">余额</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              £{stats.balance.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">社团成员</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            {stats.pendingReimbursements > 0 && (
              <p className="text-xs text-muted-foreground">{stats.pendingReimbursements} 笔待审批报销</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>最近交易</CardTitle>
        </CardHeader>
        <CardContent>
          {(stats.recentTransactions || []).length === 0 ? (
            <p className="text-muted-foreground text-sm">暂无交易记录</p>
          ) : (
            <div className="space-y-3">
              {stats.recentTransactions.map((t: Transaction) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <div className="font-medium text-sm">{t.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.category_name} · {t.date} · {t.user_name}
                    </div>
                  </div>
                  <Badge variant={t.type === 'income' ? 'default' : 'destructive'}>
                    {t.type === 'income' ? '+' : '-'}£{t.amount.toFixed(2)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
