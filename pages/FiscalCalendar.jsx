import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Calendar as CalendarIcon, Plus, Check, AlertTriangle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { cn } from "@/lib/utils";

const EVENT_TYPES = {
  monthly_declaration: { label: 'Declaración Mensual', color: 'bg-blue-500' },
  annual_declaration: { label: 'Declaración Anual', color: 'bg-purple-500' },
  payment_due: { label: 'Vencimiento de Pago', color: 'bg-red-500' },
  diot: { label: 'DIOT', color: 'bg-amber-500' },
  employer_contribution: { label: 'Aportación Patronal', color: 'bg-emerald-500' },
  other: { label: 'Otro', color: 'bg-slate-500' },
};

export default function FiscalCalendar() {
  const [events, setEvents] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvents, setSelectedEvents] = useState([]);

  const [formData, setFormData] = useState({
    client_id: '',
    title: '',
    event_type: 'monthly_declaration',
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    is_recurring: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [eventsData, clientsData] = await Promise.all([
        base44.entities.FiscalCalendarEvent.list('-date'),
        base44.entities.Client.list()
      ]);
      setEvents(eventsData);
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      await base44.entities.FiscalCalendarEvent.create({
        ...formData,
        client_id: formData.client_id || null,
      });
      setShowForm(false);
      setFormData({
        client_id: '',
        title: '',
        event_type: 'monthly_declaration',
        date: format(new Date(), 'yyyy-MM-dd'),
        description: '',
        is_recurring: false,
      });
      loadData();
    } catch (error) {
      console.error('Error saving event:', error);
    }
    setSaving(false);
  };

  const toggleEventCompleted = async (event) => {
    await base44.entities.FiscalCalendarEvent.update(event.id, { completed: !event.completed });
    loadData();
  };

  const getClientName = (clientId) => {
    if (!clientId) return 'General';
    const client = clients.find(c => c.id === clientId);
    return client?.business_name || 'Cliente no encontrado';
  };

  // Calendar calculations
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Add padding days for the start of the month
  const startDay = monthStart.getDay();
  const paddingDays = Array(startDay).fill(null);

  const getEventsForDay = (date) => {
    return events.filter(event => isSameDay(parseISO(event.date), date));
  };

  const handleDayClick = (date) => {
    const dayEvents = getEventsForDay(date);
    if (dayEvents.length > 0) {
      setSelectedDate(date);
      setSelectedEvents(dayEvents);
    }
  };

  const openNewEventForm = (date) => {
    setFormData(prev => ({
      ...prev,
      date: date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
    }));
    setShowForm(true);
    setSelectedDate(null);
    setSelectedEvents([]);
  };

  // Upcoming events (next 7 days)
  const now = new Date();
  const upcomingEvents = events
    .filter(e => !e.completed)
    .filter(e => {
      const eventDate = new Date(e.date);
      const diffDays = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendario Fiscal"
        subtitle="Control de fechas y obligaciones fiscales"
        action={() => openNewEventForm(null)}
        actionLabel="Nuevo Evento"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2 border-slate-200/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Days header */}
            <div className="grid grid-cols-7 mb-2">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {paddingDays.map((_, index) => (
                <div key={`pad-${index}`} className="aspect-square" />
              ))}
              {calendarDays.map(day => {
                const dayEvents = getEventsForDay(day);
                const hasEvents = dayEvents.length > 0;
                const hasOverdue = dayEvents.some(e => !e.completed && new Date(e.date) < now);
                
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => hasEvents ? handleDayClick(day) : openNewEventForm(day)}
                    className={cn(
                      "aspect-square p-1 rounded-lg text-sm transition-all relative",
                      isToday(day) && "ring-2 ring-slate-900",
                      hasEvents && "bg-slate-50 hover:bg-slate-100",
                      !hasEvents && "hover:bg-slate-50",
                      hasOverdue && "bg-red-50"
                    )}
                  >
                    <span className={cn(
                      "block text-center",
                      isToday(day) && "font-bold",
                      !isSameMonth(day, currentMonth) && "text-slate-300"
                    )}>
                      {format(day, 'd')}
                    </span>
                    {hasEvents && (
                      <div className="flex justify-center gap-0.5 mt-0.5 flex-wrap">
                        {dayEvents.slice(0, 3).map((event, i) => (
                          <div
                            key={i}
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              event.completed ? "bg-emerald-500" : EVENT_TYPES[event.event_type]?.color || 'bg-slate-400'
                            )}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-[8px] text-slate-500">+{dayEvents.length - 3}</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className="border-slate-200/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Próximos 7 días
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {upcomingEvents.length === 0 ? (
              <div className="px-6 py-8 text-center text-slate-500">
                No hay eventos próximos
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {upcomingEvents.map(event => (
                  <div key={event.id} className="px-6 py-3 hover:bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "h-2 w-2 rounded-full mt-2",
                        EVENT_TYPES[event.event_type]?.color || 'bg-slate-400'
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{event.title}</p>
                        <p className="text-sm text-slate-500">{getClientName(event.client_id)}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {format(parseISO(event.date), "d 'de' MMMM", { locale: es })}
                        </p>
                      </div>
                      <Checkbox
                        checked={event.completed}
                        onCheckedChange={() => toggleEventCompleted(event)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Event Details Dialog */}
      <Dialog open={selectedDate !== null} onOpenChange={() => { setSelectedDate(null); setSelectedEvents([]); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Eventos del {selectedDate && format(selectedDate, "d 'de' MMMM yyyy", { locale: es })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selectedEvents.map(event => (
              <div key={event.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <div className={cn(
                  "h-3 w-3 rounded-full mt-1",
                  event.completed ? "bg-emerald-500" : EVENT_TYPES[event.event_type]?.color || 'bg-slate-400'
                )} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className={cn(
                      "font-medium",
                      event.completed && "line-through text-slate-400"
                    )}>{event.title}</p>
                    <Checkbox
                      checked={event.completed}
                      onCheckedChange={() => toggleEventCompleted(event)}
                    />
                  </div>
                  <p className="text-sm text-slate-500">{getClientName(event.client_id)}</p>
                  <Badge className="mt-2" variant="secondary">
                    {EVENT_TYPES[event.event_type]?.label || event.event_type}
                  </Badge>
                  {event.description && (
                    <p className="text-sm text-slate-600 mt-2">{event.description}</p>
                  )}
                </div>
              </div>
            ))}
            <Button 
              className="w-full mt-4"
              variant="outline"
              onClick={() => openNewEventForm(selectedDate)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar evento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Event Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Evento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="event_type">Tipo de Evento</Label>
              <Select 
                value={formData.event_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, event_type: value }))}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_TYPES).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date">Fecha *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="client_id">Cliente (opcional)</Label>
              <Select 
                value={formData.client_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>General (todos)</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.business_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-gradient-to-r from-[#5B7C99] to-[#4A6B85] hover:from-[#4A6B85] hover:to-[#5B7C99]">
                {saving ? 'Guardando...' : 'Crear Evento'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
