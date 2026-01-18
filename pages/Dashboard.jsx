import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  FileText, 
  Users, 
  DollarSign, 
  AlertTriangle, 
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Calendar
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import StatsCard from '@/components/dashboard/StatsCard';
import { CreditStatusBadge, CollectionStatusBadge } from '@/components/dashboard/InvoiceStatusBadge';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [obligations, setObligations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [clientsData, invoicesData, obligationsData] = await Promise.all([
        base44.entities.Client.list(),
        base44.entities.Invoice.list('-issue_date', 100),
        base44.entities.TaxObligation.list('-due_date', 50)
      ]);
      setClients(clientsData);
      setInvoices(invoicesData);
      setObligations(obligationsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  if (loading) return <LoadingSpinner />;

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Stats calculations
  const activeInvoices = invoices.filter(i => i.status === 'active');
  const monthInvoices = activeInvoices.filter(i => 
    isWithinInterval(parseISO(i.issue_date), { start: monthStart, end: monthEnd })
  );
  const totalMonthBilled = monthInvoices.reduce((sum, i) => sum + (i.total || 0), 0);
  const paidInvoices = activeInvoices.filter(i => i.collection_status === 'completed' || i.collection_status === 'paid');
  const pendingInvoices = activeInvoices.filter(i => 
    i.collection_status !== 'completed' && i.collection_status !== 'paid'
  );
  const overdueInvoices = pendingInvoices.filter(i => {
    if (!i.due_date) return false;
    return new Date(i.due_date) < now;
  });

  const upcomingObligations = obligations.filter(o => {
    if (o.status === 'submitted') return false;
    const dueDate = new Date(o.due_date);
    const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  });

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.business_name || 'Cliente no encontrado';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-slate-500 mt-1">Resumen general de tu gestión fiscal</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatsCard
          title="Facturación del Mes"
          value={`$${totalMonthBilled.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
          subtitle={`${monthInvoices.length} facturas`}
          icon={DollarSign}
        />
        <StatsCard
          title="Clientes Activos"
          value={clients.filter(c => c.status === 'active').length}
          subtitle={`${clients.length} total`}
          icon={Users}
        />
        <StatsCard
          title="Facturas Pendientes"
          value={pendingInvoices.length}
          subtitle={`$${pendingInvoices.reduce((s, i) => s + (i.total || 0), 0).toLocaleString('es-MX')}`}
          icon={Clock}
        />
        <StatsCard
          title="Facturas Vencidas"
          value={overdueInvoices.length}
          subtitle={overdueInvoices.length > 0 ? 'Requieren atención' : 'Todo al día'}
          icon={AlertTriangle}
          className={overdueInvoices.length > 0 ? 'border-red-200 bg-red-50/50' : ''}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <Card className="border-slate-200/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Últimas Facturas</CardTitle>
            <Link to={createPageUrl('Invoices')}>
              <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900">
                Ver todas <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {invoices.slice(0, 5).map(invoice => (
                <div key={invoice.id} className="px-6 py-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 truncate">{invoice.invoice_number}</p>
                      <p className="text-sm text-slate-500 truncate">{getClientName(invoice.client_id)}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-semibold text-slate-900">
                        ${(invoice.total || 0).toLocaleString('es-MX')}
                      </p>
                      <CreditStatusBadge 
                        dueDate={invoice.due_date} 
                        isPaid={invoice.collection_status === 'completed' || invoice.collection_status === 'paid'}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {invoices.length === 0 && (
                <div className="px-6 py-8 text-center text-slate-500">
                  No hay facturas registradas
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Obligations */}
        <Card className="border-slate-200/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Obligaciones Próximas</CardTitle>
            <Link to={createPageUrl('TaxObligations')}>
              <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900">
                Ver todas <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {upcomingObligations.slice(0, 5).map(obligation => (
                <div key={obligation.id} className="px-6 py-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 truncate">{obligation.name}</p>
                      <p className="text-sm text-slate-500 truncate">{getClientName(obligation.client_id)}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm font-medium text-amber-600">
                        {format(parseISO(obligation.due_date), "d MMM", { locale: es })}
                      </p>
                      <p className="text-xs text-slate-500">{obligation.period}</p>
                    </div>
                  </div>
                </div>
              ))}
              {upcomingObligations.length === 0 && (
                <div className="px-6 py-8 text-center text-slate-500">
                  No hay obligaciones próximas a vencer
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Invoices Alert */}
      {overdueInvoices.length > 0 && (
        <Card className="border-red-200 bg-red-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Facturas Vencidas que Requieren Atención
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {overdueInvoices.slice(0, 6).map(invoice => {
                const daysOverdue = Math.ceil((now - new Date(invoice.due_date)) / (1000 * 60 * 60 * 24));
                return (
                  <div key={invoice.id} className="bg-white rounded-xl p-4 border border-red-100">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-medium text-slate-900">{invoice.invoice_number}</p>
                      <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded-full">
                        +{daysOverdue}d
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 truncate">{getClientName(invoice.client_id)}</p>
                    <p className="text-lg font-semibold text-slate-900 mt-2">
                      ${(invoice.total || 0).toLocaleString('es-MX')}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
