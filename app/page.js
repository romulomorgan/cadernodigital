'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Configurar dayjs com timezone para SEMPRE usar America/Sao_Paulo
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('America/Sao_Paulo');

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Clock, Lock, Unlock, ChevronLeft, ChevronRight, AlertCircle, CheckCircle, Bell, Upload, Download, Users, FileText, TrendingUp, TrendingDown, BarChart3, Eye, LockIcon, LockOpen, Save, X, ArrowLeft, ArrowRight, Printer } from 'lucide-react';
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
  const [monthObservationActive, setMonthObservationActive] = useState(false);
  const [dayObservations, setDayObservations] = useState([]);
  const [editingEntry, setEditingEntry] = useState(null);
  const [entryValue, setEntryValue] = useState('');
  const [entryNotes, setEntryNotes] = useState('');
  const [unlockRequests, setUnlockRequests] = useState([]);
  const [currentBrazilTime, setCurrentBrazilTime] = useState(null);
  const [liveClockTime, setLiveClockTime] = useState(null); // Relógio digital tempo real
  const [clockSyncError, setClockSyncError] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [editingDayObs, setEditingDayObs] = useState(null); // { day: number }
  const [dayObsText, setDayObsText] = useState('');
  
  // Receipt viewer - FASE 4
  const [viewingReceipts, setViewingReceipts] = useState(null); // { entryId, receipts: [], currentIndex: 0 }
  
  // Timezone notification - Aviso Institucional
  const [showTimezoneNotice, setShowTimezoneNotice] = useState(false);
  
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
  
  // Filter states - FASE 3
  const [filterState, setFilterState] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [filterChurch, setFilterChurch] = useState('');
  const [availableStates, setAvailableStates] = useState([]);
  const [availableRegions, setAvailableRegions] = useState([]);
  const [availableChurches, setAvailableChurches] = useState([]);
  
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
  
  // Verificar se precisa mostrar aviso de timezone
  useEffect(() => {
    if (isAuthenticated && user) {
      const timezoneNoticeShown = localStorage.getItem(`timezone_notice_${user.userId}`);
      if (!timezoneNoticeShown) {
        setShowTimezoneNotice(true);
      }
    }
  }, [isAuthenticated, user]);
  
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
  }, [isAuthenticated, currentDate, filterState, filterRegion, filterChurch]);
  
  // Relógio Digital - atualiza a cada segundo com America/Sao_Paulo
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const updateClock = async () => {
      try {
        const res = await fetch('/api/time/current');
        const data = await res.json();
        if (data.time) {
          // Backend JÁ retorna em America/Sao_Paulo, não converter novamente
          setLiveClockTime(new Date(data.time));
          setClockSyncError(false);
        }
      } catch (error) {
        setClockSyncError(true);
      }
    };
    
    // Atualização inicial
    updateClock();
    
    // Atualizar a cada segundo usando dayjs
    const tickInterval = setInterval(() => {
      if (liveClockTime) {
        const nextSecond = dayjs(liveClockTime).add(1, 'second');
        setLiveClockTime(nextSecond.toDate());
      }
    }, 1000);
    
    const syncInterval = setInterval(updateClock, 30000);
    
    return () => {
      clearInterval(tickInterval);
      clearInterval(syncInterval);
    };
  }, [isAuthenticated]);
  
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
      const body = {
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear()
      };
      
      // Adicionar filtros se definidos (FASE 3)
      if (filterState) body.state = filterState;
      if (filterRegion) body.region = filterRegion;
      if (filterChurch) body.church = filterChurch;
      
      const res = await fetch('/api/entries/month', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.entries) {
        setEntries(data.entries);
        setMonthClosed(data.monthClosed || false);
        setDayObservations(data.dayObservations || []);
        
        // Extrair estados/regiões/igrejas únicos para filtros
        if (user?.role === 'master' || user?.scope === 'global') {
          const states = [...new Set(data.entries.map(e => e.state).filter(Boolean))];
          const regions = [...new Set(data.entries.map(e => e.region).filter(Boolean))];
          const churches = [...new Set(data.entries.map(e => e.church).filter(Boolean))];
          setAvailableStates(states);
          setAvailableRegions(regions);
          setAvailableChurches(churches);
        }
        
        // Restaurar do backup local se servidor estiver vazio
        const backupKey = `obs_${currentDate.getFullYear()}_${currentDate.getMonth() + 1}`;
        const localBackup = localStorage.getItem(backupKey);
        
        if (data.monthObservation) {
          setMonthObservation(data.monthObservation.observation || data.monthObservation);
          setMonthObservationActive(data.monthObservation.active || false);
        } else if (localBackup) {
          setMonthObservation(localBackup);
          setMonthObservationActive(false);
          toast.info('📝 Rascunho local restaurado', {
            description: 'Clique em Salvar para sincronizar'
          });
        } else {
          setMonthObservation('');
          setMonthObservationActive(false);
        }
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
    if (!confirm('⚠️ Deseja realmente FECHAR este mês? Todos os lançamentos serão travados permanentemente.')) return;
    
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
      } else {
        const error = await res.json();
        toast.error('❌ Erro ao fechar mês', {
          description: error.error || 'Tente novamente'
        });
      }
    } catch (error) {
      toast.error('❌ Erro ao fechar mês', {
        description: 'Falha na comunicação com o servidor. Tente novamente ou contate o suporte.'
      });
    }
  };
  
  const handleReopenMonth = async () => {
    // DUPLA CONFIRMAÇÃO para reabrir mês
    if (!confirm('⚠️ ATENÇÃO: Deseja realmente REABRIR este mês?')) return;
    
    if (!confirm('🔐 CONFIRMAÇÃO FINAL: Isso permitirá que usuários editem lançamentos novamente. Continuar?')) return;
    
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
        toast.success('✅ Mês reaberto com sucesso!', {
          description: 'Usuários podem editar lançamentos novamente.'
        });
        fetchEntries();
      } else {
        const error = await res.json();
        toast.error('❌ Erro ao reabrir mês', {
          description: error.error || 'Tente novamente'
        });
      }
    } catch (error) {
      toast.error('❌ Erro ao reabrir mês', {
        description: 'Falha na comunicação com o servidor'
      });
    }
  };
  
  const handleTimezoneNoticeConfirm = async () => {
    try {
      // Salvar no localStorage
      localStorage.setItem(`timezone_notice_${user.userId}`, 'true');
      
      // Registrar no audit log
      await fetch('/api/audit/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'timezone_notice_confirmed',
          details: {
            message: 'Mensagem atualização horário Brasília confirmada pelo usuário'
          }
        })
      });
      
      setShowTimezoneNotice(false);
      toast.success('✅ Confirmado', {
        description: 'Horário de Brasília será usado em todos os registros'
      });
    } catch (error) {
      console.error('Erro ao registrar confirmação:', error);
      setShowTimezoneNotice(false);
    }
  };
  
  const handleSaveMonthObservation = async () => {
    if (monthObservation.length > MAX_OBSERVATION_LENGTH) {
      toast.error(`❌ Texto muito longo (${monthObservation.length}/${MAX_OBSERVATION_LENGTH})`);
      return;
    }
    
    // Salvar em localStorage como backup
    const backupKey = `obs_${currentDate.getFullYear()}_${currentDate.getMonth() + 1}`;
    localStorage.setItem(backupKey, monthObservation);
    
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
          observation: monthObservation,
          active: monthObservationActive
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || '✅ Observação salva');
        localStorage.removeItem(backupKey);
      } else {
        const error = await res.json();
        toast.error(`❌ ${error.error || 'Erro ao salvar'}`);
      }
    } catch (error) {
      toast.error('❌ Erro ao conectar');
    }
  };
  
  const handleSaveDayObservation = async (day) => {
    try {
      const res = await fetch('/api/observations/day', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          month: currentDate.getMonth() + 1,
          year: currentDate.getFullYear(),
          day: day,
          observation: dayObsText
        })
      });
      
      if (res.ok) {
        toast.success('📝 Observação do dia salva!');
        setEditingDayObs(null);
        setDayObsText('');
        fetchEntries(); // Recarregar para atualizar dayObservations
      } else {
        const error = await res.json();
        toast.error('❌ Erro ao salvar', {
          description: error.error
        });
      }
    } catch (error) {
      toast.error('❌ Erro de conexão');
    }
  };
  
  const getDayObservation = (day) => {
    return dayObservations.find(obs => 
      obs.day === day && 
      obs.month === (currentDate.getMonth() + 1) && 
      obs.year === currentDate.getFullYear()
    );
  };
  
  const MAX_OBSERVATION_LENGTH = 10000;

  
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
    if (!file) {
      toast.error('❌ Nenhum arquivo selecionado');
      return;
    }
    
    setUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entryId', entryId);
      
      console.log('[FRONTEND] Enviando comprovante para entryId:', entryId);
      
      const res = await fetch('/api/upload/receipt', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success('📎 Comprovante enviado com sucesso!');
        fetchEntries(); // Recarrega para mostrar o comprovante
      } else {
        toast.error(`❌ ${data.error || 'Erro ao enviar comprovante'}`, {
          description: data.details || ''
        });
      }
    } catch (error) {
      console.error('[FRONTEND] Erro no upload:', error);
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
        toast.success('📨 Solicitação enviada ao Líder Máximo!');
      }
    } catch (error) {
      toast.error('❌ Erro ao enviar solicitação');
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
        toast.success('✅ Liberação concedida por 1 hora!');
        fetchUnlockRequests();
        fetchEntries();
      }
    } catch (error) {
      toast.error('❌ Erro ao aprovar liberação');
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
        toast.success('✅ Permissões atualizadas!');
        fetchAllUsers();
      }
    } catch (error) {
      toast.error('❌ Erro ao atualizar permissões');
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
      toast.error('❌ Erro ao comparar períodos');
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
        toast.success('📥 CSV exportado com sucesso!');
      } else {
        toast.error('❌ Erro ao exportar CSV');
      }
    } catch (error) {
      toast.error('❌ Erro ao exportar CSV');
    }
  };
  
  const handlePrint = () => {
    // FASE 4: Impressão de relatório
    const printWindow = window.open('', '_blank');
    const monthName = format(currentDate, 'MMMM yyyy', { locale: ptBR });
    const total = calculateMonthTotal();
    
    let printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório - ${monthName}</title>
        <style>
          @media print {
            @page { margin: 2cm; }
          }
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: black;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #1e40af;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #1e40af;
            margin: 10px 0;
          }
          .header p {
            color: #666;
            margin: 5px 0;
          }
          .summary {
            background: #f3f4f6;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          .summary h3 {
            margin-top: 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
          }
          th {
            background-color: #1e40af;
            color: white;
          }
          tr:nth-child(even) {
            background-color: #f9fafb;
          }
          .total-row {
            font-weight: bold;
            background-color: #fef3c7 !important;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Caderno de Controle Online - IUDP</h1>
          <h2>Igreja Unida Deus Proverá</h2>
          <p>Relatório Financeiro - ${monthName.toUpperCase()}</p>
          <p>Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
        </div>
        
        <div class="summary">
          <h3>Resumo do Período</h3>
          <p><strong>Total Arrecadado:</strong> R$ ${total.toFixed(2).replace('.', ',')}</p>
          <p><strong>Período:</strong> ${monthName}</p>
          ${filterState ? `<p><strong>Estado:</strong> ${filterState}</p>` : ''}
          ${filterRegion ? `<p><strong>Região:</strong> ${filterRegion}</p>` : ''}
          ${filterChurch ? `<p><strong>Igreja:</strong> ${filterChurch}</p>` : ''}
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Dia</th>
              <th>08:00</th>
              <th>10:00</th>
              <th>12:00</th>
              <th>15:00</th>
              <th>19:30</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    const days = getDaysInMonth();
    for (let day = 1; day <= days; day++) {
      const dayTotal = calculateDayTotal(day);
      printHTML += `<tr>`;
      printHTML += `<td><strong>${String(day).padStart(2, '0')}</strong></td>`;
      
      timeSlots.forEach(slot => {
        const entry = getEntry(day, slot);
        const value = entry && entry.value ? `R$ ${parseFloat(entry.value).toFixed(2).replace('.', ',')}` : '-';
        printHTML += `<td>${value}</td>`;
      });
      
      printHTML += `<td><strong>R$ ${dayTotal.toFixed(2).replace('.', ',')}</strong></td>`;
      printHTML += `</tr>`;
    }
    
    printHTML += `
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="6"><strong>TOTAL DO MÊS</strong></td>
              <td><strong>R$ ${total.toFixed(2).replace('.', ',')}</strong></td>
            </tr>
          </tfoot>
        </table>
        
        <div class="footer">
          <p>Este documento foi gerado automaticamente pelo sistema Caderno de Controle Online - IUDP</p>
          <p>Para dúvidas ou mais informações, entre em contato com a administração</p>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(printHTML);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      toast.success('🖨️ Relatório preparado para impressão');
    }, 250);
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
              {/* Relógio Digital - Horário de Brasília */}
              <div className="hidden md:flex flex-col items-end bg-blue-800/50 px-4 py-2 rounded-lg border border-yellow-500/30">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-400" />
                  {liveClockTime && !clockSyncError ? (
                    <span className="text-lg font-mono font-bold text-yellow-300">
                      {dayjs(liveClockTime).format('DD/MM/YYYY — HH:mm:ss')}
                    </span>
                  ) : clockSyncError ? (
                    <span className="text-sm text-orange-300 animate-pulse">
                      Sincronizando com Brasil — aguarde…
                    </span>
                  ) : (
                    <span className="text-sm text-gray-300">Carregando...</span>
                  )}
                </div>
                <p className="text-xs text-gray-300 mt-0.5">
                  Horário Oficial de Brasília (GMT-3)
                </p>
              </div>
              
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
                <TabsTrigger value="gestao">👥 Acesso & Permissões</TabsTrigger>
                <TabsTrigger value="igrejas">🏛️ Igrejas</TabsTrigger>
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
                
                {/* Filtros Hierárquicos - FASE 3 */}
                {(user?.role === 'master' || user?.scope === 'global') && (availableStates.length > 0 || availableRegions.length > 0 || availableChurches.length > 0) && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className="bg-blue-600">🔍 Filtros Hierárquicos</Badge>
                      {(filterState || filterRegion || filterChurch) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setFilterState('');
                            setFilterRegion('');
                            setFilterChurch('');
                          }}
                          className="h-6 text-xs"
                        >
                          Limpar Filtros ✕
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {availableStates.length > 0 && (
                        <div>
                          <Label className="text-xs text-gray-600 mb-1 block">Estado</Label>
                          <Select value={filterState || undefined} onValueChange={(value) => setFilterState(value || '')}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Todos os Estados" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableStates.map(state => (
                                <SelectItem key={state} value={state}>{state}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {availableRegions.length > 0 && (
                        <div>
                          <Label className="text-xs text-gray-600 mb-1 block">Região</Label>
                          <Select value={filterRegion || undefined} onValueChange={(value) => setFilterRegion(value || '')}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Todas as Regiões" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableRegions.map(region => (
                                <SelectItem key={region} value={region}>{region}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {availableChurches.length > 0 && (
                        <div>
                          <Label className="text-xs text-gray-600 mb-1 block">Igreja</Label>
                          <Select value={filterChurch || undefined} onValueChange={(value) => setFilterChurch(value || '')}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Todas as Igrejas" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableChurches.map(church => (
                                <SelectItem key={church} value={church}>{church}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
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
                        <>
                          <Button onClick={handleExportCSV} className="bg-green-600 hover:bg-green-700">
                            <Download className="w-4 h-4 mr-2" />
                            Exportar CSV
                          </Button>
                          {(user?.permissions?.canPrint || user?.role === 'master') && (
                            <Button onClick={handlePrint} className="bg-purple-600 hover:bg-purple-700">
                              <Printer className="w-4 h-4 mr-2" />
                              Imprimir
                            </Button>
                          )}
                        </>
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
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="month-obs" className="text-base font-semibold">
                        📝 Observação do Mês
                      </Label>
                      <span className="text-xs text-gray-500">
                        {monthObservation.length} / {MAX_OBSERVATION_LENGTH} caracteres
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Textarea
                        id="month-obs"
                        value={monthObservation}
                        onChange={(e) => setMonthObservation(e.target.value)}
                        placeholder="Adicione observações gerais sobre este mês..."
                        rows={3}
                        className="flex-1"
                        maxLength={MAX_OBSERVATION_LENGTH}
                      />
                      <Button 
                        onClick={handleSaveMonthObservation} 
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={uploadingReceipt}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {uploadingReceipt ? 'Salvando...' : 'Salvar'}
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
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-xs"
                            onClick={() => {
                              const obs = getDayObservation(day);
                              setEditingDayObs({ day });
                              setDayObsText(obs?.observation || '');
                            }}
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            {getDayObservation(day) ? 'Ver Obs' : '+ Obs'}
                          </Button>
                          <Badge className="bg-yellow-500 text-blue-900 text-base px-3">
                            Subtotal: R$ {dayTotal.toFixed(2).replace('.', ',')}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      {/* Day Observation Editor */}
                      {editingDayObs?.day === day && (
                        <div className="mb-4 p-4 border-2 border-blue-300 rounded-lg bg-blue-50">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="font-semibold text-blue-900">
                              📝 Observação do Dia {day}
                            </Label>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingDayObs(null);
                                setDayObsText('');
                              }}
                            >
                              ✕
                            </Button>
                          </div>
                          <Textarea
                            value={dayObsText}
                            onChange={(e) => setDayObsText(e.target.value)}
                            placeholder="Adicione uma observação para este dia..."
                            className="min-h-[100px] mb-2"
                            maxLength={1000}
                          />
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">
                              {dayObsText.length}/1000 caracteres
                            </span>
                            <Button
                              size="sm"
                              onClick={() => handleSaveDayObservation(day)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Save className="w-4 h-4 mr-1" />
                              Salvar
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {/* Show day observation if exists and not editing */}
                      {!editingDayObs && getDayObservation(day) && (
                        <div className="mb-4 p-3 border border-blue-200 rounded-lg bg-blue-50">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-semibold text-blue-900">Observação do Dia:</span>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {getDayObservation(day).observation}
                          </p>
                        </div>
                      )}
                      
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
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="w-full mt-2 bg-blue-50 border-blue-300 hover:bg-blue-100 text-blue-700"
                                      onClick={() => {
                                        setViewingReceipts({
                                          entryId: entry.entryId,
                                          receipts: entry.receipts,
                                          currentIndex: 0
                                        });
                                      }}
                                    >
                                      <Eye className="w-3 h-3 mr-1" />
                                      Ver {entry.receipts.length} Comprovante{entry.receipts.length > 1 ? 's' : ''}
                                    </Button>
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
          
          
          {/* GESTÃO: ACESSO & PERMISSÕES TAB */}
          {user?.role === 'master' && (
            <TabsContent value="gestao">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    👥 Acesso & Permissões
                  </CardTitle>
                  <CardDescription>Gerencie usuários, permissões e acessos</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Criar Novo Usuário */}
                    <Card className="border-2 border-green-200">
                      <CardHeader>
                        <CardTitle className="text-lg">➕ Criar Novo Usuário</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input placeholder="Nome completo" />
                          <Input placeholder="Email" type="email" />
                          <Input placeholder="Senha inicial" type="password" />
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Função" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="secretaria">Secretária</SelectItem>
                              <SelectItem value="tesoureira">Tesoureira</SelectItem>
                              <SelectItem value="estadual">Estadual</SelectItem>
                              <SelectItem value="regional">Regional</SelectItem>
                              <SelectItem value="pastor">Pastor</SelectItem>
                              <SelectItem value="lideranca">Liderança</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Escopo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="global">GLOBAL (todas igrejas)</SelectItem>
                              <SelectItem value="state">ESTADO</SelectItem>
                              <SelectItem value="region">REGIÃO</SelectItem>
                              <SelectItem value="church">IGREJA específica</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input placeholder="Igreja (se específica)" />
                          <Input placeholder="Estado" />
                          <Input placeholder="Região" />
                        </div>
                        <Button className="mt-4 w-full bg-green-600 hover:bg-green-700">
                          ✅ Criar Usuário
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Lista de Usuários */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">👥 Usuários Cadastrados</CardTitle>
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
                                      <div className="flex items-center gap-2 mb-2">
                                        <p className="font-semibold text-lg">{u.name}</p>
                                        {!u.active && (
                                          <Badge className="bg-red-500">BLOQUEADO</Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-600">{u.email}</p>
                                      <div className="flex gap-2 mt-2">
                                        <Badge>{u.role}</Badge>
                                        <Badge variant="outline">{u.scope}</Badge>
                                        {u.church && <Badge className="bg-blue-100 text-blue-800">🏛️ {u.church}</Badge>}
                                      </div>
                                    </div>
                                    
                                    <div className="space-y-2 ml-4">
                                      <div className="text-xs font-semibold text-gray-700 mb-2">Permissões:</div>
                                      <div className="flex items-center gap-2 text-sm">
                                        <Switch
                                          checked={u.permissions?.canPrint}
                                          onCheckedChange={(checked) => {
                                            handleUpdatePermissions(u.userId, { ...u.permissions, canPrint: checked });
                                          }}
                                        />
                                        <Label className="text-xs">🖨️ Imprimir</Label>
                                      </div>
                                      <div className="flex items-center gap-2 text-sm">
                                        <Switch
                                          checked={u.permissions?.canExport}
                                          onCheckedChange={(checked) => {
                                            handleUpdatePermissions(u.userId, { ...u.permissions, canExport: checked });
                                          }}
                                        />
                                        <Label className="text-xs">📥 Exportar</Label>
                                      </div>
                                      <div className="flex items-center gap-2 text-sm">
                                        <Switch
                                          checked={u.permissions?.canShare}
                                          onCheckedChange={(checked) => {
                                            handleUpdatePermissions(u.userId, { ...u.permissions, canShare: checked });
                                          }}
                                        />
                                        <Label className="text-xs">🔗 Compartilhar</Label>
                                      </div>
                                      
                                      <div className="border-t pt-2 mt-2 space-y-2">
                                        <Button size="sm" variant="outline" className="w-full text-xs">
                                          🔑 Resetar Senha
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          variant={u.active ? "destructive" : "default"}
                                          className="w-full text-xs"
                                          onClick={async () => {
                                            try {
                                              const res = await fetch('/api/users/status', {
                                                method: 'POST',
                                                headers: {
                                                  'Content-Type': 'application/json',
                                                  'Authorization': `Bearer ${token}`
                                                },
                                                body: JSON.stringify({
                                                  userId: u.userId,
                                                  active: !u.active
                                                })
                                              });
                                              if (res.ok) {
                                                toast.success(u.active ? '🚫 Usuário bloqueado!' : '✅ Usuário desbloqueado!');
                                                fetchAllUsers();
                                              }
                                            } catch (error) {
                                              toast.error('❌ Erro ao alterar status');
                                            }
                                          }}
                                        >
                                          {u.active ? '🚫 Bloquear' : '✅ Desbloquear'}
                                        </Button>
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
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* IGREJAS TAB */}
          {user?.role === 'master' && (
            <TabsContent value="igrejas">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🏛️ Cadastro de Igrejas
                  </CardTitle>
                  <CardDescription>Gerencie igrejas e pastores</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Criar Nova Igreja */}
                    <Card className="border-2 border-blue-200">
                      <CardHeader>
                        <CardTitle className="text-lg">➕ Cadastrar Nova Igreja</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <Label>Nome da Igreja</Label>
                            <Input placeholder="Ex: Igreja Central - IUDP" className="mt-1" />
                          </div>
                          <div className="col-span-2">
                            <Label>Endereço Completo</Label>
                            <Textarea placeholder="Rua, número, bairro, cidade" rows={2} className="mt-1" />
                          </div>
                          <div>
                            <Label>Estado</Label>
                            <Input placeholder="Ex: SP" className="mt-1" />
                          </div>
                          <div>
                            <Label>Região</Label>
                            <Input placeholder="Ex: Zona Sul" className="mt-1" />
                          </div>
                          <div>
                            <Label>WhatsApp</Label>
                            <Input placeholder="(11) 99999-9999" className="mt-1" />
                          </div>
                          <div>
                            <Label>Foto da Igreja</Label>
                            <Input type="file" accept="image/*" className="mt-1" />
                          </div>
                        </div>
                        
                        <div className="border-t mt-4 pt-4">
                          <h3 className="font-semibold mb-3">Pastor Responsável</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label>Nome do Pastor</Label>
                              <Input placeholder="Nome completo" className="mt-1" />
                            </div>
                            <div>
                              <Label>Foto do Pastor</Label>
                              <Input type="file" accept="image/*" className="mt-1" />
                            </div>
                            <div>
                              <Label>Email</Label>
                              <Input type="email" placeholder="pastor@igreja.com" className="mt-1" />
                            </div>
                            <div>
                              <Label>WhatsApp</Label>
                              <Input placeholder="(11) 99999-9999" className="mt-1" />
                            </div>
                          </div>
                        </div>
                        
                        <Button className="mt-4 w-full bg-blue-600 hover:bg-blue-700">
                          ✅ Cadastrar Igreja
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Lista de Igrejas */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">🏛️ Igrejas Cadastradas</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Exemplo de igreja */}
                          <Card className="border-2 border-blue-200">
                            <CardContent className="pt-4">
                              <div className="flex gap-4">
                                <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                                  <span className="text-4xl">🏛️</span>
                                </div>
                                <div className="flex-1">
                                  <h3 className="text-lg font-bold">Igreja Central</h3>
                                  <p className="text-sm text-gray-600">São Paulo - SP • Zona Centro</p>
                                  <p className="text-xs text-gray-500 mt-1">📍 Rua Exemplo, 123</p>
                                  <p className="text-xs text-gray-500">📱 (11) 99999-9999</p>
                                  
                                  <div className="mt-3 pt-3 border-t">
                                    <div className="flex items-center gap-3">
                                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                                        <span className="text-xl">👤</span>
                                      </div>
                                      <div>
                                        <p className="font-semibold text-sm">Pastor João Silva</p>
                                        <p className="text-xs text-gray-500">pastor@igreja.com</p>
                                      </div>
                                      <Button size="sm" variant="outline" className="ml-auto">
                                        🔄 Trocar Pastor
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

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
                          <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
                          <p className="text-sm text-gray-600">Usuários</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <FileText className="w-8 h-8 mx-auto mb-2 text-green-600" />
                          <p className="text-2xl font-bold">{stats?.totalEntries || 0}</p>
                          <p className="text-sm text-gray-600">Lançamentos</p>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                          <Bell className="w-8 h-8 mx-auto mb-2 text-red-600" />
                          <p className="text-2xl font-bold">{stats?.pendingRequests || 0}</p>
                          <p className="text-sm text-gray-600">Pendentes</p>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                          <TrendingUp className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                          <p className="text-2xl font-bold">R$ {(stats?.currentMonthTotal || 0).toFixed(2)}</p>
                          <p className="text-sm text-gray-600">Mês Atual</p>
                        </div>
                      </div>
                    ) : (
                      <Button onClick={fetchStats}>Carregar Estatísticas</Button>
                    )}
                  </CardContent>
                </Card>
                
                {/* Month Governance - FASE 2 */}
                <Card className="border-2 border-amber-400">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <LockIcon className="w-6 h-6" />
                      Governança de Mês
                    </CardTitle>
                    <CardDescription>
                      Fechar ou reabrir meses para controle de edições
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Month Status Indicator */}
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-semibold">
                            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                          </p>
                          <p className="text-sm text-gray-600">
                            Mês atual visualizado
                          </p>
                        </div>
                        <Badge className={monthClosed ? 'bg-red-500' : 'bg-green-500'}>
                          {monthClosed ? (
                            <>
                              <LockIcon className="w-4 h-4 mr-1" />
                              FECHADO
                            </>
                          ) : (
                            <>
                              <LockOpen className="w-4 h-4 mr-1" />
                              ABERTO
                            </>
                          )}
                        </Badge>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          variant={monthClosed ? "outline" : "default"}
                          className={!monthClosed ? "bg-red-500 hover:bg-red-600" : ""}
                          disabled={monthClosed}
                          onClick={handleCloseMonth}
                        >
                          <LockIcon className="w-4 h-4 mr-2" />
                          Fechar Mês
                        </Button>
                        
                        <Button
                          variant={!monthClosed ? "outline" : "default"}
                          className={monthClosed ? "bg-green-500 hover:bg-green-600" : ""}
                          disabled={!monthClosed}
                          onClick={handleReopenMonth}
                        >
                          <LockOpen className="w-4 h-4 mr-2" />
                          Reabrir Mês
                        </Button>
                      </div>
                      
                      {/* Info Box */}
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-900 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>
                            <strong>Atenção:</strong> Ao fechar um mês, nenhum usuário (exceto você) poderá editar lançamentos daquele período. 
                            Use "Reabrir Mês" com cuidado e apenas quando necessário para correções importantes.
                          </span>
                        </p>
                      </div>
                    </div>
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
      
      {/* Receipt Viewer Modal - FASE 4 */}
      <Dialog open={!!viewingReceipts} onOpenChange={() => setViewingReceipts(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>📎 Visualizar Comprovante</span>
              {viewingReceipts && viewingReceipts.receipts && viewingReceipts.receipts.length > 1 && (
                <Badge variant="outline">
                  {(viewingReceipts.currentIndex || 0) + 1} de {viewingReceipts.receipts.length}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {viewingReceipts && viewingReceipts.receipts && viewingReceipts.receipts[viewingReceipts.currentIndex || 0]?.filename}
            </DialogDescription>
          </DialogHeader>
          
          {viewingReceipts && viewingReceipts.receipts && viewingReceipts.receipts.length > 0 && (
            <div className="space-y-4">
              {/* Receipt Display */}
              <div className="relative border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50 min-h-[400px] flex items-center justify-center">
                {viewingReceipts.receipts[viewingReceipts.currentIndex]?.fileType?.includes('pdf') ? (
                  <div className="text-center p-8">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-red-600" />
                    <p className="font-semibold mb-2">Arquivo PDF</p>
                    <p className="text-sm text-gray-600 mb-4">
                      {viewingReceipts.receipts[viewingReceipts.currentIndex]?.filename}
                    </p>
                    <Button
                      onClick={() => {
                        const receipt = viewingReceipts.receipts[viewingReceipts.currentIndex];
                        window.open(`/api/view/receipt/${receipt.filepath}`, '_blank');
                      }}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Abrir PDF em Nova Aba
                    </Button>
                  </div>
                ) : (
                  <img
                    src={`/api/view/receipt/${viewingReceipts.receipts[viewingReceipts.currentIndex]?.filepath}`}
                    alt="Comprovante"
                    className="max-w-full max-h-[600px] object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                )}
                <div style={{ display: 'none' }} className="text-center p-8">
                  <AlertCircle className="w-16 h-16 mx-auto mb-4 text-orange-600" />
                  <p className="font-semibold">Erro ao carregar arquivo</p>
                  <p className="text-sm text-gray-600 mt-2">
                    O arquivo pode estar corrompido ou não estar disponível
                  </p>
                </div>
              </div>
              
              {/* Navigation and Actions */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {viewingReceipts.receipts.length > 1 && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setViewingReceipts({
                            ...viewingReceipts,
                            currentIndex: Math.max(0, viewingReceipts.currentIndex - 1)
                          });
                        }}
                        disabled={viewingReceipts.currentIndex === 0}
                      >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Anterior
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setViewingReceipts({
                            ...viewingReceipts,
                            currentIndex: Math.min(viewingReceipts.receipts.length - 1, viewingReceipts.currentIndex + 1)
                          });
                        }}
                        disabled={viewingReceipts.currentIndex === viewingReceipts.receipts.length - 1}
                      >
                        Próximo
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const receipt = viewingReceipts.receipts[viewingReceipts.currentIndex];
                      const link = document.createElement('a');
                      link.href = `/uploads/receipts/${receipt.filepath}`;
                      link.download = receipt.filename;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      toast.success('📥 Download iniciado');
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setViewingReceipts(null)}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Fechar
                  </Button>
                </div>
              </div>
              
              {/* File Info */}
              <div className="p-3 bg-gray-50 rounded border border-gray-200 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-semibold">Arquivo:</span> {viewingReceipts.receipts[viewingReceipts.currentIndex]?.filename}
                  </div>
                  <div>
                    <span className="font-semibold">Tipo:</span> {viewingReceipts.receipts[viewingReceipts.currentIndex]?.fileType}
                  </div>
                  <div>
                    <span className="font-semibold">Tamanho:</span> {(viewingReceipts.receipts[viewingReceipts.currentIndex]?.fileSize / 1024).toFixed(2)} KB
                  </div>
                  <div>
                    <span className="font-semibold">Upload:</span> {viewingReceipts.receipts[viewingReceipts.currentIndex]?.uploadedAt ? new Date(viewingReceipts.receipts[viewingReceipts.currentIndex].uploadedAt).toLocaleString('pt-BR') : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Aviso Institucional - Horário de Brasília */}
      <Dialog open={showTimezoneNotice} onOpenChange={() => {}}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-900">
              <Clock className="w-6 h-6 text-yellow-600" />
              Atualização Importante
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
              <p className="text-gray-800 leading-relaxed">
                A ferramenta da <strong>Igreja Unida Deus Proverá</strong> agora opera exclusivamente no{' '}
                <strong className="text-blue-800">Horário Oficial de Brasília (UTC-3)</strong>.
              </p>
            </div>
            
            <p className="text-gray-700">
              Esta atualização garante <strong>precisão, ordem e transparência</strong> em todos os registros 
              de ofertas e dízimos, independentemente de onde você esteja localizado.
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-gray-700 flex items-start gap-2">
                <Clock className="w-4 h-4 mt-0.5 text-yellow-600 flex-shrink-0" />
                <span>
                  Todos os horários exibidos e registros realizados seguirão sempre o fuso horário de Brasília.
                </span>
              </p>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button 
              onClick={handleTimezoneNoticeConfirm}
              className="bg-blue-600 hover:bg-blue-700 px-6"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}