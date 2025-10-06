const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./backend/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'snpelect-new'
});

const db = admin.firestore();

async function testJobs() {
  try {
    console.log('🔍 Testing job creation and retrieval...');
    
    // Check if jobs collection exists and has data
    const jobsSnapshot = await db.collection('jobs').get();
    console.log(`📊 Found ${jobsSnapshot.size} jobs in database`);
    
    if (jobsSnapshot.size > 0) {
      console.log('📋 Recent jobs:');
      jobsSnapshot.docs.slice(0, 3).forEach((doc, index) => {
        const data = doc.data();
        console.log(`  ${index + 1}. ID: ${doc.id}`);
        console.log(`     Title: ${data.title || 'N/A'}`);
        console.log(`     Status: ${data.status || 'N/A'}`);
        console.log(`     Created: ${data.created_at?.toDate?.() || 'N/A'}`);
        console.log(`     SNP ID: ${data.snpid || 'N/A'}`);
        console.log('     ---');
      });
    } else {
      console.log('❌ No jobs found in database');
    }
    
    // Check if meta collection exists for service report numbers
    const metaSnapshot = await db.collection('meta').doc('serviceReport').get();
    if (metaSnapshot.exists) {
      const metaData = metaSnapshot.data();
      console.log(`🔢 Service Report Counter: ${metaData.next || 'N/A'}`);
    } else {
      console.log('⚠️  Service Report counter not found');
    }
    
    // Test creating a job
    console.log('\n🧪 Testing job creation...');
    const testJob = {
      title: 'Test Job - ' + new Date().toISOString(),
      description: 'This is a test job to verify database connectivity',
      status: 'pending',
      customer_id: 'test-customer',
      technician_id: 'test-technician',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('jobs').add(testJob);
    console.log(`✅ Test job created with ID: ${docRef.id}`);
    
    // Verify the job was created
    const createdJob = await db.collection('jobs').doc(docRef.id).get();
    if (createdJob.exists) {
      console.log('✅ Job successfully saved to database');
      console.log('📄 Job data:', createdJob.data());
    } else {
      console.log('❌ Job was not saved to database');
    }
    
    // Clean up test job
    await db.collection('jobs').doc(docRef.id).delete();
    console.log('🧹 Test job cleaned up');
    
  } catch (error) {
    console.error('❌ Error testing jobs:', error);
  }
}

testJobs().then(() => {
  console.log('🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
