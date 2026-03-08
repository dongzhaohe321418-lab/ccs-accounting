'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { User } from '@/types';

export default function MembersPage() {
  const [members, setMembers] = useState<User[]>([]);

  async function loadMembers() {
    const res = await fetch('/api/admin/members');
    const data = await res.json();
    setMembers(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    loadMembers();
  }, []);

  async function toggleRole(id: number, currentRole: string) {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    await fetch('/api/admin/members', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, role: newRole }),
    });
    loadMembers();
  }

  async function toggleStatus(id: number, currentStatus: number) {
    await fetch('/api/admin/members', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isActive: currentStatus === 1 ? 0 : 1 }),
    });
    loadMembers();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">成员管理</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">共 {members.length} 名成员</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>注册时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map(m => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-sm">{m.email}</TableCell>
                  <TableCell>
                    <Badge variant={m.role === 'admin' ? 'default' : 'secondary'}>
                      {m.role === 'admin' ? '管理员' : '成员'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.is_active ? 'outline' : 'destructive'}>
                      {m.is_active ? '活跃' : '已停用'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{m.created_at?.split('T')[0]}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => toggleRole(m.id, m.role)}>
                        {m.role === 'admin' ? '降为成员' : '升为管理'}
                      </Button>
                      <Button variant="ghost" size="sm" className={m.is_active ? 'text-destructive' : 'text-green-600'} onClick={() => toggleStatus(m.id, m.is_active)}>
                        {m.is_active ? '停用' : '启用'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
