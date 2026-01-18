import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { FileSpreadsheet, Eye, Download, AlertTriangle } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ReportViewer from '@/components/reports/ReportViewer';

export default function ClientReports() {
  const [user, setUser] = useState(null);
  const [client, setClient] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingReport, setViewingReport] = useState(null);

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

        // Get reports where is_public=true AND client is in allowed_clients
        const allReports = await base44.entities.Report.list('-created_date');
        const accessibleReports = allReports.filter(r => 
          r.is_public && r.allowed_clients?.includes(clientData.id)
        );
        setReports(accessibleReports);
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis Reportes"
        subtitle="Reportes disponibles para consulta"
      />

      {reports.length === 0 ? (
        <EmptyState
          icon={FileSpreadsheet}
          title="No hay reportes disponibles"
          description="Tu contador habilitará reportes para que puedas consultarlos"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map(report => (
            <Card key={report.id} className="border-slate-200/50 hover:border-slate-300 transition-all hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{report.name}</h3>
                    <p className="text-sm text-slate-500 mt-1">{report.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                  <Badge variant="secondary" className="bg-[#5B7C99]/10 text-[#5B7C99]">
                    {report.entity_type}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setViewingReport(report)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ver
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Report Viewer Dialog */}
      <Dialog open={!!viewingReport} onOpenChange={() => setViewingReport(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingReport?.name}</DialogTitle>
          </DialogHeader>
          {viewingReport && <ReportViewer report={viewingReport} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
