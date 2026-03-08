'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Transaction, User } from '@/types';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(setCurrentUser);
  }, []);

  const loadTransactions = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: '15' });
    if (typeFilter !== 'all') params.set('type', typeFilter);

    const res = await fetch(`/api/transactions?${params}`);
    const data = await res.json();
    setTransactions(data.data || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
  }, [page, typeFilter]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  async function handleDelete(id: number) {
    if (!confirm('确定要删除这条交易记录吗？')) return;
    await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    loadTransactions();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">交易记录</h1>
        <Link href="/transactions/new">
          <Button>新增交易</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">共 {total} 条记录</CardTitle>
            <Select value={typeFilter} onValueChange={v => { if (v) { setTypeFilter(v); setPage(1); } }}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="income">收入</SelectItem>
                <SelectItem value="expense">支出</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">暂无交易记录</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日期</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead>记录人</TableHead>
                  <TableHead className="text-right">金额</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm">{t.date}</TableCell>
                    <TableCell>
                      <Badge variant={t.type === 'income' ? 'default' : 'destructive'} className="text-xs">
                        {t.type === 'income' ? '收入' : '支出'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{t.category_name}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{t.description}</TableCell>
                    <TableCell className="text-sm">{t.user_name}</TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={t.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                        {t.type === 'income' ? '+' : '-'}£{t.amount.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {currentUser && (t.user_id === currentUser.id || currentUser.role === 'admin') && (
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(t.id)}>
                          删除
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                上一页
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
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
