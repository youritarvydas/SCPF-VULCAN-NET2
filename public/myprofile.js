document.addEventListener("DOMContentLoaded", async function () {


const warning =
    document.getElementById("warning");

const profileAvatar =
    document.getElementById("profileAvatar");

const topAvatar =
    document.getElementById("topAvatar");

const profileUsername =
    document.getElementById("profileUsername");

const profileDisplayName =
    document.getElementById("profileDisplayName");

const profileUserId =
    document.getElementById("profileUserId");

const topUsername =
    document.getElementById("topUsername");

const topRank =
    document.getElementById("topRank");

const accountUsername =
    document.getElementById("accountUsername");

const accountDisplayName =
    document.getElementById("accountDisplayName");

const accountUserId =
    document.getElementById("accountUserId");

const foundationName =
    document.getElementById("foundationName");

const foundationId =
    document.getElementById("foundationId");

const foundationIcon =
    document.getElementById("foundationIcon");

const foundationRank =
    document.getElementById("foundationRank");

const foundationRoleId =
    document.getElementById("foundationRoleId");

const foundationMember =
    document.getElementById("foundationMember");

const foundationStatus =
    document.getElementById("foundationStatus");

const alliesList =
    document.getElementById("alliesList");

const allyCount =
    document.getElementById("allyCount");

const logoutButton =
    document.getElementById("logoutButton");

try {

    const response =
        await fetch("/api/profile", {
            credentials: "include"
        });

    if (!response.ok) {
        throw new Error(
            "Failed to load profile."
        );
    }

    const data =
        await response.json();

    if (!data.success) {
        throw new Error(
            data.error || "Failed to load profile."
        );
    }

    const user =
        data.user;

    const foundation =
        data.foundation;

    const allies =
        data.allies || [];


    profileAvatar.src =
        user.avatar || "";

    topAvatar.src =
        user.avatar || "";

    profileUsername.textContent =
        user.username || "Unknown";

    profileDisplayName.textContent =
        user.displayName ||
        user.username ||
        "Unknown";

    profileUserId.textContent =
        user.id;

    topUsername.textContent =
        user.username || "Unknown";

    topRank.textContent =
        foundation?.role?.name ||
        "No Foundation Rank";

    accountUsername.textContent =
        user.username || "Unknown";

    accountDisplayName.textContent =
        user.displayName || "Unknown";

    accountUserId.textContent =
        user.id;


    if (foundation && foundation.member) {

        foundationName.textContent =
            foundation.group.name;

        foundationId.textContent =
            foundation.group.id;

        foundationIcon.src =
            foundation.group.icon;

        foundationRank.textContent =
            foundation.role.name;

        foundationRoleId.textContent =
            foundation.role.id;

        foundationMember.textContent =
            "YES";

        foundationStatus.textContent =
            "MEMBER";

        foundationStatus.classList.remove(
            "not-member"
        );

    } else {

        foundationName.textContent =
            "SCPF Foundation";

        foundationRank.textContent =
            "Not a member";

        foundationRoleId.textContent =
            "-";

        foundationMember.textContent =
            "NO";

        foundationStatus.textContent =
            "NOT MEMBER";

        foundationStatus.classList.add(
            "not-member"
        );

        warning.classList.remove(
            "hidden"
        );

    }


    allyCount.textContent =
        `${allies.length} ALL${allies.length === 1 ? "Y" : "IES"}`;

    alliesList.innerHTML = "";


    if (allies.length === 0) {

        alliesList.innerHTML =
            `<div class="empty">
                No allied groups found.
            </div>`;

    } else {

        allies.forEach(function (ally) {

            const entry =
                document.createElement("div");

            entry.className =
                "group-entry";

            entry.innerHTML = `
                <img
                    src="${escapeHTML(ally.icon)}"
                    alt=""
                >

                <div class="group-entry-content">

                    <strong>
                        ${escapeHTML(ally.name)}
                    </strong>

                    <span>
                        Allied Group · ID ${escapeHTML(String(ally.id))}
                    </span>

                </div>
            `;

            alliesList.appendChild(entry);

        });

    }

} catch (error) {

    console.error(
        "[SCPF Profile]",
        error
    );

    if (alliesList) {
        alliesList.innerHTML =
            `<div class="empty error">
                Failed to load allied groups.
            </div>`;
    }

}


if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        function () {

            window.location.href =
                "/logout";

        }
    );

}


});

function escapeHTML(value) {


return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");


}
