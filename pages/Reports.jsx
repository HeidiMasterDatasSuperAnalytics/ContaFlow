import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { FileSpreadsheet, Plus, Download, Eye, Edit, Trash2, Filter, MoreHorizontal } from 'lucide-react';
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
import ReportBuilder from '@/components/reports/ReportBuilder';
import ReportViewer from '@/components/reports/ReportViewer';

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [viewingReport, setViewingReport] = useState(null);
  const [deleteReport, setDeleteReport] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [reportsData, userData] = await Promise.all([
        base44.entities.Report.list('-created_date'),
        base44.auth.me()
      ]);
      setReports(reportsData);
      setUser(userData);
    } catch (error) {
      console.error('Error loading reports:', error);
    }
    setLoading(false);
  };

  const handleSave = async (reportData) => {
    if (editingReport) {
      await base44.entities.Report.update(editingReport.id, reportData);
    } else {
      await base44.entities.Report.create(reportData);
    }
    setShowBuilder(false);
    setEditingReport(null);
    loadData();
  };

  const handleDelete = async () => {
    if (deleteReport) {
      await base44.entities.Report.delete(deleteReport.id);
      setDeleteReport(null);
      loadData();
    }
  };

  const canEdit = user?.role === 'admin' || user?.role === 'staff';

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes"
        subtitle="Crea y gestiona reportes personalizados"
        action={canEdit ? () => setShowBuilder(true) : null}
        actionLabel="Crear Reporte"
      />

      {reports.length === 0 ? (
        <EmptyState
          icon={FileSpreadsheet}
          title="No hay reportes"
          description="Crea reportes personalizados para analizar tu información"
          action={canEdit ? () => setShowBuilder(true) : null}
          actionLabel="Crear Reporte"
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
                  {canEdit && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewingReport(report)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Reporte
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setEditingReport(report); setShowBuilder(true); }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setDeleteReport(report)} className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
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

      {/* Report Builder Dialog */}
      <Dialog open={showBuilder} onOpenChange={(open) => { setShowBuilder(open); if (!open) setEditingReport(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingReport ? 'Editar Reporte' : 'Crear Reporte'}</DialogTitle>
          </DialogHeader>
          <ReportBuilder
            report={editingReport}
            onSave={handleSave}
            onCancel={() => { setShowBuilder(false); setEditingReport(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Report Viewer Dialog */}
      <Dialog open={!!viewingReport} onOpenChange={() => setViewingReport(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingReport?.name}</DialogTitle>
          </DialogHeader>
          {viewingReport && <ReportViewer report={viewingReport} />}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteReport} onOpenChange={() => setDeleteReport(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar reporte?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente "{deleteReport?.name}".
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
