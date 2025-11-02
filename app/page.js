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
import { Clock, Lock, Unlock, ChevronLeft, ChevronRight, AlertCircle, CheckCircle, Bell } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  
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
  const [editingEntry, setEditingEntry] = useState(null);
  const [entryValue, setEntryValue] = useState('');
  const [entryNotes, setEntryNotes] = useState('');
  const [unlockRequests, setUnlockRequests] = useState([]);
  const [currentBrazilTime, setCurrentBrazilTime] = useState(null);
  
  const timeSlots = ['08:00', '10:00', '12:00', '15:00', '19:30'];
  
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
      }, 30000); // Update every 30 seconds
      
      if (user?.role === 'master') {
        fetchUnlockRequests();
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
    
    // Check time window lock
    if (entry.timeWindowLocked && !entry.masterUnlocked) {
      return { locked: true, reason: 'time_window', timeLeft: null };
    }
    
    // Check 1-hour edit lock
    if (entry.value !== null && entry.value !== undefined && entry.value !== '' && entry.createdAt) {
      const createdTime = new Date(entry.createdAt);
      const oneHourLater = new Date(createdTime.getTime() + 60 * 60 * 1000);
      const now = currentTime;
      
      if (now > oneHourLater && !entry.masterUnlocked) {
        return { locked: true, reason: 'one_hour', timeLeft: null };
      }
      
      // Calculate time left for editing
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
        fetchEntries();
      } else {
        if (data.locked) {
          alert(data.error);
        } else {
          alert(data.error || 'Erro ao salvar lançamento');
        }
      }
    } catch (error) {
      alert('Erro ao conectar com o servidor');
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
            <div className="mt-4 text-center">
              <p className="text-3xl font-bold text-yellow-600">
                Total do Mês: R$ {monthTotal.toFixed(2).replace('.', ',')}
              </p>
            </div>
          </CardContent>
        </Card>
        
        {/* Unlock Requests (Master only) */}
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
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full mt-2"
                                  onClick={() => {
                                    setEditingEntry({ day, timeSlot });
                                    setEntryValue(entry.value.toString());
                                    setEntryNotes(entry.notes || '');
                                  }}
                                >
                                  Editar
                                </Button>
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