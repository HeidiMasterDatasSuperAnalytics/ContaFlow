import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { FolderOpen, Search, FileText, Download, Eye, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
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

const DOCUMENT_TYPES = {
  compliance_opinion: { label: 'Opinión de Cumplimiento', color: 'bg-blue-100 text-blue-700' },
  monthly_declaration: { label: 'Declaración Mensual', color: 'bg-purple-100 text-purple-700' },
  annual_declaration: { label: 'Declaración Anual', color: 'bg-indigo-100 text-indigo-700' },
  payment_proof: { label: 'Comprobante de Pago', color: 'bg-emerald-100 text-emerald-700' },
  contract: { label: 'Contrato', color: 'bg-amber-100 text-amber-700' },
  other: { label: 'Otro', color: 'bg-slate-100 text-slate-700' },
};

export default function ClientDocuments() {
  const [user, setUser] = useState(null);
  const [client, setClient] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

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

        const documentsData = await base44.entities.Document.filter({ client_id: clientData.id }, '-created_date');
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
          Contacta al administrador para ver tu información.
        </p>
      </div>
    );
  }

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || doc.document_type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis Documentos"
        subtitle={`${documents.length} documentos disponibles`}
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
          description="Tus documentos aparecerán aquí cuando estén disponibles"
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
                <p className="text-sm text-slate-500">{doc.period} {doc.year}</p>
                
                {doc.description && (
                  <p className="text-sm text-slate-600 mt-2 line-clamp-2">{doc.description}</p>
                )}
                
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-400">
                    {doc.upload_date && format(parseISO(doc.upload_date), "d MMM yyyy", { locale: es })}
                  </span>
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Descargar
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
