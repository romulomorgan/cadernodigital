import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { format, addHours, isBefore, isAfter, differenceInMinutes, addSeconds } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
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
    churchId,
    month: parseInt(month),
    year: parseInt(year),
    day: parseInt(day),
    timeSlot,
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
    
    // REGISTER
    if (endpoint === 'auth/register') {
      const { name, email, password, role, church, region, state } = await request.json();
      
      const existing = await db.collection('users').findOne({ email });
      if (existing) {
        return NextResponse.json({ error: 'Email já cadastrado' }, { status: 400 });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = {
        userId: crypto.randomUUID(),
        name,
        email,
        password: hashedPassword,
        role: role || 'pastor',
        church: church || '',
        region: region || '',
        state: state || '',
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
      const { month, year, day, timeSlot, value, notes } = await request.json();
      
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
        value: parseFloat(value) || 0,
        notes: notes || '',
        userId: user.userId,
        userName: userData.name,
        church: userData.church,
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
      const { month, year } = body;
      
      // Build filter based on user scope
      let filter = { 
        month: parseInt(month), 
        year: parseInt(year) 
      };
      
      // MASTER vê tudo
      if (userData.role === 'master' || userData.scope === 'global') {
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
      
      const entries = await db.collection('entries').find(filter).toArray();
      
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
    
    // GET UNLOCK REQUESTS
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
    
    // GET ALL USERS
    if (endpoint === 'users/list') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      const users = await db.collection('users')
        .find({}, { projection: { password: 0 } })
        .sort({ createdAt: -1 })
        .toArray();
      
      return NextResponse.json({ users });
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
    
    return NextResponse.json({ error: 'Endpoint não encontrado' }, { status: 404 });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}