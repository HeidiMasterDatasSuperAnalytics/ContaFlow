import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { FileText, Search, Download, Eye, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { InvoiceStatusBadge, CollectionStatusBadge, CreditStatusBadge } from '@/components/dashboard/InvoiceStatusBadge';
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

export default function ClientInvoices() {
  const [user, setUser] = useState(null);
  const [client, setClient] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewingInvoice, setViewingInvoice] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const clients = await base44.entities.Client.filter({ assigned_user_email: userData.email });
      
      if (clients.length > 0) {
        const clientData = clients[0];
        setClient(clientData);

        const invoicesData = await base44.entities.Invoice.filter({ client_id: clientData.id }, '-issue_date');
        setInvoices(invoicesData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  if (loading) return <LoadingSpinner />;

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <AlertTriangle className="h-8 w-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">No tienes un perfil de cliente asignado</h2>
        <p className="text-slate-500 text-center max-w-md">
          Contacta al administrador para ver tu información.
        </p>
      </div>
    );
  }

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesStatus = true;
    if (statusFilter === 'pending') {
      matchesStatus = invoice.status === 'active' && 
        invoice.collection_status !== 'completed' && invoice.collection_status !== 'paid';
    } else if (statusFilter === 'paid') {
      matchesStatus = invoice.collection_status === 'completed' || invoice.collection_status === 'paid';
    }
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis Facturas"
        subtitle={`${invoices.length} facturas registradas`}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por número..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl border-slate-200"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 rounded-xl">
            <SelectValue placeholder="Estatus" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="paid">Pagadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoices Table */}
      {filteredInvoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No hay facturas"
          description="Tus facturas aparecerán aquí"
        />
      ) : (
        <Card className="border-slate-200/50 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead>Factura</TableHead>
                  <TableHead>Fecha Emisión</TableHead>
                  <TableHead>Fecha Vencimiento</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estatus</TableHead>
                  <TableHead>Crédito</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map(invoice => (
                  <TableRow key={invoice.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{format(parseISO(invoice.issue_date), "d MMM yyyy", { locale: es })}</TableCell>
                    <TableCell>
                      {invoice.due_date ? format(parseISO(invoice.due_date), "d MMM yyyy", { locale: es }) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${(invoice.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell><CollectionStatusBadge status={invoice.collection_status} /></TableCell>
                    <TableCell>
                      <CreditStatusBadge 
                        dueDate={invoice.due_date} 
                        isPaid={invoice.collection_status === 'completed' || invoice.collection_status === 'paid'}
                      />
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setViewingInvoice(invoice)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Invoice Detail Dialog */}
      <Dialog open={!!viewingInvoice} onOpenChange={() => setViewingInvoice(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de Factura</DialogTitle>
          </DialogHeader>
          {viewingInvoice && (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold">{viewingInvoice.invoice_number}</h3>
                  <p className="text-slate-500">
                    {format(parseISO(viewingInvoice.issue_date), "d 'de' MMMM yyyy", { locale: es })}
                  </p>
                </div>
                <InvoiceStatusBadge status={viewingInvoice.status} />
              </div>

              <div className="border rounded-xl divide-y">
                <div className="flex justify-between p-3">
                  <span className="text-slate-600">Subtotal</span>
                  <span>${(viewingInvoice.subtotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-slate-600">IVA</span>
                  <span>${(viewingInvoice.iva || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                </div>
                {(viewingInvoice.isr_retention > 0 || viewingInvoice.iva_retention > 0) && (
                  <>
                    <div className="flex justify-between p-3">
                      <span className="text-slate-600">Retención ISR</span>
                      <span className="text-red-600">-${(viewingInvoice.isr_retention || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between p-3">
                      <span className="text-slate-600">Retención IVA</span>
                      <span className="text-red-600">-${(viewingInvoice.iva_retention || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between p-3 bg-slate-50">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold">${(viewingInvoice.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-sm text-slate-500">Estado de pago</p>
                  <CollectionStatusBadge status={viewingInvoice.collection_status} />
                </div>
                {viewingInvoice.due_date && (
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Fecha límite</p>
                    <p className="font-medium">{format(parseISO(viewingInvoice.due_date), "d MMM yyyy", { locale: es })}</p>
                  </div>
                )}
              </div>

              {viewingInvoice.service_description && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Descripción</p>
                  <p className="text-slate-700">{viewingInvoice.service_description}</p>
                </div>
              )}

              {viewingInvoice.file_url && (
                <a 
                  href={viewingInvoice.file_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-[#5B7C99] to-[#4A6B85] text-white rounded-xl hover:from-[#4A6B85] hover:to-[#5B7C99] transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Descargar Factura
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
