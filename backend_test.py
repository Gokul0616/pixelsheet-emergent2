#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class UltimatePixelSheetsAPITester:
    def __init__(self, base_url="http://localhost:5000"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.spreadsheet_id = None
        self.sheet_id = None
        self.access_token = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}
        
        # Add authorization header if we have a token
        if self.access_token and not endpoint.startswith('api/auth/'):
            headers['Authorization'] = f'Bearer {self.access_token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, list):
                        print(f"   Response: Array with {len(response_data)} items")
                    elif isinstance(response_data, dict):
                        print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    print(f"   Response: {response.text[:100]}...")
                    return True, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_authentication(self):
        """Test authentication with demo credentials"""
        print("\n🔐 Testing Authentication...")
        
        # Test login with demo user
        login_data = {
            "email": "demo@pixelsheets.com",
            "password": "demo123"
        }
        
        success, response = self.run_test(
            "Login with Demo User",
            "POST",
            "api/auth/login",
            200,
            data=login_data
        )
        
        if success and 'tokens' in response:
            self.access_token = response['tokens']['accessToken']
            print(f"   ✅ Authentication successful, token obtained")
            return True
        else:
            print(f"   ❌ Authentication failed")
            return False

    def test_spreadsheets_api(self):
        """Test spreadsheet CRUD operations"""
        print("\n📊 Testing Spreadsheet API...")
        
        # Test GET spreadsheets
        success, spreadsheets = self.run_test(
            "Get Spreadsheets",
            "GET",
            "api/spreadsheets",
            200
        )
        
        if success and spreadsheets:
            self.spreadsheet_id = spreadsheets[0]['id'] if spreadsheets else None
            print(f"   Found {len(spreadsheets)} spreadsheets")
        
        # Test GET specific spreadsheet
        if self.spreadsheet_id:
            success, spreadsheet = self.run_test(
                "Get Specific Spreadsheet",
                "GET",
                f"api/spreadsheets/{self.spreadsheet_id}",
                200
            )
            
            if success:
                print(f"   Spreadsheet name: {spreadsheet.get('name', 'Unknown')}")
        
        # Test CREATE spreadsheet
        new_spreadsheet_data = {
            "name": f"Test Spreadsheet {datetime.now().strftime('%H%M%S')}",
            "ownerId": 1,
            "isPublic": False
        }
        
        success, new_spreadsheet = self.run_test(
            "Create Spreadsheet",
            "POST",
            "api/spreadsheets",
            200,
            data=new_spreadsheet_data
        )
        
        if success and 'id' in new_spreadsheet:
            test_spreadsheet_id = new_spreadsheet['id']
            print(f"   Created spreadsheet with ID: {test_spreadsheet_id}")
            
            # Test UPDATE spreadsheet
            update_data = {"name": "Updated Test Spreadsheet"}
            success, updated = self.run_test(
                "Update Spreadsheet",
                "PUT",
                f"api/spreadsheets/{test_spreadsheet_id}",
                200,
                data=update_data
            )

    def test_sheets_api(self):
        """Test sheet CRUD operations"""
        print("\n📋 Testing Sheets API...")
        
        if not self.spreadsheet_id:
            print("❌ No spreadsheet ID available for sheet tests")
            return
        
        # Test GET sheets
        success, sheets = self.run_test(
            "Get Sheets",
            "GET",
            f"api/spreadsheets/{self.spreadsheet_id}/sheets",
            200
        )
        
        if success and sheets:
            self.sheet_id = sheets[0]['id'] if sheets else None
            print(f"   Found {len(sheets)} sheets")
        
        # Test CREATE sheet
        new_sheet_data = {
            "name": f"Test Sheet {datetime.now().strftime('%H%M%S')}",
            "index": 1
        }
        
        success, new_sheet = self.run_test(
            "Create Sheet",
            "POST",
            f"api/spreadsheets/{self.spreadsheet_id}/sheets",
            200,
            data=new_sheet_data
        )
        
        if success and 'id' in new_sheet:
            test_sheet_id = new_sheet['id']
            print(f"   Created sheet with ID: {test_sheet_id}")
            
            # Test UPDATE sheet
            update_data = {"name": "Updated Test Sheet"}
            success, updated = self.run_test(
                "Update Sheet",
                "PUT",
                f"api/sheets/{test_sheet_id}",
                200,
                data=update_data
            )
            
            # Test DELETE sheet
            success, deleted = self.run_test(
                "Delete Sheet",
                "DELETE",
                f"api/sheets/{test_sheet_id}",
                200
            )

    def test_cells_api(self):
        """Test cell operations"""
        print("\n🔢 Testing Cells API...")
        
        if not self.sheet_id:
            print("❌ No sheet ID available for cell tests")
            return
        
        # Test GET cells
        success, cells = self.run_test(
            "Get Cells",
            "GET",
            f"api/sheets/{self.sheet_id}/cells",
            200
        )
        
        if success:
            print(f"   Found {len(cells)} cells")
        
        # Test UPDATE cell
        cell_data = {
            "value": "Test Value",
            "dataType": "text"
        }
        
        success, cell = self.run_test(
            "Update Cell",
            "PUT",
            f"api/sheets/{self.sheet_id}/cells/1/1",
            200,
            data=cell_data
        )
        
        # Test formula cell
        formula_data = {
            "value": "=B1+B2",
            "formula": "=B1+B2",
            "dataType": "formula"
        }
        
        success, formula_cell = self.run_test(
            "Update Formula Cell",
            "PUT",
            f"api/sheets/{self.sheet_id}/cells/2/2",
            200,
            data=formula_data
        )

    def test_activities_api(self):
        """Test activities API"""
        print("\n📝 Testing Activities API...")
        
        if not self.spreadsheet_id:
            print("❌ No spreadsheet ID available for activities tests")
            return
        
        success, activities = self.run_test(
            "Get Activities",
            "GET",
            f"api/spreadsheets/{self.spreadsheet_id}/activities",
            200
        )
        
        if success:
            print(f"   Found {len(activities)} activities")

    def test_collaborators_api(self):
        """Test collaborators API"""
        print("\n👥 Testing Collaborators API...")
        
        if not self.spreadsheet_id:
            print("❌ No spreadsheet ID available for collaborators tests")
            return
        
        success, collaborators = self.run_test(
            "Get Collaborators",
            "GET",
            f"api/spreadsheets/{self.spreadsheet_id}/collaborators",
            200
        )
        
        if success:
            print(f"   Found {len(collaborators)} collaborators")

    def test_export_api(self):
        """Test export functionality"""
        print("\n📤 Testing Export API...")
        
        if not self.spreadsheet_id:
            print("❌ No spreadsheet ID available for export tests")
            return
        
        success, csv_data = self.run_test(
            "Export CSV",
            "GET",
            f"api/spreadsheets/{self.spreadsheet_id}/export/csv",
            200
        )
        
        if success:
            print(f"   CSV export successful, data length: {len(str(csv_data))}")

    def test_comments_api(self):
        """Test comments API"""
        print("\n💬 Testing Comments API...")
        
        # Test GET comments for a cell (using cell ID 1)
        success, comments = self.run_test(
            "Get Comments",
            "GET",
            "api/cells/1/comments",
            200
        )
        
        if success:
            print(f"   Found {len(comments)} comments")
        
        # Test CREATE comment
        comment_data = {
            "content": "This is a test comment",
            "userId": 1
        }
        
        success, comment = self.run_test(
            "Create Comment",
            "POST",
            "api/cells/1/comments",
            200,
            data=comment_data
        )

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Ultimate Pixel Sheets API Tests...")
        print(f"Testing against: {self.base_url}")
        
        # Test basic connectivity
        try:
            response = requests.get(f"{self.base_url}/api/spreadsheets", timeout=5)
            print(f"✅ Server is responding (Status: {response.status_code})")
        except Exception as e:
            print(f"❌ Server connection failed: {str(e)}")
            return 1
        
        # Run all test suites
        self.test_spreadsheets_api()
        self.test_sheets_api()
        self.test_cells_api()
        self.test_activities_api()
        self.test_collaborators_api()
        self.test_export_api()
        self.test_comments_api()
        
        # Print final results
        print(f"\n📊 Test Results:")
        print(f"   Tests run: {self.tests_run}")
        print(f"   Tests passed: {self.tests_passed}")
        print(f"   Tests failed: {self.tests_run - self.tests_passed}")
        print(f"   Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        return 0 if self.tests_passed == self.tests_run else 1

def main():
    tester = UltimatePixelSheetsAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())