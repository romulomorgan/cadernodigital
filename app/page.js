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
import { Clock, Lock, Unlock, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, AlertCircle, CheckCircle, Bell, Upload, Download, Users, FileText, TrendingUp, TrendingDown, BarChart3, Eye, EyeOff, LockIcon, LockOpen, Save, X, ArrowLeft, ArrowRight, Printer, Edit, Trash2, MessageCircle, FileUser, MapPin, Power, DollarSign, XCircle, Plus, User, Church, Calendar } from 'lucide-react';
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
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [showEditUserPassword, setShowEditUserPassword] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  
  // Calendar states
  const [currentDate, setCurrentDate] = useState(new Date());
  const [entries, setEntries] = useState([]);
  const [selectedChurchFilter, setSelectedChurchFilter] = useState('all'); // Filtro de igreja
  const [monthClosed, setMonthClosed] = useState(false);
  const [monthObservation, setMonthObservation] = useState('');
  const [monthObservationActive, setMonthObservationActive] = useState(false);
  const [dayObservations, setDayObservations] = useState([]);
  const [editingEntry, setEditingEntry] = useState(null);
  const [entryValue, setEntryValue] = useState('');
  const [entryDinheiro, setEntryDinheiro] = useState('');
  const [entryPix, setEntryPix] = useState('');
  const [entryMaquineta, setEntryMaquineta] = useState('');
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
  const [viewingReceipts, setViewingReceipts] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsData, setDetailsData] = useState(null);
  
  // Estados para Custos (Pastores e Master)
  const [costsList, setCostsList] = useState([]);
  const [showCostCreateModal, setShowCostCreateModal] = useState(false);
  const [showCostEditModal, setShowCostEditModal] = useState(false);
  const [showCostViewModal, setShowCostViewModal] = useState(false);
  const [showCostDeleteModal, setShowCostDeleteModal] = useState(false);
  const [selectedCost, setSelectedCost] = useState(null);
  const [costFormData, setCostFormData] = useState({
    costId: '',
    costTypeId: '',
    costTypeName: '',
    dueDate: '',
    value: '',
    billFile: '',
    paymentDate: '',
    valuePaid: '',
    proofFile: '',
    status: '',
    paidAt: null
  });
  const [costsFilterStatus, setCostsFilterStatus] = useState('ALL');
  const [costsFilterChurch, setCostsFilterChurch] = useState('ALL');
  
  // Estados para Solicitações de Liberação (Master)
  const [unlockRequestsCount, setUnlockRequestsCount] = useState(0);
  const [unlockRequestsHistory, setUnlockRequestsHistory] = useState([]);
  const [previousRequestsCount, setPreviousRequestsCount] = useState(0);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRequestViewModal, setShowRequestViewModal] = useState(false);
  const [showRequestDeleteConfirm, setShowRequestDeleteConfirm] = useState(false);
  
  // Estados para upload de arquivos de custos
  const [uploadingBill, setUploadingBill] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [showCostEditModalMaster, setShowCostEditModalMaster] = useState(false);
  const [showCostDeleteConfirm, setShowCostDeleteConfirm] = useState(false);
  const [showBillFile, setShowBillFile] = useState(null);
  const [showProofFile, setShowProofFile] = useState(null);
  
  // Calendar collapse state (sem localStorage no inicio)
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
  
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
  const [showRoleCreateModal, setShowRoleCreateModal] = useState(false);
  const [showRoleViewModal, setShowRoleViewModal] = useState(false);
  const [showRoleEditModal, setShowRoleEditModal] = useState(false);
  const [showRoleDeleteConfirm, setShowRoleDeleteConfirm] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [editRoleData, setEditRoleData] = useState({});
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  
  // Estados para Custos
  const [allCustos, setAllCustos] = useState([]);
  const [selectedCusto, setSelectedCusto] = useState(null);
  const [newCustoName, setNewCustoName] = useState('');
  const [showCustoCreateModal, setShowCustoCreateModal] = useState(false);
  const [showCustoViewModal, setShowCustoViewModal] = useState(false);
  const [showCustoEditModal, setShowCustoEditModal] = useState(false);
  const [showCustoDeleteConfirm, setShowCustoDeleteConfirm] = useState(false);
  const [custosSearchQuery, setCustosSearchQuery] = useState('');
  
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
  
  // Estados para busca de funções
  const [funcoesSearchQuery, setFuncoesSearchQuery] = useState('');
  
  // Filtrar funções/roles com base na busca
  const rolesFiltradas = allRoles.filter(r => {
    if (!funcoesSearchQuery) return true;
    const query = funcoesSearchQuery.toLowerCase();
    return r.name?.toLowerCase().includes(query);
  });
  
  // Filtrar custos com base na busca
  const custosFiltrados = allCustos.filter(c => {
    if (!custosSearchQuery) return true;
    const query = custosSearchQuery.toLowerCase();
    return c.name?.toLowerCase().includes(query);
  });
  
  // Filtrar entries (ofertas) por igreja selecionada (apenas para Master)
  // Não precisa mais filtrar no frontend - o backend já faz o filtro e agregação
  const entriesFiltradas = entries;
  
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
        fetchAllChurches(); // Carregar igrejas para o filtro
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
      
      // Adicionar filtro de igreja para Master
      if (user?.role === 'master' && selectedChurchFilter && selectedChurchFilter !== 'all') {
        body.churchFilter = selectedChurchFilter;
      }
      
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
  
  const fetchUnlockRequests = async (showNotification = false) => {
    try {
      const res = await fetch('/api/unlock/requests', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.requests) {
        // Separar pendentes e histórico
        const pending = data.requests.filter(r => r.status === 'pending');
        const history = data.requests.filter(r => r.status !== 'pending');
        
        const newCount = pending.length;
        
        // Se showNotification = true e houver novas solicitações, notificar
        if (showNotification && newCount > unlockRequestsCount) {
          const diff = newCount - unlockRequestsCount;
          toast.info(`🔔 ${diff} nova(s) solicitação(ões) de liberação!`, {
            duration: 5000
          });
        }
        
        setUnlockRequests(pending);
        setUnlockRequestsCount(newCount);
        setUnlockRequestsHistory(history);
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
  }, [isAuthenticated, activeTab, token]);
  
  // Carregar custos tipos quando entrar na aba custos (Master)
  useEffect(() => {
    if (isAuthenticated && activeTab === 'custos' && token && user?.role === 'master') {
      fetchAllCustos();
      fetchCostsList(costsFilterStatus); // Carregar também os lançamentos para aprovação
    }
  }, [isAuthenticated, activeTab, token]);
  
  // Carregar custos entries quando entrar na aba costs-pastor (Pastores/Bispos)
  useEffect(() => {
    if (isAuthenticated && activeTab === 'costs-pastor' && token && user?.role !== 'master') {
      fetchCostsList(costsFilterStatus);
      fetchAllCustos(); // Para popular o dropdown
    }
  }, [isAuthenticated, activeTab, token]);
  
  // Polling automático para atualizar lista de custos em tempo real
  useEffect(() => {
    if (!isAuthenticated || !token) return;
    
    // Verificar se está na aba de custos (Master ou Pastor)
    const isOnCostsTab = (activeTab === 'custos' && user?.role === 'master') || 
                         (activeTab === 'costs-pastor' && user?.role !== 'master');
    
    if (!isOnCostsTab) return;
    
    // Atualizar lista a cada 10 segundos
    const intervalId = setInterval(() => {
      fetchCostsList(costsFilterStatus, costsFilterChurch);
    }, 10000);
    
    return () => clearInterval(intervalId);
  }, [isAuthenticated, token, activeTab, user?.role, costsFilterStatus, costsFilterChurch]);
  
  // Carregar usuários e igrejas quando entrar na aba usuarios
  useEffect(() => {
    if (isAuthenticated && activeTab === 'usuarios' && token && user?.role === 'master') {
      fetchUsuarios();
      fetchAllChurches();
      fetchAllRolesForDropdowns(); // Buscar roles para dropdowns
    }
  }, [isAuthenticated, activeTab, token]);
  
  // Recarregar entries quando o filtro de igreja do Master mudar
  useEffect(() => {
    if (isAuthenticated && token && user?.role === 'master' && activeTab === 'calendar') {
      fetchEntries();
    }
  }, [selectedChurchFilter]);
  
  // Buscar solicitações de liberação quando Master entrar na aba
  useEffect(() => {
    if (isAuthenticated && token && user?.role === 'master' && activeTab === 'requests') {
      fetchUnlockRequests();
    }
  }, [isAuthenticated, activeTab, token]);
  
  // Polling para Pastor verificar se suas solicitações foram aprovadas (atualização em tempo real)
  useEffect(() => {
    if (isAuthenticated && token && user?.role !== 'master') {
      let lastActiveOverridesCount = 0;
      
      // Verificação inicial
      const checkMyUnlockStatus = async (showNotification = false) => {
        try {
          const res = await fetch('/api/unlock/my-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          const data = await res.json();
          
          // Se houver alguma aprovação nova, recarregar entries
          if (data.activeOverrides && data.activeOverrides.length > 0) {
            console.log('[POLLING PASTOR] Liberação detectada! Recarregando entries...');
            
            // Se é verificação periódica e há novas liberações
            if (showNotification && data.activeOverrides.length > lastActiveOverridesCount) {
              toast.success('✅ Sua solicitação foi APROVADA! Card liberado para edição.', {
                duration: 7000
              });
            }
            
            lastActiveOverridesCount = data.activeOverrides.length;
            await fetchEntries();
          } else {
            lastActiveOverridesCount = 0;
          }
        } catch (error) {
          console.error('Erro ao verificar status de liberação:', error);
        }
      };
      
      checkMyUnlockStatus(false);
      
      // Verificar a cada 30 segundos
      const interval = setInterval(() => {
        console.log('[POLLING PASTOR] Verificando liberações aprovadas...');
        checkMyUnlockStatus(true);
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, token, user?.role]);
  
  // Polling para atualizar contador de solicitações a cada 30 segundos (quando autenticado como Master)
  useEffect(() => {
    if (isAuthenticated && token && user?.role === 'master') {
      fetchUnlockRequests(false); // Carregamento inicial sem notificação
      
      const interval = setInterval(() => {
        console.log('[POLLING MASTER] Verificando novas solicitações...');
        fetchUnlockRequests(true); // Verificações periódicas COM notificação
      }, 30000); // 30 segundos para resposta mais rápida
      
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, token, user?.role]);

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
    // Backend já faz agregação e filtro, apenas buscar entry correspondente
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
    
    // PRIORIDADE 1: Verificar se há um activeOverride (liberação do Master)
    const override = myActiveOverrides.find(o => 
      o.day === day && o.timeSlot === timeSlot
    );
    
    if (override && override.expiresAt) {
      const expiresAt = new Date(override.expiresAt);
      const now = currentTime;
      
      // Se override ainda está ativo, card está liberado
      if (now < expiresAt) {
        const timeLeftMs = expiresAt - now;
        const minutes = Math.floor(timeLeftMs / 60000);
        return { 
          locked: false, 
          reason: null, 
          timeLeft: `${minutes}min (liberado por Master)` 
        };
      }
    }
    
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
          dinheiro: entryDinheiro,
          pix: entryPix,
          maquineta: entryMaquineta,
          notes: entryNotes
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setEditingEntry(null);
        setEntryValue('');
        setEntryDinheiro('');
        setEntryPix('');
        setEntryMaquineta('');
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
  
  const handleUpdateRole = async () => {
    if (!newRoleName || !newRoleName.trim()) {
      toast.error('❌ Nome da função é obrigatório');
      return;
    }
    
    try {
      const res = await fetch('/api/roles/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          roleId: selectedRole.roleId,
          roleData: { name: newRoleName.trim() }
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('✅ ' + data.message);
        setShowRoleEditModal(false);
        setNewRoleName('');
        setSelectedRole(null);
        await fetchAllRoles();
        await fetchAllRolesForDropdowns(); // Atualizar dropdowns também
      } else {
        toast.error('❌ ' + data.error);
      }
    } catch (error) {
      toast.error('❌ Erro ao atualizar função');
    }
  };
  
  const handleCreateRole = async () => {
    if (!newRoleName || !newRoleName.trim()) {
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
        body: JSON.stringify({ name: newRoleName.trim() })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('✅ ' + data.message);
        setShowRoleCreateModal(false);
        setNewRoleName('');
        await fetchAllRoles();
        await fetchAllRolesForDropdowns(); // Atualizar dropdowns também
      } else {
        toast.error('❌ ' + data.error);
      }
    } catch (error) {
      toast.error('❌ Erro ao criar função');
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
        setSelectedRole(null);
        await fetchAllRoles();
        await fetchAllRolesForDropdowns(); // Atualizar dropdowns também
      } else {
        toast.error('❌ ' + data.error);
      }
    } catch (error) {
      toast.error('❌ Erro ao excluir função');
    }
  };
  
  // ========== FUNÇÕES CRUD - CUSTOS ENTRIES (LANÇAMENTOS) ==========
  
  const fetchCostsList = async (filterStatus = 'ALL', filterChurch = 'ALL') => {
    try {
      const res = await fetch('/api/costs-entries/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          status: filterStatus,
          churchId: filterChurch !== 'ALL' ? filterChurch : null
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        let costs = data.costs || [];
        
        // Ordenar por data (mais recentes primeiro)
        costs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        setCostsList(costs);
      }
    } catch (error) {
      console.error('Erro ao buscar custos:', error);
    }
  };
  
  const handleCreateCost = async () => {
    if (!costFormData.costTypeId || !costFormData.dueDate || !costFormData.value) {
      toast.error('❌ Preencha os campos obrigatórios: tipo, vencimento e valor');
      return;
    }
    
    try {
      const res = await fetch('/api/costs-entries/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          costTypeId: costFormData.costTypeId,
          costTypeName: costFormData.costTypeName,
          dueDate: costFormData.dueDate,
          value: costFormData.value,
          billFile: costFormData.billFile
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('✅ ' + data.message);
        setShowCostCreateModal(false);
        setCostFormData({
          costId: '',
          costTypeId: '',
          costTypeName: '',
          dueDate: '',
          value: '',
          billFile: '',
          paymentDate: '',
          valuePaid: '',
          proofFile: '',
          status: '',
          paidAt: null
        });
        fetchCostsList(costsFilterStatus);
      } else {
        toast.error('❌ ' + data.error);
      }
    } catch (error) {
      toast.error('❌ Erro ao criar custo');
    }
  };
  
  const handlePayCost = async () => {
    if (!costFormData.paymentDate || !costFormData.valuePaid) {
      toast.error('❌ Data de pagamento e valor pago são obrigatórios');
      return;
    }
    
    try {
      const res = await fetch('/api/costs-entries/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          costId: costFormData.costId,
          paymentDate: costFormData.paymentDate,
          valuePaid: costFormData.valuePaid,
          proofFile: costFormData.proofFile
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('✅ ' + data.message);
        setShowCostEditModal(false);
        setSelectedCost(null);
        fetchCostsList(costsFilterStatus);
      } else {
        toast.error('❌ ' + data.error);
      }
    } catch (error) {
      toast.error('❌ Erro ao registrar pagamento');
    }
  };
  
  const handleUpdateCost = async () => {
    if (!costFormData.costTypeId || !costFormData.dueDate || !costFormData.value) {
      toast.error('❌ Preencha os campos obrigatórios');
      return;
    }
    
    try {
      const res = await fetch('/api/costs-entries/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          costId: costFormData.costId,
          costData: {
            costTypeId: costFormData.costTypeId,
            costTypeName: costFormData.costTypeName,
            dueDate: costFormData.dueDate,
            value: costFormData.value,
            billFile: costFormData.billFile,
            paymentDate: costFormData.paymentDate,
            valuePaid: costFormData.valuePaid,
            proofFile: costFormData.proofFile
          }
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('✅ ' + data.message);
        setShowCostEditModal(false);
        setSelectedCost(null);
        fetchCostsList(costsFilterStatus);
      } else {
        toast.error('❌ ' + data.error);
      }
    } catch (error) {
      toast.error('❌ Erro ao atualizar custo');
    }
  };
  
  const handleDeleteCost = async (costId) => {
    try {
      const res = await fetch('/api/costs-entries/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ costId })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('✅ ' + data.message);
        setShowCostDeleteModal(false);
        setSelectedCost(null);
        fetchCostsList(costsFilterStatus);
      } else {
        toast.error('❌ ' + data.error);
      }
    } catch (error) {
      toast.error('❌ Erro ao excluir custo');
    }
  };
  
  const handleApproveCost = async (costId) => {
    try {
      const res = await fetch('/api/costs-entries/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ costId })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('✅ ' + data.message);
        fetchCostsList(costsFilterStatus);
      } else {
        toast.error('❌ ' + data.error);
      }
    } catch (error) {
      toast.error('❌ Erro ao aprovar custo');
    }
  };
  
  const handleRejectCost = async (costId, reason) => {
    try {
      const res = await fetch('/api/costs-entries/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ costId, reason })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('✅ ' + data.message);
        fetchCostsList(costsFilterStatus);
      } else {
        toast.error('❌ ' + data.error);
      }
    } catch (error) {
      toast.error('❌ Erro ao reprovar custo');
    }
  };
  
  const handleUpdateCostEntryMaster = async () => {
    if (!selectedCost) return;
    
    try {
      const res = await fetch('/api/costs-entries/update-master', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          costId: selectedCost.costId,
          ...costFormData
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('✅ ' + data.message);
        setShowCostEditModalMaster(false);
        setSelectedCost(null);
        setCostFormData({
          costTypeId: '',
          costTypeName: '',
          dueDate: '',
          value: '',
          billFile: '',
          paymentDate: '',
          valuePaid: '',
          proofFile: '',
          status: 'PENDING'
        });
        fetchCostsList(costsFilterStatus);
      } else {
        toast.error('❌ ' + data.error);
      }
    } catch (error) {
      toast.error('❌ Erro ao atualizar custo');
    }
  };
  
  const handleDeleteCostEntry = async () => {
    if (!selectedCost) return;
    
    try {
      const res = await fetch('/api/costs-entries/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ costId: selectedCost.costId })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('✅ ' + data.message);
        setShowCostDeleteConfirm(false);
        setSelectedCost(null);
        fetchCostsList(costsFilterStatus);
      } else {
        toast.error('❌ ' + data.error);
      }
    } catch (error) {
      toast.error('❌ Erro ao excluir custo');
    }
  };
  
  // ========== FUNÇÕES - UPLOAD DE ARQUIVOS DE CUSTOS ==========
  
  const handleUploadCostFile = async (file, fileType) => {
    try {
      // Se já existe arquivo, deletar o anterior primeiro
      const oldFile = fileType === 'bill' ? costFormData.billFile : costFormData.proofFile;
      if (oldFile) {
        console.log(`Substituindo arquivo anterior: ${oldFile}`);
        // O backend pode implementar lógica para deletar arquivo físico se necessário
      }
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', fileType); // 'bill' ou 'proof'
      
      const res = await fetch('/api/upload/cost-file', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(`✅ ${data.message}`);
        return data.filePath;
      } else {
        toast.error(`❌ ${data.error}`);
        return null;
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('❌ Erro ao enviar arquivo');
      return null;
    }
  };
  
  const handleDeleteCostFile = (fileType) => {
    if (fileType === 'bill') {
      setCostFormData({...costFormData, billFile: ''});
      toast.success('✅ Conta/Boleto removido');
    } else {
      setCostFormData({...costFormData, proofFile: ''});
      toast.success('✅ Comprovante removido');
    }
  };
  
  // ========== FUNÇÕES - SOLICITAÇÕES DE LIBERAÇÃO ==========
  
  const handleApproveUnlockRequest = async (requestId, entryId, durationMinutes = 60) => {
    try {
      const res = await fetch('/api/unlock/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ requestId, entryId, durationMinutes })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(`✅ ${data.message} - Pastor será notificado automaticamente.`);
        console.log('[MASTER] Solicitação aprovada. Pastor receberá notificação em até 30 segundos.');
        await fetchUnlockRequests(); // Recarregar lista
        await fetchEntries(); // Atualizar calendário
      } else {
        toast.error(`❌ ${data.error}`);
      }
    } catch (error) {
      console.error('Erro ao aprovar solicitação:', error);
      toast.error('❌ Erro ao aprovar solicitação');
    }
  };
  
  const handleRejectUnlockRequest = async () => {
    if (!selectedRequest) return;
    
    try {
      const res = await fetch('/api/unlock/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          requestId: selectedRequest.requestId, 
          reason: rejectionReason || 'Rejeitado pelo Líder Máximo'
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(`✅ ${data.message}`);
        setShowRejectModal(false);
        setRejectionReason('');
        setSelectedRequest(null);
        await fetchUnlockRequests();
      } else {
        toast.error(`❌ ${data.error}`);
      }
    } catch (error) {
      console.error('Erro ao rejeitar solicitação:', error);
      toast.error('❌ Erro ao rejeitar solicitação');
    }
  };
  
  const handleDeleteUnlockRequest = async () => {
    if (!selectedRequest) return;
    
    try {
      const res = await fetch('/api/unlock/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ requestId: selectedRequest.requestId })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(`✅ ${data.message}`);
        setShowRequestDeleteConfirm(false);
        setSelectedRequest(null);
        await fetchUnlockRequests();
      } else {
        toast.error(`❌ ${data.error}`);
      }
    } catch (error) {
      console.error('Erro ao deletar solicitação:', error);
      toast.error('❌ Erro ao deletar solicitação');
    }
  };
  
  // ========== FUNÇÕES CRUD - CUSTOS TIPOS ==========
  
  const fetchAllCustos = async () => {
    try {
      const res = await fetch('/api/custos/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('[DEBUG] Tipos de custos carregados:', data.custos);
        setAllCustos(data.custos || []);
      } else {
        console.error('[DEBUG] Erro ao buscar custos - Status:', res.status);
      }
    } catch (error) {
      console.error('[DEBUG] Erro ao buscar custos:', error);
    }
  };
  
  const handleCreateCusto = async () => {
    if (!newCustoName || !newCustoName.trim()) {
      toast.error('❌ Nome do custo é obrigatório');
      return;
    }
    
    try {
      const res = await fetch('/api/custos/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newCustoName.trim() })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('✅ ' + data.message);
        setShowCustoCreateModal(false);
        setNewCustoName('');
        await fetchAllCustos();
      } else {
        toast.error('❌ ' + data.error);
      }
    } catch (error) {
      toast.error('❌ Erro ao criar custo');
    }
  };
  
  const handleUpdateCusto = async () => {
    if (!newCustoName || !newCustoName.trim()) {
      toast.error('❌ Nome do custo é obrigatório');
      return;
    }
    
    try {
      const res = await fetch('/api/custos/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          custoId: selectedCusto.custoId,
          custoData: { name: newCustoName.trim() }
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('✅ ' + data.message);
        setShowCustoEditModal(false);
        setNewCustoName('');
        setSelectedCusto(null);
        await fetchAllCustos();
      } else {
        toast.error('❌ ' + data.error);
      }
    } catch (error) {
      toast.error('❌ Erro ao atualizar custo');
    }
  };
  
  const handleDeleteCusto = async (custoId) => {
    try {
      const res = await fetch('/api/custos/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ custoId })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('✅ ' + data.message);
        setShowCustoDeleteConfirm(false);
        setSelectedCusto(null);
        await fetchAllCustos();
      } else {
        toast.error('❌ ' + data.error);
      }
    } catch (error) {
      toast.error('❌ Erro ao excluir custo');
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
                      <div className="relative">
                        <Input
                          id="reg-password"
                          type={showRegisterPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          placeholder="Senha segura"
                          className="text-sm h-9 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
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
            {user?.role === 'master' && (
              <TabsTrigger value="requests" className="relative">
                🔔 Solicitações
                {unlockRequestsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {unlockRequestsCount}
                  </span>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="dashboard">📊 Dashboard</TabsTrigger>
            <TabsTrigger value="compare">📈 Comparações</TabsTrigger>
            {user?.role !== 'master' && (
              <TabsTrigger value="costs-pastor">💰 Custos</TabsTrigger>
            )}
            {user?.role === 'master' && (
              <>
                <TabsTrigger value="funcoes">📋 Funções</TabsTrigger>
                <TabsTrigger value="usuarios">👤 Usuários</TabsTrigger>
                <TabsTrigger value="igrejas">🏛️ Igrejas</TabsTrigger>
                <TabsTrigger value="custos">💰 Custos</TabsTrigger>
                <TabsTrigger value="estatistica">📊 Estatística</TabsTrigger>
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
                
                {/* Filtro de Igreja - Líder Máximo */}
                {user?.role === 'master' && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
                    <div className="flex items-center gap-3">
                      <Label className="text-sm font-semibold text-blue-900">🏛️ Filtrar por Igreja:</Label>
                      <Select 
                        value={selectedChurchFilter} 
                        onValueChange={(value) => {
                          setSelectedChurchFilter(value);
                          // O useEffect vai recarregar automaticamente
                        }}
                      >
                        <SelectTrigger className="w-[300px] bg-white border-blue-300">
                          <SelectValue placeholder="Selecione a igreja" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" className="font-semibold">
                            📊 Todas as Igrejas
                          </SelectItem>
                          {allChurches.map(church => (
                            <SelectItem key={church.churchId} value={church.churchId}>
                              🏛️ {church.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedChurchFilter !== 'all' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedChurchFilter('all')}
                          className="h-8 text-xs text-blue-600"
                        >
                          Limpar Filtro ✕
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Filtros para outros usuários (mantidos) */}
                {user?.role !== 'master' && (availableStates.length > 0 || availableRegions.length > 0 || availableChurches.length > 0) && (
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
            
            {/* Solicitações removidas do calendário - agora só na aba Solicitações */}
            
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
                      
                      {/* Show day observation if exists and not editing - APENAS PARA PASTOR (Master vê no modal de detalhes) */}
                      {user?.role !== 'master' && !editingDayObs && getDayObservation(day) && (
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
                          
                          // RENDERIZAÇÃO ESPECIAL PARA MASTER (VISUALIZAÇÃO APENAS)
                          if (user?.role === 'master') {
                            return (
                              <div key={timeSlot} className="border-2 border-purple-200 rounded-lg p-3 bg-purple-50/30 hover:border-purple-400 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                  <Badge variant="outline" className="font-semibold text-purple-900">
                                    {timeSlot}
                                  </Badge>
                                  {lockStatus.locked ? (
                                    <Lock className="w-4 h-4 text-red-600" />
                                  ) : (
                                    <Unlock className="w-4 h-4 text-green-600" />
                                  )}
                                </div>
                                
                                {entry && entry.totalValue > 0 ? (
                                  <div className="space-y-2">
                                    {/* Total Geral */}
                                    <div className="bg-blue-100 border-2 border-blue-400 rounded-lg p-2">
                                      <p className="text-xs text-blue-700 font-semibold mb-1">💰 TOTAL GERAL</p>
                                      <p className="text-2xl font-bold text-blue-900">
                                        R$ {parseFloat(entry.totalValue || 0).toFixed(2).replace('.', ',')}
                                      </p>
                                    </div>
                                    
                                    {/* Discriminado */}
                                    <div className="space-y-1 text-xs">
                                      <div className="flex justify-between items-center">
                                        <span className="text-green-700 font-semibold">💵 Dinheiro:</span>
                                        <span className="font-bold text-green-800">R$ {parseFloat(entry.totalDinheiro || 0).toFixed(2).replace('.', ',')}</span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-blue-700 font-semibold">📱 PIX:</span>
                                        <span className="font-bold text-blue-800">R$ {parseFloat(entry.totalPix || 0).toFixed(2).replace('.', ',')}</span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-purple-700 font-semibold">💳 Maquineta:</span>
                                        <span className="font-bold text-purple-800">R$ {parseFloat(entry.totalMaquineta || 0).toFixed(2).replace('.', ',')}</span>
                                      </div>
                                    </div>
                                    
                                    {/* Contador de Igrejas */}
                                    <div className="text-xs text-gray-600 text-center py-1">
                                      🏛️ {entry.churchCount || 0} {entry.churchCount === 1 ? 'igreja' : 'igrejas'}
                                    </div>
                                    
                                    {/* Botão Ver Detalhes */}
                                    <Button
                                      size="sm"
                                      className="w-full bg-purple-600 hover:bg-purple-700"
                                      onClick={() => {
                                        setDetailsData({
                                          day: entry.day,
                                          timeSlot: entry.timeSlot,
                                          month: entry.month,
                                          year: entry.year,
                                          totalValue: entry.totalValue,
                                          totalDinheiro: entry.totalDinheiro,
                                          totalPix: entry.totalPix,
                                          totalMaquineta: entry.totalMaquineta,
                                          churches: entry.churches || []
                                        });
                                        setShowDetailsModal(true);
                                      }}
                                    >
                                      📊 Ver Detalhes
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="text-center py-4 text-gray-400">
                                    <p className="text-xs">Sem ofertas</p>
                                  </div>
                                )}
                              </div>
                            );
                          }
                          
                          // RENDERIZAÇÃO NORMAL PARA PASTORES
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
                                          setEntryDinheiro((entry.dinheiro || 0).toString());
                                          setEntryPix((entry.pix || 0).toString());
                                          setEntryMaquineta((entry.maquineta || 0).toString());
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
                                          setEntryDinheiro('');
                                          setEntryPix('');
                                          setEntryMaquineta('');
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
                                        setEntryDinheiro('');
                                        setEntryPix('');
                                        setEntryMaquineta('');
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
          
          {/* REQUESTS TAB - Solicitações de Liberação (Master apenas) */}
          <TabsContent value="requests">
            <Card className="border-2 border-yellow-300">
              <CardHeader className="bg-gradient-to-r from-yellow-50 to-yellow-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="w-6 h-6 text-yellow-600" />
                      🔔 Solicitações de Liberação
                    </CardTitle>
                    <CardDescription>Aprove ou rejeite solicitações de pastores para editar lançamentos</CardDescription>
                  </div>
                  <Badge className="text-lg font-bold bg-yellow-500 text-white">
                    {unlockRequestsCount} Pendentes
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {unlockRequests.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-semibold">Nenhuma solicitação pendente</p>
                    <p className="text-sm mt-2">Quando pastores solicitarem liberação, aparecerão aqui</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {unlockRequests.map((req) => (
                      <Card key={req.requestId} className="border-2 border-yellow-200 hover:border-yellow-400 transition-colors">
                        <CardContent className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Informações da Solicitação */}
                            <div className="md:col-span-3 space-y-2">
                              <div className="flex items-start gap-3">
                                <div className="bg-yellow-100 rounded-full p-2">
                                  <User className="w-5 h-5 text-yellow-600" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-bold text-lg">{req.requesterName}</p>
                                  <p className="text-sm text-gray-600">{req.requesterEmail}</p>
                                  <Badge className="mt-1 bg-blue-100 text-blue-800">{req.requesterRole}</Badge>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                                <div className="flex items-center gap-2">
                                  <Church className="w-4 h-4 text-gray-500" />
                                  <span className="font-semibold">Igreja:</span>
                                  <span>{req.requesterChurch || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-gray-500" />
                                  <span className="font-semibold">Data:</span>
                                  <span>{req.day}/{req.month}/{req.year}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-gray-500" />
                                  <span className="font-semibold">Horário:</span>
                                  <span>{req.timeSlot}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4 text-gray-500" />
                                  <span className="font-semibold">Solicitado em:</span>
                                  <span>{new Date(req.createdAt).toLocaleString('pt-BR')}</span>
                                </div>
                              </div>
                              
                              {req.reason && (
                                <div className="mt-3 bg-gray-50 rounded p-3 border border-gray-200">
                                  <p className="text-xs font-semibold text-gray-600 mb-1">Motivo:</p>
                                  <p className="text-sm">{req.reason}</p>
                                </div>
                              )}
                            </div>
                            
                            {/* Ações */}
                            <div className="flex md:flex-col gap-2 justify-end">
                              <Button
                                onClick={() => handleApproveUnlockRequest(req.requestId, req.entryId, 60)}
                                className="flex-1 bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Aprovar
                                <span className="text-xs ml-1">(60min)</span>
                              </Button>
                              <Button
                                variant="destructive"
                                className="flex-1"
                                onClick={() => {
                                  setSelectedRequest(req);
                                  setShowRejectModal(true);
                                }}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Rejeitar
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                
                {/* HISTÓRICO DE SOLICITAÇÕES */}
                {unlockRequestsHistory.length > 0 && (
                  <div className="mt-8 pt-8 border-t-2 border-gray-300">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                      📋 Histórico de Solicitações
                      <Badge variant="outline" className="text-sm">
                        {unlockRequestsHistory.length} registros
                      </Badge>
                    </h3>
                    
                    <div className="space-y-3">
                      {unlockRequestsHistory.map((req) => (
                        <Card key={req.requestId} className={`border-2 ${
                          req.status === 'approved' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                        }`}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-4">
                              {/* Info */}
                              <div className="flex-1 grid grid-cols-5 gap-3 text-sm">
                                <div>
                                  <p className="text-xs text-gray-500">Pastor</p>
                                  <p className="font-semibold">{req.requesterName}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Igreja</p>
                                  <p className="font-semibold">{req.requesterChurch || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Data/Horário</p>
                                  <p className="font-semibold">{req.day}/{req.month}/{req.year} - {req.timeSlot}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Status</p>
                                  <Badge className={req.status === 'approved' ? 'bg-green-600' : 'bg-red-600'}>
                                    {req.status === 'approved' ? '✅ Aprovado' : '❌ Rejeitado'}
                                  </Badge>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Processado em</p>
                                  <p className="text-xs font-medium">
                                    {new Date(req.approvedAt || req.rejectedAt).toLocaleString('pt-BR')}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Ações */}
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedRequest(req);
                                    setShowRequestViewModal(true);
                                  }}
                                  title="Visualizar detalhes"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedRequest(req);
                                    setShowRequestDeleteConfirm(true);
                                  }}
                                  title="Excluir registro"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
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
          
          {/* CUSTOS TAB (PASTORES/BISPOS) */}
          {user?.role !== 'master' && (
            <TabsContent value="costs-pastor">
              <div className="space-y-6">
                {/* Header com Botão */}
                <Card className="border-2 border-orange-300">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="w-6 h-6" />
                          💰 Gestão de Custos
                        </CardTitle>
                        <CardDescription>Registre e acompanhe os custos da sua igreja</CardDescription>
                      </div>
                      <Button
                        onClick={() => {
                          setCostFormData({
                            costId: '',
                            costTypeId: '',
                            costTypeName: '',
                            dueDate: '',
                            value: '',
                            billFile: '',
                            paymentDate: '',
                            valuePaid: '',
                            proofFile: '',
                            status: '',
                            paidAt: null
                          });
                          setShowCostCreateModal(true);
                        }}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Lançar Custo
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
                
                {/* Listagem de Custos */}
                <Card>
                  <CardHeader>
                    <CardTitle>Meus Lançamentos de Custos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {costsList.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-semibold">Nenhum custo lançado ainda</p>
                        <p className="text-sm mt-2">Clique em "Lançar Custo" para começar</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="text-left p-3 text-sm font-semibold">Tipo</th>
                              <th className="text-left p-3 text-sm font-semibold">Vencimento</th>
                              <th className="text-left p-3 text-sm font-semibold">Valor</th>
                              <th className="text-left p-3 text-sm font-semibold">Pago</th>
                              <th className="text-left p-3 text-sm font-semibold">Diferença</th>
                              <th className="text-center p-3 text-sm font-semibold">Status</th>
                              <th className="text-center p-3 text-sm font-semibold">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {costsList.map((cost) => {
                              const statusColors = {
                                'PENDING': 'bg-yellow-100 text-yellow-800 border-yellow-300',
                                'APPROVED': 'bg-green-100 text-green-800 border-green-300',
                                'PAID': 'bg-emerald-100 text-emerald-800 border-emerald-300',
                                'REJECTED': 'bg-red-100 text-red-800 border-red-300'
                              };
                              const statusLabels = {
                                'PENDING': '🟡 Pendente',
                                'APPROVED': '🟢 Aprovado',
                                'PAID': '💚 Pago',
                                'REJECTED': '🔴 Reprovado'
                              };
                              
                              return (
                                <tr key={cost.costId} className="hover:bg-gray-50">
                                  <td className="p-3 text-sm font-medium">{cost.costTypeName}</td>
                                  <td className="p-3 text-sm">{new Date(cost.dueDate).toLocaleDateString('pt-BR')}</td>
                                  <td className="p-3 text-sm font-semibold">R$ {parseFloat(cost.value).toFixed(2)}</td>
                                  <td className="p-3 text-sm font-semibold">{cost.valuePaid ? `R$ ${parseFloat(cost.valuePaid).toFixed(2)}` : '-'}</td>
                                  <td className="p-3 text-sm">
                                    {cost.difference > 0 ? (
                                      <span className="text-red-600 font-semibold">+R$ {cost.difference.toFixed(2)}</span>
                                    ) : cost.difference < 0 ? (
                                      <span className="text-green-600 font-semibold">-R$ {Math.abs(cost.difference).toFixed(2)}</span>
                                    ) : (
                                      <span className="text-gray-500">-</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-center">
                                    <Badge className={`${statusColors[cost.status]} border`}>
                                      {statusLabels[cost.status]}
                                    </Badge>
                                  </td>
                                  <td className="p-3">
                                    <div className="flex items-center justify-center gap-1">
                                      {/* Botão Visualizar - Sempre visível */}
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setSelectedCost(cost);
                                          setShowCostViewModal(true);
                                        }}
                                        title="Visualizar Detalhes"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </Button>
                                      
                                      {/* Botão Editar - Lógica:
                                          1. APPROVED: pode editar para registrar pagamento
                                          2. PAID < 60min E pago pelo próprio Pastor: pode editar
                                          3. PAID pago pelo Master: NÃO mostra botão (apenas visualizar)
                                          4. PAID > 60min: NÃO mostra botão (apenas visualizar)
                                          5. PENDING/REJECTED: NÃO mostra botão
                                      */}
                                      {(() => {
                                        // Se APPROVED, sempre mostra "Editar" (registrar pagamento)
                                        if (cost.status === 'APPROVED') {
                                          return (
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => {
                                                setSelectedCost(cost);
                                                setCostFormData({
                                                  costId: cost.costId,
                                                  costTypeId: cost.costTypeId,
                                                  costTypeName: cost.costTypeName,
                                                  dueDate: cost.dueDate,
                                                  value: cost.value.toString(),
                                                  billFile: cost.billFile || '',
                                                  paymentDate: cost.paymentDate || '',
                                                  valuePaid: cost.valuePaid?.toString() || '',
                                                  proofFile: cost.proofFile || '',
                                                  status: cost.status,
                                                  paidAt: cost.paidAt
                                                });
                                                setShowCostEditModal(true);
                                              }}
                                              title="Registrar Pagamento"
                                              className="text-green-600 hover:text-green-700"
                                            >
                                              <Edit className="w-4 h-4" />
                                            </Button>
                                          );
                                        }
                                        
                                        // Se PAID, verifica quem pagou e se está dentro de 60 minutos
                                        if (cost.status === 'PAID' && cost.paidAt) {
                                          // Se foi pago pelo Master (paidBy diferente do userId), apenas visualizar
                                          if (cost.paidBy && cost.paidBy !== user?.userId) {
                                            // Não mostra botão Editar - custo pago pelo Master
                                            return null;
                                          }
                                          
                                          // Se foi pago pelo próprio Pastor, verifica janela de 60 min
                                          const paidTime = new Date(cost.paidAt);
                                          const now = new Date();
                                          const diffMinutes = (now - paidTime) / (1000 * 60);
                                          
                                          if (diffMinutes <= 60) {
                                            // Dentro de 60 min: mostra "Editar"
                                            return (
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                  setSelectedCost(cost);
                                                  setCostFormData({
                                                    costId: cost.costId,
                                                    costTypeId: cost.costTypeId,
                                                    costTypeName: cost.costTypeName,
                                                    dueDate: cost.dueDate,
                                                    value: cost.value.toString(),
                                                    billFile: cost.billFile || '',
                                                    paymentDate: cost.paymentDate || '',
                                                    valuePaid: cost.valuePaid?.toString() || '',
                                                    proofFile: cost.proofFile || '',
                                                    status: cost.status,
                                                    paidAt: cost.paidAt
                                                  });
                                                  setShowCostEditModal(true);
                                                }}
                                                title={`Editar Pagamento (${Math.floor(60 - diffMinutes)} min restantes)`}
                                                className="text-blue-600 hover:text-blue-700"
                                              >
                                                <Edit className="w-4 h-4" />
                                              </Button>
                                            );
                                          }
                                          // Após 60 min: NÃO mostra "Editar", apenas "Visualizar"
                                        }
                                        
                                        // PENDING ou REJECTED: não mostra botão Editar
                                        return null;
                                      })()}
                                      
                                      {/* Contador de tempo restante - apenas se PAID, pago pelo próprio Pastor e dentro de 60 min */}
                                      {cost.status === 'PAID' && cost.paidAt && (() => {
                                        // Se foi pago pelo Master, não mostra contador
                                        if (cost.paidBy && cost.paidBy !== user?.userId) {
                                          return (
                                            <span className="text-xs text-gray-500 px-2">
                                              💼 Pago pelo Líder
                                            </span>
                                          );
                                        }
                                        
                                        // Se foi pago pelo próprio Pastor, mostra contador
                                        const paidTime = new Date(cost.paidAt);
                                        const now = new Date();
                                        const diffMinutes = (now - paidTime) / (1000 * 60);
                                        const remaining = Math.floor(60 - diffMinutes);
                                        
                                        if (remaining > 0 && remaining <= 60) {
                                          return (
                                            <span className="text-xs text-blue-600 font-semibold px-2">
                                              ⏱️ {remaining}min
                                            </span>
                                          );
                                        }
                                        
                                        // Após 60 min, mostra "Bloqueado"
                                        if (remaining <= 0) {
                                          return (
                                            <span className="text-xs text-gray-500 px-2">
                                              🔒 Bloqueado
                                            </span>
                                          );
                                        }
                                        
                                        return null;
                                      })()}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
          
          {/* FUNÇÕES TAB */}
          {user?.role === 'master' && (
            <TabsContent value="funcoes">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileUser className="w-6 h-6" />
                    Gerenciamento de Funções
                  </CardTitle>
                  <CardDescription>Cadastro de cargos e funções do sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Botão Cadastrar Nova Função */}
                  <div className="flex justify-end">
                    <Button 
                      onClick={() => {
                        setNewRoleName('');
                        setShowRoleCreateModal(true);
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <FileUser className="w-4 h-4 mr-2" />
                      Cadastrar Nova Função
                    </Button>
                  </div>

                  {/* Campo de Busca */}
                  <div className="border rounded-lg">
                    <div className="bg-gray-50 p-4 border-b space-y-3">
                      <h3 className="font-semibold text-lg">Funções Cadastradas ({allRoles.length})</h3>
                      
                      <Input
                        placeholder="🔍 Buscar função por nome..."
                        value={funcoesSearchQuery}
                        onChange={(e) => setFuncoesSearchQuery(e.target.value)}
                        className="max-w-md"
                      />
                      
                      {funcoesSearchQuery && (
                        <p className="text-sm text-gray-600">
                          Mostrando {rolesFiltradas.length} de {allRoles.length} funções
                        </p>
                      )}
                    </div>
                    
                    {/* Listagem de Funções */}
                    <div className="p-4">
                      {rolesFiltradas.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <FileUser className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>{funcoesSearchQuery ? 'Nenhuma função encontrada' : 'Nenhuma função cadastrada ainda'}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {rolesFiltradas.map((role) => (
                            <div key={role.roleId} className="flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-md transition-shadow">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <FileUser className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-semibold">{role.name}</p>
                                  <p className="text-xs text-gray-500">
                                    Criado em: {new Date(role.createdAt).toLocaleDateString('pt-BR')}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Ações */}
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedRole(role);
                                    setShowRoleViewModal(true);
                                  }}
                                  title="Visualizar"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedRole(role);
                                    setNewRoleName(role.name);
                                    setShowRoleEditModal(true);
                                  }}
                                  title="Editar"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedRole(role);
                                    setShowRoleDeleteConfirm(true);
                                  }}
                                  title="Excluir"
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
          
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
                        <div className="relative">
                          <Input
                            type={showUserPassword ? "text" : "password"}
                            value={usuarioForm.password}
                            onChange={(e) => setUsuarioForm({...usuarioForm, password: e.target.value})}
                            placeholder="Senha inicial"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowUserPassword(!showUserPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
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
                        <div className="relative">
                          <Input
                            type={showEditUserPassword ? "text" : "password"}
                            value={newPasswordUsuario}
                            onChange={(e) => setNewPasswordUsuario(e.target.value)}
                            placeholder="Nova senha (opcional)"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowEditUserPassword(!showEditUserPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showEditUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
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
          
          {/* MODAIS DA ABA FUNÇÕES */}
          
          {/* Modal Criar Função */}
          <Dialog open={showRoleCreateModal} onOpenChange={setShowRoleCreateModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Nova Função</DialogTitle>
                <DialogDescription>
                  Digite o nome da função/cargo que deseja cadastrar
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="role-name">Nome da Função *</Label>
                  <Input
                    id="role-name"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="Ex: Pastor(a), Diácono(a)..."
                    className="mt-1"
                  />
                </div>
                
                <div className="flex gap-3 justify-end pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowRoleCreateModal(false);
                      setNewRoleName('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCreateRole}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Salvar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Modal Visualizar Função */}
          <Dialog open={showRoleViewModal} onOpenChange={setShowRoleViewModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Detalhes da Função</DialogTitle>
              </DialogHeader>
              
              {selectedRole && (
                <div className="space-y-4 py-4">
                  <div className="flex items-center gap-3 pb-4 border-b">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <FileUser className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{selectedRole.name}</h3>
                      <p className="text-sm text-gray-500">Função/Cargo</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-gray-500 text-sm">ID da Função</Label>
                      <p className="font-mono text-sm">{selectedRole.roleId}</p>
                    </div>
                    
                    <div>
                      <Label className="text-gray-500 text-sm">Data de Criação</Label>
                      <p className="font-medium">
                        {new Date(selectedRole.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button 
                      onClick={() => {
                        setShowRoleViewModal(false);
                        setNewRoleName(selectedRole.name);
                        setShowRoleEditModal(true);
                      }}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    <Button 
                      onClick={() => {
                        setShowRoleViewModal(false);
                        setShowRoleDeleteConfirm(true);
                      }}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
          
          {/* Modal Editar Função */}
          <Dialog open={showRoleEditModal} onOpenChange={setShowRoleEditModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Função</DialogTitle>
                <DialogDescription>
                  Altere o nome da função conforme necessário
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="edit-role-name">Nome da Função *</Label>
                  <Input
                    id="edit-role-name"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="Nome da função"
                    className="mt-1"
                  />
                </div>
                
                <div className="flex gap-3 justify-end pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowRoleEditModal(false);
                      setNewRoleName('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleUpdateRole}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Salvar Alterações
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Modal Confirmar Exclusão de Função */}
          <Dialog open={showRoleDeleteConfirm} onOpenChange={setShowRoleDeleteConfirm}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirmar Exclusão</DialogTitle>
                <DialogDescription>
                  Tem certeza que deseja excluir a função <strong>{selectedRole?.name}</strong>? 
                  Esta ação não pode ser desfeita.
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex gap-3 justify-end pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowRoleDeleteConfirm(false);
                    setSelectedRole(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={() => handleDeleteRole(selectedRole?.roleId)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Sim, Excluir
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          {/* ========== MODAIS CUSTOS ========== */}
          
          {/* Modal Criar Custo */}
          <Dialog open={showCustoCreateModal} onOpenChange={setShowCustoCreateModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Custo</DialogTitle>
                <DialogDescription>
                  Digite o nome do tipo de custo que deseja cadastrar
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="custo-name">Nome do Custo *</Label>
                  <Input
                    id="custo-name"
                    value={newCustoName}
                    onChange={(e) => setNewCustoName(e.target.value)}
                    placeholder="Ex: Aluguel, Água, Luz, Telefone..."
                    className="mt-1"
                  />
                </div>
                
                <div className="flex gap-3 justify-end pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowCustoCreateModal(false);
                      setNewCustoName('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCreateCusto}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Salvar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Modal Visualizar Custo */}
          <Dialog open={showCustoViewModal} onOpenChange={setShowCustoViewModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Detalhes do Custo</DialogTitle>
              </DialogHeader>
              
              {selectedCusto && (
                <div className="space-y-4 py-4">
                  <div className="flex items-center gap-3 pb-4 border-b">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-2xl">💰</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{selectedCusto.name}</h3>
                      <p className="text-sm text-gray-500">Tipo de Custo</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-gray-500 text-sm">ID do Custo</Label>
                      <p className="font-mono text-sm">{selectedCusto.custoId}</p>
                    </div>
                    
                    <div>
                      <Label className="text-gray-500 text-sm">Data de Criação</Label>
                      <p className="font-medium">
                        {new Date(selectedCusto.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button 
                      onClick={() => {
                        setShowCustoViewModal(false);
                        setNewCustoName(selectedCusto.name);
                        setShowCustoEditModal(true);
                      }}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    <Button 
                      onClick={() => {
                        setShowCustoViewModal(false);
                        setShowCustoDeleteConfirm(true);
                      }}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
          
          {/* Modal Editar Custo */}
          <Dialog open={showCustoEditModal} onOpenChange={setShowCustoEditModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Custo</DialogTitle>
                <DialogDescription>
                  Altere o nome do custo conforme necessário
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="edit-custo-name">Nome do Custo *</Label>
                  <Input
                    id="edit-custo-name"
                    value={newCustoName}
                    onChange={(e) => setNewCustoName(e.target.value)}
                    placeholder="Nome do custo"
                    className="mt-1"
                  />
                </div>
                
                <div className="flex gap-3 justify-end pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowCustoEditModal(false);
                      setNewCustoName('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleUpdateCusto}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Salvar Alterações
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Modal Confirmar Exclusão de Custo */}
          <Dialog open={showCustoDeleteConfirm} onOpenChange={setShowCustoDeleteConfirm}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirmar Exclusão</DialogTitle>
                <DialogDescription>
                  Tem certeza que deseja excluir o custo <strong>{selectedCusto?.name}</strong>? 
                  Esta ação não pode ser desfeita.
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex gap-3 justify-end pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowCustoDeleteConfirm(false);
                    setSelectedCusto(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={() => handleDeleteCusto(selectedCusto?.custoId)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Sim, Excluir
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
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
          
          {/* CUSTOS TAB */}
          {user?.role === 'master' && (
            <TabsContent value="custos">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    💰 Gerenciamento de Custos
                  </CardTitle>
                  <CardDescription>Cadastro de tipos de custos e despesas do sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Botão Cadastrar Novo Custo */}
                  <div className="flex justify-end">
                    <Button 
                      onClick={() => {
                        setNewCustoName('');
                        setShowCustoCreateModal(true);
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      💰 Cadastrar Novo Custo
                    </Button>
                  </div>

                  {/* Campo de Busca */}
                  <div className="border rounded-lg">
                    <div className="bg-gray-50 p-4 border-b space-y-3">
                      <h3 className="font-semibold text-lg">Custos Cadastrados ({allCustos.length})</h3>
                      
                      <Input
                        placeholder="🔍 Buscar custo por nome..."
                        value={custosSearchQuery}
                        onChange={(e) => setCustosSearchQuery(e.target.value)}
                        className="max-w-md"
                      />
                      
                      {custosSearchQuery && (
                        <p className="text-sm text-gray-600">
                          Mostrando {custosFiltrados.length} de {allCustos.length} custos
                        </p>
                      )}
                    </div>
                    
                    {/* Listagem de Custos */}
                    <div className="p-4">
                      {custosFiltrados.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <div className="text-6xl mb-2">💰</div>
                          <p>{custosSearchQuery ? 'Nenhum custo encontrado' : 'Nenhum custo cadastrado ainda'}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {custosFiltrados.map((custo) => (
                            <div key={custo.custoId} className="flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-md transition-shadow">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                  <span className="text-xl">💰</span>
                                </div>
                                <div>
                                  <p className="font-semibold">{custo.name}</p>
                                  <p className="text-xs text-gray-500">
                                    Criado em: {new Date(custo.createdAt).toLocaleDateString('pt-BR')}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Ações */}
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedCusto(custo);
                                    setShowCustoViewModal(true);
                                  }}
                                  title="Visualizar"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedCusto(custo);
                                    setNewCustoName(custo.name);
                                    setShowCustoEditModal(true);
                                  }}
                                  title="Editar"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedCusto(custo);
                                    setShowCustoDeleteConfirm(true);
                                  }}
                                  title="Excluir"
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* SEÇÃO DE APROVAÇÃO DE CUSTOS (MASTER) */}
              <Card className="mt-6 border-2 border-purple-300">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="w-6 h-6" />
                        Aprovação de Custos das Igrejas
                      </CardTitle>
                      <CardDescription>Visualize e aprove/reprove os custos lançados pelos pastores</CardDescription>
                    </div>
                    
                    {/* Filtros */}
                    <div className="flex gap-3 items-center">
                      {/* Filtro por Igreja */}
                      <select
                        className="border rounded p-2 text-sm"
                        value={costsFilterChurch}
                        onChange={(e) => {
                          setCostsFilterChurch(e.target.value);
                          fetchCostsList(costsFilterStatus, e.target.value);
                        }}
                      >
                        <option value="ALL">🏛️ Todas as Igrejas</option>
                        {churches.map(church => (
                          <option key={church.churchId} value={church.churchId}>
                            {church.name}
                          </option>
                        ))}
                      </select>
                      
                      {/* Filtros de Status */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={costsFilterStatus === 'ALL' ? 'default' : 'outline'}
                          onClick={() => {
                            setCostsFilterStatus('ALL');
                            fetchCostsList('ALL', costsFilterChurch);
                          }}
                        >
                          Todos
                        </Button>
                        <Button
                          size="sm"
                          variant={costsFilterStatus === 'PENDING' ? 'default' : 'outline'}
                          onClick={() => {
                            setCostsFilterStatus('PENDING');
                            fetchCostsList('PENDING', costsFilterChurch);
                          }}
                          className="bg-yellow-600 hover:bg-yellow-700"
                        >
                          🟡 Pendentes
                        </Button>
                        <Button
                          size="sm"
                          variant={costsFilterStatus === 'APPROVED' ? 'default' : 'outline'}
                          onClick={() => {
                            setCostsFilterStatus('APPROVED');
                            fetchCostsList('APPROVED', costsFilterChurch);
                          }}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          🟢 Aprovados
                        </Button>
                        <Button
                          size="sm"
                          variant={costsFilterStatus === 'PAID' ? 'default' : 'outline'}
                          onClick={() => {
                            setCostsFilterStatus('PAID');
                            fetchCostsList('PAID', costsFilterChurch);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          💚 Pagos
                        </Button>
                        <Button
                          size="sm"
                          variant={costsFilterStatus === 'REJECTED' ? 'default' : 'outline'}
                          onClick={() => {
                            setCostsFilterStatus('REJECTED');
                            fetchCostsList('REJECTED', costsFilterChurch);
                          }}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          🔴 Reprovados
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                {costsList.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                      <DollarSign className="w-16 h-16 mx-auto mb-4" />
                      <p className="text-lg font-semibold">Nenhum custo lançado ainda</p>
                      <p className="text-sm mt-2">
                        {costsFilterStatus === 'ALL' && 'Aguardando lançamentos dos pastores'}
                        {costsFilterStatus === 'PENDING' && 'Nenhum custo pendente no momento'}
                        {costsFilterStatus === 'APPROVED' && 'Nenhum custo aprovado ainda'}
                        {costsFilterStatus === 'REJECTED' && 'Nenhum custo reprovado'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Agrupar por Igreja */}
                      {(() => {
                        // Agrupar custos por igreja
                        const groupedByChurch = costsList.reduce((acc, cost) => {
                          const key = cost.churchName || 'Sem Igreja';
                          if (!acc[key]) acc[key] = [];
                          acc[key].push(cost);
                          return acc;
                        }, {});
                        
                        // Ordenar igrejas alfabeticamente
                        const sortedChurches = Object.keys(groupedByChurch).sort();
                        
                        return sortedChurches.map(churchName => (
                          <div key={churchName} className="border-2 border-purple-200 rounded-lg">
                            {/* Cabeçalho da Igreja */}
                            <div className="bg-purple-100 p-4 border-b-2 border-purple-200">
                              <h3 className="font-bold text-lg flex items-center gap-2">
                                <Church className="w-5 h-5" />
                                {churchName}
                                <Badge className="ml-2 bg-purple-600">
                                  {groupedByChurch[churchName].length} custos
                                </Badge>
                              </h3>
                            </div>
                            
                            {/* Tabela de Custos da Igreja */}
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead className="bg-gray-100">
                                  <tr>
                            <th className="text-left p-3 text-sm font-semibold">Igreja</th>
                            <th className="text-left p-3 text-sm font-semibold">Pastor</th>
                            <th className="text-left p-3 text-sm font-semibold">Tipo</th>
                            <th className="text-left p-3 text-sm font-semibold">Vencimento</th>
                            <th className="text-left p-3 text-sm font-semibold">Valor</th>
                            <th className="text-left p-3 text-sm font-semibold">Pago</th>
                            <th className="text-left p-3 text-sm font-semibold">Juros</th>
                            <th className="text-center p-3 text-sm font-semibold">Status</th>
                            <th className="text-center p-3 text-sm font-semibold">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {groupedByChurch[churchName].map((cost) => {
                            const statusColors = {
                              'PENDING': 'bg-yellow-100 text-yellow-800 border-yellow-300',
                              'APPROVED': 'bg-green-100 text-green-800 border-green-300',
                              'PAID': 'bg-emerald-100 text-emerald-800 border-emerald-300',
                              'REJECTED': 'bg-red-100 text-red-800 border-red-300'
                            };
                            const statusLabels = {
                              'PENDING': '🟡 Pendente',
                              'APPROVED': '🟢 Aprovado',
                              'PAID': '💚 Pago',
                              'REJECTED': '🔴 Reprovado'
                            };
                            
                            return (
                              <tr key={cost.costId} className="hover:bg-gray-50">
                                <td className="p-3 text-sm font-medium">{cost.churchName}</td>
                                <td className="p-3 text-sm">{cost.userName}</td>
                                <td className="p-3 text-sm font-medium">{cost.costTypeName}</td>
                                <td className="p-3 text-sm">{new Date(cost.dueDate).toLocaleDateString('pt-BR')}</td>
                                <td className="p-3 text-sm font-semibold">R$ {parseFloat(cost.value).toFixed(2)}</td>
                                <td className="p-3 text-sm font-semibold">
                                  {cost.valuePaid ? `R$ ${parseFloat(cost.valuePaid).toFixed(2)}` : '-'}
                                </td>
                                <td className="p-3 text-sm">
                                  {cost.difference > 0 ? (
                                    <span className="text-red-600 font-bold">+R$ {cost.difference.toFixed(2)}</span>
                                  ) : cost.difference < 0 ? (
                                    <span className="text-green-600 font-bold">-R$ {Math.abs(cost.difference).toFixed(2)}</span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                                <td className="p-3 text-center">
                                  <Badge className={`${statusColors[cost.status]} border`}>
                                    {statusLabels[cost.status]}
                                  </Badge>
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center justify-center gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setSelectedCost(cost);
                                        setShowCostViewModal(true);
                                      }}
                                      title="Visualizar Detalhes"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                    
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setSelectedCost(cost);
                                        setCostFormData({
                                          costId: cost.costId,
                                          costTypeId: cost.costTypeId,
                                          costTypeName: cost.costTypeName,
                                          dueDate: cost.dueDate,
                                          value: cost.value,
                                          billFile: cost.billFile || '',
                                          paymentDate: cost.paymentDate || '',
                                          valuePaid: cost.valuePaid || '',
                                          proofFile: cost.proofFile || '',
                                          status: cost.status,
                                          paidAt: cost.paidAt
                                        });
                                        setShowCostEditModalMaster(true);
                                      }}
                                      title="Editar"
                                      className="text-blue-600 hover:text-blue-700"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setSelectedCost(cost);
                                        setShowCostDeleteConfirm(true);
                                      }}
                                      title="Excluir"
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                    
                                    {cost.status === 'PENDING' && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleApproveCost(cost.costId)}
                                          title="Aprovar"
                                          className="text-green-600 hover:text-green-700"
                                        >
                                          <CheckCircle className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            const reason = prompt('Motivo da reprovação (opcional):');
                                            handleRejectCost(cost.costId, reason || 'Sem motivo especificado');
                                          }}
                                          title="Reprovar"
                                          className="text-red-600 hover:text-red-700"
                                        >
                                          <XCircle className="w-4 h-4" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ));
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
          
          {/* ESTATÍSTICA TAB */}
          {user?.role === 'master' && (
            <TabsContent value="estatistica">
              <div className="space-y-6">
                <Card className="border-2 border-purple-400">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-6 h-6" />
                      Estatísticas do Sistema
                    </CardTitle>
                    <CardDescription>Métricas e indicadores gerais do sistema IUDP</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Card Usuários */}
                      <Card className="border-2 border-blue-300">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600">Total de Usuários</p>
                              <p className="text-3xl font-bold text-blue-600">{usuarios.length || 0}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                              <Users className="w-6 h-6 text-blue-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* Card Igrejas */}
                      <Card className="border-2 border-green-300">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600">Total de Igrejas</p>
                              <p className="text-3xl font-bold text-green-600">{allChurches.length || 0}</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                              <span className="text-2xl">🏛️</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* Card Funções */}
                      <Card className="border-2 border-yellow-300">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600">Funções Cadastradas</p>
                              <p className="text-3xl font-bold text-yellow-600">{allRoles.length || 0}</p>
                            </div>
                            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                              <FileUser className="w-6 h-6 text-yellow-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* Card Custos */}
                      <Card className="border-2 border-purple-300">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600">Tipos de Custos</p>
                              <p className="text-3xl font-bold text-purple-600">{allCustos.length || 0}</p>
                            </div>
                            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                              <span className="text-2xl">💰</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* Card Ofertas */}
                      <Card className="border-2 border-red-300">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600">Ofertas Registradas</p>
                              <p className="text-3xl font-bold text-red-600">{entries.length || 0}</p>
                            </div>
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                              <TrendingUp className="w-6 h-6 text-red-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* Card Usuários Ativos */}
                      <Card className="border-2 border-teal-300">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600">Usuários Ativos</p>
                              <p className="text-3xl font-bold text-teal-600">
                                {usuarios.filter(u => u.isActive).length || 0}
                              </p>
                            </div>
                            <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-6 h-6 text-teal-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {/* Estatísticas de Custos */}
                    <Card className="mt-6 border-2 border-orange-300">
                      <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <DollarSign className="w-5 h-5" />
                          💰 Estatísticas de Custos
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Custos Pendentes */}
                          <Card className="border-2 border-yellow-300">
                            <CardContent className="pt-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-600">Pendentes</p>
                                  <p className="text-3xl font-bold text-yellow-600">
                                    {costsList.filter(c => c.status === 'PENDING').length || 0}
                                  </p>
                                </div>
                                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                                  <span className="text-2xl">🟡</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          
                          {/* Custos Aprovados */}
                          <Card className="border-2 border-green-300">
                            <CardContent className="pt-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-600">Aprovados</p>
                                  <p className="text-3xl font-bold text-green-600">
                                    {costsList.filter(c => c.status === 'APPROVED').length || 0}
                                  </p>
                                </div>
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                  <span className="text-2xl">🟢</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          
                          {/* Custos Reprovados */}
                          <Card className="border-2 border-red-300">
                            <CardContent className="pt-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-600">Reprovados</p>
                                  <p className="text-3xl font-bold text-red-600">
                                    {costsList.filter(c => c.status === 'REJECTED').length || 0}
                                  </p>
                                </div>
                                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                  <span className="text-2xl">🔴</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          
                          {/* Total em Juros */}
                          <Card className="border-2 border-pink-300">
                            <CardContent className="pt-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-600">Total em Juros</p>
                                  <p className="text-2xl font-bold text-pink-600">
                                    R$ {costsList
                                      .filter(c => c.difference > 0)
                                      .reduce((sum, c) => sum + c.difference, 0)
                                      .toFixed(2)}
                                  </p>
                                </div>
                                <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
                                  <TrendingUp className="w-6 h-6 text-pink-600" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          
                          {/* Valor Total de Custos */}
                          <Card className="border-2 border-indigo-300">
                            <CardContent className="pt-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-600">Valor Total</p>
                                  <p className="text-2xl font-bold text-indigo-600">
                                    R$ {costsList
                                      .reduce((sum, c) => sum + parseFloat(c.value || 0), 0)
                                      .toFixed(2)}
                                  </p>
                                </div>
                                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                                  <DollarSign className="w-6 h-6 text-indigo-600" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          
                          {/* Valor Total Pago */}
                          <Card className="border-2 border-cyan-300">
                            <CardContent className="pt-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-600">Total Pago</p>
                                  <p className="text-2xl font-bold text-cyan-600">
                                    R$ {costsList
                                      .reduce((sum, c) => sum + parseFloat(c.valuePaid || 0), 0)
                                      .toFixed(2)}
                                  </p>
                                </div>
                                <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center">
                                  <CheckCircle className="w-6 h-6 text-cyan-600" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Informações adicionais */}
                    <Card className="mt-6 border-2 border-gray-300">
                      <CardHeader>
                        <CardTitle className="text-lg">📊 Resumo Geral</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total de ofertas no mês atual:</span>
                            <span className="font-semibold">{entries.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Usuários inativos:</span>
                            <span className="font-semibold">{usuarios.filter(u => !u.isActive).length || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Taxa de ativação de usuários:</span>
                            <span className="font-semibold">
                              {usuarios.length > 0 
                                ? Math.round((usuarios.filter(u => u.isActive).length / usuarios.length) * 100) 
                                : 0}%
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </CardContent>
                </Card>
              </div>
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
                
                {/* Limpeza de Dados */}
                <Card className="border-2 border-red-400">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trash2 className="w-6 h-6 text-red-600" />
                      Limpeza de Dados
                    </CardTitle>
                    <CardDescription>
                      ⚠️ Atenção: Esta ação é irreversível!
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <p className="text-sm text-amber-800 mb-2">
                          <strong>⚠️ ATENÇÃO:</strong> Esta ação irá:
                        </p>
                        <ul className="text-sm text-amber-800 space-y-1 ml-4 list-disc">
                          <li>Excluir TODAS as ofertas do banco de dados</li>
                          <li>Remover ofertas órfãs (ligadas a igrejas inexistentes)</li>
                          <li>Zerar todos os relatórios e estatísticas</li>
                          <li>Esta ação NÃO pode ser desfeita</li>
                        </ul>
                      </div>
                      
                      {/* Botão: Limpar apenas ofertas órfãs */}
                      <Button
                        onClick={async () => {
                          if (!confirm('🔍 Limpar Ofertas Órfãs?\n\nSerão removidas apenas ofertas que:\n- Não têm igreja associada\n- Estão ligadas a igrejas que não existem mais\n\nOfertas válidas serão mantidas.\n\nConfirmar?')) {
                            return;
                          }
                          
                          try {
                            const res = await fetch('/api/entries/cleanup-orphans', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                              }
                            });
                            
                            const data = await res.json();
                            if (res.ok) {
                              toast.success(
                                `✅ ${data.message}\n\n` +
                                `📊 Verificadas: ${data.stats.totalChecked}\n` +
                                `🔍 Órfãs encontradas: ${data.stats.orphansFound}\n` +
                                `🗑️ Removidas: ${data.stats.orphansDeleted}\n` +
                                `✅ Válidas mantidas: ${data.stats.validEntriesRemaining}\n` +
                                `🏛️ Igrejas válidas: ${data.stats.validChurches.join(', ')}`
                              );
                              // Recarregar dados
                              fetchEntries();
                              fetchDashboardData();
                              fetchStats();
                            } else {
                              toast.error('❌ ' + data.error);
                            }
                          } catch (error) {
                            toast.error('❌ Erro ao limpar ofertas órfãs');
                          }
                        }}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        <AlertCircle className="w-4 h-4 mr-2" />
                        🧹 LIMPAR APENAS OFERTAS ÓRFÃS
                      </Button>
                      
                      {/* Botão: Limpar TODAS as ofertas */}
                      <Button
                        onClick={async () => {
                          if (!confirm('⚠️ TEM CERTEZA ABSOLUTA?\n\nTodas as ofertas serão PERMANENTEMENTE excluídas!\n\nEsta ação NÃO pode ser desfeita.\n\nDigite OK para confirmar:') === true) {
                            return;
                          }
                          
                          const confirmText = prompt('Digite "EXCLUIR TUDO" para confirmar (em letras maiúsculas):');
                          if (confirmText !== 'EXCLUIR TUDO') {
                            toast.error('❌ Confirmação incorreta. Operação cancelada.');
                            return;
                          }
                          
                          try {
                            const res = await fetch('/api/entries/clear-all', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                              }
                            });
                            
                            const data = await res.json();
                            if (res.ok) {
                              toast.success(`✅ ${data.message}\n\n📊 Ofertas excluídas: ${data.details.totalDeleted}\n🔍 Ofertas órfãs encontradas: ${data.details.orphanEntriesFound}`);
                              // Recarregar dados
                              fetchEntries();
                              fetchDashboardData();
                              fetchStats();
                            } else {
                              toast.error('❌ ' + data.error);
                            }
                          } catch (error) {
                            toast.error('❌ Erro ao limpar ofertas');
                          }
                        }}
                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        🗑️ LIMPAR TODAS AS OFERTAS
                      </Button>
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
              {/* 3 Campos Separados: Dinheiro, PIX, Maquineta */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="dinheiro" className="text-xs font-semibold text-green-700">💵 Dinheiro (R$)</Label>
                  <Input
                    id="dinheiro"
                    type="number"
                    step="0.01"
                    value={entryDinheiro}
                    onChange={(e) => setEntryDinheiro(e.target.value)}
                    placeholder="0,00"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="pix" className="text-xs font-semibold text-blue-700">📱 PIX (R$)</Label>
                  <Input
                    id="pix"
                    type="number"
                    step="0.01"
                    value={entryPix}
                    onChange={(e) => setEntryPix(e.target.value)}
                    placeholder="0,00"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="maquineta" className="text-xs font-semibold text-purple-700">💳 Maquineta (R$)</Label>
                  <Input
                    id="maquineta"
                    type="number"
                    step="0.01"
                    value={entryMaquineta}
                    onChange={(e) => setEntryMaquineta(e.target.value)}
                    placeholder="0,00"
                    className="mt-1"
                  />
                </div>
              </div>
              
              {/* Valor Total Calculado Automaticamente */}
              <div className="p-3 bg-blue-50 border-2 border-blue-300 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-blue-900">💰 Valor Total:</span>
                  <span className="text-2xl font-bold text-blue-700">
                    R$ {(
                      (parseFloat(entryDinheiro) || 0) + 
                      (parseFloat(entryPix) || 0) + 
                      (parseFloat(entryMaquineta) || 0)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
              
              <div>
                <Label htmlFor="notes">📝 Observações</Label>
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
                    setEntryDinheiro('');
                    setEntryPix('');
                    setEntryMaquineta('');
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
              <div className="relative border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50 min-h-[400px]">
                {viewingReceipts.receipts[viewingReceipts.currentIndex]?.fileType?.includes('pdf') ? (
                  <div className="w-full h-full min-h-[600px]">
                    <iframe
                      src={`/api/view/receipt/${viewingReceipts.receipts[viewingReceipts.currentIndex]?.filepath}`}
                      className="w-full h-[600px] border-0"
                      title="Visualizar PDF"
                    />
                    <div className="p-4 bg-gray-100 border-t flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-red-600" />
                        <span className="text-sm font-semibold">Arquivo PDF</span>
                      </div>
                      <Button
                        onClick={() => {
                          const receipt = viewingReceipts.receipts[viewingReceipts.currentIndex];
                          window.open(`/api/view/receipt/${receipt.filepath}`, '_blank');
                        }}
                        size="sm"
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Abrir em Nova Aba
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center min-h-[400px]">
                    <img
                      src={`/api/view/receipt/${viewingReceipts.receipts[viewingReceipts.currentIndex]?.filepath}`}
                      alt="Comprovante"
                      className="max-w-full max-h-[600px] object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <div style={{ display: 'none' }} className="text-center p-8">
                      <AlertCircle className="w-16 h-16 mx-auto mb-4 text-orange-600" />
                      <p className="font-semibold">Erro ao carregar arquivo</p>
                      <p className="text-sm text-gray-600 mt-2">
                        O arquivo pode estar corrompido ou não estar disponível
                      </p>
                    </div>
                  </div>
                )}
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
                  
                  {/* Botão Excluir Comprovante (apenas para pastores - donos da oferta) */}
                  {user?.role !== 'master' && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        if (!confirm('⚠️ ATENÇÃO!\n\nTem certeza que deseja EXCLUIR este comprovante?\n\nEsta ação não pode ser desfeita!')) {
                          return;
                        }
                        
                        try {
                          const receipt = viewingReceipts.receipts[viewingReceipts.currentIndex];
                          
                          const res = await fetch('/api/entries/delete-receipt', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                              entryId: viewingReceipts.entryId,
                              receiptFilepath: receipt.filepath
                            })
                          });
                          
                          const data = await res.json();
                          if (res.ok) {
                            toast.success('✅ ' + data.message);
                            
                            // Atualizar lista de comprovantes
                            if (data.remainingReceipts.length === 0) {
                              // Se não há mais comprovantes, fechar modal
                              setViewingReceipts(null);
                            } else {
                              // Atualizar visualização com comprovantes restantes
                              setViewingReceipts({
                                ...viewingReceipts,
                                receipts: data.remainingReceipts,
                                currentIndex: Math.min(viewingReceipts.currentIndex, data.remainingReceipts.length - 1)
                              });
                            }
                            
                            // Recarregar entries para atualizar lista geral
                            fetchEntries();
                          } else {
                            toast.error('❌ ' + data.error);
                          }
                        } catch (error) {
                          console.error('Erro ao excluir comprovante:', error);
                          toast.error('❌ Erro ao excluir comprovante');
                        }
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Excluir
                    </Button>
                  )}
                  
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
      
      {/* MODAL DE DETALHES (MASTER) - FASE 4 */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-purple-600" />
              📊 Detalhes - Dia {detailsData?.day && String(detailsData.day).padStart(2, '0')}/{detailsData?.month && String(detailsData.month).padStart(2, '0')}/{detailsData?.year} às {detailsData?.timeSlot}
            </DialogTitle>
            <DialogDescription>
              Visualização detalhada de todas as igrejas que fizeram ofertas neste horário
            </DialogDescription>
          </DialogHeader>
          
          {detailsData && (
            <div className="space-y-6 py-4">
              {/* Resumo Geral */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-lg p-4">
                <h3 className="text-lg font-bold text-blue-900 mb-3">💰 RESUMO GERAL</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Total Geral</p>
                    <p className="text-2xl font-bold text-blue-900">
                      R$ {parseFloat(detailsData.totalValue || 0).toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-green-700 font-semibold">💵 Dinheiro</p>
                    <p className="text-xl font-bold text-green-800">
                      R$ {parseFloat(detailsData.totalDinheiro || 0).toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-blue-700 font-semibold">📱 PIX</p>
                    <p className="text-xl font-bold text-blue-800">
                      R$ {parseFloat(detailsData.totalPix || 0).toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-purple-700 font-semibold">💳 Maquineta</p>
                    <p className="text-xl font-bold text-purple-800">
                      R$ {parseFloat(detailsData.totalMaquineta || 0).toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                </div>
              </div>
              
              <hr className="border-gray-300" />
              
              {/* Lista de Igrejas */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-800">🏛️ Detalhamento por Igreja</h3>
                
                {detailsData.churches && detailsData.churches.length > 0 ? (
                  detailsData.churches.map((church, index) => (
                    <Card key={index} className="border-2 border-gray-300">
                      <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <CardTitle className="text-base flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            🏛️ <span className="font-bold text-gray-800">{church.churchName || 'Igreja sem nome'}</span>
                          </span>
                          <Badge variant="outline" className="text-sm">
                            💰 R$ {parseFloat(church.value || 0).toFixed(2).replace('.', ',')}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="mt-2 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-blue-900">👤 Responsável:</span>
                            <span className="text-blue-700 font-medium">{church.userName || 'N/A'}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            Lançamento realizado neste dia e horário
                          </div>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4 space-y-3">
                        {/* Valores Discriminados */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-green-50 border border-green-200 rounded p-2 text-center">
                            <p className="text-xs text-green-700 font-semibold">💵 Dinheiro</p>
                            <p className="text-lg font-bold text-green-800">
                              R$ {parseFloat(church.dinheiro || 0).toFixed(2).replace('.', ',')}
                            </p>
                          </div>
                          <div className="bg-blue-50 border border-blue-200 rounded p-2 text-center">
                            <p className="text-xs text-blue-700 font-semibold">📱 PIX</p>
                            <p className="text-lg font-bold text-blue-800">
                              R$ {parseFloat(church.pix || 0).toFixed(2).replace('.', ',')}
                            </p>
                          </div>
                          <div className="bg-purple-50 border border-purple-200 rounded p-2 text-center">
                            <p className="text-xs text-purple-700 font-semibold">💳 Maquineta</p>
                            <p className="text-lg font-bold text-purple-800">
                              R$ {parseFloat(church.maquineta || 0).toFixed(2).replace('.', ',')}
                            </p>
                          </div>
                        </div>
                        
                        {/* Observação do Dia */}
                        {church.notes && (
                          <div className="bg-amber-50 border border-amber-200 rounded p-3">
                            <p className="text-xs text-amber-700 font-semibold mb-1">📝 Observação do Dia:</p>
                            <p className="text-sm text-amber-900 whitespace-pre-wrap">{church.notes}</p>
                          </div>
                        )}
                        
                        {/* Comprovantes */}
                        {church.receipts && church.receipts.length > 0 && (
                          <div className="bg-blue-50 border border-blue-200 rounded p-3">
                            <p className="text-xs text-blue-700 font-semibold mb-2">📎 Comprovantes ({church.receipts.length}):</p>
                            <div className="flex flex-wrap gap-2">
                              {church.receipts.map((receipt, idx) => (
                                <div key={idx} className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setViewingReceipts({
                                        entryId: `${detailsData.year}-${String(detailsData.month).padStart(2, '0')}-${String(detailsData.day).padStart(2, '0')}-${detailsData.timeSlot}`,
                                        receipts: church.receipts,
                                        currentIndex: idx
                                      });
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    <Eye className="w-3 h-3 mr-1" />
                                    Ver
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                      try {
                                        const link = document.createElement('a');
                                        link.href = `/api/download/receipt/${receipt.filepath}`;
                                        link.download = receipt.filename;
                                        link.target = '_blank';
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        toast.success('📥 Download iniciado: ' + receipt.filename);
                                      } catch (error) {
                                        toast.error('❌ Erro ao baixar comprovante');
                                      }
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <Download className="w-3 h-3 mr-1" />
                                    Baixar
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Botão Excluir Oferta (Master apenas) */}
                        <div className="mt-4 pt-4 border-t border-red-200">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="w-full bg-red-600 hover:bg-red-700"
                            onClick={async () => {
                              if (!confirm(`⚠️ ATENÇÃO!\n\nTem certeza que deseja EXCLUIR PERMANENTEMENTE esta oferta?\n\nIgreja: ${church.churchName}\nValor: R$ ${parseFloat(church.value || 0).toFixed(2)}\n\nEsta ação NÃO pode ser desfeita!`)) {
                                return;
                              }
                              
                              try {
                                // Precisamos do entryId específico desta igreja
                                const entryId = `${detailsData.year}-${String(detailsData.month).padStart(2, '0')}-${String(detailsData.day).padStart(2, '0')}-${detailsData.timeSlot}`;
                                
                                const res = await fetch('/api/entries/delete-specific', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                  },
                                  body: JSON.stringify({
                                    entryId,
                                    userId: church.userId
                                  })
                                });
                                
                                const data = await res.json();
                                if (res.ok) {
                                  toast.success('✅ Oferta excluída com sucesso!');
                                  
                                  // Recarregar dados
                                  fetchEntries();
                                  
                                  // Fechar modal
                                  setShowDetailsModal(false);
                                  setDetailsData(null);
                                } else {
                                  toast.error('❌ ' + data.error);
                                }
                              } catch (error) {
                                toast.error('❌ Erro ao excluir oferta');
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            🗑️ Excluir Esta Oferta
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Nenhuma igreja registrada neste horário</p>
                  </div>
                )}
              </div>
              
              {/* Botão Fechar */}
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => setShowDetailsModal(false)} variant="outline">
                  Fechar
                </Button>
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
      
      {/* ========== MODAIS DE CUSTOS ========== */}
      
      {/* Modal Criar Custo */}
      <Dialog open={showCostCreateModal} onOpenChange={setShowCostCreateModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>💰 Lançar Novo Custo</DialogTitle>
            <DialogDescription>Preencha as informações do custo a ser registrado</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Custo *</Label>
                <Select 
                  value={costFormData.costTypeId}
                  onValueChange={(value) => {
                    const tipo = allCustos.find(c => c.custoId === value);
                    setCostFormData({
                      ...costFormData,
                      costTypeId: value,
                      costTypeName: tipo?.name || ''
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {allCustos.map(custo => (
                      <SelectItem key={custo.custoId} value={custo.custoId}>
                        {custo.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Data de Vencimento *</Label>
                <Input
                  type="date"
                  value={costFormData.dueDate}
                  onChange={(e) => setCostFormData({...costFormData, dueDate: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <Label>Valor do Custo (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={costFormData.value}
                onChange={(e) => setCostFormData({...costFormData, value: e.target.value})}
              />
            </div>
            
            {/* Campos de Pagamento - DESABILITADOS ao criar */}
            <div className="border-t-2 border-gray-300 pt-4 mt-4">
              <p className="text-sm font-semibold text-gray-600 mb-3">
                📝 Informações de Pagamento (habilitado após aprovação do Master)
              </p>
              
              <div className="grid grid-cols-2 gap-4 opacity-50">
                <div>
                  <Label>Data do Pagamento</Label>
                  <Input
                    type="date"
                    disabled
                    className="bg-gray-100"
                    title="Este campo será liberado após aprovação do Master"
                  />
                </div>
                
                <div>
                  <Label>Valor Pago (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    disabled
                    className="bg-gray-100"
                    title="Este campo será liberado após aprovação do Master"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <Label>Conta/Boleto (Upload) 📎</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadingBill(true);
                      const filePath = await handleUploadCostFile(file, 'bill');
                      if (filePath) {
                        setCostFormData({...costFormData, billFile: filePath});
                      }
                      setUploadingBill(false);
                      e.target.value = ''; // Limpar input
                    }
                  }}
                  disabled={uploadingBill}
                  className="flex-1"
                />
                {uploadingBill && <span className="text-xs text-blue-600">Enviando...</span>}
              </div>
              {costFormData.billFile && (
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(costFormData.billFile, '_blank')}
                    className="flex-1"
                  >
                    <Eye className="w-3 h-3 mr-2" />
                    Visualizar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteCostFile('bill')}
                    className="flex-1"
                  >
                    <Trash2 className="w-3 h-3 mr-2" />
                    Excluir
                  </Button>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">Aceita: Imagens (JPG, PNG, WebP) e PDF (máx. 5MB)</p>
            </div>
            
            <div className="opacity-50">
              <Label>Comprovante de Pagamento 📎</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  disabled
                  className="flex-1 bg-gray-100"
                  title="Este campo será liberado após aprovação do Master"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                🔒 Este campo será habilitado após o Master aprovar o custo
              </p>
            </div>
            
            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={() => setShowCostCreateModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateCost} className="bg-orange-600 hover:bg-orange-700">
                💾 Salvar Custo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Modal Visualizar Custo */}
      <Dialog open={showCostViewModal} onOpenChange={setShowCostViewModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>👁️ Detalhes do Custo</DialogTitle>
          </DialogHeader>
          
          {selectedCost && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Tipo</Label>
                  <p className="font-semibold">{selectedCost.costTypeName}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Status</Label>
                  <p>
                    {selectedCost.status === 'PENDING' && '🟡 Pendente'}
                    {selectedCost.status === 'APPROVED' && '🟢 Aprovado'}
                    {selectedCost.status === 'PAID' && '💚 Pago'}
                    {selectedCost.status === 'REJECTED' && '🔴 Reprovado'}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Vencimento</Label>
                  <p className="font-semibold">{new Date(selectedCost.dueDate).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Data Pagamento</Label>
                  <p className="font-semibold">
                    {selectedCost.paymentDate ? new Date(selectedCost.paymentDate).toLocaleDateString('pt-BR') : '-'}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <Label className="text-xs text-blue-700">Valor do Custo</Label>
                  <p className="text-lg font-bold text-blue-900">R$ {parseFloat(selectedCost.value).toFixed(2)}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <Label className="text-xs text-green-700">Valor Pago</Label>
                  <p className="text-lg font-bold text-green-900">
                    {selectedCost.valuePaid ? `R$ ${parseFloat(selectedCost.valuePaid).toFixed(2)}` : '-'}
                  </p>
                </div>
                <div className={`${selectedCost.difference > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'} border rounded p-3`}>
                  <Label className="text-xs text-gray-700">Diferença</Label>
                  <p className={`text-lg font-bold ${selectedCost.difference > 0 ? 'text-red-900' : 'text-gray-700'}`}>
                    {selectedCost.difference > 0 ? `+R$ ${selectedCost.difference.toFixed(2)}` : '-'}
                  </p>
                </div>
              </div>
              
              {selectedCost.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <Label className="text-sm text-red-700 font-semibold">Motivo da Reprovação:</Label>
                  <p className="text-sm text-red-900 mt-1">{selectedCost.rejectionReason}</p>
                </div>
              )}
              
              {/* Arquivos Anexados */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                {selectedCost.billFile && (
                  <div className="border border-gray-300 rounded p-3">
                    <Label className="text-xs text-gray-600 font-semibold">📎 Conta/Boleto:</Label>
                    <div className="mt-2">
                      {selectedCost.billFile.endsWith('.pdf') ? (
                        <iframe 
                          src={selectedCost.billFile} 
                          className="w-full h-64 border rounded"
                          title="Conta/Boleto"
                        />
                      ) : (
                        <img 
                          src={selectedCost.billFile} 
                          alt="Conta/Boleto" 
                          className="w-full h-64 object-cover rounded border"
                        />
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => window.open(selectedCost.billFile, '_blank')}
                    >
                      <Download className="w-3 h-3 mr-2" />
                      Abrir/Baixar
                    </Button>
                  </div>
                )}
                
                {selectedCost.proofFile && (
                  <div className="border border-gray-300 rounded p-3">
                    <Label className="text-xs text-gray-600 font-semibold">📎 Comprovante:</Label>
                    <div className="mt-2">
                      {selectedCost.proofFile.endsWith('.pdf') ? (
                        <iframe 
                          src={selectedCost.proofFile} 
                          className="w-full h-64 border rounded"
                          title="Comprovante"
                        />
                      ) : (
                        <img 
                          src={selectedCost.proofFile} 
                          alt="Comprovante" 
                          className="w-full h-64 object-cover rounded border"
                        />
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => window.open(selectedCost.proofFile, '_blank')}
                    >
                      <Download className="w-3 h-3 mr-2" />
                      Abrir/Baixar
                    </Button>
                  </div>
                )}
                
                {!selectedCost.billFile && !selectedCost.proofFile && (
                  <div className="col-span-2 text-center text-gray-500 py-4">
                    <p className="text-sm">Nenhum arquivo anexado</p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 justify-end pt-4">
                <Button variant="outline" onClick={() => setShowCostViewModal(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Modal Editar/Pagar Custo */}
      <Dialog open={showCostEditModal} onOpenChange={setShowCostEditModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {costFormData.status === 'APPROVED' ? '💰 Registrar Pagamento' : '✏️ Editar Custo'}
            </DialogTitle>
            <DialogDescription>
              {costFormData.status === 'PENDING' && '⏳ Custo pendente de aprovação'}
              {costFormData.status === 'APPROVED' && '✅ Custo aprovado - Registre o pagamento'}
              {costFormData.status === 'PAID' && '💳 Custo já pago - Edição disponível por 60 minutos'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Seção de dados básicos do custo */}
            <div className="border-b pb-4">
              <p className="text-sm font-semibold text-gray-600 mb-3">📝 Dados do Custo</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de Custo *</Label>
                  <Select 
                    value={costFormData.costTypeId}
                    disabled={costFormData.status === 'APPROVED'}
                    onValueChange={(value) => {
                      const tipo = allCustos.find(c => c.custoId === value);
                      setCostFormData({
                        ...costFormData,
                        costTypeId: value,
                        costTypeName: tipo?.name || ''
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCustos.map(custo => (
                        <SelectItem key={custo.custoId} value={custo.custoId}>
                          {custo.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Data de Vencimento *</Label>
                  <Input
                    type="date"
                    disabled={costFormData.status === 'APPROVED'}
                    value={costFormData.dueDate}
                    onChange={(e) => setCostFormData({...costFormData, dueDate: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="mt-3">
                <Label>Valor do Custo (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  disabled={costFormData.status === 'APPROVED'}
                  value={costFormData.value}
                  onChange={(e) => setCostFormData({...costFormData, value: e.target.value})}
                />
              </div>
              
              <div className="mt-3">
                <Label>Conta/Boleto (Upload) 📎</Label>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    disabled={costFormData.status === 'APPROVED' || uploadingBill}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadingBill(true);
                        const filePath = await handleUploadCostFile(file, 'bill');
                        if (filePath) {
                          setCostFormData({...costFormData, billFile: filePath});
                        }
                        setUploadingBill(false);
                        e.target.value = '';
                      }
                    }}
                    className="flex-1"
                  />
                  {uploadingBill && <span className="text-xs text-blue-600">Enviando...</span>}
                </div>
                {costFormData.billFile && (
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(costFormData.billFile, '_blank')}
                      className="flex-1"
                    >
                      <Eye className="w-3 h-3 mr-2" />
                      Visualizar
                    </Button>
                    {costFormData.status !== 'APPROVED' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteCostFile('bill')}
                        className="flex-1"
                      >
                        <Trash2 className="w-3 h-3 mr-2" />
                        Excluir
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Seção de pagamento */}
            <div className="border-t-2 border-orange-300 pt-4">
              <p className="text-sm font-semibold text-orange-700 mb-3 flex items-center gap-2">
                <span>💳 Informações de Pagamento</span>
                {costFormData.status === 'PENDING' && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    Aguardando aprovação do Líder Máximo
                  </span>
                )}
                {costFormData.status === 'APPROVED' && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    Liberado para pagamento
                  </span>
                )}
                {costFormData.status === 'PAID' && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Pago
                  </span>
                )}
              </p>
              
              <div className={`grid grid-cols-2 gap-4 ${costFormData.status === 'PENDING' ? 'opacity-50' : ''}`}>
                <div>
                  <Label>Data do Pagamento {costFormData.status === 'APPROVED' && '*'}</Label>
                  <Input
                    type="date"
                    disabled={costFormData.status === 'PENDING'}
                    className={costFormData.status === 'PENDING' ? 'bg-gray-100' : ''}
                    value={costFormData.paymentDate}
                    onChange={(e) => setCostFormData({...costFormData, paymentDate: e.target.value})}
                    title={costFormData.status === 'PENDING' ? 'Este campo será liberado após aprovação do Master' : ''}
                  />
                </div>
                
                <div>
                  <Label>Valor Pago (R$) {costFormData.status === 'APPROVED' && '*'}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    disabled={costFormData.status === 'PENDING'}
                    className={costFormData.status === 'PENDING' ? 'bg-gray-100' : ''}
                    value={costFormData.valuePaid}
                    onChange={(e) => setCostFormData({...costFormData, valuePaid: e.target.value})}
                    title={costFormData.status === 'PENDING' ? 'Este campo será liberado após aprovação do Master' : ''}
                  />
                </div>
              </div>
              
              <div className={`mt-3 ${costFormData.status === 'PENDING' ? 'opacity-50' : ''}`}>
                <Label>Comprovante de Pagamento 📎 {costFormData.status === 'APPROVED' && '(Recomendado)'}</Label>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    disabled={costFormData.status === 'PENDING' || uploadingProof}
                    className={costFormData.status === 'PENDING' ? 'flex-1 bg-gray-100' : 'flex-1'}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadingProof(true);
                        const filePath = await handleUploadCostFile(file, 'proof');
                        if (filePath) {
                          setCostFormData({...costFormData, proofFile: filePath});
                        }
                        setUploadingProof(false);
                        e.target.value = '';
                      }
                    }}
                    title={costFormData.status === 'PENDING' ? 'Este campo será liberado após aprovação do Master' : ''}
                  />
                  {uploadingProof && <span className="text-xs text-blue-600">Enviando...</span>}
                </div>
                {costFormData.proofFile && (
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(costFormData.proofFile, '_blank')}
                      className="flex-1"
                    >
                      <Eye className="w-3 h-3 mr-2" />
                      Visualizar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteCostFile('proof')}
                      className="flex-1"
                    >
                      <Trash2 className="w-3 h-3 mr-2" />
                      Excluir
                    </Button>
                  </div>
                )}
                {costFormData.status === 'PENDING' && (
                  <p className="text-xs text-gray-500 mt-1">
                    🔒 Este campo será habilitado após o Líder Máximo aprovar o custo
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={() => setShowCostEditModal(false)}>
                Cancelar
              </Button>
              {costFormData.status === 'APPROVED' ? (
                <Button onClick={handlePayCost} className="bg-green-600 hover:bg-green-700">
                  💳 Confirmar Pagamento
                </Button>
              ) : (
                <Button onClick={handleUpdateCost} className="bg-blue-600 hover:bg-blue-700" disabled={costFormData.status === 'PENDING'}>
                  💾 Salvar Alterações
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Modal Confirmar Exclusão de Custo */}
      <Dialog open={showCostDeleteModal} onOpenChange={setShowCostDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este custo?
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={() => setShowCostDeleteModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => handleDeleteCost(selectedCost?.costId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Sim, Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Modal Rejeitar Solicitação */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Rejeitar Solicitação
            </DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição (opcional)
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded p-3 border">
                <p className="text-sm"><strong>Pastor:</strong> {selectedRequest.requesterName}</p>
                <p className="text-sm"><strong>Igreja:</strong> {selectedRequest.requesterChurch}</p>
                <p className="text-sm"><strong>Data:</strong> {selectedRequest.day}/{selectedRequest.month}/{selectedRequest.year} - {selectedRequest.timeSlot}</p>
              </div>
              
              <div>
                <Label>Motivo da Rejeição</Label>
                <textarea
                  className="w-full border rounded p-2 mt-1"
                  rows={4}
                  placeholder="Ex: Data incorreta, informações incompletas..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
              
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setSelectedRequest(null);
                }}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleRejectUnlockRequest}>
                  <XCircle className="w-4 h-4 mr-2" />
                  Rejeitar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Modal Visualizar Solicitação */}
      <Dialog open={showRequestViewModal} onOpenChange={setShowRequestViewModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              Detalhes da Solicitação
            </DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Pastor</Label>
                  <p className="font-semibold">{selectedRequest.requesterName}</p>
                  <p className="text-sm text-gray-600">{selectedRequest.requesterEmail}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Igreja</Label>
                  <p className="font-semibold">{selectedRequest.requesterChurch || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Data do Lançamento</Label>
                  <p className="font-semibold">{selectedRequest.day}/{selectedRequest.month}/{selectedRequest.year}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Horário</Label>
                  <p className="font-semibold">{selectedRequest.timeSlot}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Solicitado em</Label>
                  <p className="text-sm">{new Date(selectedRequest.createdAt).toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Status</Label>
                  <Badge className={selectedRequest.status === 'approved' ? 'bg-green-600' : selectedRequest.status === 'rejected' ? 'bg-red-600' : 'bg-yellow-600'}>
                    {selectedRequest.status === 'approved' ? '✅ Aprovado' : selectedRequest.status === 'rejected' ? '❌ Rejeitado' : '⏳ Pendente'}
                  </Badge>
                </div>
              </div>
              
              {selectedRequest.reason && (
                <div className="bg-gray-50 rounded p-3 border">
                  <Label className="text-xs text-gray-600">Motivo da Solicitação:</Label>
                  <p className="text-sm mt-1">{selectedRequest.reason}</p>
                </div>
              )}
              
              {selectedRequest.status === 'approved' && (
                <div className="bg-green-50 rounded p-3 border border-green-200">
                  <Label className="text-xs text-green-700">✅ Aprovado em:</Label>
                  <p className="text-sm mt-1">{new Date(selectedRequest.approvedAt).toLocaleString('pt-BR')}</p>
                </div>
              )}
              
              {selectedRequest.status === 'rejected' && selectedRequest.rejectionReason && (
                <div className="bg-red-50 rounded p-3 border border-red-200">
                  <Label className="text-xs text-red-700">❌ Motivo da Rejeição:</Label>
                  <p className="text-sm mt-1">{selectedRequest.rejectionReason}</p>
                  <p className="text-xs text-gray-500 mt-2">Rejeitado em: {new Date(selectedRequest.rejectedAt).toLocaleString('pt-BR')}</p>
                </div>
              )}
              
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setShowRequestViewModal(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Modal Confirmar Deletar Solicitação */}
      <Dialog open={showRequestDeleteConfirm} onOpenChange={setShowRequestDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Esta ação é permanente e não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-red-50 rounded p-3 border border-red-200">
                <p className="text-sm font-semibold text-red-900">Tem certeza que deseja deletar esta solicitação?</p>
                <p className="text-sm text-gray-700 mt-2"><strong>Pastor:</strong> {selectedRequest.requesterName}</p>
                <p className="text-sm text-gray-700"><strong>Data:</strong> {selectedRequest.day}/{selectedRequest.month}/{selectedRequest.year} - {selectedRequest.timeSlot}</p>
              </div>
              
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => {
                  setShowRequestDeleteConfirm(false);
                  setSelectedRequest(null);
                }}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleDeleteUnlockRequest}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Deletar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Modal Editar Custo (Master) */}
      <Dialog open={showCostEditModalMaster} onOpenChange={setShowCostEditModalMaster}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Custo - Master</DialogTitle>
            <DialogDescription>Edite qualquer campo, incluindo o status</DialogDescription>
          </DialogHeader>
          
          {selectedCost && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Tipo de Custo *</Label>
                  <select
                    className="w-full border rounded p-2"
                    value={costFormData.costTypeId}
                    onChange={(e) => {
                      const selected = allCustos.find(c => c.custoId === e.target.value);
                      setCostFormData({
                        ...costFormData,
                        costTypeId: e.target.value,
                        costTypeName: selected?.name || ''
                      });
                    }}
                  >
                    <option value="">Selecione o tipo de custo</option>
                    {allCustos.map(custo => (
                      <option key={custo.custoId} value={custo.custoId}>
                        {custo.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label>Data de Vencimento</Label>
                  <Input
                    type="date"
                    value={costFormData.dueDate}
                    onChange={(e) => setCostFormData({...costFormData, dueDate: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label>Valor (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={costFormData.value}
                    onChange={(e) => setCostFormData({...costFormData, value: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label>Data de Pagamento</Label>
                  <Input
                    type="date"
                    value={costFormData.paymentDate}
                    onChange={(e) => setCostFormData({...costFormData, paymentDate: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label>Valor Pago (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={costFormData.valuePaid}
                    onChange={(e) => setCostFormData({...costFormData, valuePaid: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label>Conta/Boleto (Upload) 📎</Label>
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploadingBill(true);
                          const filePath = await handleUploadCostFile(file, 'bill');
                          if (filePath) {
                            setCostFormData({...costFormData, billFile: filePath});
                          }
                          setUploadingBill(false);
                          e.target.value = '';
                        }
                      }}
                      disabled={uploadingBill}
                      className="flex-1"
                    />
                  </div>
                  {costFormData.billFile && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(costFormData.billFile, '_blank')}
                        className="flex-1"
                      >
                        <Eye className="w-3 h-3 mr-2" />
                        Visualizar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteCostFile('bill')}
                        className="flex-1"
                      >
                        <Trash2 className="w-3 h-3 mr-2" />
                        Excluir
                      </Button>
                    </div>
                  )}
                </div>
                
                <div>
                  <Label>Comprovante de Pagamento 📎</Label>
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploadingProof(true);
                          const filePath = await handleUploadCostFile(file, 'proof');
                          if (filePath) {
                            setCostFormData({...costFormData, proofFile: filePath});
                          }
                          setUploadingProof(false);
                          e.target.value = '';
                        }
                      }}
                      disabled={uploadingProof}
                      className="flex-1"
                    />
                  </div>
                  {costFormData.proofFile && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(costFormData.proofFile, '_blank')}
                        className="flex-1"
                      >
                        <Eye className="w-3 h-3 mr-2" />
                        Visualizar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteCostFile('proof')}
                        className="flex-1"
                      >
                        <Trash2 className="w-3 h-3 mr-2" />
                        Excluir
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="col-span-2">
                  <Label>Status</Label>
                  <select
                    className="w-full border rounded p-2"
                    value={costFormData.status}
                    onChange={(e) => setCostFormData({...costFormData, status: e.target.value})}
                  >
                    <option value="PENDING">🟡 Pendente</option>
                    <option value="APPROVED">🟢 Aprovado</option>
                    <option value="PAID">💚 Pago</option>
                    <option value="REJECTED">🔴 Reprovado</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    "Pago" = Pagamento confirmado e comprovante anexado
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowCostEditModalMaster(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdateCostEntryMaster}>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Modal Confirmar Deletar Custo */}
      <Dialog open={showCostDeleteConfirm} onOpenChange={setShowCostDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Esta ação é permanente e não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          
          {selectedCost && (
            <div className="space-y-4">
              <div className="bg-red-50 rounded p-3 border border-red-200">
                <p className="text-sm font-semibold text-red-900">Tem certeza que deseja excluir este custo?</p>
                <p className="text-sm text-gray-700 mt-2"><strong>Tipo:</strong> {selectedCost.costTypeName}</p>
                <p className="text-sm text-gray-700"><strong>Igreja:</strong> {selectedCost.churchName}</p>
                <p className="text-sm text-gray-700"><strong>Valor:</strong> R$ {parseFloat(selectedCost.value).toFixed(2)}</p>
              </div>
              
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => {
                  setShowCostDeleteConfirm(false);
                  setSelectedCost(null);
                }}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleDeleteCostEntry}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
    </div>
  );
}