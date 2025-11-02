import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { format, addHours, isBefore, isAfter, differenceInMinutes } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Sao_Paulo';
const JWT_SECRET = process.env.JWT_SECRET || 'iudp-secret-key-2025';

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
  // Check time window lock
  if (entry.timeWindowLocked) return { locked: true, reason: 'time_window' };
  
  // Check 1-hour edit lock
  if (entry.createdAt && entry.value !== null && entry.value !== undefined && entry.value !== '') {
    const createdTime = new Date(entry.createdAt);
    const oneHourLater = addHours(createdTime, 1);
    if (isAfter(currentTime, oneHourLater) && !entry.masterUnlocked) {
      return { locked: true, reason: 'one_hour_edit' };
    }
  }
  
  return { locked: false };
}

export async function POST(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/', '');
  
  try {
    const db = await connectDB();
    
    // REGISTER
    if (path === 'auth/register') {
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
      
      // Audit log
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
    if (path === 'auth/login') {
      const { email, password } = await request.json();
      
      const user = await db.collection('users').findOne({ email });
      if (!user) {
        return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
      }
      
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
      }
      
      // Audit log
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
    
    // SAVE ENTRY
    if (path === 'entries/save') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
      }
      
      const { month, year, day, timeSlot, value, notes } = await request.json();
      const currentTime = getBrazilTime();
      
      const entryId = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}-${timeSlot}`;
      
      const existing = await db.collection('entries').findOne({ entryId });
      
      // Check if editing existing entry
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
      
      // Audit log
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: existing ? 'edit_entry' : 'create_entry',
        userId: user.userId,
        timestamp: currentTime.toISOString(),
        details: { entryId, value, timeSlot }
      });
      
      return NextResponse.json({ success: true, entry });
    }
    
    // GET ENTRIES FOR MONTH
    if (path === 'entries/month') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
      }
      
      const body = await request.json();
      const { month, year } = body;
      
      const entries = await db.collection('entries')
        .find({ 
          month: parseInt(month), 
          year: parseInt(year) 
        })
        .toArray();
      
      // Check and update time window locks
      const currentTime = getBrazilTime();
      const currentHour = currentTime.getHours();
      const currentMinute = currentTime.getMinutes();
      const currentDay = currentTime.getDate();
      const currentMonth = currentTime.getMonth() + 1;
      const currentYear = currentTime.getFullYear();
      
      for (const entry of entries) {
        if (!entry.timeWindowLocked && !entry.masterUnlocked) {
          const entryDate = new Date(entry.year, entry.month - 1, entry.day);
          const todayDate = new Date(currentYear, currentMonth - 1, currentDay);
          
          let shouldLock = false;
          
          // If entry is from a past day, lock it
          if (isBefore(entryDate, todayDate)) {
            shouldLock = true;
          }
          // If entry is from today, check time window
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
      
      return NextResponse.json({ entries });
    }
    
    // REQUEST UNLOCK
    if (path === 'unlock/request') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
      }
      
      const { entryId, reason } = await request.json();
      
      const request_record = {
        requestId: crypto.randomUUID(),
        entryId,
        requesterId: user.userId,
        reason: reason || '',
        status: 'pending',
        createdAt: getBrazilTime().toISOString()
      };
      
      await db.collection('unlock_requests').insertOne(request_record);
      
      // Audit log
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: 'request_unlock',
        userId: user.userId,
        timestamp: getBrazilTime().toISOString(),
        details: { entryId, reason }
      });
      
      return NextResponse.json({ success: true });
    }
    
    // GET UNLOCK REQUESTS (Master only)
    if (path === 'unlock/requests') {
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
    
    // APPROVE UNLOCK (Master only)
    if (path === 'unlock/approve') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      
      const { requestId, entryId, durationMinutes } = await request.json();
      
      // Update entry to unlock
      await db.collection('entries').updateOne(
        { entryId },
        { 
          $set: { 
            masterUnlocked: true,
            unlockedUntil: addHours(getBrazilTime(), Math.ceil(durationMinutes / 60)).toISOString()
          } 
        }
      );
      
      // Update request status
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
      
      // Audit log
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: 'approve_unlock',
        userId: user.userId,
        timestamp: getBrazilTime().toISOString(),
        details: { requestId, entryId, durationMinutes }
      });
      
      return NextResponse.json({ success: true });
    }
    
    // GET AUDIT LOGS (Master only)
    if (path === 'audit/logs') {
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
    
    return NextResponse.json({ error: 'Endpoint não encontrado' }, { status: 404 });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/', '');
  
  try {
    const db = await connectDB();
    
    // GET CURRENT TIME (Brazil)
    if (path === 'time/current') {
      const currentTime = getBrazilTime();
      return NextResponse.json({ 
        time: currentTime.toISOString(),
        formatted: format(currentTime, 'dd/MM/yyyy HH:mm:ss')
      });
    }
    
    return NextResponse.json({ error: 'Endpoint não encontrado' }, { status: 404 });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}