# Firebase Data Migration Guide

## Overview
This guide will help you migrate all data from your old Firebase project (`snpelect-fresh`) to your new project (`snpelect-new`).

## Method 1: Firebase Console Export/Import (Recommended)

### Step 1: Export Data from Old Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your **old project** (`snpelect-fresh`)
3. Go to **Firestore Database**
4. Click **"Export"** button
5. Choose export location (Google Cloud Storage bucket)
6. Wait for export to complete

### Step 2: Import Data to New Project
1. Go to your **new project** (`snpelect-new`)
2. Go to **Firestore Database**
3. Click **"Import"** button
4. Select the exported data from Step 1
5. Wait for import to complete

## Method 2: Manual Data Transfer

### Step 1: Access Old Project Data
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your **old project** (`snpelect-fresh`)
3. Go to **Firestore Database**
4. Navigate through each collection and copy important data

### Step 2: Add Data to New Project
1. Go to your **new project** (`snpelect-new`)
2. Go to **Firestore Database**
3. Create collections and documents manually
4. Copy data from old project

## Collections to Migrate

### 1. Customers Collection
- **Path**: `customers`
- **Important fields**: name, contact_name, email, phone, address

### 2. Technicians Collection  
- **Path**: `technicians`
- **Important fields**: name, email, password, role, phone, specializations

### 3. Jobs Collection
- **Path**: `jobs`
- **Important fields**: title, description, status, customer_name, technician_id, photos

### 4. Equipment Collection
- **Path**: `equipment`
- **Important fields**: name, type, location, maintenance_schedule

### 5. Reports Collection
- **Path**: `reports`
- **Important fields**: report_type, data, created_at

## Storage Migration

### Photos and Files
1. Go to **Storage** in old project
2. Download important files manually
3. Upload to new project Storage
4. Update photo URLs in jobs collection

## Verification Steps

After migration:
1. ✅ Check all collections exist in new project
2. ✅ Verify document counts match
3. ✅ Test login with existing credentials
4. ✅ Test photo uploads and downloads
5. ✅ Test job creation and management

## Important Notes

- **Document IDs**: New project will generate new document IDs
- **Photo URLs**: Will need to be updated after Storage migration
- **Authentication**: User accounts need to be recreated
- **Backup**: Keep old project until migration is verified

## Quick Start (If you have old service account key)

If you still have the old project's service account key:

1. Rename current `serviceAccountKey.json` to `serviceAccountKey-new.json`
2. Place old project's service account key as `serviceAccountKey-old.json`
3. Run the migration script (if available)

## Support

If you encounter issues:
1. Check Firebase Console for error messages
2. Verify service account permissions
3. Check network connectivity
4. Review Firebase quotas and limits
