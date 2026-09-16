document.addEventListener("DOMContentLoaded", loadProfile)

async function loadProfile() {
    try {
        const response = await fetch("/api/profile", {
            credentials: "include"
        })

        const data = await response.json()

        if (!response.ok) {
            throw new Error(data.error || "Failed to load profile")
        }

        renderProfile(data)

    } catch (error) {
        console.error("Profile loading failed:", error)

        document.querySelector(".Content").innerHTML = `
            <div class="Panel">
                <div class="ProfileError">
                    Unable to load personnel profile.
                    <br>
                    <small>${escapeHtml(error.message)}</small>
                </div>
            </div>
        `
    }
}


function renderProfile(data) {

    const user = data.user
    const mainGroup = data.mainGroup
    const discord = data.discord
    const warnings = data.warnings || []

    setText("profileUsername", user.username)
    setText("infoUsername", user.username)

    setText("infoRobloxId", user.id)
    setText("robloxUsername", user.username)
    setText("robloxId", `ID: ${user.id}`)

    setText(
        "profileRank",
        mainGroup ? mainGroup.role.name : "No Foundation rank"
    )

    setText(
        "infoRank",
        mainGroup ? mainGroup.role.name : "Not a member"
    )

    setText(
        "infoRankId",
        mainGroup ? mainGroup.role.rank : "—"
    )

    if (data.clearance) {
        setText("profileClearance", data.clearance)
        setText("infoClearance", data.clearance)
    }

    if (data.lastLogin) {
        setText(
            "lastLogin",
            formatDate(data.lastLogin)
        )
    }


    setAvatar(
        "profileAvatar",
        user.avatar
    )

    setAvatar(
        "headerAvatar",
        user.avatar
    )

    setAvatar(
        "robloxAvatar",
        user.avatar
    )


    setText(
        "headerUsername",
        user.username
    )

    setText(
        "headerRank",
        mainGroup
            ? mainGroup.role.name
            : "Foundation Personnel"
    )


    if (discord) {

        setText(
            "discordUsername",
            discord.username || "Linked"
        )

        setText(
            "discordId",
            discord.id
                ? `ID: ${discord.id}`
                : "Discord account linked"
        )

        if (discord.avatar) {
            setAvatar(
                "discordAvatar",
                discord.avatar
            )
        }

    } else {

        setText(
            "discordUsername",
            "Not linked"
        )

        setText(
            "discordId",
            "No Discord account linked"
        )

    }


    renderGroups(
        data.groups || [],
        mainGroup
    )

    renderWarnings(warnings)
}


function renderGroups(groups, mainGroup) {

    const container =
        document.getElementById("groupsContainer")

    if (!groups.length) {

        container.innerHTML = `
            <div class="EmptyRecord">
                <strong>No group memberships found</strong>
                This Roblox account is not currently a member of any groups.
            </div>
        `

        return
    }


    container.innerHTML = groups
        .map(group => {

            const isMain =
                mainGroup &&
                String(group.group.id) ===
                String(mainGroup.group.id)

            return `
                <div class="GroupCard ${isMain ? "mainGroup" : ""}">

                    <div class="GroupIcon">

                        ${
                            group.group.icon
                                ? `<img src="${escapeAttribute(group.group.icon)}" alt="">`
                                : `<span>G</span>`
                        }

                    </div>


                    <div class="GroupInformation">

                        <strong>
                            ${escapeHtml(group.group.name)}
                        </strong>

                        <small>
                            Group ID: ${escapeHtml(String(group.group.id))}
                        </small>

                        ${
                            isMain
                                ? `<span class="MainGroupBadge">MAIN FOUNDATION GROUP</span>`
                                : ""
                        }

                    </div>


                    <div class="GroupRole">

                        <span>ROLE</span>

                        <strong>
                            ${escapeHtml(group.role.name)}
                        </strong>

                    </div>


                    <div class="GroupRank">

                        <span>RANK ID</span>

                        <strong>
                            ${escapeHtml(String(group.role.rank))}
                        </strong>

                    </div>

                </div>
            `
        })
        .join("")
}


function renderWarnings(warnings) {

    const container =
        document.getElementById("warningsContainer")

    if (!warnings.length) {

        container.innerHTML = `
            <div class="EmptyRecord">
                <strong>No active warnings</strong>
                No disciplinary records are currently associated with this personnel account.
            </div>
        `

        return
    }


    container.innerHTML = warnings
        .map(warning => {

            return `
                <div class="WarningCard">

                    <div class="WarningIcon">
                        !
                    </div>


                    <div class="WarningInformation">

                        <strong>
                            ${escapeHtml(warning.title || "Personnel Warning")}
                        </strong>

                        <p>
                            ${escapeHtml(warning.reason || "No reason provided.")}
                        </p>

                    </div>


                    <div class="WarningMeta">

                        <span>
                            ${escapeHtml(warning.issued_by || "Unknown")}
                        </span>

                        <strong>
                            ${formatDate(warning.issued_at)}
                        </strong>

                    </div>

                </div>
            `
        })
        .join("")
}


function setText(id, value) {

    const element = document.getElementById(id)

    if (element) {
        element.textContent = value ?? "—"
    }
}


function setAvatar(id, url) {

    const element =
        document.getElementById(id)

    if (!element || !url) {
        return
    }

    element.innerHTML = ""

    const image =
        document.createElement("img")

    image.src = url
    image.alt = ""

    element.appendChild(image)
}


function formatDate(value) {

    if (!value) {
        return "—"
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return value
    }

    return date.toLocaleString(
        undefined,
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    )
}


function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;")
}


function escapeAttribute(value) {
    return escapeHtml(value)
}
