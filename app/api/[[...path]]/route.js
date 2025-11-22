import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { format, addHours, isBefore, isAfter, differenceInMinutes, addSeconds } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

// Configurar dayjs com timezone
dayjs.extend(utc);
dayjs.extend(timezone);

// FIXAR TIMEZONE DO SERVIDOR PARA AMERICA/SAO_PAULO
process.env.TZ = 'America/Sao_Paulo';

const TIMEZONE = 'America/Sao_Paulo';
const JWT_SECRET = process.env.JWT_SECRET || 'iudp-secret-key-2025';
const UPLOAD_DIR = '/app/uploads/receipts';

// DEFINIÇÃO DAS JANELAS DE CULTO
const TIME_SLOTS = {
  '08:00': { start: '08:00', end: '10:00' },
  '10:00': { start: '10:00', end: '12:00' },
  '12:00': { start: '12:00', end: '15:00' },
  '15:00': { start: '15:00', end: '19:30' },
  '19:30': { start: '19:30', end: '22:00' }
};

const TOLERANCE_SECONDS = 59; // Tolerância para latência de rede

let cachedClient = null;
let cachedDb = null;

async function connectDB() {
  if (cachedDb) return cachedDb;
  
  const client = await MongoClient.connect(process.env.MONGO_URL);
  const db = client.db('iudp_control');
  
  cachedClient = client;
  cachedDb = db;
  
  return db;
}

