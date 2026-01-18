import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Activity, Search, Filter, FileText, MessageSquare, DollarSign, ClipboardList, Upload, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ACTION_CONFIG = {
  invoice_created: { label: 'Factura Creada', icon: FileText, color: 'bg-blue-100 text-blue-600' },
  invoice_cancelled: { label: 'Factura Cancelada', icon: FileText, color: 'bg-red-100 text-red-600' },
  invoice_refactured: { label: 'Factura Refacturada', icon: RefreshCw, color: 'bg-amber-100 text-amber-600' },
  payment_received: { label: 'Pago Recibido', icon: DollarSign, color: 'bg-emerald-100 text-emerald-600' },
  complement_generated: { label: 'Complemento Generado', icon: FileText, color: 'bg-purple-100 text-purple-600' },
  document_uploaded: { label: 'Documento Cargado', icon: Upload, color: 'bg-indigo-100 text-indigo-600' },
  status_changed: { label: 'Cambio de Estatus', icon: RefreshCw, color: 'bg-slate-100 text-slate-600' },
  obligation_submitted: { label: 'Obligación Presentada', icon: ClipboardList, color: 'bg-emerald-100 text-emerald-600' },
  payroll_registered: { label: 'Nómina Registrada', icon: ClipboardList, color: 'bg-blue-100 text-blue-600' },
  message_sent: { label: 'Mensaje Enviado', icon: MessageSquare, color: 'bg-violet-100 text-violet-600' },
  other: { label: 'Otra Acción', icon: Activity, color: 'bg-slate-100 text-slate-600' },
};

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [logsData, clientsData] = await Promise.all([
        base44.entities.ActivityLog.list('-created_date', 200),
        base44.entities.Client.list()
      ]);
      setLogs(logsData);
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const getClientName = (clientId) => {
    if (!clientId) return 'Sistema';
    const client = clients.find(c => c.id === clientId);
    return client?.business_name || 'Cliente no encontrado';
  };

  const filteredLogs = logs.filter(log => {
    const matchesClient = selectedClient === 'all' || log.client_id === selectedClient;
    const matchesAction = actionFilter === 'all' || log.action_type === actionFilter;
    
    let matchesDate = true;
    if (dateFrom) {
      matchesDate = matchesDate && new Date(log.created_date) >= new Date(dateFrom);
    }
    if (dateTo) {
      matchesDate = matchesDate && new Date(log.created_date) <= new Date(dateTo + 'T23:59:59');
    }

    return matchesClient && matchesAction && matchesDate;
  });

  // Group logs by date
  const groupedLogs = filteredLogs.reduce((groups, log) => {
    const date = format(parseISO(log.created_date), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(log);
    return groups;
  }, {});

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bitácora de Actividades"
        subtitle="Registro de todas las acciones del sistema"
      />

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

        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-56 rounded-xl">
            <SelectValue placeholder="Tipo de acción" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las acciones</SelectItem>
            {Object.entries(ACTION_CONFIG).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40 rounded-xl"
          />
          <span className="text-slate-400">-</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40 rounded-xl"
          />
        </div>
      </div>

      {/* Activity Timeline */}
      {filteredLogs.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No hay actividades"
          description="Las acciones realizadas en el sistema aparecerán aquí"
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedLogs).map(([date, dayLogs]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-2 w-2 rounded-full bg-slate-300" />
                <h3 className="font-semibold text-slate-900">
                  {format(parseISO(date), "EEEE, d 'de' MMMM yyyy", { locale: es })}
                </h3>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
              
              <div className="ml-4 space-y-3">
                {dayLogs.map(log => {
                  const config = ACTION_CONFIG[log.action_type] || ACTION_CONFIG.other;
                  const Icon = config.icon;
                  
                  return (
                    <Card key={log.id} className="border-slate-200/50 hover:border-slate-300 transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0",
                            config.color
                          )}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-medium text-slate-900">{log.description}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                                    {getClientName(log.client_id)}
                                  </Badge>
                                  {log.user_email && (
                                    <span className="text-xs text-slate-500">
                                      por {log.user_email}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="text-sm text-slate-500 whitespace-nowrap">
                                {format(parseISO(log.created_date), "HH:mm", { locale: es })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
