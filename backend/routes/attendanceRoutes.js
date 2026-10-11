const express = require('express');
const router = express.Router();
const {
    getAttendance,
    markAttendance
} = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');
const { enforceClassScope } = require('../middleware/roleMiddleware');

router.use(protect);

router.get('/', enforceClassScope, getAttendance);
router.post('/mark', enforceClassScope, markAttendance);

module.exports = router;
