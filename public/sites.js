const API_URL = "/api/servers";

const REFRESH_INTERVAL = 15000;

let servers = [];

let refreshTimer = null;


document.addEventListener("DOMContentLoaded", () => {

    setupEvents();

    loadAccount();

    loadServers();

    refreshTimer = setInterval(
        loadServers,
        REFRESH_INTERVAL
    );

});


function setupEvents() {

    const refreshButton =
        document.getElementById("refreshButton");

    const siteFilter =
        document.getElementById("siteFilter");


    refreshButton.addEventListener(
        "click",
        loadServers
    );


    siteFilter.addEventListener(
        "change",
        renderServers
    );

}


async function loadServers() {

    const refreshButton =
        document.getElementById("refreshButton");

    const serverList =
        document.getElementById("serverList");


    refreshButton.classList.add("loading");

    refreshButton.textContent =
        "↻ Loading";


    try {

        const response =
            await fetch(API_URL, {
                method: "GET",
                credentials: "include",

                headers: {
                    "Accept": "application/json"
                }
            });


        if (!response.ok) {

            throw new Error(
                `Server returned HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        servers =
            Array.isArray(data.servers)
                ? data.servers
                : [];


        updateStatistics();

        updateSiteFilter();

        renderServers();

    }

    catch (error) {

        console.error(
            "Failed to load servers:",
            error
        );


        serverList.innerHTML = `
            <div class="ErrorState">

                <strong>
                    NETWORK ERROR
                </strong>

                <span>
                    Unable to retrieve active Foundation
                    servers. The server registry may currently
                    be unavailable.
                </span>

            </div>
        `;

    }

    finally {

        refreshButton.classList.remove(
            "loading"
        );

        refreshButton.textContent =
            "↻ Refresh";

    }

}


function updateStatistics() {

    const activeSites =
        document.getElementById("activeSites");

    const onlineServers =
        document.getElementById("onlineServers");

    const personnelOnline =
        document.getElementById("personnelOnline");

    const lastUpdate =
        document.getElementById("lastUpdate");


    const online =
        servers.filter(
            server =>
                server.status !== "offline"
        );


    const sites =
        new Set(
            online
                .map(server => server.site)
                .filter(Boolean)
        );


    const personnel =
        online.reduce(
            (total, server) =>
                total +
                Number(server.players || 0),
            0
        );


    activeSites.textContent =
        sites.size;


    onlineServers.textContent =
        online.length;


    personnelOnline.textContent =
        personnel;


    lastUpdate.textContent =
        new Date().toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );

}


function updateSiteFilter() {

    const filter =
        document.getElementById("siteFilter");

    const currentValue =
        filter.value;


    const sites =
        [...new Set(
            servers
                .map(server => server.site)
                .filter(Boolean)
        )].sort();


    filter.innerHTML = `
        <option value="all">
            All Sites
        </option>
    `;


    for (const site of sites) {

        const option =
            document.createElement("option");

        option.value = site;

        option.textContent = site;

        filter.appendChild(option);

    }


    if (
        currentValue === "all" ||
        sites.includes(currentValue)
    ) {

        filter.value = currentValue;

    }

}


function renderServers() {

    const serverList =
        document.getElementById("serverList");

    const filter =
        document.getElementById("siteFilter");


    const selectedSite =
        filter.value;


    let filteredServers =
        servers.filter(
            server =>
                server.status !== "offline"
        );


    if (selectedSite !== "all") {

        filteredServers =
            filteredServers.filter(
                server =>
                    server.site === selectedSite
            );

    }


    if (filteredServers.length === 0) {

        serverList.innerHTML = `
            <div class="EmptyState">

                <strong>
                    NO ACTIVE SERVERS
                </strong>

                <span>
                    No Foundation Roblox servers are
                    currently registered on this network.
                </span>

            </div>
        `;

        return;

    }


    serverList.innerHTML =
        filteredServers
            .map(createServerCard)
            .join("");


    document
        .querySelectorAll(".JoinButton")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const jobId =
                        button.dataset.jobId;

                    const placeId =
                        button.dataset.placeId;


                    joinServer(
                        placeId,
                        jobId
                    );

                }
            );

        });

}


function createServerCard(server) {

    const players =
        Number(server.players || 0);

    const maxPlayers =
        Number(server.maxPlayers || 1);


    const playerPercentage =
        Math.min(
            100,
            Math.max(
                0,
                (players / maxPlayers) * 100
            )
        );


    const uptime =
        formatUptime(
            server.uptime ||
            (
                Date.now() -
                Number(server.startedAt || Date.now())
            ) / 1000
        );


    const ping =
        Number(server.ping || 0);


    const pingText =
        ping > 0
            ? `${ping} ms`
            : "N/A";


    const region =
        escapeHTML(
            server.region ||
            "Unknown"
        );


    const site =
        escapeHTML(
            server.site ||
            "Unknown Site"
        );


    const description =
        escapeHTML(
            server.description ||
            "Foundation containment facility"
        );


    const jobId =
        escapeHTML(
            server.jobId ||
            "Unknown"
        );


    const placeId =
        escapeHTML(
            server.placeId ||
            ""
        );


    const disabled =
        !server.placeId ||
        !server.jobId;


    return `
        <article class="ServerCard">

            <div class="ServerIdentity">

                <div class="ServerTitle">

                    <h4>
                        ${site}
                    </h4>

                    <span class="ServerStatus">
                        ONLINE
                    </span>

                </div>


                <p class="ServerDescription">
                    ${description}
                </p>


                <div class="ServerJob">
                    JOB ID:
                    ${jobId}
                </div>

            </div>


            <div>

                <div class="ServerMetrics">

                    <div class="Metric">

                        <span>
                            Personnel
                        </span>

                        <strong>
                            ${players}/${maxPlayers}
                        </strong>

                        <div class="PlayerBar">
                            <span
                                style="width:${playerPercentage}%"
                            ></span>
                        </div>

                    </div>


                    <div class="Metric">

                        <span>
                            Region
                        </span>

                        <strong>
                            ${region}
                        </strong>

                    </div>


                    <div class="Metric">

                        <span>
                            Ping
                        </span>

                        <strong>
                            ${pingText}
                        </strong>

                    </div>


                    <div class="Metric">

                        <span>
                            Uptime
                        </span>

                        <strong>
                            ${uptime}
                        </strong>

                    </div>

                </div>

            </div>


            <div class="ServerAction">

                <button
                    class="JoinButton"
                    data-job-id="${jobId}"
                    data-place-id="${placeId}"
                    ${disabled ? "disabled" : ""}
                >
                    ↗ Join Server
                </button>

            </div>

        </article>
    `;

}


function joinServer(placeId, jobId) {

    if (!placeId || !jobId) {

        return;

    }


    const url =
        `https://www.roblox.com/games/start` +
        `?placeId=${encodeURIComponent(placeId)}` +
        `&gameInstanceId=${encodeURIComponent(jobId)}`;


    window.location.href = url;

}


function formatUptime(seconds) {

    seconds =
        Math.max(
            0,
            Math.floor(
                Number(seconds) || 0
            )
        );


    const days =
        Math.floor(
            seconds / 86400
        );


    seconds %= 86400;


    const hours =
        Math.floor(
            seconds / 3600
        );


    seconds %= 3600;


    const minutes =
        Math.floor(
            seconds / 60
        );


    if (days > 0) {

        return `${days}d ${hours}h`;

    }


    if (hours > 0) {

        return `${hours}h ${minutes}m`;

    }


    return `${minutes}m`;

}


function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


async function loadAccount() {

    try {

        const response =
            await fetch(
                "/api/account",
                {
                    credentials: "include"
                }
            );


        if (!response.ok) {

            return;

        }


        const account =
            await response.json();


        if (account.username) {

            document
                .getElementById("headerUsername")
                .textContent =
                account.username;

        }


        if (account.rank) {

            document
                .getElementById("headerRank")
                .textContent =
                account.rank;

        }


        if (account.avatar) {

            document
                .getElementById("headerAvatar")
                .innerHTML =
                `<img src="${escapeHTML(account.avatar)}" alt="">`;

        }

    }

    catch (error) {

        console.warn(
            "Account information unavailable:",
            error
        );

    }

}


function logout() {

    window.location.href =
        "/logout";

}
