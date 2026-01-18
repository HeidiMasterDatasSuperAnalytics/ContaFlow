import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { MessageSquare, Send, Paperclip, Search, Users, Check, CheckCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import PageHeader from '@/components/shared/PageHeader';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export default function Messages() {
  const [clients, setClients] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      loadMessages(selectedClient.id);
    }
  }, [selectedClient]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadData = async () => {
    try {
      const [clientsData, userData] = await Promise.all([
        base44.entities.Client.list(),
        base44.auth.me()
      ]);
      setClients(clientsData);
      setUser(userData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const loadMessages = async (clientId) => {
    try {
      const messagesData = await base44.entities.ChatMessage.filter(
        { client_id: clientId },
        'created_date',
        100
      );
      setMessages(messagesData);
      
      // Mark unread messages as read
      const unreadMessages = messagesData.filter(m => !m.read && m.sender_type === 'client');
      for (const msg of unreadMessages) {
        await base44.entities.ChatMessage.update(msg.id, { read: true });
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedClient) return;

    setSending(true);
    try {
      await base44.entities.ChatMessage.create({
        client_id: selectedClient.id,
        sender_email: user.email,
        sender_name: user.full_name || user.email,
        sender_type: user.role === 'admin' ? 'admin' : 'staff',
        message: newMessage.trim(),
        read: false,
      });

      await base44.entities.ActivityLog.create({
        client_id: selectedClient.id,
        action_type: 'message_sent',
        description: `Mensaje enviado a ${selectedClient.business_name}`,
        reference_type: 'message',
        user_email: user.email
      });

      setNewMessage('');
      loadMessages(selectedClient.id);
    } catch (error) {
      console.error('Error sending message:', error);
    }
    setSending(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getUnreadCount = (clientId) => {
    // This would need to be optimized for production
    return 0;
  };

  const filteredClients = clients.filter(client =>
    client.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mensajes"
        subtitle="Comunicación con clientes"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
        {/* Clients List */}
        <Card className="border-slate-200/50 lg:col-span-1 flex flex-col">
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-xl"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="divide-y divide-slate-100">
              {filteredClients.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  No hay clientes
                </div>
              ) : (
                filteredClients.map(client => (
                  <button
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className={cn(
                      "w-full p-4 text-left hover:bg-slate-50 transition-colors",
                      selectedClient?.id === client.id && "bg-slate-100"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-slate-200 text-slate-600">
                          {client.business_name?.charAt(0) || 'C'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{client.business_name}</p>
                        <p className="text-sm text-slate-500 truncate">{client.rfc}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Chat Area */}
        <Card className="border-slate-200/50 lg:col-span-2 flex flex-col">
          {selectedClient ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-slate-900 text-white">
                    {selectedClient.business_name?.charAt(0) || 'C'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-slate-900">{selectedClient.business_name}</p>
                  <p className="text-sm text-slate-500">{selectedClient.rfc}</p>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      No hay mensajes. Envía el primer mensaje.
                    </div>
                  ) : (
                    messages.map(message => {
                      const isOwn = message.sender_type !== 'client';
                      return (
                        <div
                          key={message.id}
                          className={cn(
                            "flex",
                            isOwn ? "justify-end" : "justify-start"
                          )}
                        >
                          <div className={cn(
                            "max-w-[70%] rounded-2xl px-4 py-2.5",
                            isOwn 
                              ? "bg-slate-900 text-white rounded-br-md" 
                              : "bg-slate-100 text-slate-900 rounded-bl-md"
                          )}>
                            {!isOwn && (
                              <p className="text-xs font-medium text-slate-500 mb-1">
                                {message.sender_name}
                              </p>
                            )}
                            <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                            <div className={cn(
                              "flex items-center justify-end gap-1 mt-1",
                              isOwn ? "text-slate-400" : "text-slate-400"
                            )}>
                              <span className="text-[10px]">
                                {format(parseISO(message.created_date), "HH:mm", { locale: es })}
                              </span>
                              {isOwn && (
                                message.read 
                                  ? <CheckCheck className="h-3 w-3" />
                                  : <Check className="h-3 w-3" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100">
                <div className="flex gap-2">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="resize-none rounded-xl min-h-[44px] max-h-32"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                  <Button 
                    type="submit" 
                    size="icon"
                    disabled={sending || !newMessage.trim()}
                    className="bg-gradient-to-r from-[#5B7C99] to-[#4A6B85] hover:from-[#4A6B85] hover:to-[#5B7C99] rounded-xl h-11 w-11"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
              <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-slate-400" />
              </div>
              <p className="font-medium">Selecciona un cliente</p>
              <p className="text-sm">para ver o enviar mensajes</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
