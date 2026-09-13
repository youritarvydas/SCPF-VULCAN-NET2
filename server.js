
require("dotenv").config()

const path = require("path")
const crypto = require("crypto")
const express = require("express")
const session = require("express-session")
const pgSession = require("connect-pg-simple")(session)
const { Pool } = require("pg")

const discordConnect = require("./DiscordConnect")

const {
	linkAccounts,
	getLinkByRobloxId
} = require("./accountStore")

const app = express()

const PORT = process.env.PORT || 3000

const ROBLOX_CLIENT_ID = process.env.ROBLOX_CLIENT_ID
const ROBLOX_CLIENT_SECRET = process.env.ROBLOX_CLIENT_SECRET

const SESSION_SECRET = process.env.SESSION_SECRET
const DATABASE_URL = process.env.DATABASE_URL

const ROBLOX_REDIRECT_URI =
	"https://scpf-vulcan-net20-production.up.railway.app/oauth/callback"

if (!ROBLOX_CLIENT_ID) {
	throw new Error("ROBLOX_CLIENT_ID is not configured.")
}

if (!ROBLOX_CLIENT_SECRET) {
	throw new Error("ROBLOX_CLIENT_SECRET is not configured.")
}

if (!SESSION_SECRET) {
	throw new Error("SESSION_SECRET is not configured.")
}

if (!DATABASE_URL) {
	throw new Error("DATABASE_URL is not configured.")
}

app.set("trust proxy", 1)

app.use(express.json())

app.use(
	session({
		store: new pgSession({
			pool: new Pool({
				connectionString: DATABASE_URL,
				ssl: {
					rejectUnauthorized: false
				}
			}),
			tableName: "user_sessions",
			createTableIfMissing: true
		}),

		name: "spas.sid",

		secret: SESSION_SECRET,

		resave: false,

		saveUninitialized: false,

		cookie: {
			httpOnly: true,
			secure: true,
			sameSite: "lax",
			maxAge: 1000 * 60 * 60 * 24 * 7
		}
	})
)

app.use(discordConnect)

app.get("/", (req, res) => {
	if (req.session.roblox || req.session.discord) {
		return res.redirect("/Dashboard.html")
	}

	res.sendFile(
		path.join(__dirname, "public", "index.html")
	)
})

app.use(express.static(path.join(__dirname, "public")))

app.get("/login/roblox", (req, res) => {
	const state = crypto.randomBytes(32).toString("hex")

	req.session.oauthState = state

	console.log("Roblox OAuth state created:", state)
	console.log("Session ID:", req.sessionID)

	req.session.save((err) => {
		if (err) {
			console.error(
				"Failed to save Roblox OAuth session:",
				err
			)

			return res
				.status(500)
				.send("Failed to initialize OAuth session.")
		}

		const params = new URLSearchParams({
			client_id: ROBLOX_CLIENT_ID,
			redirect_uri: ROBLOX_REDIRECT_URI,
			scope: "openid profile",
			response_type: "code",
			state
		})

		const authorizationUrl =
			`https://apis.roblox.com/oauth/v1/authorize?${params.toString()}`

		res.redirect(authorizationUrl)
	})
})

