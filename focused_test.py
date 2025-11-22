#!/usr/bin/env python3
"""
Focused Backend Test - Sistema de Solicitações e Upload de Custos
Testa apenas os endpoints críticos com retry logic
"""

import requests
import json
import base64
import os
import tempfile
import time

# Configuração da API
BASE_URL = "https://caderno-online.preview.emergentagent.com/api"

def create_test_image():
    """Cria uma imagem PNG simples para testes"""
    png_data = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==')
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.png')
    temp_file.write(png_data)
    temp_file.close()
    return temp_file.name

def test_with_retry(func, max_retries=3):
    """Execute test with retry logic"""
    for attempt in range(max_retries):
        try:
            return func()
        except Exception as e:
            if attempt == max_retries - 1:
                raise e
            print(f"   Retry {attempt + 1}/{max_retries} after error: {str(e)}")
            time.sleep(2)

def main():
    print("🎯 TESTE FOCADO - Validação dos Endpoints Críticos")
    print("=" * 60)
    
    # 1. Login Master
    print("\n1️⃣ TESTE: Login Master")
    def login_master():
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "master.teste@iudp.com",
            "password": "MasterTeste2025!"
        })
        if response.status_code == 200:
            return response.json()['token']
        else:
            raise Exception(f"Login failed: {response.status_code}")
    
    master_token = test_with_retry(login_master)
    print("   ✅ Master login successful")
    
    # 2. Login Pastor
    print("\n2️⃣ TESTE: Login Pastor")
    def login_pastor():
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "pastor.teste@iudp.com",
            "password": "PastorTeste2025!"
        })
        if response.status_code == 200:
            return response.json()['token']
        else:
            raise Exception(f"Pastor login failed: {response.status_code}")
    
    pastor_token = test_with_retry(login_pastor)
    print("   ✅ Pastor login successful")
    
    # 3. Upload Cost File
    print("\n3️⃣ TESTE: Upload de Arquivo de Custo")
    def upload_cost_file():
        test_file_path = create_test_image()
        headers = {"Authorization": f"Bearer {pastor_token}"}
        
        with open(test_file_path, 'rb') as f:
            files = {'file': ('test_bill.png', f, 'image/png')}
            data = {'fileType': 'bill'}
            response = requests.post(f"{BASE_URL}/upload/cost-file", 
                                   headers=headers, files=files, data=data)
        
        os.unlink(test_file_path)
        
        if response.status_code == 200:
            return response.json()['filePath']
        else:
            raise Exception(f"Upload failed: {response.status_code} - {response.text}")
    
    file_path = test_with_retry(upload_cost_file)
    print(f"   ✅ Upload successful: {file_path}")
    
    # 4. Serve Cost File
    print("\n4️⃣ TESTE: Servir Arquivo de Custo")
    def serve_cost_file():
        filename = file_path.split('/')[-1]
        response = requests.get(f"{BASE_URL}/uploads/costs/{filename}")
        if response.status_code == 200:
            return response.headers.get('Content-Type', '')
        else:
            raise Exception(f"Serve file failed: {response.status_code}")
    
    content_type = test_with_retry(serve_cost_file)
    print(f"   ✅ File served successfully: {content_type}")
    
    # 5. Create Unlock Request
    print("\n5️⃣ TESTE: Criar Solicitação de Liberação")
    def create_unlock_request():
        headers = {"Authorization": f"Bearer {pastor_token}"}
        request_data = {
            "day": 16,
            "month": 11,
            "year": 2025,
            "timeSlot": "10:00",
            "reason": "Teste de solicitação de liberação"
        }
        response = requests.post(f"{BASE_URL}/unlock/request", 
                               headers=headers, json=request_data)
        if response.status_code == 200:
            return response.json()['message']
        else:
            raise Exception(f"Create unlock request failed: {response.status_code} - {response.text}")
    
    message = test_with_retry(create_unlock_request)
    print(f"   ✅ Unlock request created: {message}")
    
    # 6. List Unlock Requests
    print("\n6️⃣ TESTE: Listar Solicitações Pendentes")
    def list_unlock_requests():
        headers = {"Authorization": f"Bearer {master_token}"}
        response = requests.get(f"{BASE_URL}/unlock/requests", headers=headers)
        if response.status_code == 200:
            return response.json()['requests']
        else:
            raise Exception(f"List unlock requests failed: {response.status_code} - {response.text}")
    
    requests_list = test_with_retry(list_unlock_requests)
    print(f"   ✅ Found {len(requests_list)} pending requests")
    
    # 7. Approve Unlock Request
    if requests_list:
        print("\n7️⃣ TESTE: Aprovar Solicitação de Liberação")
        def approve_unlock_request():
            headers = {"Authorization": f"Bearer {master_token}"}
            approval_data = {
                "requestId": requests_list[0]['requestId'],
                "entryId": None,
                "durationMinutes": 60
            }
            response = requests.post(f"{BASE_URL}/unlock/approve", 
                                   headers=headers, json=approval_data)
            if response.status_code == 200:
                return response.json()['message']
            else:
                raise Exception(f"Approve unlock request failed: {response.status_code} - {response.text}")
        
        approval_message = test_with_retry(approve_unlock_request)
        print(f"   ✅ Request approved: {approval_message}")
    
    # 8. Create Cost Type
    print("\n8️⃣ TESTE: Criar Tipo de Custo")
    def create_cost_type():
        headers = {"Authorization": f"Bearer {master_token}"}
        cost_type_data = {"name": "Energia Elétrica"}
        response = requests.post(f"{BASE_URL}/custos/create", 
                               headers=headers, json=cost_type_data)
        if response.status_code == 200:
            return response.json()['custo']['custoId']
        else:
            raise Exception(f"Create cost type failed: {response.status_code} - {response.text}")
    
    custo_id = test_with_retry(create_cost_type)
    print(f"   ✅ Cost type created: {custo_id}")
    
    # 9. Create Cost Entry
    print("\n9️⃣ TESTE: Criar Lançamento de Custo")
    def create_cost_entry():
        headers = {"Authorization": f"Bearer {pastor_token}"}
        cost_entry_data = {
            "costTypeId": custo_id,
            "costTypeName": "Energia Elétrica",
            "dueDate": "2025-12-15",
            "value": "850.00",
            "billFile": file_path,
            "paymentDate": "2025-12-14",
            "valuePaid": "850.00",
            "proofFile": None
        }
        response = requests.post(f"{BASE_URL}/costs-entries/create", 
                               headers=headers, json=cost_entry_data)
        if response.status_code == 200:
            return response.json()['costEntry']['costId']
        else:
            raise Exception(f"Create cost entry failed: {response.status_code} - {response.text}")
    
    cost_id = test_with_retry(create_cost_entry)
    print(f"   ✅ Cost entry created: {cost_id}")
    
    # 10. List Cost Entries
    print("\n🔟 TESTE: Listar Custos")
    def list_cost_entries():
        headers = {"Authorization": f"Bearer {pastor_token}"}
        list_data = {"status": "PENDING"}
        response = requests.post(f"{BASE_URL}/costs-entries/list", 
                               headers=headers, json=list_data)
        if response.status_code == 200:
            return response.json()['costs']
        else:
            raise Exception(f"List cost entries failed: {response.status_code} - {response.text}")
    
    costs = test_with_retry(list_cost_entries)
    print(f"   ✅ Found {len(costs)} pending costs")
    
    # 11. Approve Cost Entry
    print("\n1️⃣1️⃣ TESTE: Aprovar Custo")
    def approve_cost_entry():
        headers = {"Authorization": f"Bearer {master_token}"}
        approval_data = {"costId": cost_id}
        response = requests.post(f"{BASE_URL}/costs-entries/approve", 
                               headers=headers, json=approval_data)
        if response.status_code == 200:
            return response.json()['message']
        else:
            raise Exception(f"Approve cost entry failed: {response.status_code} - {response.text}")
    
    approval_message = test_with_retry(approve_cost_entry)
    print(f"   ✅ Cost approved: {approval_message}")
    
    print("\n" + "=" * 60)
    print("🎉 TODOS OS TESTES PASSARAM COM SUCESSO!")
    print("✅ Sistema de Solicitações e Upload de Custos FUNCIONANDO 100%")
    print("=" * 60)

if __name__ == "__main__":
    main()