function verifyToken(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  
  const token = authHeader.replace('Bearer ', '');
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Retorna horário atual de Brasília usando dayjs
 * Sempre retorna America/Sao_Paulo (UTC-3)
 */
function getBrazilTime() {
  return dayjs().tz('America/Sao_Paulo');
}

/**
 * Converte um objeto dayjs para Date JavaScript
 */
function toJSDate(dayjsObj) {
  return dayjsObj.toDate();
}

/**
 * Valida se um lançamento pode ser salvo considerando:
 * - Override de tempo (prioridade 1)
 * - Mês fechado (prioridade 2)
 * - Janela de culto com tolerância (prioridade 3)
 * - Trava de 1h para edições (prioridade 4)
 */
async function validateEntryTiming(db, {
  userId,
  churchId,
  month,
  year,
  day,
  timeSlot,
  isEdit = false,
  createdAt = null,
  entryId = null
}) {
  const now = getBrazilTime(); // dayjs com timezone Brasília
  
  // 1. VERIFICAR OVERRIDE DE TEMPO (PRIORIDADE MÁXIMA)
  const override = await db.collection('time_overrides').findOne({
    $or: [
      { churchId, month: parseInt(month), year: parseInt(year), day: parseInt(day), timeSlot },
      { userId, month: parseInt(month), year: parseInt(year), day: parseInt(day), timeSlot }
    ],
    expiresAt: { $gt: now.toISOString() }
  });
  
  if (override) {
    // Override ativo - permitir e logar
    await db.collection('audit_logs').insertOne({
      logId: crypto.randomUUID(),
      action: 'TIME_OVERRIDE_USED',
      userId,
      timestamp: now.toISOString(),
      details: {
        overrideId: override.overrideId,
        entryId: entryId || 'new',
        expiresAt: override.expiresAt
      }
    });
    
    const expiresTime = dayjs(override.expiresAt).tz('America/Sao_Paulo');
    return {
      allowed: true,
      reason: 'OVERRIDE_ACTIVE',
      message: `Liberado pelo Master até ${expiresTime.format('HH:mm')}`
    };
  }
  
  // 2. VERIFICAR MÊS FECHADO
  const monthStatus = await db.collection('month_status').findOne({
    month: parseInt(month),
    year: parseInt(year)
  });
  
  if (monthStatus?.closed) {
    await logTimeValidationFail(db, {
      userId, churchId, month, year, day, timeSlot,
      reason: 'MONTH_CLOSED',
      nowISO: now.toISOString()
    });
    
    return {
      allowed: false,
      reason: 'MONTH_CLOSED',
      message: 'Mês fechado. Contate o Líder Máximo para reabrir.'
    };
  }
  
  // 3. VERIFICAR TRAVA DE 1H PARA EDIÇÕES
  if (isEdit && createdAt) {
    const createdTime = dayjs(createdAt).tz('America/Sao_Paulo');
    const oneHourLater = createdTime.add(1, 'hour');
    const isLocked = now.isAfter(oneHourLater);
    
    if (isLocked) {
      // Verificar se há override de edição
      const editOverride = await db.collection('edit_overrides').findOne({
        entryId,
        expiresAt: { $gt: now.toISOString() }
      });
      
      if (!editOverride) {
        await logTimeValidationFail(db, {
          userId, churchId, month, year, day, timeSlot,
          reason: 'EDIT_LOCKED',
          nowISO: now.toISOString(),
          createdAt,
          oneHourExpiry: oneHourLater.toISOString()
        });
        
        return {
          allowed: false,
          reason: 'EDIT_LOCKED',
          message: 'Lançamento travado após 1h. Peça liberação ao Master para correção.'
        };
      }
    }
  }
  
  // 4. VERIFICAR JANELA DE CULTO COM TOLERÂNCIA
  const slotConfig = TIME_SLOTS[timeSlot];
  
  if (!slotConfig) {
    return {
      allowed: false,
      reason: 'INVALID_TIMESLOT',
      message: 'Horário de culto inválido.'
    };
  }
  
  // Construir horários de início e fim da janela usando dayjs
  const [startHour, startMinute] = slotConfig.start.split(':').map(Number);
  const [endHour, endMinute] = slotConfig.end.split(':').map(Number);
  
  const windowStart = dayjs.tz(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${slotConfig.start}`, 'America/Sao_Paulo');
  const windowEnd = dayjs.tz(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${slotConfig.end}`, 'America/Sao_Paulo');
  
  // Adicionar tolerância de 59 segundos ao fim da janela
  const effectiveCutoff = windowEnd.add(TOLERANCE_SECONDS, 'second');
  
  const isInWindow = now.isAfter(windowStart) && now.isBefore(effectiveCutoff);
  
  if (!isInWindow) {
    await logTimeValidationFail(db, {
      userId, churchId, month, year, day, timeSlot,
      reason: 'WINDOW_CLOSED',
      nowISO: now.toISOString(),
      startISO: windowStart.toISOString(),
      cutoffISO: effectiveCutoff.toISOString(),
      tz: 'America/Sao_Paulo'
    });
    
    return {
      allowed: false,
      reason: 'WINDOW_CLOSED',
      message: `Janela encerrada às ${windowEnd.format('HH:mm')} (Horário de Brasília). Clique em Solicitar liberação para registrar este culto.`,
      windowEnd: windowEnd.format('HH:mm')
    };
  }
  
  // TUDO OK - PERMITIR
  return {
    allowed: true,
    reason: 'IN_WINDOW',
    message: 'Lançamento permitido dentro da janela de culto.'
  };
}

/**
 * Registra falha de validação de tempo no audit log
 */
async function logTimeValidationFail(db, details) {
  try {
    await db.collection('audit_logs').insertOne({
      logId: crypto.randomUUID(),
      action: 'TIME_VALIDATION_FAIL',
      timestamp: getBrazilTime().toISOString(),
      details
    });
  } catch (error) {
    console.error('Erro ao logar validação de tempo:', error);
  }
}

function getTimeWindowEnd(timeSlot) {
  const windows = {
    '08:00': '10:00',
    '10:00': '12:00',
    '12:00': '15:00',
    '15:00': '19:30',
    '19:30': '22:00'
  };
  return windows[timeSlot];
}

function isEntryLocked(entry, currentTime) {
  // PATCH 2: Verificar override PRIMEIRO (antes de qualquer bloqueio)
  if (entry.masterUnlocked) {
    // Verificar se ainda está dentro do prazo de override
    if (entry.unlockedUntil) {
      const unlockExpiry = new Date(entry.unlockedUntil);
      if (isAfter(currentTime, unlockExpiry)) {
        // Override expirou
        return { locked: true, reason: 'override_expired' };
      }
    }
    // Override ativo - permitir edição
    return { locked: false, reason: 'override_active' };
  }
  
  // Se não tem override, aplicar regras normais
  if (entry.timeWindowLocked) return { locked: true, reason: 'time_window' };
  
  if (entry.createdAt && entry.value !== null && entry.value !== undefined && entry.value !== '') {
    const createdTime = new Date(entry.createdAt);
    const oneHourLater = addHours(createdTime, 1);
    if (isAfter(currentTime, oneHourLater)) {
      return { locked: true, reason: 'one_hour_edit' };
    }
  }
  
  return { locked: false };
}

function canUserAccessEntry(user, entry) {
  if (user.role === 'master') return true;
  if (user.scope === 'global') return true;
  
  if (user.scope === 'state') {
    return entry.state === user.state;
  } else if (user.scope === 'region') {
    return entry.region === user.region && entry.state === user.state;
  } else if (user.scope === 'church') {
    return entry.church === user.church;
  }
  
  return false;
}

export async function POST(request) {
  const url = new URL(request.url);
  const endpoint = url.pathname.replace('/api/', '');
  
  try {
    const db = await connectDB();
    
    // PUBLIC: GET ALL CHURCHES (para cadastro público)
    if (endpoint === 'public/churches') {
      try {
        const churches = await db.collection('churches')
          .find({}, { projection: { name: 1, churchId: 1, city: 1, state: 1 } })
          .sort({ name: 1 })
          .toArray();
        
        return NextResponse.json({ churches });
      } catch (error) {
        return NextResponse.json({ error: 'Erro ao buscar igrejas' }, { status: 500 });
      }
    }
    
    // ========== CUSTOS ENDPOINTS ==========
    
    // CREATE CUSTO
    if (endpoint === 'custos/create') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      const { name } = await request.json();
      
      if (!name || !name.trim()) {
        return NextResponse.json({ error: 'Nome do custo é obrigatório' }, { status: 400 });
      }
      
      const custo = {
        custoId: crypto.randomUUID(),
        name: name.trim(),
        createdAt: getBrazilTime().toISOString()
      };
      
      await db.collection('custos').insertOne(custo);
      
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: 'create_custo',
        userId: user.userId,
        timestamp: getBrazilTime().toISOString(),
        details: { custoId: custo.custoId, name: custo.name }
      });
      
      return NextResponse.json({ success: true, message: 'Custo cadastrado com sucesso!', custo });
    }
    
    // LIST CUSTOS
    if (endpoint === 'custos/list') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }
      
      // Todos os usuários autenticados podem listar tipos de custos
      const custos = await db.collection('custos')
        .find({})
        .sort({ name: 1 })
        .toArray();
      
      return NextResponse.json({ custos });
    }
    
    // UPDATE CUSTO
    if (endpoint === 'custos/update') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      const { custoId, custoData } = await request.json();
      
      await db.collection('custos').updateOne(
        { custoId },
        { $set: { ...custoData, updatedAt: getBrazilTime().toISOString() } }
      );
      
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: 'update_custo',
        userId: user.userId,
        timestamp: getBrazilTime().toISOString(),
        details: { custoId, updates: Object.keys(custoData) }
      });
      
      return NextResponse.json({ success: true, message: 'Custo atualizado com sucesso!' });
    }
    
    // DELETE CUSTO
    if (endpoint === 'custos/delete') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      const { custoId } = await request.json();
      
      await db.collection('custos').deleteOne({ custoId });
      
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: 'delete_custo',
        userId: user.userId,
        timestamp: getBrazilTime().toISOString(),
        details: { custoId }
      });
      
      return NextResponse.json({ success: true, message: 'Custo excluído com sucesso!' });
    }
    
    // LIMPAR TODAS AS OFERTAS (Master apenas)
    if (endpoint === 'entries/clear-all') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      try {
        // Primeiro, vamos verificar quantas ofertas existem
        const entriesCount = await db.collection('entries').countDocuments();
        
        // Verificar ofertas órfãs (ligadas a igrejas que não existem)
        const entries = await db.collection('entries').find({}).toArray();
        const churches = await db.collection('churches').find({}).toArray();
        const churchIds = new Set(churches.map(c => c.churchId));
        
        const orphanEntries = entries.filter(e => e.churchId && !churchIds.has(e.churchId));
        
        // Deletar TODAS as ofertas
        const deleteResult = await db.collection('entries').deleteMany({});
        
        // Registrar no audit log
        await db.collection('audit_logs').insertOne({
          logId: crypto.randomUUID(),
          action: 'clear_all_entries',
          userId: user.userId,
          timestamp: getBrazilTime().toISOString(),
          details: {
            totalDeleted: deleteResult.deletedCount,
            entriesCount: entriesCount,
            orphanEntries: orphanEntries.length,
            orphanDetails: orphanEntries.map(e => ({
              entryId: e.entryId,
              churchId: e.churchId,
              date: e.date,
              value: e.value
            }))
          }
        });
        
        return NextResponse.json({
          success: true,
          message: `✅ Todas as ofertas foram excluídas com sucesso!`,
          details: {
            totalDeleted: deleteResult.deletedCount,
            orphanEntriesFound: orphanEntries.length
          }
        });
      } catch (error) {
        console.error('Erro ao limpar ofertas:', error);
        return NextResponse.json({ error: 'Erro ao limpar ofertas' }, { status: 500 });
      }
    }
    
    // LIMPAR APENAS OFERTAS ÓRFÃS (Master apenas)
    if (endpoint === 'entries/cleanup-orphans') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      try {
        // Buscar todas as igrejas válidas
        const churches = await db.collection('churches').find({}).toArray();
        const validChurchIds = new Set(churches.map(c => c.churchId));
        
        console.log('[CLEANUP ORPHANS] Igrejas válidas:', Array.from(validChurchIds));
        
        // Buscar todas as ofertas
        const allEntries = await db.collection('entries').find({}).toArray();
        
        // Identificar ofertas órfãs
        const orphanEntries = allEntries.filter(entry => {
          // Oferta órfã se:
          // 1. Não tem churchId OU
          // 2. churchId não está na lista de igrejas válidas
          return !entry.churchId || !validChurchIds.has(entry.churchId);
        });
        
        console.log('[CLEANUP ORPHANS] Total de ofertas:', allEntries.length);
        console.log('[CLEANUP ORPHANS] Ofertas órfãs encontradas:', orphanEntries.length);
        
        // Deletar ofertas órfãs
        const orphanEntryIds = orphanEntries.map(e => e.entryId);
        let deleteResult = { deletedCount: 0 };
        
        if (orphanEntryIds.length > 0) {
          deleteResult = await db.collection('entries').deleteMany({
            entryId: { $in: orphanEntryIds }
          });
        }
        
        // Registrar no audit log
        await db.collection('audit_logs').insertOne({
          logId: crypto.randomUUID(),
          action: 'cleanup_orphan_entries',
          userId: user.userId,
          timestamp: getBrazilTime().toISOString(),
          details: {
            totalChecked: allEntries.length,
            orphansFound: orphanEntries.length,
            orphansDeleted: deleteResult.deletedCount,
            validChurches: Array.from(validChurchIds),
            validEntriesRemaining: allEntries.length - orphanEntries.length,
            orphanDetails: orphanEntries.map(e => ({
              entryId: e.entryId,
              churchId: e.churchId || 'SEM_CHURCH_ID',
              churchName: e.church || 'SEM_CHURCH_NAME',
              value: e.value,
              date: `${e.year}-${String(e.month).padStart(2, '0')}-${String(e.day).padStart(2, '0')}`
            }))
          }
        });
        
        return NextResponse.json({
          success: true,
          message: `✅ Limpeza concluída! ${deleteResult.deletedCount} ofertas órfãs removidas.`,
          stats: {
            totalChecked: allEntries.length,
            orphansFound: orphanEntries.length,
            orphansDeleted: deleteResult.deletedCount,
            validChurches: churches.map(c => c.name),
            validEntriesRemaining: allEntries.length - orphanEntries.length
          }
        });
      } catch (error) {
        console.error('Erro ao limpar ofertas órfãs:', error);
        return NextResponse.json({ error: 'Erro ao limpar ofertas órfãs' }, { status: 500 });
      }
    }
    
    // ========== ENDPOINTS DE CUSTOS (COSTS ENTRIES) ==========
    
    // CREATE COST ENTRY (Pastor/Bispo)
    if (endpoint === 'costs-entries/create') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }
      
      try {
        const userData = await db.collection('users').findOne({ userId: user.userId });
        const body = await request.json();
        const { costTypeId, costTypeName, dueDate, value, billFile, paymentDate, valuePaid, proofFile, description } = body;
        
        // Validações
        if (!costTypeId || !dueDate || !value) {
          return NextResponse.json({ error: 'Campos obrigatórios: tipo de custo, vencimento e valor' }, { status: 400 });
        }
        
        // Calcular diferença (juros/multa)
        const difference = (parseFloat(valuePaid) || 0) - parseFloat(value);
        
        const costEntry = {
          costId: crypto.randomUUID(),
          churchId: userData.churchId,
          churchName: userData.church,
          userId: user.userId,
          userName: userData.name,
          costTypeId,
          costTypeName,
          dueDate,
          value: parseFloat(value),
          billFile: billFile || null,
          paymentDate: null, // Pastor não pode preencher na criação
          valuePaid: 0, // Será preenchido após aprovação
          difference: 0,
          proofFile: null, // Será preenchido após aprovação
          status: 'PENDING',
          reviewedBy: null,
          reviewedAt: null,
          rejectionReason: null,
          paidAt: null,
          paidBy: null,
          createdAt: getBrazilTime().toISOString(),
          updatedAt: getBrazilTime().toISOString()
        };
        
        await db.collection('costs_entries').insertOne(costEntry);
        
        // Audit log
        await db.collection('audit_logs').insertOne({
          logId: crypto.randomUUID(),
          action: 'create_cost_entry',
          userId: user.userId,
          timestamp: getBrazilTime().toISOString(),
          details: { costId: costEntry.costId, costTypeName, value }
        });
        
        return NextResponse.json({ success: true, message: 'Custo registrado com sucesso!', costEntry });
      } catch (error) {
        console.error('Erro ao criar custo:', error);
        return NextResponse.json({ error: 'Erro ao criar custo' }, { status: 500 });
      }
    }
    
    // LIST COST ENTRIES
    if (endpoint === 'costs-entries/list') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }
      
      try {
        const userData = await db.collection('users').findOne({ userId: user.userId });
        const body = await request.json();
        const { status: filterStatus, churchId: filterChurch } = body;
        
        let filter = {};
        
        // Se for Master, vê tudo; se for Pastor, vê apenas da sua igreja
        if (userData.role !== 'master') {
          filter.churchId = userData.churchId;
        } else if (filterChurch) {
          // Master pode filtrar por igreja específica
          filter.churchId = filterChurch;
        }
        
        // Filtro por status (se fornecido)
        if (filterStatus && filterStatus !== 'ALL') {
          filter.status = filterStatus;
        }
        
        const costs = await db.collection('costs_entries').find(filter).sort({ createdAt: -1 }).toArray();
        
        return NextResponse.json({ success: true, costs });
      } catch (error) {
        console.error('Erro ao listar custos:', error);
        return NextResponse.json({ error: 'Erro ao listar custos' }, { status: 500 });
      }
    }
    
    // UPDATE COST ENTRY (Pastor - com regras de janela de 60 min)
    if (endpoint === 'costs-entries/update') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }
      
      try {
        const body = await request.json();
        const { costId, costData } = body;
        
        const existingCost = await db.collection('costs_entries').findOne({ costId });
        if (!existingCost) {
          return NextResponse.json({ error: 'Custo não encontrado' }, { status: 404 });
        }
        
        // Verificar permissão
        const userData = await db.collection('users').findOne({ userId: user.userId });
        if (userData.role !== 'master' && existingCost.userId !== user.userId) {
          return NextResponse.json({ error: 'Sem permissão para editar este custo' }, { status: 403 });
        }
        
        // Se não for Master, verificar regras de edição
        if (userData.role !== 'master') {
          // Se status = PENDING, não pode editar (custo ainda não foi aprovado)
          if (existingCost.status === 'PENDING') {
            return NextResponse.json({ error: 'Custo pendente de aprovação. Aguarde aprovação do Líder Máximo.' }, { status: 403 });
          }
          
          // Se status = PAID, verificar janela de 60 minutos
          if (existingCost.status === 'PAID' && existingCost.paidAt) {
            const paidTime = new Date(existingCost.paidAt);
            const now = getBrazilTime();
            const diffMinutes = (now - paidTime) / (1000 * 60);
            
            if (diffMinutes > 60) {
              return NextResponse.json({ error: 'Prazo de 60 minutos para edição expirado. Entre em contato com o Líder Máximo.' }, { status: 403 });
            }
          }
        }
        
        // Calcular diferença se valuePaid ou value mudaram
        let difference = existingCost.difference;
        if (costData.valuePaid !== undefined || costData.value !== undefined) {
          const newValuePaid = costData.valuePaid !== undefined ? parseFloat(costData.valuePaid) : existingCost.valuePaid;
          const newValue = costData.value !== undefined ? parseFloat(costData.value) : existingCost.value;
          difference = newValuePaid - newValue;
        }
        
        const updateData = {
          ...costData,
          difference,
          updatedAt: getBrazilTime().toISOString()
        };
        
        // Se não for Master e estava APPROVED, não altera o status
        if (userData.role !== 'master') {
          delete updateData.status; // Mantém o status atual
        }
        
        await db.collection('costs_entries').updateOne(
          { costId },
          { $set: updateData }
        );
        
        // Audit log
        await db.collection('audit_logs').insertOne({
          logId: crypto.randomUUID(),
          action: 'update_cost_entry',
          userId: user.userId,
          timestamp: getBrazilTime().toISOString(),
          details: { costId, changes: costData }
        });
        
        return NextResponse.json({ success: true, message: 'Custo atualizado com sucesso!' });
      } catch (error) {
        console.error('Erro ao atualizar custo:', error);
        return NextResponse.json({ error: 'Erro ao atualizar custo' }, { status: 500 });
      }
    }
    
    // PAY COST ENTRY (Pastor submete pagamento após aprovação)
    if (endpoint === 'costs-entries/pay') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }
      
      try {
        const body = await request.json();
        const { costId, paymentDate, valuePaid, proofFile } = body;
        
        const existingCost = await db.collection('costs_entries').findOne({ costId });
        if (!existingCost) {
          return NextResponse.json({ error: 'Custo não encontrado' }, { status: 404 });
        }
        
        // Verificar se é o dono do custo
        if (existingCost.userId !== user.userId) {
          return NextResponse.json({ error: 'Sem permissão para pagar este custo' }, { status: 403 });
        }
        
        // Verificar se status = APPROVED
        if (existingCost.status !== 'APPROVED') {
          return NextResponse.json({ error: 'Custo precisa estar APROVADO para registrar pagamento' }, { status: 403 });
        }
        
        // Validar campos obrigatórios
        if (!paymentDate || !valuePaid) {
          return NextResponse.json({ error: 'Data de pagamento e valor pago são obrigatórios' }, { status: 400 });
        }
        
        // Calcular diferença
        const difference = parseFloat(valuePaid) - parseFloat(existingCost.value);
        
        const updateData = {
          paymentDate,
          valuePaid: parseFloat(valuePaid),
          proofFile: proofFile || null,
          difference,
          status: 'PAID',
          paidAt: getBrazilTime().toISOString(),
          paidBy: user.userId,
          updatedAt: getBrazilTime().toISOString()
        };
        
        await db.collection('costs_entries').updateOne(
          { costId },
          { $set: updateData }
        );
        
        // Audit log
        await db.collection('audit_logs').insertOne({
          logId: crypto.randomUUID(),
          action: 'pay_cost_entry',
          userId: user.userId,
          timestamp: getBrazilTime().toISOString(),
          details: { costId, valuePaid, paymentDate }
        });
        
        return NextResponse.json({ success: true, message: 'Pagamento registrado com sucesso! Você tem 60 minutos para editar.' });
      } catch (error) {
        console.error('Erro ao registrar pagamento:', error);
        return NextResponse.json({ error: 'Erro ao registrar pagamento' }, { status: 500 });
      }
    }
    
    // DELETE COST ENTRY
    if (endpoint === 'costs-entries/delete') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }
      
      try {
        const body = await request.json();
        const { costId } = body;
        
        const existingCost = await db.collection('costs_entries').findOne({ costId });
        if (!existingCost) {
          return NextResponse.json({ error: 'Custo não encontrado' }, { status: 404 });
        }
        
        // Verificar permissão
        const userData = await db.collection('users').findOne({ userId: user.userId });
        if (userData.role !== 'master' && existingCost.userId !== user.userId) {
          return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
        }
        
        await db.collection('costs_entries').deleteOne({ costId });
        
        // Audit log
        await db.collection('audit_logs').insertOne({
          logId: crypto.randomUUID(),
          action: 'delete_cost_entry',
          userId: user.userId,
          timestamp: getBrazilTime().toISOString(),
          details: { costId, costTypeName: existingCost.costTypeName }
        });
        
        return NextResponse.json({ success: true, message: 'Custo excluído com sucesso!' });
      } catch (error) {
        console.error('Erro ao deletar custo:', error);
        return NextResponse.json({ error: 'Erro ao deletar custo' }, { status: 500 });
      }
    }
    
    // APPROVE COST ENTRY (Master apenas)
    if (endpoint === 'costs-entries/approve') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      try {
        const body = await request.json();
        const { costId } = body;
        
        await db.collection('costs_entries').updateOne(
          { costId },
          { 
            $set: { 
              status: 'APPROVED',
              reviewedBy: user.userId,
              reviewedAt: getBrazilTime().toISOString(),
              updatedAt: getBrazilTime().toISOString()
            }
          }
        );
        
        // Audit log
        await db.collection('audit_logs').insertOne({
          logId: crypto.randomUUID(),
          action: 'approve_cost_entry',
          userId: user.userId,
          timestamp: getBrazilTime().toISOString(),
          details: { costId }
        });
        
        return NextResponse.json({ success: true, message: 'Custo aprovado com sucesso!' });
      } catch (error) {
        console.error('Erro ao aprovar custo:', error);
        return NextResponse.json({ error: 'Erro ao aprovar custo' }, { status: 500 });
      }
    }
    
    // REJECT COST ENTRY (Master apenas)
    if (endpoint === 'costs-entries/reject') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      try {
        const body = await request.json();
        const { costId, reason } = body;
        
        await db.collection('costs_entries').updateOne(
          { costId },
          { 
            $set: { 
              status: 'REJECTED',
              reviewedBy: user.userId,
              reviewedAt: getBrazilTime().toISOString(),
              rejectionReason: reason || 'Sem motivo especificado',
              updatedAt: getBrazilTime().toISOString()
            }
          }
        );
        
        // Audit log
        await db.collection('audit_logs').insertOne({
          logId: crypto.randomUUID(),
          action: 'reject_cost_entry',
          userId: user.userId,
          timestamp: getBrazilTime().toISOString(),
          details: { costId, reason }
        });
        
        return NextResponse.json({ success: true, message: 'Custo reprovado!' });
      } catch (error) {
        console.error('Erro ao reprovar custo:', error);
        return NextResponse.json({ error: 'Erro ao reprovar custo' }, { status: 500 });
      }
    }
    
    // UPDATE COST ENTRY (Master pode editar qualquer campo, incluindo status)
    if (endpoint === 'costs-entries/update-master') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      try {
        const body = await request.json();
        const { costId, costTypeId, costTypeName, dueDate, value, billFile, paymentDate, valuePaid, proofFile, status } = body;
        
        const existingCost = await db.collection('costs_entries').findOne({ costId });
        
        const updateData = {
          costTypeId,
          costTypeName,
          dueDate,
          value: parseFloat(value),
          billFile,
          paymentDate,
          valuePaid: valuePaid ? parseFloat(valuePaid) : 0,
          proofFile,
          status,
          updatedAt: getBrazilTime().toISOString(),
          updatedBy: user.userId
        };
        
        // Calcular diferença
        if (valuePaid) {
          const diff = parseFloat(valuePaid) - parseFloat(value);
          updateData.difference = diff;
        } else {
          updateData.difference = 0;
        }
        
        // Se Master está mudando status para PAID e ainda não tem paidAt, adicionar
        if (status === 'PAID' && (!existingCost.paidAt || !existingCost.paidBy)) {
          updateData.paidAt = getBrazilTime().toISOString();
          updateData.paidBy = user.userId;
        }
        
        await db.collection('costs_entries').updateOne(
          { costId },
          { $set: updateData }
        );
        
        // Audit log
        await db.collection('audit_logs').insertOne({
          logId: crypto.randomUUID(),
          action: 'update_cost_entry_master',
          userId: user.userId,
          timestamp: getBrazilTime().toISOString(),
          details: { costId, changes: updateData }
        });
        
        return NextResponse.json({ success: true, message: 'Custo atualizado com sucesso!' });
      } catch (error) {
        console.error('Erro ao atualizar custo:', error);
        return NextResponse.json({ error: 'Erro ao atualizar custo' }, { status: 500 });
      }
    }
    
    // DELETE COST ENTRY (Master apenas)
    if (endpoint === 'costs-entries/delete') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      try {
        const body = await request.json();
        const { costId } = body;
        
        // Buscar dados do custo antes de deletar
        const cost = await db.collection('costs_entries').findOne({ costId });
        
        if (!cost) {
          return NextResponse.json({ error: 'Custo não encontrado' }, { status: 404 });
        }
        
        // Deletar
        await db.collection('costs_entries').deleteOne({ costId });
        
        // Audit log
        await db.collection('audit_logs').insertOne({
          logId: crypto.randomUUID(),
          action: 'delete_cost_entry',
          userId: user.userId,
          timestamp: getBrazilTime().toISOString(),
          details: { 
            costId,
            costTypeName: cost.costTypeName,
            value: cost.value,
            churchName: cost.churchName
          }
        });
        
        return NextResponse.json({ success: true, message: 'Custo excluído com sucesso!' });
      } catch (error) {
        console.error('Erro ao excluir custo:', error);
        return NextResponse.json({ error: 'Erro ao excluir custo' }, { status: 500 });
      }
    }
    
    // UPLOAD COST FILE (Bill or Proof)
    if (endpoint === 'upload/cost-file') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
      }
      
      try {
        const formData = await request.formData();
        const file = formData.get('file');
        const fileType = formData.get('fileType'); // 'bill' ou 'proof'
        
        if (!file) {
          return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 });
        }
        
        if (!fileType || !['bill', 'proof'].includes(fileType)) {
          return NextResponse.json({ error: 'Tipo de arquivo inválido' }, { status: 400 });
        }
        
        // Validar tipo e tamanho
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
          return NextResponse.json({ 
            error: '❌ Formato não suportado',
            details: 'Use: JPEG, PNG, WEBP ou PDF'
          }, { status: 400 });
        }
        
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
          return NextResponse.json({ 
            error: '❌ Arquivo muito grande',
            details: `Tamanho: ${(file.size / 1024 / 1024).toFixed(2)}MB. Máximo: 5MB`
          }, { status: 400 });
        }
        
        const COST_UPLOAD_DIR = '/app/uploads/costs';
        if (!existsSync(COST_UPLOAD_DIR)) {
          mkdirSync(COST_UPLOAD_DIR, { recursive: true });
        }
        
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        const fileId = crypto.randomUUID();
        const extension = file.name.split('.').pop();
        const filename = `${fileType}_${fileId}.${extension}`;
        const filepath = path.join(COST_UPLOAD_DIR, filename);
        
        writeFileSync(filepath, buffer);
        console.log('[UPLOAD COST] Arquivo salvo:', filepath);
        
        // Retornar caminho relativo para salvar no banco
        const relativePath = `/api/uploads/costs/${filename}`;
        
        await db.collection('audit_logs').insertOne({
          logId: crypto.randomUUID(),
          action: 'upload_cost_file',
          userId: user.userId,
          timestamp: getBrazilTime().toISOString(),
          details: { filename: file.name, fileType, fileId }
        });
        
        return NextResponse.json({ 
          success: true, 
          filePath: relativePath,
          fileName: file.name,
          message: 'Arquivo enviado com sucesso'
        });
      } catch (error) {
        console.error('Erro ao fazer upload de arquivo de custo:', error);
        return NextResponse.json({ error: 'Erro ao fazer upload' }, { status: 500 });
      }
    }
    
    // PUBLIC: GET ALL ROLES (para cadastro público)
    if (endpoint === 'public/roles') {
      try {
        let roles = await db.collection('roles')
          .find({})
          .sort({ name: 1 })
          .toArray();
        
        // Se não houver roles no banco, criar os padrões
        if (roles.length === 0) {
          const defaultRoles = [
            { roleId: crypto.randomUUID(), name: 'Secretário(a)', createdAt: getBrazilTime().toISOString() },
            { roleId: crypto.randomUUID(), name: 'Tesoureiro(a)', createdAt: getBrazilTime().toISOString() },
            { roleId: crypto.randomUUID(), name: 'Pastor(a)', createdAt: getBrazilTime().toISOString() },
            { roleId: crypto.randomUUID(), name: 'Bispo(a)', createdAt: getBrazilTime().toISOString() }
          ];
          
          await db.collection('roles').insertMany(defaultRoles);
          roles = defaultRoles;
        }
        
        return NextResponse.json({ roles });
      } catch (error) {
        return NextResponse.json({ error: 'Erro ao buscar funções' }, { status: 500 });
      }
    }
    
    // REGISTER
    if (endpoint === 'auth/register') {
      const { name, email, password, role, church, region, state, telefone, cep, endereco, numero, complemento, cidade, pais, cargo, churchId } = await request.json();
      
      const existing = await db.collection('users').findOne({ email });
      if (existing) {
        return NextResponse.json({ error: 'Email já cadastrado' }, { status: 400 });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Buscar nome da igreja se tiver churchId
      let churchName = church || '';
      if (churchId) {
        const churchDoc = await db.collection('churches').findOne({ churchId });
        churchName = churchDoc?.name || '';
      }
      
      const user = {
        userId: crypto.randomUUID(),
        name,
        email,
        password: hashedPassword,
        role: role || 'pastor',
        church: churchName,
        churchId: churchId || null,
        region: region || '',
        state: state || '',
        telefone: telefone || '',
        cep: cep || '',
        endereco: endereco || '',
        numero: numero || '',
        complemento: complemento || '',
        cidade: cidade || '',
        pais: pais || 'Brasil',
        cargo: cargo || '',
        photoUrl: null,
        isActive: true, // NOVO: Usuário ativo por padrão
        isOnline: false,
        lastActivity: null,
        permissions: {
          canView: true,
          canEdit: role === 'master',
          canPrint: false,
          canExport: false,
          canShare: false
        },
        scope: role === 'master' ? 'global' : (state ? 'state' : (region ? 'region' : 'church')),
        createdAt: getBrazilTime().toISOString()
      };
      
      await db.collection('users').insertOne(user);
      
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: 'register',
        userId: user.userId,
        userName: user.name,
        timestamp: getBrazilTime().toISOString(),
        details: { email, role }
      });
      
      const token = jwt.sign({ userId: user.userId, email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      
      return NextResponse.json({ 
        token, 
        user: { 
          userId: user.userId,
          name: user.name, 
          email: user.email, 
          role: user.role,
          permissions: user.permissions,
          scope: user.scope,
          church: user.church,
          region: user.region,
          state: user.state
        } 
      });
    }
    
    // LOGIN
    if (endpoint === 'auth/login') {
      const { email, password } = await request.json();
      
      const user = await db.collection('users').findOne({ email });
      if (!user) {
        return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
      }
      
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
      }
      
      // Verificar se o usuário está ativo (se o campo existir)
      if (user.hasOwnProperty('isActive') && user.isActive === false) {
        return NextResponse.json({ 
          error: 'Sua conta está desativada. Entre em contato com o administrador do sistema.' 
        }, { status: 403 });
      }
      
      // Marcar como online
      await db.collection('users').updateOne(
        { userId: user.userId },
        { $set: { isOnline: true, lastActivity: getBrazilTime().toISOString() } }
      );
      
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: 'login',
        userId: user.userId,
        userName: user.name,
        timestamp: getBrazilTime().toISOString(),
        details: { email }
      });
      
      const token = jwt.sign({ userId: user.userId, email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      
      return NextResponse.json({ 
        token, 
        user: { 
          userId: user.userId,
          name: user.name, 
          email: user.email, 
          role: user.role,
          permissions: user.permissions,
          scope: user.scope,
          church: user.church,
          region: user.region,
          state: user.state
        } 
      });
    }
    
    // LOGOUT
    if (endpoint === 'auth/logout') {
      const user = verifyToken(request);
      if (user) {
        // Marcar como offline
        await db.collection('users').updateOne(
          { userId: user.userId },
          { $set: { isOnline: false, lastActivity: getBrazilTime().toISOString() } }
        );
        
        await db.collection('audit_logs').insertOne({
          logId: crypto.randomUUID(),
          action: 'logout',
          userId: user.userId,
          timestamp: getBrazilTime().toISOString(),
          details: {}
        });
      }
      
      return NextResponse.json({ success: true, message: 'Logout realizado com sucesso!' });
    }
    
    // HEARTBEAT - Manter usuário online
    if (endpoint === 'auth/heartbeat') {
      const user = verifyToken(request);
      if (user) {
        await db.collection('users').updateOne(
          { userId: user.userId },
          { $set: { isOnline: true, lastActivity: getBrazilTime().toISOString() } }
        );
      }
      
      return NextResponse.json({ success: true });
    }
    
    // UPLOAD RECEIPT - PATCH 3: Validação robusta
    if (endpoint === 'upload/receipt') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
      }
      
      const formData = await request.formData();
      const file = formData.get('file');
      const entryId = formData.get('entryId');
      
      console.log('[UPLOAD] EntryID recebido:', entryId);
      
      if (!file) {
        return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 });
      }
      
      if (!entryId) {
        return NextResponse.json({ error: 'EntryID não fornecido' }, { status: 400 });
      }
      
      // Verificar se entry existe
      const existingEntry = await db.collection('entries').findOne({ entryId });
      if (!existingEntry) {
        console.log('[UPLOAD] Entry não encontrado:', entryId);
        return NextResponse.json({ 
          error: '❌ Lançamento não encontrado',
          details: `EntryID: ${entryId}`
        }, { status: 404 });
      }
      
      console.log('[UPLOAD] Entry encontrado:', existingEntry.entryId);
      
      // PATCH 3: Validar tipo e tamanho
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ 
          error: '❌ Formato não suportado',
          details: 'Use: JPEG, PNG, WEBP ou PDF'
        }, { status: 400 });
      }
      
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        return NextResponse.json({ 
          error: '❌ Arquivo muito grande',
          details: `Tamanho: ${(file.size / 1024 / 1024).toFixed(2)}MB. Máximo: 5MB`
        }, { status: 400 });
      }
      
      if (!existsSync(UPLOAD_DIR)) {
        await mkdir(UPLOAD_DIR, { recursive: true });
      }
      
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const fileId = crypto.randomUUID();
      const extension = file.name.split('.').pop();
      const filename = `${fileId}.${extension}`;
      const filepath = path.join(UPLOAD_DIR, filename);
      
      await writeFile(filepath, buffer);
      console.log('[UPLOAD] Arquivo salvo:', filepath);
      
      const receipt = {
        receiptId: fileId,
        filename: file.name,
        filepath: filename,
        fileType: file.type,
        fileSize: file.size,
        uploadedBy: user.userId,
        uploadedAt: getBrazilTime().toISOString()
      };
      
      // Atualizar entry com receipt
      const updateResult = await db.collection('entries').updateOne(
        { entryId },
        { $push: { receipts: receipt } }
      );
      
      console.log('[UPLOAD] Update result:', updateResult.modifiedCount, 'docs modificados');
      
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: 'upload_receipt',
        userId: user.userId,
        timestamp: getBrazilTime().toISOString(),
        details: { entryId, filename: file.name, receiptId: fileId }
      });
      
      return NextResponse.json({ 
        success: true, 
        receipt,
        message: 'Comprovante enviado e salvo com sucesso'
      });
    }
    
    // SAVE ENTRY
    if (endpoint === 'entries/save') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
      }
      
      const userData = await db.collection('users').findOne({ userId: user.userId });
      const { month, year, day, timeSlot, value, notes, dinheiro, pix, maquineta } = await request.json();
      
      // Calcular valor total a partir dos 3 campos (se fornecidos) ou usar o campo value (compatibilidade)
      const valorDinheiro = parseFloat(dinheiro) || 0;
      const valorPix = parseFloat(pix) || 0;
      const valorMaquineta = parseFloat(maquineta) || 0;
      const valorTotal = value !== undefined ? parseFloat(value) : (valorDinheiro + valorPix + valorMaquineta);
      
      const entryId = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}-${timeSlot}`;
      const existing = await db.collection('entries').findOne({ entryId });
      const isEdit = existing && existing.value !== null;
      
      // VALIDAÇÃO COMPLETA COM NOVA FUNÇÃO
      const validation = await validateEntryTiming(db, {
        userId: user.userId,
        churchId: userData.church,
        month,
        year,
        day,
        timeSlot,
        isEdit,
        createdAt: existing?.createdAt,
        entryId
      });
      
      if (!validation.allowed) {
        return NextResponse.json({ 
          error: validation.message,
          locked: true,
          reason: validation.reason,
          windowEnd: validation.windowEnd
        }, { status: 403 });
      }
      
      const currentTime = getBrazilTime();
      const entry = {
        entryId,
        month,
        year,
        day,
        timeSlot,
        value: valorTotal,
        dinheiro: valorDinheiro,
        pix: valorPix,
        maquineta: valorMaquineta,
        notes: notes || '',
        userId: user.userId,
        userName: userData.name,
        church: userData.church,
        churchId: userData.churchId || null,
        region: userData.region,
        state: userData.state,
        createdAt: existing?.createdAt || currentTime.toISOString(),
        updatedAt: currentTime.toISOString(),
        timeWindowLocked: false,
        masterUnlocked: existing?.masterUnlocked || false,
        receipts: existing?.receipts || []
      };
      
      // Transação: valida e grava
      await db.collection('entries').updateOne(
        { entryId },
        { $set: entry },
        { upsert: true }
      );
      
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: isEdit ? 'ENTRY_UPDATED' : 'ENTRY_CREATED',
        userId: user.userId,
        timestamp: currentTime.toISOString(),
        details: { 
          entryId, 
          value, 
          timeSlot,
          validationReason: validation.reason
        }
      });
      
      return NextResponse.json({ 
        success: true, 
        entry,
        message: validation.message
      });
    }
    
    // DELETE RECEIPT FROM ENTRY (Pastor/Bispo - dono da oferta)
    if (endpoint === 'entries/delete-receipt') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }
      
      try {
        const body = await request.json();
        const { entryId, receiptFilepath } = body;
        
        // Buscar entry
        const entry = await db.collection('entries').findOne({ entryId });
        
        if (!entry) {
          return NextResponse.json({ error: 'Oferta não encontrada' }, { status: 404 });
        }
        
        // Verificar se é o dono da oferta (ou Master)
        const userData = await db.collection('users').findOne({ userId: user.userId });
        if (userData.role !== 'master' && entry.userId !== user.userId) {
          return NextResponse.json({ error: 'Você não tem permissão para excluir este comprovante' }, { status: 403 });
        }
        
        // Verificar se período está fechado
        const currentTime = getBrazilTime();
        const monthStatus = await db.collection('month_status').findOne({ 
          month: entry.month, 
          year: entry.year 
        });
        
        if (monthStatus?.closed && userData.role !== 'master') {
          return NextResponse.json({ error: 'Período fechado. Não é possível excluir comprovantes.' }, { status: 403 });
        }
        
        // Verificar bloqueio de janela de tempo
        const entryDate = dayjs.tz(`${entry.year}-${String(entry.month).padStart(2, '0')}-${String(entry.day).padStart(2, '0')}`, 'America/Sao_Paulo');
        const [hour, minute] = entry.timeSlot.split(':');
        const entryDateTime = entryDate.hour(parseInt(hour)).minute(parseInt(minute));
        const lockTime = entryDateTime.add(2, 'hour');
        
        // Verificar se há um time_override ativo (liberação do Master)
        const activeOverride = await db.collection('time_overrides').findOne({
          userId: user.userId,
          month: entry.month,
          year: entry.year,
          day: entry.day,
          timeSlot: entry.timeSlot,
          expiresAt: { $gt: currentTime.toISOString() }
        });
        
        // Se NÃO há override ativo E o tempo passou E não é Master → BLOQUEAR
        if (currentTime.isAfter(lockTime) && !activeOverride && !entry.masterUnlocked && userData.role !== 'master') {
          return NextResponse.json({ error: 'Período de edição encerrado (2 horas após o horário)' }, { status: 403 });
        }
        
        // Remover comprovante da lista
        const updatedReceipts = (entry.receipts || []).filter(r => r.filepath !== receiptFilepath);
        
        await db.collection('entries').updateOne(
          { entryId },
          { 
            $set: { 
              receipts: updatedReceipts,
              updatedAt: currentTime.toISOString()
            }
          }
        );
        
        // Tentar deletar arquivo físico (se existir)
        try {
          const fs = require('fs');
          const path = require('path');
          const filePath = path.join(process.cwd(), 'uploads', 'receipts', receiptFilepath);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (fileError) {
          console.log('Arquivo não encontrado ou já deletado:', fileError.message);
        }
        
        // Audit log
        await db.collection('audit_logs').insertOne({
          logId: crypto.randomUUID(),
          action: 'delete_receipt',
          userId: user.userId,
          timestamp: currentTime.toISOString(),
          details: {
            entryId,
            receiptFilepath,
            remainingReceipts: updatedReceipts.length
          }
        });
        
        return NextResponse.json({ 
          success: true, 
          message: 'Comprovante excluído com sucesso!',
          remainingReceipts: updatedReceipts 
        });
      } catch (error) {
        console.error('Erro ao deletar comprovante:', error);
        return NextResponse.json({ error: 'Erro ao deletar comprovante' }, { status: 500 });
      }
    }
    
    // DELETE SPECIFIC ENTRY (Master apenas)
    if (endpoint === 'entries/delete-specific') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      try {
        const body = await request.json();
        const { entryId, userId } = body;
        
        // Buscar e deletar oferta específica
        const entry = await db.collection('entries').findOne({ entryId, userId });
        
        if (!entry) {
          return NextResponse.json({ error: 'Oferta não encontrada' }, { status: 404 });
        }
        
        await db.collection('entries').deleteOne({ entryId, userId });
        
        // Audit log
        await db.collection('audit_logs').insertOne({
          logId: crypto.randomUUID(),
          action: 'delete_entry_by_master',
          userId: user.userId,
          timestamp: getBrazilTime().toISOString(),
          details: {
            entryId,
            deletedUserId: userId,
            church: entry.church,
            value: entry.value
          }
        });
        
        return NextResponse.json({ success: true, message: 'Oferta excluída com sucesso!' });
      } catch (error) {
        console.error('Erro ao deletar oferta:', error);
        return NextResponse.json({ error: 'Erro ao deletar oferta' }, { status: 500 });
      }
    }
    
    // SAVE DAY OBSERVATION
    if (endpoint === 'observations/day') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
      }
      
      const { month, year, day, observation } = await request.json();
      
      const obsId = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      await db.collection('day_observations').updateOne(
        { obsId },
        { 
          $set: { 
            obsId,
            month,
            year,
            day,
            observation,
            updatedBy: user.userId,
            updatedAt: getBrazilTime().toISOString()
          } 
        },
        { upsert: true }
      );
      
      return NextResponse.json({ success: true });
    }
    
    // SAVE MONTH OBSERVATION (APENAS MASTER)
    if (endpoint === 'observations/month') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
      }
      
      // APENAS MASTER PODE CRIAR/EDITAR
      if (user.role !== 'master') {
        return NextResponse.json({ 
          error: 'Apenas o Líder Máximo pode criar/editar observações do mês' 
        }, { status: 403 });
      }
      
      const { month, year, observation, active } = await request.json();
      
      const obsId = `${year}-${String(month).padStart(2, '0')}`;
      
      console.log('[OBSERVATION] Salvando:', { obsId, active, length: observation?.length });
      
      await db.collection('month_observations').updateOne(
        { obsId },
        { 
          $set: { 
            obsId,
            month,
            year,
            observation: observation || '',
            active: active === true, // Force boolean
            updatedBy: user.userId,
            updatedAt: getBrazilTime().toISOString()
          } 
        },
        { upsert: true }
      );
      
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: 'update_month_observation',
        userId: user.userId,
        timestamp: getBrazilTime().toISOString(),
        details: { obsId, active, textLength: observation?.length || 0 }
      });
      
      return NextResponse.json({ 
        success: true,
        message: active ? 'Mensagem salva e ativada' : 'Mensagem salva (inativa)'
      });
    }
    
    // GET MONTH DATA (with observations)
    if (endpoint === 'entries/month') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
      }
      
      const userData = await db.collection('users').findOne({ userId: user.userId });
      const body = await request.json();
      const { month, year, churchFilter } = body;
      
      // Build filter based on user scope
      let filter = { 
        month: parseInt(month), 
        year: parseInt(year) 
      };
      
      // MASTER vê tudo (ou filtra por igreja se especificado)
      if (userData.role === 'master' || userData.scope === 'global') {
        // Se há filtro de igreja específica, aplicar
        if (churchFilter && churchFilter !== 'all') {
          filter.churchId = churchFilter;
        }
        // Sem filtros adicionais - vê tudo
      } 
      // LEADER vê por hierarquia (state/region/church)
      else if (userData.scope === 'state') {
        filter.state = userData.state;
      } else if (userData.scope === 'region') {
        filter.region = userData.region;
        filter.state = userData.state;
      } else if (userData.scope === 'church') {
        filter.church = userData.church;
      }
      // USUÁRIO COMUM vê apenas seus próprios lançamentos
      else {
        filter.userId = userData.userId;
      }
      
      console.log('[ENTRIES/MONTH] User:', userData.userId, 'Role:', userData.role, 'Filter:', JSON.stringify(filter));
      
      let entries = await db.collection('entries').find(filter).toArray();
      
      // Se for MASTER, agregar dados por horário (dia + timeSlot)
      if (userData.role === 'master') {
        const aggregatedEntries = {};
        
        entries.forEach(entry => {
          // Chave de agregação: dia + timeSlot (agrupa todas as igrejas do mesmo horário)
          const key = `${entry.day}-${entry.timeSlot}`;
          
          if (!aggregatedEntries[key]) {
            aggregatedEntries[key] = {
              entryId: entry.entryId, // Mantém o primeiro entryId encontrado
              month: entry.month,
              year: entry.year,
              day: entry.day,
              timeSlot: entry.timeSlot,
              totalValue: 0,
              totalDinheiro: 0,
              totalPix: 0,
              totalMaquineta: 0,
              value: 0, // Campo usado pelo frontend
              dinheiro: 0,
              pix: 0,
              maquineta: 0,
              churchCount: 0,
              churches: [],
              timeWindowLocked: entry.timeWindowLocked,
              masterUnlocked: entry.masterUnlocked,
              createdAt: entry.createdAt,
              updatedAt: entry.updatedAt
            };
          }
          
          // Agregar valores de todas as igrejas
          const entryValue = entry.value || 0;
          const entryDinheiro = entry.dinheiro || 0;
          const entryPix = entry.pix || 0;
          const entryMaquineta = entry.maquineta || 0;
          
          aggregatedEntries[key].totalValue += entryValue;
          aggregatedEntries[key].totalDinheiro += entryDinheiro;
          aggregatedEntries[key].totalPix += entryPix;
          aggregatedEntries[key].totalMaquineta += entryMaquineta;
          
          // Atualizar campo 'value' também (usado pelo frontend)
          aggregatedEntries[key].value = aggregatedEntries[key].totalValue;
          aggregatedEntries[key].dinheiro = aggregatedEntries[key].totalDinheiro;
          aggregatedEntries[key].pix = aggregatedEntries[key].totalPix;
          aggregatedEntries[key].maquineta = aggregatedEntries[key].totalMaquineta;
          
          aggregatedEntries[key].churchCount++;
          
          // Adicionar detalhes da igreja
          aggregatedEntries[key].churches.push({
            churchId: entry.churchId,
            churchName: entry.church,
            value: entryValue,
            dinheiro: entryDinheiro,
            pix: entryPix,
            maquineta: entryMaquineta,
            notes: entry.notes || '',
            userName: entry.userName,
            userId: entry.userId,
            receipts: entry.receipts || [],
            hasReceipts: (entry.receipts || []).length > 0
          });
        });
        
        // Converter para array
        entries = Object.values(aggregatedEntries);
      }
      
      // Get month status
      const monthStatus = await db.collection('month_status').findOne({ month: parseInt(month), year: parseInt(year) });
      
      // Get day observations
      const dayObservations = await db.collection('day_observations')
        .find({ month: parseInt(month), year: parseInt(year) })
        .toArray();
      
      // Get month observation
      const monthObservation = await db.collection('month_observations')
        .findOne({ month: parseInt(month), year: parseInt(year) });
      
      const currentTime = getBrazilTime(); // dayjs object
      const currentHour = currentTime.hour();
      const currentMinute = currentTime.minute();
      const currentDay = currentTime.date();
      const currentMonth = currentTime.month() + 1;
      const currentYear = currentTime.year();
      
      for (const entry of entries) {
        if (!entry.timeWindowLocked && !entry.masterUnlocked && !monthStatus?.closed) {
          const entryDate = new Date(entry.year, entry.month - 1, entry.day);
          const todayDate = new Date(currentYear, currentMonth - 1, currentDay);
          
          let shouldLock = false;
          
          if (isBefore(entryDate, todayDate)) {
            shouldLock = true;
          }
          else if (entry.day === currentDay && entry.month === currentMonth && entry.year === currentYear) {
            const windowEnd = getTimeWindowEnd(entry.timeSlot);
            if (windowEnd) {
              const [endHour, endMinute] = windowEnd.split(':').map(Number);
              const currentTimeMinutes = currentHour * 60 + currentMinute;
              const endTimeMinutes = endHour * 60 + endMinute;
              
              if (currentTimeMinutes > endTimeMinutes) {
                shouldLock = true;
              }
            }
          }
          
          if (shouldLock) {
            await db.collection('entries').updateOne(
              { entryId: entry.entryId },
              { $set: { timeWindowLocked: true } }
            );
            entry.timeWindowLocked = true;
          }
        }
      }
      
      return NextResponse.json({ 
        entries, 
        monthClosed: monthStatus?.closed || false,
        dayObservations,
        monthObservation: monthObservation ? {
          observation: monthObservation.observation || '',
          active: monthObservation.active || false
        } : { observation: '', active: false }
      });
    }
    
    // CLOSE MONTH
    if (endpoint === 'month/close') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      const { month, year } = await request.json();
      
      await db.collection('month_status').updateOne(
        { month, year },
        { 
          $set: { 
            month,
            year,
            closed: true,
            closedBy: user.userId,
            closedAt: getBrazilTime().toISOString()
          } 
        },
        { upsert: true }
      );
      
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: 'close_month',
        userId: user.userId,
        timestamp: getBrazilTime().toISOString(),
        details: { month, year }
      });
      
      return NextResponse.json({ success: true });
    }
    
    // REOPEN MONTH
    if (endpoint === 'month/reopen') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      const { month, year } = await request.json();
      
      await db.collection('month_status').updateOne(
        { month, year },
        { 
          $set: { 
            closed: false,
            reopenedBy: user.userId,
            reopenedAt: getBrazilTime().toISOString()
          } 
        }
      );
      
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: 'reopen_month',
        userId: user.userId,
        timestamp: getBrazilTime().toISOString(),
        details: { month, year }
      });
      
      return NextResponse.json({ success: true });
    }
    
    // COMPARE MONTHS
    if (endpoint === 'compare/months') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
      }
      
      const userData = await db.collection('users').findOne({ userId: user.userId });
      const { month1, year1, month2, year2 } = await request.json();
      
      // Build filter baseado nas permissões
      let filter = {};
      
      if (userData.role === 'master' || userData.scope === 'global') {
        // Master vê tudo
      } else if (userData.scope === 'state') {
        filter.state = userData.state;
      } else if (userData.scope === 'region') {
        filter.region = userData.region;
        filter.state = userData.state;
      } else if (userData.scope === 'church') {
        filter.church = userData.church;
      } else {
        filter.userId = userData.userId;
      }
      
      console.log('[COMPARE] User:', userData.userId, 'Filter:', JSON.stringify(filter));
      
      const entries1 = await db.collection('entries')
        .find({ ...filter, month: parseInt(month1), year: parseInt(year1) })
        .toArray();
      
      const entries2 = await db.collection('entries')
        .find({ ...filter, month: parseInt(month2), year: parseInt(year2) })
        .toArray();
      
      const total1 = entries1.reduce((sum, e) => sum + (e.value || 0), 0);
      const total2 = entries2.reduce((sum, e) => sum + (e.value || 0), 0);
      
      const difference = total2 - total1;
      const percentChange = total1 > 0 ? ((difference / total1) * 100) : 0;
      
      return NextResponse.json({
        period1: { month: month1, year: year1, total: total1, entries: entries1.length },
        period2: { month: month2, year: year2, total: total2, entries: entries2.length },
        difference,
        percentChange,
        analysis: percentChange > 0 ? 'crescimento' : percentChange < 0 ? 'queda' : 'estável'
      });
    }
    
    // GET DASHBOARD DATA
    if (endpoint === 'dashboard/data') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
      }
      
      const { month, year } = await request.json();
      
      // Buscar dados do usuário para verificar permissões
      const userData = await db.collection('users').findOne({ userId: user.userId });
      
      // Build filter baseado nas permissões (igual stats/overview)
      let filter = {
        month: parseInt(month), 
        year: parseInt(year)
      };
      
      if (userData.role === 'master' || userData.scope === 'global') {
        // Master vê tudo - sem filtros adicionais
      } else if (userData.scope === 'state') {
        filter.state = userData.state;
      } else if (userData.scope === 'region') {
        filter.region = userData.region;
        filter.state = userData.state;
      } else if (userData.scope === 'church') {
        filter.church = userData.church;
      } else {
        // Usuário comum - apenas seus dados
        filter.userId = userData.userId;
      }
      
      console.log('[DASHBOARD] User:', userData.userId, 'Role:', userData.role, 'Filter:', JSON.stringify(filter));
      
      const entries = await db.collection('entries')
        .find(filter)
        .toArray();
      
      // Group by day
      const byDay = {};
      const byTimeSlot = {};
      
      entries.forEach(entry => {
        if (!byDay[entry.day]) byDay[entry.day] = 0;
        byDay[entry.day] += entry.value || 0;
        
        if (!byTimeSlot[entry.timeSlot]) byTimeSlot[entry.timeSlot] = 0;
        byTimeSlot[entry.timeSlot] += entry.value || 0;
      });
      
      const dailyData = Object.keys(byDay).map(day => ({
        day: parseInt(day),
        total: byDay[day]
      })).sort((a, b) => a.day - b.day);
      
      const timeSlotData = Object.keys(byTimeSlot).map(slot => ({
        timeSlot: slot,
        total: byTimeSlot[slot]
      }));
      
      const total = entries.reduce((sum, e) => sum + (e.value || 0), 0);
      const average = entries.length > 0 ? total / entries.length : 0;
      
      return NextResponse.json({
        dailyData,
        timeSlotData,
        total,
        average,
        entryCount: entries.length
      });
    }
    
    // REQUEST UNLOCK
    if (endpoint === 'unlock/request') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
      }
      
      const userData = await db.collection('users').findOne({ userId: user.userId });
      const { entryId, reason, day, month, year, timeSlot } = await request.json();
      
      // Pode ser solicitação para slot vazio OU para entry existente
      let entryData = null;
      if (entryId) {
        entryData = await db.collection('entries').findOne({ entryId });
      }
      
      // Se não tem entryId mas tem day/month/year/timeSlot, é solicitação para slot vazio
      const requestMonth = entryData?.month || parseInt(month);
      const requestYear = entryData?.year || parseInt(year);
      const requestDay = entryData?.day || parseInt(day);
      const requestTimeSlot = entryData?.timeSlot || timeSlot;
      
      // Verificar se mês está fechado
      const monthStatus = await db.collection('month_status').findOne({ 
        month: requestMonth, 
        year: requestYear 
      });
      if (monthStatus?.closed) {
        return NextResponse.json({ 
          error: 'Mês fechado. Não é possível solicitar liberação. Contate o Líder Máximo.',
          locked: true
        }, { status: 403 });
      }
      
      const request_record = {
        requestId: crypto.randomUUID(),
        entryId: entryId || null,
        day: requestDay,
        month: requestMonth,
        year: requestYear,
        timeSlot: requestTimeSlot,
        requesterId: user.userId,
        requesterName: user.name || user.email,
        requesterEmail: user.email,
        requesterRole: userData.role || 'Usuário',
        requesterChurch: userData.church || '',
        requesterRegion: userData.region || '',
        requesterState: userData.state || '',
        reason: reason || 'Solicitação de liberação para lançamento',
        status: 'pending',
        createdAt: getBrazilTime().toISOString()
      };
      
      await db.collection('unlock_requests').insertOne(request_record);
      
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: 'request_unlock',
        userId: user.userId,
        timestamp: getBrazilTime().toISOString(),
        details: { 
          entryId: entryId || 'empty_slot', 
          day: requestDay,
          month: requestMonth,
          year: requestYear,
          timeSlot: requestTimeSlot,
          reason 
        }
      });
      
      return NextResponse.json({ success: true, message: 'Solicitação enviada ao Líder Máximo' });
    }
    
    // GET UNLOCK REQUESTS (Master vê todas: pendentes + histórico)
    if (endpoint === 'unlock/requests') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      // Buscar todas as solicitações (pendentes, aprovadas e rejeitadas)
      const requests = await db.collection('unlock_requests')
        .find({})
        .sort({ createdAt: -1 })
        .toArray();
      
      return NextResponse.json({ requests });
    }
    
    // GET MY UNLOCK STATUS (usuário vê suas próprias solicitações e overrides ativos)
    if (endpoint === 'unlock/my-status') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
      }
      
      // Buscar time_overrides ativos do usuário (não precisa de month/year no filtro)
      const activeOverrides = await db.collection('time_overrides')
        .find({
          userId: user.userId,
          expiresAt: { $gt: getBrazilTime().toISOString() }
        })
        .toArray();
      
      // Buscar solicitações pendentes do usuário
      const pendingRequests = await db.collection('unlock_requests')
        .find({ 
          requesterId: user.userId,
          status: 'pending'
        })
        .toArray();
      
      return NextResponse.json({ 
        pendingRequests,
        activeOverrides
      });
    }
    
    // APPROVE UNLOCK
    if (endpoint === 'unlock/approve') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      const { requestId, entryId, durationMinutes } = await request.json();
      
      // Buscar a solicitação para obter informações
      const unlockRequest = await db.collection('unlock_requests').findOne({ requestId });
      if (!unlockRequest) {
        return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 });
      }
      
      // Verificar se mês está fechado
      const monthStatus = await db.collection('month_status').findOne({ 
        month: unlockRequest.month, 
        year: unlockRequest.year 
      });
      
      // Se tem entryId, atualizar o entry existente
      if (entryId && entryId !== 'null') {
        await db.collection('entries').updateOne(
          { entryId },
          { 
            $set: { 
              masterUnlocked: true,
              unlockedUntil: addHours(getBrazilTime(), Math.ceil(durationMinutes / 60)).toISOString()
            } 
          }
        );
      } else {
        // Se não tem entryId, criar um time override para permitir lançamento no slot vazio
        const unlockExpiry = addHours(getBrazilTime(), Math.ceil(durationMinutes / 60)).toISOString();
        
        await db.collection('time_overrides').insertOne({
          overrideId: crypto.randomUUID(),
          day: unlockRequest.day,
          month: unlockRequest.month,
          year: unlockRequest.year,
          timeSlot: unlockRequest.timeSlot,
          userId: unlockRequest.requesterId,
          approvedBy: user.userId,
          expiresAt: unlockExpiry,
          createdAt: getBrazilTime().toISOString()
        });
      }
      
      // Atualizar a solicitação como aprovada
      await db.collection('unlock_requests').updateOne(
        { requestId },
        { 
          $set: { 
            status: 'approved',
            approvedBy: user.userId,
            approvedAt: getBrazilTime().toISOString()
          } 
        }
      );
      
      // Registrar no audit log
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: 'approve_unlock',
        userId: user.userId,
        timestamp: getBrazilTime().toISOString(),
        details: { 
          requestId, 
          entryId: entryId || 'empty_slot',
          day: unlockRequest.day,
          month: unlockRequest.month,
          year: unlockRequest.year,
          timeSlot: unlockRequest.timeSlot,
          requesterId: unlockRequest.requesterId,
          durationMinutes,
          monthClosed: monthStatus?.closed || false
        }
      });
      
      return NextResponse.json({ 
        success: true,
        message: entryId ? 'Liberação concedida para edição' : 'Liberação concedida para novo lançamento',
        warning: monthStatus?.closed ? 'Atenção: Mês está fechado. Liberação concedida pelo Master.' : null
      });
    }
    
    // REJECT UNLOCK
    if (endpoint === 'unlock/reject') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      const { requestId, reason } = await request.json();
      
      // Buscar a solicitação
      const unlockRequest = await db.collection('unlock_requests').findOne({ requestId });
      if (!unlockRequest) {
        return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 });
      }
      
      // Atualizar a solicitação como rejeitada
      await db.collection('unlock_requests').updateOne(
        { requestId },
        { 
          $set: { 
            status: 'rejected',
            rejectedBy: user.userId,
            rejectedAt: getBrazilTime().toISOString(),
            rejectionReason: reason || 'Rejeitado pelo Líder Máximo'
          } 
        }
      );
      
      // Registrar no audit log
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: 'reject_unlock',
        userId: user.userId,
        timestamp: getBrazilTime().toISOString(),
        details: { 
          requestId, 
          day: unlockRequest.day,
          month: unlockRequest.month,
          year: unlockRequest.year,
          timeSlot: unlockRequest.timeSlot,
          requesterId: unlockRequest.requesterId,
          reason
        }
      });
      
      return NextResponse.json({ 
        success: true,
        message: 'Solicitação rejeitada'
      });
    }
    
    // DELETE UNLOCK REQUEST (Master pode deletar histórico)
    if (endpoint === 'unlock/delete') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      const { requestId } = await request.json();
      
      // Buscar a solicitação antes de deletar
      const unlockRequest = await db.collection('unlock_requests').findOne({ requestId });
      if (!unlockRequest) {
        return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 });
      }
      
      // Deletar a solicitação
      await db.collection('unlock_requests').deleteOne({ requestId });
      
      // Registrar no audit log
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: 'delete_unlock_request',
        userId: user.userId,
        timestamp: getBrazilTime().toISOString(),
        details: { 
          requestId,
          requesterName: unlockRequest.requesterName,
          day: unlockRequest.day,
          month: unlockRequest.month,
          year: unlockRequest.year,
          timeSlot: unlockRequest.timeSlot,
          status: unlockRequest.status
        }
      });
      
      return NextResponse.json({ 
        success: true,
        message: 'Solicitação deletada do histórico'
      });
    }
    
    // POST AUDIT LOG (para qualquer usuário registrar ação)
    if (endpoint === 'audit/log') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
      }
      
      const { action, details } = await request.json();
      
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action,
        userId: user.userId,
        userEmail: user.email,
        timestamp: getBrazilTime().toISOString(),
        details: details || {}
      });
      
      return NextResponse.json({ success: true });
    }
    
    // GET AUDIT LOGS
    if (endpoint === 'audit/logs') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      const body = await request.json();
      const limit = body.limit || 100;
      
      const logs = await db.collection('audit_logs')
        .find({})
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
      
      return NextResponse.json({ logs });
    }
    
    // GET ALL USERS WITH ENHANCED DETAILS
    if (endpoint === 'users/list') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      // Buscar todos os usuários
      const users = await db.collection('users')
        .find({}, { projection: { password: 0 } })
        .toArray();
      
      // Buscar igreja de cada usuário (se tiver)
      const usersWithChurch = await Promise.all(users.map(async (u) => {
        if (u.churchId) {
          const church = await db.collection('churches').findOne(
            { churchId: u.churchId },
            { projection: { name: 1 } }
          );
          return { ...u, churchName: church?.name || 'Sem igreja' };
        }
        return { ...u, churchName: u.church || 'Sem igreja' };
      }));
      
      // Agrupar por igreja → cargo → alfabético
      const grouped = usersWithChurch.reduce((acc, u) => {
        const churchKey = u.churchName || 'Sem igreja';
        const cargoKey = u.cargo || 'Sem cargo';
        
        if (!acc[churchKey]) acc[churchKey] = {};
        if (!acc[churchKey][cargoKey]) acc[churchKey][cargoKey] = [];
        
        acc[churchKey][cargoKey].push(u);
        return acc;
      }, {});
      
      // Ordenar alfabeticamente dentro de cada grupo
      Object.keys(grouped).forEach(church => {
        Object.keys(grouped[church]).forEach(cargo => {
          grouped[church][cargo].sort((a, b) => a.name.localeCompare(b.name));
        });
      });
      
      return NextResponse.json({ users: usersWithChurch, grouped });
    }
    
    // CREATE USER (Master only)
    if (endpoint === 'users/create') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      const { name, email, password, telefone, cep, endereco, numero, complemento, cidade, estado, pais, churchId, cargo } = await request.json();
      
      // Validar email
      const existing = await db.collection('users').findOne({ email });
      if (existing) {
        return NextResponse.json({ error: 'Email já cadastrado' }, { status: 400 });
      }
      
      // Hash da senha
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Buscar nome da igreja
      let churchName = 'Sem igreja';
      if (churchId) {
        const church = await db.collection('churches').findOne({ churchId });
        churchName = church?.name || 'Sem igreja';
      }
      
      const newUser = {
        userId: crypto.randomUUID(),
        name,
        email,
        password: hashedPassword,
        telefone: telefone || '',
        cep: cep || '',
        endereco: endereco || '',
        numero: numero || '',
        complemento: complemento || '',
        cidade: cidade || '',
        estado: estado || '',
        pais: pais || 'Brasil',
        churchId: churchId || null,
        church: churchName,
        cargo: cargo || '',
        role: 'pastor', // default
        photoUrl: null,
        isActive: true, // NOVO: Usuário ativo por padrão
        isOnline: false,
        lastActivity: null,
        permissions: {
          canView: true,
          canEdit: false,
          canPrint: false,
          canExport: false,
          canShare: false
        },
        scope: 'church',
        createdAt: getBrazilTime().toISOString(),
        updatedAt: getBrazilTime().toISOString()
      };
      
      await db.collection('users').insertOne(newUser);
      
      // Audit log
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: 'create_user',
        userId: user.userId,
        userName: user.name,
        timestamp: getBrazilTime().toISOString(),
        details: { newUserId: newUser.userId, email: newUser.email, cargo }
      });
      
      return NextResponse.json({ 
        success: true, 
        message: 'Usuário criado com sucesso!',
        user: { ...newUser, password: undefined }
      });
    }
    
    // UPDATE USER PERMISSIONS
    if (endpoint === 'users/permissions') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      const { userId, permissions } = await request.json();
      
      await db.collection('users').updateOne(
        { userId },
        { $set: { permissions } }
      );
      
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: 'update_permissions',
        userId: user.userId,
        timestamp: getBrazilTime().toISOString(),
        details: { targetUserId: userId, permissions }
      });
      
      return NextResponse.json({ success: true });
    }
    
    // TOGGLE USER ACTIVE STATUS - PATCH 2
    if (endpoint === 'users/status') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      const { userId, active } = await request.json();
      
      await db.collection('users').updateOne(
        { userId },
        { $set: { active: active === true } }
      );
      
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: active ? 'activate_user' : 'deactivate_user',
        userId: user.userId,
        timestamp: getBrazilTime().toISOString(),
        details: { targetUserId: userId }
      });
      
      return NextResponse.json({ 
        success: true, 
        message: active ? 'Usuário desbloqueado!' : 'Usuário bloqueado!' 
      });
    }
    
    // TOGGLE USER ACTIVE STATUS
    if (endpoint === 'users/toggle-active') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      const { userId } = await request.json();
      
      // Não permitir desativar a si mesmo
      if (userId === user.userId) {
        return NextResponse.json({ error: 'Você não pode desativar sua própria conta' }, { status: 400 });
      }
      
      // Buscar usuário atual
      const targetUser = await db.collection('users').findOne({ userId });
      if (!targetUser) {
        return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
      }
      
      // Toggle do status (se não existe, assume true e muda para false)
      const newStatus = !(targetUser.isActive ?? true);
      
      await db.collection('users').updateOne(
        { userId },
        { $set: { isActive: newStatus, updatedAt: getBrazilTime().toISOString() } }
      );
      
      // Audit log
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: newStatus ? 'activate_user' : 'deactivate_user',
        userId: user.userId,
        timestamp: getBrazilTime().toISOString(),
        details: { targetUserId: userId, targetUserName: targetUser.name, newStatus }
      });
      
      return NextResponse.json({ 
        success: true, 
        message: newStatus ? 'Usuário ativado com sucesso!' : 'Usuário desativado com sucesso!',
        isActive: newStatus
      });
    }
    
    // UPDATE USER DATA (editar usuário completo)
    if (endpoint === 'users/update') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      const { userId, userData, newPassword } = await request.json();
      
      // Remover campos que não devem ser atualizados diretamente
      delete userData.password;
      delete userData.userId;
      
      // Se tiver nova senha, fazer hash
      if (newPassword && newPassword.trim()) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        userData.password = hashedPassword;
      }
      
      // Se tiver churchId, buscar nome da igreja
      if (userData.churchId) {
        const church = await db.collection('churches').findOne({ churchId: userData.churchId });
        userData.church = church?.name || 'Sem igreja';
      }
      
      await db.collection('users').updateOne(
        { userId },
        { $set: { ...userData, updatedAt: getBrazilTime().toISOString() } }
      );
      
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: 'update_user',
        userId: user.userId,
        timestamp: getBrazilTime().toISOString(),
        details: { targetUserId: userId, updates: Object.keys(userData), passwordChanged: !!newPassword }
      });
      
      return NextResponse.json({ success: true, message: 'Usuário atualizado com sucesso!' });
    }
    
    // DELETE USER
    if (endpoint === 'users/delete') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      const { userId } = await request.json();
      
      // Não permitir deletar a si mesmo
      if (userId === user.userId) {
        return NextResponse.json({ error: 'Você não pode excluir seu próprio usuário!' }, { status: 400 });
      }
      
      const deletedUser = await db.collection('users').findOne({ userId });
      await db.collection('users').deleteOne({ userId });
      
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: 'delete_user',
        userId: user.userId,
        timestamp: getBrazilTime().toISOString(),
        details: { deletedUserId: userId, deletedUserEmail: deletedUser?.email }
      });
      
      return NextResponse.json({ success: true, message: 'Usuário excluído com sucesso!' });
    }
    
    // UPLOAD USER PHOTO
    if (endpoint === 'users/upload-photo') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
      }
      
      const formData = await request.formData();
      const file = formData.get('photo');
      const targetUserId = formData.get('userId');
      
      if (!file) {
        return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
      }
      
      // Validar tipo de arquivo
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: 'Tipo de arquivo não permitido. Use JPG, PNG ou WebP.' }, { status: 400 });
      }
      
      // Validar tamanho (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        return NextResponse.json({ error: 'Arquivo muito grande. Tamanho máximo: 2MB' }, { status: 400 });
      }
      
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const photoId = crypto.randomUUID();
      const ext = file.name.split('.').pop();
      const filename = `user_${targetUserId}_${photoId}.${ext}`;
      const uploadDir = path.join(process.cwd(), 'uploads', 'users');
      
      // Criar diretório se não existir
      if (!existsSync(uploadDir)) {
        mkdirSync(uploadDir, { recursive: true });
      }
      
      const filepath = path.join(uploadDir, filename);
      writeFileSync(filepath, buffer);
      
      // Atualizar usuário com URL da foto
      const photoUrl = `/api/uploads/users/${filename}`;
      await db.collection('users').updateOne(
        { userId: targetUserId },
        { $set: { photoUrl, updatedAt: getBrazilTime().toISOString() } }
      );
      
      return NextResponse.json({ 
        success: true, 
        photoUrl,
        message: 'Foto enviada com sucesso!' 
      });
    }
    
    // ========== IGREJAS (CHURCHES) CRUD ==========
    
    // GET ALL CHURCHES
    if (endpoint === 'churches/list') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      const churches = await db.collection('churches')
        .find({})
        .sort({ createdAt: -1 })
        .toArray();
      
      // Para cada igreja, buscar dados do pastor
      for (let church of churches) {
        if (church.pastorId) {
          const pastor = await db.collection('users').findOne(
            { userId: church.pastorId },
            { projection: { password: 0 } }
          );
          church.pastor = pastor;
        }
      }
      
      return NextResponse.json({ churches });
    }
    
    // CREATE CHURCH
    if (endpoint === 'churches/create') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      const churchData = await request.json();
      
      const newChurch = {
        churchId: crypto.randomUUID(),
        ...churchData,
        createdAt: getBrazilTime().toISOString(),
        updatedAt: getBrazilTime().toISOString()
      };
      
      await db.collection('churches').insertOne(newChurch);
      
      // Se tem pastor, atualizar user
      if (churchData.pastorId) {
        await db.collection('users').updateOne(
          { userId: churchData.pastorId },
          { $set: { church: churchData.name, churchId: newChurch.churchId } }
        );
      }
      
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: 'create_church',
        userId: user.userId,
        timestamp: getBrazilTime().toISOString(),
        details: { churchId: newChurch.churchId, churchName: churchData.name }
      });
      
      return NextResponse.json({ success: true, church: newChurch, message: 'Igreja cadastrada com sucesso!' });
    }
    
    // UPDATE CHURCH
    if (endpoint === 'churches/update') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      const { churchId, churchData } = await request.json();
      
      await db.collection('churches').updateOne(
        { churchId },
        { $set: { ...churchData, updatedAt: getBrazilTime().toISOString() } }
      );
      
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: 'update_church',
        userId: user.userId,
        timestamp: getBrazilTime().toISOString(),
        details: { churchId, updates: Object.keys(churchData) }
      });
      
      return NextResponse.json({ success: true, message: 'Igreja atualizada com sucesso!' });
    }
    
    // DELETE CHURCH
    if (endpoint === 'churches/delete') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      const { churchId } = await request.json();
      
      const church = await db.collection('churches').findOne({ churchId });
      
      // Remover associação de usuários com esta igreja
      await db.collection('users').updateMany(
        { churchId },
        { $unset: { church: '', churchId: '' } }
      );
      
      await db.collection('churches').deleteOne({ churchId });
      
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: 'delete_church',
        userId: user.userId,
        timestamp: getBrazilTime().toISOString(),
        details: { deletedChurchId: churchId, deletedChurchName: church?.name }
      });
      
      return NextResponse.json({ success: true, message: 'Igreja excluída com sucesso!' });
    }
    
    // UPLOAD CHURCH PHOTO
    if (endpoint === 'churches/upload-photo') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      const formData = await request.formData();
      const file = formData.get('photo');
      const churchId = formData.get('churchId');
      
      if (!file) {
        return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
      }
      
      // Validar tipo de arquivo
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: 'Tipo de arquivo não permitido. Use JPG, PNG ou WebP.' }, { status: 400 });
      }
      
      // Validar tamanho (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        return NextResponse.json({ error: 'Arquivo muito grande. Tamanho máximo: 2MB' }, { status: 400 });
      }
      
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const photoId = crypto.randomUUID();
      const ext = file.name.split('.').pop();
      const filename = `church_${churchId}_${photoId}.${ext}`;
      const uploadDir = path.join(process.cwd(), 'uploads', 'churches');
      
      // Criar diretório se não existir
      if (!existsSync(uploadDir)) {
        mkdirSync(uploadDir, { recursive: true });
      }
      
      const filepath = path.join(uploadDir, filename);
      writeFileSync(filepath, buffer);
      
      // Atualizar igreja com URL da foto
      const photoUrl = `/api/uploads/churches/${filename}`;
      await db.collection('churches').updateOne(
        { churchId },
        { $set: { photoUrl, updatedAt: getBrazilTime().toISOString() } }
      );
      
      return NextResponse.json({ 
        success: true, 
        photoUrl,
        message: 'Foto da igreja enviada com sucesso!' 
      });
    }
    
    // GET AVAILABLE PASTORS (pastores, bispos e masters disponíveis para trocar)
    if (endpoint === 'churches/available-pastors') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      // Buscar todos os usuários com role pastor/leader/bispo/master
      const pastors = await db.collection('users')
        .find(
          { role: { $in: ['pastor', 'leader', 'bispo', 'master'] } },
          { projection: { password: 0 } }
        )
        .sort({ name: 1 })
        .toArray();
      
      // Marcar quais têm igreja e quais estão livres
      for (let pastor of pastors) {
        pastor.hasChurch = !!pastor.churchId;
        pastor.available = !pastor.churchId;
      }
      
      return NextResponse.json({ pastors });
    }
    
    // CHANGE PASTOR (trocar pastor de uma igreja)
    if (endpoint === 'churches/change-pastor') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      const { churchId, newPastorId } = await request.json();
      
      const church = await db.collection('churches').findOne({ churchId });
      const oldPastorId = church?.pastorId;
      
      // Remover associação do pastor antigo
      if (oldPastorId) {
        await db.collection('users').updateOne(
          { userId: oldPastorId },
          { $unset: { church: '', churchId: '' } }
        );
      }
      
      // Atualizar igreja com novo pastor
      await db.collection('churches').updateOne(
        { churchId },
        { $set: { pastorId: newPastorId, updatedAt: getBrazilTime().toISOString() } }
      );
      
      // Atualizar novo pastor com igreja
      if (newPastorId) {
        await db.collection('users').updateOne(
          { userId: newPastorId },
          { $set: { church: church.name, churchId } }
        );
      }
      
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: 'change_pastor',
        userId: user.userId,
        timestamp: getBrazilTime().toISOString(),
        details: { churchId, oldPastorId, newPastorId }
      });
      
      return NextResponse.json({ success: true, message: 'Pastor alterado com sucesso!' });
    }
    
    // ========== FUNÇÕES (ROLES) CRUD ==========
    
    // GET ALL ROLES
    if (endpoint === 'roles/list') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      const roles = await db.collection('roles')
        .find({})
        .sort({ createdAt: -1 })
        .toArray();
      
      return NextResponse.json({ roles });
    }
    
    // CREATE ROLE
    if (endpoint === 'roles/create') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      const { name, description } = await request.json();
      
      const newRole = {
        roleId: crypto.randomUUID(),
        name,
        description,
        createdAt: getBrazilTime().toISOString(),
        updatedAt: getBrazilTime().toISOString()
      };
      
      await db.collection('roles').insertOne(newRole);
      
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: 'create_role',
        userId: user.userId,
        timestamp: getBrazilTime().toISOString(),
        details: { roleId: newRole.roleId, roleName: name }
      });
      
      return NextResponse.json({ success: true, role: newRole, message: 'Função criada com sucesso!' });
    }
    
    // UPDATE ROLE
    if (endpoint === 'roles/update') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      const { roleId, roleData } = await request.json();
      
      await db.collection('roles').updateOne(
        { roleId },
        { $set: { ...roleData, updatedAt: getBrazilTime().toISOString() } }
      );
      
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: 'update_role',
        userId: user.userId,
        timestamp: getBrazilTime().toISOString(),
        details: { roleId, updates: Object.keys(roleData) }
      });
      
      return NextResponse.json({ success: true, message: 'Função atualizada com sucesso!' });
    }
    
    // DELETE ROLE
    if (endpoint === 'roles/delete') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      const { roleId } = await request.json();
      
      const role = await db.collection('roles').findOne({ roleId });
      await db.collection('roles').deleteOne({ roleId });
      
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: 'delete_role',
        userId: user.userId,
        timestamp: getBrazilTime().toISOString(),
        details: { deletedRoleId: roleId, deletedRoleName: role?.name }
      });
      
      return NextResponse.json({ success: true, message: 'Função excluída com sucesso!' });
    }
    
    
    // EXPORT CSV
    if (endpoint === 'export/csv') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
      }
      
      const userData = await db.collection('users').findOne({ userId: user.userId });
      if (!userData?.permissions?.canExport && user.role !== 'master') {
        return NextResponse.json({ error: 'Sem permissão para exportar' }, { status: 403 });
      }
      
      const { month, year } = await request.json();
      
      const entries = await db.collection('entries')
        .find({ month: parseInt(month), year: parseInt(year) })
        .sort({ day: 1, timeSlot: 1 })
        .toArray();
      
      let csv = 'Dia,Horário,Valor,Igreja,Região,Estado,Observações,Data de Criação\n';
      
      for (const entry of entries) {
        csv += `${entry.day},${entry.timeSlot},${entry.value},"${entry.church || ''}","${entry.region || ''}","${entry.state || ''}","${entry.notes || ''}",${entry.createdAt}\n`;
      }
      
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: 'export_csv',
        userId: user.userId,
        timestamp: getBrazilTime().toISOString(),
        details: { month, year }
      });
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="iudp-${year}-${month}.csv"`
        }
      });
    }
    
    // GET STATISTICS
    if (endpoint === 'stats/overview') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
      }
      
      const userData = await db.collection('users').findOne({ userId: user.userId });
      
      // Build filter baseado nas permissões
      let filter = {};
      
      if (userData.role === 'master' || userData.scope === 'global') {
        // Master vê tudo - sem filtros
      } else if (userData.scope === 'state') {
        filter.state = userData.state;
      } else if (userData.scope === 'region') {
        filter.region = userData.region;
        filter.state = userData.state;
      } else if (userData.scope === 'church') {
        filter.church = userData.church;
      } else {
        // Usuário comum - apenas seus dados
        filter.userId = userData.userId;
      }
      
      console.log('[STATS] User:', userData.userId, 'Role:', userData.role, 'Filter:', JSON.stringify(filter));
      
      const totalUsers = userData.role === 'master' 
        ? await db.collection('users').countDocuments()
        : 1; // Usuário comum vê apenas ele mesmo
        
      const totalEntries = await db.collection('entries').countDocuments(filter);
      const pendingRequests = await db.collection('unlock_requests').countDocuments({ 
        ...filter,
        status: 'pending' 
      });
      
      const now = getBrazilTime();
      const currentMonth = now.month() + 1;
      const currentYear = now.year();
      
      const currentMonthEntries = await db.collection('entries')
        .find({ 
          ...filter,
          month: currentMonth, 
          year: currentYear 
        })
        .toArray();
      
      const currentMonthTotal = currentMonthEntries.reduce((sum, e) => sum + (e.value || 0), 0);
      
      return NextResponse.json({
        totalUsers,
        totalEntries,
        pendingRequests,
        currentMonthTotal,
        currentMonth,
        currentYear
      });
    }
    
    return NextResponse.json({ error: 'Endpoint não encontrado' }, { status: 404 });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  const url = new URL(request.url);
  const endpoint = url.pathname.replace('/api/', '');
  
  try {
    const db = await connectDB();
    
    if (endpoint === 'time/current') {
      // Usa dayjs para garantir America/Sao_Paulo sempre
      const now = getBrazilTime(); // já retorna dayjs com timezone
      
      return NextResponse.json({ 
        time: now.toISOString(),
        formatted: now.format('DD/MM/YYYY HH:mm:ss'),
        timezone: 'America/Sao_Paulo'
      });
    }
    
    if (endpoint === 'unlock/requests') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      const requests = await db.collection('unlock_requests')
        .find({ status: 'pending' })
        .sort({ createdAt: -1 })
        .toArray();
      
      return NextResponse.json({ requests });
    }
    
    // VIEW RECEIPT (serve arquivo para visualização)
    if (endpoint.startsWith('view/receipt/')) {
      const filename = endpoint.replace('view/receipt/', '');
      const filepath = path.join(UPLOAD_DIR, filename);
      
      console.log('[VIEW RECEIPT] Tentando servir:', filepath);
      
      if (!existsSync(filepath)) {
        console.log('[VIEW RECEIPT] Arquivo não encontrado:', filepath);
        return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });
      }
      
      const fileBuffer = await readFile(filepath);
      
      // Detectar tipo de arquivo pela extensão
      const ext = filename.split('.').pop().toLowerCase();
      const contentTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'pdf': 'application/pdf'
      };
      
      const contentType = contentTypes[ext] || 'application/octet-stream';
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000'
        }
      });
    }
    
    if (endpoint.startsWith('download/receipt/')) {
      const filename = endpoint.replace('download/receipt/', '');
      const filepath = path.join(UPLOAD_DIR, filename);
      
      console.log('[DOWNLOAD] Tentando baixar:', filepath);
      
      if (!existsSync(filepath)) {
        console.log('[DOWNLOAD] Arquivo não encontrado:', filepath);
        return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });
      }
      
      const fileBuffer = await readFile(filepath);
      
      // Detectar tipo correto baseado na extensão
      const ext = filename.split('.').pop().toLowerCase();
      const contentTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'pdf': 'application/pdf'
      };
      
      const contentType = contentTypes[ext] || 'application/octet-stream';
      
      console.log('[DOWNLOAD] Servindo arquivo:', filename, 'Type:', contentType, 'Size:', fileBuffer.length);
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': fileBuffer.length.toString()
        }
      });
    }
    
    
    // SERVE UPLOADED FILES (churches, users)
    if (endpoint.startsWith('uploads/')) {
      const filepath = path.join(process.cwd(), endpoint);
      
      try {
        if (existsSync(filepath)) {
          const fileBuffer = readFileSync(filepath);
          const ext = path.extname(filepath).toLowerCase();
          
          const contentTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.webp': 'image/webp',
            '.gif': 'image/gif'
          };
          
          const contentType = contentTypes[ext] || 'application/octet-stream';
          
          return new NextResponse(fileBuffer, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=31536000',
            }
          });
        } else {
          return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });
        }
      } catch (error) {
        console.error('Erro ao servir arquivo:', error);
        return NextResponse.json({ error: 'Erro ao carregar arquivo' }, { status: 500 });
      }
    }
    return NextResponse.json({ error: 'Endpoint não encontrado' }, { status: 404 });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}