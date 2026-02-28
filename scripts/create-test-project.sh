#!/bin/bash

# Script to create sample test projects for testing the ArchView extension

set -e

echo "Creating test projects..."

# Create test-projects directory
mkdir -p test-projects
cd test-projects

# ============================================================================
# TypeScript Project
# ============================================================================
echo "Creating TypeScript project..."
mkdir -p typescript-app/src/{services,models,controllers,utils}

cat > typescript-app/src/models/User.ts << 'EOF'
export interface User {
  id: string;
  name: string;
  email: string;
}

export class UserModel {
  constructor(private data: User) {}

  getId(): string {
    return this.data.id;
  }

  getName(): string {
    return this.data.name;
  }

  getEmail(): string {
    return this.data.email;
  }
}
EOF

cat > typescript-app/src/services/UserService.ts << 'EOF'
import { User, UserModel } from '../models/User';
import { DatabaseService } from './DatabaseService';

export class UserService {
  constructor(private db: DatabaseService) {}

  async getUser(id: string): Promise<UserModel | null> {
    const userData = await this.db.query('users', { id });
    if (!userData) return null;
    return new UserModel(userData);
  }

  async createUser(user: User): Promise<UserModel> {
    await this.db.insert('users', user);
    return new UserModel(user);
  }
}
EOF

cat > typescript-app/src/services/DatabaseService.ts << 'EOF'
export class DatabaseService {
  async query(table: string, filter: any): Promise<any> {
    // Mock implementation
    return null;
  }

  async insert(table: string, data: any): Promise<void> {
    // Mock implementation
  }
}
EOF

cat > typescript-app/src/controllers/UserController.ts << 'EOF'
import { UserService } from '../services/UserService';

export class UserController {
  constructor(private userService: UserService) {}

  async handleGetUser(req: any, res: any): Promise<void> {
    const user = await this.userService.getUser(req.params.id);
    res.json(user);
  }

  async handleCreateUser(req: any, res: any): Promise<void> {
    const user = await this.userService.createUser(req.body);
    res.json(user);
  }
}
EOF

cat > typescript-app/src/utils/Logger.ts << 'EOF'
export class Logger {
  log(message: string): void {
    console.log(`[LOG] ${message}`);
  }

  error(message: string): void {
    console.error(`[ERROR] ${message}`);
  }
}
EOF

cat > typescript-app/src/index.ts << 'EOF'
import { UserController } from './controllers/UserController';
import { UserService } from './services/UserService';
import { DatabaseService } from './services/DatabaseService';
import { Logger } from './utils/Logger';

const logger = new Logger();
const db = new DatabaseService();
const userService = new UserService(db);
const userController = new UserController(userService);

logger.log('Application started');
EOF

cat > typescript-app/package.json << 'EOF'
{
  "name": "typescript-app",
  "version": "1.0.0",
  "description": "Sample TypeScript app for testing ArchView",
  "main": "src/index.ts"
}
EOF

cat > typescript-app/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true
  }
}
EOF

# ============================================================================
# Python Project
# ============================================================================
echo "Creating Python project..."
mkdir -p python-app/{models,services,controllers,utils}

cat > python-app/models/user.py << 'EOF'
from dataclasses import dataclass

@dataclass
class User:
    id: str
    name: str
    email: str

class UserModel:
    def __init__(self, data: User):
        self.data = data
    
    def get_id(self) -> str:
        return self.data.id
    
    def get_name(self) -> str:
        return self.data.name
    
    def get_email(self) -> str:
        return self.data.email
EOF

cat > python-app/services/database_service.py << 'EOF'
from typing import Any, Dict, Optional

class DatabaseService:
    def query(self, table: str, filter: Dict[str, Any]) -> Optional[Any]:
        # Mock implementation
        return None
    
    def insert(self, table: str, data: Any) -> None:
        # Mock implementation
        pass
EOF

