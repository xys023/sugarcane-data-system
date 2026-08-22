/**
 * 甘蔗田间数据收集系统 - 后端服务主入口
 * 
 * 技术栈：Node.js 内置 http 模块 + SQLite (node:sqlite)
 * 说明：使用Node.js内置模块，减少外部依赖，确保稳定运行
 * 
 * 启动方式：node server.js
 * 默认端口：3000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// 导入数据库初始化模块
const { initDatabase, db } = require('./database');

// 导入认证工具
const { verifyToken, JWT_SECRET } = require('./middleware/auth');

// 导入路由处理函数
const authRoutes = require('./routes/auth');
const plotRoutes = require('./routes/plots');
const plantRoutes = require('./routes/plants');
const growthRoutes = require('./routes/growth');
const diseaseRoutes = require('./routes/diseases');
const exportRoutes = require('./routes/export');
const dashboardRoutes = require('./routes/dashboard');
const userRoutes = require('./routes/users');
const uploadRoutes = require('./routes/upload');

// 服务端口
const PORT = process.env.PORT || 3000;

// 静态文件目录
const ADMIN_DIR = path.join(__dirname, '..', 'admin');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const EXPORT_DIR = path.join(__dirname, 'exports');

// 确保目录存在
[UPLOAD_DIR, EXPORT_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/**
 * 解析JSON请求体
 */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

/**
 * 发送JSON响应
 */
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

/**
 * 发送文件
 */
function sendFile(res, filePath, contentType) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }
  const stat = fs.statSync(filePath);
  res.writeHead(200, {
    'Content-Type': contentType || 'application/octet-stream',
    'Content-Length': stat.size,
    'Access-Control-Allow-Origin': '*'
  });
  fs.createReadStream(filePath).pipe(res);
}

/**
 * MIME类型映射
 */
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

/**
 * 认证中间件
 */
function authRequired(req, res, handler) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  if (!token) {
    return sendJSON(res, 401, { success: false, message: '未提供认证令牌' });
  }
  
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    handler(req, res);
  } catch (e) {
    return sendJSON(res, 401, { success: false, message: '认证令牌无效或已过期' });
  }
}

/**
 * 管理员权限中间件
 */
function adminRequired(req, res, handler) {
  authRequired(req, res, () => {
    if (req.user.role !== 'admin') {
      return sendJSON(res, 403, { success: false, message: '需要管理员权限' });
    }
    handler(req, res);
  });
}

/**
 * 路由处理
 */
