'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ExportPage() {
  function downloadCSV(type: string) {
    window.open(`/api/export?type=${type}`, '_blank');
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">数据导出</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>交易记录</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">导出所有交易记录为 CSV 文件</p>
            <Button onClick={() => downloadCSV('transactions')}>
              下载交易记录 CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>报销记录</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">导出所有报销记录为 CSV 文件</p>
            <Button onClick={() => downloadCSV('reimbursements')}>
              下载报销记录 CSV
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
