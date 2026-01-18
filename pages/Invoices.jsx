import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { FileText, Plus, Search, Filter, Download, MoreHorizontal, Edit, Trash2, Eye, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { InvoiceStatusBadge, CollectionStatusBadge, CreditStatusBadge } from '@/components/dashboard/InvoiceStatusBadge';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import InvoiceForm from '@/components/invoices/InvoiceForm';
import InvoiceDetail from '@/components/invoices/InvoiceDetail';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [deleteInvoice, setDeleteInvoice] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [invoicesData, clientsData] = await Promise.all([
        base44.entities.Invoice.list('-issue_date'),
        base44.entities.Client.list()
      ]);
      setInvoices(invoicesData);
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const handleSave = async (invoiceData) => {
    const user = await base44.auth.me();
    
    if (editingInvoice) {
      await base44.entities.Invoice.update(editingInvoice.id, invoiceData);
      
      // Create audit log
      await base44.entities.InvoiceAudit.create({
        invoice_id: editingInvoice.id,
        action_type: 'updated',
        user_email: user.email,
      });
      
      // If status changed to cancelled, log it
      if (invoiceData.status === 'cancelled' && editingInvoice.status !== 'cancelled') {
        await base44.entities.InvoiceAudit.create({
          invoice_id: editingInvoice.id,
          action_type: 'cancelled',
          user_email: user.email,
          cancellation_reason: invoiceData.cancellation_reason
        });
        
        await base44.entities.ActivityLog.create({
          client_id: invoiceData.client_id,
          action_type: 'invoice_cancelled',
          description: `Factura ${invoiceData.invoice_number} cancelada: ${invoiceData.cancellation_reason}`,
          reference_id: editingInvoice.id,
          reference_type: 'invoice',
          user_email: user.email
        });
      }
      
      await base44.entities.ActivityLog.create({
        client_id: invoiceData.client_id,
        action_type: 'status_changed',
        description: `Factura ${invoiceData.invoice_number} actualizada`,
        reference_id: editingInvoice.id,
        reference_type: 'invoice',
        user_email: user.email
      });
    } else {
      const newInvoice = await base44.entities.Invoice.create(invoiceData);
      
      await base44.entities.InvoiceAudit.create({
        invoice_id: newInvoice.id,
        action_type: 'created',
        user_email: user.email,
      });
      
      await base44.entities.ActivityLog.create({
        client_id: invoiceData.client_id,
        action_type: 'invoice_created',
        description: `Factura ${invoiceData.invoice_number} creada por $${invoiceData.total?.toLocaleString('es-MX')}`,
        reference_id: newInvoice.id,
        reference_type: 'invoice',
        user_email: user.email
      });
    }
    setShowForm(false);
    setEditingInvoice(null);
    loadData();
  };

  const handleDelete = async () => {
    if (deleteInvoice) {
      await base44.entities.Invoice.delete(deleteInvoice.id);
      setDeleteInvoice(null);
      loadData();
    }
  };

  const handleStatusChange = async (invoice, newStatus) => {
    let reason = null;
    
    if (newStatus === 'cancelled') {
      reason = prompt('Ingresa el motivo de cancelación:');
      if (!reason) return; // User cancelled
    }
    
    const user = await base44.auth.me();
    
    await base44.entities.Invoice.update(invoice.id, { 
      status: newStatus,
      last_updated_by: user.email,
      last_updated_date: new Date().toISOString()
    });
    
    await base44.entities.InvoiceAudit.create({
      invoice_id: invoice.id,
      action_type: newStatus === 'cancelled' ? 'cancelled' : 'status_changed',
      field_changed: 'status',
      old_value: invoice.status,
      new_value: newStatus,
      user_email: user.email,
      cancellation_reason: reason
    });
    
    await base44.entities.ActivityLog.create({
      client_id: invoice.client_id,
      action_type: newStatus === 'cancelled' ? 'invoice_cancelled' : 'invoice_refactured',
      description: `Factura ${invoice.invoice_number} ${newStatus === 'cancelled' ? 'cancelada' : 'refacturada'}${reason ? ': ' + reason : ''}`,
      reference_id: invoice.id,
      reference_type: 'invoice',
      user_email: user.email
    });
    loadData();
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.business_name || 'Cliente no encontrado';
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getClientName(invoice.client_id).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    const matchesClient = clientFilter === 'all' || invoice.client_id === clientFilter;
    return matchesSearch && matchesStatus && matchesClient;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Facturación"
        subtitle={`${invoices.length} facturas registradas`}
        action={() => setShowForm(true)}
        actionLabel="Nueva Factura"
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por número o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl border-slate-200"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 rounded-xl">
            <SelectValue placeholder="Estatus" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activas</SelectItem>
            <SelectItem value="cancelled">Canceladas</SelectItem>
            <SelectItem value="refactured">Refacturadas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-48 rounded-xl">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los clientes</SelectItem>
            {clients.map(client => (
              <SelectItem key={client.id} value={client.id}>{client.business_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Invoices Table */}
      {filteredInvoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No hay facturas"
          description="Comienza registrando tu primera factura"
          action={() => setShowForm(true)}
          actionLabel="Nueva Factura"
        />
      ) : (
        <Card className="border-slate-200/50 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead>Factura</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estatus</TableHead>
                  <TableHead>Cobranza</TableHead>
                  <TableHead>Crédito</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map(invoice => (
                  <TableRow 
                    key={invoice.id} 
                    className="hover:bg-slate-50/50 cursor-pointer"
                    onClick={() => setViewingInvoice(invoice)}
                  >
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{getClientName(invoice.client_id)}</TableCell>
                    <TableCell>{format(parseISO(invoice.issue_date), "d MMM yyyy", { locale: es })}</TableCell>
                    <TableCell className="text-right font-semibold">
                      ${(invoice.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell><InvoiceStatusBadge status={invoice.status} /></TableCell>
                    <TableCell><CollectionStatusBadge status={invoice.collection_status} /></TableCell>
                    <TableCell>
                      <CreditStatusBadge 
                        dueDate={invoice.due_date} 
                        isPaid={invoice.collection_status === 'completed' || invoice.collection_status === 'paid'}
                      />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setViewingInvoice(invoice); }}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalle
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingInvoice(invoice); setShowForm(true); }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          {invoice.status === 'active' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(invoice, 'cancelled'); }}>
                                Cancelar Factura
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(invoice, 'refactured'); }}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Marcar como Refacturada
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => { e.stopPropagation(); setDeleteInvoice(invoice); }}
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

      {/* Invoice Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) setEditingInvoice(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingInvoice ? 'Editar Factura' : 'Nueva Factura'}</DialogTitle>
          </DialogHeader>
          <InvoiceForm
            invoice={editingInvoice}
            clients={clients}
            invoices={invoices}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingInvoice(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Invoice Detail Dialog */}
      <Dialog open={!!viewingInvoice} onOpenChange={() => setViewingInvoice(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Factura</DialogTitle>
          </DialogHeader>
          {viewingInvoice && (
            <InvoiceDetail 
              invoice={viewingInvoice} 
              client={clients.find(c => c.id === viewingInvoice.client_id)}
              onUpdate={loadData}
              onClose={() => setViewingInvoice(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteInvoice} onOpenChange={() => setDeleteInvoice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar factura?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la factura "{deleteInvoice?.invoice_number}".
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
