import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ClipboardList, Plus, Search, Check, Clock, AlertTriangle, MoreHorizontal, Edit, Trash2, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const OBLIGATION_TYPES = {
  monthly_isr: 'ISR Mensual',
  monthly_iva: 'IVA Mensual',
  monthly_diot: 'DIOT',
  annual_declaration: 'Declaración Anual',
  informative_declaration: 'Declaración Informativa',
  employer_contributions: 'Aportaciones Patronales',
  state_tax: 'Impuesto Estatal',
  other: 'Otro',
};

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  submitted: { label: 'Presentada', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: Check },
  overdue: { label: 'Vencida', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle },
};

export default function TaxObligations() {
  const [obligations, setObligations] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingObligation, setEditingObligation] = useState(null);
  const [deleteObligation, setDeleteObligation] = useState(null);
  const [selectedClient, setSelectedClient] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [formData, setFormData] = useState({
    client_id: '',
    obligation_type: 'monthly_isr',
    name: '',
    due_date: '',
    period: '',
    status: 'pending',
    submission_date: '',
    amount: 0,
    notes: '',
    file: null,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [obligationsData, clientsData] = await Promise.all([
        base44.entities.TaxObligation.list('-due_date'),
        base44.entities.Client.list()
      ]);
      setObligations(obligationsData);
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
      let file_url = editingObligation?.file_url;
      if (formData.file) {
        const result = await base44.integrations.Core.UploadFile({ file: formData.file });
        file_url = result.file_url;
      }

      const data = {
        client_id: formData.client_id,
        obligation_type: formData.obligation_type,
        name: formData.name,
        due_date: formData.due_date,
        period: formData.period,
        status: formData.status,
        submission_date: formData.submission_date || null,
        amount: parseFloat(formData.amount) || 0,
        notes: formData.notes,
        file_url,
      };

      if (editingObligation) {
        await base44.entities.TaxObligation.update(editingObligation.id, data);
      } else {
        await base44.entities.TaxObligation.create(data);
      }

      if (formData.status === 'submitted' && (!editingObligation || editingObligation.status !== 'submitted')) {
        await base44.entities.ActivityLog.create({
          client_id: data.client_id,
          action_type: 'obligation_submitted',
          description: `Obligación presentada: ${data.name}`,
          reference_type: 'obligation'
        });
      }

      setShowForm(false);
      setEditingObligation(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving obligation:', error);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (deleteObligation) {
      await base44.entities.TaxObligation.delete(deleteObligation.id);
      setDeleteObligation(null);
      loadData();
    }
  };

  const handleMarkSubmitted = async (obligation) => {
    await base44.entities.TaxObligation.update(obligation.id, {
      status: 'submitted',
      submission_date: format(new Date(), 'yyyy-MM-dd')
    });
    await base44.entities.ActivityLog.create({
      client_id: obligation.client_id,
      action_type: 'obligation_submitted',
      description: `Obligación presentada: ${obligation.name}`,
      reference_type: 'obligation'
    });
    loadData();
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      obligation_type: 'monthly_isr',
      name: '',
      due_date: '',
      period: '',
      status: 'pending',
      submission_date: '',
      amount: 0,
      notes: '',
      file: null,
    });
  };

  const openEditForm = (obligation) => {
    setEditingObligation(obligation);
    setFormData({
      client_id: obligation.client_id,
      obligation_type: obligation.obligation_type,
      name: obligation.name,
      due_date: obligation.due_date,
      period: obligation.period || '',
      status: obligation.status,
      submission_date: obligation.submission_date || '',
      amount: obligation.amount || 0,
      notes: obligation.notes || '',
      file: null,
    });
    setShowForm(true);
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.business_name || 'Cliente no encontrado';
  };

  const filteredObligations = obligations.filter(o => {
    const matchesClient = selectedClient === 'all' || o.client_id === selectedClient;
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesClient && matchesStatus;
  });

  // Summary
  const pendingCount = obligations.filter(o => o.status === 'pending').length;
  const overdueCount = obligations.filter(o => o.status === 'overdue').length;
  const submittedCount = obligations.filter(o => o.status === 'submitted').length;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Obligaciones Fiscales"
        subtitle="Control de obligaciones por cliente"
        action={() => { resetForm(); setShowForm(true); }}
        actionLabel="Nueva Obligación"
      />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-amber-600">Pendientes</p>
                <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-red-600">Vencidas</p>
                <p className="text-2xl font-bold text-red-700">{overdueCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Check className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-emerald-600">Presentadas</p>
                <p className="text-2xl font-bold text-emerald-700">{submittedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 rounded-xl">
            <SelectValue placeholder="Estatus" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="overdue">Vencidas</SelectItem>
            <SelectItem value="submitted">Presentadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Obligations Table */}
      {filteredObligations.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No hay obligaciones registradas"
          description="Comienza registrando las obligaciones fiscales de tus clientes"
          action={() => setShowForm(true)}
          actionLabel="Nueva Obligación"
        />
      ) : (
        <Card className="border-slate-200/50 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead>Cliente</TableHead>
                  <TableHead>Obligación</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estatus</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredObligations.map(obligation => {
                  const StatusIcon = STATUS_CONFIG[obligation.status]?.icon || Clock;
                  return (
                    <TableRow key={obligation.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-medium">{getClientName(obligation.client_id)}</TableCell>
                      <TableCell>{obligation.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-slate-100">
                          {OBLIGATION_TYPES[obligation.obligation_type] || obligation.obligation_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{obligation.period || '-'}</TableCell>
                      <TableCell>{format(parseISO(obligation.due_date), "d MMM yyyy", { locale: es })}</TableCell>
                      <TableCell>
                        <Badge className={`${STATUS_CONFIG[obligation.status]?.color} border`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {STATUS_CONFIG[obligation.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {obligation.status !== 'submitted' && (
                              <DropdownMenuItem onClick={() => handleMarkSubmitted(obligation)}>
                                <Check className="h-4 w-4 mr-2" />
                                Marcar como Presentada
                              </DropdownMenuItem>
                            )}
                            {obligation.file_url && (
                              <DropdownMenuItem asChild>
                                <a href={obligation.file_url} target="_blank" rel="noopener noreferrer">
                                  <FileText className="h-4 w-4 mr-2" />
                                  Ver Acuse
                                </a>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => openEditForm(obligation)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => setDeleteObligation(obligation)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) setEditingObligation(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingObligation ? 'Editar Obligación' : 'Nueva Obligación'}</DialogTitle>
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
              <Label htmlFor="obligation_type">Tipo de Obligación</Label>
              <Select 
                value={formData.obligation_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, obligation_type: value }))}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(OBLIGATION_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="name">Nombre de la Obligación *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                className="mt-1.5"
                placeholder="Ej: ISR Enero 2025"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="period">Periodo</Label>
                <Input
                  id="period"
                  value={formData.period}
                  onChange={(e) => setFormData(prev => ({ ...prev, period: e.target.value }))}
                  placeholder="Ej: Enero 2025"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="due_date">Fecha de Vencimiento *</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  required
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Estatus</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="submitted">Presentada</SelectItem>
                    <SelectItem value="overdue">Vencida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="amount">Monto (si aplica)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
            </div>

            {formData.status === 'submitted' && (
              <div>
                <Label htmlFor="submission_date">Fecha de Presentación</Label>
                <Input
                  id="submission_date"
                  type="date"
                  value={formData.submission_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, submission_date: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
            )}

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
              <Label htmlFor="file">Acuse</Label>
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
                {saving ? 'Guardando...' : (editingObligation ? 'Actualizar' : 'Crear')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteObligation} onOpenChange={() => setDeleteObligation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar obligación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará "{deleteObligation?.name}".
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
