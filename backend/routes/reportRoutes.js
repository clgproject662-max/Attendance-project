const express = require('express');
const router = express.Router();
const {
    getAttendanceReport,
    getClassStudents,
    deleteClassData
} = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole, enforceClassScope } = require('../middleware/roleMiddleware');

router.use(protect);

router.get('/attendance', enforceClassScope, getAttendanceReport);
router.get('/students', enforceClassScope, getClassStudents);
router.delete('/class', requireRole('admin'), deleteClassData);

module.exports = router;
