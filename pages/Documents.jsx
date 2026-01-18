import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { FolderOpen, Plus, Search, Upload, FileText, Download, Trash2, Filter, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";

const DOCUMENT_TYPES = {
  compliance_opinion: { label: 'Opinión de Cumplimiento', color: 'bg-blue-100 text-blue-700' },
  monthly_declaration: { label: 'Declaración Mensual', color: 'bg-purple-100 text-purple-700' },
  annual_declaration: { label: 'Declaración Anual', color: 'bg-indigo-100 text-indigo-700' },
  payment_proof: { label: 'Comprobante de Pago', color: 'bg-emerald-100 text-emerald-700' },
  contract: { label: 'Contrato', color: 'bg-amber-100 text-amber-700' },
  other: { label: 'Otro', color: 'bg-slate-100 text-slate-700' },
};

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteDocument, setDeleteDocument] = useState(null);
  const [selectedClient, setSelectedClient] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    client_id: '',
    document_type: '',
    name: '',
    description: '',
    period: '',
    year: new Date().getFullYear(),
    file: null,
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [docsData, clientsData] = await Promise.all([
        base44.entities.Document.list('-created_date'),
        base44.entities.Client.list()
      ]);
      setDocuments(docsData);
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: formData.file });
      
      await base44.entities.Document.create({
        client_id: formData.client_id,
        document_type: formData.document_type,
        name: formData.name,
        description: formData.description,
        period: formData.period,
        year: parseInt(formData.year),
        file_url,
        upload_date: format(new Date(), 'yyyy-MM-dd'),
      });

      await base44.entities.ActivityLog.create({
        client_id: formData.client_id,
        action_type: 'document_uploaded',
        description: `Documento "${formData.name}" cargado`,
        reference_type: 'document'
      });

      setShowForm(false);
      setFormData({
        client_id: '',
        document_type: '',
        name: '',
        description: '',
        period: '',
        year: new Date().getFullYear(),
        file: null,
      });
      loadData();
    } catch (error) {
      console.error('Error uploading document:', error);
    }
    setUploading(false);
  };

  const handleDelete = async () => {
    if (deleteDocument) {
      await base44.entities.Document.delete(deleteDocument.id);
      setDeleteDocument(null);
      loadData();
    }
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.business_name || 'Cliente no encontrado';
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesClient = selectedClient === 'all' || doc.client_id === selectedClient;
    const matchesType = typeFilter === 'all' || doc.document_type === typeFilter;
    const matchesSearch = doc.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesClient && matchesType && matchesSearch;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión Documental"
        subtitle={`${documents.length} documentos almacenados`}
        action={() => setShowForm(true)}
        actionLabel="Subir Documento"
        actionIcon={Upload}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl border-slate-200"
          />
        </div>
        <Select value={selectedClient} onValueChange={setSelectedClient}>
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
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48 rounded-xl">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {Object.entries(DOCUMENT_TYPES).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Documents Grid */}
      {filteredDocuments.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No hay documentos"
          description="Sube el primer documento para comenzar a organizar la información de tus clientes"
          action={() => setShowForm(true)}
          actionLabel="Subir Documento"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDocuments.map(doc => (
            <Card key={doc.id} className="border-slate-200/50 hover:border-slate-300 transition-all hover:shadow-md group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-slate-600" />
                  </div>
                  <Badge className={DOCUMENT_TYPES[doc.document_type]?.color || 'bg-slate-100'}>
                    {DOCUMENT_TYPES[doc.document_type]?.label || doc.document_type}
                  </Badge>
                </div>
                
                <h3 className="font-medium text-slate-900 truncate mb-1">{doc.name}</h3>
                <p className="text-sm text-slate-500 truncate">{getClientName(doc.client_id)}</p>
                
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-400">
                    {doc.period && `${doc.period} `}{doc.year}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-red-600 hover:text-red-700"
                      onClick={() => setDeleteDocument(doc)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Subir Documento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="client_id">Cliente *</Label>
              <Select 
                value={formData.client_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.business_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="document_type">Tipo de Documento *</Label>
              <Select 
                value={formData.document_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, document_type: value }))}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_TYPES).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="name">Nombre del Documento *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                className="mt-1.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="period">Periodo</Label>
                <Input
                  id="period"
                  value={formData.period}
                  onChange={(e) => setFormData(prev => ({ ...prev, period: e.target.value }))}
                  placeholder="Ej: Enero"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="year">Año</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1.5"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="file">Archivo *</Label>
              <Input
                id="file"
                type="file"
                onChange={(e) => setFormData(prev => ({ ...prev, file: e.target.files[0] }))}
                required
                className="mt-1.5"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={uploading} className="bg-gradient-to-r from-[#5B7C99] to-[#4A6B85] hover:from-[#4A6B85] hover:to-[#5B7C99]">
                {uploading ? 'Subiendo...' : 'Subir Documento'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDocument} onOpenChange={() => setDeleteDocument(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente "{deleteDocument?.name}".
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
