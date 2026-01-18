import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ClipboardList, Plus, Search, Calendar, DollarSign, Users, FileText, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
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
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

const PERIOD_TYPES = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
};

export default function Payroll() {
  const [payrolls, setPayrolls] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState(null);
  const [deletePayroll, setDeletePayroll] = useState(null);
  const [selectedClient, setSelectedClient] = useState('all');

  const [formData, setFormData] = useState({
    client_id: '',
    period: '',
    period_type: 'biweekly',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    amount: 0,
    employees_count: 0,
    notes: '',
    file: null,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [payrollsData, clientsData] = await Promise.all([
        base44.entities.Payroll.list('-payment_date'),
        base44.entities.Client.list()
      ]);
      setPayrolls(payrollsData);
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      let file_url = editingPayroll?.file_url;
      if (formData.file) {
        const result = await base44.integrations.Core.UploadFile({ file: formData.file });
        file_url = result.file_url;
      }

      const data = {
        client_id: formData.client_id,
        period: formData.period,
        period_type: formData.period_type,
        payment_date: formData.payment_date,
        amount: parseFloat(formData.amount),
        employees_count: parseInt(formData.employees_count) || 0,
        notes: formData.notes,
        file_url,
      };

      if (editingPayroll) {
        await base44.entities.Payroll.update(editingPayroll.id, data);
      } else {
        await base44.entities.Payroll.create(data);
        await base44.entities.ActivityLog.create({
          client_id: data.client_id,
          action_type: 'payroll_registered',
          description: `Nómina registrada: ${data.period} - $${data.amount.toLocaleString('es-MX')}`,
          reference_type: 'payroll'
        });
      }

      setShowForm(false);
      setEditingPayroll(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving payroll:', error);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (deletePayroll) {
      await base44.entities.Payroll.delete(deletePayroll.id);
      setDeletePayroll(null);
      loadData();
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      period: '',
      period_type: 'biweekly',
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      amount: 0,
      employees_count: 0,
      notes: '',
      file: null,
    });
  };

  const openEditForm = (payroll) => {
    setEditingPayroll(payroll);
    setFormData({
      client_id: payroll.client_id,
      period: payroll.period,
      period_type: payroll.period_type,
      payment_date: payroll.payment_date,
      amount: payroll.amount,
      employees_count: payroll.employees_count || 0,
      notes: payroll.notes || '',
      file: null,
    });
    setShowForm(true);
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.business_name || 'Cliente no encontrado';
  };

  const filteredPayrolls = payrolls.filter(p => 
    selectedClient === 'all' || p.client_id === selectedClient
  );

  // Summary
  const totalAmount = filteredPayrolls.reduce((sum, p) => sum + (p.amount || 0), 0);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nómina"
        subtitle="Historial de pagos de nómina por cliente"
        action={() => { resetForm(); setShowForm(true); }}
        actionLabel="Registrar Nómina"
      />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Registros</p>
                <p className="text-xl font-bold text-slate-900">{filteredPayrolls.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Pagado</p>
                <p className="text-xl font-bold text-slate-900">
                  ${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Clientes Activos</p>
                <p className="text-xl font-bold text-slate-900">
                  {new Set(payrolls.map(p => p.client_id)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Select value={selectedClient} onValueChange={setSelectedClient}>
        <SelectTrigger className="w-56 rounded-xl">
          <SelectValue placeholder="Seleccionar cliente" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los clientes</SelectItem>
          {clients.map(client => (
            <SelectItem key={client.id} value={client.id}>{client.business_name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Payrolls Table */}
      {filteredPayrolls.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No hay registros de nómina"
          description="Comienza registrando el primer pago de nómina"
          action={() => setShowForm(true)}
          actionLabel="Registrar Nómina"
        />
      ) : (
        <Card className="border-slate-200/50 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead>Cliente</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha Pago</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead>Empleados</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayrolls.map(payroll => (
                  <TableRow key={payroll.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium">{getClientName(payroll.client_id)}</TableCell>
                    <TableCell>{payroll.period}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-slate-100">
                        {PERIOD_TYPES[payroll.period_type] || payroll.period_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(parseISO(payroll.payment_date), "d MMM yyyy", { locale: es })}</TableCell>
                    <TableCell className="text-right font-semibold">
                      ${(payroll.amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{payroll.employees_count || '-'}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {payroll.file_url && (
                            <DropdownMenuItem asChild>
                              <a href={payroll.file_url} target="_blank" rel="noopener noreferrer">
                                <FileText className="h-4 w-4 mr-2" />
                                Ver Comprobante
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => openEditForm(payroll)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setDeletePayroll(payroll)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) setEditingPayroll(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPayroll ? 'Editar Nómina' : 'Registrar Nómina'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="client_id">Cliente *</Label>
              <Select 
                value={formData.client_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.filter(c => c.status === 'active').map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.business_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="period">Periodo *</Label>
              <Input
                id="period"
                value={formData.period}
                onChange={(e) => setFormData(prev => ({ ...prev, period: e.target.value }))}
                placeholder="Ej: Quincena 1 Enero 2025"
                required
                className="mt-1.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="period_type">Tipo</Label>
                <Select 
                  value={formData.period_type} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, period_type: value }))}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PERIOD_TYPES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="payment_date">Fecha de Pago *</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                  required
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Importe *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  required
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="employees_count">No. Empleados</Label>
                <Input
                  id="employees_count"
                  type="number"
                  min="0"
                  value={formData.employees_count}
                  onChange={(e) => setFormData(prev => ({ ...prev, employees_count: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="mt-1.5"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="file">Comprobante</Label>
              <Input
                id="file"
                type="file"
                onChange={(e) => setFormData(prev => ({ ...prev, file: e.target.files[0] }))}
                className="mt-1.5"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-gradient-to-r from-[#5B7C99] to-[#4A6B85] hover:from-[#4A6B85] hover:to-[#5B7C99]">
                {saving ? 'Guardando...' : (editingPayroll ? 'Actualizar' : 'Registrar')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletePayroll} onOpenChange={() => setDeletePayroll(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el registro de nómina "{deletePayroll?.period}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
