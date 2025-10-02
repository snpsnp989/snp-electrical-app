# SNP Electrical - Maintenance Management System

A comprehensive maintenance management system for SNP Electrical, designed to manage jobs, technicians, customers, and automated service report generation.

## Features

- **Job Management**: Create, assign, and track maintenance jobs
- **Technician Assignment**: Assign jobs to specific technicians
- **Customer Management**: Manage customer information and contact details
- **Service Reports**: Generate and send service reports to customers
- **Monthly Email System**: Bulk send service reports monthly
- **Professional Dark UI**: Clean, modern interface with dark theme

## Technology Stack

- **Frontend**: React with TypeScript, Tailwind CSS
- **Backend**: Node.js with Express
- **Database**: SQLite
- **Email**: Nodemailer

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone and navigate to the project directory**
   ```bash
   cd snp-electrical-app
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Configure email settings**
   ```bash
   cd ../backend
   cp .env.example .env
   ```
   
   Edit the `.env` file with your email credentials:
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   PORT=5000
   NODE_ENV=development
   ```

### Running the Application

1. **Start the backend server**
   ```bash
   cd backend
   npm run dev
   ```
   The API will be available at `http://localhost:5000`

2. **Start the frontend (in a new terminal)**
   ```bash
   cd frontend
   npm start
   ```
   The application will be available at `http://localhost:3000`

## Usage Guide

### 1. Dashboard
- View overview statistics
- Monitor recent jobs
- Quick access to all features

### 2. Jobs Management
- Create new maintenance jobs
- Assign jobs to technicians
- Update job status (pending → in progress → completed)
- Track job completion dates

### 3. Customer Management
- Add new customers
- Update customer information
- Search and filter customers

### 4. Technician Management
- Add new technicians
- Set specializations
- Manage technician assignments

### 5. Service Reports
- Create service reports for completed jobs
- Send individual reports immediately
- Send monthly bulk reports to all customers
- Track report delivery status

## Workflow

1. **Create a Job**: Add a new maintenance job and assign it to a technician
2. **Job Execution**: Technician completes the work and marks job as completed
3. **Service Report**: Create a detailed service report for the completed job
4. **Monthly Distribution**: Send all pending reports to customers monthly

## Email Configuration

To enable email functionality:

1. **Gmail Setup**:
   - Enable 2-factor authentication
   - Generate an app-specific password
   - Use your Gmail address and app password in the `.env` file

2. **Other Email Providers**:
   - Update the email configuration in `backend/src/routes/reports.js`
   - Modify the transporter settings for your email service

## Database

The application uses SQLite for simplicity. The database file (`database.sqlite`) will be created automatically when you first run the backend.

### Sample Data
The application includes sample customers and technicians for testing purposes.

## API Endpoints

- `GET /api/jobs` - Get all jobs
- `POST /api/jobs` - Create new job
- `PUT /api/jobs/:id` - Update job
- `GET /api/customers` - Get all customers
- `POST /api/customers` - Create new customer
- `GET /api/technicians` - Get all technicians
- `POST /api/technicians` - Create new technician
- `GET /api/reports` - Get all service reports
- `POST /api/reports` - Create service report
- `POST /api/reports/send-monthly` - Send monthly reports

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production` in your environment
2. Build the frontend: `cd frontend && npm run build`
3. Serve the built files from the backend
4. Use a production database (PostgreSQL recommended)
5. Configure proper email service credentials

## Support

For technical support or feature requests, please contact the development team.

---

**SNP Electrical Maintenance Management System** - Streamlining your electrical maintenance operations.
