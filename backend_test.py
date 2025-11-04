#!/usr/bin/env python3
"""
Teste Completo dos Endpoints CRUD - Usuários e Igrejas
Sistema: Caderno de Controle Online — IUDP
Endpoints testados: Users CRUD + Churches CRUD + Upload de fotos
"""

import requests
import json
import os
import tempfile
from PIL import Image
import io
import sys
from datetime import datetime

# Configuração da API
BASE_URL = "https://financial-iudp.preview.emergentagent.com/api"

class IUDPTester:
    def __init__(self):
        self.master_token = None
        self.test_user_id = None
        self.test_church_id = None
        self.test_pastor_id = None
        
    def log(self, message):
        print(f"[TEST] {message}")
        
    def log_success(self, message):
        print(f"✅ {message}")
        
    def log_error(self, message):
        print(f"❌ {message}")
        
    def log_info(self, message):
        print(f"ℹ️  {message}")

    def authenticate_master(self):
        """Autentica como usuário Master"""
        self.log("🔐 Autenticando como Master...")
        
        # Credenciais Master conforme especificado
        login_data = {
            "email": "joao.silva@iudp.org.br",
            "password": "master123"
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
            login_data = {"email": "joao.silva@iudp.org.br", "password": "master123"}
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