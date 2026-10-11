const Attendance = require('../models/Attendance');
const Student = require('../models/Student');

/**
 * @desc    Get attendance records for a specific date and class
 * @route   GET /api/attendance
 * @access  Private
 */
const getAttendance = async (req, res) => {
    try {
        const { date, department, year } = req.query;

        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'Attendance date is required (YYYY-MM-DD)'
            });
        }

        const targetDept = (req.user.role === 'staff') ? req.user.department : (department || req.user.department);
        const targetYear = (req.user.role === 'staff' && req.user.year !== 'All') ? req.user.year : (year || '1');

        const records = await Attendance.find({
            date: date.trim(),
            department: targetDept,
            year: targetYear
        });      

        res.status(200).json({
            success: true,
            date,
            department: targetDept,
            year: targetYear,
            count: records.length,
            records
        });
    } catch (error) {
        console.error('getAttendance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve attendance records',
            error: error.message
        });
    }
};

/**
 * @desc    Mark or update attendance (batch or individual)
 * @route   POST /api/attendance/mark
 * @access  Private
 */
const markAttendance = async (req, res) => {
    try {
        const { date, department, year, records, studentId, status } = req.body;

        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'Attendance date is required (YYYY-MM-DD)'
            });
        }

        const targetDept = (req.user.role === 'staff') ? req.user.department : (department || req.user.department);
        const targetYear = (req.user.role === 'staff' && req.user.year !== 'All') ? req.user.year : (year || '1');

        // Case A: Batch save (array of records: [{ studentId, status }, ...])
        if (Array.isArray(records)) {
            const bulkOps = records.map((rec) => {
                const sId = String(rec.studentId || rec.id || '').trim().toUpperCase();
                const sStatus = rec.status === 'absent' ? 'absent' : 'present';

                return {
                    updateOne: {
                        filter: {
                            studentId: sId,
                            date: date.trim(),
                            department: targetDept,
                            year: targetYear
                        },
                        update: {
                            $set: {
                                status: sStatus,
                                studentName: rec.studentName || rec.name || '',
                                recordedBy: req.user._id
                            }
                        },
                        upsert: true
                    }
                };
            }).filter(op => op.updateOne.filter.studentId);

            if (bulkOps.length > 0) {
                await Attendance.bulkWrite(bulkOps);
            }

            return res.status(200).json({
                success: true,
                message: `Attendance saved for ${bulkOps.length} students on ${date}`,
                date,
                department: targetDept,
                year: targetYear
            });
        }

        // Case B: Single student mark/toggle
        if (studentId && status) {
            const normId = String(studentId).trim().toUpperCase();
            const normStatus = status === 'absent' ? 'absent' : 'present';

            const record = await Attendance.findOneAndUpdate(
                {
                    studentId: normId,
                    date: date.trim(),
                    department: targetDept,
                    year: targetYear
                },
                {
                    status: normStatus,
                    recordedBy: req.user._id
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            return res.status(200).json({
                success: true,
                message: `Attendance updated for ${normId}: ${normStatus}`,
                record
            });
        }

        return res.status(400).json({
            success: false,
            message: 'Provide either records array or studentId and status'
        });
    } catch (error) {
        console.error('markAttendance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record attendance',
            error: error.message
        });
    }
};

module.exports = {
    getAttendance,
    markAttendance
};
