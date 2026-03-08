'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Reimbursement } from '@/types';

export default function ApprovalsPage() {
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);

  const loadData = useCallback(async () => {
    const res = await fetch('/api/reimbursements?status=pending&limit=50');
    const data = await res.json();
    setReimbursements(data.data || []);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function quickApprove(id: number, status: 'approved' | 'rejected') {
    await fetch(`/api/reimbursements/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes: '' }),
    });
    loadData();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">审批管理</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{reimbursements.length} 条待审批</CardTitle>
        </CardHeader>
        <CardContent>
          {reimbursements.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">暂无待审批的报销申请</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日期</TableHead>
                  <TableHead>申请人</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead className="text-right">金额</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reimbursements.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{r.date}</TableCell>
                    <TableCell className="text-sm">{r.user_name}</TableCell>
                    <TableCell className="text-sm">{r.category_name}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{r.description}</TableCell>
                    <TableCell className="text-right font-medium">£{r.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => quickApprove(r.id, 'approved')}>
                          批准
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => quickApprove(r.id, 'rejected')}>
                          拒绝
                        </Button>
                        <Link href={`/reimbursements/${r.id}`}>
                          <Button variant="ghost" size="sm">详情</Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
