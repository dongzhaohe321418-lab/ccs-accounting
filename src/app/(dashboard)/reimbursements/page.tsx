'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Reimbursement } from '@/types';

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: '待审批', variant: 'secondary' },
  approved: { label: '已批准', variant: 'default' },
  rejected: { label: '已拒绝', variant: 'destructive' },
  paid: { label: '已付款', variant: 'outline' },
};

export default function ReimbursementsPage() {
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadData = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: '15' });
    if (statusFilter !== 'all') params.set('status', statusFilter);

    const res = await fetch(`/api/reimbursements?${params}`);
    const data = await res.json();
    setReimbursements(data.data || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
  }, [page, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">报销管理</h1>
        <Link href="/reimbursements/new">
          <Button>提交报销</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">共 {total} 条记录</CardTitle>
            <Select value={statusFilter} onValueChange={v => { if (v) { setStatusFilter(v); setPage(1); } }}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="pending">待审批</SelectItem>
                <SelectItem value="approved">已批准</SelectItem>
                <SelectItem value="rejected">已拒绝</SelectItem>
                <SelectItem value="paid">已付款</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {reimbursements.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">暂无报销记录</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日期</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead>申请人</TableHead>
                  <TableHead className="text-right">金额</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reimbursements.map(r => {
                  const statusInfo = STATUS_MAP[r.status] || { label: r.status, variant: 'secondary' as const };
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">{r.date}</TableCell>
                      <TableCell className="text-sm">{r.category_name}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{r.description}</TableCell>
                      <TableCell className="text-sm">{r.user_name}</TableCell>
                      <TableCell className="text-right font-medium">£{r.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Link href={`/reimbursements/${r.id}`}>
                          <Button variant="ghost" size="sm">查看</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                上一页
              </Button>
              <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                下一页
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
