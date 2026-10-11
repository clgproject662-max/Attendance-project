/* ==========================================================================
   excelupload.js - Excel Student Upload Logic (excelupload.html)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    const uploadForm = document.getElementById("uploadForm");
    if (!uploadForm) return;

    uploadForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const department = document.getElementById("department").value;
        const year = document.getElementById("year").value;
        const fileInput = document.getElementById("file");
        const resultEl = document.getElementById("result");

        if (!department || !year) {
            resultEl.innerHTML = "<span style='color:#fca5a5;'>⚠️ Please select Department and Year.</span>";
            return;
        }

        if (!fileInput.files || !fileInput.files[0]) {
            resultEl.innerHTML = "<span style='color:#fca5a5;'>⚠️ Please select an Excel file.</span>";
            return;
        }

        const file = fileInput.files[0];
        resultEl.innerHTML = "<span>Parsing file and saving to database...</span>";

        // 1. Generate client-side preview using SheetJS
        const reader = new FileReader();

        reader.onload = async function (evt) {
            try {
                const data = new Uint8Array(evt.target.result);
                const workbook = XLSX.read(data, { type: "array" });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

                if (rows.length === 0) {
                    resultEl.innerHTML = "<span style='color:#fca5a5;'>⚠️ Excel file is empty or unreadable.</span>";
                    return;
                }

                const parsedStudents = [];
                let preview = "<table style='margin:12px auto;color:#fff;'><thead><tr><th>No.</th><th>ID</th><th>Name</th></tr></thead><tbody>";

                rows.forEach((row, index) => {
                    const keys = Object.keys(row);

                    const id = String(
                        row["reg number"]  || row["Reg Number"]  || row["REG NUMBER"]  ||
                        row["regno"]       || row["RegNo"]       || row["Reg No"]      ||
                        row["reg no"]      || row["register no"] || row["Register No"] ||
                        row["studentId"]   || row["StudentId"]   || row["student id"]  ||
                        row["id"]          || row["ID"]          ||
                        (keys[1] !== undefined ? row[keys[1]] : "") || ""
                    ).trim().toUpperCase();

                    const name = String(
                        row["bname"]       || row["Bname"]       || row["BNAME"]       ||
                        row["name"]        || row["Name"]        || row["NAME"]        ||
                        row["studentName"] || row["StudentName"] || row["student name"]||
                        row["Student"]     || row["student"]     ||
                        (keys[2] !== undefined ? row[keys[2]] : keys[1] !== undefined ? row[keys[1]] : "") || ""
                    ).trim();

                    const serialFromFile = row["serial number"] || row["Serial Number"] ||
                                           row["S.No"] || row["sno"] || row["Sno"] || (index + 1);

                    if (!id && !name) return;

                    const serial = Number(serialFromFile) || (index + 1);

                    parsedStudents.push({
                        serial,
                        studentId: id || ("STU" + (index + 1)),
                        studentName: name || "Unknown",
                        department,
                        year
                    });

                    preview += `<tr><td>${serial}</td><td>${id}</td><td>${name}</td></tr>`;
                });

                preview += "</tbody></table>";

                // 2. Save directly to MongoDB Atlas backend via batch API
                const saveRes = await apiFetch('/students/batch', {
                    method: 'POST',
                    body: {
                        department,
                        year,
                        students: parsedStudents
                    }
                });

                if (saveRes.ok) {
                    resultEl.innerHTML = `
                        <span style="color:#86efac;font-weight:bold;">
                            ✅ Successfully imported ${saveRes.count || parsedStudents.length} students into MongoDB Atlas for ${department}, Year ${year}!
                        </span><br>` + preview;
                } else {
                    resultEl.innerHTML = `<span style='color:#fca5a5;'>❌ Server error: ${saveRes.message || 'Failed to save to database.'}</span>`;
                }

            } catch (err) {
                console.error("Excel upload error:", err);
                resultEl.innerHTML = "<span style='color:#fca5a5;'>❌ Failed to parse or upload Excel file.</span>";
            }
        };

        reader.readAsArrayBuffer(file);
    });
});
