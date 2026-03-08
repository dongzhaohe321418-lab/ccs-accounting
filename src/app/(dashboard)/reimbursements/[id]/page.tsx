'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Reimbursement, User } from '@/types';

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: '待审批', variant: 'secondary' },
  approved: { label: '已批准', variant: 'default' },
  rejected: { label: '已拒绝', variant: 'destructive' },
  paid: { label: '已付款', variant: 'outline' },
};

export default function ReimbursementDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [reimbursement, setReimbursement] = useState<Reimbursement | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(setUser);
    fetch(`/api/reimbursements/${params.id}`).then(r => r.json()).then(setReimbursement);
  }, [params.id]);

  async function handleApproval(status: 'approved' | 'rejected') {
    setLoading(true);
    try {
      const res = await fetch(`/api/reimbursements/${params.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      });
      if (res.ok) {
        const data = await res.json();
        setReimbursement(data);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkPaid() {
    setLoading(true);
    try {
      const res = await fetch(`/api/reimbursements/${params.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' }),
      });
      if (res.ok) {
        const data = await res.json();
        setReimbursement(data);
      }
    } finally {
      setLoading(false);
    }
  }

  if (!reimbursement) {
    return <div className="text-muted-foreground">加载中...</div>;
  }

  const statusInfo = STATUS_MAP[reimbursement.status] || { label: reimbursement.status, variant: 'secondary' as const };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">报销详情 #{reimbursement.id}</h1>
        <Button variant="outline" onClick={() => router.back()}>返回</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>基本信息</CardTitle>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">金额：</span>
              <span className="font-medium">£{reimbursement.amount.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">分类：</span>
              <span>{reimbursement.category_name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">日期：</span>
              <span>{reimbursement.date}</span>
            </div>
            <div>
              <span className="text-muted-foreground">申请人：</span>
              <span>{reimbursement.user_name}</span>
            </div>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">描述：</span>
            <p className="mt-1">{reimbursement.description}</p>
          </div>
          {reimbursement.receipt_path && (
            <div className="text-sm">
              <span className="text-muted-foreground">收据：</span>
              <a href={`/api/upload/${reimbursement.receipt_path}`} target="_blank" className="text-primary underline ml-1">
                查看收据
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {reimbursement.reviewed_by && (
        <Card>
          <CardHeader>
            <CardTitle>审批信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">审批人：</span>
              <span>{reimbursement.reviewer_name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">审批时间：</span>
              <span>{reimbursement.reviewed_at}</span>
            </div>
            {reimbursement.review_notes && (
              <div>
                <span className="text-muted-foreground">备注：</span>
                <p className="mt-1">{reimbursement.review_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {user?.role === 'admin' && reimbursement.status === 'pending' && (
        <Card>
          <CardHeader>
            <CardTitle>审批操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>审批备注（可选）</Label>
              <Textarea
                placeholder="输入审批备注..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={() => handleApproval('approved')} disabled={loading}>
                批准
              </Button>
              <Button variant="destructive" onClick={() => handleApproval('rejected')} disabled={loading}>
                拒绝
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {user?.role === 'admin' && reimbursement.status === 'approved' && (
        <Card>
          <CardContent className="pt-6">
            <Button onClick={handleMarkPaid} disabled={loading}>
              标记为已付款
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
