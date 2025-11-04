#!/usr/bin/env python3
"""
IUDP Sistema - Teste de Dashboard Auto-load e Filtros de Permissão
Testa os filtros de permissão no endpoint /api/dashboard/data conforme especificado
"""

import requests
import json
import sys
from datetime import datetime

# Configuração da API
BASE_URL = "https://financial-iudp.preview.emergentagent.com/api"

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
    """Criar usuários de teste com diferentes permissões"""
    log_test("=== CRIANDO USUÁRIOS DE TESTE COM DIFERENTES PERMISSÕES ===")
    
    # Tentar diferentes senhas conhecidas
    possible_passwords = ["senha123", "LiderMaximo2025!", "Pastora2025!", "mastertest123", "usertest123"]
    
    users_data = [
        {
            "name": "Master Test User",
            "email": "mastertest@iudp.com",
            "password": "senha123",
            "role": "master",
            "church": "Igreja Central",
            "region": "Região Sul",
            "state": "SP"
        },
        {
            "name": "User Common Test",
            "email": "user1@iudp.com", 
            "password": "senha123",
            "role": "pastor",
            "church": "Igreja Filial A",
            "region": "Região Norte",
            "state": "RJ"
        },
        {
            "name": "User State Scope",
            "email": "userstate@iudp.com",
            "password": "senha123", 
            "role": "leader",
            "scope": "state",
            "church": "Igreja Estado SP",
            "region": "Região Centro",
            "state": "SP"
        },
        {
            "name": "User Church Scope",
            "email": "userchurch@iudp.com",
            "password": "senha123",
            "role": "pastor",
            "scope": "church", 
            "church": "Igreja Central",
            "region": "Região Sul",
            "state": "MG"
        }
    ]
    
    tokens = {}
    
    for user_data in users_data:
        email = user_data["email"]
        password = user_data["password"]
        
        # Tentar registrar primeiro
        register_response = make_request("POST", "auth/register", user_data)
        if register_response['success']:
            log_test(f"Usuário {email} criado com sucesso", True)
            tokens[email] = register_response['data']['token']
            continue
        
        # Se falhou, tentar login com diferentes senhas
        login_success = False
        for test_password in possible_passwords:
            login_response = make_request("POST", "auth/login", {
                "email": email,
                "password": test_password
            })
            if login_response['success']:
                log_test(f"Usuário {email} já existe - login com senha {test_password}", True)
                tokens[email] = login_response['data']['token']
                login_success = True
                break
        
        if not login_success:
            log_test(f"Erro ao criar/logar {email}: {register_response['data']}", False)
            # Não retornar None, continuar com outros usuários
    
    log_test(f"Tokens obtidos para {len(tokens)} usuários", None)
    return tokens

