# 📖 Guia Completo - Sistema IUDP

## 🎣 Caderno de Controle Online - Igreja Unida Deus Proverá

### 🔐 Credenciais de Teste

**Master (Líder Máximo):**
- Email: `master@iudp.com`
- Senha: `master123`
- Acesso total ao sistema

**Pastor:**
- Email: `pastor@iudp.com`
- Senha: `pastor123`
- Acesso limitado

---

## ✨ Funcionalidades Principais

### 1️⃣ **Calendário Mensal Inteligente**

#### Estrutura:
- 📅 **31 dias** por mês
- ⏰ **5 horários fixos** por dia:
  - 08:00 (Culto Matinal)
  - 10:00 (Culto Principal)
  - 12:00 (Almoço/Eventos)
  - 15:00 (Tarde)
  - 19:30 (Culto Noturno)

#### Lançamentos:
- 💰 Valor em reais (R$)
- 📝 Observações/notas
- 📎 Upload de comprovantes (PDF/imagens)
- 🔢 Cálculo automático de subtotais e totais

---

### 2️⃣ **Sistema DUAL de Bloqueio** 🔒

#### Bloqueio por Janela de Tempo:
```
08:00 → pode lançar até 10:00
10:00 → pode lançar até 12:00
12:00 → pode lançar até 15:00
15:00 → pode lançar até 19:30
19:30 → pode lançar até 22:00
```
**Após o horário limite: ENTRADA TRAVA AUTOMATICAMENTE**

#### Bloqueio de 1 Hora para Edição:
- ✅ Após criar lançamento: **1 hora** para editar
- ⏱️ Contador regressivo mostra tempo restante
- 🔒 Após 1 hora: **TRAVA IRREVERSIVELMENTE**
- ❌ Nenhum usuário pode editar (exceto com liberação do Master)

#### Indicadores Visuais:
- 🔓 **Verde**: Desbloqueado, pode editar
- ⏰ **Laranja**: Tempo restante (ex: "45min")
- 🔒 **Vermelho**: TRAVADO

---

### 3️⃣ **Sistema de Liberação (Master)**

#### Para Operadores:
1. Entrada travada → Botão **"Solicitar Liberação"**
2. Informar motivo da solicitação
3. Aguardar aprovação do Master

#### Para Master:
1. Notificação com badge vermelho 🔔
2. Painel com todas solicitações pendentes
3. Ver motivo e detalhes
4. Aprovar ou negar
5. Liberação temporária (1 hora)
6. Tudo registrado em auditoria

---

### 4️⃣ **Upload de Comprovantes** 📎

- Suporta: **PDF**, **JPG**, **PNG**
- Múltiplos arquivos por lançamento
- Badge mostra quantidade de arquivos anexados
- Download disponível

**Como usar:**
1. Criar/editar lançamento
2. Clicar em botão **"Comprovante"**
3. Selecionar arquivo
4. Upload automático

---

### 5️⃣ **Comparações Financeiras** 📊

#### Aba "Comparações":
- Comparar **Mês × Mês**
- Comparar **Ano × Ano**
- Selecionar dois períodos
- Clicar **"Comparar Períodos"**

#### Resultado mostra:
- ✅ Total de cada período
- 📈 Percentual de crescimento/queda
- 🔢 Diferença absoluta em reais
- 📊 Análise automática (crescimento/queda/estável)
- 📝 Texto interpretativo automático

**Exemplo:**
> "Baseado em Outubro, Novembro teve crescimento de 12,8%"

---

### 6️⃣ **Painel Master** ⚙️

#### Estatísticas:
- 👥 Total de usuários
- 📄 Total de lançamentos
- 🔔 Solicitações pendentes
- 💰 Total do mês atual

#### Gerenciamento de Usuários:
- Ver todos os usuários cadastrados
- Configurar permissões individuais:
  - ✅ **Imprimir**
  - ✅ **Exportar** (CSV/PDF)
  - ✅ **Compartilhar tela**
- Alterações em tempo real
- Auditoria de todas mudanças

---

### 7️⃣ **Exportação de Dados** 💾

#### CSV (Planilha):
- Botão **"Exportar CSV"** no topo do calendário
- Gera arquivo com todos lançamentos do mês
- Colunas: Dia, Horário, Valor, Observações, Data
- Abrir no Excel/Google Sheets

**Permissão:**
- Apenas usuários com permissão `canExport`
- Master sempre tem acesso
- Configurado no Painel Master

---

### 8️⃣ **Auditoria Completa** 🔍

#### Logs registrados:
- ✅ Login/Logout
- ✅ Criação de lançamentos
- ✅ Edição de lançamentos
- ✅ Solicitações de liberação
- ✅ Aprovações de liberação
- ✅ Upload de comprovantes
- ✅ Exportações
- ✅ Alterações de permissões

#### Visualização (Master):
- Aba **"Auditoria"**
- Lista cronológica reversa
- Detalhes de cada ação
- Usuário responsável
- Data e hora (Brasília)
- Dados completos em JSON

