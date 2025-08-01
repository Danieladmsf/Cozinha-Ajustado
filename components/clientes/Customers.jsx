'use client';


import React, { useState, useEffect, useRef, useCallback } from "react";
import { Customer } from "@/app/api/entities"; 
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Search,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  File,
  MoreVertical,
  Pencil,
  Trash,
  Eye,
  EyeOff,
  Link,
  Copy
} from "lucide-react";
import { UploadFile } from "@/app/api/integrations"; 
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";

// Novos imports para funcionalidade de links
import { useCustomerLink } from "@/hooks/clientes/useCustomerLink";
import CreateLinkModal from "@/components/clientes/modals/CreateLinkModal";
import LinkDisplayModal from "@/components/clientes/modals/LinkDisplayModal";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState("");
  const [paymentTermOptions, setPaymentTermOptions] = useState([]);
  const [selectedPaymentTerm, setSelectedPaymentTerm] = useState(null);
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  
  // Estados para os novos modais de link
  const [showCreateLinkModal, setShowCreateLinkModal] = useState(false);
  const [showLinkDisplayModal, setShowLinkDisplayModal] = useState(false);
  const [linkDisplayData, setLinkDisplayData] = useState({ link: '', customerName: '' });
  
  // Hook para gerenciamento de links
  const { isCreatingLink, createCustomerWithLink, copyExistingCustomerLink } = useCustomerLink();
  
  // Adicionar refs para otimização de salvamento
  const saveTimerRef = useRef(null);
  const dirtyCustomerRef = useRef(null);
  const [isDirty, setIsDirty] = useState(false);

  // Carregar dados apenas no início
  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const data = await Customer.list() || [];
      setCustomers(data);
    } catch (error) {
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível buscar a lista de clientes.",
        variant: "destructive",
      });
      setCustomers([]); // Set to empty array on error
    }
  };

  // --- Dialog and Form Logic ---
  useEffect(() => {
    // Update payment term options based on billing period when editing
    if (currentCustomer) {
      updatePaymentTermOptions(currentCustomer.billing_period);
      // Set the payment term/day based on the period
      if (currentCustomer.billing_period === 'semanal' || currentCustomer.billing_period === 'quinzenal') {
        setSelectedPaymentTerm(currentCustomer.payment_day || null);
      } else {
        setSelectedPaymentTerm(null); // Reset for mensal/diario where input is used
      }
    } else {
      // Reset form state when opening for a new customer
      setUploadedPhotoUrl("");
      setSelectedPaymentTerm(null);
      updatePaymentTermOptions("mensal"); // Default to monthly options initially
    }
  }, [currentCustomer]); // Rerun when currentCustomer changes


  const updatePaymentTermOptions = (billingPeriod) => {
    let options = [];
    if (billingPeriod === "semanal") {
      options = [
        { value: 1, label: "1 dia após fechamento" },
        { value: 2, label: "2 dias após fechamento" },
        { value: 3, label: "3 dias após fechamento" },
        { value: 5, label: "5 dias após fechamento" },
        { value: 7, label: "7 dias após fechamento" }
      ];
    } else if (billingPeriod === "quinzenal") {
      options = [
        { value: 1, label: "1 dia após fechamento" },
        { value: 2, label: "2 dias após fechamento" },
        { value: 3, label: "3 dias após fechamento" },
        { value: 5, label: "5 dias após fechamento" },
        { value: 7, label: "7 dias após fechamento" },
        { value: 10, label: "10 dias após fechamento" },
        { value: 15, label: "15 dias após fechamento" }
      ];
    }
    setPaymentTermOptions(options);
  };

  const handleBillingPeriodChange = (value) => {
    setCurrentCustomer(prev => ({ ...prev, billing_period: value }));
    updatePaymentTermOptions(value);
    setSelectedPaymentTerm(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const billingPeriod = formData.get("billing_period");

    let paymentDayValue = null;
    if (billingPeriod === "mensal") {
      const dayInput = formData.get("payment_day_monthly");
      paymentDayValue = dayInput ? parseInt(dayInput, 10) : null;
    } else if (billingPeriod === "semanal" || billingPeriod === "quinzenal") {
      paymentDayValue = selectedPaymentTerm ? parseInt(selectedPaymentTerm, 10) : null;
    }

    const data = {
      name: formData.get("name"),
      company: formData.get("company") || null,
      address: formData.get("address") || null,
      cnpj: formData.get("cnpj") || null,
      phone: formData.get("phone") || null,
      email: formData.get("email") || null,
      photo: uploadedPhotoUrl || currentCustomer?.photo || null,
      active: formData.get("active") === "on",
      category: formData.get("category"),
      billing_period: billingPeriod,
      payment_day: paymentDayValue,
      notes: formData.get("notes") || null,
    };

    if (!data.name) {
        toast({ title: "Erro", description: "O nome do cliente é obrigatório.", variant: "destructive" });
        return;
    }

    try {
      // Lógica de salvamento removida  
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: `Não foi possível salvar o cliente. Detalhes: ${error.message || error}`,
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (customer) => {
    setCurrentCustomer(customer);
    setUploadedPhotoUrl(customer.photo || "");
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setCurrentCustomer(null);
    setUploadedPhotoUrl("");
    setIsDialogOpen(true);
  };

  const handleDelete = (customer) => {
    if (!customer || !customer.id) return;
    setCustomerToDelete(customer);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!customerToDelete) return;
    
    try {
      await Customer.delete(customerToDelete.id);
      toast({ title: "Sucesso", description: "Cliente excluído." });
      loadCustomers();
      setShowDeleteDialog(false);
      setCustomerToDelete(null);
    } catch (error) {
      toast({
        title: "Erro ao excluir",
        description: `Não foi possível excluir o cliente. Detalhes: ${error.message || error}`,
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (customer) => {
     if (!customer || !customer.id) return;
    try {
      await Customer.update(customer.id, { active: !customer.active });
      toast({
        title: "Status alterado",
        description: `Cliente ${customer.name} ${!customer.active ? 'ativado' : 'suspenso'}.`,
      });
      loadCustomers();
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: `Não foi possível alterar o status do cliente. Detalhes: ${error.message || error}`,
        variant: "destructive",
      });
    }
  };

  // --- Link Generation and Management ---
  const handleCopyCustomerLink = async (customer) => {
    const result = await copyExistingCustomerLink(customer);
    
    if (!result.success && result.needsManualCopy) {
      setLinkDisplayData({ 
        link: result.link, 
        customerName: customer.name 
      });
      setShowLinkDisplayModal(true);
    }
  };

  const handleCreateNewLink = async (customerName) => {
    const result = await createCustomerWithLink(customerName);
    
    if (result) {
      // Recarregar lista para mostrar o novo cliente
      loadCustomers();
      
      // Se precisar de cópia manual, mostrar modal
      if (result.needsManualCopy) {
        setLinkDisplayData({ 
          link: result.link, 
          customerName: customerName 
        });
        setShowLinkDisplayModal(true);
      }
    }
    
    return result;
  };

  // --- WhatsApp Integration ---
  const handleWhatsAppClick = (phoneNumber, customerName) => {
    if (!phoneNumber) {
      toast({
        title: "Erro",
        description: "Número de telefone não disponível.",
        variant: "destructive",
      });
      return;
    }

    const cleanNumber = phoneNumber.replace(/\D/g, '');
    if (cleanNumber.length < 10) {
      toast({
        title: "Erro",
        description: "Número de telefone inválido.",
        variant: "destructive",
      });
      return;
    }
    const formattedNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;

    const name = typeof customerName === 'string' && customerName ? customerName : 'cliente';
    const baseMessage = `Olá ${name}, tudo bem? Gostaria de falar sobre...`;

    const encodedMessage = encodeURIComponent(baseMessage);
    const whatsAppUrl = `https://wa.me/${formattedNumber}?text=${encodedMessage}`;

    window.open(whatsAppUrl, '_blank');
  };


  // --- File Upload ---
  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const result = await UploadFile({ file });
      if (result.success && result.file_url) {
        setUploadedPhotoUrl(result.file_url);
         toast({ title: "Upload Concluído", description: "Foto carregada." });
      } else {
         throw new Error(result.error || "Erro no upload do arquivo.");
      }
    } catch (error) {
      setUploadedPhotoUrl(currentCustomer?.photo || "");
      toast({
        title: "Erro de Upload",
        description: `Não foi possível carregar a foto. Detalhes: ${error.message || error}`,
        variant: "destructive",
      });
    }
  };

  // --- Filtering ---
  const filteredCustomers = customers.filter(customer =>
    (customer.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (customer.company?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (customer.cnpj?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );
  
  // Otimizar salvamento para utilizar o estado local sem recarregar dados
  useEffect(() => {
    if (!isDirty || !dirtyCustomerRef.current) {
      return;
    }
    
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    
    saveTimerRef.current = setTimeout(async () => {
      try {
        setSaving(true);
        
        const customerToSave = dirtyCustomerRef.current;
        
        if (customerToSave.id) {
          await Customer.update(customerToSave.id, customerToSave);
          
          // Atualizar o estado local em vez de recarregar do banco
          setCustomers(prev => prev.map(customer => 
            customer.id === customerToSave.id ? customerToSave : customer
          ));
        } else {
          const savedCustomer = await Customer.create(customerToSave);
          
          // Adicionar ao estado local em vez de recarregar do banco
          setCustomers(prev => [...prev, savedCustomer]);
        }
        
        // Limpar estado de sujeira
        dirtyCustomerRef.current = null;
        setIsDirty(false);
        
        toast({
          description: "Cliente salvo com sucesso!"
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erro ao salvar",
          description: error.message || "Tente novamente"
        });
      } finally {
        setSaving(false);
        saveTimerRef.current = null;
      }
    }, 1000); // Debounce de 1 segundo
    
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [isDirty, toast]);

  // Modificar o handler para edição de clientes
  const handleCustomerChange = useCallback((id, changes) => {
    setCustomers(prev => {
      // Encontrar o cliente a ser atualizado
      const index = prev.findIndex(customer => customer.id === id);
      if (index === -1) return prev;
      
      // Criar uma nova lista com o cliente atualizado
      const newCustomers = [...prev];
      newCustomers[index] = {
        ...newCustomers[index],
        ...changes
      };
      
      // Armazenar a versão suja para salvamento
      dirtyCustomerRef.current = newCustomers[index];
      setIsDirty(true);
      
      return newCustomers;
    });
  }, []);


  // --- Render ---
  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-gray-500 dark:text-gray-400">Gerencie seus clientes</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Input
              type="search"
              placeholder="Buscar por nome, empresa, CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full"
            />
          </div>
          {/* Create Link Button */}
          <Button
            onClick={() => setShowCreateLinkModal(true)}
            variant="outline"
            className="border-green-600 text-green-600 hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900/20"
          >
            <Link className="w-4 h-4 mr-2" />
            Criar Link
          </Button>
          {/* New Customer Button */}
          <Button
            onClick={openNewDialog}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="dark:border-gray-700">
              <TableHead>Foto</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Faturamento</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Link</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <TableRow 
                  key={customer.id} 
                  className={`dark:border-gray-700 ${customer.pending_registration ? 'opacity-50 bg-gray-50 dark:bg-gray-900/50' : ''}`}
                >
                  {/* Avatar */}
                  <TableCell>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={customer.photo || undefined} alt={customer.name || 'Avatar'} />
                      <AvatarFallback>
                        {customer.name ? customer.name.charAt(0).toUpperCase() : '?'}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  {/* Name */}
                  <TableCell className="font-medium">{customer.name || "-"}</TableCell>
                  {/* Company */}
                  <TableCell>{customer.company || "-"}</TableCell>
                  {/* CNPJ */}
                  <TableCell>{customer.cnpj || "-"}</TableCell>
                  {/* Phone (Clickable for WhatsApp) */}
                  <TableCell>
                    {customer.phone ? (
                      <span
                        className="cursor-pointer text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                        onClick={() => handleWhatsAppClick(customer.phone, customer.name)}
                        title="Abrir no WhatsApp"
                      >
                        {customer.phone}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  {/* Email */}
                  <TableCell>{customer.email || "-"}</TableCell>
                  {/* Billing Period */}
                  <TableCell>
                    {customer.billing_period ? (
                      <Badge variant="outline" className="capitalize dark:border-gray-600 dark:text-gray-300">
                        {customer.billing_period === "diario" ? "Diário" :
                         customer.billing_period === "semanal" ? "Semanal" :
                         customer.billing_period === "quinzenal" ? "Quinzenal" :
                         customer.billing_period === "mensal" ? "Mensal" :
                         customer.billing_period // Fallback
                         }
                      </Badge>
                    ) : (
                       <Badge variant="outline" className="capitalize dark:border-gray-600 dark:text-gray-300">Mensal</Badge> // Default
                    )}
                  </TableCell>
                  {/* Payment Day/Term */}
                  <TableCell className="text-center">
                    {customer.billing_period === 'mensal' && customer.payment_day ? `Dia ${customer.payment_day}` :
                     (customer.billing_period === 'semanal' || customer.billing_period === 'quinzenal') && customer.payment_day ? `${customer.payment_day} dias` :
                     customer.billing_period === 'diario' ? 'Na entrega' : // Example for daily
                     '-'}
                  </TableCell>
                  {/* Status */}
                  <TableCell>
                    <Badge variant={customer.pending_registration ? "outline" : (customer.active ? "success" : "secondary")}>
                      {customer.pending_registration ? "Aguardando" : (customer.active ? "Ativo" : "Inativo")}
                    </Badge>
                  </TableCell>
                  {/* Link Portal */}
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20"
                      onClick={() => handleCopyCustomerLink(customer)}
                      title="Copiar link do portal do cliente"
                    >
                      <Link className="h-4 w-4" />
                      <span className="sr-only">Copiar link do portal</span>
                    </Button>
                  </TableCell>
                  {/* Actions Dropdown */}
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Mais ações</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 dark:bg-gray-700 dark:border-gray-600">
                        <DropdownMenuItem
                          onClick={() => openEditDialog(customer)}
                          className="flex items-center cursor-pointer dark:hover:bg-gray-600"
                        >
                          <Pencil className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleActive(customer)}
                          className="flex items-center cursor-pointer dark:hover:bg-gray-600"
                        >
                          {customer.active ? (
                            <><EyeOff className="mr-2 h-4 w-4" /> Suspender</>
                          ) : (
                            <><Eye className="mr-2 h-4 w-4" /> Ativar</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="dark:bg-gray-600"/>
                        <DropdownMenuItem
                          onClick={() => handleDelete(customer)}
                          className="flex items-center text-red-600 focus:text-red-600 focus:bg-red-50 dark:text-red-400 dark:focus:bg-red-900/50 cursor-pointer"
                        >
                          <Trash className="mr-2 h-4 w-4" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              // No Customers Found Row
              <TableRow>
                <TableCell colSpan={11} className="text-center py-10 text-gray-500 dark:text-gray-400">
                  {searchTerm ? "Nenhum cliente encontrado para sua busca." : "Nenhum cliente cadastrado ainda."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[400px] dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <Trash className="w-5 h-5" />
              Confirmar Exclusão
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Tem certeza que deseja excluir o cliente <strong>"{customerToDelete?.name}"</strong>?
            </p>
            <p className="text-sm text-red-600 dark:text-red-400">
              Esta ação não pode ser desfeita.
            </p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteDialog(false);
                setCustomerToDelete(null);
              }}
              className="dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Cancelar
            </Button>
            <Button 
              onClick={confirmDelete}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash className="w-4 h-4 mr-2" />
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Novos Modais de Link */}
      <CreateLinkModal
        isOpen={showCreateLinkModal}
        onClose={() => setShowCreateLinkModal(false)}
        onCreateLink={handleCreateNewLink}
        isLoading={isCreatingLink}
      />

      <LinkDisplayModal
        isOpen={showLinkDisplayModal}
        onClose={() => setShowLinkDisplayModal(false)}
        link={linkDisplayData.link}
        customerName={linkDisplayData.customerName}
      />

      {/* Dialog for New/Edit Customer */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[650px] dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 dark:text-white">
              {currentCustomer ? <Pencil className="w-5 h-5" /> : <User className="w-5 h-5" />}
              {currentCustomer ? "Editar Cliente" : "Novo Cliente"}
            </DialogTitle>
          </DialogHeader>
          {/* Form */}
          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
             {/* Photo Upload */}
             <div className="space-y-2">
              <label htmlFor="photo-upload" className="text-sm font-medium dark:text-gray-300">Foto</label>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={uploadedPhotoUrl || currentCustomer?.photo || undefined} alt={currentCustomer?.name || 'Avatar'}/>
                  <AvatarFallback>
                    {currentCustomer?.name ? currentCustomer.name.charAt(0).toUpperCase() : <User size={24}/>}
                  </AvatarFallback>
                </Avatar>
                <Input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/50 dark:file:text-blue-300 dark:hover:file:bg-blue-900"
                />
              </div>
            </div>

            {/* Grid for Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium flex items-center gap-1 dark:text-gray-300"><User className="w-4 h-4" /> Nome*</label>
                <Input id="name" name="name" defaultValue={currentCustomer?.name} required className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
              </div>
              {/* Company */}
              <div className="space-y-2">
                <label htmlFor="company" className="text-sm font-medium flex items-center gap-1 dark:text-gray-300"><Building2 className="w-4 h-4" /> Empresa</label>
                <Input id="company" name="company" defaultValue={currentCustomer?.company} className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
              </div>
              {/* CNPJ */}
              <div className="space-y-2">
                <label htmlFor="cnpj" className="text-sm font-medium flex items-center gap-1 dark:text-gray-300"><File className="w-4 h-4" /> CNPJ</label>
                <Input id="cnpj" name="cnpj" defaultValue={currentCustomer?.cnpj} className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
              </div>
              {/* Phone */}
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium flex items-center gap-1 dark:text-gray-300"><Phone className="w-4 h-4" /> Telefone</label>
                <Input id="phone" name="phone" defaultValue={currentCustomer?.phone} className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
              </div>
              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium flex items-center gap-1 dark:text-gray-300"><Mail className="w-4 h-4" /> Email</label>
                <Input id="email" name="email" type="email" defaultValue={currentCustomer?.email} className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
              </div>
              {/* Category */}
              <div className="space-y-2">
                  <label htmlFor="category" className="text-sm font-medium dark:text-gray-300"> Categoria </label>
                  <Select name="category" defaultValue={currentCustomer?.category || "pessoa_fisica"}>
                      <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                          <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                          <SelectItem value="restaurante">Restaurante</SelectItem>
                          <SelectItem value="evento">Evento</SelectItem>
                          <SelectItem value="pessoa_fisica">Pessoa Física</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                  </Select>
              </div>
              {/* Billing Period */}
              <div className="space-y-2">
                  <label htmlFor="billing_period" className="text-sm font-medium dark:text-gray-300"> Período Faturamento </label>
                  <Select
                      name="billing_period"
                      value={currentCustomer?.billing_period || "mensal"}
                      onValueChange={handleBillingPeriodChange}
                  >
                      <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                          <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                          <SelectItem value="diario">Diário</SelectItem>
                          <SelectItem value="semanal">Semanal</SelectItem>
                          <SelectItem value="quinzenal">Quinzenal</SelectItem>
                          <SelectItem value="mensal">Mensal</SelectItem>
                      </SelectContent>
                  </Select>
              </div>

              {/* Conditional Payment Day/Term Input */}
              <div className="space-y-2 md:col-span-2">
                {currentCustomer?.billing_period === 'mensal' ? (
                    <>
                        <label htmlFor="payment_day_monthly" className="text-sm font-medium dark:text-gray-300"> Dia de Pagamento (Mensal)</label>
                        <Input
                            id="payment_day_monthly"
                            name="payment_day_monthly"
                            type="number"
                            min="1"
                            max="31"
                            defaultValue={currentCustomer?.payment_day || ""}
                            placeholder="Ex: 10 (Dia 10 do mês)"
                            className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </>
                ) : currentCustomer?.billing_period === 'semanal' || currentCustomer?.billing_period === 'quinzenal' ? (
                    <>
                        <label htmlFor="payment_term_select" className="text-sm font-medium dark:text-gray-300"> Prazo de Pagamento</label>
                        <Select
                            name="payment_term"
                            value={selectedPaymentTerm?.toString() || ""}
                            onValueChange={(value) => setSelectedPaymentTerm(value ? parseInt(value, 10) : null)}
                        >
                            <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                <SelectValue placeholder="Selecione o prazo..." />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                {paymentTermOptions.length > 0 ? (
                                    paymentTermOptions.map(option => (
                                        <SelectItem key={option.value} value={option.value.toString()}>
                                            {option.label}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <SelectItem value={null} disabled>Nenhuma opção</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </>
                 ) : currentCustomer?.billing_period === 'diario' ? (
                     <p className="text-sm text-gray-500 dark:text-gray-400 pt-6">Pagamento diário (sem dia/prazo específico).</p>
                 ) : (
                    <>
                       <label htmlFor="payment_day_monthly_default" className="text-sm font-medium dark:text-gray-300"> Dia de Pagamento (Mensal)</label>
                       <Input
                            id="payment_day_monthly_default"
                            name="payment_day_monthly"
                            type="number"
                            min="1"
                            max="31"
                            defaultValue={currentCustomer?.payment_day || ""}
                            placeholder="Ex: 10 (Dia 10 do mês)"
                            className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </>
                 )}
              </div>
            </div>

             {/* Address */}
            <div className="space-y-2">
              <label htmlFor="address" className="text-sm font-medium flex items-center gap-1 dark:text-gray-300"><MapPin className="w-4 h-4" /> Endereço</label>
              <Input id="address" name="address" defaultValue={currentCustomer?.address} className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-medium dark:text-gray-300">Observações</label>
              <Textarea id="notes" name="notes" defaultValue={currentCustomer?.notes} className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
            </div>

            {/* Active Switch */}
            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="active"
                name="active"
                checked={currentCustomer ? currentCustomer.active : true}
                onCheckedChange={(checked) => {
                    setCurrentCustomer(prev => ({...(prev || {}), active: checked }));
                }}
              />
              <label htmlFor="active" className="text-sm font-medium dark:text-gray-300">
                Cliente Ativo
              </label>
            </div>

            {/* Footer Buttons */}
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700">
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                {currentCustomer ? "Salvar Alterações" : "Cadastrar Cliente"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
