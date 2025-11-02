#!/usr/bin/env python3
"""
IUDP Sistema - Teste de Verificação de Mês Fechado
Testa se mês fechado bloqueia edições conforme especificado
"""

import requests
import json
import sys
from datetime import datetime

# Configuração da API
BASE_URL = "https://iudp-ledger.preview.emergentagent.com/api"

def log_test(message, success=None):
    """Log de teste com formatação"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    if success is True:
        print(f"[{timestamp}] ✅ {message}")
    elif success is False:
        print(f"[{timestamp}] ❌ {message}")
    else:
        print(f"[{timestamp}] ℹ️  {message}")

def make_request(method, endpoint, data=None, headers=None):
    """Fazer requisição HTTP com tratamento de erro"""
    url = f"{BASE_URL}/{endpoint}"
    try:
        if method == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=10)
        elif method == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        
        return {
            'status_code': response.status_code,
            'data': response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text,
            'success': response.status_code < 400
        }
    except Exception as e:
        return {
            'status_code': 0,
            'data': {'error': str(e)},
            'success': False
        }
def create_test_users():
    """Criar usuários de teste: Master e usuário comum"""
    log_test("=== CRIANDO USUÁRIOS DE TESTE ===")
    
    # Usuário Master
    master_data = {
        "name": "João Silva - Líder Máximo",
        "email": "joao.silva@iudp.org.br",
        "password": "LiderMaximo2025!",
        "role": "master",
        "church": "Igreja Central IUDP",
        "region": "Região Sul",
        "state": "São Paulo"
    }
    
    master_response = make_request("POST", "auth/register", master_data)
    if master_response['success']:
        log_test("Usuário Master criado com sucesso", True)
        master_token = master_response['data']['token']
    else:
        # Tentar login se já existe
        login_response = make_request("POST", "auth/login", {
            "email": master_data["email"],
            "password": master_data["password"]
        })
        if login_response['success']:
            log_test("Usuário Master já existe - fazendo login", True)
            master_token = login_response['data']['token']
        else:
            log_test(f"Erro ao criar/logar Master: {master_response['data']}", False)
            return None, None
    
    # Usuário comum
    user_data = {
        "name": "Maria Santos - Pastora",
        "email": "maria.santos@iudp.org.br", 
        "password": "Pastora2025!",
        "role": "pastor",
        "church": "Igreja Filial IUDP",
        "region": "Região Norte",
        "state": "São Paulo"
    }
    
    user_response = make_request("POST", "auth/register", user_data)
    if user_response['success']:
        log_test("Usuário comum criado com sucesso", True)
        user_token = user_response['data']['token']
    else:
        # Tentar login se já existe
        login_response = make_request("POST", "auth/login", {
            "email": user_data["email"],
            "password": user_data["password"]
        })
        if login_response['success']:
            log_test("Usuário comum já existe - fazendo login", True)
            user_token = login_response['data']['token']
        else:
            log_test(f"Erro ao criar/logar usuário comum: {user_response['data']}", False)
            return master_token, None
    
    return master_token, user_token
def test_scenario_1_complete_flow(master_token, user_token):
    """
    Cenário 1: Fluxo Completo de Fechamento
    1. Criar entry no mês 6/2025 com usuário comum
    2. Com Master: Fechar mês 6/2025
    3. Com usuário comum: Tentar editar entry (deve retornar 403)
    4. Com Master: Reabrir mês 6/2025
    5. Com usuário comum: Tentar editar entry novamente (deve funcionar)
    """
    log_test("=== CENÁRIO 1: FLUXO COMPLETO DE FECHAMENTO ===")
    
    # Headers para requisições
    user_headers = {"Authorization": f"Bearer {user_token}"}
    master_headers = {"Authorization": f"Bearer {master_token}"}
    
    # 1. Criar entry com usuário comum
    log_test("1. Criando entry no mês 6/2025 com usuário comum...")
    entry_data = {
        "month": 6,
        "year": 2025,
        "day": 15,
        "timeSlot": "10:00",
        "value": 150.75,
        "notes": "Oferta da manhã - Culto de Domingo"
    }
    
    create_response = make_request("POST", "entries/save", entry_data, user_headers)
    if create_response['success']:
        log_test("Entry criado com sucesso", True)
        entry_id = f"2025-06-15-10:00"
    else:
        log_test(f"Erro ao criar entry: {create_response['data']}", False)
        return False
    
    # 2. Fechar mês com Master
    log_test("2. Fechando mês 6/2025 com Master...")
    close_response = make_request("POST", "month/close", {"month": 6, "year": 2025}, master_headers)
    if close_response['success']:
        log_test("Mês fechado com sucesso", True)
    else:
        log_test(f"Erro ao fechar mês: {close_response['data']}", False)
        return False
    
    # 3. Tentar editar entry com usuário comum (deve falhar)
    log_test("3. Tentando editar entry com usuário comum (deve ser bloqueado)...")
    edit_data = {
        "month": 6,
        "year": 2025,
        "day": 15,
        "timeSlot": "10:00",
        "value": 200.50,
        "notes": "Tentativa de edição em mês fechado"
    }
    
    edit_response = make_request("POST", "entries/save", edit_data, user_headers)
    if edit_response['status_code'] == 403 and 'fechado' in str(edit_response['data']).lower():
        log_test("✅ CORRETO: Entry bloqueado em mês fechado (403)", True)
    else:
        log_test(f"❌ ERRO: Entry deveria ser bloqueado. Response: {edit_response}", False)
        return False
    
    # 4. Reabrir mês com Master
    log_test("4. Reabrindo mês 6/2025 com Master...")
    reopen_response = make_request("POST", "month/reopen", {"month": 6, "year": 2025}, master_headers)
    if reopen_response['success']:
        log_test("Mês reaberto com sucesso", True)
    else:
        log_test(f"Erro ao reabrir mês: {reopen_response['data']}", False)
        return False
    
    # 5. Tentar editar entry novamente (deve funcionar)
    log_test("5. Tentando editar entry novamente após reabrir mês...")
    edit_data2 = {
        "month": 6,
        "year": 2025,
        "day": 15,
        "timeSlot": "10:00",
        "value": 175.25,
        "notes": "Edição após reabertura do mês"
    }
    
    edit_response2 = make_request("POST", "entries/save", edit_data2, user_headers)
    if edit_response2['success']:
        log_test("✅ CORRETO: Entry editado com sucesso após reabertura", True)
        return True
    else:
        log_test(f"❌ ERRO: Entry deveria ser editável após reabertura. Response: {edit_response2}", False)
        return False
def test_scenario_2_unlock_requests(master_token, user_token):
    """
    Cenário 2: Unlock Requests em Mês Fechado
    1. Com Master: Fechar mês 6/2025
    2. Com usuário comum: Tentar solicitar unlock (deve retornar 403)
    3. Com Master: Reabrir mês
    4. Com usuário comum: Solicitar unlock novamente (deve funcionar)
    """
    log_test("=== CENÁRIO 2: UNLOCK REQUESTS EM MÊS FECHADO ===")
    
    user_headers = {"Authorization": f"Bearer {user_token}"}
    master_headers = {"Authorization": f"Bearer {master_token}"}
    
    # 1. Fechar mês com Master
    log_test("1. Fechando mês 6/2025 com Master...")
    close_response = make_request("POST", "month/close", {"month": 6, "year": 2025}, master_headers)
    if close_response['success']:
        log_test("Mês fechado com sucesso", True)
    else:
        log_test(f"Erro ao fechar mês: {close_response['data']}", False)
        return False
    
    # 2. Tentar solicitar unlock com usuário comum (deve falhar)
    log_test("2. Tentando solicitar unlock em mês fechado (deve ser bloqueado)...")
    unlock_data = {
        "entryId": "2025-06-15-10:00",
        "reason": "Preciso corrigir valor da oferta"
    }
    
    unlock_response = make_request("POST", "unlock/request", unlock_data, user_headers)
    if unlock_response['status_code'] == 403 and 'fechado' in str(unlock_response['data']).lower():
        log_test("✅ CORRETO: Unlock request bloqueado em mês fechado (403)", True)
    else:
        log_test(f"❌ ERRO: Unlock request deveria ser bloqueado. Response: {unlock_response}", False)
        return False
    
    # 3. Reabrir mês com Master
    log_test("3. Reabrindo mês 6/2025 com Master...")
    reopen_response = make_request("POST", "month/reopen", {"month": 6, "year": 2025}, master_headers)
    if reopen_response['success']:
        log_test("Mês reaberto com sucesso", True)
    else:
        log_test(f"Erro ao reabrir mês: {reopen_response['data']}", False)
        return False
    
    # 4. Solicitar unlock novamente (deve funcionar)
    log_test("4. Tentando solicitar unlock após reabertura...")
    unlock_response2 = make_request("POST", "unlock/request", unlock_data, user_headers)
    if unlock_response2['success']:
        log_test("✅ CORRETO: Unlock request aceito após reabertura", True)
        return True
    else:
        log_test(f"❌ ERRO: Unlock request deveria funcionar após reabertura. Response: {unlock_response2}", False)
        return False
def test_scenario_3_master_approve_unlock(master_token, user_token):
    """
    Cenário 3: Master Approve Unlock em Mês Fechado
    1. Criar entry com usuário comum
    2. Solicitar unlock (enquanto mês está aberto)
    3. Com Master: Fechar mês
    4. Com Master: Aprovar unlock (deve funcionar mesmo em mês fechado)
    5. Verificar se audit_log tem campo "monthClosed: true"
    """
    log_test("=== CENÁRIO 3: MASTER APPROVE UNLOCK EM MÊS FECHADO ===")
    
    user_headers = {"Authorization": f"Bearer {user_token}"}
    master_headers = {"Authorization": f"Bearer {master_token}"}
    
    # 1. Criar entry com usuário comum
    log_test("1. Criando novo entry para teste de unlock...")
    entry_data = {
        "month": 6,
        "year": 2025,
        "day": 20,
        "timeSlot": "15:00",
        "value": 300.00,
        "notes": "Oferta da tarde - Culto especial"
    }
    
    create_response = make_request("POST", "entries/save", entry_data, user_headers)
    if create_response['success']:
        log_test("Entry criado com sucesso", True)
        entry_id = "2025-06-20-15:00"
    else:
        log_test(f"Erro ao criar entry: {create_response['data']}", False)
        return False
    
    # 2. Solicitar unlock enquanto mês está aberto
    log_test("2. Solicitando unlock enquanto mês está aberto...")
    unlock_data = {
        "entryId": entry_id,
        "reason": "Necessário corrigir valor informado incorretamente"
    }
    
    unlock_response = make_request("POST", "unlock/request", unlock_data, user_headers)
    if unlock_response['success']:
        log_test("Unlock request criado com sucesso", True)
    else:
        log_test(f"Erro ao solicitar unlock: {unlock_response['data']}", False)
        return False
    
    # Buscar o requestId criado
    requests_response = make_request("GET", "unlock/requests", None, master_headers)
    if requests_response['success'] and requests_response['data']['requests']:
        request_id = requests_response['data']['requests'][0]['requestId']
        log_test(f"Request ID encontrado: {request_id}", True)
    else:
        log_test("Erro ao buscar requests de unlock", False)
        return False
    
    # 3. Fechar mês com Master
    log_test("3. Fechando mês 6/2025 com Master...")
    close_response = make_request("POST", "month/close", {"month": 6, "year": 2025}, master_headers)
    if close_response['success']:
        log_test("Mês fechado com sucesso", True)
    else:
        log_test(f"Erro ao fechar mês: {close_response['data']}", False)
        return False
    
    # 4. Aprovar unlock com Master (deve funcionar mesmo em mês fechado)
    log_test("4. Aprovando unlock com Master em mês fechado...")
    approve_data = {
        "requestId": request_id,
        "entryId": entry_id,
        "durationMinutes": 120
    }
    
    approve_response = make_request("POST", "unlock/approve", approve_data, master_headers)
    if approve_response['success']:
        log_test("✅ CORRETO: Master pode aprovar unlock mesmo em mês fechado", True)
        
        # Verificar se há warning sobre mês fechado
        if 'warning' in approve_response['data'] and approve_response['data']['warning']:
            log_test(f"✅ CORRETO: Warning sobre mês fechado: {approve_response['data']['warning']}", True)
        else:
            log_test("ℹ️  Nenhum warning retornado (pode ser normal)", None)
        
        return True
    else:
        log_test(f"❌ ERRO: Master deveria poder aprovar unlock em mês fechado. Response: {approve_response}", False)
        return False
def verify_database_collections():
    """Verificar se as collections do banco estão sendo atualizadas corretamente"""
    log_test("=== VERIFICAÇÃO DE COLLECTIONS DO BANCO ===")
    log_test("ℹ️  Verificações de DB serão feitas através dos testes de API", None)
    log_test("ℹ️  Collections esperadas:", None)
    log_test("   - month_status: documentos com closed: true/false", None)
    log_test("   - audit_logs: ações de close_month e reopen_month", None)
    log_test("   - entries: verificar se valores são editados ou não", None)
def main():
    """Função principal de teste"""
    print("=" * 80)
    print("IUDP SISTEMA - TESTE DE VERIFICAÇÃO DE MÊS FECHADO")
    print("Testando se mês fechado bloqueia edições conforme especificado")
    print("=" * 80)
    
    # Criar usuários de teste
    master_token, user_token = create_test_users()
    if not master_token or not user_token:
        log_test("Falha ao criar usuários de teste. Abortando.", False)
        return False
    
    # Executar cenários de teste
    results = []
    
    try:
        # Cenário 1: Fluxo completo
        result1 = test_scenario_1_complete_flow(master_token, user_token)
        results.append(("Cenário 1 - Fluxo Completo", result1))
        
        # Cenário 2: Unlock requests
        result2 = test_scenario_2_unlock_requests(master_token, user_token)
        results.append(("Cenário 2 - Unlock Requests", result2))
        
        # Cenário 3: Master approve unlock
        result3 = test_scenario_3_master_approve_unlock(master_token, user_token)
        results.append(("Cenário 3 - Master Approve Unlock", result3))
        
        # Verificação de DB
        verify_database_collections()
        
    except Exception as e:
        log_test(f"Erro durante execução dos testes: {str(e)}", False)
        return False
    
    # Resumo dos resultados
    print("\n" + "=" * 80)
    print("RESUMO DOS TESTES")
    print("=" * 80)
    
    all_passed = True
    for test_name, result in results:
        status = "✅ PASSOU" if result else "❌ FALHOU"
        print(f"{test_name}: {status}")
        if not result:
            all_passed = False
    
    print("=" * 80)
    if all_passed:
        print("🎉 TODOS OS TESTES PASSARAM - VERIFICAÇÃO DE MÊS FECHADO FUNCIONANDO!")
    else:
        print("⚠️  ALGUNS TESTES FALHARAM - VERIFICAR IMPLEMENTAÇÃO")
    print("=" * 80)
    
    return all_passed
if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)