async function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;
  const method = req.method;

  // CORS预检
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  // 健康检查
  if (pathname === '/api/health' && method === 'GET') {
    return sendJSON(res, 200, {
      success: true,
      message: '甘蔗田间数据收集系统服务运行正常',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  }

  // 解析请求体
  req.body = method !== 'GET' ? await parseBody(req) : {};
  req.query = query;

  // API路由分发
  if (pathname.startsWith('/api/')) {
    try {
      // 认证相关（不需要登录）
      if (pathname === '/api/auth/login' && method === 'POST') {
        return authRoutes.login(req, res, sendJSON);
      }
      if (pathname === '/api/auth/register' && method === 'POST') {
        return authRoutes.register(req, res, sendJSON);
      }
      if (pathname === '/api/auth/profile' && method === 'GET') {
        return authRequired(req, res, () => authRoutes.profile(req, res, sendJSON));
      }
      if (pathname === '/api/auth/password' && method === 'PUT') {
        return authRequired(req, res, () => authRoutes.changePassword(req, res, sendJSON));
      }

      // 仪表盘
      if (pathname === '/api/dashboard/stats' && method === 'GET') {
        return authRequired(req, res, () => dashboardRoutes.stats(req, res, sendJSON));
      }

      // 试验田路由
      if (pathname.startsWith('/api/plots')) {
        return handlePlotsRoutes(req, res, pathname, method);
      }

      // 植株路由
      if (pathname.startsWith('/api/plants')) {
        return handlePlantsRoutes(req, res, pathname, method);
      }

      // 生长记录路由
      if (pathname.startsWith('/api/growth')) {
        return handleGrowthRoutes(req, res, pathname, method);
      }

      // 病害记录路由
      if (pathname.startsWith('/api/diseases')) {
        return handleDiseaseRoutes(req, res, pathname, method);
      }

      // 数据导出路由
      if (pathname.startsWith('/api/export')) {
        return authRequired(req, res, () => exportRoutes.handle(req, res, pathname, method, sendFile, sendJSON));
      }

      // 用户管理路由（管理员）
      if (pathname.startsWith('/api/users')) {
        return handleUserRoutes(req, res, pathname, method);
      }

      // 文件上传路由
      if (pathname.startsWith('/api/upload')) {
        return authRequired(req, res, () => uploadRoutes.handle(req, res, pathname, method, sendJSON, UPLOAD_DIR));
      }

      // 404
      return sendJSON(res, 404, { success: false, message: '接口不存在' });

    } catch (error) {
      console.error('API错误:', error);
      return sendJSON(res, 500, { success: false, message: '服务器内部错误: ' + error.message });
    }
  }

  // 静态文件服务
  // 上传的图片
  if (pathname.startsWith('/uploads/')) {
    const filePath = path.join(UPLOAD_DIR, pathname.replace('/uploads/', ''));
    const ext = path.extname(filePath).toLowerCase();
    return sendFile(res, filePath, MIME_TYPES[ext]);
  }

  // 导出的文件
  if (pathname.startsWith('/exports/')) {
    const filePath = path.join(EXPORT_DIR, pathname.replace('/exports/', ''));
    const ext = path.extname(filePath).toLowerCase();
    return sendFile(res, filePath, MIME_TYPES[ext]);
  }

  // PC端后台页面
  let filePath = path.join(ADMIN_DIR, pathname === '/' ? 'index.html' : pathname);
  
  // 安全检查：防止路径遍历
  if (!filePath.startsWith(ADMIN_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    return sendFile(res, filePath, MIME_TYPES[ext] || 'application/octet-stream');
  }

  // SPA路由：返回index.html
  filePath = path.join(ADMIN_DIR, 'index.html');
  return sendFile(res, filePath, 'text/html; charset=utf-8');
}

// 试验田路由处理
function handlePlotsRoutes(req, res, pathname, method) {
  const parts = pathname.split('/').filter(Boolean); // ['api', 'plots', 'id'?]
  
  // /api/plots/all
  if (pathname === '/api/plots/all' && method === 'GET') {
    return authRequired(req, res, () => plotRoutes.getAll(req, res, sendJSON));
  }
  
  // /api/plots/:id
  if (parts.length === 3) {
    const id = parts[2];
    if (method === 'GET') return authRequired(req, res, () => plotRoutes.getById(req, res, sendJSON, id));
    if (method === 'PUT') return authRequired(req, res, () => plotRoutes.update(req, res, sendJSON, id));
    if (method === 'DELETE') return authRequired(req, res, () => plotRoutes.remove(req, res, sendJSON, id));
  }
  
  // /api/plots
  if (method === 'GET') return authRequired(req, res, () => plotRoutes.list(req, res, sendJSON));
  if (method === 'POST') return authRequired(req, res, () => plotRoutes.create(req, res, sendJSON));
  
  return sendJSON(res, 404, { success: false, message: '接口不存在' });
}

// 植株路由处理
function handlePlantsRoutes(req, res, pathname, method) {
  const parts = pathname.split('/').filter(Boolean);
  
  // /api/plants/batch
  if (pathname === '/api/plants/batch' && method === 'POST') {
    return authRequired(req, res, () => plantRoutes.batchCreate(req, res, sendJSON));
  }
  
  // /api/plants/:id
  if (parts.length === 3) {
    const id = parts[2];
    if (method === 'GET') return authRequired(req, res, () => plantRoutes.getById(req, res, sendJSON, id));
    if (method === 'PUT') return authRequired(req, res, () => plantRoutes.update(req, res, sendJSON, id));
    if (method === 'DELETE') return authRequired(req, res, () => plantRoutes.remove(req, res, sendJSON, id));
  }
  
  // /api/plants
  if (method === 'GET') return authRequired(req, res, () => plantRoutes.list(req, res, sendJSON));
  if (method === 'POST') return authRequired(req, res, () => plantRoutes.create(req, res, sendJSON));
  
  return sendJSON(res, 404, { success: false, message: '接口不存在' });
}

// 生长记录路由处理
function handleGrowthRoutes(req, res, pathname, method) {
  const parts = pathname.split('/').filter(Boolean);
  
  // /api/growth/trend/:plantId
  if (parts.length === 4 && parts[2] === 'trend') {
    const plantId = parts[3];
    if (method === 'GET') return authRequired(req, res, () => growthRoutes.trend(req, res, sendJSON, plantId));
  }
  
  // /api/growth/:id
  if (parts.length === 3) {
    const id = parts[2];
    if (method === 'GET') return authRequired(req, res, () => growthRoutes.getById(req, res, sendJSON, id));
    if (method === 'PUT') return authRequired(req, res, () => growthRoutes.update(req, res, sendJSON, id));
    if (method === 'DELETE') return authRequired(req, res, () => growthRoutes.remove(req, res, sendJSON, id));
  }
  
  // /api/growth
  if (method === 'GET') return authRequired(req, res, () => growthRoutes.list(req, res, sendJSON));
  if (method === 'POST') return authRequired(req, res, () => growthRoutes.create(req, res, sendJSON));
  
  return sendJSON(res, 404, { success: false, message: '接口不存在' });
}

// 病害记录路由处理
function handleDiseaseRoutes(req, res, pathname, method) {
  const parts = pathname.split('/').filter(Boolean);
  
  // /api/diseases/types
  if (pathname === '/api/diseases/types' && method === 'GET') {
    return authRequired(req, res, () => diseaseRoutes.types(req, res, sendJSON));
  }
  
  // /api/diseases/:id
  if (parts.length === 3) {
    const id = parts[2];
    if (method === 'GET') return authRequired(req, res, () => diseaseRoutes.getById(req, res, sendJSON, id));
    if (method === 'PUT') return authRequired(req, res, () => diseaseRoutes.update(req, res, sendJSON, id));
    if (method === 'DELETE') return authRequired(req, res, () => diseaseRoutes.remove(req, res, sendJSON, id));
  }
  
  // /api/diseases
  if (method === 'GET') return authRequired(req, res, () => diseaseRoutes.list(req, res, sendJSON));
  if (method === 'POST') return authRequired(req, res, () => diseaseRoutes.create(req, res, sendJSON));
  
  return sendJSON(res, 404, { success: false, message: '接口不存在' });
}

// 用户管理路由处理
function handleUserRoutes(req, res, pathname, method) {
  const parts = pathname.split('/').filter(Boolean);
  
  // /api/users/:id/reset-password
  if (parts.length === 4 && parts[3] === 'reset-password') {
    const id = parts[2];
    if (method === 'PUT') return adminRequired(req, res, () => userRoutes.resetPassword(req, res, sendJSON, id));
  }
  
  // /api/users/:id/status
  if (parts.length === 4 && parts[3] === 'status') {
    const id = parts[2];
    if (method === 'PUT') return adminRequired(req, res, () => userRoutes.updateStatus(req, res, sendJSON, id));
  }
  
  // /api/users/:id
  if (parts.length === 3) {
    const id = parts[2];
    if (method === 'PUT') return adminRequired(req, res, () => userRoutes.update(req, res, sendJSON, id));
  }
  
  // /api/users
  if (method === 'GET') return adminRequired(req, res, () => userRoutes.list(req, res, sendJSON));
  if (method === 'POST') return adminRequired(req, res, () => userRoutes.create(req, res, sendJSON));
  
  return sendJSON(res, 404, { success: false, message: '接口不存在' });
}

// ==================== 启动服务 ====================

// 初始化数据库
initDatabase();

// 创建HTTP服务器
const server = http.createServer(handleRequest);

server.listen(PORT, '0.0.0.0', () => {
  console.log('========================================');
  console.log('  甘蔗田间数据收集系统 - 后端服务已启动');
  console.log('========================================');
  console.log(`  服务地址: http://localhost:${PORT}`);
  console.log(`  PC端后台: http://localhost:${PORT}/`);
  console.log(`  API地址:  http://localhost:${PORT}/api/`);
  console.log(`  健康检查: http://localhost:${PORT}/api/health`);
  console.log('========================================');
  console.log('  默认管理员账号: admin / admin123');
  console.log('  请及时修改默认密码！');
  console.log('========================================');
});

// 错误处理
server.on('error', (error) => {
  console.error('服务器错误:', error);
});

