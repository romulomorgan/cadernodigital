import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { format, addHours, isBefore, isAfter } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const TIMEZONE = 'America/Sao_Paulo';
const JWT_SECRET = process.env.JWT_SECRET || 'iudp-secret-2025';
const UPLOAD_DIR = '/app/uploads/receipts';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_OBSERVATION_LENGTH = 10000; // 10k chars

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
  // CORREÇÃO FASE 1: Verificar override ANTES de bloquear
  if (entry.masterUnlocked) {
    // Verificar se ainda está dentro do prazo de override
    if (entry.unlockedUntil) {
      const unlockExpiry = new Date(entry.unlockedUntil);
      if (isAfter(currentTime, unlockExpiry)) {
        return { locked: true, reason: 'override_expired' };
      }
      return { locked: false, reason: 'override_active' };
    }
    return { locked: false, reason: 'override_active' };
  }
  
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

function normalizeMonthId(year, month) {
  // CORREÇÃO FASE 1: Normalizar mês como YYYY-MM-01
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

export async function POST(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/', '');
  
  try {
    const db = await connectDB();
    const currentTime = getBrazilTime(); // CORREÇÃO: Usar timezone Brasil em todo backend
    
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
        active: true,
        createdAt: currentTime.toISOString()
      };
      
      await db.collection('users').insertOne(user);
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: 'register',
        userId: user.userId,
        userName: user.name,
        timestamp: currentTime.toISOString(),
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
      if (!user || !user.active) {
        return NextResponse.json({ error: 'Credenciais inválidas ou usuário inativo' }, { status: 401 });
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
        timestamp: currentTime.toISOString(),
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
    
    // UPLOAD RECEIPT - CORREÇÃO FASE 1
    if (path === 'upload/receipt') {
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
      
      // CORREÇÃO: Validar tipo e tamanho
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ 
          error: 'Tipo de arquivo não suportado. Use: JPG, PNG, WEBP ou PDF' 
        }, { status: 400 });
      }
      
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ 
          error: `Arquivo muito grande. Limite: 5MB. Tamanho: ${(file.size / 1024 / 1024).toFixed(2)}MB` 
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
        uploadedAt: currentTime.toISOString()
      };
      
      await db.collection('entries').updateOne(
        { entryId },
        { $push: { receipts: receipt } }
      );
      
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: 'upload_receipt',
        userId: user.userId,
        timestamp: currentTime.toISOString(),
        details: { entryId, filename: file.name, size: file.size }
      });
      
      return NextResponse.json({ success: true, receipt });
    }
    
    // SAVE MONTH OBSERVATION - CORREÇÃO FASE 1
    if (path === 'observations/month') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
      }
      
      const { month, year, observation } = await request.json();
      
      // CORREÇÃO: Validar tamanho
      if (observation && observation.length > MAX_OBSERVATION_LENGTH) {
        return NextResponse.json({ 
          error: `Observação muito longa. Limite: ${MAX_OBSERVATION_LENGTH} caracteres. Atual: ${observation.length}` 
        }, { status: 400 });
      }
      
      const obsId = normalizeMonthId(year, month);
      
      await db.collection('month_observations').updateOne(
        { obsId },
        { 
          $set: { 
            obsId,
            month,
            year,
            observation: observation || '',
            updatedBy: user.userId,
            updatedAt: currentTime.toISOString()
          } 
        },
        { upsert: true }
      );
      
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: 'save_month_observation',
        userId: user.userId,
        timestamp: currentTime.toISOString(),
        details: { month, year, length: observation?.length || 0 }
      });
      
      return NextResponse.json({ 
        success: true, 
        message: 'Observação do mês salva com sucesso!',
        chars: observation?.length || 0
      });
    }
    
    // REOPEN MONTH - CORREÇÃO FASE 1: Novo endpoint
    if (path === 'month/reopen') {
      const user = verifyToken(request);
      if (!user || user.role !== 'master') {
        return NextResponse.json({ error: 'Apenas o Líder Máximo pode reabrir meses' }, { status: 403 });
      }
      
      const { month, year } = await request.json();
      
      await db.collection('month_status').updateOne(
        { month, year },
        { 
          $set: { 
            closed: false,
            reopenedBy: user.userId,
            reopenedAt: currentTime.toISOString()
          } 
        }
      );
      
      await db.collection('audit_logs').insertOne({
        logId: crypto.randomUUID(),
        action: 'reopen_month',
        userId: user.userId,
        timestamp: currentTime.toISOString(),
        details: { month, year }
      });
      
      return NextResponse.json({ success: true, message: 'Mês reaberto com sucesso!' });
    }
    
    // Continuar com outros endpoints...
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
    
    if (path === 'time/current') {
      const currentTime = getBrazilTime();
      return NextResponse.json({ 
        time: currentTime.toISOString(),
        formatted: format(currentTime, 'dd/MM/yyyy HH:mm:ss'),
        timezone: TIMEZONE
      });
    }
    
    return NextResponse.json({ error: 'Endpoint não encontrado' }, { status: 404 });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}