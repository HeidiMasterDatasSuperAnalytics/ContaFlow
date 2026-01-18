import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { UserCog, Plus, Search, Mail, Shield, MoreHorizontal, Eye, EyeOff, Trash2, Building2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const ROLES = {
  admin: { 
    label: 'Administrador', 
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    permissions: 'Acceso total: edición, eliminación, gestión de usuarios'
  },
  staff: { 
    label: 'Asistente Administrativo', 
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    permissions: 'Captura y edición de información, carga de archivos, uso de chat'
  },
  user: { 
    label: 'Cliente', 
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    permissions: 'Solo lectura: consulta de facturas, documentos y chat'
  },
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'user',
    client_id: '',
  });
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersData, clientsData, userData] = await Promise.all([
        base44.entities.User.list('-created_date'),
        base44.entities.Client.list(),
        base44.auth.me()
      ]);
      setUsers(usersData);
      setClients(clientsData);
      setCurrentUser(userData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    setInviting(true);
    
    try {
      await base44.users.inviteUser(inviteForm.email, inviteForm.role);
      
      // If user role is 'user' (client), update client with assigned_user_email
      if (inviteForm.role === 'user' && inviteForm.client_id) {
        await base44.entities.Client.update(inviteForm.client_id, {
          assigned_user_email: inviteForm.email
        });
      }

      setShowInviteDialog(false);
      setInviteForm({ email: '', role: 'user', client_id: '' });
      loadData();
      
      // Show success message
      alert(`Invitación enviada a ${inviteForm.email}`);
    } catch (error) {
      console.error('Error inviting user:', error);
      alert('Error al enviar la invitación. Verifica que el email no esté ya registrado.');
    }
    setInviting(false);
  };

  const getClientForUser = (email) => {
    const client = clients.find(c => c.assigned_user_email === email);
    return client?.business_name || null;
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading) return <LoadingSpinner />;

  // Check if current user is admin
  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="h-16 w-16 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
          <Shield className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Acceso Restringido</h2>
        <p className="text-slate-500">Solo los administradores pueden acceder a esta sección</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Usuarios"
        subtitle={`${users.length} usuarios registrados`}
        action={() => setShowInviteDialog(true)}
        actionLabel="Invitar Usuario"
        actionIcon={Plus}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por email o nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl border-slate-200"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-56 rounded-xl">
            <SelectValue placeholder="Filtrar por rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            <SelectItem value="admin">Administrador</SelectItem>
            <SelectItem value="staff">Asistente Administrativo</SelectItem>
            <SelectItem value="user">Cliente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Role Permissions Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(ROLES).map(([key, { label, color, permissions }]) => (
          <Card key={key} className="border-slate-200/50">
            <CardContent className="p-4">
              <Badge className={`${color} border mb-2`}>{label}</Badge>
              <p className="text-sm text-slate-600">{permissions}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="No hay usuarios"
          description="Invita usuarios para comenzar a gestionar permisos y accesos"
          action={() => setShowInviteDialog(true)}
          actionLabel="Invitar Usuario"
        />
      ) : (
        <Card className="border-slate-200/50 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead>Usuario</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Cliente Asignado</TableHead>
                  <TableHead>Fecha Registro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(user => (
                  <TableRow key={user.id} className="hover:bg-slate-50/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gradient-to-br from-[#5B7C99] to-[#4A6B85] text-white text-xs">
                            {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.full_name || 'Sin nombre'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-400" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${ROLES[user.role]?.color} border`}>
                        {ROLES[user.role]?.label || user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.role === 'user' ? (
                        getClientForUser(user.email) ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-slate-400" />
                            <span className="text-sm">{getClientForUser(user.email)}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">Sin asignar</span>
                        )
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {format(parseISO(user.created_date), "d MMM yyyy", { locale: es })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Invite User Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invitar Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Envía una invitación por email para que el usuario pueda registrarse en ContaFlow
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInviteUser} className="space-y-4">
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="usuario@ejemplo.com"
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="role">Rol *</Label>
              <Select 
                value={inviteForm.role} 
                onValueChange={(value) => setInviteForm(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="py-1">
                      <p className="font-medium">Administrador</p>
                      <p className="text-xs text-slate-500">Acceso total al sistema</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="staff">
                    <div className="py-1">
                      <p className="font-medium">Asistente Administrativo</p>
                      <p className="text-xs text-slate-500">Captura y edición de datos</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="user">
                    <div className="py-1">
                      <p className="font-medium">Cliente</p>
                      <p className="text-xs text-slate-500">Solo consulta</p>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-2">
                {ROLES[inviteForm.role]?.permissions}
              </p>
            </div>

            {inviteForm.role === 'user' && (
              <div>
                <Label htmlFor="client_id">Asignar a Cliente (opcional)</Label>
                <Select 
                  value={inviteForm.client_id} 
                  onValueChange={(value) => setInviteForm(prev => ({ ...prev, client_id: value }))}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Sin asignar</SelectItem>
                    {clients.filter(c => !c.assigned_user_email).map(client => (
                      <SelectItem key={client.id} value={client.id}>{client.business_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-2">
                  El usuario podrá ver la información de este cliente
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowInviteDialog(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={inviting}
                className="bg-gradient-to-r from-[#5B7C99] to-[#4A6B85] hover:from-[#4A6B85] hover:to-[#5B7C99]"
              >
                {inviting ? 'Enviando...' : 'Enviar Invitación'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
