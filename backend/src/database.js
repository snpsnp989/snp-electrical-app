const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
const initDatabase = () => {
  // Customers table
  db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_name TEXT,
      email TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Best-effort migration for legacy DBs: add contact_name if missing
  db.run('ALTER TABLE customers ADD COLUMN contact_name TEXT', (err) => {
    // Ignore error if column already exists
  });

  // Technicians table
  db.run(`
    CREATE TABLE IF NOT EXISTS technicians (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      specializations TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Jobs table
  db.run(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snpid INTEGER,
      customer_id INTEGER NOT NULL,
      technician_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      -- legacy fields above
      -- new report-aligned fields
      requested_date DATE,
      due_date DATE,
      client_id TEXT,
      end_customer_id TEXT,
      site_id TEXT,
      site_address TEXT,
      site_contact TEXT,
      site_phone TEXT,
      order_number TEXT,
      equipment TEXT,
      fault_reported TEXT,
      arrival_time TEXT,
      departure_time TEXT,
      action_taken TEXT,
      service_type TEXT,
      parts_json TEXT,
      completed_date DATE,
      service_report TEXT,
      pdf_generated BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers (id),
      FOREIGN KEY (technician_id) REFERENCES technicians (id)
    )
  `);

  // Migrations for existing DBs (best-effort, ignore errors if already exist)
  const addCol = (name, type) => db.run(`ALTER TABLE jobs ADD COLUMN ${name} ${type}`, () => {});
  addCol('snpid','INTEGER');
  addCol('client_name','TEXT');
  addCol('end_customer_name','TEXT');
  addCol('requested_date','DATE');
  addCol('due_date','DATE');
  addCol('client_id','TEXT');
  addCol('end_customer_id','TEXT');
  addCol('site_id','TEXT');
  addCol('site_address','TEXT');
  addCol('site_contact','TEXT');
  addCol('site_phone','TEXT');
  addCol('order_number','TEXT');
  addCol('equipment','TEXT');
  addCol('fault_reported','TEXT');
  addCol('service_type','TEXT');
  addCol('photos','TEXT');
  addCol('pdf_generated','BOOLEAN');

  // Equipment table
  db.run(`
    CREATE TABLE IF NOT EXISTS equipment (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Service reports table
  db.run(`
    CREATE TABLE IF NOT EXISTS service_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      report_content TEXT NOT NULL,
      sent_date DATE,
      email_sent BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES jobs (id)
    )
  `);

  console.log('Database initialized successfully');
};

// Insert sample data
const insertSampleData = () => {
  // Sample customers
  db.run(`
    INSERT OR IGNORE INTO customers (name, contact_name, email, phone, address) VALUES 
    ('ABC Manufacturing', 'Mary Collins', 'contact@abcmanufacturing.com', '555-0101', '123 Industrial Blvd'),
    ('XYZ Office Complex', 'Peter Ward', 'maintenance@xyzoffice.com', '555-0102', '456 Business Ave'),
    ('Tech Startup Inc', 'Ellen Park', 'facilities@techstartup.com', '555-0103', '789 Innovation St')
  `);

  // Sample technicians
  db.run(`
    INSERT OR IGNORE INTO technicians (name, email, phone, specializations) VALUES 
    ('John Smith', 'john@snp-electrical.com', '555-0201', 'Electrical Systems, Safety Inspections'),
    ('Sarah Johnson', 'sarah@snp-electrical.com', '555-0202', 'Emergency Repairs, Industrial Equipment'),
    ('Mike Davis', 'mike@snp-electrical.com', '555-0203', 'Preventive Maintenance, Code Compliance')
  `);

  // Sample equipment
  db.run(`
    INSERT OR IGNORE INTO equipment (id, name, description, is_active) VALUES 
    ('eq_001', 'Bollards', 'Security bollards for vehicle and pedestrian control', 1),
    ('eq_002', 'Roller Doors', 'Industrial and commercial roller doors', 1),
    ('eq_003', 'Boom Gates', 'Automatic and manual boom gates for access control', 1),
    ('eq_004', 'Road Blockers', 'Heavy-duty road blocking systems', 1),
    ('eq_005', 'Slide Gates', 'Sliding gate systems for security', 1),
    ('eq_006', 'Swing Gates', 'Swing gate systems for access control', 1)
  `);

  console.log('Sample data inserted');
};

module.exports = { db, initDatabase, insertSampleData };
