import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Plus } from 'lucide-react';

const TAX_REGIMES = [
  "Persona Física con Actividad Empresarial",
  "Persona Física Servicios Profesionales",
  "Régimen Simplificado de Confianza",
  "Persona Moral Régimen General",
  "Persona Moral Sin Fines de Lucro",
  "Arrendamiento",
  "Sueldos y Salarios",
  "Otro"
];

const CFDI_USES = [
  "G01 - Adquisición de mercancías",
  "G02 - Devoluciones, descuentos o bonificaciones",
  "G03 - Gastos en general",
  "I01 - Construcciones",
  "I02 - Mobiliario y equipo de oficina",
  "I03 - Equipo de transporte",
  "I04 - Equipo de cómputo",
  "I08 - Otra maquinaria y equipo",
  "D01 - Honorarios médicos",
  "D02 - Gastos médicos por incapacidad",
  "D03 - Gastos funerales",
  "D04 - Donativos",
  "D05 - Intereses por créditos hipotecarios",
  "D06 - Aportaciones voluntarias al SAR",
  "D07 - Primas de seguros de gastos médicos",
  "D08 - Gastos de transportación escolar",
  "D09 - Depósitos en cuentas de ahorro",
  "D10 - Pagos por servicios educativos",
  "S01 - Sin efectos fiscales",
  "CP01 - Pagos",
  "CN01 - Nómina"
];

export default function ClientForm({ client, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    business_name: client?.business_name || '',
    rfc: client?.rfc || '',
    tax_regime: client?.tax_regime || '',
    cfdi_use: client?.cfdi_use || '',
    contact_emails: client?.contact_emails || [''],
    credit_days: client?.credit_days || 0,
    status: client?.status || 'active',
    phone: client?.phone || '',
    address: client?.address || '',
    postal_code: client?.postal_code || '',
    notes: client?.notes || '',
    assigned_user_email: client?.assigned_user_email || '',
  });

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const cleanedData = {
      ...formData,
      contact_emails: formData.contact_emails.filter(email => email.trim() !== ''),
      credit_days: parseInt(formData.credit_days) || 0,
    };
    await onSave(cleanedData);
    setSaving(false);
  };

  const addEmail = () => {
    setFormData(prev => ({
      ...prev,
      contact_emails: [...prev.contact_emails, '']
    }));
  };

  const removeEmail = (index) => {
    setFormData(prev => ({
      ...prev,
      contact_emails: prev.contact_emails.filter((_, i) => i !== index)
    }));
  };

  const updateEmail = (index, value) => {
    setFormData(prev => ({
      ...prev,
      contact_emails: prev.contact_emails.map((email, i) => i === index ? value : email)
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="business_name">Nombre / Razón Social *</Label>
          <Input
            id="business_name"
            value={formData.business_name}
            onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
            required
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="rfc">RFC *</Label>
          <Input
            id="rfc"
            value={formData.rfc}
            onChange={(e) => setFormData(prev => ({ ...prev, rfc: e.target.value.toUpperCase() }))}
            required
            maxLength={13}
            className="mt-1.5 uppercase"
          />
        </div>

        <div>
          <Label htmlFor="tax_regime">Régimen Fiscal</Label>
          <Select 
            value={formData.tax_regime} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, tax_regime: value }))}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Seleccionar régimen" />
            </SelectTrigger>
            <SelectContent>
              {TAX_REGIMES.map(regime => (
                <SelectItem key={regime} value={regime}>{regime}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="cfdi_use">Uso de CFDI</Label>
          <Select 
            value={formData.cfdi_use} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, cfdi_use: value }))}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Seleccionar uso" />
            </SelectTrigger>
            <SelectContent>
              {CFDI_USES.map(use => (
                <SelectItem key={use} value={use}>{use}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="credit_days">Días de Crédito</Label>
          <Input
            id="credit_days"
            type="number"
            min="0"
            value={formData.credit_days}
            onChange={(e) => setFormData(prev => ({ ...prev, credit_days: e.target.value }))}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="status">Estatus</Label>
          <Select 
            value={formData.status} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="inactive">Inactivo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-1.5">
            <Label>Correos de Contacto</Label>
            <Button type="button" variant="ghost" size="sm" onClick={addEmail}>
              <Plus className="h-4 w-4 mr-1" /> Agregar
            </Button>
          </div>
          <div className="space-y-2">
            {formData.contact_emails.map((email, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => updateEmail(index, e.target.value)}
                  placeholder="correo@ejemplo.com"
                />
                {formData.contact_emails.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeEmail(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="postal_code">Código Postal</Label>
          <Input
            id="postal_code"
            value={formData.postal_code}
            onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
            maxLength={5}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="assigned_user_email">Email para Acceso al Portal</Label>
          <Input
            id="assigned_user_email"
            type="email"
            value={formData.assigned_user_email}
            onChange={(e) => setFormData(prev => ({ ...prev, assigned_user_email: e.target.value }))}
            placeholder="cliente@ejemplo.com"
            className="mt-1.5"
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="address">Domicilio Fiscal</Label>
          <Textarea
            id="address"
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            className="mt-1.5"
            rows={2}
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="notes">Notas</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="mt-1.5"
            rows={2}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving} className="bg-gradient-to-r from-[#5B7C99] to-[#4A6B85] hover:from-[#4A6B85] hover:to-[#5B7C99]">
          {saving ? 'Guardando...' : (client ? 'Actualizar' : 'Crear Cliente')}
        </Button>
      </div>
    </form>
  );
}
