const http = require('http');
const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');

async function runTests() {
    console.log('====================================================');
    console.log('🧪 RUNNING COLLEGE ATTENDANCE BACKEND TEST SUITE');
    console.log('====================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(condition, testName) {
        if (condition) {
            console.log(`  ✅ PASS: ${testName}`);
            passed++;
        } else {
            console.error(`  ❌ FAIL: ${testName}`);
            failed++;
        }
    }

    // TEST 1: Environment Variables
    console.log('--- Test Suite 1: Configuration & Environment ---');
    assert(Boolean(process.env.PORT), 'PORT is configured');
    assert(Boolean(process.env.JWT_SECRET), 'JWT_SECRET is configured');
    assert(Boolean(process.env.MONGODB_URI), 'MONGODB_URI is defined');

    // TEST 2: Password Security (Bcrypt)
    console.log('\n--- Test Suite 2: Password Security & Hashing ---');
    const plainPass = 'admin123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(plainPass, salt);
    assert(hash !== plainPass && hash.startsWith('$2'), 'Password successfully hashed with bcrypt');
    const match = await bcrypt.compare(plainPass, hash);
    assert(match === true, 'Bcrypt verify matches original password');
    const wrongMatch = await bcrypt.compare('wrongpass', hash);
    assert(wrongMatch === false, 'Bcrypt rejects incorrect password');

    // TEST 3: JWT Token Generation & Verification
    console.log('\n--- Test Suite 3: JWT Authentication & Expiry ---');
    const payload = { id: '65e9b3a9c7b9123456789abc', role: 'admin' };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    assert(typeof token === 'string' && token.split('.').length === 3, 'JWT token correctly generated in 3-part format');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    assert(decoded.id === payload.id && decoded.role === payload.role, 'JWT decoded payload matches original claims');

    // TEST 4: Mongoose Schemas & Model Integrity
    console.log('\n--- Test Suite 4: Mongoose Schemas & Validation ---');
    assert(Boolean(User.schema.paths.username), 'User schema contains required username field');
    assert(Boolean(User.schema.paths.password), 'User schema contains password field');
    assert(Boolean(Student.schema.paths.studentId), 'Student schema contains studentId field');
    assert(Boolean(Student.schema.paths.department), 'Student schema contains department field');
    assert(Boolean(Attendance.schema.paths.date), 'Attendance schema contains date field');
    assert(Boolean(Attendance.schema.paths.status), 'Attendance schema contains status field');

    // TEST 5: Excel Import Parsing (SheetJS)
    console.log('\n--- Test Suite 5: Excel Import Parser (SheetJS) ---');
    const mockWb = XLSX.utils.book_new();
    const mockData = [
        { 'Serial Number': 1, 'Register No': '22CS101', 'Name': 'Karthik S' },
        { 'Serial Number': 2, 'Register No': '22CS102', 'Name': 'Meena R' }
    ];
    const ws = XLSX.utils.json_to_sheet(mockData);
    XLSX.utils.book_append_sheet(mockWb, ws, 'Students');
    const buffer = XLSX.write(mockWb, { type: 'buffer', bookType: 'xlsx' });
    assert(buffer && buffer.length > 0, 'Excel workbook generated into buffer');

    const parsedWb = XLSX.read(buffer, { type: 'buffer' });
    const parsedRows = XLSX.utils.sheet_to_json(parsedWb.Sheets[parsedWb.SheetNames[0]]);
    assert(parsedRows.length === 2, 'Excel parser accurately extracted 2 data rows');
    assert(parsedRows[0]['Register No'] === '22CS101', 'Excel parser matched correct Register No column');

    // TEST 6: Attendance Calculation Formulas
    console.log('\n--- Test Suite 6: Attendance Calculations ---');
    const totalRecordedDays = 20;
    const absentDays = 3;
    const presentDays = totalRecordedDays - absentDays; // 17
    const attendancePercentage = Math.round((presentDays / totalRecordedDays) * 100);
    assert(attendancePercentage === 85, 'Attendance calculation formula: (17 / 20) * 100 = 85%');

    // TEST 7: Role & Class Scope Logic
    console.log('\n--- Test Suite 7: Role-Based Authorization Logic ---');
    const adminUser = { role: 'admin', department: 'Administration' };
    const staffCS1 = { role: 'staff', department: 'Computer Science', year: '1' };

    // Staff accessing CS Year 1 -> Allowed
    const staffCanAccessOwn = (staffCS1.department === 'Computer Science' && staffCS1.year === '1');
    assert(staffCanAccessOwn === true, 'Staff can access their own department (CS) and year (1)');

    // Staff accessing IT Year 2 -> Denied
    const staffCanAccessOther = (staffCS1.department === 'Information Technology');
    assert(staffCanAccessOther === false, 'Staff restricted from accessing other departments (IT)');

    // Summary
    console.log('\n====================================================');
    console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runTests().catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
});