---

## 🎭 Perfis e Hierarquia

### 8 Níveis de Acesso:

1. **Líder Máximo (Master)** 👑
   - Poder total
   - Gerencia todos usuários
   - Aprova liberações
   - Acesso global

2. **Líder**
   - Supervisão geral
   - Acesso configurável

3. **Liderança**
   - Gestão intermediária

4. **Secretária**
   - Pode ter acesso global
   - Gerencia documentação

5. **Tesoureira**
   - Pode ter acesso global
   - Controle financeiro

6. **Estadual**
   - Vê apenas seu Estado

7. **Regional**
   - Vê apenas sua Região

8. **Pastor de Igreja**
   - Vê apenas sua Igreja

---

## ⚙️ Configurações Técnicas

### Timezone:
- **America/Sao_Paulo** (Horário de Brasília)
- Relógio sincronizado exibido no topo
- Todas operações em horário local

### Banco de Dados:
- **MongoDB** para flexibilidade
- UUIDs ao invés de ObjectIDs
- Collections:
  - `users` - Usuários
  - `entries` - Lançamentos
  - `unlock_requests` - Solicitações
  - `audit_logs` - Auditoria

### Autenticação:
- **JWT** (7 dias de validade)
- **bcrypt** para senhas
- Token armazenado localmente
- Auto-login persistente

---

## 🚀 Como Usar

### 1. **Primeiro Acesso (Master)**
```
1. Acesse o sistema
2. Clique em "Cadastrar"
3. Preencha dados
4. Selecione "Líder Máximo"
5. Entre no sistema
```

### 2. **Criar Lançamento**
```
1. Navegue até o dia desejado
2. Clique "+ Lançar" no horário
3. Digite o valor (R$)
4. Adicione observações (opcional)
5. Clique "Salvar"
6. Upload comprovante (opcional)
```

### 3. **Editar Lançamento**
```
1. Encontre o lançamento
2. Verifique tempo restante (⏰)
3. Clique "Editar" se desbloqueado
4. Faça alterações
5. Salve (dentro de 1 hora!)
```

### 4. **Solicitar Liberação**
```
1. Lançamento travado (🔒)
2. Clique "Solicitar Liberação"
3. Informe motivo claro
4. Aguarde notificação Master
5. Master aprova
6. 1 hora para editar
```

### 5. **Comparar Períodos**
```
1. Clique aba "Comparações"
2. Selecione Período 1 (mês/ano)
3. Selecione Período 2 (mês/ano)
4. Clique "Comparar Períodos"
5. Analise resultado visual
```

### 6. **Gerenciar Usuários (Master)**
```
1. Clique aba "Painel Master"
2. Veja estatísticas gerais
3. Clique "Carregar Usuários"
4. Para cada usuário:
   - Toggle "Imprimir" (on/off)
   - Toggle "Exportar" (on/off)
   - Toggle "Compartilhar" (on/off)
5. Salvamento automático
```

### 7. **Ver Auditoria (Master)**
```
1. Clique aba "Auditoria"
2. Clique "Atualizar"
3. Veja últimos 50 logs
4. Detalhes completos de cada ação
```

---

## 📱 Interface

### Cores Institucionais:
- 🔵 **Azul Profundo**: Principal
- ⚪ **Branco Puro**: Fundo
- 🟡 **Dourado Real**: Destaques

### Ícones:
- 🔒 Lock (travado)
- 🔓 Unlock (desbloqueado)
- ⏰ Clock (tempo restante)
- 🔔 Bell (notificações)
- 📎 Upload (anexos)
- 📊 Charts (comparações)
- 👥 Users (usuários)
- 🔍 Eye (auditoria)

---

## 🔮 Próximas Fases (Planejadas)

- [ ] Compartilhamento de tela (WebRTC)
- [ ] Exportação PDF com cabeçalho IUDP
- [ ] Fechamento de mês (lock permanente)
- [ ] Filtros por igreja/região/estado
- [ ] Dashboard com gráficos
- [ ] Relatórios personalizados
- [ ] App mobile
- [ ] Backup automático

---

## 🆘 Suporte

### Problemas Comuns:

**"Não consigo editar"**
- Verificar se passou 1 hora
- Solicitar liberação ao Master
- Aguardar aprovação

**"Botão bloqueado"**
- Janela de tempo expirou
- Solicitar liberação
- Master pode desbloquear

**"Não vejo comparações"**
- Verificar se há dados nos períodos
- Criar lançamentos primeiro
- Tentar novamente

**"Exportação não funciona"**
- Verificar permissões
- Master deve liberar `canExport`
- Atualizar página

---

## 📞 Contato

Sistema desenvolvido exclusivamente para:
**Igreja Unida Deus Proverá (IUDP)**

---

**Versão:** 2.0  
**Data:** Janeiro 2025  
**Status:** ✅ Totalmente Funcional