app.get("/oauth/callback", async (req, res) => {
	const {
		code,
		state,
		error,
		error_description
	} = req.query

	if (error) {
		return res.status(400).send(`
			<h1>Roblox OAuth Error</h1>
			<p>${error}</p>
			<p>${error_description || ""}</p>
		`)
	}

	if (!code) {
		return res
			.status(400)
			.send("Missing authorization code.")
	}

	if (!state) {
		return res
			.status(400)
			.send("Missing OAuth state.")
	}

	console.log("Roblox OAuth callback received.")
	console.log("Received state:", state)
	console.log("Session ID:", req.sessionID)
	console.log("Session state:", req.session.oauthState)

	if (!req.session.oauthState) {
		console.error(
			"Roblox OAuth state missing from session."
		)

		return res
			.status(400)
			.send("OAuth session expired or was lost.")
	}

	if (state !== req.session.oauthState) {
		console.error("Roblox OAuth state mismatch.")
		console.error("Expected:", req.session.oauthState)
		console.error("Received:", state)

		return res
			.status(400)
			.send("Invalid OAuth state.")
	}

	delete req.session.oauthState

	try {
		const tokenBody = new URLSearchParams({
			client_id: ROBLOX_CLIENT_ID,
			client_secret: ROBLOX_CLIENT_SECRET,
			grant_type: "authorization_code",
			code,
			redirect_uri: ROBLOX_REDIRECT_URI
		})

		const tokenResponse = await fetch(
			"https://apis.roblox.com/oauth/v1/token",
			{
				method: "POST",

				headers: {
					"Content-Type":
						"application/x-www-form-urlencoded"
				},

				body: tokenBody.toString()
			}
		)

		const tokens = await tokenResponse.json()

		if (!tokenResponse.ok) {
			console.error(
				"Roblox token error:",
				tokens
			)

			return res.status(400).json(tokens)
		}

		const userResponse = await fetch(
			"https://apis.roblox.com/oauth/v1/userinfo",
			{
				headers: {
					Authorization:
						`Bearer ${tokens.access_token}`
				}
			}
		)

		const user = await userResponse.json()

		if (!userResponse.ok) {
			console.error(
				"Roblox userinfo error:",
				user
			)

			return res.status(400).json(user)
		}

		console.log("Roblox user:", user)

		req.session.roblox = {
			id: user.sub,
			username:
				user.preferred_username ||
				user.nickname ||
				user.name,
			displayName:
				user.name ||
				user.nickname ||
				user.preferred_username,
			avatar: user.picture || null
		}

		req.session.robloxAccessToken =
			tokens.access_token

		if (req.session.discord) {
			await linkAccounts(
				req.session.roblox,
				req.session.discord
			)
		}

		req.session.save((err) => {
			if (err) {
				console.error(
					"Failed to save Roblox session:",
					err
				)

				return res
					.status(500)
					.send("Failed to save login session.")
			}

			console.log(
				"Roblox session saved:",
				req.sessionID
			)

			res.redirect("/Dashboard.html")
		})
	} catch (error) {
		console.error(
			"Roblox OAuth error:",
			error
		)

		res
			.status(500)
			.send("Internal server error.")
	}
})

app.get("/api/account", async (req, res) => {
	console.log(
		"API account request. Session ID:",
		req.sessionID
	)

	console.log(
		"Session:",
		req.session
	)

	if (!req.session.roblox && !req.session.discord) {
		return res.status(401).json({
			loggedIn: false,
			roblox: null,
			discord: null
		})
	}

	let discord = req.session.discord || null
	let roblox = req.session.roblox || null

	if (roblox) {
		try {
			const linkedAccount =
				await getLinkByRobloxId(roblox.id)

			if (linkedAccount) {
				if (!discord && linkedAccount.discord) {
					discord = linkedAccount.discord
				}

				if (!roblox && linkedAccount.roblox) {
					roblox = linkedAccount.roblox
				}
			}
		} catch (error) {
			console.error(
				"Failed to retrieve linked account:",
				error
			)
		}
	}

	res.json({
		loggedIn: true,
		roblox,
		discord
	})
})

app.get("/logout", (req, res) => {
	req.session.destroy((err) => {
		if (err) {
			console.error(
				"Failed to destroy session:",
				err
			)

			return res
				.status(500)
				.send("Failed to log out.")
		}

		res.clearCookie("spas.sid")

		res.redirect("/")
	})
})

app.get("/api/roblox/:playerId/discord", async (req, res) => {
	try {
		const account =
			await getLinkByRobloxId(req.params.playerId)

		if (!account || !account.discord) {
			return res.status(404).json({
				linked: false
			})
		}

		res.json({
			linked: true,
			discord: account.discord
		})
	} catch (error) {
		console.error(error)

		res.status(500).json({
			error: "Internal server error."
		})
	}
})

app.listen(PORT, () => {
	console.log(
		`SCPF Vulcan Net running on port ${PORT}`
	)
})

