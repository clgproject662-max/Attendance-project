/* ========================================================
   admin.js - JavaScript for admin.html
   ======================================================== */

const BASE_URL = 'http://localhost:5000/api';

/**
 * Check if user is authenticated. Auto-initialise admin session if missing.
 */
function checkAuth() {
    let currentUser = JSON.parse(localStorage.getItem("currentUser"));

    if (!currentUser) {
        currentUser = {
            username: "admin",
            role: "admin"
        };
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
        localStorage.setItem("token", "admin-token-authenticated");
    }

    return currentUser;
}

/**
 * Display admin username inside <h2 id="userInfo"></h2>
 */
function loadAdminInfo() {
    const currentUser = checkAuth();
    if (!currentUser) return;

    const userInfoElem = document.getElementById("userInfo");
    if (!userInfoElem) return;

    const username = currentUser.username || "admin";
    userInfoElem.innerText = `Admin: ${username}`;
}

/**
 * Logout: clear session and redirect to index.html.
 */
function logout() {
    if (confirm("Are you sure you want to logout?")) {
        try {
            fetch(`${BASE_URL}/logout`, { method: "POST" }).catch(() => {});
        } catch (e) {}

        localStorage.removeItem("currentUser");
        localStorage.removeItem("token");
        localStorage.removeItem("department");
        localStorage.removeItem("year");

        window.location.href = "index.html";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadAdminInfo();
});
