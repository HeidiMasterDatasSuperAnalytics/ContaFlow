import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  FileText, 
  DollarSign, 
  FolderOpen, 
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StatsCard from '@/components/dashboard/StatsCard';
import { CreditStatusBadge, CollectionStatusBadge } from '@/components/dashboard/InvoiceStatusBadge';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ClientDashboard() {
  const [user, setUser] = useState(null);
  const [client, setClient] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      // Find client by assigned_user_email
      const clients = await base44.entities.Client.filter({ assigned_user_email: userData.email });
      
      if (clients.length > 0) {
        const clientData = clients[0];
        setClient(clientData);

        const [invoicesData, documentsData] = await Promise.all([
          base44.entities.Invoice.filter({ client_id: clientData.id }, '-issue_date'),
          base44.entities.Document.filter({ client_id: clientData.id }, '-created_date'),
        ]);
        
        setInvoices(invoicesData);
        setDocuments(documentsData);
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
          Contacta al administrador para que te asigne un perfil de cliente y puedas ver tu información.
        </p>
      </div>
    );
  }

  const now = new Date();
  const activeInvoices = invoices.filter(i => i.status === 'active');
  const totalBilled = activeInvoices.reduce((sum, i) => sum + (i.total || 0), 0);
  const pendingInvoices = activeInvoices.filter(i => 
    i.collection_status !== 'completed' && i.collection_status !== 'paid'
  );
  const pendingAmount = pendingInvoices.reduce((sum, i) => sum + (i.total || 0), 0);
  const paidAmount = activeInvoices
    .filter(i => i.collection_status === 'completed' || i.collection_status === 'paid')
    .reduce((sum, i) => sum + (i.total || 0), 0);

  return (
    <div className="space-y-8">
      {/* Welcome Message */}
      <Card className="border-[#5B7C99]/20 bg-gradient-to-br from-white to-[#F8F9FC]">
        <CardContent className="p-6 lg:p-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-3">
            Bienvenido a ContaFlow
          </h1>
          <p className="text-slate-700 mb-4">
            ContaFlow es una plataforma diseñada para centralizar y simplificar la gestión administrativa y fiscal de tu empresa en un solo lugar.
          </p>
          <div className="space-y-2 text-slate-600">
            <p className="font-medium text-slate-900">A través de esta aplicación podrás:</p>
            <ul className="space-y-1.5 ml-5 list-disc">
              <li>Consultar tus facturas emitidas y su estatus</li>
              <li>Visualizar estados de cuenta actualizados</li>
              <li>Descargar documentos importantes como opiniones de cumplimiento y declaraciones</li>
              <li>Dar seguimiento a pagos, complementos y vencimientos</li>
              <li>Mantener comunicación directa mediante el chat interno</li>
            </ul>
          </div>
          <div className="mt-4 p-4 bg-[#5B7C99]/5 rounded-xl border border-[#5B7C99]/10">
            <p className="text-sm text-slate-700">
              Toda la información que se muestra en ContaFlow es de <strong>consulta únicamente</strong>, 
              garantizando la integridad de tus datos y un control adecuado de los procesos administrativos.
            </p>
          </div>
          <p className="text-slate-700 mt-4">
            Nuestro objetivo es brindarte <strong>claridad, control y transparencia</strong>, facilitando el 
            seguimiento de tu información fiscal y administrativa de manera ordenada y segura.
          </p>
          <p className="text-sm text-slate-600 mt-4 italic">
            Si tienes alguna duda o necesitas apoyo, puedes comunicarte directamente a través del chat dentro de la plataforma.
          </p>
          <p className="text-sm text-slate-500 mt-2">
            Gracias por confiar en ContaFlow.
          </p>
        </CardContent>
      </Card>

      {/* Client Info */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          {client.business_name}
        </h2>
        <p className="text-slate-500">Resumen de tu cuenta</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatsCard
          title="Total Facturado"
          value={`$${totalBilled.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
          subtitle={`${activeInvoices.length} facturas`}
          icon={DollarSign}
        />
        <StatsCard
          title="Pendiente de Pago"
          value={`$${pendingAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
          subtitle={`${pendingInvoices.length} facturas`}
          icon={Clock}
          className={pendingInvoices.length > 0 ? 'border-amber-200 bg-amber-50/50' : ''}
        />
        <StatsCard
          title="Pagado"
          value={`$${paidAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
          icon={CheckCircle2}
        />
        <StatsCard
          title="Documentos"
          value={documents.length}
          subtitle="Disponibles"
          icon={FolderOpen}
        />
      </div>

      {/* Recent Invoices */}
      <Card className="border-slate-200/50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">Facturas Recientes</CardTitle>
          <Link to={createPageUrl('ClientInvoices')}>
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
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{invoice.invoice_number}</p>
                    <p className="text-sm text-slate-500">
                      {format(parseISO(invoice.issue_date), "d 'de' MMMM yyyy", { locale: es })}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-semibold text-slate-900">
                      ${(invoice.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </p>
                    <div className="mt-1">
                      <CreditStatusBadge 
                        dueDate={invoice.due_date} 
                        isPaid={invoice.collection_status === 'completed' || invoice.collection_status === 'paid'}
                      />
                    </div>
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

      {/* Recent Documents */}
      <Card className="border-slate-200/50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">Documentos Recientes</CardTitle>
          <Link to={createPageUrl('ClientDocuments')}>
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900">
              Ver todos <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              No hay documentos disponibles
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {documents.slice(0, 6).map(doc => (
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
        </CardContent>
      </Card>
    </div>
  );
}
