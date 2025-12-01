-- =====================================================
-- CADERNO DIGITAL - ESTRUTURA DO BANCO DE DADOS
-- Data de Export: $(date +"%Y-%m-%d %H:%M:%S")
-- =====================================================

-- Tabela: users
CREATE TABLE IF NOT EXISTS users (
    userId VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    roleId VARCHAR(36),
    church VARCHAR(255),
    region VARCHAR(255),
    state VARCHAR(255),
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_roleId (roleId)
);

-- Tabela: roles
CREATE TABLE IF NOT EXISTS roles (
    roleId VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: churches
CREATE TABLE IF NOT EXISTS churches (
    churchId VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    state VARCHAR(100),
    region VARCHAR(100),
    address TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: custos (tipos de custo)
CREATE TABLE IF NOT EXISTS custos (
    custoId VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    documentOptional BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: costs_entries (lançamentos de custos)
CREATE TABLE IF NOT EXISTS costs_entries (
    costId VARCHAR(36) PRIMARY KEY,
    costTypeId VARCHAR(36) NOT NULL,
    costTypeName VARCHAR(255) NOT NULL,
    church VARCHAR(255),
    dueDate DATE NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    billFile TEXT,
    status VARCHAR(50) DEFAULT 'PENDING',
    paymentDate DATE,
    valuePaid DECIMAL(10,2),
    proofFile TEXT,
    paidAt TIMESTAMP,
    createdBy VARCHAR(36) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_church (church),
    INDEX idx_createdBy (createdBy)
);

-- Tabela: entries (ofertas diárias)
CREATE TABLE IF NOT EXISTS entries (
    entryId VARCHAR(36) PRIMARY KEY,
    date DATE NOT NULL,
    church VARCHAR(255) NOT NULL,
    state VARCHAR(100),
    region VARCHAR(100),
    time08 DECIMAL(10,2) DEFAULT 0,
    time10 DECIMAL(10,2) DEFAULT 0,
    time12 DECIMAL(10,2) DEFAULT 0,
    time15 DECIMAL(10,2) DEFAULT 0,
    time18 DECIMAL(10,2) DEFAULT 0,
    time20 DECIMAL(10,2) DEFAULT 0,
    userId VARCHAR(36) NOT NULL,
    month INT NOT NULL,
    year INT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_date (date),
    INDEX idx_church (church),
    INDEX idx_month_year (month, year)
);

-- Tabela: unlock_requests (solicitações de desbloqueio)
CREATE TABLE IF NOT EXISTS unlock_requests (
    requestId VARCHAR(36) PRIMARY KEY,
    userId VARCHAR(36) NOT NULL,
    userName VARCHAR(255) NOT NULL,
    church VARCHAR(255) NOT NULL,
    month INT NOT NULL,
    year INT NOT NULL,
    day INT NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    reviewedBy VARCHAR(36),
    reviewedAt TIMESTAMP,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_user (userId)
);

-- Tabela: month_status
CREATE TABLE IF NOT EXISTS month_status (
    statusId VARCHAR(36) PRIMARY KEY,
    church VARCHAR(255) NOT NULL,
    month INT NOT NULL,
    year INT NOT NULL,
    locked BOOLEAN DEFAULT FALSE,
    lockedBy VARCHAR(36),
    lockedAt TIMESTAMP,
    UNIQUE KEY unique_month_church (church, month, year)
);

-- Tabela: month_observations
CREATE TABLE IF NOT EXISTS month_observations (
    obsId VARCHAR(20) PRIMARY KEY,
    month INT NOT NULL,
    year INT NOT NULL,
    observation TEXT,
    active BOOLEAN DEFAULT FALSE,
    updatedBy VARCHAR(36),
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela: day_observations
CREATE TABLE IF NOT EXISTS day_observations (
    obsId VARCHAR(36) PRIMARY KEY,
    church VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    observation TEXT NOT NULL,
    createdBy VARCHAR(36) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_church_date (church, date)
);

-- Tabela: time_overrides
CREATE TABLE IF NOT EXISTS time_overrides (
    overrideId VARCHAR(36) PRIMARY KEY,
    date DATE NOT NULL,
    actualTime TIMESTAMP NOT NULL,
    createdBy VARCHAR(36) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    logId VARCHAR(36) PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    userId VARCHAR(36),
    userName VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details JSON,
    INDEX idx_action (action),
    INDEX idx_timestamp (timestamp),
    INDEX idx_user (userId)
);

-- Tabela: privacy_config
CREATE TABLE IF NOT EXISTS privacy_config (
    roleId VARCHAR(36) PRIMARY KEY,
    roleName VARCHAR(100) NOT NULL,
    allowedTabs JSON NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updatedBy VARCHAR(36)
);
