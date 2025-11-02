'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Lock, Unlock, ChevronLeft, ChevronRight, AlertCircle, CheckCircle, Bell, Upload, Download, Users, FileText, TrendingUp, TrendingDown, BarChart3, Eye, Lock as LockIcon, LockOpen, LayoutDashboard } from 'lucide-react';
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
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  
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
      fetchDashboard();
      
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
        setMonthClosed(data.monthClosed);
        setDayObservations(data.dayObservations || []);
        setMonthObservation(data.monthObservation || '');
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
    }
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
        alert('Mês fechado com sucesso!');
        fetchEntries();
      }
    } catch (error) {
      alert('Erro ao fechar mês');
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
        alert('Mês reaberto com sucesso!');
        fetchEntries();
      }
    } catch (error) {
      alert('Erro ao reabrir mês');
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
        alert('Observação do mês salva!');
      }
    } catch (error) {
      alert('Erro ao salvar observação');
    }
  };
  
  // Continue with other handler functions...
  // Due to length, I'll create the remaining handlers in the next part
  
  if (!isAuthenticated) {
    // Login UI (same as before)
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
          
          {/* Continue in next message due to length... */}
        </Tabs>
      </div>
    </div>
  );
}
