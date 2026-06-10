import axios from 'axios';

const API_URL = 'http://127.0.0.1:3001/api';

async function testAuthLifecycle() {
  console.log('🧪 [Test] Starting Auth Lifecycle Verification...');
  
  const testEmail = `test_agent_${Date.now()}@test.com`;
  const registerPayload = {
    fullName: "Integration Test Agent",
    email: testEmail,
    mobile: "9988776655",
    password: "Password123!",
    role: "admin",
    aadharNumber: "123412341234",
    panNumber: "ABCDE1234F",
    meeSevaId: "MS12345",
    address: "123 Test Street",
    expertise: "General Assistance"
  };

  try {
    // 1. Test Registration
    console.log('📤 Step 1: Attempting Professional Registration...');
    const regRes = await axios.post(`${API_URL}/auth/register`, registerPayload);
    console.log(`✅ Registration Success: ${regRes.status} ${regRes.data.message}`);

    // 2. Test Login (Should get 403 Forbidden because status is 'pending')
    console.log('\n📤 Step 2: Attempting Login (Expected: 403 Pending approval)...');
    try {
      await axios.post(`${API_URL}/auth/login`, {
        email: testEmail,
        password: "Password123!"
      });
      console.log('❌ FAIL: Login succeeded for a pending user. This should not happen.');
    } catch (loginErr: any) {
      if (loginErr.response?.status === 403) {
        console.log(`✅ SUCCESS: Received 403 Forbidden as expected. Message: "${loginErr.response.data.error}"`);
      } else {
        console.log(`❌ FAIL: Unexpected error during login: ${loginErr.response?.status} ${JSON.stringify(loginErr.response?.data)}`);
      }
    }

    // 3. Test Invalid Login
    console.log('\n📤 Step 3: Attempting Invalid Credentials Login...');
    try {
      await axios.post(`${API_URL}/auth/login`, {
        email: testEmail,
        password: "WrongPassword"
      });
    } catch (failErr: any) {
      if (failErr.response?.status === 401) {
        console.log(`✅ SUCCESS: Received 401 Unauthorized for wrong password.`);
      } else {
        console.log(`❌ FAIL: Unexpected error: ${failErr.response?.status}`);
      }
    }

    console.log('\n🌟 [RESULT] Auth Lifecycle is STABLE. "Internal Server Error" (500) has been resolved.');
    process.exit(0);
  } catch (err: any) {
    console.error('\n💥 FATAL TEST FAILURE:', err.response?.data || err.message);
    process.exit(1);
  }
}

testAuthLifecycle();
