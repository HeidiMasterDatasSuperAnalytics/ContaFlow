import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { LayoutDashboard, Plus, Eye, Edit, Trash2, MoreHorizontal, Download } from 'lucide-react';
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
import DashboardBuilder from '@/components/dashboards/DashboardBuilder';
import DashboardViewer from '@/components/dashboards/DashboardViewer';

export default function Dashboards() {
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState(null);
  const [viewingDashboard, setViewingDashboard] = useState(null);
  const [deleteDashboard, setDeleteDashboard] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashboardsData, userData] = await Promise.all([
        base44.entities.Dashboard.list('-created_date'),
        base44.auth.me()
      ]);
      setDashboards(dashboardsData);
      setUser(userData);
    } catch (error) {
      console.error('Error loading dashboards:', error);
    }
    setLoading(false);
  };

  const handleSave = async (dashboardData) => {
    if (editingDashboard) {
      await base44.entities.Dashboard.update(editingDashboard.id, dashboardData);
    } else {
      await base44.entities.Dashboard.create(dashboardData);
    }
    setShowBuilder(false);
    setEditingDashboard(null);
    loadData();
  };

  const handleDelete = async () => {
    if (deleteDashboard) {
      await base44.entities.Dashboard.delete(deleteDashboard.id);
      setDeleteDashboard(null);
      loadData();
    }
  };

  const canEdit = user?.role === 'admin' || user?.role === 'staff';

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboards"
        subtitle="Crea y gestiona dashboards personalizados"
        action={canEdit ? () => setShowBuilder(true) : null}
        actionLabel="Crear Dashboard"
      />

      {dashboards.length === 0 ? (
        <EmptyState
          icon={LayoutDashboard}
          title="No hay dashboards"
          description="Crea dashboards personalizados para visualizar métricas clave"
          action={canEdit ? () => setShowBuilder(true) : null}
          actionLabel="Crear Dashboard"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboards.map(dashboard => (
            <Card key={dashboard.id} className="border-slate-200/50 hover:border-slate-300 transition-all hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{dashboard.name}</h3>
                    <p className="text-sm text-slate-500 mt-1">{dashboard.description}</p>
                  </div>
                  {canEdit && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewingDashboard(dashboard)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Dashboard
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setEditingDashboard(dashboard); setShowBuilder(true); }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setDeleteDashboard(dashboard)} className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                  <Badge variant="secondary" className="bg-[#5B7C99]/10 text-[#5B7C99]">
                    {dashboard.widgets?.length || 0} widgets
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setViewingDashboard(dashboard)}
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

      {/* Dashboard Builder Dialog */}
      <Dialog open={showBuilder} onOpenChange={(open) => { setShowBuilder(open); if (!open) setEditingDashboard(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDashboard ? 'Editar Dashboard' : 'Crear Dashboard'}</DialogTitle>
          </DialogHeader>
          <DashboardBuilder
            dashboard={editingDashboard}
            onSave={handleSave}
            onCancel={() => { setShowBuilder(false); setEditingDashboard(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Dashboard Viewer Dialog */}
      <Dialog open={!!viewingDashboard} onOpenChange={() => setViewingDashboard(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingDashboard?.name}</DialogTitle>
          </DialogHeader>
          {viewingDashboard && <DashboardViewer dashboard={viewingDashboard} />}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDashboard} onOpenChange={() => setDeleteDashboard(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar dashboard?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente "{deleteDashboard?.name}".
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
