'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SyncStatus {
  configured: boolean;
  queueLength: number;
  processing: boolean;
  unsyncedTransactions: number;
  unsyncedReimbursements: number;
}

interface SyncResult {
  success: boolean;
  message: string;
  details?: { transactions: number; reimbursements: number; members: number };
}

export default function SyncPage() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  const loadStatus = useCallback(async () => {
    const res = await fetch('/api/sync');
    if (res.ok) setStatus(await res.json());
  }, []);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  async function handleFullSync() {
    setSyncing(true);
    setLastResult(null);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const result = await res.json();
      setLastResult(result);
      loadStatus();
    } catch {
      setLastResult({ success: false, message: '网络错误' });
    } finally {
      setSyncing(false);
    }
  }

  async function handleRecovery() {
    setRecovering(true);
    try {
      const res = await fetch('/api/sync/recovery', { method: 'POST' });
      const result = await res.json();
      setLastResult(result);
      loadStatus();
    } catch {
      setLastResult({ success: false, message: '网络错误' });
    } finally {
      setRecovering(false);
    }
  }

  if (!status) return <div className="text-muted-foreground">加载中...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Google Sheets 同步</h1>

      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">连接状态</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Google Sheets</span>
            {status.configured ? (
              <Badge variant="default">已连接</Badge>
            ) : (
              <Badge variant="destructive">未配置</Badge>
            )}
          </div>
          {!status.configured && (
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              请在 <code className="bg-background px-1 py-0.5 rounded">.env.local</code> 中设置以下环境变量：
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li><code>GOOGLE_SERVICE_ACCOUNT_EMAIL</code></li>
                <li><code>GOOGLE_PRIVATE_KEY</code></li>
                <li><code>GOOGLE_SPREADSHEET_ID</code></li>
              </ul>
              <p className="mt-2">设置后请重启服务。</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">同步状态</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted rounded-md">
              <div className="text-2xl font-bold">{status.queueLength}</div>
              <div className="text-xs text-muted-foreground">队列中</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-md">
              <div className="text-2xl font-bold">{status.unsyncedTransactions}</div>
              <div className="text-xs text-muted-foreground">未同步交易</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-md">
              <div className="text-2xl font-bold">{status.unsyncedReimbursements}</div>
              <div className="text-xs text-muted-foreground">未同步报销</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-md">
              <div className="text-2xl font-bold">{status.processing ? '是' : '否'}</div>
              <div className="text-xs text-muted-foreground">正在处理</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">操作</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleFullSync}
              disabled={syncing || !status.configured}
            >
              {syncing ? '同步中...' : '全量同步'}
            </Button>
            <Button
              variant="outline"
              onClick={handleRecovery}
              disabled={recovering || !status.configured || (status.unsyncedTransactions === 0 && status.unsyncedReimbursements === 0)}
            >
              {recovering ? '恢复中...' : '恢复未同步数据'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            全量同步：将所有交易、报销和成员数据完整写入 Google Sheets（覆盖现有数据）。
            恢复未同步：将同步失败的数据重新加入队列进行增量同步。
          </p>
        </CardContent>
      </Card>

      {/* Last Result */}
      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">操作结果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`p-3 rounded-md text-sm ${lastResult.success ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200' : 'bg-destructive/10 text-destructive'}`}>
              {lastResult.message}
              {lastResult.details && (
                <div className="mt-2 text-xs">
                  同步了 {lastResult.details.transactions} 笔交易、{lastResult.details.reimbursements} 笔报销、{lastResult.details.members} 名成员
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
