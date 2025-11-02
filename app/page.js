'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Clock, Lock, Unlock, ChevronLeft, ChevronRight, AlertCircle, CheckCircle, Bell, Upload, Download, Users, FileText, TrendingUp, TrendingDown, BarChart3, Eye, LockIcon, LockOpen, Save } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [activeTab, setActiveTab] = useState('calendar');
  
  // Auth form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('pastor');
  const [church, setChurch] = useState('');
  const [region, setRegion] = useState('');
  const [state, setState] = useState('');
  const [authError, setAuthError] = useState('');
  
  // Calendar states
  const [currentDate, setCurrentDate] = useState(new Date());
  const [entries, setEntries] = useState([]);
  const [monthClosed, setMonthClosed] = useState(false);
  const [monthObservation, setMonthObservation] = useState('');
  const [dayObservations, setDayObservations] = useState([]);
  const [editingEntry, setEditingEntry] = useState(null);
  const [entryValue, setEntryValue] = useState('');
  const [entryNotes, setEntryNotes] = useState('');
  const [unlockRequests, setUnlockRequests] = useState([]);
  const [currentBrazilTime, setCurrentBrazilTime] = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  
  // Dashboard states
  const [dashboardData, setDashboardData] = useState(null);
  
  // Master panel states
  const [allUsers, setAllUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [stats, setStats] = useState(null);
  
  // Comparison states
  const [compareMonth1, setCompareMonth1] = useState(new Date().getMonth() + 1);
  const [compareYear1, setCompareYear1] = useState(new Date().getFullYear());
  const [compareMonth2, setCompareMonth2] = useState(new Date().getMonth());
  const [compareYear2, setCompareYear2] = useState(new Date().getFullYear());
  const [comparisonResult, setComparisonResult] = useState(null);
  
  const timeSlots = ['08:00', '10:00', '12:00', '15:00', '19:30'];
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
  }, []);
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchEntries();
      fetchCurrentTime();
      
      const interval = setInterval(() => {
        fetchEntries();
        fetchCurrentTime();
      }, 30000);
      
      if (user?.role === 'master') {
        fetchUnlockRequests();
        fetchAllUsers();
        fetchStats();
      }
      
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, currentDate]);
  
  const fetchCurrentTime = async () => {
    try {
      const res = await fetch('/api/time/current');
      const data = await res.json();
      if (data.time) {
        setCurrentBrazilTime(new Date(data.time));
      }
    } catch (error) {
      console.error('Error fetching time:', error);
    }
  };
  
  const fetchEntries = async () => {
    try {
      const res = await fetch('/api/entries/month', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          month: currentDate.getMonth() + 1,
          year: currentDate.getFullYear()
        })
      });
      const data = await res.json();
      if (data.entries) {
        setEntries(data.entries);
        setMonthClosed(data.monthClosed || false);
        setDayObservations(data.dayObservations || []);
        setMonthObservation(data.monthObservation || '');
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
    }
  };
  
  const fetchUnlockRequests = async () => {
    try {
      const res = await fetch('/api/unlock/requests', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.requests) {
        setUnlockRequests(data.requests);
      }
    } catch (error) {
      console.error('Error fetching unlock requests:', error);
    }
  };
  
  const fetchAllUsers = async () => {
    try {
      const res = await fetch('/api/users/list', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.users) {
        setAllUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };
  
  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/audit/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ limit: 50 })
      });
      const data = await res.json();
      if (data.logs) {
        setAuditLogs(data.logs);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  };
  
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats/overview', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };
  
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = authMode === 'login' 
        ? { email, password }
        : { name, email, password, role, church, region, state };
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        setIsAuthenticated(true);
      } else {
        setAuthError(data.error || 'Erro na autenticação');
      }
    } catch (error) {
      setAuthError('Erro ao conectar com o servidor');
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };
  
  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          month: currentDate.getMonth() + 1,
          year: currentDate.getFullYear()
        })
      });
      const data = await res.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    }
  };
  
  const handleCloseMonth = async () => {
    if (!confirm('Deseja realmente FECHAR este mês? Todos os lançamentos serão travados permanentemente.')) return;
    
    try {
      const res = await fetch('/api/month/close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          month: currentDate.getMonth() + 1,
          year: currentDate.getFullYear()
        })
      });
      
      if (res.ok) {
        toast.success('✅ Mês fechado com sucesso!', {
          description: 'Todos os lançamentos foram travados permanentemente.'
        });
        fetchEntries();
      }
    } catch (error) {
      toast.error('❌ Erro ao fechar mês', {
        description: 'Tente novamente ou contate o suporte.'
      });
    }
  };
  
  const handleReopenMonth = async () => {
    if (!confirm('Deseja realmente REABRIR este mês?')) return;
    
    try {
      const res = await fetch('/api/month/reopen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          month: currentDate.getMonth() + 1,
          year: currentDate.getFullYear()
        })
      });
      
      if (res.ok) {
        toast.success('✅ Mês reaberto com sucesso!');
        fetchEntries();
      }
    } catch (error) {
      toast.error('❌ Erro ao reabrir mês');
    }
  };
  
  const handleSaveMonthObservation = async () => {
    try {
      const res = await fetch('/api/observations/month', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          month: currentDate.getMonth() + 1,
          year: currentDate.getFullYear(),
          observation: monthObservation
        })
      });
      
      if (res.ok) {
        toast.success('💾 Observação do mês salva!');
      }
    } catch (error) {
      toast.error('❌ Erro ao salvar observação');
    }
  };

  
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };
  
  const getEntry = (day, timeSlot) => {
    return entries.find(e => 
      e.day === day && 
      e.timeSlot === timeSlot &&
      e.month === (currentDate.getMonth() + 1) &&
      e.year === currentDate.getFullYear()
    );
  };
  
  const isEntryLocked = (entry, currentTime) => {
    if (!entry || !currentTime) return { locked: false, reason: null, timeLeft: null };
    
    if (entry.timeWindowLocked && !entry.masterUnlocked) {
      return { locked: true, reason: 'time_window', timeLeft: null };
    }
    
    if (entry.value !== null && entry.value !== undefined && entry.value !== '' && entry.createdAt) {
      const createdTime = new Date(entry.createdAt);
      const oneHourLater = new Date(createdTime.getTime() + 60 * 60 * 1000);
      const now = currentTime;
      
      if (now > oneHourLater && !entry.masterUnlocked) {
        return { locked: true, reason: 'one_hour', timeLeft: null };
      }
      
      const timeLeftMs = oneHourLater - now;
      if (timeLeftMs > 0) {
        const minutes = Math.floor(timeLeftMs / 60000);
        return { locked: false, reason: null, timeLeft: `${minutes}min` };
      }
    }
    
    return { locked: false, reason: null, timeLeft: null };
  };
  
  const handleSaveEntry = async () => {
    if (!editingEntry) return;
    
    try {
      const res = await fetch('/api/entries/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          month: currentDate.getMonth() + 1,
          year: currentDate.getFullYear(),
          day: editingEntry.day,
          timeSlot: editingEntry.timeSlot,
          value: entryValue,
          notes: entryNotes
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setEditingEntry(null);
        setEntryValue('');
        setEntryNotes('');
        toast.success('✅ Lançamento salvo com sucesso!');
        fetchEntries();
      } else {
        if (data.locked) {
          toast.error('🔒 Entrada bloqueada', {
            description: data.error
          });
        } else {
          toast.error('❌ Erro ao salvar', {
            description: data.error || 'Tente novamente'
          });
        }
      }
    } catch (error) {
      toast.error('❌ Erro ao conectar com o servidor');
    }
  };
  
  const handleUploadReceipt = async (entryId, file) => {
    setUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entryId', entryId);
      
      const res = await fetch('/api/upload/receipt', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (res.ok) {
        toast.success('📎 Comprovante enviado com sucesso!');
        fetchEntries();
      } else {
        toast.error('❌ Erro ao enviar comprovante');
      }
    } catch (error) {
      toast.error('❌ Erro ao conectar com o servidor');
    } finally {
      setUploadingReceipt(false);
    }
  };
  
  const handleRequestUnlock = async (entryId) => {
    const reason = prompt('Informe o motivo da solicitação de liberação:');
    if (!reason) return;
    
    try {
      const res = await fetch('/api/unlock/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ entryId, reason })
      });
      
      if (res.ok) {
        alert('Solicitação enviada ao Líder Máximo!');
      }
    } catch (error) {
      alert('Erro ao enviar solicitação');
    }
  };
  
  const handleApproveUnlock = async (requestId, entryId) => {
    try {
      const res = await fetch('/api/unlock/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ requestId, entryId, durationMinutes: 60 })
      });
      
      if (res.ok) {
        alert('Liberação concedida por 1 hora!');
        fetchUnlockRequests();
        fetchEntries();
      }
    } catch (error) {
      alert('Erro ao aprovar liberação');
    }
  };
  
  const handleUpdatePermissions = async (userId, permissions) => {
    try {
      const res = await fetch('/api/users/permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId, permissions })
      });
      
      if (res.ok) {
        alert('Permissões atualizadas!');
        fetchAllUsers();
      }
    } catch (error) {
      alert('Erro ao atualizar permissões');
    }
  };
  
  const handleCompare = async () => {
    try {
      const res = await fetch('/api/compare/months', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          month1: compareMonth1,
          year1: compareYear1,
          month2: compareMonth2,
          year2: compareYear2
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        setComparisonResult(data);
      }
    } catch (error) {
      alert('Erro ao comparar períodos');
    }
  };
  
  const handleExportCSV = async () => {
    try {
      const res = await fetch('/api/export/csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          month: currentDate.getMonth() + 1,
          year: currentDate.getFullYear()
        })
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `iudp-${currentDate.getFullYear()}-${currentDate.getMonth() + 1}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        alert('Erro ao exportar CSV');
      }
    } catch (error) {
      alert('Erro ao exportar CSV');
    }
  };
  
  const calculateDayTotal = (day) => {
    let total = 0;
    timeSlots.forEach(slot => {
      const entry = getEntry(day, slot);
      if (entry && entry.value) {
        total += parseFloat(entry.value);
      }
    });
    return total;
  };
  
  const calculateMonthTotal = () => {
    const days = getDaysInMonth();
    let total = 0;
    for (let day = 1; day <= days; day++) {
      total += calculateDayTotal(day);
    }
    return total;
  };
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-2 border-yellow-500/20 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-xl border-4 border-white">
                <img 
                  src="https://customer-assets.emergentagent.com/job_ministry-ledger/artifacts/nuvau05n_LOGO%20IUDP.jpg" 
                  alt="IUDP Logo" 
                  className="w-20 h-20 rounded-full object-cover"
                />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-blue-900">Caderno de Controle Online</CardTitle>
            <CardDescription className="text-lg font-semibold text-yellow-700">Igreja Unida Deus Proverá</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={authMode} onValueChange={setAuthMode}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="register">Cadastrar</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleAuth} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                  {authError && (
                    <div className="text-red-600 text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {authError}
                    </div>
                  )}
                  <Button type="submit" className="w-full bg-blue-900 hover:bg-blue-800">
                    Entrar
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={handleAuth} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reg-email">Email</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reg-password">Senha</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Função</Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="master">Líder Máximo</SelectItem>
                        <SelectItem value="lider">Líder</SelectItem>
                        <SelectItem value="lideranca">Liderança</SelectItem>
                        <SelectItem value="secretaria">Secretária</SelectItem>
                        <SelectItem value="tesoureira">Tesoureira</SelectItem>
                        <SelectItem value="estadual">Estadual</SelectItem>
                        <SelectItem value="regional">Regional</SelectItem>
                        <SelectItem value="pastor">Pastor de Igreja</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="church">Igreja</Label>
                    <Input
                      id="church"
                      value={church}
                      onChange={(e) => setChurch(e.target.value)}
                      placeholder="Nome da igreja"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="region">Região</Label>
                    <Input
                      id="region"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      placeholder="Região"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="Estado"
                      className="mt-1"
                    />
                  </div>
                  {authError && (
                    <div className="text-red-600 text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {authError}
                    </div>
                  )}
                  <Button type="submit" className="w-full bg-blue-900 hover:bg-blue-800">
                    Cadastrar
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const daysInMonth = getDaysInMonth();
  const monthTotal = calculateMonthTotal();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg border-2 border-white">
                <img 
                  src="https://customer-assets.emergentagent.com/job_ministry-ledger/artifacts/nuvau05n_LOGO%20IUDP.jpg" 
                  alt="IUDP" 
                  className="w-10 h-10 rounded-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold">Caderno de Controle Online</h1>
                <p className="text-sm text-yellow-300">Igreja Unida Deus Proverá</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-semibold">{user?.name}</p>
                <Badge className="bg-yellow-500 text-blue-900 hover:bg-yellow-400">
                  {user?.role === 'master' ? 'Líder Máximo' : user?.role}
                </Badge>
              </div>
              {user?.role === 'master' && unlockRequests.length > 0 && (
                <Badge className="bg-red-500 hover:bg-red-600">
                  <Bell className="w-4 h-4 mr-1" />
                  {unlockRequests.length}
                </Badge>
              )}
              <Button variant="outline" onClick={handleLogout} className="text-blue-900 border-white hover:bg-white/10">
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="calendar">📅 Calendário</TabsTrigger>
            <TabsTrigger value="dashboard">📊 Dashboard</TabsTrigger>
            <TabsTrigger value="compare">📈 Comparações</TabsTrigger>
            {user?.role === 'master' && (
              <>
                <TabsTrigger value="panel">⚙️ Painel Master</TabsTrigger>
                <TabsTrigger value="audit">🔍 Auditoria</TabsTrigger>
              </>
            )}
          </TabsList>
          
          {/* CALENDAR TAB */}
          <TabsContent value="calendar">
            {/* Month Navigation */}
            <Card className="mb-6 border-2 border-blue-200">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                    className="border-blue-300"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Mês Anterior
                  </Button>
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-blue-900">
                      {format(currentDate, 'MMMM yyyy', { locale: ptBR }).toUpperCase()}
                    </h2>
                    {currentBrazilTime && (
                      <p className="text-sm text-gray-600 flex items-center justify-center gap-2 mt-1">
                        <Clock className="w-4 h-4" />
                        Horário de Brasília: {format(currentBrazilTime, 'dd/MM/yyyy HH:mm:ss')}
                      </p>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                    className="border-blue-300"
                  >
                    Próximo Mês
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <p className="text-3xl font-bold text-yellow-600">
                        Total: R$ {monthTotal.toFixed(2).replace('.', ',')}
                      </p>
                      {monthClosed && (
                        <Badge className="bg-red-500 text-white px-3 py-1 text-base">
                          <LockIcon className="w-4 h-4 mr-1" />
                          MÊS FECHADO
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {(user?.permissions?.canExport || user?.role === 'master') && (
                        <Button onClick={handleExportCSV} className="bg-green-600 hover:bg-green-700">
                          <Download className="w-4 h-4 mr-2" />
                          Exportar CSV
                        </Button>
                      )}
                      {user?.role === 'master' && (
                        <>
                          {!monthClosed ? (
                            <Button onClick={handleCloseMonth} className="bg-red-600 hover:bg-red-700">
                              <LockIcon className="w-4 h-4 mr-2" />
                              Fechar Mês
                            </Button>
                          ) : (
                            <Button onClick={handleReopenMonth} className="bg-orange-600 hover:bg-orange-700">
                              <LockOpen className="w-4 h-4 mr-2" />
                              Reabrir Mês
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Month Observation */}
                  <div className="border-t pt-4">
                    <Label htmlFor="month-obs" className="text-base font-semibold">
                      📝 Observação do Mês
                    </Label>
                    <div className="flex gap-2 mt-2">
                      <Textarea
                        id="month-obs"
                        value={monthObservation}
                        onChange={(e) => setMonthObservation(e.target.value)}
                        placeholder="Adicione observações gerais sobre este mês..."
                        rows={2}
                        className="flex-1"
                      />
                      <Button onClick={handleSaveMonthObservation} className="bg-blue-600 hover:bg-blue-700">
                        <Save className="w-4 h-4 mr-2" />
                        Salvar
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Unlock Requests */}
            {user?.role === 'master' && unlockRequests.length > 0 && (
              <Card className="mb-6 border-2 border-red-300 bg-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <Bell className="w-5 h-5" />
                    Solicitações de Liberação Pendentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {unlockRequests.map(req => (
                      <div key={req.requestId} className="flex items-center justify-between bg-white p-3 rounded border border-red-200">
                        <div>
                          <p className="font-semibold">{req.entryId}</p>
                          <p className="text-sm text-gray-600">Solicitante: {req.requesterName}</p>
                          <p className="text-sm text-gray-600">Motivo: {req.reason}</p>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => handleApproveUnlock(req.requestId, req.entryId)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Aprovar
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Calendar Grid */}
            <div className="space-y-4">
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const dayTotal = calculateDayTotal(day);
                
                return (
                  <Card key={day} className="border-2 border-blue-200 hover:shadow-lg transition-shadow">
                    <CardHeader className="bg-gradient-to-r from-blue-100 to-blue-50 pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg text-blue-900">
                          Dia {String(day).padStart(2, '0')}
                        </CardTitle>
                        <Badge className="bg-yellow-500 text-blue-900 text-base px-3">
                          Subtotal: R$ {dayTotal.toFixed(2).replace('.', ',')}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {timeSlots.map(timeSlot => {
                          const entry = getEntry(day, timeSlot);
                          const lockStatus = isEntryLocked(entry, currentBrazilTime);
                          
                          return (
                            <div key={timeSlot} className="border-2 border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors">
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant="outline" className="font-semibold text-blue-900">
                                  {timeSlot}
                                </Badge>
                                {lockStatus.locked ? (
                                  <Lock className="w-4 h-4 text-red-600" />
                                ) : lockStatus.timeLeft ? (
                                  <Badge variant="outline" className="text-xs text-orange-600">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {lockStatus.timeLeft}
                                  </Badge>
                                ) : (
                                  <Unlock className="w-4 h-4 text-green-600" />
                                )}
                              </div>
                              
                              {entry && entry.value ? (
                                <div>
                                  <p className="text-lg font-bold text-green-700">
                                    R$ {parseFloat(entry.value).toFixed(2).replace('.', ',')}
                                  </p>
                                  {entry.notes && (
                                    <p className="text-xs text-gray-600 mt-1 truncate" title={entry.notes}>
                                      {entry.notes}
                                    </p>
                                  )}
                                  {entry.receipts && entry.receipts.length > 0 && (
                                    <Badge className="mt-2 bg-blue-100 text-blue-700 text-xs">
                                      📎 {entry.receipts.length} arquivo(s)
                                    </Badge>
                                  )}
                                  {lockStatus.locked && (
                                    <div className="mt-2">
                                      <Badge className="bg-red-100 text-red-700 text-xs">
                                        {lockStatus.reason === 'time_window' ? '🔒 JANELA ENCERRADA' : '🔒 TRAVADO (1h)'}
                                      </Badge>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full mt-2 text-xs border-orange-300"
                                        onClick={() => handleRequestUnlock(entry.entryId)}
                                      >
                                        Solicitar Liberação
                                      </Button>
                                    </div>
                                  )}
                                  {!lockStatus.locked && (
                                    <div className="space-y-2 mt-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => {
                                          setEditingEntry({ day, timeSlot });
                                          setEntryValue(entry.value.toString());
                                          setEntryNotes(entry.notes || '');
                                        }}
                                      >
                                        Editar
                                      </Button>
                                      <label className="block">
                                        <input
                                          type="file"
                                          accept="image/*,application/pdf"
                                          className="hidden"
                                          onChange={(e) => {
                                            if (e.target.files[0]) {
                                              handleUploadReceipt(entry.entryId, e.target.files[0]);
                                            }
                                          }}
                                        />
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="w-full"
                                          type="button"
                                          onClick={(e) => e.currentTarget.previousSibling.click()}
                                          disabled={uploadingReceipt}
                                        >
                                          <Upload className="w-3 h-3 mr-1" />
                                          Comprovante
                                        </Button>
                                      </label>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  className="w-full bg-blue-600 hover:bg-blue-700"
                                  onClick={() => {
                                    setEditingEntry({ day, timeSlot });
                                    setEntryValue('');
                                    setEntryNotes('');
                                  }}
                                  disabled={lockStatus.locked}
                                >
                                  {lockStatus.locked ? 'Bloqueado' : '+ Lançar'}
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
          
          
          {/* DASHBOARD TAB */}
          <TabsContent value="dashboard">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-6 h-6" />
                  Dashboard Financeiro - {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!dashboardData ? (
                  <div className="text-center py-8">
                    <Button onClick={() => { fetchDashboard(); fetchEntries(); }}>
                      Carregar Dashboard
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <p className="text-sm text-gray-600">Total do Mês</p>
                            <p className="text-2xl font-bold text-green-600">
                              R$ {dashboardData.total?.toFixed(2).replace('.', ',')}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <p className="text-sm text-gray-600">Média por Entrada</p>
                            <p className="text-2xl font-bold text-blue-600">
                              R$ {dashboardData.average?.toFixed(2).replace('.', ',')}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <p className="text-sm text-gray-600">Total de Entradas</p>
                            <p className="text-2xl font-bold text-purple-600">
                              {dashboardData.entryCount}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <p className="text-sm text-gray-600">Dias com Lançamentos</p>
                            <p className="text-2xl font-bold text-orange-600">
                              {dashboardData.dailyData?.length || 0}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {/* Daily Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Arrecadação por Dia</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={dashboardData.dailyData || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="day" label={{ value: 'Dia do Mês', position: 'insideBottom', offset: -5 }} />
                            <YAxis label={{ value: 'Valor (R$)', angle: -90, position: 'insideLeft' }} />
                            <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
                            <Legend />
                            <Bar dataKey="total" fill="#3b82f6" name="Total" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                    
                    {/* Time Slot Distribution */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Distribuição por Horário</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={dashboardData.timeSlotData || []}
                                dataKey="total"
                                nameKey="timeSlot"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label={(entry) => `${entry.timeSlot}: R$ ${entry.total.toFixed(2)}`}
                              >
                                {(dashboardData.timeSlotData || []).map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
                            </PieChart>
                          </ResponsiveContainer>
                          
                          <div className="space-y-3">
                            {(dashboardData.timeSlotData || []).map((slot, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-4 h-4 rounded" 
                                    style={{ backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][idx % 5] }}
                                  ></div>
                                  <span className="font-semibold">{slot.timeSlot}</span>
                                </div>
                                <span className="text-green-600 font-bold">
                                  R$ {slot.total.toFixed(2).replace('.', ',')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Trend Line */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Tendência do Mês</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={dashboardData.dailyData || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="day" label={{ value: 'Dia do Mês', position: 'insideBottom', offset: -5 }} />
                            <YAxis label={{ value: 'Valor (R$)', angle: -90, position: 'insideLeft' }} />
                            <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
                            <Legend />
                            <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} name="Arrecadação" />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* COMPARISON TAB */}
          <TabsContent value="compare">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-6 h-6" />
                  Comparação de Períodos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border-2 border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold mb-3 text-blue-900">Período 1</h3>
                    <div className="space-y-3">
                      <div>
                        <Label>Mês</Label>
                        <Select value={compareMonth1.toString()} onValueChange={(v) => setCompareMonth1(parseInt(v))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {monthNames.map((name, idx) => (
                              <SelectItem key={idx} value={(idx + 1).toString()}>{name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Ano</Label>
                        <Input
                          type="number"
                          value={compareYear1}
                          onChange={(e) => setCompareYear1(parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-2 border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold mb-3 text-green-900">Período 2</h3>
                    <div className="space-y-3">
                      <div>
                        <Label>Mês</Label>
                        <Select value={compareMonth2.toString()} onValueChange={(v) => setCompareMonth2(parseInt(v))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {monthNames.map((name, idx) => (
                              <SelectItem key={idx} value={(idx + 1).toString()}>{name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Ano</Label>
                        <Input
                          type="number"
                          value={compareYear2}
                          onChange={(e) => setCompareYear2(parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <Button onClick={handleCompare} className="w-full bg-blue-900 hover:bg-blue-800">
                  Comparar Períodos
                </Button>
                
                {comparisonResult && (
                  <div className="border-2 border-yellow-300 rounded-lg p-6 bg-yellow-50">
                    <h3 className="text-xl font-bold mb-4 text-center">Resultado da Comparação</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-sm text-gray-600 mb-1">
                            {monthNames[comparisonResult.period1.month - 1]} {comparisonResult.period1.year}
                          </p>
                          <p className="text-2xl font-bold text-blue-900">
                            R$ {comparisonResult.period1.total.toFixed(2).replace('.', ',')}
                          </p>
                          <p className="text-xs text-gray-500">{comparisonResult.period1.entries} lançamentos</p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-sm text-gray-600 mb-1">
                            {monthNames[comparisonResult.period2.month - 1]} {comparisonResult.period2.year}
                          </p>
                          <p className="text-2xl font-bold text-green-900">
                            R$ {comparisonResult.period2.total.toFixed(2).replace('.', ',')}
                          </p>
                          <p className="text-xs text-gray-500">{comparisonResult.period2.entries} lançamentos</p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="text-center p-4 bg-white rounded-lg">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        {comparisonResult.percentChange > 0 ? (
                          <TrendingUp className="w-8 h-8 text-green-600" />
                        ) : comparisonResult.percentChange < 0 ? (
                          <TrendingDown className="w-8 h-8 text-red-600" />
                        ) : null}
                        <span className="text-3xl font-bold">
                          {comparisonResult.percentChange > 0 ? '+' : ''}
                          {comparisonResult.percentChange.toFixed(2)}%
                        </span>
                      </div>
                      <p className="text-lg">
                        Baseado em {monthNames[comparisonResult.period1.month - 1]}, 
                        {monthNames[comparisonResult.period2.month - 1]} teve {comparisonResult.analysis}.
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        Diferença: R$ {Math.abs(comparisonResult.difference).toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* MASTER PANEL TAB */}
          {user?.role === 'master' && (
            <TabsContent value="panel">
              <div className="space-y-6">
                {/* Statistics */}
                <Card className="border-2 border-yellow-400">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-6 h-6" />
                      Estatísticas Gerais
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                          <p className="text-2xl font-bold">{stats.totalUsers}</p>
                          <p className="text-sm text-gray-600">Usuários</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <FileText className="w-8 h-8 mx-auto mb-2 text-green-600" />
                          <p className="text-2xl font-bold">{stats.totalEntries}</p>
                          <p className="text-sm text-gray-600">Lançamentos</p>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                          <Bell className="w-8 h-8 mx-auto mb-2 text-red-600" />
                          <p className="text-2xl font-bold">{stats.pendingRequests}</p>
                          <p className="text-sm text-gray-600">Pendentes</p>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                          <TrendingUp className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                          <p className="text-2xl font-bold">R$ {stats.currentMonthTotal.toFixed(2)}</p>
                          <p className="text-sm text-gray-600">Mês Atual</p>
                        </div>
                      </div>
                    ) : (
                      <Button onClick={fetchStats}>Carregar Estatísticas</Button>
                    )}
                  </CardContent>
                </Card>
                
                {/* User Management */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-6 h-6" />
                      Gerenciamento de Usuários
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {allUsers.length === 0 ? (
                      <Button onClick={fetchAllUsers}>Carregar Usuários</Button>
                    ) : (
                      <div className="space-y-3">
                        {allUsers.map(u => (
                          <Card key={u.userId} className="border border-gray-200">
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-semibold">{u.name}</p>
                                  <p className="text-sm text-gray-600">{u.email}</p>
                                  <Badge className="mt-1">{u.role}</Badge>
                                  {u.church && <p className="text-xs text-gray-500 mt-1">🏛️ {u.church}</p>}
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={u.permissions?.canPrint}
                                      onCheckedChange={(checked) => {
                                        handleUpdatePermissions(u.userId, { ...u.permissions, canPrint: checked });
                                      }}
                                    />
                                    <Label className="text-sm">Imprimir</Label>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={u.permissions?.canExport}
                                      onCheckedChange={(checked) => {
                                        handleUpdatePermissions(u.userId, { ...u.permissions, canExport: checked });
                                      }}
                                    />
                                    <Label className="text-sm">Exportar</Label>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={u.permissions?.canShare}
                                      onCheckedChange={(checked) => {
                                        handleUpdatePermissions(u.userId, { ...u.permissions, canShare: checked });
                                      }}
                                    />
                                    <Label className="text-sm">Compartilhar</Label>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
          
          {/* AUDIT TAB */}
          {user?.role === 'master' && (
            <TabsContent value="audit">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="w-6 h-6" />
                      Logs de Auditoria
                    </CardTitle>
                    <Button onClick={fetchAuditLogs}>Atualizar</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {auditLogs.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Nenhum log encontrado</p>
                  ) : (
                    <div className="space-y-2">
                      {auditLogs.map(log => (
                        <div key={log.logId} className="border border-gray-200 rounded p-3 text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="outline">{log.action}</Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(log.timestamp).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-gray-700">
                            <span className="font-semibold">{log.userName || log.userId}</span>
                          </p>
                          {log.details && (
                            <p className="text-xs text-gray-500 mt-1">
                              {JSON.stringify(log.details)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
      
      {/* Entry Edit Modal */}
      {editingEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md border-2 border-blue-300">
            <CardHeader>
              <CardTitle>
                Lançamento - Dia {String(editingEntry.day).padStart(2, '0')} às {editingEntry.timeSlot}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="value">Valor (R$)</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  value={entryValue}
                  onChange={(e) => setEntryValue(e.target.value)}
                  placeholder="0,00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={entryNotes}
                  onChange={(e) => setEntryNotes(e.target.value)}
                  placeholder="Observações sobre este lançamento"
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleSaveEntry} 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Salvar
                </Button>
                <Button 
                  onClick={() => {
                    setEditingEntry(null);
                    setEntryValue('');
                    setEntryNotes('');
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}