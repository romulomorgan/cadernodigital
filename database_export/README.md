# 📦 Export do Banco de Dados - Caderno Digital IUDP

**Data de Export:** $(date +"%Y-%m-%d %H:%M:%S")  
**Banco:** cardenodigital  
**Servidor:** MongoDB

## 📁 Estrutura dos Arquivos

### 1. `mongodb_dump/` - Dump Nativo MongoDB (BSON)
Formato nativo do MongoDB para restauração completa e rápida.

**Como restaurar:**
```bash
mongorestore --db=cardenodigital mongodb_dump/cardenodigital --drop
```

### 2. `json/` - Collections em JSON
Arquivos JSON individuais de cada collection, úteis para:
- Importação em outros sistemas
- Análise de dados
- Backup legível

**Collections disponíveis:**
- users.json
- roles.json
- churches.json
- custos.json
- costs_entries.json
- entries.json
- unlock_requests.json
- month_status.json
- month_observations.json
- day_observations.json
- time_overrides.json
- audit_logs.json
- privacy_config.json

**Como importar individual:**
```bash
mongoimport --db=cardenodigital --collection=users --file=json/users.json --jsonArray
```

### 3. `structure.sql` - Estrutura SQL
Schema equivalente para MySQL/PostgreSQL (apenas estrutura).

### 4. `RESTORE_MONGODB.sh` - Script de Restauração
Script bash automatizado para restaurar o banco completo.

## 🔄 Restauração Rápida

### MongoDB:
```bash
./RESTORE_MONGODB.sh
```

### Ou manualmente:
```bash
mongorestore --db=cardenodigital mongodb_dump/cardenodigital --drop
```

## 📊 Estatísticas do Banco

$(mongosh mongodb://localhost:27017/cardenodigital --quiet --eval "
print('Collection | Documentos');
print('-----------|------------');
db.getCollectionNames().forEach(function(coll) {
  var count = db[coll].countDocuments({});
  print(coll.padEnd(20) + '| ' + count);
});
")

## ⚠️ Notas Importantes

1. **Senhas:** Todas as senhas estão em hash bcrypt (seguras)
2. **IDs:** Todos os IDs são UUIDs (não ObjectIDs do MongoDB)
3. **Backup:** Recomendado fazer backup antes de restaurar
4. **Permissões:** Necessário acesso ao MongoDB para restauração

## 🔐 Segurança

- Mantenha este export em local seguro
- Não compartilhe publicamente (contém dados sensíveis)
- Use apenas em ambientes autorizados
