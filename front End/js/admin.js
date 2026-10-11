/* ==========================================================================
   admin.js - Admin Dashboard Logic (admin.html)
   ========================================================================== */

async function loadAdminInfo() {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "index.html";
        return;
    }

    const userInfoElem = document.getElementById("userInfo");
    if (userInfoElem) userInfoElem.innerText = "Loading Admin profile...";

    const res = await apiFetch('/auth/me');

    if (res.ok && res.user) {
        if (res.user.role !== 'admin') {
            alert("Access restricted to Administrators.");
            window.location.href = "home.html";
            return;
        }

        localStorage.setItem("currentUser", JSON.stringify(res.user));
        if (userInfoElem) {
            userInfoElem.innerText = `Admin Dashboard: ${res.user.name || res.user.username}`;
        }
    } else {
        const user = JSON.parse(localStorage.getItem("currentUser"));
        if (user && user.role === 'admin' && userInfoElem) {
            userInfoElem.innerText = `Admin Dashboard: ${user.name || user.username}`;
        } else {
            window.location.href = "index.html";
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadAdminInfo();
});
