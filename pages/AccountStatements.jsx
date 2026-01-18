import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { DollarSign, Search, Download, Filter, AlertTriangle, Clock, CheckCircle2, FileText } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import PageHeader from '@/components/shared/PageHeader';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { CreditStatusBadge, CollectionStatusBadge } from '@/components/dashboard/InvoiceStatusBadge';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AccountStatements() {
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [clientsData, invoicesData] = await Promise.all([
        base44.entities.Client.list(),
        base44.entities.Invoice.list('-issue_date')
      ]);
      setClients(clientsData);
      setInvoices(invoicesData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.business_name || 'Cliente no encontrado';
  };

  const now = new Date();

  const filteredInvoices = invoices.filter(invoice => {
    if (invoice.status !== 'active') return false;
    const matchesClient = selectedClient === 'all' || invoice.client_id === selectedClient;
    
    let matchesStatus = true;
    if (statusFilter === 'pending') {
      matchesStatus = invoice.collection_status !== 'completed' && invoice.collection_status !== 'paid';
    } else if (statusFilter === 'paid_no_proof') {
      matchesStatus = invoice.collection_status === 'paid' && !invoice.payment_proof_received;
    } else if (statusFilter === 'pending_complement') {
      matchesStatus = invoice.payment_proof_received && !invoice.payment_complement_generated;
    } else if (statusFilter === 'overdue') {
      if (!invoice.due_date) return false;
      const isPending = invoice.collection_status !== 'completed' && invoice.collection_status !== 'paid';
      matchesStatus = isPending && new Date(invoice.due_date) < now;
    }

    let matchesDate = true;
    if (dateFrom) {
      matchesDate = matchesDate && new Date(invoice.issue_date) >= new Date(dateFrom);
    }
    if (dateTo) {
      matchesDate = matchesDate && new Date(invoice.issue_date) <= new Date(dateTo);
    }

    return matchesClient && matchesStatus && matchesDate;
  });

  // Summary calculations
  const totalPending = filteredInvoices
    .filter(i => i.collection_status !== 'completed' && i.collection_status !== 'paid')
    .reduce((sum, i) => sum + (i.total || 0), 0);
  
  const totalOverdue = filteredInvoices
    .filter(i => {
      if (!i.due_date) return false;
      const isPending = i.collection_status !== 'completed' && i.collection_status !== 'paid';
      return isPending && new Date(i.due_date) < now;
    })
    .reduce((sum, i) => sum + (i.total || 0), 0);

  const totalPaid = filteredInvoices
    .filter(i => i.collection_status === 'completed' || i.collection_status === 'paid')
    .reduce((sum, i) => sum + (i.total || 0), 0);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estados de Cuenta"
        subtitle="Control de facturas y cobranza por cliente"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Pendiente de Cobro</p>
                <p className="text-xl font-bold text-slate-900">
                  ${totalPending.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
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
                <p className="text-sm text-red-600">Vencido</p>
                <p className="text-xl font-bold text-red-700">
                  ${totalOverdue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-emerald-600">Cobrado</p>
                <p className="text-xl font-bold text-emerald-700">
                  ${totalPaid.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
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
            {clients.filter(c => c.status === 'active').map(client => (
              <SelectItem key={client.id} value={client.id}>{client.business_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-56 rounded-xl">
            <SelectValue placeholder="Filtrar por estatus" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estatus</SelectItem>
            <SelectItem value="pending">Pendientes de pago</SelectItem>
            <SelectItem value="paid_no_proof">Pagadas sin comprobante</SelectItem>
            <SelectItem value="pending_complement">Pendientes de complemento</SelectItem>
            <SelectItem value="overdue">Vencidas</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40 rounded-xl"
            placeholder="Desde"
          />
          <span className="text-slate-400">-</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40 rounded-xl"
            placeholder="Hasta"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <Card className="border-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead>Factura</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha Emisión</TableHead>
                <TableHead>Fecha Vencimiento</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado Cobranza</TableHead>
                <TableHead>Crédito</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    No se encontraron facturas con los filtros seleccionados
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map(invoice => (
                  <TableRow key={invoice.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{getClientName(invoice.client_id)}</TableCell>
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Totals Footer */}
      {filteredInvoices.length > 0 && (
        <div className="flex justify-end">
          <div className="bg-slate-900 text-white rounded-xl px-6 py-4">
            <p className="text-sm text-slate-300">Total Mostrado</p>
            <p className="text-2xl font-bold">
              ${filteredInvoices.reduce((sum, i) => sum + (i.total || 0), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-slate-400">{filteredInvoices.length} facturas</p>
          </div>
        </div>
      )}
    </div>
  );
}
