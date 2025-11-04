#!/usr/bin/env python3
"""
TESTE FINAL COMPLETO - IGREJAS E FUNÇÕES
Sistema "Caderno de Controle Online — IUDP"

Testa os 5 endpoints prioritários conforme solicitado:
1. POST /api/churches/create - Criar igreja
2. POST /api/churches/list - Listar igrejas
3. POST /api/churches/update - Atualizar igreja
4. POST /api/roles/list - Listar funções/roles
5. POST /api/roles/create - Criar funções/roles

Credenciais: joao.silva@iudp.org.br / senha123
"""

import requests
import json
import sys
from datetime import datetime

# Configuração
BASE_URL = "https://financial-iudp.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Credenciais do teste
LOGIN_EMAIL = "joao.silva@iudp.org.br"
LOGIN_PASSWORD = "senha123"

class TestRunner:
    def __init__(self):
        self.token = None
        self.test_results = []
        
    def log_result(self, test_name, success, details=""):
        """Registra resultado do teste"""
        status = "✅ PASSOU" if success else "❌ FALHOU"
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details,
            'status': status
        })
        print(f"{status} - {test_name}")
        if details:
            print(f"   Detalhes: {details}")
        print()
    
    def authenticate(self):
        """Autentica e obtém token"""
        print("🔐 AUTENTICANDO USUÁRIO...")
        
        try:
            response = requests.post(f"{API_BASE}/auth/login", json={
                "email": LOGIN_EMAIL,
                "password": LOGIN_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('token'):
                    self.token = data['token']
                    user_info = data.get('user', {})
                    self.log_result(
                        "Autenticação de usuário",
                        True,
                        f"Login realizado com sucesso. Role: {user_info.get('role', 'N/A')}"
                    )
                    return True
                else:
                    self.log_result("Autenticação de usuário", False, f"Resposta inválida: {data}")
                    return False
            else:
                self.log_result("Autenticação de usuário", False, f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Autenticação de usuário", False, f"Erro de conexão: {str(e)}")
            return False
    
    def get_headers(self):
        """Retorna headers com token de autenticação"""
        return {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
    
    def test_churches_create(self):
        """Teste 1: POST /api/churches/create - Criar igreja"""
        print("🏛️ TESTE 1: CADASTRO DE IGREJA")
        
        church_data = {
            "name": "Igreja Teste Final",
            "address": "Rua Teste Final, 123",
            "city": "São Paulo",
            "state": "SP",
            "region": "Centro"
        }
        
        try:
            response = requests.post(
                f"{API_BASE}/churches/create",
                json=church_data,
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('church'):
                    church = data['church']
                    church_id = church.get('churchId')
                    
                    # Salvar churchId para próximos testes
                    self.test_church_id = church_id
                    
                    self.log_result(
                        "POST /api/churches/create",
                        True,
                        f"Igreja criada com sucesso. ID: {church_id}, Nome: {church.get('name')}"
                    )
                    return True
                else:
                    self.log_result("POST /api/churches/create", False, f"Resposta inválida: {data}")
                    return False
            else:
                self.log_result("POST /api/churches/create", False, f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("POST /api/churches/create", False, f"Erro: {str(e)}")
            return False
    
    def test_churches_list(self):
        """Teste 2: POST /api/churches/list - Listar igrejas"""
        print("📋 TESTE 2: LISTAR IGREJAS")
        
        try:
            response = requests.post(
                f"{API_BASE}/churches/list",
                json={},
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                if 'churches' in data:
                    churches = data['churches']
                    church_count = len(churches)
                    
                    # Verificar se nossa igreja teste está na lista
                    test_church_found = False
                    if hasattr(self, 'test_church_id'):
                        for church in churches:
                            if church.get('churchId') == self.test_church_id:
                                test_church_found = True
                                break
                    
                    details = f"Retornou {church_count} igrejas"
                    if test_church_found:
                        details += ". Igreja teste encontrada na lista"
                    
                    self.log_result("POST /api/churches/list", True, details)
                    return True
                else:
                    self.log_result("POST /api/churches/list", False, f"Resposta inválida: {data}")
                    return False
            else:
                self.log_result("POST /api/churches/list", False, f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("POST /api/churches/list", False, f"Erro: {str(e)}")
            return False
    
    def test_churches_update(self):
        """Teste 3: POST /api/churches/update - Atualizar igreja"""
        print("✏️ TESTE 3: ATUALIZAR IGREJA")
        
        if not hasattr(self, 'test_church_id'):
            self.log_result("POST /api/churches/update", False, "Igreja teste não foi criada nos testes anteriores")
            return False
        
        update_data = {
            "churchId": self.test_church_id,
            "churchData": {
                "name": "Igreja Teste Final - ATUALIZADA",
                "region": "Centro Atualizado"
            }
        }
        
        try:
            response = requests.post(
                f"{API_BASE}/churches/update",
                json=update_data,
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_result(
                        "POST /api/churches/update",
                        True,
                        f"Igreja atualizada com sucesso. ID: {self.test_church_id}"
                    )
                    return True
                else:
                    self.log_result("POST /api/churches/update", False, f"Resposta inválida: {data}")
                    return False
            else:
                self.log_result("POST /api/churches/update", False, f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("POST /api/churches/update", False, f"Erro: {str(e)}")
            return False
    
    def test_roles_list(self):
        """Teste 4: POST /api/roles/list - Listar funções/roles"""
        print("👥 TESTE 4: LISTAR FUNÇÕES/ROLES")
        
        try:
            response = requests.post(
                f"{API_BASE}/roles/list",
                json={},
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                if 'roles' in data:
                    roles = data['roles']
                    role_count = len(roles)
                    
                    details = f"Retornou {role_count} funções/roles"
                    if role_count == 0:
                        details += " (vazio - OK, ainda não cadastradas)"
                    
                    self.log_result("POST /api/roles/list", True, details)
                    return True
                else:
                    self.log_result("POST /api/roles/list", False, f"Resposta inválida: {data}")
                    return False
            else:
                self.log_result("POST /api/roles/list", False, f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("POST /api/roles/list", False, f"Erro: {str(e)}")
            return False
    
    def test_roles_create(self):
        """Teste 5: POST /api/roles/create - Criar funções/roles"""
        print("➕ TESTE 5: CRIAR FUNÇÃO/ROLE")
        
        role_data = {
            "name": "Pastor",
            "description": "Responsável pela igreja e suas atividades ministeriais"
        }
        
        try:
            response = requests.post(
                f"{API_BASE}/roles/create",
                json=role_data,
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('role'):
                    role = data['role']
                    role_id = role.get('roleId')
                    
                    # Salvar roleId para referência
                    self.test_role_id = role_id
                    
                    self.log_result(
                        "POST /api/roles/create",
                        True,
                        f"Função criada com sucesso. ID: {role_id}, Nome: {role.get('name')}"
                    )
                    return True
                else:
                    self.log_result("POST /api/roles/create", False, f"Resposta inválida: {data}")
                    return False
            else:
                self.log_result("POST /api/roles/create", False, f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("POST /api/roles/create", False, f"Erro: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Executa todos os testes na sequência"""
        print("🎯 INICIANDO TESTE FINAL COMPLETO - IGREJAS E FUNÇÕES")
        print("=" * 70)
        print()
        
        # Autenticação
        if not self.authenticate():
            print("❌ FALHA NA AUTENTICAÇÃO - ABORTANDO TESTES")
            return False
        
        # Executar testes na ordem especificada
        tests = [
            self.test_churches_create,
            self.test_churches_list,
            self.test_churches_update,
            self.test_roles_list,
            self.test_roles_create
        ]
        
        success_count = 0
        for test_func in tests:
            if test_func():
                success_count += 1
        
        # Resumo final
        print("=" * 70)
        print("📊 RESUMO FINAL DOS TESTES")
        print("=" * 70)
        
        total_tests = len(tests)
        for result in self.test_results[1:]:  # Pular autenticação no resumo
            print(f"{result['status']} {result['test']}")
        
        print()
        print(f"✅ TESTES PASSARAM: {success_count}/{total_tests}")
        print(f"❌ TESTES FALHARAM: {total_tests - success_count}/{total_tests}")
        
        if success_count == total_tests:
            print("🎉 TODOS OS TESTES PASSARAM - ENDPOINTS FUNCIONANDO PERFEITAMENTE!")
            return True
        else:
            print("⚠️ ALGUNS TESTES FALHARAM - VERIFICAR IMPLEMENTAÇÃO")
            return False

def main():
    """Função principal"""
    print("Sistema: Caderno de Controle Online — IUDP")
    print("Teste: FINAL COMPLETO - IGREJAS E FUNÇÕES")
    print(f"Data/Hora: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print()
    
    runner = TestRunner()
    success = runner.run_all_tests()
    
    # Código de saída
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()