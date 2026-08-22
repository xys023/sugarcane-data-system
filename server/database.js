/**
 * 数据库初始化模块
 * 甘蔗田间数据收集系统
 * 
 * 功能：创建SQLite数据库和所有数据表，插入初始管理员账号
 * 数据库文件：sugarcane.db（与本文件同目录）
 * 
 * 注意：使用Node.js 22+ 内置的 node:sqlite 模块，无需安装原生依赖
 * 如需在Node.js < 22环境运行，请改用 better-sqlite3 模块
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

// 数据库文件路径
const DB_PATH = path.join(__dirname, 'sugarcane.db');

// 创建数据库连接
const db = new DatabaseSync(DB_PATH);

// 启用外键约束
db.exec('PRAGMA foreign_keys = ON');

/**
 * 初始化所有数据表
 */
function initDatabase() {
  // 用户表 - 存储系统用户（研究员、管理员等）
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      real_name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      role TEXT DEFAULT 'researcher',
      institute TEXT,
      avatar TEXT,
      status INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 试验田表 - 存储试验田/小区基本信息
  db.exec(`
    CREATE TABLE IF NOT EXISTS plots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plot_code TEXT UNIQUE NOT NULL,
      plot_name TEXT NOT NULL,
      location TEXT,
      area REAL,
      soil_type TEXT,
      irrigation_method TEXT,
      planting_date DATE,
      variety TEXT,
      description TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `);

  // 甘蔗植株表 - 存储每株甘蔗的基本档案
  db.exec(`
    CREATE TABLE IF NOT EXISTS plants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plant_code TEXT UNIQUE NOT NULL,
      plot_id INTEGER NOT NULL,
      row_number INTEGER,
      column_number INTEGER,
      variety TEXT,
      planting_date DATE,
      status TEXT DEFAULT 'normal',
      description TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (plot_id) REFERENCES plots(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `);

  // 生长记录表 - 核心表，记录每次田间测量的生长数据
  db.exec(`
    CREATE TABLE IF NOT EXISTS growth_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plant_id INTEGER NOT NULL,
      plot_id INTEGER NOT NULL,
      record_date DATE NOT NULL,
      growth_month INTEGER,
      plant_height REAL,
      stem_diameter REAL,
      leaf_count INTEGER,
      tiller_count INTEGER,
      internode_length REAL,
      leaf_length REAL,
      leaf_width REAL,
      leaf_color TEXT,
      lodging_degree TEXT,
      photo_url TEXT,
      weather TEXT,
      temperature REAL,
      humidity REAL,
      notes TEXT,
      recorded_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (plant_id) REFERENCES plants(id),
      FOREIGN KEY (plot_id) REFERENCES plots(id),
      FOREIGN KEY (recorded_by) REFERENCES users(id)
    );
  `);

  // 病害记录表 - 记录甘蔗病害情况
  db.exec(`
    CREATE TABLE IF NOT EXISTS disease_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plant_id INTEGER,
      plot_id INTEGER NOT NULL,
      record_date DATE NOT NULL,
      disease_type TEXT NOT NULL,
      severity TEXT,
      infected_area REAL,
      symptoms TEXT,
      treatment TEXT,
      photo_url TEXT,
      notes TEXT,
      recorded_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (plant_id) REFERENCES plants(id),
      FOREIGN KEY (plot_id) REFERENCES plots(id),
      FOREIGN KEY (recorded_by) REFERENCES users(id)
    );
  `);

  // 田间操作记录表 - 记录施肥、灌溉、农药等田间操作
  db.exec(`
    CREATE TABLE IF NOT EXISTS field_operations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plot_id INTEGER NOT NULL,
      operation_date DATE NOT NULL,
      operation_type TEXT NOT NULL,
      details TEXT,
      amount REAL,
      unit TEXT,
      operator TEXT,
      notes TEXT,
      recorded_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (plot_id) REFERENCES plots(id),
      FOREIGN KEY (recorded_by) REFERENCES users(id)
    );
  `);

  // 创建索引以提升查询性能
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_growth_plant ON growth_records(plant_id);
    CREATE INDEX IF NOT EXISTS idx_growth_plot ON growth_records(plot_id);
    CREATE INDEX IF NOT EXISTS idx_growth_date ON growth_records(record_date);
    CREATE INDEX IF NOT EXISTS idx_plants_plot ON plants(plot_id);
    CREATE INDEX IF NOT EXISTS idx_disease_plot ON disease_records(plot_id);
    CREATE INDEX IF NOT EXISTS idx_disease_date ON disease_records(record_date);
  `);

  // 插入默认管理员账号（如果不存在）
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (username, password, real_name, role, institute, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('admin', hashedPassword, '系统管理员', 'admin', '广西科技师范学院', 1);
    console.log('已创建默认管理员账号: admin / admin123');
  }

  console.log('数据库初始化完成');
}

// 导出数据库实例和初始化函数
module.exports = { db, initDatabase };
