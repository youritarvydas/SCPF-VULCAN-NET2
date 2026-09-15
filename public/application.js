"use strict";

const EXPERIMENT_ID = "115720637427314";

document.addEventListener("DOMContentLoaded", function () {

    const launchButton =
        document.getElementById("launchButton");

    const logoutButton =
        document.getElementById("logoutButton");

    const message =
        document.getElementById("message");


    if (!launchButton) {
        console.error(
            "[SCPF] launchButton was not found."
        );

        return;
    }


    launchButton.addEventListener("click", function () {

        message.textContent = "";


        if (!/^\d+$/.test(EXPERIMENT_ID)) {

            message.textContent =
                "Invalid experiment ID.";

            return;
        }


        const robloxURL =
            "roblox://placeId=" + EXPERIMENT_ID;


        console.log(
            "[SCPF] Launching Roblox:",
            robloxURL
        );


        window.location.href = robloxURL;

    });


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
