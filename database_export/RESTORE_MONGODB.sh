#!/bin/bash
# Script para restaurar o banco de dados MongoDB

echo "🔄 Restaurando banco de dados cardenodigital..."

# Restaurar do dump BSON
mongorestore --db=cardenodigital mongodb_dump/cardenodigital --drop

echo "✅ Restauração concluída!"
echo ""
echo "📊 Verificando documentos:"
mongosh mongodb://localhost:27017/cardenodigital --eval "
  db.getCollectionNames().forEach(function(coll) {
    print(coll + ': ' + db[coll].countDocuments({}));
  });
"
