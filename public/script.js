let accountData = {
	roblox: null,
	discord: null,
	groupRole: null,
	lastLogin: null,
	currentLogin: null
}

const GROUP_ID = 14825724

function setAvatar(element, account, fallback, type, loginUrl) {
	element.innerHTML = ""

	element.classList.remove(
		"roblox",
		"discord",
		"not-linked"
	)

	element.onclick = null
	element.style.cursor = "default"

	if (account && account.avatar) {
		const image = document.createElement("img")

		image.src = account.avatar
		image.alt = ""

		image.onerror = function () {
			element.innerHTML = `<span>${fallback}</span>`
			element.classList.add("not-linked")

			if (loginUrl) {
				element.style.cursor = "pointer"
				element.onclick = function () {
					window.location.href = loginUrl
				}
			}
		}

		element.appendChild(image)
		element.classList.add(type)
	} else {
		element.innerHTML = `<span>${fallback}</span>`
		element.classList.add("not-linked")

		element.style.cursor = "pointer"

		element.onclick = function () {
			window.location.href = loginUrl
		}
	}
}

async function loadGroupRole() {
	if (!accountData.roblox) {
		accountData.groupRole = null
		return
	}

	try {
		const response = await fetch(
			`/api/roblox/${accountData.roblox.id}/groups/${GROUP_ID}/role`
		)

		if (!response.ok) {
			accountData.groupRole = null
			return
		}

		const data = await response.json()

		if (data.found && data.role) {
			accountData.groupRole = data.role
		} else {
			accountData.groupRole = null
		}
	} catch (error) {
		console.error(
			"Failed to load Roblox group role:",
			error
		)

		accountData.groupRole = null
	}
}

function updateAccounts() {
	const robloxAvatar =
		document.getElementById("robloxAvatar")

	const discordAvatar =
		document.getElementById("discordAvatar")

	const robloxUsername =
		document.getElementById("robloxUsername")

	const robloxId =
		document.getElementById("robloxId")

	const discordUsername =
		document.getElementById("discordUsername")

	const discordId =
		document.getElementById("discordId")

	setAvatar(
		robloxAvatar,
		accountData.roblox,
		"R",
		"roblox",
		"/login/roblox"
	)

	setAvatar(
		discordAvatar,
		accountData.discord,
		"D",
		"discord",
		"/login/discord"
	)

	if (accountData.roblox) {
		robloxUsername.textContent =
			accountData.roblox.username

		robloxId.textContent =
			`ID: ${accountData.roblox.id}`
	} else {
		robloxUsername.textContent = "Not linked"
		robloxId.textContent = "No Roblox account linked"
	}

	if (accountData.discord) {
		discordUsername.textContent =
			accountData.discord.username

		discordId.textContent =
			`ID: ${accountData.discord.id}`
	} else {
		discordUsername.textContent = "Not linked"
		discordId.textContent = "No Discord account linked"
	}

	const linked =
		accountData.roblox &&
		accountData.discord

	const status =
		document.getElementById("connectionStatus")

	const icon =
		document.getElementById("connectionIcon")

	if (linked) {
		status.textContent = "ACCOUNTS LINKED"
		status.classList.remove("not-linked")

		icon.textContent = "🔗"
	} else {
		status.textContent = "NOT LINKED"
		status.classList.add("not-linked")

		icon.textContent = "×"
	}

	const lastLogin = document.getElementById("lastLogin")

if (lastLogin) {
	if (accountData.lastLogin) {
		lastLogin.textContent =
			new Date(accountData.lastLogin).toLocaleString()
	} else {
		lastLogin.textContent = "Never"
	}
}

	if (accountData.roblox) {
		document.getElementById("headerUsername").textContent =
			accountData.roblox.username

		document.querySelector(".Welcome h2").textContent =
			`Welcome back, ${accountData.roblox.username}.`

		document.getElementById("headerRank").textContent =
			accountData.groupRole
				? accountData.groupRole.name
				: "Not in group"
		document.getElementById("headerRank_CLEARANCE").textContent =
			accountData.groupRole
				? accountData.groupRole.name
				: "Not in group"
		document.getElementById("headerRank_ACCESS").textContent =
			accountData.groupRole
				? accountData.groupRole.name
				: "Not in group"
		const headerAvatar =
			document.getElementById("headerAvatar")

		if (headerAvatar && accountData.roblox.avatar) {
			headerAvatar.innerHTML = ""

			const image = document.createElement("img")

			image.src = accountData.roblox.avatar
			image.alt = ""

			headerAvatar.appendChild(image)
		}
	}
}

async function loadAccount() {
	try {
		const response = await fetch("/api/account")

		if (!response.ok) {
			window.location.href = "/"
			return
		}

		const data = await response.json()

		if (!data.loggedIn) {
			window.location.href = "/"
			return
		}

		accountData.roblox = data.roblox
		accountData.discord = data.discord
		accountData.groupRole = data.groupRole
		accountData.lastLogin = data.lastLogin
		accountData.currentLogin = data.currentLogin

		await loadGroupRole()

		updateAccounts()
	} catch (error) {
		console.error("Failed to load account:", error)
	}
}

function logout() {
	window.location.href = "/logout"
}

function showOAuthToast(message) {
	const toast =
		document.getElementById("oauthToast")

	const messageElement =
		document.getElementById("oauthToastMessage")

	const close =
		document.getElementById("oauthToastClose")

	if (!toast || !messageElement) {
		return
	}

	messageElement.textContent = message

	toast.classList.add("show")

	let timeout = setTimeout(() => {
		toast.classList.remove("show")
	}, 6000)

	if (close) {
		close.onclick = () => {
			clearTimeout(timeout)
			toast.classList.remove("show")
		}
	}
}

function showOAuthError() {
	const params = new URLSearchParams(
		window.location.search
	)

	const error = params.get("oauthError")

	if (!error) {
		return
	}

	const messages = {
		invalid_session:
			"Invalid session. Please re-authenticate.",

		invalid_code:
			"This authorization code is invalid or has already been used. Please try again.",

		cancelled:
			"Authentication was cancelled.",

		authorization_failed:
			"Roblox authentication failed. Please try again.",

		token_failed:
			"Failed to authenticate with Roblox. Please try again.",

		userinfo_failed:
			"Failed to retrieve your Roblox account. Please try again.",

		server_error:
			"An unexpected error occurred. Please try again."
	}

	const message =
		messages[error] ||
		"Authentication failed. Please try again."

	showOAuthToast(message)

	const url = new URL(
		window.location.href
	)

	url.searchParams.delete("oauthError")

	window.history.replaceState(
		{},
		document.title,
		url.pathname + url.search
	)
}

showOAuthError()

loadAccount()