cat > python-app/services/user_service.py << 'EOF'
from typing import Optional
from models.user import User, UserModel
from services.database_service import DatabaseService

class UserService:
    def __init__(self, db: DatabaseService):
        self.db = db
    
    def get_user(self, user_id: str) -> Optional[UserModel]:
        user_data = self.db.query('users', {'id': user_id})
        if not user_data:
            return None
        return UserModel(user_data)
    
    def create_user(self, user: User) -> UserModel:
        self.db.insert('users', user)
        return UserModel(user)
EOF

cat > python-app/controllers/user_controller.py << 'EOF'
from services.user_service import UserService

class UserController:
    def __init__(self, user_service: UserService):
        self.user_service = user_service
    
    def handle_get_user(self, request):
        user = self.user_service.get_user(request.params['id'])
        return {'user': user}
    
    def handle_create_user(self, request):
        user = self.user_service.create_user(request.body)
        return {'user': user}
EOF

cat > python-app/utils/logger.py << 'EOF'
class Logger:
    def log(self, message: str) -> None:
        print(f"[LOG] {message}")
    
    def error(self, message: str) -> None:
        print(f"[ERROR] {message}")
EOF

cat > python-app/main.py << 'EOF'
from controllers.user_controller import UserController
from services.user_service import UserService
from services.database_service import DatabaseService
from utils.logger import Logger

logger = Logger()
db = DatabaseService()
user_service = UserService(db)
user_controller = UserController(user_service)

logger.log('Application started')
EOF

# ============================================================================
# Polyglot Project
# ============================================================================
echo "Creating polyglot project..."
mkdir -p polyglot-app/{backend,frontend,scripts}

# Backend (Python)
mkdir -p polyglot-app/backend/{api,models,services}

cat > polyglot-app/backend/models/product.py << 'EOF'
from dataclasses import dataclass

@dataclass
class Product:
    id: str
    name: str
    price: float
EOF

cat > polyglot-app/backend/services/product_service.py << 'EOF'
from models.product import Product

class ProductService:
    def get_product(self, product_id: str) -> Product:
        return Product(id=product_id, name="Sample", price=99.99)
EOF

cat > polyglot-app/backend/api/server.py << 'EOF'
from services.product_service import ProductService

class Server:
    def __init__(self):
        self.product_service = ProductService()
    
    def start(self):
        print("Server started")
EOF

# Frontend (TypeScript)
mkdir -p polyglot-app/frontend/{components,services,models}

cat > polyglot-app/frontend/models/Product.ts << 'EOF'
export interface Product {
  id: string;
  name: string;
  price: number;
}
EOF

cat > polyglot-app/frontend/services/ApiService.ts << 'EOF'
import { Product } from '../models/Product';

export class ApiService {
  async getProduct(id: string): Promise<Product> {
    const response = await fetch(`/api/products/${id}`);
    return response.json();
  }
}
EOF

cat > polyglot-app/frontend/components/ProductView.ts << 'EOF'
import { ApiService } from '../services/ApiService';

export class ProductView {
  constructor(private api: ApiService) {}

  async render(productId: string): Promise<void> {
    const product = await this.api.getProduct(productId);
    console.log('Rendering product:', product);
  }
}
EOF

# Scripts (JavaScript)
cat > polyglot-app/scripts/deploy.js << 'EOF'
const fs = require('fs');

function deploy() {
  console.log('Deploying application...');
}

deploy();
EOF

echo ""
echo "✅ Test projects created successfully!"
echo ""
echo "Test projects available:"
echo "  - test-projects/typescript-app (TypeScript MVC structure)"
echo "  - test-projects/python-app (Python MVC structure)"
echo "  - test-projects/polyglot-app (Mixed TypeScript + Python)"
echo ""
echo "To test the extension:"
echo "  1. Open one of these projects in Kiro IDE"
echo "  2. Press Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows/Linux)"
echo "  3. Type: ArchView: Generate Diagram"
echo "  4. Explore the generated architecture diagram!"
echo ""
