#!/usr/bin/env python3
"""
Backend Test Suite - Sistema de Solicitações e Upload de Custos
Testa os endpoints críticos implementados recentemente
"""

import requests
import json
import base64
import os
import tempfile
from datetime import datetime, timedelta

# Configuração da API
BASE_URL = "https://iudp-control.preview.emergentagent.com/api"

# Credenciais de teste
MASTER_EMAIL = "joao.silva@iudp.org.br"
MASTER_PASSWORD = "LiderMaximo2025!"

class BackendTester:
    def __init__(self):
        self.master_token = None
        self.pastor_token = None
        self.pastor_user = None
        self.test_results = []
        
    def log_result(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASSOU" if success else "❌ FALHOU"
        print(f"{status} - {test_name}")
        if details:
            print(f"   {details}")
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details
        })
        
    def login_master(self):
        """Login como Master"""
        try:
            # Primeiro tentar com as credenciais fornecidas
            response = requests.post(f"{BASE_URL}/auth/login", json={
                "email": MASTER_EMAIL,
                "password": MASTER_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.master_token = data['token']
                self.log_result("Master Login", True, f"Token obtido para {data['user']['name']}")
                return True
            else:
                # Se falhar, tentar criar um usuário master de teste
                self.log_result("Master Login (original)", False, f"Status: {response.status_code}")
                return self.create_test_master()
                
        except Exception as e:
            self.log_result("Master Login", False, f"Erro: {str(e)}")
            return False
    
    def create_test_master(self):
        """Cria um usuário master de teste"""
        try:
            # Registrar master de teste
            master_data = {
                "name": "Master Teste",
                "email": "master.teste@iudp.com",
                "password": "MasterTeste2025!",
                "role": "master",
                "church": "",
                "state": "SP",
                "cidade": "São Paulo",
                "pais": "Brasil"
            }
            
            reg_response = requests.post(f"{BASE_URL}/auth/register", json=master_data)
            
            if reg_response.status_code == 200:
                # Fazer login com o master criado
                login_response = requests.post(f"{BASE_URL}/auth/login", json={
                    "email": "master.teste@iudp.com",
                    "password": "MasterTeste2025!"
                })
                
                if login_response.status_code == 200:
                    data = login_response.json()
                    self.master_token = data['token']
                    self.log_result("Create Test Master", True, f"Master criado: {data['user']['name']}")
                    return True
            
            self.log_result("Create Test Master", False, "Não foi possível criar master de teste")
            return False
            
        except Exception as e:
            self.log_result("Create Test Master", False, f"Erro: {str(e)}")
            return False
    
    def find_pastor_user(self):
        """Encontra um usuário Pastor para testes"""
        try:
            # Primeiro, vamos listar igrejas para encontrar pastores
            headers = {"Authorization": f"Bearer {self.master_token}"}
            response = requests.post(f"{BASE_URL}/churches/list", headers=headers)
            
            if response.status_code == 200:
                churches = response.json().get('churches', [])
                for church in churches:
                    if church.get('pastor'):
                        pastor = church['pastor']
                        # Tentar fazer login com email do pastor
                        # Como não temos a senha, vamos criar um usuário de teste
                        break
                        
            # Criar usuário pastor de teste se necessário
            self.create_test_pastor()
            return True
            
        except Exception as e:
            self.log_result("Find Pastor User", False, f"Erro: {str(e)}")
            return False
    
    def create_test_pastor(self):
        """Cria um usuário pastor de teste"""
        try:
            # Primeiro, listar igrejas disponíveis
            headers = {"Authorization": f"Bearer {self.master_token}"}
            response = requests.post(f"{BASE_URL}/churches/list", headers=headers)
            
            if response.status_code == 200:
                churches = response.json().get('churches', [])
                if churches:
                    church = churches[0]  # Usar primeira igreja
                    
                    # Registrar pastor de teste
                    pastor_data = {
                        "name": "Pastor Teste",
                        "email": "pastor.teste@iudp.com",
                        "password": "PastorTeste2025!",
                        "role": "pastor",
                        "church": church['name'],
                        "churchId": church['churchId'],
                        "state": church.get('state', 'SP'),
                        "cidade": church.get('city', 'São Paulo'),
                        "pais": "Brasil"
                    }
                    
                    reg_response = requests.post(f"{BASE_URL}/auth/register", json=pastor_data)
                    
                    if reg_response.status_code == 200:
                        # Fazer login com o pastor criado
                        login_response = requests.post(f"{BASE_URL}/auth/login", json={
                            "email": "pastor.teste@iudp.com",
                            "password": "PastorTeste2025!"
                        })
                        
                        if login_response.status_code == 200:
                            data = login_response.json()
                            self.pastor_token = data['token']
                            self.pastor_user = data['user']
                            self.log_result("Create Test Pastor", True, f"Pastor criado: {data['user']['name']}")
                            return True
                    
            self.log_result("Create Test Pastor", False, "Não foi possível criar pastor de teste")
            return False
            
        except Exception as e:
            self.log_result("Create Test Pastor", False, f"Erro: {str(e)}")
            return False
    
    def create_test_image(self):
        """Cria uma imagem PNG simples para testes"""
        # Imagem PNG 1x1 pixel vermelho em base64
        png_data = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==')
        
        # Salvar em arquivo temporário
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.png')
        temp_file.write(png_data)
        temp_file.close()
        
        return temp_file.name
    
    def test_upload_cost_file(self):
        """Teste 1: Upload de arquivo de custo"""
        try:
            if not self.pastor_token:
                self.log_result("Upload Cost File", False, "Pastor token não disponível")
                return None
                
            # Criar arquivo de teste
            test_file_path = self.create_test_image()
            
            headers = {"Authorization": f"Bearer {self.pastor_token}"}
            
            with open(test_file_path, 'rb') as f:
                files = {'file': ('test_bill.png', f, 'image/png')}
                data = {'fileType': 'bill'}
                
                response = requests.post(f"{BASE_URL}/upload/cost-file", 
                                       headers=headers, files=files, data=data)
            
            # Limpar arquivo temporário
            os.unlink(test_file_path)
            
            if response.status_code == 200:
                result = response.json()
                file_path = result.get('filePath')
                self.log_result("Upload Cost File", True, 
                               f"Arquivo enviado: {result.get('fileName')}, Path: {file_path}")
                return file_path
            else:
                self.log_result("Upload Cost File", False, 
                               f"Status: {response.status_code}, Response: {response.text}")
                return None
                
        except Exception as e:
            self.log_result("Upload Cost File", False, f"Erro: {str(e)}")
            return None
    
    def test_serve_cost_file(self, file_path):
        """Teste 2: Servir arquivo de custo"""
        try:
            if not file_path:
                self.log_result("Serve Cost File", False, "Caminho do arquivo não disponível")
                return False
                
            # Extrair filename do path
            filename = file_path.split('/')[-1]
            
            response = requests.get(f"{BASE_URL}/uploads/costs/{filename}")
            
            if response.status_code == 200:
                content_type = response.headers.get('Content-Type', '')
                self.log_result("Serve Cost File", True, 
                               f"Arquivo servido: {filename}, Content-Type: {content_type}")
                return True
            else:
                self.log_result("Serve Cost File", False, 
                               f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Serve Cost File", False, f"Erro: {str(e)}")
            return False
    
    def test_create_unlock_request(self):
        """Teste 3: Criar solicitação de liberação"""
        try:
            if not self.pastor_token:
                self.log_result("Create Unlock Request", False, "Pastor token não disponível")
                return None
                
            headers = {"Authorization": f"Bearer {self.pastor_token}"}
            
            # Dados da solicitação
            request_data = {
                "day": 15,
                "month": 11,
                "year": 2025,
                "timeSlot": "08:00",
                "reason": "Esqueci de lançar a oferta no dia"
            }
            
            response = requests.post(f"{BASE_URL}/unlock/request", 
                                   headers=headers, json=request_data)
            
            if response.status_code == 200:
                result = response.json()
                self.log_result("Create Unlock Request", True, 
                               f"Solicitação criada: {result.get('message')}")
                return True
            else:
                self.log_result("Create Unlock Request", False, 
                               f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Create Unlock Request", False, f"Erro: {str(e)}")
            return False
    
    def test_list_unlock_requests(self):
        """Teste 4: Listar solicitações pendentes (Master)"""
        try:
            if not self.master_token:
                self.log_result("List Unlock Requests", False, "Master token não disponível")
                return None
                
            headers = {"Authorization": f"Bearer {self.master_token}"}
            
            response = requests.get(f"{BASE_URL}/unlock/requests", headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                requests_list = result.get('requests', [])
                self.log_result("List Unlock Requests", True, 
                               f"Encontradas {len(requests_list)} solicitações pendentes")
                return requests_list
            else:
                self.log_result("List Unlock Requests", False, 
                               f"Status: {response.status_code}, Response: {response.text}")
                return None
                
        except Exception as e:
            self.log_result("List Unlock Requests", False, f"Erro: {str(e)}")
            return None
    
    def test_approve_unlock_request(self, requests_list):
        """Teste 5: Aprovar solicitação de liberação"""
        try:
            if not self.master_token:
                self.log_result("Approve Unlock Request", False, "Master token não disponível")
                return False
                
            if not requests_list or len(requests_list) == 0:
                self.log_result("Approve Unlock Request", False, "Nenhuma solicitação disponível para aprovar")
                return False
                
            headers = {"Authorization": f"Bearer {self.master_token}"}
            
            # Pegar primeira solicitação
            request_to_approve = requests_list[0]
            
            approval_data = {
                "requestId": request_to_approve['requestId'],
                "entryId": None,  # Para slot vazio
                "durationMinutes": 60
            }
            
            response = requests.post(f"{BASE_URL}/unlock/approve", 
                                   headers=headers, json=approval_data)
            
            if response.status_code == 200:
                result = response.json()
                self.log_result("Approve Unlock Request", True, 
                               f"Solicitação aprovada: {result.get('message')}")
                return True
            else:
                self.log_result("Approve Unlock Request", False, 
                               f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Approve Unlock Request", False, f"Erro: {str(e)}")
            return False
    
    def test_create_cost_type(self):
        """Teste 6: Criar tipo de custo (Master)"""
        try:
            if not self.master_token:
                self.log_result("Create Cost Type", False, "Master token não disponível")
                return None
                
            headers = {"Authorization": f"Bearer {self.master_token}"}
            
            cost_type_data = {
                "name": "Aluguel"
            }
            
            response = requests.post(f"{BASE_URL}/custos/create", 
                                   headers=headers, json=cost_type_data)
            
            if response.status_code == 200:
                result = response.json()
                custo_id = result.get('custo', {}).get('custoId')
                self.log_result("Create Cost Type", True, 
                               f"Tipo de custo criado: {result.get('custo', {}).get('name')}, ID: {custo_id}")
                return custo_id
            else:
                self.log_result("Create Cost Type", False, 
                               f"Status: {response.status_code}, Response: {response.text}")
                return None
                
        except Exception as e:
            self.log_result("Create Cost Type", False, f"Erro: {str(e)}")
            return None
    
    def test_create_cost_entry(self, custo_id, bill_file_path):
        """Teste 7: Criar lançamento de custo (Pastor)"""
        try:
            if not self.pastor_token:
                self.log_result("Create Cost Entry", False, "Pastor token não disponível")
                return None
                
            if not custo_id:
                self.log_result("Create Cost Entry", False, "Custo ID não disponível")
                return None
                
            headers = {"Authorization": f"Bearer {self.pastor_token}"}
            
            cost_entry_data = {
                "costTypeId": custo_id,
                "costTypeName": "Aluguel",
                "dueDate": "2025-11-30",
                "value": "1500.00",
                "billFile": bill_file_path,
                "paymentDate": "2025-11-29",
                "valuePaid": "1500.00",
                "proofFile": None
            }
            
            response = requests.post(f"{BASE_URL}/costs-entries/create", 
                                   headers=headers, json=cost_entry_data)
            
            if response.status_code == 200:
                result = response.json()
                cost_id = result.get('costEntry', {}).get('costId')
                self.log_result("Create Cost Entry", True, 
                               f"Custo criado: {result.get('costEntry', {}).get('costTypeName')}, ID: {cost_id}")
                return cost_id
            else:
                self.log_result("Create Cost Entry", False, 
                               f"Status: {response.status_code}, Response: {response.text}")
                return None
                
        except Exception as e:
            self.log_result("Create Cost Entry", False, f"Erro: {str(e)}")
            return None
    
    def test_list_cost_entries(self):
        """Teste 8: Listar custos (Pastor)"""
        try:
            if not self.pastor_token:
                self.log_result("List Cost Entries", False, "Pastor token não disponível")
                return None
                
            headers = {"Authorization": f"Bearer {self.pastor_token}"}
            
            list_data = {
                "status": "PENDING"
            }
            
            response = requests.post(f"{BASE_URL}/costs-entries/list", 
                                   headers=headers, json=list_data)
            
            if response.status_code == 200:
                result = response.json()
                costs = result.get('costs', [])
                self.log_result("List Cost Entries", True, 
                               f"Encontrados {len(costs)} custos pendentes")
                return costs
            else:
                self.log_result("List Cost Entries", False, 
                               f"Status: {response.status_code}, Response: {response.text}")
                return None
                
        except Exception as e:
            self.log_result("List Cost Entries", False, f"Erro: {str(e)}")
            return None
    
    def test_approve_cost_entry(self, cost_id):
        """Teste 9: Aprovar custo (Master)"""
        try:
            if not self.master_token:
                self.log_result("Approve Cost Entry", False, "Master token não disponível")
                return False
                
            if not cost_id:
                self.log_result("Approve Cost Entry", False, "Cost ID não disponível")
                return False
                
            headers = {"Authorization": f"Bearer {self.master_token}"}
            
            approval_data = {
                "costId": cost_id
            }
            
            response = requests.post(f"{BASE_URL}/costs-entries/approve", 
                                   headers=headers, json=approval_data)
            
            if response.status_code == 200:
                result = response.json()
                self.log_result("Approve Cost Entry", True, 
                               f"Custo aprovado: {result.get('message')}")
                return True
            else:
                self.log_result("Approve Cost Entry", False, 
                               f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Approve Cost Entry", False, f"Erro: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Executa todos os testes"""
        print("🚀 INICIANDO TESTES COMPLETOS - Sistema de Solicitações e Upload de Custos")
        print("=" * 80)
        
        # 1. Login Master
        if not self.login_master():
            print("❌ Falha crítica: Não foi possível fazer login como Master")
            return
        
        # 2. Configurar usuário Pastor
        if not self.find_pastor_user():
            print("❌ Falha crítica: Não foi possível configurar usuário Pastor")
            return
        
        print("\n📋 CENÁRIO 1: TESTE DE UPLOAD DE ARQUIVOS DE CUSTOS")
        print("-" * 60)
        
        # 3. Upload de arquivo de custo
        bill_file_path = self.test_upload_cost_file()
        
        # 4. Servir arquivo de custo
        self.test_serve_cost_file(bill_file_path)
        
        print("\n📋 CENÁRIO 2: TESTE DE SOLICITAÇÕES DE LIBERAÇÃO")
        print("-" * 60)
        
        # 5. Criar solicitação de liberação
        self.test_create_unlock_request()
        
        # 6. Listar solicitações pendentes
        requests_list = self.test_list_unlock_requests()
        
        # 7. Aprovar solicitação
        self.test_approve_unlock_request(requests_list)
        
        print("\n📋 CENÁRIO 3: TESTE DO FLUXO COMPLETO DE CUSTOS")
        print("-" * 60)
        
        # 8. Criar tipo de custo
        custo_id = self.test_create_cost_type()
        
        # 9. Criar lançamento de custo
        cost_id = self.test_create_cost_entry(custo_id, bill_file_path)
        
        # 10. Listar custos
        self.test_list_cost_entries()
        
        # 11. Aprovar custo
        self.test_approve_cost_entry(cost_id)
        
        # Resumo final
        self.print_summary()
    
    def print_summary(self):
        """Imprime resumo dos testes"""
        print("\n" + "=" * 80)
        print("📊 RESUMO DOS TESTES")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        
        print(f"✅ Testes Passaram: {passed}")
        print(f"❌ Testes Falharam: {total - passed}")
        print(f"📈 Taxa de Sucesso: {(passed/total)*100:.1f}%")
        
        if total - passed > 0:
            print("\n❌ TESTES QUE FALHARAM:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   • {result['test']}: {result['details']}")
        
        print("\n🎯 VALIDAÇÕES CRÍTICAS:")
        critical_tests = [
            "Upload Cost File",
            "Serve Cost File", 
            "Create Unlock Request",
            "List Unlock Requests",
            "Approve Unlock Request",
            "Create Cost Type",
            "Create Cost Entry",
            "List Cost Entries",
            "Approve Cost Entry"
        ]
        
        for test_name in critical_tests:
            result = next((r for r in self.test_results if r['test'] == test_name), None)
            if result:
                status = "✅" if result['success'] else "❌"
                print(f"   {status} {test_name}")
        
        overall_success = passed == total
        print(f"\n🏆 RESULTADO GERAL: {'✅ TODOS OS TESTES PASSARAM' if overall_success else '❌ ALGUNS TESTES FALHARAM'}")

if __name__ == "__main__":
    tester = BackendTester()
    tester.run_all_tests()