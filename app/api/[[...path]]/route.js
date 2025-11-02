import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { format, addHours, isBefore, isAfter, differenceInMinutes } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const TIMEZONE = 'America/Sao_Paulo';
const JWT_SECRET = process.env.JWT_SECRET || 'iudp-secret-key-2025';
const UPLOAD_DIR = '/app/uploads/receipts';

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

function getBrazilTime() {
  return toZonedTime(new Date(), TIMEZONE);
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
      
      if (!file) {
        return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 });
      }
      
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
      
      const receipt = {
        receiptId: fileId,
        filename: file.name,
        filepath: filename,
        fileType: file.type,
        fileSize: file.size,
        uploadedBy: user.userId,
        uploadedAt: getBrazilTime().toISOString()
      };
      
      await db.collection('entries').updateOne(
        { entryId },
        { $push: { receipts: receipt } }
      );
      
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: 'upload_receipt',
        userId: user.userId,
        timestamp: getBrazilTime().toISOString(),
        details: { entryId, filename: file.name }
      });
      
      return NextResponse.json({ success: true, receipt });
    }
    
    // SAVE ENTRY
    if (endpoint === 'entries/save') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
      }
      
      const userData = await db.collection('users').findOne({ userId: user.userId });
      const { month, year, day, timeSlot, value, notes } = await request.json();
      const currentTime = getBrazilTime();
      
      // Check if month is closed
      const monthStatus = await db.collection('month_status').findOne({ month, year });
      if (monthStatus?.closed && user.role !== 'master') {
        return NextResponse.json({ 
          error: 'Mês fechado. Apenas o Líder Máximo pode reabrir.',
          locked: true
        }, { status: 403 });
      }
      
      const entryId = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}-${timeSlot}`;
      
      const existing = await db.collection('entries').findOne({ entryId });
      
      if (existing && existing.value !== null) {
        const lockStatus = isEntryLocked(existing, currentTime);
        if (lockStatus.locked) {
          return NextResponse.json({ 
            error: lockStatus.reason === 'time_window' 
              ? 'Horário de lançamento encerrado. Solicite liberação ao Líder.' 
              : 'Prazo de 1 hora para edição expirado. Solicite liberação ao Líder.',
            locked: true,
            reason: lockStatus.reason
          }, { status: 403 });
        }
      }
      
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
      
      await db.collection('entries').updateOne(
        { entryId },
        { $set: entry },
        { upsert: true }
      );
      
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: existing ? 'edit_entry' : 'create_entry',
        userId: user.userId,
        timestamp: currentTime.toISOString(),
        details: { entryId, value, timeSlot }
      });
      
      return NextResponse.json({ success: true, entry });
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
    
    // SAVE MONTH OBSERVATION
    if (endpoint === 'observations/month') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
      }
      
      const { month, year, observation } = await request.json();
      
      const obsId = `${year}-${String(month).padStart(2, '0')}`;
      
      await db.collection('month_observations').updateOne(
        { obsId },
        { 
          $set: { 
            obsId,
            month,
            year,
            observation,
            updatedBy: user.userId,
            updatedAt: getBrazilTime().toISOString()
          } 
        },
        { upsert: true }
      );
      
      return NextResponse.json({ success: true });
    }
    
    // GET MONTH DATA (with observations)
    if (endpoint === 'entries/month') {
    
    // CLOSE MONTH - FASE 2
    if (endpoint === 'month/close') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Apenas o Líder Máximo pode fechar meses' }, { status: 403 });
      }
      
      const { month, year } = await request.json();
      
      await db.collection('month_status').updateOne(
        { month: parseInt(month), year: parseInt(year) },
        { 
          $set: { 
            month: parseInt(month),
            year: parseInt(year),
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
      
      return NextResponse.json({ 
        success: true, 
        message: 'Mês fechado com sucesso!' 
      });
    }
    
    // REOPEN MONTH - FASE 2
    if (endpoint === 'month/reopen') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Apenas o Líder Máximo pode reabrir meses' }, { status: 403 });
      }
      
      const { month, year } = await request.json();
      
      await db.collection('month_status').updateOne(
        { month: parseInt(month), year: parseInt(year) },
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
      
      return NextResponse.json({ 
        success: true, 
        message: 'Mês reaberto com sucesso!' 
      });
    }

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
      
      if (userData.role !== 'master' && userData.scope !== 'global') {
        if (userData.scope === 'state') {
          filter.state = userData.state;
        } else if (userData.scope === 'region') {
          filter.region = userData.region;
          filter.state = userData.state;
        } else if (userData.scope === 'church') {
          filter.church = userData.church;
        }
      }
      
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
      
      const currentTime = getBrazilTime();
      const currentHour = currentTime.getHours();
      const currentMinute = currentTime.getMinutes();
      const currentDay = currentTime.getDate();
      const currentMonth = currentTime.getMonth() + 1;
      const currentYear = currentTime.getFullYear();
      
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
        monthObservation: monthObservation?.observation || ''
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
      
      const { month1, year1, month2, year2 } = await request.json();
      
      const entries1 = await db.collection('entries')
        .find({ month: parseInt(month1), year: parseInt(year1) })
        .toArray();
      
      const entries2 = await db.collection('entries')
        .find({ month: parseInt(month2), year: parseInt(year2) })
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
      
      const entries = await db.collection('entries')
        .find({ month: parseInt(month), year: parseInt(year) })
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
      
      const { entryId, reason } = await request.json();
      
      const request_record = {
        requestId: crypto.randomUUID(),
        entryId,
        requesterId: user.userId,
        requesterName: user.email,
        reason: reason || '',
        status: 'pending',
        createdAt: getBrazilTime().toISOString()
      };
      
      await db.collection('unlock_requests').insertOne(request_record);
      
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: 'request_unlock',
        userId: user.userId,
        timestamp: getBrazilTime().toISOString(),
        details: { entryId, reason }
      });
      
      return NextResponse.json({ success: true });
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
      
      await db.collection('entries').updateOne(
        { entryId },
        { 
          $set: { 
            masterUnlocked: true,
            unlockedUntil: addHours(getBrazilTime(), Math.ceil(durationMinutes / 60)).toISOString()
          } 
        }
      );
      
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
      
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: 'approve_unlock',
        userId: user.userId,
        timestamp: getBrazilTime().toISOString(),
        details: { requestId, entryId, durationMinutes }
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
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      const totalUsers = await db.collection('users').countDocuments();
      const totalEntries = await db.collection('entries').countDocuments();
      const pendingRequests = await db.collection('unlock_requests').countDocuments({ status: 'pending' });
      const totalAuditLogs = await db.collection('audit_logs').countDocuments();
      
      const now = getBrazilTime();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      
      const currentMonthEntries = await db.collection('entries')
        .find({ month: currentMonth, year: currentYear })
        .toArray();
      
      const currentMonthTotal = currentMonthEntries.reduce((sum, e) => sum + (e.value || 0), 0);
      
      return NextResponse.json({
        totalUsers,
        totalEntries,
        pendingRequests,
        totalAuditLogs,
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
      const currentTime = getBrazilTime();
      return NextResponse.json({ 
        time: currentTime.toISOString(),
        formatted: format(currentTime, 'dd/MM/yyyy HH:mm:ss')
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
    
    if (endpoint.startsWith('download/receipt/')) {
      const filename = endpoint.replace('download/receipt/', '');
      const filepath = `/app/uploads/receipts/${filename}`;
      
      if (!existsSync(filepath)) {
        return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });
      }
      
      const fileBuffer = await readFile(filepath);
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }
    
    return NextResponse.json({ error: 'Endpoint não encontrado' }, { status: 404 });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}