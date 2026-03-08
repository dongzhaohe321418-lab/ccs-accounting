'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Category } from '@/types';

export default function NewTransactionPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setCategories);
  }, []);

  const filteredCategories = categories.filter(c => c.type === type);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let receiptPath: string | undefined;

      if (receiptFile) {
        const formData = new FormData();
        formData.append('file', receiptFile);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!uploadRes.ok) {
          const uploadData = await uploadRes.json();
          setError(uploadData.error || '上传失败');
          return;
        }
        const uploadData = await uploadRes.json();
        receiptPath = uploadData.path;
      }

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          amount: parseFloat(amount),
          categoryId: parseInt(categoryId),
          date,
          description,
          receiptPath,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || '创建失败');
        return;
      }

      router.push('/transactions');
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">新增交易</h1>

      <Card>
        <CardHeader>
          <CardTitle>交易信息</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{error}</div>
            )}

            <div className="space-y-2">
              <Label>类型</Label>
              <Select value={type} onValueChange={v => { if (v) { setType(v as 'expense' | 'income'); setCategoryId(''); } }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">支出</SelectItem>
                  <SelectItem value="income">收入</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>金额 (GBP)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>分类</Label>
              <Select value={categoryId} onValueChange={v => v && setCategoryId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>日期</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea
                placeholder="请描述此笔交易..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>收据（可选）</Label>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={e => setReceiptFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">支持 JPG、PNG、WebP、PDF，最大 5MB</p>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading || !categoryId}>
                {loading ? '提交中...' : '提交'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                取消
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
