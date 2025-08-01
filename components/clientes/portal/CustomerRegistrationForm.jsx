'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Customer } from '@/app/api/entities';
import { UploadFile } from '@/app/api/integrations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import {
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  File,
  CheckCircle,
  Loader2
} from 'lucide-react';

export default function CustomerRegistrationForm({ customerId }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    address: '',
    cnpj: '',
    phone: '',
    email: '',
    category: 'pessoa_fisica',
    billing_period: 'mensal',
    payment_day: '',
    notes: ''
  });
  
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    loadCustomer();
  }, [customerId]);

  const loadCustomer = async () => {
    try {
      const customerData = await Customer.get(customerId);
      
      if (!customerData) {
        toast({
          title: "Cliente não encontrado",
          description: "Este link de cadastro não é válido.",
          variant: "destructive"
        });
        return;
      }

      setCustomer(customerData);
      setUploadedPhotoUrl(customerData.photo || '');
      
      // Preencher formulário com dados existentes
      setFormData({
        name: customerData.name || '',
        company: customerData.company || '',
        address: customerData.address || '',
        cnpj: customerData.cnpj || '',
        phone: customerData.phone || '',
        email: customerData.email || '',
        category: customerData.category || 'pessoa_fisica',
        billing_period: customerData.billing_period || 'mensal',
        payment_day: customerData.payment_day || '',
        notes: customerData.notes || ''
      });
      
    } catch (error) {
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados do cliente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const result = await UploadFile({ file });
      if (result.success && result.file_url) {
        setUploadedPhotoUrl(result.file_url);
        toast({ 
          title: "Upload Concluído", 
          description: "Foto carregada com sucesso." 
        });
      } else {
        throw new Error(result.error || "Erro no upload do arquivo.");
      }
    } catch (error) {
      toast({
        title: "Erro de Upload",
        description: `Não foi possível carregar a foto. ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "O nome é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        ...formData,
        photo: uploadedPhotoUrl,
        pending_registration: false, // Marcar como cadastro completo
        notes: formData.notes || "Cadastro completado pelo cliente via portal"
      };

      await Customer.update(customerId, updateData);
      
      toast({
        title: "Cadastro concluído!",
        description: "Seus dados foram salvos com sucesso. Redirecionando...",
      });

      // Redirecionar para a página de pedidos após 2 segundos
      setTimeout(() => {
        router.push(`/portal/${customerId}/orders`);
      }, 2000);

    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: `Não foi possível salvar o cadastro. ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Portal do Cliente
            </h2>
            <p className="text-gray-600">Carregando dados do cadastro...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Link Inválido
            </h2>
            <p className="text-gray-600">Link de cadastro inválido ou expirado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se o cliente já completou o cadastro, redirecionar
  if (!customer.pending_registration) {
    router.push(`/portal/${customerId}/orders`);
    return null;
  }

  return (
    <div className="py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <User className="w-6 h-6" />
              Complete seu Cadastro
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Olá {customer.name}! Complete suas informações para começar a fazer pedidos.
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Foto */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Foto (opcional)</label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={uploadedPhotoUrl} alt={formData.name} />
                    <AvatarFallback>
                      {formData.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Nome */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <User className="w-4 h-4" /> Nome Completo *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>

              {/* Empresa */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Building2 className="w-4 h-4" /> Empresa
                </label>
                <Input
                  value={formData.company}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                />
              </div>

              {/* CNPJ */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <File className="w-4 h-4" /> CNPJ
                </label>
                <Input
                  value={formData.cnpj}
                  onChange={(e) => handleInputChange('cnpj', e.target.value)}
                />
              </div>

              {/* Telefone */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Phone className="w-4 h-4" /> Telefone
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Mail className="w-4 h-4" /> Email
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>

              {/* Endereço */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <MapPin className="w-4 h-4" /> Endereço
                </label>
                <Input
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                />
              </div>

              {/* Categoria */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Categoria</label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleInputChange('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restaurante">Restaurante</SelectItem>
                    <SelectItem value="evento">Evento</SelectItem>
                    <SelectItem value="pessoa_fisica">Pessoa Física</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Observações</label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Informações adicionais..."
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={saving || !formData.name.trim()}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Concluir Cadastro
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}