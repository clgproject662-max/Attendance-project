/* ==========================================================================
   attendance.js - Attendance Entry Logic (attendance.html)
   ========================================================================== */

let currentStudents = [];
let attendanceMap = {}; // Maps studentId -> 'present' | 'absent'

/**
 * Render attendance roster for selected date from MongoDB backend
 */
async function renderAttendance() {
    const dateInput = document.getElementById("attendanceDate");
    if (!dateInput) return;

    let date = dateInput.value;
    if (!date) {
        const today = new Date().toISOString().split("T")[0];
        dateInput.value = today;
        date = today;
    }

    const tbody = document.getElementById("attendanceBody");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="4" style="padding: 20px;">Loading student list from database...</td></tr>`;

    // 1. Fetch students for this staff/class from backend
    const studentRes = await apiFetch('/students');

    if (!studentRes.ok || !Array.isArray(studentRes.students)) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="padding: 24px; color: #fca5a5;">
                    ${studentRes.message || 'Failed to load students from database. Make sure backend is running.'}
                </td>
            </tr>`;
        return;
    }

    currentStudents = studentRes.students;

    if (currentStudents.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="padding: 24px; color: #fca5a5;">
                    No registered students found for your class.
                    <br><small>Upload students via Excel or register them first.</small>
                </td>
            </tr>`;
        updateAttendanceStats();
        return;
    }

    // 2. Fetch existing saved attendance records for this date from backend
    const attRes = await apiFetch(`/attendance?date=${encodeURIComponent(date)}`);
    attendanceMap = {};

    if (attRes.ok && Array.isArray(attRes.records)) {
        attRes.records.forEach(rec => {
            attendanceMap[rec.studentId.trim().toUpperCase()] = rec.status;
        });
    }

    // 3. Render student table
    tbody.innerHTML = "";

    currentStudents.forEach((s, idx) => {
        const sId = s.studentId.trim().toUpperCase();
        // Default to 'present' unless marked 'absent'
        const currentStatus = attendanceMap[sId] || 'present';
        const isAbsent = (currentStatus === 'absent');

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${s.serial || (idx + 1)}</td>
            <td>${s.studentId}</td>
            <td>${s.studentName}</td>
            <td>
                <label class="att-ball-label" title="Click to mark Absent (otherwise Present)">
                    <input type="checkbox"
                           class="att-ball-check"
                           id="att_check_${s.studentId}"
                           ${isAbsent ? "checked" : ""}
                           onchange="toggleAttendance('${s.studentId}', this.checked)">
                    <span class="att-ball ${isAbsent ? 'is-absent' : ''}" id="att_ball_${s.studentId}"></span>
                    <span class="att-text ${isAbsent ? 'text-absent' : 'text-present'}" id="att_text_${s.studentId}">
                        ${isAbsent ? 'Absent' : 'Present'}
                    </span>
                </label>
            </td>
        `;
        tbody.appendChild(row);
    });

    updateAttendanceStats();
}

/**
 * Single-ball interactive toggle handler
 */
function toggleAttendance(studentId, isAbsent) {
    const sId = String(studentId).trim().toUpperCase();
    attendanceMap[sId] = isAbsent ? 'absent' : 'present';

    const ball = document.getElementById("att_ball_" + studentId);
    const text = document.getElementById("att_text_" + studentId);

    if (ball) {
        if (isAbsent) {
            ball.classList.add("is-absent");
        } else {
            ball.classList.remove("is-absent");
        }
    }

    if (text) {
        text.textContent = isAbsent ? "Absent" : "Present";
        text.className = "att-text " + (isAbsent ? "text-absent" : "text-present");
    }

    updateAttendanceStats();
}

/**
 * Update the live stats counter bar
 */
function updateAttendanceStats() {
    const statsEl = document.getElementById("attendanceStats");
    if (!statsEl) return;

    const total = currentStudents.length;
    let absentCount = 0;

    currentStudents.forEach(s => {
        const sId = s.studentId.trim().toUpperCase();
        if (attendanceMap[sId] === 'absent') {
            absentCount++;
        }
    });

    const presentCount = total - absentCount;

    statsEl.innerHTML = `
        <div class="attendance-stats-bar">
            <span class="stat-item">Total: <strong>${total}</strong></span>
            <span class="stat-item stat-present">● Present: <strong>${presentCount}</strong></span>
            <span class="stat-item stat-absent">● Absent: <strong>${absentCount}</strong></span>
        </div>
    `;
}

/**
 * Save & Submit Attendance to MongoDB Atlas backend
 */
async function submitAttendance() {
    const dateInput = document.getElementById("attendanceDate");
    const date = dateInput ? dateInput.value : "";

    if (!date) {
        alert("Please select a date first");
        return;
    }

    if (currentStudents.length === 0) {
        alert("No students to submit attendance for.");
        return;
    }

    // Build payload array
    const records = currentStudents.map(s => {
        const sId = s.studentId.trim().toUpperCase();
        return {
            studentId: s.studentId,
            studentName: s.studentName,
            status: attendanceMap[sId] === 'absent' ? 'absent' : 'present'
        };
    });

    const user = getCurrentUser();
    const saveRes = await apiFetch('/attendance/mark', {
        method: 'POST',
        body: {
            date,
            department: user ? user.department : undefined,
            year: user ? user.year : undefined,
            records
        }
    });

    if (saveRes.ok) {
        alert(`✅ Attendance submitted successfully to database for ${date}!`);
    } else {
        alert(`❌ Failed to save attendance: ${saveRes.message || 'Server error'}`);
    }
}

// Initialise on page load
document.addEventListener("DOMContentLoaded", () => {
    const dateInput = document.getElementById("attendanceDate");
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split("T")[0];
    }
    renderAttendance();
});