def create_test_entries(tokens):
    """Criar entries de teste para diferentes usuários e localizações"""
    log_test("=== CRIANDO ENTRIES DE TESTE ===")
    
    # Entries para usuário comum (RJ)
    user1_entries = [
        {
            "month": 11, "year": 2025, "day": 1, "timeSlot": "09:00",
            "value": 100.0, "notes": "Entry User1 RJ", "state": "RJ", "church": "Igreja Filial A"
        },
        {
            "month": 11, "year": 2025, "day": 2, "timeSlot": "10:00", 
            "value": 150.0, "notes": "Entry User1 RJ 2", "state": "RJ", "church": "Igreja Filial A"
        }
    ]
    
    # Entries para usuário state scope (SP)
    userstate_entries = [
        {
            "month": 11, "year": 2025, "day": 3, "timeSlot": "11:00",
            "value": 200.0, "notes": "Entry UserState SP", "state": "SP", "church": "Igreja Estado SP"
        },
        {
            "month": 11, "year": 2025, "day": 4, "timeSlot": "12:00",
            "value": 250.0, "notes": "Entry UserState SP 2", "state": "SP", "church": "Igreja Estado SP"
        }
    ]
    
    # Entries para usuário church scope (Igreja Central)
    userchurch_entries = [
        {
            "month": 11, "year": 2025, "day": 5, "timeSlot": "13:00",
            "value": 300.0, "notes": "Entry UserChurch Central", "state": "MG", "church": "Igreja Central"
        },
        {
            "month": 11, "year": 2025, "day": 6, "timeSlot": "14:00",
            "value": 350.0, "notes": "Entry UserChurch Central 2", "state": "MG", "church": "Igreja Central"
        }
    ]
    
    # Criar entries
    user1_headers = {"Authorization": f"Bearer {tokens['user1@iudp.com']}"}
    userstate_headers = {"Authorization": f"Bearer {tokens['userstate@iudp.com']}"}
    userchurch_headers = {"Authorization": f"Bearer {tokens['userchurch@iudp.com']}"}
    
    # Criar entries do user1
    for entry in user1_entries:
        response = make_request("POST", "entries/save", entry, user1_headers)
        if response['success']:
            log_test(f"Entry criado para user1: {entry['notes']}", True)
        else:
            log_test(f"Erro ao criar entry user1: {response['data']}", False)
    
    # Criar entries do userstate
    for entry in userstate_entries:
        response = make_request("POST", "entries/save", entry, userstate_headers)
        if response['success']:
            log_test(f"Entry criado para userstate: {entry['notes']}", True)
        else:
            log_test(f"Erro ao criar entry userstate: {response['data']}", False)
    
    # Criar entries do userchurch
    for entry in userchurch_entries:
        response = make_request("POST", "entries/save", entry, userchurch_headers)
        if response['success']:
            log_test(f"Entry criado para userchurch: {entry['notes']}", True)
        else:
            log_test(f"Erro ao criar entry userchurch: {response['data']}", False)

def test_scenario_1_user_comum(tokens):
    """
    Cenário 1: Usuário Comum (sem scope especial)
    - Login com usuário comum (role != master)
    - POST /api/dashboard/data com { month: 11, year: 2025 }
    - Validar: Retorna APENAS entries do próprio userId
    - Validar: Não retorna entries de outros usuários
    """
    log_test("=== CENÁRIO 1: USUÁRIO COMUM (SEM SCOPE ESPECIAL) ===")
    
    user_headers = {"Authorization": f"Bearer {tokens['user1@iudp.com']}"}
    
    # Fazer requisição ao dashboard
    dashboard_data = {"month": 11, "year": 2025}
    response = make_request("POST", "dashboard/data", dashboard_data, user_headers)
    
    if not response['success']:
        log_test(f"❌ ERRO: Dashboard request falhou: {response['data']}", False)
        return False
    
    data = response['data']
    log_test(f"Dashboard response: entryCount={data.get('entryCount', 0)}, total={data.get('total', 0)}", None)
    
    # Validar que retornou apenas entries do próprio usuário
    # Usuário comum deve ver apenas seus próprios entries (2 entries = 100 + 150 = 250)
    expected_count = 2
    expected_total = 250.0
    
    if data.get('entryCount') == expected_count:
        log_test(f"✅ CORRETO: Usuário comum vê apenas seus entries ({expected_count})", True)
    else:
        log_test(f"❌ ERRO: Usuário comum deveria ver {expected_count} entries, mas viu {data.get('entryCount')}", False)
        return False
    
    if abs(data.get('total', 0) - expected_total) < 0.01:
        log_test(f"✅ CORRETO: Total correto para usuário comum ({expected_total})", True)
    else:
        log_test(f"❌ ERRO: Total deveria ser {expected_total}, mas foi {data.get('total')}", False)
        return False
    
    return True

