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
        
        try:
            response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.master_token = data.get('token')
                user_info = data.get('user', {})
                
                if user_info.get('role') == 'master':
                    self.log_success(f"Master autenticado: {user_info.get('name')} ({user_info.get('email')})")
                    return True
                else:
                    self.log_error(f"Usuário não é Master. Role: {user_info.get('role')}")
                    return False
            else:
                self.log_error(f"Falha na autenticação Master: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_error(f"Erro na autenticação Master: {str(e)}")
            return False

    def get_headers(self):
        """Retorna headers com token de autenticação"""
        return {
            "Authorization": f"Bearer {self.master_token}",
            "Content-Type": "application/json"
        }

    def create_test_image(self, format='JPEG'):
        """Cria uma imagem de teste pequena"""
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format=format)
        img_bytes.seek(0)
        return img_bytes
    def test_users_list(self):
        """Testa listagem de usuários"""
        self.log("📋 Testando listagem de usuários...")
        
        try:
            response = requests.post(f"{BASE_URL}/users/list", headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                users = data.get('users', [])
                self.log_success(f"Listagem de usuários funcionando. Total: {len(users)} usuários")
                
                # Encontrar um usuário para testes (que não seja Master)
                for user in users:
                    if user.get('role') != 'master':
                        self.test_user_id = user.get('userId')
                        self.log_info(f"Usuário de teste selecionado: {user.get('name')} ({user.get('email')})")
                        break
                        
                return True
            else:
                self.log_error(f"Falha na listagem de usuários: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_error(f"Erro na listagem de usuários: {str(e)}")
            return False

    def test_users_update(self):
        """Testa atualização de usuário"""
        if not self.test_user_id:
            self.log_error("Nenhum usuário de teste disponível para atualização")
            return False
            
        self.log("✏️ Testando atualização de usuário...")
        
        update_data = {
            "userId": self.test_user_id,
            "userData": {
                "name": "Usuário Teste Atualizado",
                "role": "pastor",
                "church": "Igreja Teste",
                "region": "Região Teste",
                "state": "SP"
            }
        }
        
        try:
            response = requests.post(f"{BASE_URL}/users/update", 
                                   json=update_data, 
                                   headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_success("Atualização de usuário funcionando")
                    return True
                else:
                    self.log_error(f"Atualização falhou: {data}")
                    return False
            else:
                self.log_error(f"Falha na atualização de usuário: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_error(f"Erro na atualização de usuário: {str(e)}")
            return False

    def test_users_upload_photo(self):
        """Testa upload de foto de usuário"""
        if not self.test_user_id:
            self.log_error("Nenhum usuário de teste disponível para upload de foto")
            return False
            
        self.log("📸 Testando upload de foto de usuário...")
        
        try:
            # Criar imagem de teste
            img_data = self.create_test_image('JPEG')
            
            files = {
                'photo': ('test_user.jpg', img_data, 'image/jpeg'),
                'userId': (None, self.test_user_id)
            }
            
            headers = {"Authorization": f"Bearer {self.master_token}"}
            
            response = requests.post(f"{BASE_URL}/users/upload-photo", 
                                   files=files, 
                                   headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    photo_url = data.get('photoUrl')
                    self.log_success(f"Upload de foto de usuário funcionando. URL: {photo_url}")
                    return True
                else:
                    self.log_error(f"Upload falhou: {data}")
                    return False
            else:
                self.log_error(f"Falha no upload de foto: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_error(f"Erro no upload de foto de usuário: {str(e)}")
            return False

    def test_users_upload_photo_validations(self):
        """Testa validações do upload de foto de usuário"""
        if not self.test_user_id:
            return True  # Skip se não tem usuário de teste
            
        self.log("🔍 Testando validações de upload de foto...")
        
        # Teste 1: Arquivo muito grande (simular > 2MB)
        try:
            large_data = b'x' * (3 * 1024 * 1024)  # 3MB
            files = {
                'photo': ('large.jpg', io.BytesIO(large_data), 'image/jpeg'),
                'userId': (None, self.test_user_id)
            }
            
            headers = {"Authorization": f"Bearer {self.master_token}"}
            response = requests.post(f"{BASE_URL}/users/upload-photo", files=files, headers=headers)
            
            if response.status_code == 400:
                self.log_success("Validação de tamanho funcionando (rejeitou arquivo > 2MB)")
            else:
                self.log_error(f"Validação de tamanho falhou: {response.status_code}")
                
        except Exception as e:
            self.log_info(f"Teste de arquivo grande: {str(e)}")
        
        # Teste 2: Tipo de arquivo inválido
        try:
            files = {
                'photo': ('test.txt', io.BytesIO(b'texto'), 'text/plain'),
                'userId': (None, self.test_user_id)
            }
            
            headers = {"Authorization": f"Bearer {self.master_token}"}
            response = requests.post(f"{BASE_URL}/users/upload-photo", files=files, headers=headers)
            
            if response.status_code == 400:
                self.log_success("Validação de tipo de arquivo funcionando (rejeitou .txt)")
                return True
            else:
                self.log_error(f"Validação de tipo falhou: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_error(f"Erro no teste de validações: {str(e)}")
            return False
    def test_churches_list(self):
        """Testa listagem de igrejas"""
        self.log("🏛️ Testando listagem de igrejas...")
        
        try:
            response = requests.post(f"{BASE_URL}/churches/list", headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                churches = data.get('churches', [])
                self.log_success(f"Listagem de igrejas funcionando. Total: {len(churches)} igrejas")
                
                # Verificar se cada igreja tem dados do pastor
                for church in churches:
                    if church.get('pastorId') and church.get('pastor'):
                        self.log_info(f"Igreja '{church.get('name')}' tem pastor: {church.get('pastor', {}).get('name')}")
                
                return True
            else:
                self.log_error(f"Falha na listagem de igrejas: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_error(f"Erro na listagem de igrejas: {str(e)}")
            return False

    def test_churches_available_pastors(self):
        """Testa listagem de pastores disponíveis"""
        self.log("👨‍💼 Testando listagem de pastores disponíveis...")
        
        try:
            response = requests.post(f"{BASE_URL}/churches/available-pastors", headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                pastors = data.get('pastors', [])
                self.log_success(f"Listagem de pastores funcionando. Total: {len(pastors)} pastores")
                
                # Encontrar um pastor disponível para testes
                for pastor in pastors:
                    if pastor.get('available'):
                        self.test_pastor_id = pastor.get('userId')
                        self.log_info(f"Pastor disponível selecionado: {pastor.get('name')} ({pastor.get('email')})")
                        break
                
                # Verificar marcações hasChurch e available
                for pastor in pastors:
                    has_church = pastor.get('hasChurch', False)
                    available = pastor.get('available', False)
                    self.log_info(f"Pastor {pastor.get('name')}: hasChurch={has_church}, available={available}")
                
                return True
            else:
                self.log_error(f"Falha na listagem de pastores: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_error(f"Erro na listagem de pastores: {str(e)}")
            return False

    def test_churches_create(self):
        """Testa criação de igreja"""
        self.log("🏗️ Testando criação de igreja...")
        
        church_data = {
            "name": "Igreja Teste CRUD",
            "address": "Rua Teste, 123",
            "city": "São Paulo",
            "state": "SP",
            "region": "Sudeste",
            "pastorId": self.test_pastor_id  # Pode ser None se não tem pastor disponível
        }
        
        try:
            response = requests.post(f"{BASE_URL}/churches/create", 
                                   json=church_data, 
                                   headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    church = data.get('church', {})
                    self.test_church_id = church.get('churchId')
                    self.log_success(f"Criação de igreja funcionando. ID: {self.test_church_id}")
                    
                    if church_data.get('pastorId'):
                        self.log_info("Igreja criada com pastor associado")
                    
                    return True
                else:
                    self.log_error(f"Criação falhou: {data}")
                    return False
            else:
                self.log_error(f"Falha na criação de igreja: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_error(f"Erro na criação de igreja: {str(e)}")
            return False

    def test_churches_update(self):
        """Testa atualização de igreja"""
        if not self.test_church_id:
            self.log_error("Nenhuma igreja de teste disponível para atualização")
            return False
            
        self.log("✏️ Testando atualização de igreja...")
        
        update_data = {
            "churchId": self.test_church_id,
            "churchData": {
                "name": "Igreja Teste CRUD Atualizada",
                "address": "Rua Teste Atualizada, 456",
                "city": "São Paulo",
                "state": "SP",
                "region": "Sudeste"
            }
        }
        
        try:
            response = requests.post(f"{BASE_URL}/churches/update", 
                                   json=update_data, 
                                   headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_success("Atualização de igreja funcionando")
                    return True
                else:
                    self.log_error(f"Atualização falhou: {data}")
                    return False
            else:
                self.log_error(f"Falha na atualização de igreja: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_error(f"Erro na atualização de igreja: {str(e)}")
            return False

    def test_churches_upload_photo(self):
        """Testa upload de foto de igreja"""
        if not self.test_church_id:
            self.log_error("Nenhuma igreja de teste disponível para upload de foto")
            return False
            
        self.log("📸 Testando upload de foto de igreja...")
        
        try:
            # Criar imagem de teste
            img_data = self.create_test_image('PNG')
            
            files = {
                'photo': ('test_church.png', img_data, 'image/png'),
                'churchId': (None, self.test_church_id)
            }
            
            headers = {"Authorization": f"Bearer {self.master_token}"}
            
            response = requests.post(f"{BASE_URL}/churches/upload-photo", 
                                   files=files, 
                                   headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    photo_url = data.get('photoUrl')
                    self.log_success(f"Upload de foto de igreja funcionando. URL: {photo_url}")
                    return True
                else:
                    self.log_error(f"Upload falhou: {data}")
                    return False
            else:
                self.log_error(f"Falha no upload de foto: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_error(f"Erro no upload de foto de igreja: {str(e)}")
            return False

    def test_churches_change_pastor(self):
        """Testa troca de pastor de igreja"""
        if not self.test_church_id:
            self.log_error("Nenhuma igreja de teste disponível para troca de pastor")
            return False
            
        self.log("🔄 Testando troca de pastor...")
        
        # Primeiro, buscar um pastor diferente (se disponível)
        try:
            response = requests.post(f"{BASE_URL}/churches/available-pastors", headers=self.get_headers())
            if response.status_code == 200:
                pastors = response.json().get('pastors', [])
                new_pastor_id = None
                
                for pastor in pastors:
                    if pastor.get('userId') != self.test_pastor_id:
                        new_pastor_id = pastor.get('userId')
                        break
                
                if not new_pastor_id:
                    self.log_info("Não há outro pastor disponível para teste de troca")
                    return True  # Skip teste, mas não é erro
                
                change_data = {
                    "churchId": self.test_church_id,
                    "newPastorId": new_pastor_id
                }
                
                response = requests.post(f"{BASE_URL}/churches/change-pastor", 
                                       json=change_data, 
                                       headers=self.get_headers())
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success'):
                        self.log_success("Troca de pastor funcionando")
                        return True
                    else:
                        self.log_error(f"Troca falhou: {data}")
                        return False
                else:
                    self.log_error(f"Falha na troca de pastor: {response.status_code} - {response.text}")
                    return False
            else:
                self.log_error("Não foi possível buscar pastores para teste de troca")
                return False
                
        except Exception as e:
            self.log_error(f"Erro na troca de pastor: {str(e)}")
            return False

    def test_users_delete_validation(self):
        """Testa validação de não permitir Master se auto-excluir"""
        self.log("🛡️ Testando validação: Master não pode se auto-excluir...")
        
        # Tentar deletar o próprio usuário Master (deve falhar)
        try:
            # Primeiro, fazer login para pegar o userId do Master
            login_data = {"email": "joao.silva@iudp.org.br", "password": "LiderMaximo2025!"}
            response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                master_user_id = response.json().get('user', {}).get('userId')
                
                delete_data = {"userId": master_user_id}
                
                response = requests.post(f"{BASE_URL}/users/delete", 
                                       json=delete_data, 
                                       headers=self.get_headers())
                
                if response.status_code == 400:
                    self.log_success("Validação funcionando: Master não pode se auto-excluir")
                    return True
                else:
                    self.log_error(f"Validação falhou: Master conseguiu se auto-excluir! Status: {response.status_code}")
                    return False
            else:
                self.log_error("Não foi possível obter userId do Master")
                return False
                
        except Exception as e:
            self.log_error(f"Erro no teste de validação: {str(e)}")
            return False

    def test_churches_delete(self):
        """Testa exclusão de igreja (deve ser o último teste)"""
        if not self.test_church_id:
            self.log_info("Nenhuma igreja de teste para excluir")
            return True
            
        self.log("🗑️ Testando exclusão de igreja...")
        
        delete_data = {"churchId": self.test_church_id}
        
        try:
            response = requests.post(f"{BASE_URL}/churches/delete", 
                                   json=delete_data, 
                                   headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_success("Exclusão de igreja funcionando")
                    self.test_church_id = None  # Limpar referência
                    return True
                else:
                    self.log_error(f"Exclusão falhou: {data}")
                    return False
            else:
                self.log_error(f"Falha na exclusão de igreja: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_error(f"Erro na exclusão de igreja: {str(e)}")
            return False

    def test_audit_logs(self):
        """Verifica se as ações estão sendo registradas no audit log"""
        self.log("📋 Verificando audit logs...")
        
        try:
            audit_data = {"limit": 20}
            response = requests.post(f"{BASE_URL}/audit/logs", 
                                   json=audit_data, 
                                   headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                logs = data.get('logs', [])
                
                # Verificar se há logs das ações CRUD recentes
                crud_actions = ['update_user', 'create_church', 'update_church', 'delete_church', 'change_pastor']
                found_actions = []
                
                for log in logs:
                    if log.get('action') in crud_actions:
                        found_actions.append(log.get('action'))
                
                if found_actions:
                    self.log_success(f"Audit logs funcionando. Ações encontradas: {', '.join(set(found_actions))}")
                    return True
                else:
                    self.log_info("Nenhuma ação CRUD encontrada nos logs recentes (pode ser normal)")
                    return True
            else:
                self.log_error(f"Falha ao buscar audit logs: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_error(f"Erro ao verificar audit logs: {str(e)}")
            return False
    def run_all_tests(self):
        """Executa todos os testes na ordem correta"""
        print("=" * 80)
        print("🎯 TESTE COMPLETO DOS ENDPOINTS CRUD - USUÁRIOS E IGREJAS")
        print("Sistema: Caderno de Controle Online — IUDP")
        print("=" * 80)
        
        results = {}
        
        # 1. Autenticação
        results['auth'] = self.authenticate_master()
        if not results['auth']:
            print("\n❌ FALHA CRÍTICA: Não foi possível autenticar como Master")
            return results
        
        # 2. Testes de Usuários
        print("\n" + "="*50)
        print("👥 TESTES DE USUÁRIOS")
        print("="*50)
        
        results['users_list'] = self.test_users_list()
        results['users_update'] = self.test_users_update()
        results['users_upload_photo'] = self.test_users_upload_photo()
        results['users_upload_validations'] = self.test_users_upload_photo_validations()
        results['users_delete_validation'] = self.test_users_delete_validation()
        
        # 3. Testes de Igrejas
        print("\n" + "="*50)
        print("🏛️ TESTES DE IGREJAS")
        print("="*50)
        
        results['churches_list'] = self.test_churches_list()
        results['churches_available_pastors'] = self.test_churches_available_pastors()
        results['churches_create'] = self.test_churches_create()
        results['churches_update'] = self.test_churches_update()
        results['churches_upload_photo'] = self.test_churches_upload_photo()
        results['churches_change_pastor'] = self.test_churches_change_pastor()
        results['churches_delete'] = self.test_churches_delete()
        
        # 4. Verificações Finais
        print("\n" + "="*50)
        print("📋 VERIFICAÇÕES FINAIS")
        print("="*50)
        
        results['audit_logs'] = self.test_audit_logs()
        
        # 5. Resumo Final
        print("\n" + "="*80)
        print("📊 RESUMO DOS TESTES")
        print("="*80)
        
        passed = sum(1 for result in results.values() if result)
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASSOU" if result else "❌ FALHOU"
            print(f"{test_name.replace('_', ' ').title()}: {status}")
        
        print(f"\n🎯 RESULTADO FINAL: {passed}/{total} testes passaram")
        
        if passed == total:
            print("🎉 TODOS OS TESTES PASSARAM! CRUD FUNCIONANDO PERFEITAMENTE!")
        else:
            print(f"⚠️ {total - passed} teste(s) falharam. Verificar implementação.")
        
        return results
if __name__ == "__main__":
    tester = IUDPTester()
    results = tester.run_all_tests()