'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { DashboardStats } from '@/types';

export default function AdminPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(setStats);
  }, []);

  if (!stats) return <div className="text-muted-foreground">加载中...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">管理面板</h1>

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
            <CardTitle className="text-sm font-medium text-muted-foreground">待审批</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingReimbursements}</div>
            <p className="text-xs text-muted-foreground">{stats.totalMembers} 名成员</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/admin/members">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="pt-6 text-center">
              <div className="text-3xl mb-2">👥</div>
              <div className="font-medium">成员管理</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/approvals">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="pt-6 text-center">
              <div className="text-3xl mb-2">✅</div>
              <div className="font-medium">审批管理</div>
              {stats.pendingReimbursements > 0 && (
                <div className="text-sm text-destructive mt-1">{stats.pendingReimbursements} 条待审批</div>
              )}
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/sync">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="pt-6 text-center">
              <div className="text-3xl mb-2">🔄</div>
              <div className="font-medium">Sheets 同步</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/export">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="pt-6 text-center">
              <div className="text-3xl mb-2">📥</div>
              <div className="font-medium">数据导出</div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
