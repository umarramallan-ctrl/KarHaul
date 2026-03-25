import { MainLayout } from "@/components/layout/MainLayout";
import { AuthGuard } from "@/components/AuthGuard";
import { useAdminGetStats, useAdminListUsers, useAdminVerifyDriver, useAdminSuspendUser } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, ShieldCheck, Ban, Users, Truck, Package } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export default function AdminDashboard() {
  const { toast } = useToast();
  const { data: stats } = useAdminGetStats();
  const { data: usersData, refetch: refetchUsers } = useAdminListUsers();
  
  const verifyMutation = useAdminVerifyDriver();
  const suspendMutation = useAdminSuspendUser();

  const handleVerify = (id: string) => {
    verifyMutation.mutate({ userId: id }, {
      onSuccess: () => { toast({ title: "Driver Verified" }); refetchUsers(); }
    });
  };

  const handleSuspend = (id: string) => {
    suspendMutation.mutate({ userId: id }, {
      onSuccess: () => { toast({ title: "User Suspended" }); refetchUsers(); }
    });
  };

  return (
    <AuthGuard requireRole="admin">
      <MainLayout>
        <div className="bg-slate-900 py-8 text-white">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl font-display font-bold flex items-center">
              <ShieldAlert className="mr-3 h-8 w-8 text-accent" /> Platform Administration
            </h1>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-xl text-blue-600"><Users className="h-6 w-6"/></div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Users</p>
                  <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-purple-100 p-3 rounded-xl text-purple-600"><Truck className="h-6 w-6"/></div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Drivers</p>
                  <p className="text-2xl font-bold">{stats?.totalDrivers || 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600"><Package className="h-6 w-6"/></div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Bookings</p>
                  <p className="text-2xl font-bold">{stats?.totalBookings || 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-amber-100 p-3 rounded-xl text-amber-600"><DollarSign className="h-6 w-6"/></div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Transacted Vol.</p>
                  <p className="text-2xl font-bold text-accent">{formatCurrency(stats?.totalRevenue || 0)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>DOT/MC</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersData?.users?.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-medium">{user.firstName} {user.lastName}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="uppercase">{user.role}</Badge></TableCell>
                        <TableCell>
                          {user.role === 'driver' || user.role === 'both' ? (
                            <div className="text-xs font-mono">
                              DOT: {user.dotNumber || 'N/A'}<br/>MC: {user.mcNumber || 'N/A'}
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {user.isSuspended ? (
                            <Badge variant="destructive">Suspended</Badge>
                          ) : user.isVerified ? (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Verified</Badge>
                          ) : (
                            <Badge variant="secondary">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {(user.role === 'driver' || user.role === 'both') && !user.isVerified && !user.isSuspended && (
                              <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100" onClick={() => handleVerify(user.id)} disabled={verifyMutation.isPending}>
                                <ShieldCheck className="mr-1 h-3 w-3" /> Verify
                              </Button>
                            )}
                            {!user.isSuspended && user.role !== 'admin' && (
                              <Button size="sm" variant="outline" className="border-red-200 text-red-700 bg-red-50 hover:bg-red-100" onClick={() => handleSuspend(user.id)} disabled={suspendMutation.isPending}>
                                <Ban className="mr-1 h-3 w-3" /> Suspend
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </AuthGuard>
  );
}

import { DollarSign } from "lucide-react";