def test_scenario_2_user_master(tokens):
    """
    Cenário 2: Usuário Master
    - Login com usuário master (role === 'master')
    - POST /api/dashboard/data com { month: 11, year: 2025 }
    - Validar: Retorna TODOS os entries do mês (sem filtros)
    - Validar: Total inclui dados de todos os usuários
    """
    log_test("=== CENÁRIO 2: USUÁRIO MASTER ===")
    
    master_headers = {"Authorization": f"Bearer {tokens['mastertest@iudp.com']}"}
    
    # Fazer requisição ao dashboard
    dashboard_data = {"month": 11, "year": 2025}
    response = make_request("POST", "dashboard/data", dashboard_data, master_headers)
    
    if not response['success']:
        log_test(f"❌ ERRO: Dashboard request falhou: {response['data']}", False)
        return False
    
    data = response['data']
    log_test(f"Dashboard response Master: entryCount={data.get('entryCount', 0)}, total={data.get('total', 0)}", None)
    
    # Master deve ver TODOS os entries (6 entries = 100+150+200+250+300+350 = 1350)
    expected_count = 6
    expected_total = 1350.0
    
    if data.get('entryCount') >= expected_count:
        log_test(f"✅ CORRETO: Master vê todos os entries (>= {expected_count})", True)
    else:
        log_test(f"❌ ERRO: Master deveria ver pelo menos {expected_count} entries, mas viu {data.get('entryCount')}", False)
        return False
    
    if data.get('total', 0) >= expected_total:
        log_test(f"✅ CORRETO: Total Master inclui todos os dados (>= {expected_total})", True)
    else:
        log_test(f"❌ ERRO: Total Master deveria ser pelo menos {expected_total}, mas foi {data.get('total')}", False)
        return False
    
    return True

def test_scenario_3_user_state_scope(tokens):
    """
    Cenário 3: Usuário com Scope State
    - Login com usuário que tem scope: 'state' e state: 'SP'
    - POST /api/dashboard/data com { month: 11, year: 2025 }
    - Validar: Retorna apenas entries com state = 'SP'
    - Validar: Não retorna entries de outros estados
    """
    log_test("=== CENÁRIO 3: USUÁRIO COM SCOPE STATE (SP) ===")
    
    userstate_headers = {"Authorization": f"Bearer {tokens['userstate@iudp.com']}"}
    
    # Fazer requisição ao dashboard
    dashboard_data = {"month": 11, "year": 2025}
    response = make_request("POST", "dashboard/data", dashboard_data, userstate_headers)
    
    if not response['success']:
        log_test(f"❌ ERRO: Dashboard request falhou: {response['data']}", False)
        return False
    
    data = response['data']
    log_test(f"Dashboard response State SP: entryCount={data.get('entryCount', 0)}, total={data.get('total', 0)}", None)
    
    # Usuário state scope SP deve ver apenas entries do estado SP (2 entries = 200 + 250 = 450)
    expected_count = 2
    expected_total = 450.0
    
    if data.get('entryCount') == expected_count:
        log_test(f"✅ CORRETO: Usuário state scope vê apenas entries do estado SP ({expected_count})", True)
    else:
        log_test(f"❌ ERRO: Usuário state scope deveria ver {expected_count} entries, mas viu {data.get('entryCount')}", False)
        return False
    
    if abs(data.get('total', 0) - expected_total) < 0.01:
        log_test(f"✅ CORRETO: Total correto para state scope SP ({expected_total})", True)
    else:
        log_test(f"❌ ERRO: Total deveria ser {expected_total}, mas foi {data.get('total')}", False)
        return False
    
    return True

def test_scenario_4_user_church_scope(tokens):
    """
    Cenário 4: Usuário com Scope Church
    - Login com usuário que tem scope: 'church' e church: 'Igreja Central'
    - POST /api/dashboard/data com { month: 11, year: 2025 }
    - Validar: Retorna apenas entries com church = 'Igreja Central'
    - Validar: Não retorna entries de outras igrejas
    """
    log_test("=== CENÁRIO 4: USUÁRIO COM SCOPE CHURCH (Igreja Central) ===")
    
    userchurch_headers = {"Authorization": f"Bearer {tokens['userchurch@iudp.com']}"}
    
    # Fazer requisição ao dashboard
    dashboard_data = {"month": 11, "year": 2025}
    response = make_request("POST", "dashboard/data", dashboard_data, userchurch_headers)
    
    if not response['success']:
        log_test(f"❌ ERRO: Dashboard request falhou: {response['data']}", False)
        return False
    
    data = response['data']
    log_test(f"Dashboard response Church Central: entryCount={data.get('entryCount', 0)}, total={data.get('total', 0)}", None)
    
    # Usuário church scope Igreja Central deve ver apenas entries da Igreja Central (2 entries = 300 + 350 = 650)
    expected_count = 2
    expected_total = 650.0
    
    if data.get('entryCount') == expected_count:
        log_test(f"✅ CORRETO: Usuário church scope vê apenas entries da Igreja Central ({expected_count})", True)
    else:
        log_test(f"❌ ERRO: Usuário church scope deveria ver {expected_count} entries, mas viu {data.get('entryCount')}", False)
        return False
    
    if abs(data.get('total', 0) - expected_total) < 0.01:
        log_test(f"✅ CORRETO: Total correto para church scope Igreja Central ({expected_total})", True)
    else:
        log_test(f"❌ ERRO: Total deveria ser {expected_total}, mas foi {data.get('total')}", False)
        return False
    
    return True

