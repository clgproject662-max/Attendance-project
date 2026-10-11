const Student = require('../models/Student');
const Attendance = require('../models/Attendance');

/**
 * @desc    Generate attendance summary report for class within date range
 * @route   GET /api/reports/attendance
 * @access  Private
 */
const getAttendanceReport = async (req, res) => {
    try {
        const { department, year, from, to } = req.query;

        const targetDept = (req.user.role === 'staff') ? req.user.department : department;
        const targetYear = (req.user.role === 'staff' && req.user.year !== 'All') ? req.user.year : year;

        if (!targetDept || !targetYear) {
            return res.status(400).json({
                success: false,
                message: 'Department and Year are required'
            });
        }

        if (!from || !to) {
            return res.status(400).json({
                success: false,
                message: 'Start date (from) and End date (to) are required (YYYY-MM-DD)'
            });
        }

        if (from > to) {
            return res.status(400).json({
                success: false,
                message: 'From date cannot be after To date'
            });
        }

        // 1. Fetch all enrolled active students in class
        const students = await Student.find({
            department: targetDept,
            year: targetYear,
            status: 'active'
        }).sort({ serial: 1, studentId: 1 });

        if (students.length === 0) {
            return res.status(200).json({
                success: true,
                message: `No active students found for ${targetDept} Year ${targetYear}`,
                totalStudents: 0,
                totalRecordedDays: 0,
                report: []
            });
        }

        // 2. Fetch all attendance records in date range
        const attendanceRecords = await Attendance.find({
            department: targetDept,
            year: targetYear,
            date: { $gte: from.trim(), $lte: to.trim() }
        });

        // 3. Determine unique recorded dates
        const recordedDatesSet = new Set(attendanceRecords.map(r => r.date));
        let totalTrackedDays = recordedDatesSet.size;

        // Fallback: If no explicit attendance was recorded, calculate weekdays count
        if (totalTrackedDays === 0) {
            let count = 0;
            let cur = new Date(from);
            const end = new Date(to);
            while (cur <= end) {
                const day = cur.getDay();
                if (day !== 0 && day !== 6) count++;
                cur.setDate(cur.getDate() + 1);
            }
            totalTrackedDays = count > 0 ? count : 1;
        }

        // 4. Calculate individual student attendance metrics
        const report = students.map((s, idx) => {
            const sId = s.studentId.trim().toUpperCase();

            const studentRecords = attendanceRecords.filter(r =>
                r.studentId.trim().toUpperCase() === sId
            );

            // Explicit absent records
            const absentDays = studentRecords.filter(r => r.status === 'absent').length;

            const effectiveTotal = Math.max(totalTrackedDays, absentDays);
            const presentDays = Math.max(0, effectiveTotal - absentDays);

            const percentage = effectiveTotal > 0
                ? Math.round((presentDays / effectiveTotal) * 100)
                : 100;

            return {
                serial: s.serial || (idx + 1),
                studentId: s.studentId,
                studentName: s.studentName,
                totalDays: effectiveTotal,
                present: presentDays,
                absent: absentDays,
                percentage
            };
        });

        res.status(200).json({
            success: true,
            department: targetDept,
            year: targetYear,
            from,
            to,
            totalStudents: students.length,
            totalRecordedDays: totalTrackedDays,
            report
        });
    } catch (error) {
        console.error('getAttendanceReport error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate attendance report',
            error: error.message
        });
    }
};

/**
 * @desc    View all enrolled students for class (Student Data button in report)
 * @route   GET /api/reports/students
 * @access  Private
 */
const getClassStudents = async (req, res) => {
    try {
        const { department, year } = req.query;

        const targetDept = (req.user.role === 'staff') ? req.user.department : department;
        const targetYear = (req.user.role === 'staff' && req.user.year !== 'All') ? req.user.year : year;

        if (!targetDept || !targetYear) {
            return res.status(400).json({
                success: false,
                message: 'Department and Year are required'
            });
        }

        const students = await Student.find({
            department: targetDept,
            year: targetYear,
            status: 'active'
        }).sort({ serial: 1, studentId: 1 });

        res.status(200).json({
            success: true,
            department: targetDept,
            year: targetYear,
            count: students.length,
            students
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve class student data',
            error: error.message
        });
    }
};

/**
 * @desc    Delete all students and attendance for a class (Admin Only)
 * @route   DELETE /api/reports/class
 * @access  Private (Admin Only)
 */
const deleteClassData = async (req, res) => {
    try {
        const { department, year } = req.body;

        if (!department || !year) {
            return res.status(400).json({
                success: false,
                message: 'Department and Year are required to delete class data'
            });
        }

        const studentDeleteResult = await Student.deleteMany({
            department: department.trim(),
            year: String(year).trim()
        });

        const attendanceDeleteResult = await Attendance.deleteMany({
            department: department.trim(),
            year: String(year).trim()
        });

        res.status(200).json({
            success: true,
            message: `Deleted ${studentDeleteResult.deletedCount} students and ${attendanceDeleteResult.deletedCount} attendance records for ${department} Year ${year}`,
            deletedStudents: studentDeleteResult.deletedCount,
            deletedAttendance: attendanceDeleteResult.deletedCount
        });
    } catch (error) {
        console.error('deleteClassData error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete class data',
            error: error.message
        });
    }
};

module.exports = {
    getAttendanceReport,
    getClassStudents,
    deleteClassData
};
