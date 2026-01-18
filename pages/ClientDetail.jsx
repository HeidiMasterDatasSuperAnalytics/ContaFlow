import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  DollarSign, 
  FolderOpen, 
  ClipboardList,
  Calendar,
  ArrowLeft,
  Edit,
  TrendingUp
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import StatsCard from '@/components/dashboard/StatsCard';
import { CreditStatusBadge, CollectionStatusBadge, InvoiceStatusBadge } from '@/components/dashboard/InvoiceStatusBadge';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ClientDetail() {
  const [client, setClient] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [obligations, setObligations] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);

  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('id');

  useEffect(() => {
    if (clientId) {
      loadData();
    }
  }, [clientId]);

  const loadData = async () => {
    try {
      const [clientsData, invoicesData, documentsData, obligationsData, payrollsData] = await Promise.all([
        base44.entities.Client.filter({ id: clientId }),
        base44.entities.Invoice.filter({ client_id: clientId }, '-issue_date'),
        base44.entities.Document.filter({ client_id: clientId }, '-created_date'),
        base44.entities.TaxObligation.filter({ client_id: clientId }, '-due_date'),
        base44.entities.Payroll.filter({ client_id: clientId }, '-payment_date'),
      ]);
      
      setClient(clientsData[0]);
      setInvoices(invoicesData);
      setDocuments(documentsData);
      setObligations(obligationsData);
      setPayrolls(payrollsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  if (loading) return <LoadingSpinner />;
  if (!client) return <div className="text-center py-8">Cliente no encontrado</div>;

  const activeInvoices = invoices.filter(i => i.status === 'active');
  const totalBilled = activeInvoices.reduce((sum, i) => sum + (i.total || 0), 0);
  const pendingAmount = activeInvoices
    .filter(i => i.collection_status !== 'completed' && i.collection_status !== 'paid')
    .reduce((sum, i) => sum + (i.total || 0), 0);
  const pendingObligations = obligations.filter(o => o.status !== 'submitted').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl('Clients')}>
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">{client.business_name}</h1>
            <p className="text-slate-500">{client.rfc}</p>
          </div>
        </div>
        <Badge 
          className={client.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}
        >
          {client.status === 'active' ? 'Activo' : 'Inactivo'}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Facturado"
          value={`$${totalBilled.toLocaleString('es-MX')}`}
          subtitle={`${activeInvoices.length} facturas`}
          icon={DollarSign}
        />
        <StatsCard
          title="Pendiente de Cobro"
          value={`$${pendingAmount.toLocaleString('es-MX')}`}
          icon={FileText}
        />
        <StatsCard
          title="Documentos"
          value={documents.length}
          icon={FolderOpen}
        />
        <StatsCard
          title="Obligaciones Pendientes"
          value={pendingObligations}
          icon={ClipboardList}
          className={pendingObligations > 0 ? 'border-amber-200 bg-amber-50/50' : ''}
        />
      </div>

      {/* Client Info & Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Info Card */}
        <Card className="border-slate-200/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Información</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Régimen Fiscal</p>
              <p className="font-medium mt-1">{client.tax_regime || 'No especificado'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Uso de CFDI</p>
              <p className="font-medium mt-1">{client.cfdi_use || 'No especificado'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Días de Crédito</p>
              <p className="font-medium mt-1">{client.credit_days || 0} días</p>
            </div>
            {client.contact_emails?.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Correos</p>
                <div className="mt-1 space-y-1">
                  {client.contact_emails.map((email, i) => (
                    <p key={i} className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-slate-400" />
                      {email}
                    </p>
                  ))}
                </div>
              </div>
            )}
            {client.phone && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Teléfono</p>
                <p className="flex items-center gap-2 mt-1">
                  <Phone className="h-4 w-4 text-slate-400" />
                  {client.phone}
                </p>
              </div>
            )}
            {client.address && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Domicilio</p>
                <p className="flex items-start gap-2 mt-1">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                  <span>{client.address} {client.postal_code && `C.P. ${client.postal_code}`}</span>
                </p>
              </div>
            )}
            {client.notes && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Notas</p>
                <p className="mt-1 text-sm text-slate-600">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Card className="border-slate-200/50 lg:col-span-2">
          <Tabs defaultValue="invoices" className="w-full">
            <CardHeader className="pb-0">
              <TabsList className="bg-slate-100">
                <TabsTrigger value="invoices">Facturas</TabsTrigger>
                <TabsTrigger value="documents">Documentos</TabsTrigger>
                <TabsTrigger value="obligations">Obligaciones</TabsTrigger>
                <TabsTrigger value="payroll">Nómina</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="pt-4">
              <TabsContent value="invoices" className="m-0">
                {invoices.length === 0 ? (
                  <p className="text-center py-8 text-slate-500">No hay facturas</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Factura</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Estatus</TableHead>
                          <TableHead>Cobranza</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.slice(0, 10).map(invoice => (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                            <TableCell>{format(parseISO(invoice.issue_date), "d MMM yy", { locale: es })}</TableCell>
                            <TableCell className="text-right">${(invoice.total || 0).toLocaleString('es-MX')}</TableCell>
                            <TableCell><InvoiceStatusBadge status={invoice.status} /></TableCell>
                            <TableCell><CollectionStatusBadge status={invoice.collection_status} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="documents" className="m-0">
                {documents.length === 0 ? (
                  <p className="text-center py-8 text-slate-500">No hay documentos</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {documents.slice(0, 8).map(doc => (
                      <a 
                        key={doc.id}
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center">
                          <FileText className="h-5 w-5 text-slate-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate">{doc.name}</p>
                          <p className="text-xs text-slate-500">{doc.period} {doc.year}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="obligations" className="m-0">
                {obligations.length === 0 ? (
                  <p className="text-center py-8 text-slate-500">No hay obligaciones</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Obligación</TableHead>
                          <TableHead>Periodo</TableHead>
                          <TableHead>Vencimiento</TableHead>
                          <TableHead>Estatus</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {obligations.slice(0, 10).map(ob => (
                          <TableRow key={ob.id}>
                            <TableCell className="font-medium">{ob.name}</TableCell>
                            <TableCell>{ob.period || '-'}</TableCell>
                            <TableCell>{format(parseISO(ob.due_date), "d MMM yy", { locale: es })}</TableCell>
                            <TableCell>
                              <Badge className={
                                ob.status === 'submitted' ? 'bg-emerald-100 text-emerald-700' :
                                ob.status === 'overdue' ? 'bg-red-100 text-red-700' :
                                'bg-amber-100 text-amber-700'
                              }>
                                {ob.status === 'submitted' ? 'Presentada' : ob.status === 'overdue' ? 'Vencida' : 'Pendiente'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="payroll" className="m-0">
                {payrolls.length === 0 ? (
                  <p className="text-center py-8 text-slate-500">No hay registros de nómina</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Periodo</TableHead>
                          <TableHead>Fecha Pago</TableHead>
                          <TableHead className="text-right">Importe</TableHead>
                          <TableHead>Empleados</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payrolls.slice(0, 10).map(p => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.period}</TableCell>
                            <TableCell>{format(parseISO(p.payment_date), "d MMM yy", { locale: es })}</TableCell>
                            <TableCell className="text-right">${(p.amount || 0).toLocaleString('es-MX')}</TableCell>
                            <TableCell>{p.employees_count || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