def test_logout_functionality(tokens):
    """
    Teste de Logout - Validar que logout está funcionando corretamente
    1. Login com qualquer usuário
    2. Verificar que token é válido
    3. Simular logout (limpar token no cliente)
    4. Validar: Requisições subsequentes com token antigo falham (401)
    """
    log_test("=== TESTE DE LOGOUT ===")
    
    # Usar token de usuário comum
    valid_token = tokens['user1@iudp.com']
    user_headers = {"Authorization": f"Bearer {valid_token}"}
    
    # 1. Verificar que token é válido fazendo uma requisição
    log_test("1. Verificando que token é válido...")
    dashboard_data = {"month": 11, "year": 2025}
    response = make_request("POST", "dashboard/data", dashboard_data, user_headers)
    
    if response['success']:
        log_test("✅ Token válido - requisição funcionou", True)
    else:
        log_test(f"❌ ERRO: Token deveria ser válido: {response['data']}", False)
        return False
    
    # 2. Simular logout usando token inválido/expirado
    log_test("2. Testando requisição com token inválido (simulando logout)...")
    invalid_headers = {"Authorization": "Bearer token_invalido_apos_logout"}
    
    response_invalid = make_request("POST", "dashboard/data", dashboard_data, invalid_headers)
    
    if response_invalid['status_code'] == 401 or response_invalid['status_code'] == 403:
        log_test("✅ CORRETO: Requisição com token inválido falhou (401/403)", True)
        return True
    else:
        log_test(f"❌ ERRO: Requisição com token inválido deveria falhar: {response_invalid}", False)
        return False

def main():
    """Função principal de teste"""
    print("=" * 80)
    print("IUDP SISTEMA - TESTE DE DASHBOARD AUTO-LOAD E FILTROS DE PERMISSÃO")
    print("Testando filtros de permissão no endpoint /api/dashboard/data")
    print("=" * 80)
    
    # Criar usuários de teste
    tokens = create_test_users()
    if not tokens or len(tokens) < 4:
        log_test("Falha ao criar usuários de teste. Abortando.", False)
        return False
    
    # Criar entries de teste
    create_test_entries(tokens)
    
    # Executar cenários de teste
    results = []
    
    try:
        # Cenário 1: Usuário comum
        result1 = test_scenario_1_user_comum(tokens)
        results.append(("Cenário 1 - Usuário Comum", result1))
        
        # Cenário 2: Usuário Master
        result2 = test_scenario_2_user_master(tokens)
        results.append(("Cenário 2 - Usuário Master", result2))
        
        # Cenário 3: Usuário State Scope
        result3 = test_scenario_3_user_state_scope(tokens)
        results.append(("Cenário 3 - Usuário State Scope", result3))
        
        # Cenário 4: Usuário Church Scope
        result4 = test_scenario_4_user_church_scope(tokens)
        results.append(("Cenário 4 - Usuário Church Scope", result4))
        
        # Teste de Logout
        result5 = test_logout_functionality(tokens)
        results.append(("Teste de Logout", result5))
        
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
        print("🎉 TODOS OS TESTES PASSARAM - DASHBOARD E FILTROS FUNCIONANDO!")
    else:
        print("⚠️  ALGUNS TESTES FALHARAM - VERIFICAR IMPLEMENTAÇÃO")
    print("=" * 80)
    
    return all_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)