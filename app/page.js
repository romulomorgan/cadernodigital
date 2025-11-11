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
import { Clock, Lock, Unlock, ChevronLeft, ChevronRight, AlertCircle, CheckCircle, Bell, Upload, Download, Users, FileText, TrendingUp, TrendingDown, BarChart3, Eye, EyeOff, LockIcon, LockOpen, Save, X, ArrowLeft, ArrowRight, Printer, Edit, Trash2, MessageCircle, FileUser, MapPin, Power } from 'lucide-react';
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
  
  // Novos campos para registro completo
  const [registerTelefone, setRegisterTelefone] = useState('');
  const [registerCEP, setRegisterCEP] = useState('');
  const [registerEndereco, setRegisterEndereco] = useState('');
  const [registerNumero, setRegisterNumero] = useState('');
  const [registerComplemento, setRegisterComplemento] = useState('');
  const [registerCidade, setRegisterCidade] = useState('');
  const [registerEstado, setRegisterEstado] = useState('');
  const [registerPais, setRegisterPais] = useState('Brasil');
  const [registerChurchId, setRegisterChurchId] = useState('');
  const [registerCargo, setRegisterCargo] = useState('');
  const [registerPhotoFile, setRegisterPhotoFile] = useState(null);
  const [registerPhotoPreview, setRegisterPhotoPreview] = useState(null);
  const [publicChurches, setPublicChurches] = useState([]);
  const [publicRoles, setPublicRoles] = useState([]);
  const [allRolesForDropdown, setAllRolesForDropdown] = useState([]); // Para usar nos dropdowns internos
  
  // Estados para recuperação de senha e visualização de senha
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  
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
  const [myPendingRequests, setMyPendingRequests] = useState([]);
  const [myActiveOverrides, setMyActiveOverrides] = useState([]);
  const [currentBrazilTime, setCurrentBrazilTime] = useState(null);
  const [liveClockTime, setLiveClockTime] = useState(null); // Relógio digital tempo real
  const [clockSyncError, setClockSyncError] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [editingDayObs, setEditingDayObs] = useState(null); // { day: number }
  const [dayObsText, setDayObsText] = useState('');
  
  // Receipt viewer - FASE 4
  const [viewingReceipts, setViewingReceipts] = useState(null); // { entryId, receipts: [], currentIndex: 0 }
  
  // Confirmation dialogs
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
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
  
  // CRUD states - Usuários e Igrejas
  const [userPhotoFile, setUserPhotoFile] = useState(null);
  const [userPhotoPreview, setUserPhotoPreview] = useState(null);
  const [churchPhotoFile, setChurchPhotoFile] = useState(null);
  const [churchPhotoPreview, setChurchPhotoPreview] = useState(null);
  const [showUserViewModal, setShowUserViewModal] = useState(false);
  
  // Nova aba Usuários - states
  const [usuarios, setUsuarios] = useState([]);
  const [usuariosGrouped, setUsuariosGrouped] = useState({});
  const [showUsuarioCreateModal, setShowUsuarioCreateModal] = useState(false);
  const [showUsuarioEditModal, setShowUsuarioEditModal] = useState(false);
  const [showUsuarioDeleteModal, setShowUsuarioDeleteModal] = useState(false);
  const [showUsuarioViewModal, setShowUsuarioViewModal] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState(null);
  const [usuarioForm, setUsuarioForm] = useState({
    name: '',
    email: '',
    password: '',
    telefone: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    cidade: '',
    estado: '',
    pais: 'Brasil',
    churchId: '',
    cargo: ''
  });
  const [newPasswordUsuario, setNewPasswordUsuario] = useState('');
  const [usuarioPhotoFile, setUsuarioPhotoFile] = useState(null);
  const [usuarioPhotoPreview, setUsuarioPhotoPreview] = useState(null);
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [usuariosPagination, setUsuariosPagination] = useState({ page: 1, perPage: 10 });
  const [churches, setChurches] = useState([]);
  const [showUserEditModal, setShowUserEditModal] = useState(false);
  const [showUserDeleteConfirm, setShowUserDeleteConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editUserData, setEditUserData] = useState({});
  const [allChurches, setAllChurches] = useState([]);
  const [showChurchViewModal, setShowChurchViewModal] = useState(false);
  const [showChurchEditModal, setShowChurchEditModal] = useState(false);
  const [showChurchDeleteConfirm, setShowChurchDeleteConfirm] = useState(false);
  const [showChangePastorModal, setShowChangePastorModal] = useState(false);
  const [selectedChurch, setSelectedChurch] = useState(null);
  const [editChurchData, setEditChurchData] = useState({});
  const [availablePastors, setAvailablePastors] = useState([]);
  const [pastorSearchQuery, setPastorSearchQuery] = useState('');
  
  // CRUD states - Funções (Roles)
  const [allRoles, setAllRoles] = useState([]);
  const [showRoleViewModal, setShowRoleViewModal] = useState(false);
  const [showRoleEditModal, setShowRoleEditModal] = useState(false);
  const [showRoleDeleteConfirm, setShowRoleDeleteConfirm] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [editRoleData, setEditRoleData] = useState({});
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  
  // States para formulário de igreja
  const [newChurchName, setNewChurchName] = useState('');
  const [newChurchCEP, setNewChurchCEP] = useState('');
  const [newChurchAddress, setNewChurchAddress] = useState('');
  const [newChurchNumber, setNewChurchNumber] = useState('');
  const [newChurchComplement, setNewChurchComplement] = useState('');
  const [newChurchNeighborhood, setNewChurchNeighborhood] = useState('');
  const [newChurchCity, setNewChurchCity] = useState('');
  const [newChurchState, setNewChurchState] = useState('');
  const [newChurchRegion, setNewChurchRegion] = useState('');
  const [newChurchPhone, setNewChurchPhone] = useState('');
  const [newChurchCountry, setNewChurchCountry] = useState('Brasil');
  
  // Estados para nova estrutura de igrejas (modal)
  const [showChurchCreateModal, setShowChurchCreateModal] = useState(false);
  const [churchesSearchQuery, setChurchesSearchQuery] = useState('');
  const [churchesPagination, setChurchesPagination] = useState({ page: 1, perPage: 5 });
  
  const timeSlots = ['08:00', '10:00', '12:00', '15:00', '19:30'];
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  
  // Funções de máscara
  const maskCEP = (value) => {
    if (!value) return '';
    return value
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 9);
  };
  
  const maskPhone = (value) => {
    if (!value) return '';
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d)/, '($1) $2-$3');
    }
    return cleaned.replace(/(\d{2})(\d{5})(\d)/, '($1) $2-$3').slice(0, 15);
  };
  
  // States para busca/filtro de usuários
  const [usuariosSearchQuery, setUsuariosSearchQuery] = useState('');
  
  // Filtrar usuários com base na busca
  const usuariosFiltrados = usuarios.filter(u => {
    if (!usuariosSearchQuery) return true;
    const query = usuariosSearchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(query) ||
      u.churchName?.toLowerCase().includes(query) ||
      u.church?.toLowerCase().includes(query) ||
      u.cargo?.toLowerCase().includes(query)
    );
  });
  
  // Reagrupar usuários filtrados
  const usuariosGroupedFiltrado = usuariosFiltrados.reduce((acc, u) => {
    const churchKey = u.churchName || u.church || 'Sem igreja';
    const cargoKey = u.cargo || 'Sem cargo';
    
    if (!acc[churchKey]) acc[churchKey] = {};
    if (!acc[churchKey][cargoKey]) acc[churchKey][cargoKey] = [];
    
    acc[churchKey][cargoKey].push(u);
    return acc;
  }, {});
  
  // Ordenar alfabeticamente dentro de cada grupo
  Object.keys(usuariosGroupedFiltrado).forEach(church => {
    Object.keys(usuariosGroupedFiltrado[church]).forEach(cargo => {
      usuariosGroupedFiltrado[church][cargo].sort((a, b) => a.name.localeCompare(b.name));
    });
  });
  
  // Filtrar igrejas com base na busca
  const churchesFiltradas = allChurches.filter(c => {
    if (!churchesSearchQuery) return true;
    const query = churchesSearchQuery.toLowerCase();
    return (
      c.name?.toLowerCase().includes(query) ||
      c.city?.toLowerCase().includes(query) ||
      c.state?.toLowerCase().includes(query)
    );
  });
  
  // Paginação de igrejas
  const totalChurchPages = Math.ceil(churchesFiltradas.length / churchesPagination.perPage);
  const churchesPaginadas = churchesFiltradas.slice(
    (churchesPagination.page - 1) * churchesPagination.perPage,
    churchesPagination.page * churchesPagination.perPage
  );
  
  const roleNames = {
    'master': 'Líder Máximo',
    'leader': 'Líder',
    'pastor': 'Pastor',
    'treasurer': 'Tesoureiro',
    'secretary': 'Secretário',
    'member': 'Membro',
    'Usuário': 'Usuário'
  };
  
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
  }, []);
  
  // Timezone notice removido conforme solicitação do usuário
  
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
  
  // Auto-carregar stats quando entrar na aba Dashboard
  useEffect(() => {
    if (isAuthenticated && activeTab === 'dashboard' && !stats) {
      fetchStats();
    }
  }, [isAuthenticated, activeTab, stats]);
  
  // Auto-carregar dashboardData quando entrar na aba Dashboard ou trocar de mês
  useEffect(() => {
    if (isAuthenticated && activeTab === 'dashboard' && token) {
      fetchDashboard();
    }
  }, [isAuthenticated, activeTab, currentDate, token]);
  
  // Buscar status de unlock quando entrar no calendário ou trocar de mês
  useEffect(() => {
    if (isAuthenticated && activeTab === 'calendar' && token && user?.role !== 'master') {
      fetchMyUnlockStatus();
      // Atualizar a cada 10 segundos para detectar aprovações
      const interval = setInterval(fetchMyUnlockStatus, 10000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, activeTab, currentDate, token, user]);
  
  // Carregar igrejas quando entrar na aba
  useEffect(() => {
    if (isAuthenticated && activeTab === 'churches' && token && user?.role === 'master') {
      fetchAllChurches();
    }
  }, [isAuthenticated, activeTab, token, user]);
  
  // Carregar funções quando entrar na aba
  useEffect(() => {
    if (isAuthenticated && activeTab === 'funcoes' && token && user?.role === 'master') {
      fetchAllRoles();
    }
  }, [isAuthenticated, activeTab, token, user]);
  
  // Carregar usuários e igrejas quando entrar na aba usuarios
  useEffect(() => {
    if (isAuthenticated && activeTab === 'usuarios' && token && user?.role === 'master') {
      fetchUsuarios();
      fetchAllChurches();
      fetchAllRolesForDropdowns(); // Buscar roles para dropdowns
    }
  }, [isAuthenticated, activeTab, token, user]);
  
  // Buscar igrejas e roles públicas para o formulário de registro (sem autenticação)
  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        // Buscar igrejas
        const churchesRes = await fetch('/api/public/churches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        if (churchesRes.ok) {
          const churchesData = await churchesRes.json();
          setPublicChurches(churchesData.churches || []);
        }
        
        // Buscar roles/funções
        const rolesRes = await fetch('/api/public/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        if (rolesRes.ok) {
          const rolesData = await rolesRes.json();
          setPublicRoles(rolesData.roles || []);
        }
      } catch (error) {
        console.error('Erro ao buscar dados públicos:', error);
      }
    };
    
    if (!isAuthenticated) {
      fetchPublicData();
    }
  }, [isAuthenticated]);
  
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
        : { 
            name, 
            email, 
            password, 
            role, 
            church, 
            region, 
            state,
            telefone: registerTelefone,
            cep: registerCEP,
            endereco: registerEndereco,
            numero: registerNumero,
            complemento: registerComplemento,
            cidade: registerCidade,
            estado: registerEstado,
            pais: registerPais,
            churchId: registerChurchId,
            cargo: registerCargo
          };
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // Se tiver foto no registro, fazer upload
        if (authMode === 'register' && registerPhotoFile && data.user?.userId) {
          try {
            const formData = new FormData();
            formData.append('photo', registerPhotoFile);
            formData.append('userId', data.user.userId);
            
            await fetch('/api/users/upload-photo', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${data.token}` },
              body: formData
            });
          } catch (error) {
            console.error('Erro ao fazer upload da foto:', error);
          }
        }
        
        // RESETAR TODOS OS CAMPOS DO FORMULÁRIO DE CADASTRO
        if (authMode === 'register') {
          setName('');
          setEmail('');
          setPassword('');
          setRegisterTelefone('');
          setRegisterCEP('');
          setRegisterEndereco('');
          setRegisterNumero('');
          setRegisterComplemento('');
          setRegisterCidade('');
          setRegisterEstado('');
          setRegisterPais('Brasil');
          setRegisterChurchId('');
          setRegisterCargo('');
          setRegisterPhotoFile(null);
          setRegisterPhotoPreview(null);
        }
        
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
    setShowLogoutConfirm(true);
  };
  
  const confirmLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setShowLogoutConfirm(false);
    toast.success('👋 Até logo! Sessão encerrada com sucesso.');
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
  
  const handleSaveMonthObservation = async () => {
    if (monthObservation.length > MAX_OBSERVATION_LENGTH) {
      toast.error(`❌ Texto muito longo (${monthObservation.length}/${MAX_OBSERVATION_LENGTH})`);
      return;
    }
    
    console.log('[SAVE OBS] Salvando:', { 
      length: monthObservation.length, 
      active: monthObservationActive 
    });
    
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
        toast.success(data.message || '✅ Observação salva com sucesso!');
        localStorage.removeItem(backupKey);
        // Recarregar entries para atualizar observação
        fetchEntries();
      } else {
        const error = await res.json();
        toast.error(`❌ ${error.error || 'Erro ao salvar'}`);
      }
    } catch (error) {
      console.error('[SAVE OBS] Erro:', error);
      toast.error('❌ Erro ao conectar com servidor');
    }
  };
  
  const handleClearMonthObservation = async () => {
    if (!confirm('⚠️ Tem certeza que deseja limpar a observação do mês?')) {
      return;
    }
    
    try {
      // Limpar localmente
      setMonthObservation('');
      setMonthObservationActive(false);
      
      // Limpar no servidor
      const res = await fetch('/api/observations/month', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          month: currentDate.getMonth() + 1,
          year: currentDate.getFullYear(),
          observation: '',
          active: false
        })
      });
      
      if (res.ok) {
        toast.success('✅ Observação limpa com sucesso!');
        // Remover backup do localStorage
        const backupKey = `obs_${currentDate.getFullYear()}_${currentDate.getMonth() + 1}`;
        localStorage.removeItem(backupKey);
        // Recarregar entries
        fetchEntries();
      } else {
        toast.error('❌ Erro ao limpar observação');
      }
    } catch (error) {
      console.error('[CLEAR OBS] Erro:', error);
      toast.error('❌ Erro ao conectar com servidor');
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
  
  const hasPendingRequest = (day, timeSlot) => {
    return myPendingRequests.some(req => 
      req.day === day && req.timeSlot === timeSlot
    );
  };
  
  const hasActiveOverride = (day, timeSlot) => {
    return myActiveOverrides.some(override => 
      override.day === day && override.timeSlot === timeSlot
    );
  };
  
  const isEntryLocked = (entry, currentTime, day, timeSlot) => {
    if (!currentTime) return { locked: false, reason: null, timeLeft: null };
    
    // Se há entry, verificar bloqueios normais
    if (entry) {
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
    }
    
    // Se não há entry, verificar se o dia/horário já passou
    if (day && timeSlot) {
      const now = new Date(currentTime);
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();
      
      // Criar data do slot
      const slotDate = new Date(currentYear, currentMonth, day);
      const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      console.log(`[LOCK CHECK] Dia ${day}, Slot ${timeSlot}: slotDate=${slotDate.toISOString()}, today=${todayDate.toISOString()}, isPast=${slotDate < todayDate}`);
      
      // Se é dia anterior, está bloqueado
      if (slotDate < todayDate) {
        return { locked: true, reason: 'past_day', timeLeft: null };
      }
      
      // Se é hoje, verificar se o horário já passou
      if (slotDate.getTime() === todayDate.getTime()) {
        const [slotHour, slotMinute] = timeSlot.split(':').map(Number);
        const slotDateTime = new Date(currentYear, currentMonth, day, slotHour, slotMinute);
        
        // Adicionar tempo de janela (cada slot tem ~2h de janela)
        const timeSlotWindows = {
          '08:00': 120, // 2h
          '10:00': 120,
          '12:00': 180, // 3h
          '15:00': 270, // 4.5h
          '19:30': 150  // 2.5h
        };
        
        const windowMinutes = timeSlotWindows[timeSlot] || 120;
        const slotEndTime = new Date(slotDateTime.getTime() + windowMinutes * 60 * 1000);
        
        if (now > slotEndTime) {
          return { locked: true, reason: 'past_time', timeLeft: null };
        }
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
      } else {
        const error = await res.json();
        toast.error(`❌ ${error.error || 'Erro ao enviar solicitação'}`);
      }
    } catch (error) {
      toast.error('❌ Erro ao enviar solicitação');
    }
  };
  
  const handleRequestUnlockForEmptySlot = async (day, timeSlot) => {
    const reason = prompt('Informe o motivo para lançar neste horário/dia anterior:');
    if (!reason) return;
    
    try {
      const res = await fetch('/api/unlock/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          day, 
          month: currentDate.getMonth() + 1,
          year: currentDate.getFullYear(),
          timeSlot, 
          reason 
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success('📨 Solicitação enviada ao Líder Máximo!', {
          description: 'Aguarde a aprovação para realizar o lançamento.'
        });
        // Atualizar status de solicitações
        fetchMyUnlockStatus();
      } else {
        toast.error(`❌ ${data.error || 'Erro ao enviar solicitação'}`);
      }
    } catch (error) {
      console.error('Erro ao solicitar liberação:', error);
      toast.error('❌ Erro ao enviar solicitação');
    }
  };
  
  const fetchMyUnlockStatus = async () => {
    if (!token || user?.role === 'master') return;
    
    try {
      const res = await fetch('/api/unlock/my-status', {
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
        const data = await res.json();
        setMyPendingRequests(data.pendingRequests || []);
        setMyActiveOverrides(data.activeOverrides || []);
        console.log('[UNLOCK STATUS]', {
          pending: data.pendingRequests?.length,
          active: data.activeOverrides?.length
        });
      }
    } catch (error) {
      console.error('Erro ao buscar status de unlock:', error);
    }
  };
  
  // ========== FUNÇÕES CRUD - USUÁRIOS ==========
  
  const handleUserPhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error('❌ Arquivo muito grande. Máximo 2MB');
      return;
    }
    
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('❌ Tipo não permitido. Use JPG, PNG ou WebP');
      return;
    }
    
    setUserPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setUserPhotoPreview(e.target.result);
    reader.readAsDataURL(file);
  };
  
  const handleUploadUserPhoto = async (userId) => {
    if (!userPhotoFile) return null;
    
    const formData = new FormData();
    formData.append('photo', userPhotoFile);
    formData.append('userId', userId);
    
    try {
      const res = await fetch('/api/users/upload-photo', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('✅ Foto enviada!');
        return data.photoUrl;
      } else {
        toast.error('❌ ' + data.error);
        return null;
      }
    } catch (error) {
      toast.error('❌ Erro ao enviar foto');
      return null;
    }
  };
  
  const handleDeleteUser = async (userId) => {
    try {
      const res = await fetch('/api/users/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('✅ ' + data.message);
        fetchAllUsers();
        setShowUserDeleteConfirm(false);
        setSelectedUser(null);
      } else {
        toast.error('❌ ' + data.error);
      }
    } catch (error) {
      toast.error('❌ Erro ao excluir usuário');
    }
  };
  
  const handleEditUser = async (userId, userData) => {
    try {
      const res = await fetch('/api/users/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId, userData })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('✅ ' + data.message);
        fetchAllUsers();
        setShowUserEditModal(false);
        setSelectedUser(null);
      } else {
        toast.error('❌ ' + data.error);
      }
    } catch (error) {
      toast.error('❌ Erro ao atualizar usuário');
    }
  };
  
  // ========== FUNÇÕES CRUD - IGREJAS ==========
  
  const fetchAllChurches = async () => {
    try {
      const res = await fetch('/api/churches/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setAllChurches(data.churches || []);
        setChurches(data.churches || []); // CORRIGIDO: Também popular o estado churches
      }
    } catch (error) {
      console.error('Erro ao buscar igrejas:', error);
    }
  };
  
  const fetchAllRolesForDropdowns = async () => {
    try {
      const res = await fetch('/api/public/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (res.ok) {
        const data = await res.json();
        setAllRolesForDropdown(data.roles || []);
      }
    } catch (error) {
      console.error('Erro ao buscar roles:', error);
    }
  };
  
  const handleCEPChange = async (cep) => {
    // Aplicar máscara
    const maskedCEP = cep.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9);
    setNewChurchCEP(maskedCEP);
    
    // Buscar endereço quando CEP estiver completo
    if (maskedCEP.replace(/\D/g, '').length === 8) {
      setLoadingCEP(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${maskedCEP.replace(/\D/g, '')}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          setNewChurchAddress(data.logradouro || '');
          setNewChurchNeighborhood(data.bairro || '');
          setNewChurchCity(data.localidade || '');
          setNewChurchState(data.uf || '');
          setNewChurchCountry('Brasil');
          toast.success('✅ Endereço encontrado!');
        } else {
          toast.error('❌ CEP não encontrado');
        }
      } catch (error) {
        toast.error('❌ Erro ao buscar CEP');
      } finally {
        setLoadingCEP(false);
      }
    }
  };
  
  const handleCreateChurchForm = async () => {
    if (!newChurchName.trim()) {
      toast.error('❌ Nome da igreja é obrigatório');
      return;
    }
    
    const churchData = {
      name: newChurchName,
      cep: newChurchCEP,
      address: newChurchAddress,
      number: newChurchNumber,
      complement: newChurchComplement,
      neighborhood: newChurchNeighborhood,
      city: newChurchCity,
      state: newChurchState,
      region: newChurchRegion,
      phone: newChurchPhone,
      country: newChurchCountry || 'Brasil'
    };
    
    try {
      const res = await fetch('/api/churches/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(churchData)
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('✅ ' + data.message);
        
        // Upload de foto se houver
        if (churchPhotoFile) {
          await handleUploadChurchPhoto(data.church.churchId);
        }
        
        // Limpar formulário
        setNewChurchName('');
        setNewChurchCEP('');
        setNewChurchAddress('');
        setNewChurchNumber('');
        setNewChurchComplement('');
        setNewChurchNeighborhood('');
        setNewChurchCity('');
        setNewChurchState('');
        setNewChurchRegion('');
        setNewChurchPhone('');
        setNewChurchCountry('Brasil');
        setChurchPhotoFile(null);
        setChurchPhotoPreview(null);
        
        fetchAllChurches();
      } else {
        toast.error('❌ ' + data.error);
      }
    } catch (error) {
      toast.error('❌ Erro ao criar igreja');
    }
  };
  
  const handleChurchPhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error('❌ Arquivo muito grande. Máximo 2MB');
      return;
    }
    
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('❌ Tipo não permitido. Use JPG, PNG ou WebP');
      return;
    }
    
    setChurchPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setChurchPhotoPreview(e.target.result);
    reader.readAsDataURL(file);
  };
  
  const handleUploadChurchPhoto = async (churchId) => {
    if (!churchPhotoFile) return null;
    
    const formData = new FormData();
    formData.append('photo', churchPhotoFile);
    formData.append('churchId', churchId);
    
    try {
      const res = await fetch('/api/churches/upload-photo', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('✅ Foto da igreja enviada!');
        return data.photoUrl;
      } else {
        toast.error('❌ ' + data.error);
        return null;
      }
    } catch (error) {
      toast.error('❌ Erro ao enviar foto');
      return null;
    }
  };
  
  const handleDeleteChurch = async (churchId) => {
    try {
      const res = await fetch('/api/churches/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ churchId })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('✅ ' + data.message);
        fetchAllChurches();
        setShowChurchDeleteConfirm(false);
        setSelectedChurch(null);
      } else {
        toast.error('❌ ' + data.error);
      }
    } catch (error) {
      toast.error('❌ Erro ao excluir igreja');
    }
  };
  
  const fetchAvailablePastors = async () => {
    try {
      const res = await fetch('/api/churches/available-pastors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setAvailablePastors(data.pastors || []);
      }
    } catch (error) {
      console.error('Erro ao buscar pastores:', error);
    }
  };
  
  const handleChangePastor = async (churchId, newPastorId) => {
    try {
      const res = await fetch('/api/churches/change-pastor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ churchId, newPastorId })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('✅ ' + data.message);
        fetchAllChurches();
        setShowChangePastorModal(false);
        setPastorSearchQuery('');
      } else {
        toast.error('❌ ' + data.error);
      }
    } catch (error) {
      toast.error('❌ Erro ao trocar pastor');
    }
  };
  
  const filteredPastors = availablePastors.filter(p => 
    p.name?.toLowerCase().includes(pastorSearchQuery.toLowerCase()) ||
    p.email?.toLowerCase().includes(pastorSearchQuery.toLowerCase())
  );
  
  // ========== FUNÇÕES CRUD - ROLES ==========
  
  const fetchAllRoles = async () => {
    try {
      const res = await fetch('/api/roles/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setAllRoles(data.roles || []);
      }
    } catch (error) {
      console.error('Erro ao buscar funções:', error);
    }
  };
  
  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      toast.error('❌ Nome da função é obrigatório');
      return;
    }
    
    try {
      const res = await fetch('/api/roles/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newRoleName,
          description: newRoleDescription
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('✅ ' + data.message);
        setNewRoleName('');
        setNewRoleDescription('');
        fetchAllRoles();
      } else {
        toast.error('❌ ' + data.error);
      }
    } catch (error) {
      toast.error('❌ Erro ao criar função');
    }
  };
  
  const handleUpdateRole = async () => {
    try {
      const res = await fetch('/api/roles/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          roleId: selectedRole.roleId,
          roleData: editRoleData
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('✅ ' + data.message);
        setShowRoleEditModal(false);
        fetchAllRoles();
      } else {
        toast.error('❌ ' + data.error);
      }
    } catch (error) {
      toast.error('❌ Erro ao atualizar função');
    }
  };
  
  const handleDeleteRole = async (roleId) => {
    try {
      const res = await fetch('/api/roles/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ roleId })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('✅ ' + data.message);
        setShowRoleDeleteConfirm(false);
        fetchAllRoles();
      } else {
        toast.error('❌ ' + data.error);
      }
    } catch (error) {
      toast.error('❌ Erro ao excluir função');
    }
  };
  
  // ========== FUNÇÕES CRUD - USUÁRIOS ==========
  
  const fetchUsuarios = async () => {
    try {
      const res = await fetch('/api/users/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setUsuarios(data.users || []);
        setUsuariosGrouped(data.grouped || {});
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    }
  };
  
  const handleBuscarCEP = async (cep) => {
    if (!cep || cep.length < 8) return;
    
    setLoadingCEP(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      
      if (!data.erro) {
        setUsuarioForm(prev => ({
          ...prev,
          endereco: data.logradouro || '',
          cidade: data.localidade || '',
          estado: data.uf || '',
          pais: 'Brasil'
        }));
        toast.success('✅ Endereço preenchido automaticamente!');
      } else {
        toast.error('❌ CEP não encontrado');
      }
    } catch (error) {
      toast.error('❌ Erro ao buscar CEP');
    } finally {
      setLoadingCEP(false);
    }
  };
  
  // Buscar CEP no formulário de registro
  const handleBuscarCEPRegistro = async (cep) => {
    if (!cep || cep.length < 8) return;
    
    setLoadingCEP(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      
      if (!data.erro) {
        setRegisterEndereco(data.logradouro || '');
        setRegisterCidade(data.localidade || '');
        setRegisterEstado(data.uf || '');
        setRegisterPais('Brasil');
        toast.success('✅ Endereço preenchido automaticamente!');
      } else {
        toast.error('❌ CEP não encontrado');
      }
    } catch (error) {
      toast.error('❌ Erro ao buscar CEP');
    } finally {
      setLoadingCEP(false);
    }
  };
  
  // Upload de foto no registro
  const handleRegisterPhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRegisterPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setRegisterPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleCreateUsuario = async () => {
    if (!usuarioForm.name || !usuarioForm.email || !usuarioForm.password) {
      toast.error('❌ Nome, e-mail e senha são obrigatórios');
      return;
    }
    
    if (!usuarioForm.churchId) {
      toast.error('❌ Igreja é obrigatória');
      return;
    }
    
    try {
      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(usuarioForm)
      });
      
      const data = await res.json();
      if (res.ok) {
        // Se tiver foto, fazer upload ANTES de mostrar sucesso
        if (usuarioPhotoFile && data.user?.userId) {
          await handleUploadUsuarioPhoto(data.user.userId);
        }
        
        toast.success('✅ ' + data.message);
        
        setShowUsuarioCreateModal(false);
        setUsuarioForm({
          name: '',
          email: '',
          password: '',
          telefone: '',
          cep: '',
          endereco: '',
          numero: '',
          complemento: '',
          cidade: '',
          estado: '',
          pais: 'Brasil',
          churchId: '',
          cargo: ''
        });
        setUsuarioPhotoFile(null);
        setUsuarioPhotoPreview(null);
        
        // Recarregar lista para mostrar foto
        await fetchUsuarios();
      } else {
        toast.error('❌ ' + data.error);
      }
    } catch (error) {
      toast.error('❌ Erro ao criar usuário');
    }
  };
  
  const handleUploadUsuarioPhoto = async (userId) => {
    if (!usuarioPhotoFile) return;
    
    try {
      const formData = new FormData();
      formData.append('photo', usuarioPhotoFile);
      formData.append('userId', userId);
      
      const res = await fetch('/api/users/upload-photo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (res.ok) {
        const data = await res.json();
        toast.success('✅ Foto do usuário carregada!');
        return data.photoUrl;
      } else {
        const error = await res.json();
        toast.error('❌ ' + error.error);
      }
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      toast.error('❌ Erro ao fazer upload da foto');
    }
  };
  
  const handleUpdateUsuario = async () => {
    if (!selectedUsuario?.userId) return;
    
    try {
      const res = await fetch('/api/users/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: selectedUsuario.userId,
          userData: usuarioForm,
          newPassword: newPasswordUsuario
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        // Se tiver foto nova, fazer upload ANTES de mostrar sucesso
        if (usuarioPhotoFile) {
          await handleUploadUsuarioPhoto(selectedUsuario.userId);
        }
        
        toast.success('✅ ' + data.message);
        setShowUsuarioEditModal(false);
        setNewPasswordUsuario('');
        setUsuarioPhotoFile(null);
        setUsuarioPhotoPreview(null);
        
        // Recarregar lista para mostrar foto atualizada
        await fetchUsuarios();
      } else {
        toast.error('❌ ' + data.error);
      }
    } catch (error) {
      toast.error('❌ Erro ao atualizar usuário');
    }
  };
  
  const handleDeleteUsuario = async () => {
    if (!selectedUsuario?.userId) return;
    
    try {
      const res = await fetch('/api/users/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: selectedUsuario.userId })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('✅ ' + data.message);
        setShowUsuarioDeleteModal(false);
        setSelectedUsuario(null);
        fetchUsuarios();
      } else {
        toast.error('❌ ' + data.error);
      }
    } catch (error) {
      toast.error('❌ Erro ao excluir usuário');
    }
  };
  
  const openEditUsuarioModal = (usuario) => {
    setSelectedUsuario(usuario);
    setUsuarioForm({
      name: usuario.name || '',
      email: usuario.email || '',
      password: '', // Não mostrar senha
      telefone: usuario.telefone || '',
      cep: usuario.cep || '',
      endereco: usuario.endereco || '',
      numero: usuario.numero || '',
      complemento: usuario.complemento || '',
      cidade: usuario.cidade || '',
      estado: usuario.estado || '',
      pais: usuario.pais || 'Brasil',
      churchId: usuario.churchId || '',
      cargo: usuario.cargo || ''
    });
    setUsuarioPhotoPreview(usuario.photoUrl || null);
    setNewPasswordUsuario('');
    setShowUsuarioEditModal(true);
  };
  
  const openViewUsuarioModal = (usuario) => {
    setSelectedUsuario(usuario);
    setShowUsuarioViewModal(true);
  };
  
  const openDeleteUsuarioModal = (usuario) => {
    setSelectedUsuario(usuario);
    setShowUsuarioDeleteModal(true);
  };
  
  const handleUsuarioPhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUsuarioPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUsuarioPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const abrirWhatsApp = (telefone) => {
    if (!telefone) {
      toast.error('❌ Telefone não cadastrado');
      return;
    }
    
    // Remover caracteres não numéricos
    const numero = telefone.replace(/\D/g, '');
    
    // Abrir WhatsApp no navegador
    window.open(`https://wa.me/55${numero}`, '_blank');
  };
  
  const handleToggleUserActive = async (usuario) => {
    if (!usuario) return;
    
    try {
      const res = await fetch('/api/users/toggle-active', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: usuario.userId })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('✅ ' + data.message);
        await fetchUsuarios(); // Recarregar lista
      } else {
        toast.error('❌ ' + data.error);
      }
    } catch (error) {
      toast.error('❌ Erro ao alterar status do usuário');
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
      <div className="min-h-screen h-full w-full bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl max-h-[85vh] overflow-hidden border-2 border-yellow-500/20 shadow-2xl">
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
            <CardTitle className="text-xl md:text-2xl font-bold text-blue-900">Caderno de Controle Online</CardTitle>
            <CardDescription className="text-lg font-semibold text-yellow-700">Igreja Unida Deus Proverá</CardDescription>
          </CardHeader>
          <CardContent className="overflow-y-auto max-h-[calc(85vh-180px)] pb-6">
            <Tabs value={authMode} onValueChange={setAuthMode}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="register">Cadastrar</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleAuth} className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="seu@email.com"
                      className="mt-1 h-10"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPasswordModal(true)}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Esqueci minha senha
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        className="h-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {authError && (
                    <div className="text-red-600 text-sm flex items-center gap-2 bg-red-50 p-3 rounded-lg">
                      <AlertCircle className="w-4 h-4" />
                      {authError}
                    </div>
                  )}
                  <Button type="submit" className="w-full bg-blue-900 hover:bg-blue-800 h-10">
                    Entrar
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={handleAuth} className="space-y-4">
                  {/* Foto */}
                  <div className="flex flex-col items-center gap-2 py-2">
                    {registerPhotoPreview ? (
                      <img src={registerPhotoPreview} alt="Preview" className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover" />
                    ) : (
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gray-200 flex items-center justify-center">
                        <Users className="w-8 h-8 md:w-10 md:h-10 text-gray-400" />
                      </div>
                    )}
                    <Label htmlFor="register-photo" className="cursor-pointer">
                      <div className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs md:text-sm">
                        {registerPhotoPreview ? 'Trocar Foto' : 'Adicionar Foto (Opcional)'}
                      </div>
                      <Input
                        id="register-photo"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleRegisterPhotoChange}
                      />
                    </Label>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name" className="text-xs md:text-sm">Nome Completo *</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder="Seu nome completo"
                        className="text-sm h-9"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="reg-email" className="text-xs md:text-sm">Email *</Label>
                      <Input
                        id="reg-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="seu@email.com"
                        className="text-sm h-9"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="reg-password" className="text-xs md:text-sm">Senha *</Label>
                      <Input
                        id="reg-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Senha segura"
                        className="text-sm h-9"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs md:text-sm">Telefone (WhatsApp)</Label>
                      <Input
                        value={maskPhone(registerTelefone)}
                        onChange={(e) => setRegisterTelefone(maskPhone(e.target.value))}
                        placeholder="(00) 00000-0000"
                        className="text-sm h-9"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs md:text-sm">CEP</Label>
                      <Input
                        value={maskCEP(registerCEP)}
                        onChange={(e) => {
                          const masked = maskCEP(e.target.value);
                          setRegisterCEP(masked);
                          if (masked.replace(/\D/g, '').length === 8) {
                            handleBuscarCEPRegistro(masked.replace(/\D/g, ''));
                          }
                        }}
                        placeholder="00000-000"
                        className="text-sm h-9"
                      />
                      {loadingCEP && <p className="text-xs text-blue-600 mt-1">🔍 Buscando...</p>}
                    </div>
                    
                    <div>
                      <Label className="text-xs md:text-sm">Endereço</Label>
                      <Input
                        value={registerEndereco}
                        onChange={(e) => setRegisterEndereco(e.target.value)}
                        placeholder="Rua, Avenida..."
                        disabled={loadingCEP}
                        className="text-sm h-9"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs md:text-sm">Número</Label>
                      <Input
                        value={registerNumero}
                        onChange={(e) => setRegisterNumero(e.target.value)}
                        placeholder="Número"
                        className="text-sm h-9"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs md:text-sm">Complemento</Label>
                      <Input
                        value={registerComplemento}
                        onChange={(e) => setRegisterComplemento(e.target.value)}
                        placeholder="Apto, Bloco..."
                        className="text-sm h-9"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs md:text-sm">Cidade</Label>
                      <Input
                        value={registerCidade}
                        onChange={(e) => setRegisterCidade(e.target.value)}
                        placeholder="Cidade"
                        disabled={loadingCEP}
                        className="text-sm h-9"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs md:text-sm">Estado</Label>
                      <Input
                        value={registerEstado}
                        onChange={(e) => setRegisterEstado(e.target.value)}
                        placeholder="UF"
                        disabled={loadingCEP}
                        className="text-sm h-9"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs md:text-sm">País</Label>
                      <Input
                        value={registerPais}
                        onChange={(e) => setRegisterPais(e.target.value)}
                        placeholder="Brasil"
                        className="text-sm h-9"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs md:text-sm">Igreja *</Label>
                      <Select value={registerChurchId} onValueChange={setRegisterChurchId} required>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Selecione sua igreja" />
                        </SelectTrigger>
                        <SelectContent>
                          {publicChurches.map(ch => (
                            <SelectItem key={ch.churchId} value={ch.churchId} className="text-sm">
                              {ch.name} - {ch.city}/{ch.state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="text-xs md:text-sm">Cargo/Função</Label>
                      <Select value={registerCargo} onValueChange={setRegisterCargo}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Selecione sua função" />
                        </SelectTrigger>
                        <SelectContent>
                          {publicRoles.map(r => (
                            <SelectItem key={r.roleId} value={r.name} className="text-sm">
                              {r.name}
                            </SelectItem>
                          ))}
                          {publicRoles.length === 0 && (
                            <>
                              <SelectItem value="Secretário(a)" className="text-sm">Secretário(a)</SelectItem>
                              <SelectItem value="Tesoureiro(a)" className="text-sm">Tesoureiro(a)</SelectItem>
                              <SelectItem value="Pastor(a)" className="text-sm">Pastor(a)</SelectItem>
                              <SelectItem value="Bispo(a)" className="text-sm">Bispo(a)</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {authError && (
                    <div className="text-red-600 text-sm flex items-center gap-2 bg-red-50 p-3 rounded-lg">
                      <AlertCircle className="w-4 h-4" />
                      {authError}
                    </div>
                  )}
                  
                  <div className="pt-4 pb-6">
                    <Button type="submit" className="w-full bg-blue-900 hover:bg-blue-800 h-10">
                      Cadastrar
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Modal Recuperação de Senha */}
        <Dialog open={showForgotPasswordModal} onOpenChange={setShowForgotPasswordModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-blue-900">Recuperar Senha</DialogTitle>
              <DialogDescription>
                Digite seu e-mail cadastrado e enviaremos as instruções para redefinir sua senha.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="forgot-email" className="text-sm font-medium">E-mail</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="mt-1"
                />
              </div>
              
              <div className="flex gap-3 justify-end pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowForgotPasswordModal(false);
                    setForgotPasswordEmail('');
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={() => {
                    if (!forgotPasswordEmail) {
                      toast.error('❌ Digite seu e-mail');
                      return;
                    }
                    // TODO: Implementar envio de email
                    toast.info('📧 Em breve: Link de recuperação será enviado para ' + forgotPasswordEmail);
                    setShowForgotPasswordModal(false);
                    setForgotPasswordEmail('');
                  }}
                  className="bg-blue-900 hover:bg-blue-800"
                >
                  Enviar Link
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
                <TabsTrigger value="usuarios">👤 Usuários</TabsTrigger>
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
                    <div className="flex items-center justify-between mb-3">
                      <Label htmlFor="month-obs" className="text-base font-semibold flex items-center gap-2">
                        📝 Observação do Mês
                        {monthObservationActive && (
                          <Badge className="bg-green-500">ATIVA</Badge>
                        )}
                      </Label>
                      
                      {/* TOGGLE - APENAS MASTER */}
                      {user?.role === 'master' && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">
                            {monthObservationActive ? 'Visível para todos' : 'Oculta'}
                          </span>
                          <Switch
                            checked={monthObservationActive}
                            onCheckedChange={setMonthObservationActive}
                            className="data-[state=checked]:bg-green-500"
                          />
                        </div>
                      )}
                    </div>
                    
                    {/* MASTER: Pode editar */}
                    {user?.role === 'master' ? (
                      <>
                        <div className="flex gap-2 mb-2">
                          <Textarea
                            id="month-obs"
                            value={monthObservation}
                            onChange={(e) => setMonthObservation(e.target.value)}
                            placeholder="Digite a mensagem que aparecerá como letreiro digital para todos os usuários..."
                            rows={3}
                            className="flex-1"
                            maxLength={MAX_OBSERVATION_LENGTH}
                          />
                          <div className="flex flex-col gap-2">
                            <Button 
                              onClick={handleSaveMonthObservation} 
                              className="bg-blue-600 hover:bg-blue-700"
                              disabled={uploadingReceipt}
                            >
                              <Save className="w-4 h-4 mr-2" />
                              Salvar
                            </Button>
                            <Button 
                              onClick={handleClearMonthObservation}
                              variant="outline"
                              size="sm"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Limpar
                            </Button>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 text-right">
                          {monthObservation.length} / {MAX_OBSERVATION_LENGTH} caracteres
                        </div>
                      </>
                    ) : (
                      /* OUTROS USUÁRIOS: Apenas visualização com letreiro animado */
                      <div className="relative overflow-hidden bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-lg p-4 min-h-[60px] flex items-center">
                        {monthObservationActive && monthObservation ? (
                          <div className="marquee-container w-full">
                            <div className="marquee-content text-white font-semibold text-lg">
                              {monthObservation}
                            </div>
                          </div>
                        ) : (
                          <p className="text-white/70 text-center w-full italic">
                            Sem mensagens no momento...
                          </p>
                        )}
                      </div>
                    )}
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
                    Solicitações de Liberação Pendentes ({unlockRequests.length})
                  </CardTitle>
                  <CardDescription>
                    Revise e aprove as solicitações de liberação para lançamentos em horários/dias anteriores
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {unlockRequests.map(req => (
                      <div key={req.requestId} className="bg-white p-4 rounded-lg border-2 border-orange-200 hover:border-orange-400 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-blue-600 text-white">
                                Dia {String(req.day).padStart(2, '0')}/{String(req.month).padStart(2, '0')}/{req.year}
                              </Badge>
                              <Badge variant="outline" className="text-blue-900">
                                {req.timeSlot}
                              </Badge>
                              {req.entryId ? (
                                <Badge variant="outline" className="text-xs text-gray-600">
                                  Edição
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-green-700">
                                  Novo Lançamento
                                </Badge>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-gray-500 text-xs">Solicitante:</p>
                                <p className="font-semibold text-gray-900">{req.requesterName}</p>
                                <p className="text-xs bg-yellow-100 text-yellow-800 inline-block px-2 py-1 rounded mt-1">
                                  {roleNames[req.requesterRole] || req.requesterRole || 'Usuário'}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500 text-xs">Email:</p>
                                <p className="font-medium text-gray-700 text-xs">{req.requesterEmail}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 text-xs">Igreja:</p>
                                <p className="font-medium text-gray-700">{req.requesterChurch || 'Não informada'}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 text-xs">Estado:</p>
                                <p className="font-medium text-gray-700">{req.requesterState || 'Não informado'}</p>
                              </div>
                            </div>
                            
                            <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                              <p className="text-xs text-gray-500">Motivo:</p>
                              <p className="text-sm text-gray-800 font-medium">{req.reason}</p>
                            </div>
                            
                            <p className="text-xs text-gray-500">
                              Solicitado em: {new Date(req.createdAt).toLocaleString('pt-BR')}
                            </p>
                          </div>
                          
                          <Button 
                            size="sm" 
                            onClick={() => handleApproveUnlock(req.requestId, req.entryId)}
                            className="bg-green-600 hover:bg-green-700 flex-shrink-0"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Aprovar
                          </Button>
                        </div>
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
                          const lockStatus = isEntryLocked(entry, currentBrazilTime, day, timeSlot);
                          const isPending = hasPendingRequest(day, timeSlot);
                          const isApproved = hasActiveOverride(day, timeSlot);
                          
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
                                <div>
                                  {/* Slot Vazio - Verificar status */}
                                  {isApproved ? (
                                    // APROVADO - Verde, pode lançar
                                    <div className="space-y-1">
                                      <div className="bg-green-100 border-2 border-green-500 rounded p-2 text-center">
                                        <p className="text-xs font-semibold text-green-800">✅ Liberado pelo Master</p>
                                      </div>
                                      <Button
                                        size="sm"
                                        className="w-full bg-green-600 hover:bg-green-700"
                                        onClick={() => {
                                          setEditingEntry({ day, timeSlot });
                                          setEntryValue('');
                                          setEntryNotes('');
                                        }}
                                      >
                                        + Lançar Agora
                                      </Button>
                                    </div>
                                  ) : isPending ? (
                                    // PENDENTE - Amarelo/Laranja
                                    <div className="bg-yellow-100 border-2 border-yellow-500 rounded p-3 text-center space-y-2">
                                      <div className="flex items-center justify-center gap-2">
                                        <Clock className="w-4 h-4 text-yellow-700 animate-pulse" />
                                        <p className="text-xs font-semibold text-yellow-800">⏳ Aguardando Aprovação</p>
                                      </div>
                                      <p className="text-xs text-yellow-700">
                                        Solicitação enviada ao Líder Máximo
                                      </p>
                                    </div>
                                  ) : !lockStatus.locked ? (
                                    // NÃO BLOQUEADO - Pode lançar normalmente
                                    <Button
                                      size="sm"
                                      className="w-full bg-blue-600 hover:bg-blue-700"
                                      onClick={() => {
                                        setEditingEntry({ day, timeSlot });
                                        setEntryValue('');
                                        setEntryNotes('');
                                      }}
                                    >
                                      + Lançar
                                    </Button>
                                  ) : (
                                    // BLOQUEADO - Cinza, com botão solicitar
                                    <div className="space-y-2">
                                      <Button
                                        size="sm"
                                        className="w-full bg-gray-400 cursor-not-allowed"
                                        disabled
                                      >
                                        🔒 Bloqueado
                                      </Button>
                                      {user?.role !== 'master' && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="w-full text-xs border-orange-300 hover:bg-orange-50 text-orange-700"
                                          onClick={() => handleRequestUnlockForEmptySlot(day, timeSlot)}
                                        >
                                          <Bell className="w-3 h-3 mr-1" />
                                          Solicitar Liberação
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </div>
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
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                    </div>
                    <p className="text-gray-500 mt-4">Carregando dados do dashboard...</p>
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
          
          {/* USUÁRIOS TAB */}
          {user?.role === 'master' && (
            <TabsContent value="usuarios">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-6 h-6" />
                    Gerenciamento de Usuários
                  </CardTitle>
                  <CardDescription>Cadastro completo de usuários do sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Botão Cadastrar Novo Usuário */}
                  <div className="flex justify-end">
                    <Button 
                      onClick={() => {
                        setUsuarioForm({
                          name: '',
                          email: '',
                          password: '',
                          telefone: '',
                          cep: '',
                          endereco: '',
                          numero: '',
                          complemento: '',
                          cidade: '',
                          estado: '',
                          pais: 'Brasil',
                          churchId: '',
                          cargo: ''
                        });
                        setUsuarioPhotoFile(null);
                        setUsuarioPhotoPreview(null);
                        setShowUsuarioCreateModal(true);
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Cadastrar Novo Usuário
                    </Button>
                  </div>

                  {/* Listagem de Usuários */}
                  <div className="border rounded-lg">
                    <div className="bg-gray-50 p-4 border-b space-y-3">
                      <h3 className="font-semibold text-lg">Usuários Cadastrados ({usuarios.length})</h3>
                      
                      {/* Campo de busca */}
                      <Input
                        placeholder="🔍 Buscar por nome, igreja ou função..."
                        value={usuariosSearchQuery}
                        onChange={(e) => setUsuariosSearchQuery(e.target.value)}
                        className="max-w-md"
                      />
                      
                      {usuariosSearchQuery && (
                        <p className="text-sm text-gray-600">
                          Mostrando {usuariosFiltrados.length} de {usuarios.length} usuários
                        </p>
                      )}
                    </div>
                    
                    <div className="p-4 space-y-6">
                      {Object.keys(usuariosGroupedFiltrado).length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>{usuariosSearchQuery ? 'Nenhum usuário encontrado com esses critérios' : 'Nenhum usuário cadastrado ainda'}</p>
                        </div>
                      ) : (
                        Object.entries(usuariosGroupedFiltrado).map(([churchName, cargos]) => (
                          <div key={churchName} className="border-2 border-blue-200 rounded-lg p-4">
                            <h4 className="font-bold text-lg text-blue-900 mb-4 flex items-center gap-2">
                              <MapPin className="w-5 h-5" />
                              {churchName}
                            </h4>
                            
                            {Object.entries(cargos).map(([cargo, usuariosList]) => (
                              <div key={cargo} className="mb-4 last:mb-0">
                                <h5 className="font-semibold text-md text-gray-700 mb-3 flex items-center gap-2">
                                  <FileUser className="w-4 h-4" />
                                  {cargo}
                                </h5>
                                
                                <div className="space-y-2">
                                  {usuariosList.map((usuario) => (
                                    <div key={usuario.userId} className="flex items-center gap-3 p-3 bg-white border rounded-lg hover:shadow-md transition-shadow">
                                      {/* Status Online/Offline */}
                                      <div className="flex-shrink-0">
                                        {usuario.isOnline ? (
                                          <div className="w-3 h-3 bg-green-500 rounded-full" title="Online" />
                                        ) : (
                                          <div className="w-3 h-3 bg-red-500 rounded-full" title="Offline" />
                                        )}
                                      </div>
                                      
                                      {/* Foto */}
                                      <div className="flex-shrink-0">
                                        {usuario.photoUrl ? (
                                          <img 
                                            src={usuario.photoUrl} 
                                            alt={usuario.name} 
                                            className="w-12 h-12 rounded-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                            <Users className="w-6 h-6 text-blue-600" />
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Informações */}
                                      <div className="flex-1 min-w-0">
                                        <p className="font-semibold truncate">{usuario.name}</p>
                                        <p className="text-sm text-gray-600 truncate">{usuario.email}</p>
                                        {usuario.telefone && (
                                          <p className="text-xs text-gray-500">{usuario.telefone}</p>
                                        )}
                                      </div>
                                      
                                      {/* Ações */}
                                      <div className="flex gap-1 flex-shrink-0">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => openViewUsuarioModal(usuario)}
                                          title="Visualizar"
                                        >
                                          <Eye className="w-4 h-4" />
                                        </Button>
                                        
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => openEditUsuarioModal(usuario)}
                                          title="Editar"
                                        >
                                          <Edit className="w-4 h-4" />
                                        </Button>
                                        
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleToggleUserActive(usuario)}
                                          title={usuario.isActive === false ? 'Ativar Usuário' : 'Desativar Usuário'}
                                          className={usuario.isActive === false ? 'text-green-600 hover:text-green-700' : 'text-orange-600 hover:text-orange-700'}
                                        >
                                          <Power className="w-4 h-4" />
                                        </Button>
                                        
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => openDeleteUsuarioModal(usuario)}
                                          title="Excluir"
                                          className="text-red-600 hover:text-red-700"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                        
                                        {usuario.telefone && (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => abrirWhatsApp(usuario.telefone)}
                                            title="WhatsApp"
                                            className="text-green-600 hover:text-green-700"
                                          >
                                            <MessageCircle className="w-4 h-4" />
                                          </Button>
                                        )}
                                        
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            // TODO: Implementar export PDF
                                            toast.info('Export PDF em desenvolvimento');
                                          }}
                                          title="Export PDF"
                                        >
                                          <FileText className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Modal Criar Usuário */}
              <Dialog open={showUsuarioCreateModal} onOpenChange={setShowUsuarioCreateModal}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    {/* Foto */}
                    <div className="flex flex-col items-center gap-3">
                      {usuarioPhotoPreview ? (
                        <img src={usuarioPhotoPreview} alt="Preview" className="w-24 h-24 rounded-full object-cover" />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                          <Users className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                      <Label htmlFor="usuario-photo-create" className="cursor-pointer">
                        <div className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                          {usuarioPhotoPreview ? 'Trocar Foto' : 'Adicionar Foto (Opcional)'}
                        </div>
                        <Input
                          id="usuario-photo-create"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleUsuarioPhotoChange}
                        />
                      </Label>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Nome Completo *</Label>
                        <Input
                          value={usuarioForm.name}
                          onChange={(e) => setUsuarioForm({...usuarioForm, name: e.target.value})}
                          placeholder="Nome completo do usuário"
                        />
                      </div>
                      
                      <div>
                        <Label>E-mail *</Label>
                        <Input
                          type="email"
                          value={usuarioForm.email}
                          onChange={(e) => setUsuarioForm({...usuarioForm, email: e.target.value})}
                          placeholder="email@exemplo.com"
                        />
                      </div>
                      
                      <div>
                        <Label>Senha *</Label>
                        <Input
                          type="password"
                          value={usuarioForm.password}
                          onChange={(e) => setUsuarioForm({...usuarioForm, password: e.target.value})}
                          placeholder="Senha inicial"
                        />
                      </div>
                      
                      <div>
                        <Label>Telefone (WhatsApp)</Label>
                        <Input
                          value={maskPhone(usuarioForm.telefone)}
                          onChange={(e) => {
                            const masked = maskPhone(e.target.value);
                            setUsuarioForm({...usuarioForm, telefone: masked});
                          }}
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                      
                      <div>
                        <Label>CEP</Label>
                        <Input
                          value={maskCEP(usuarioForm.cep)}
                          onChange={(e) => {
                            const masked = maskCEP(e.target.value);
                            setUsuarioForm({...usuarioForm, cep: masked});
                            if (masked.replace(/\D/g, '').length === 8) {
                              handleBuscarCEP(masked.replace(/\D/g, ''));
                            }
                          }}
                          placeholder="00000-000"
                        />
                      </div>
                      
                      <div>
                        <Label>Endereço</Label>
                        <Input
                          value={usuarioForm.endereco}
                          onChange={(e) => setUsuarioForm({...usuarioForm, endereco: e.target.value})}
                          placeholder="Rua, Avenida..."
                          disabled={loadingCEP}
                        />
                      </div>
                      
                      <div>
                        <Label>Número</Label>
                        <Input
                          value={usuarioForm.numero}
                          onChange={(e) => setUsuarioForm({...usuarioForm, numero: e.target.value})}
                          placeholder="Número"
                        />
                      </div>
                      
                      <div>
                        <Label>Complemento</Label>
                        <Input
                          value={usuarioForm.complemento}
                          onChange={(e) => setUsuarioForm({...usuarioForm, complemento: e.target.value})}
                          placeholder="Apto, Bloco..."
                        />
                      </div>
                      
                      <div>
                        <Label>Cidade</Label>
                        <Input
                          value={usuarioForm.cidade}
                          onChange={(e) => setUsuarioForm({...usuarioForm, cidade: e.target.value})}
                          placeholder="Cidade"
                          disabled={loadingCEP}
                        />
                      </div>
                      
                      <div>
                        <Label>Estado</Label>
                        <Input
                          value={usuarioForm.estado}
                          onChange={(e) => setUsuarioForm({...usuarioForm, estado: e.target.value})}
                          placeholder="UF"
                          disabled={loadingCEP}
                        />
                      </div>
                      
                      <div>
                        <Label>País</Label>
                        <Input
                          value={usuarioForm.pais}
                          onChange={(e) => setUsuarioForm({...usuarioForm, pais: e.target.value})}
                          placeholder="País"
                        />
                      </div>
                      
                      <div>
                        <Label>Igreja *</Label>
                        <Select 
                          value={usuarioForm.churchId} 
                          onValueChange={(v) => setUsuarioForm({...usuarioForm, churchId: v})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a igreja" />
                          </SelectTrigger>
                          <SelectContent>
                            {churches.map(church => (
                              <SelectItem key={church.churchId} value={church.churchId}>
                                {church.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Cargo/Função</Label>
                        <Select 
                          value={usuarioForm.cargo} 
                          onValueChange={(v) => setUsuarioForm({...usuarioForm, cargo: v})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o cargo" />
                          </SelectTrigger>
                          <SelectContent>
                            {allRolesForDropdown.map(r => (
                              <SelectItem key={r.roleId} value={r.name}>
                                {r.name}
                              </SelectItem>
                            ))}
                            {allRolesForDropdown.length === 0 && (
                              <>
                                <SelectItem value="Secretário(a)">Secretário(a)</SelectItem>
                                <SelectItem value="Tesoureiro(a)">Tesoureiro(a)</SelectItem>
                                <SelectItem value="Pastor(a)">Pastor(a)</SelectItem>
                                <SelectItem value="Bispo(a)">Bispo(a)</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 justify-end pt-4">
                      <Button variant="outline" onClick={() => setShowUsuarioCreateModal(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateUsuario} className="bg-green-600 hover:bg-green-700">
                        Cadastrar Usuário
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              {/* Modal Editar Usuário */}
              <Dialog open={showUsuarioEditModal} onOpenChange={setShowUsuarioEditModal}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Editar Usuário</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    {/* Foto */}
                    <div className="flex flex-col items-center gap-3">
                      {usuarioPhotoPreview ? (
                        <img src={usuarioPhotoPreview} alt="Preview" className="w-24 h-24 rounded-full object-cover" />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                          <Users className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                      <Label htmlFor="usuario-photo-edit" className="cursor-pointer">
                        <div className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                          Trocar Foto
                        </div>
                        <Input
                          id="usuario-photo-edit"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleUsuarioPhotoChange}
                        />
                      </Label>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Nome Completo</Label>
                        <Input
                          value={usuarioForm.name}
                          onChange={(e) => setUsuarioForm({...usuarioForm, name: e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <Label>E-mail</Label>
                        <Input
                          type="email"
                          value={usuarioForm.email}
                          onChange={(e) => setUsuarioForm({...usuarioForm, email: e.target.value})}
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <Label>Nova Senha (deixe em branco para não alterar)</Label>
                        <Input
                          type="password"
                          value={newPasswordUsuario}
                          onChange={(e) => setNewPasswordUsuario(e.target.value)}
                          placeholder="Nova senha (opcional)"
                        />
                      </div>
                      
                      <div>
                        <Label>Telefone (WhatsApp)</Label>
                        <Input
                          value={maskPhone(usuarioForm.telefone)}
                          onChange={(e) => {
                            const masked = maskPhone(e.target.value);
                            setUsuarioForm({...usuarioForm, telefone: masked});
                          }}
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                      
                      <div>
                        <Label>CEP</Label>
                        <Input
                          value={maskCEP(usuarioForm.cep)}
                          onChange={(e) => {
                            const masked = maskCEP(e.target.value);
                            setUsuarioForm({...usuarioForm, cep: masked});
                            if (masked.replace(/\D/g, '').length === 8) {
                              handleBuscarCEP(masked.replace(/\D/g, ''));
                            }
                          }}
                          placeholder="00000-000"
                        />
                      </div>
                      
                      <div>
                        <Label>Endereço</Label>
                        <Input
                          value={usuarioForm.endereco}
                          onChange={(e) => setUsuarioForm({...usuarioForm, endereco: e.target.value})}
                          disabled={loadingCEP}
                        />
                      </div>
                      
                      <div>
                        <Label>Número</Label>
                        <Input
                          value={usuarioForm.numero}
                          onChange={(e) => setUsuarioForm({...usuarioForm, numero: e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <Label>Complemento</Label>
                        <Input
                          value={usuarioForm.complemento}
                          onChange={(e) => setUsuarioForm({...usuarioForm, complemento: e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <Label>Cidade</Label>
                        <Input
                          value={usuarioForm.cidade}
                          onChange={(e) => setUsuarioForm({...usuarioForm, cidade: e.target.value})}
                          disabled={loadingCEP}
                        />
                      </div>
                      
                      <div>
                        <Label>Estado</Label>
                        <Input
                          value={usuarioForm.estado}
                          onChange={(e) => setUsuarioForm({...usuarioForm, estado: e.target.value})}
                          disabled={loadingCEP}
                        />
                      </div>
                      
                      <div>
                        <Label>País</Label>
                        <Input
                          value={usuarioForm.pais}
                          onChange={(e) => setUsuarioForm({...usuarioForm, pais: e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <Label>Igreja</Label>
                        <Select 
                          value={usuarioForm.churchId} 
                          onValueChange={(v) => setUsuarioForm({...usuarioForm, churchId: v})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a igreja" />
                          </SelectTrigger>
                          <SelectContent>
                            {churches.map(church => (
                              <SelectItem key={church.churchId} value={church.churchId}>
                                {church.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Cargo/Função</Label>
                        <Select 
                          value={usuarioForm.cargo} 
                          onValueChange={(v) => setUsuarioForm({...usuarioForm, cargo: v})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o cargo" />
                          </SelectTrigger>
                          <SelectContent>
                            {allRolesForDropdown.map(r => (
                              <SelectItem key={r.roleId} value={r.name}>
                                {r.name}
                              </SelectItem>
                            ))}
                            {allRolesForDropdown.length === 0 && (
                              <>
                                <SelectItem value="Secretário(a)">Secretário(a)</SelectItem>
                                <SelectItem value="Tesoureiro(a)">Tesoureiro(a)</SelectItem>
                                <SelectItem value="Pastor(a)">Pastor(a)</SelectItem>
                                <SelectItem value="Bispo(a)">Bispo(a)</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 justify-end pt-4">
                      <Button variant="outline" onClick={() => setShowUsuarioEditModal(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleUpdateUsuario} className="bg-blue-600 hover:bg-blue-700">
                        Salvar Alterações
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              {/* Modal Visualizar Usuário */}
              <Dialog open={showUsuarioViewModal} onOpenChange={setShowUsuarioViewModal}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Detalhes do Usuário</DialogTitle>
                  </DialogHeader>
                  
                  {selectedUsuario && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        {selectedUsuario.photoUrl ? (
                          <img 
                            src={selectedUsuario.photoUrl} 
                            alt={selectedUsuario.name} 
                            className="w-20 h-20 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                            <Users className="w-10 h-10 text-gray-400" />
                          </div>
                        )}
                        
                        <div>
                          <h3 className="text-xl font-bold">{selectedUsuario.name}</h3>
                          <p className="text-gray-600">{selectedUsuario.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {selectedUsuario.isOnline ? (
                              <>
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                                <span className="text-sm text-green-600">Online</span>
                              </>
                            ) : (
                              <>
                                <div className="w-2 h-2 bg-red-500 rounded-full" />
                                <span className="text-sm text-red-600">Offline</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                          <Label className="text-gray-500 text-sm">Telefone</Label>
                          <p className="font-medium">{selectedUsuario.telefone || 'Não informado'}</p>
                        </div>
                        
                        <div>
                          <Label className="text-gray-500 text-sm">Cargo</Label>
                          <p className="font-medium">{selectedUsuario.cargo || 'Não informado'}</p>
                        </div>
                        
                        <div>
                          <Label className="text-gray-500 text-sm">Igreja</Label>
                          <p className="font-medium">{selectedUsuario.churchName || selectedUsuario.church || 'Não informado'}</p>
                        </div>
                        
                        <div>
                          <Label className="text-gray-500 text-sm">CEP</Label>
                          <p className="font-medium">{selectedUsuario.cep || 'Não informado'}</p>
                        </div>
                        
                        <div className="col-span-2">
                          <Label className="text-gray-500 text-sm">Endereço Completo</Label>
                          <p className="font-medium">
                            {selectedUsuario.endereco ? `${selectedUsuario.endereco}${selectedUsuario.numero ? `, ${selectedUsuario.numero}` : ''}${selectedUsuario.complemento ? ` - ${selectedUsuario.complemento}` : ''}` : 'Não informado'}
                          </p>
                          {selectedUsuario.cidade && (
                            <p className="text-sm text-gray-600">{selectedUsuario.cidade} - {selectedUsuario.estado} - {selectedUsuario.pais || 'Brasil'}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-4">
                        <Button 
                          onClick={() => {
                            setShowUsuarioViewModal(false);
                            openEditUsuarioModal(selectedUsuario);
                          }}
                          className="flex-1"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </Button>
                        
                        {selectedUsuario.telefone && (
                          <Button 
                            onClick={() => {
                              abrirWhatsApp(selectedUsuario.telefone);
                            }}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            WhatsApp
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
              
              {/* Modal Deletar Usuário */}
              <Dialog open={showUsuarioDeleteModal} onOpenChange={setShowUsuarioDeleteModal}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirmar Exclusão</DialogTitle>
                    <DialogDescription>
                      Tem certeza que deseja excluir o usuário <strong>{selectedUsuario?.name}</strong>? Esta ação não pode ser desfeita.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="flex gap-3 justify-end pt-4">
                    <Button variant="outline" onClick={() => setShowUsuarioDeleteModal(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleDeleteUsuario} className="bg-red-600 hover:bg-red-700">
                      Sim, Excluir
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </TabsContent>
          )}
          
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
                                        <div className="grid grid-cols-3 gap-1">
                                          <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="text-xs"
                                            onClick={() => {
                                              setSelectedUser(u);
                                              setShowUserViewModal(true);
                                            }}
                                          >
                                            <Eye className="w-3 h-3" />
                                          </Button>
                                          <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="text-xs"
                                            onClick={() => {
                                              setSelectedUser(u);
                                              setShowUserEditModal(true);
                                            }}
                                          >
                                            <Edit className="w-3 h-3" />
                                          </Button>
                                          <Button 
                                            size="sm" 
                                            variant="destructive" 
                                            className="text-xs"
                                            onClick={() => {
                                              setSelectedUser(u);
                                              setShowUserDeleteConfirm(true);
                                            }}
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </div>
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
                          <div>
                            <Label>Nome da Igreja *</Label>
                            <Input 
                              value={newChurchName}
                              onChange={(e) => setNewChurchName(e.target.value)}
                              placeholder="Ex: Igreja Central - IUDP" 
                              className="mt-1" 
                            />
                          </div>
                          <div>
                            <Label>CEP *</Label>
                            <Input 
                              value={newChurchCEP}
                              onChange={(e) => handleCEPChange(e.target.value)}
                              placeholder="00000-000" 
                              maxLength={9}
                              className="mt-1" 
                            />
                            {loadingCEP && <p className="text-xs text-blue-600 mt-1">🔍 Buscando endereço...</p>}
                          </div>
                          <div className="col-span-2">
                            <Label>Endereço (Rua/Avenida)</Label>
                            <Input 
                              value={newChurchAddress}
                              onChange={(e) => setNewChurchAddress(e.target.value)}
                              placeholder="Rua/Avenida" 
                              className="mt-1" 
                            />
                          </div>
                          <div>
                            <Label>Número</Label>
                            <Input 
                              value={newChurchNumber}
                              onChange={(e) => setNewChurchNumber(e.target.value)}
                              placeholder="123" 
                              className="mt-1" 
                            />
                          </div>
                          <div>
                            <Label>Complemento</Label>
                            <Input 
                              value={newChurchComplement}
                              onChange={(e) => setNewChurchComplement(e.target.value)}
                              placeholder="Sala 10, Bloco A..." 
                              className="mt-1" 
                            />
                          </div>
                          <div>
                            <Label>Bairro</Label>
                            <Input 
                              value={newChurchNeighborhood}
                              onChange={(e) => setNewChurchNeighborhood(e.target.value)}
                              placeholder="Centro" 
                              className="mt-1" 
                            />
                          </div>
                          <div>
                            <Label>Cidade</Label>
                            <Input 
                              value={newChurchCity}
                              onChange={(e) => setNewChurchCity(e.target.value)}
                              placeholder="São Paulo" 
                              className="mt-1" 
                            />
                          </div>
                          <div>
                            <Label>Estado (UF)</Label>
                            <Input 
                              value={newChurchState}
                              onChange={(e) => setNewChurchState(e.target.value)}
                              placeholder="SP" 
                              maxLength={2}
                              className="mt-1" 
                            />
                          </div>
                          <div>
                            <Label>Região</Label>
                            <Input 
                              value={newChurchRegion}
                              onChange={(e) => setNewChurchRegion(e.target.value)}
                              placeholder="Zona Sul" 
                              className="mt-1" 
                            />
                          </div>
                          <div>
                            <Label>Telefone (opcional)</Label>
                            <Input 
                              value={maskPhone(newChurchPhone)}
                              onChange={(e) => setNewChurchPhone(maskPhone(e.target.value))}
                              placeholder="(00) 00000-0000" 
                              className="mt-1" 
                            />
                          </div>
                          <div>
                            <Label>País</Label>
                            <Input 
                              value={newChurchCountry}
                              onChange={(e) => setNewChurchCountry(e.target.value)}
                              placeholder="Brasil" 
                              className="mt-1" 
                            />
                          </div>
                          <div>
                            <Label>Foto da Igreja (opcional)</Label>
                            <Input 
                              type="file" 
                              accept="image/*" 
                              onChange={handleChurchPhotoSelect}
                              className="mt-1" 
                            />
                            {churchPhotoPreview && (
                              <img 
                                src={churchPhotoPreview} 
                                alt="Preview" 
                                className="mt-2 w-24 h-24 rounded object-cover"
                              />
                            )}
                          </div>
                        </div>
                        
                        <Button 
                          onClick={handleCreateChurchForm}
                          className="mt-4 w-full bg-blue-600 hover:bg-blue-700"
                        >
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
                        {allChurches.length === 0 ? (
                          <Button onClick={fetchAllChurches}>Carregar Igrejas</Button>
                        ) : (
                          <div className="space-y-4">
                            {allChurches.map(church => (
                              <Card key={church.churchId} className="border-2 border-blue-200">
                                <CardContent className="pt-4">
                                  <div className="flex gap-4">
                                    {church.photoUrl ? (
                                      <img 
                                        src={church.photoUrl} 
                                        alt={church.name}
                                        className="w-32 h-32 rounded-lg object-cover border-2 border-gray-300"
                                        onError={(e) => {
                                          e.target.onerror = null;
                                          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2UwZTBlMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjQwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+8J+Pm++4jzwvdGV4dD48L3N2Zz4=';
                                        }}
                                      />
                                    ) : (
                                      <div className="w-32 h-32 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center border-2 border-blue-300">
                                        <span className="text-6xl">🏛️</span>
                                      </div>
                                    )}
                                    <div className="flex-1">
                                      <h3 className="text-lg font-bold">{church.name}</h3>
                                      <p className="text-sm text-gray-600">{church.city} - {church.state} • {church.region}</p>
                                      <p className="text-xs text-gray-500 mt-1">📍 {church.address}</p>
                                      
                                      <div className="mt-3 pt-3 border-t">
                                        <p className="text-xs text-gray-500 font-medium mb-2">Pastor/Bispo Responsável:</p>
                                        <div className="flex items-center gap-3">
                                          {church.pastor ? (
                                            <>
                                              {church.pastor.photoUrl ? (
                                                <img 
                                                  src={church.pastor.photoUrl} 
                                                  alt={church.pastor.name}
                                                  className="w-14 h-14 rounded-full object-cover border-2 border-blue-300"
                                                  onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2UwZTBlMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjQwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+8J+RpDwvdGV4dD48L3N2Zz4=';
                                                  }}
                                                />
                                              ) : (
                                                <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center border-2 border-purple-300">
                                                  <span className="text-2xl">👤</span>
                                                </div>
                                              )}
                                              <div className="flex-1">
                                                <p className="font-semibold text-sm">{church.pastor.name}</p>
                                                <p className="text-xs text-gray-500">{church.pastor.email}</p>
                                                <Badge variant="outline" className="text-xs mt-1">{church.pastor.role}</Badge>
                                              </div>
                                            </>
                                          ) : (
                                            <div className="flex items-center gap-3 flex-1">
                                              <div className="w-14 h-14 bg-gray-200 rounded-full flex items-center justify-center border-2 border-gray-300">
                                                <span className="text-2xl">👤</span>
                                              </div>
                                              <p className="text-sm text-gray-500 italic">Sem pastor designado</p>
                                            </div>
                                          )}
                                          <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="ml-auto"
                                            onClick={() => {
                                              setSelectedChurch(church);
                                              fetchAvailablePastors();
                                              setShowChangePastorModal(true);
                                            }}
                                          >
                                            🔄 Trocar
                                          </Button>
                                        </div>
                                      </div>
                                      
                                      <div className="flex gap-2 mt-3">
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={() => {
                                            setSelectedChurch(church);
                                            setShowChurchViewModal(true);
                                          }}
                                        >
                                          <Eye className="w-4 h-4 mr-1" />
                                          Visualizar
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={() => {
                                            setSelectedChurch(church);
                                            setShowChurchEditModal(true);
                                          }}
                                        >
                                          <Edit className="w-4 h-4 mr-1" />
                                          Editar
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          variant="destructive"
                                          onClick={() => {
                                            setSelectedChurch(church);
                                            setShowChurchDeleteConfirm(true);
                                          }}
                                        >
                                          <Trash2 className="w-4 h-4 mr-1" />
                                          Excluir
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
                      <div className="text-center p-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Carregando estatísticas...</p>
                      </div>
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
                      link.href = `/api/download/receipt/${receipt.filepath}`;
                      link.download = receipt.filename;
                      link.target = '_blank';
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
      
      {/* Dialog de Confirmação de Logout */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="w-5 h-5" />
              Confirmar Saída
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja sair do sistema?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600">
              Ao sair, você precisará fazer login novamente para acessar o sistema.
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-gray-700">
                💡 Seus dados estão salvos e seguros. Esta ação apenas encerrará sua sessão atual.
              </p>
            </div>
          </div>
          
          <div className="flex gap-3 justify-end">
            <Button 
              variant="outline" 
              onClick={() => setShowLogoutConfirm(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={confirmLogout}
              className="bg-red-600 hover:bg-red-700"
            >
              Sim, Sair
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Dialog de Confirmação - Excluir Usuário */}
      <Dialog open={showUserDeleteConfirm} onOpenChange={setShowUserDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este usuário?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedUser && (
              <div className="bg-gray-50 p-3 rounded">
                <p className="font-semibold">{selectedUser.name}</p>
                <p className="text-sm text-gray-600">{selectedUser.email}</p>
              </div>
            )}
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800 font-medium">
                ⚠️ Esta ação não pode ser desfeita!
              </p>
            </div>
          </div>
          
          <div className="flex gap-3 justify-end">
            <Button 
              variant="outline" 
              onClick={() => setShowUserDeleteConfirm(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => handleDeleteUser(selectedUser?.userId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Sim, Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Dialog de Confirmação - Excluir Igreja */}
      <Dialog open={showChurchDeleteConfirm} onOpenChange={setShowChurchDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Confirmar Exclusão da Igreja
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta igreja?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedChurch && (
              <div className="bg-gray-50 p-3 rounded">
                <p className="font-semibold">{selectedChurch.name}</p>
                <p className="text-sm text-gray-600">{selectedChurch.city} - {selectedChurch.state}</p>
              </div>
            )}
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800 font-medium">
                ⚠️ Esta ação não pode ser desfeita! Todos os usuários associados perderão a referência a esta igreja.
              </p>
            </div>
          </div>
          
          <div className="flex gap-3 justify-end">
            <Button 
              variant="outline" 
              onClick={() => setShowChurchDeleteConfirm(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => handleDeleteChurch(selectedChurch?.churchId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Sim, Excluir Igreja
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Dialog - Trocar Pastor */}
      <Dialog open={showChangePastorModal} onOpenChange={setShowChangePastorModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🔄 Trocar Pastor
            </DialogTitle>
            <DialogDescription>
              Selecione um pastor para a igreja {selectedChurch?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Input 
              placeholder="Buscar por nome ou email..."
              value={pastorSearchQuery}
              onChange={(e) => setPastorSearchQuery(e.target.value)}
            />
            
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredPastors.length === 0 ? (
                <div className="text-center p-8 text-gray-500">
                  <p>Nenhum pastor, bispo ou master encontrado.</p>
                  <p className="text-sm mt-2">Tente ajustar sua busca.</p>
                </div>
              ) : (
                filteredPastors.map(pastor => (
                  <Card 
                    key={pastor.userId} 
                    className={`cursor-pointer hover:bg-gray-50 transition-all ${!pastor.available ? 'opacity-60' : ''}`}
                    onClick={() => {
                      const roleLabel = pastor.role === 'master' ? 'Master' : 
                                       pastor.role === 'bispo' ? 'Bispo' : 
                                       pastor.role === 'leader' ? 'Líder' : 'Pastor';
                      if (window.confirm(`Confirma designar ${roleLabel} ${pastor.name} para esta igreja?`)) {
                        handleChangePastor(selectedChurch.churchId, pastor.userId);
                      }
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        {pastor.photoUrl ? (
                          <img 
                            src={pastor.photoUrl} 
                            alt={pastor.name}
                            className="w-14 h-14 rounded-full object-cover border-2 border-purple-300"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2UwZTBlMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjQwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+8J+RpDwvdGV4dD48L3N2Zz4=';
                            }}
                          />
                        ) : (
                          <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center border-2 border-purple-300">
                            <span className="text-2xl">
                              {pastor.role === 'master' ? '👑' : 
                               pastor.role === 'bispo' ? '⛪' : '👤'}
                            </span>
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{pastor.name}</p>
                            <Badge variant={
                              pastor.role === 'master' ? 'default' : 
                              pastor.role === 'bispo' ? 'secondary' : 
                              'outline'
                            } className="text-xs">
                              {pastor.role === 'master' ? '👑 Master' : 
                               pastor.role === 'bispo' ? '⛪ Bispo' : 
                               pastor.role === 'leader' ? '📌 Líder' : '👤 Pastor'}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600">{pastor.email}</p>
                          {pastor.church && (
                            <p className="text-xs text-gray-500 mt-1">🏛️ {pastor.church}</p>
                          )}
                        </div>
                        {pastor.available ? (
                          <Badge className="bg-green-500 text-white">✅ Disponível</Badge>
                        ) : (
                          <Badge className="bg-yellow-500 text-white">⚠️ Já tem igreja</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
          
          <div className="flex gap-3 justify-end">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowChangePastorModal(false);
                setPastorSearchQuery('');
              }}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Dialog - Editar Usuário */}
      <Dialog open={showUserEditModal} onOpenChange={setShowUserEditModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>✏️ Editar Usuário</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Nome Completo</Label>
                <Input 
                  value={editUserData.name || selectedUser.name}
                  onChange={(e) => setEditUserData({...editUserData, name: e.target.value})}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input 
                  value={editUserData.email || selectedUser.email}
                  onChange={(e) => setEditUserData({...editUserData, email: e.target.value})}
                />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <Button variant="outline" onClick={() => setShowUserEditModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => handleEditUser(selectedUser.userId, editUserData)}>
                  💾 Salvar Alterações
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Dialog - Visualizar Usuário */}
      <Dialog open={showUserViewModal} onOpenChange={setShowUserViewModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>👁️ Visualizar Usuário</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500 text-xs">Nome</Label>
                  <p className="font-semibold">{selectedUser.name}</p>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">Email</Label>
                  <p className="font-semibold">{selectedUser.email}</p>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">Função</Label>
                  <Badge>{selectedUser.role}</Badge>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">Escopo</Label>
                  <Badge variant="outline">{selectedUser.scope}</Badge>
                </div>
                {selectedUser.church && (
                  <div>
                    <Label className="text-gray-500 text-xs">Igreja</Label>
                    <p>{selectedUser.church}</p>
                  </div>
                )}
              </div>
              <Button variant="outline" onClick={() => setShowUserViewModal(false)} className="w-full mt-4">
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Dialog - Visualizar Igreja */}
      <Dialog open={showChurchViewModal} onOpenChange={setShowChurchViewModal}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>👁️ Visualizar Igreja</DialogTitle>
          </DialogHeader>
          {selectedChurch && (
            <div className="space-y-4 py-4">
              <div className="flex gap-4">
                {selectedChurch.photoUrl ? (
                  <img 
                    src={selectedChurch.photoUrl} 
                    alt={selectedChurch.name}
                    className="w-32 h-32 rounded-lg object-cover border-2"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className="w-32 h-32 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center border-2 border-blue-300" style={{display: selectedChurch.photoUrl ? 'none' : 'flex'}}>
                  <span className="text-6xl">🏛️</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{selectedChurch.name}</h3>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <Label className="text-gray-500 text-xs">CEP</Label>
                      <p className="text-sm">{selectedChurch.cep || 'Não informado'}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">Estado</Label>
                      <p className="text-sm">{selectedChurch.state}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div className="col-span-2">
                  <Label className="text-gray-500 text-xs">Endereço Completo</Label>
                  <p>{selectedChurch.address}, {selectedChurch.number || 'S/N'}</p>
                  {selectedChurch.complement && <p className="text-sm text-gray-600">{selectedChurch.complement}</p>}
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">Bairro</Label>
                  <p>{selectedChurch.neighborhood || 'Não informado'}</p>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">Cidade</Label>
                  <p>{selectedChurch.city}</p>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">Região</Label>
                  <p>{selectedChurch.region || 'Não informada'}</p>
                </div>
              </div>
              
              {selectedChurch.pastor && (
                <div className="border-t pt-4">
                  <Label className="text-gray-500 text-xs mb-2 block">Pastor/Bispo Responsável</Label>
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded">
                    {selectedChurch.pastor.photoUrl ? (
                      <img 
                        src={selectedChurch.pastor.photoUrl} 
                        alt={selectedChurch.pastor.name}
                        className="w-16 h-16 rounded-full object-cover border-2"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center border-2">
                        <span className="text-3xl">👤</span>
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">{selectedChurch.pastor.name}</p>
                      <p className="text-sm text-gray-600">{selectedChurch.pastor.email}</p>
                      <Badge variant="outline" className="mt-1">{selectedChurch.pastor.role}</Badge>
                    </div>
                  </div>
                </div>
              )}
              
              <Button variant="outline" onClick={() => setShowChurchViewModal(false)} className="w-full mt-4">
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Dialog - Editar Igreja */}
      <Dialog open={showChurchEditModal} onOpenChange={setShowChurchEditModal}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>✏️ Editar Igreja</DialogTitle>
          </DialogHeader>
          {selectedChurch && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome da Igreja</Label>
                  <Input 
                    value={editChurchData.name || selectedChurch.name}
                    onChange={(e) => setEditChurchData({...editChurchData, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label>CEP</Label>
                  <Input 
                    value={maskCEP(editChurchData.cep || selectedChurch.cep || '')}
                    onChange={async (e) => {
                      const masked = maskCEP(e.target.value);
                      setEditChurchData({...editChurchData, cep: masked});
                      
                      // Buscar endereço quando CEP estiver completo
                      if (masked.replace(/\D/g, '').length === 8) {
                        setLoadingCEP(true);
                        try {
                          const response = await fetch(`https://viacep.com.br/ws/${masked.replace(/\D/g, '')}/json/`);
                          const data = await response.json();
                          
                          if (!data.erro) {
                            setEditChurchData({
                              ...editChurchData,
                              cep: masked,
                              address: data.logradouro || '',
                              neighborhood: data.bairro || '',
                              city: data.localidade || '',
                              state: data.uf || '',
                              country: 'Brasil'
                            });
                            toast.success('✅ Endereço encontrado!');
                          } else {
                            toast.error('❌ CEP não encontrado');
                          }
                        } catch (error) {
                          toast.error('❌ Erro ao buscar CEP');
                        } finally {
                          setLoadingCEP(false);
                        }
                      }
                    }}
                    maxLength={9}
                    placeholder="00000-000"
                  />
                  {loadingCEP && <p className="text-xs text-blue-600 mt-1">🔍 Buscando endereço...</p>}
                </div>
              </div>
              <div>
                <Label>Endereço (Rua/Avenida)</Label>
                <Input 
                  value={editChurchData.address || selectedChurch.address}
                  onChange={(e) => setEditChurchData({...editChurchData, address: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Número</Label>
                  <Input 
                    value={editChurchData.number || selectedChurch.number}
                    onChange={(e) => setEditChurchData({...editChurchData, number: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Complemento</Label>
                  <Input 
                    value={editChurchData.complement || selectedChurch.complement}
                    onChange={(e) => setEditChurchData({...editChurchData, complement: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Bairro</Label>
                  <Input 
                    value={editChurchData.neighborhood || selectedChurch.neighborhood}
                    onChange={(e) => setEditChurchData({...editChurchData, neighborhood: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Cidade</Label>
                  <Input 
                    value={editChurchData.city || selectedChurch.city}
                    onChange={(e) => setEditChurchData({...editChurchData, city: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Estado</Label>
                  <Input 
                    value={editChurchData.state || selectedChurch.state}
                    onChange={(e) => setEditChurchData({...editChurchData, state: e.target.value})}
                    maxLength={2}
                  />
                </div>
              </div>
              <div>
                <Label>Região</Label>
                <Input 
                  value={editChurchData.region || selectedChurch.region}
                  onChange={(e) => setEditChurchData({...editChurchData, region: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Telefone (opcional)</Label>
                  <Input 
                    value={maskPhone(editChurchData.phone || selectedChurch.phone || '')}
                    onChange={(e) => setEditChurchData({...editChurchData, phone: maskPhone(e.target.value)})}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <Label>País</Label>
                  <Input 
                    value={editChurchData.country || selectedChurch.country || 'Brasil'}
                    onChange={(e) => setEditChurchData({...editChurchData, country: e.target.value})}
                    placeholder="Brasil"
                  />
                </div>
              </div>
              <div>
                <Label>Atualizar Foto da Igreja</Label>
                <Input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleChurchPhotoSelect}
                  className="mt-1" 
                />
                {(churchPhotoPreview || selectedChurch.photoUrl) && (
                  <img 
                    src={churchPhotoPreview || selectedChurch.photoUrl} 
                    alt="Preview" 
                    className="mt-2 w-32 h-32 rounded object-cover"
                  />
                )}
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <Button variant="outline" onClick={() => {
                  setShowChurchEditModal(false);
                  setChurchPhotoFile(null);
                  setChurchPhotoPreview(null);
                }}>
                  Cancelar
                </Button>
                <Button onClick={async () => {
                  try {
                    // Atualizar dados da igreja
                    const res = await fetch('/api/churches/update', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({
                        churchId: selectedChurch.churchId,
                        churchData: editChurchData
                      })
                    });
                    
                    const data = await res.json();
                    if (res.ok) {
                      // Upload de foto se houver
                      if (churchPhotoFile) {
                        await handleUploadChurchPhoto(selectedChurch.churchId);
                      }
                      
                      toast.success('✅ Igreja atualizada com sucesso!');
                      setShowChurchEditModal(false);
                      setChurchPhotoFile(null);
                      setChurchPhotoPreview(null);
                      fetchAllChurches();
                    } else {
                      toast.error('❌ ' + data.error);
                    }
                  } catch (error) {
                    toast.error('❌ Erro ao atualizar igreja');
                  }
                }}>
                  💾 Salvar Alterações
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}