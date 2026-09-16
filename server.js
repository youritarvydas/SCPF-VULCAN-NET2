require("dotenv").config()

const path = require("path")
const crypto = require("crypto")
const express = require("express")
const session = require("express-session")
const pgSession = require("connect-pg-simple")(session)
const { Pool } = require("pg")

const discordConnect = require("./DiscordConnect")
const discordBot = require("./Discordbot")
const { getWarnings } = require("./personnelStore")
const { sendDirectMessage } = discordBot

const {
	linkAccounts,
	getLinkByRobloxId
} = require("./accountStore")

const app = express()

const PORT = process.env.PORT || 3000

const ROBLOX_GROUP_API_KEY =
	process.env.ROBLOX_GROUP_API_KEY

const ROBLOX_CLIENT_ID =
	process.env.ROBLOX_CLIENT_ID

const ROBLOX_CLIENT_SECRET =
	process.env.ROBLOX_CLIENT_SECRET

const SESSION_SECRET =
	process.env.SESSION_SECRET

const DATABASE_URL =
	process.env.DATABASE_URL

const ROBLOX_REDIRECT_URI =
	"https://scpf-vulcan-net20-production.up.railway.app/oauth/callback"

const API_KEY =
	process.env.ROBLOX_API_KEY

if (!ROBLOX_CLIENT_ID) {
	throw new Error(
		"ROBLOX_CLIENT_ID is not configured."
	)
}

if (!ROBLOX_CLIENT_SECRET) {
	throw new Error(
		"ROBLOX_CLIENT_SECRET is not configured."
	)
}

if (!SESSION_SECRET) {
	throw new Error(
		"SESSION_SECRET is not configured."
	)
}

if (!DATABASE_URL) {
	throw new Error(
		"DATABASE_URL is not configured."
	)
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

const MAIN_GROUP_ID =
    String(process.env.SCPF_MAIN_GROUP_ID || "14825724")


async function robloxRequest(url) {

    const response = await fetch(url)

    if (!response.ok) {
        const text = await response.text()

        throw new Error(
            `Roblox API ${response.status}: ${text}`
        )
    }

    return response.json()
}


async function getRobloxAvatar(userId) {

    try {

        const data = await robloxRequest(
            `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`
        )

        return data.data?.[0]?.imageUrl || null

    } catch {

        return null
    }
}


async function getGroupIcons(groups) {

    if (!groups.length) {
        return new Map()
    }

    const ids = groups
        .map(group => group.group.id)
        .join(",")

    try {

        const data = await robloxRequest(
            `https://thumbnails.roblox.com/v1/groups/icons?groupIds=${ids}&size=150x150&format=Png&isCircular=false`
        )

        const icons = new Map()

        for (const item of data.data || []) {

            icons.set(
                String(item.targetId),
                item.imageUrl
            )

        }

        return icons

    } catch {

        return new Map()
    }
}

async function getGroupAllies(groupId) {
    try {
        const response = await robloxRequest(
            `https://groups.roblox.com/v1/groups/${groupId}/relationships/allies?maxRows=100`
        )

        return (response.relatedGroups || []).map(group => ({
            id: group.id,
            name: group.name,
            description: group.description || "",
            memberCount: group.memberCount || 0,
            icon: null
        }))
    } catch (error) {
        console.error(
            `[PROFILE] Failed to retrieve allies for group ${groupId}:`,
            error
        )

        return []
    }
}


app.use(discordConnect)

app.get("/", (req, res) => {
	if (
		req.session.roblox ||
		req.session.discord
	) {
		return res.redirect("/Dashboard.html")
	}

	res.sendFile(
		path.join(
			__dirname,
			"public",
			"index.html"
		)
	)
})


const SERVER_API_KEY = process.env.SERVER_API_KEY || "CHANGE_THIS_API_KEY";
const SERVER_TIMEOUT = 45 * 1000;

const robloxServers = new Map();

function validateServerKey(req, res, next) {
	const key = req.headers["x-api-key"];

	if (!key || key !== SERVER_API_KEY) {
		return res.status(401).json({
			success: false,
			error: "Invalid API key"
		});
	}

	next();
}

function cleanServers() {
	const now = Date.now();

	for (const [jobId, server] of robloxServers.entries()) {
		if (now - server.lastHeartbeat > SERVER_TIMEOUT) {
			robloxServers.delete(jobId);
			console.log(`[Server Registry] Removed inactive server: ${jobId}`);
		}
	}
}

setInterval(cleanServers, 10000);

app.post("/api/servers/register", validateServerKey, (req, res) => {
	const {
		jobId,
		placeId,
		site,
		description,
		players,
		maxPlayers,
		region,
		startedAt
	} = req.body;

	if (!jobId || !placeId || !site) {
		return res.status(400).json({
			success: false,
			error: "Missing required fields"
		});
	}

	const now = Date.now();

	const server = {
		jobId: String(jobId),
		placeId: String(placeId),
		site: String(site),
		description: description ? String(description) : "",
		players: Number(players) || 0,
		maxPlayers: Number(maxPlayers) || 0,
		region: region ? String(region) : "Unknown",
		startedAt: Number(startedAt) || Math.floor(now / 1000),
		lastHeartbeat: now,
		status: "online"
	};

	robloxServers.set(server.jobId, server);

	console.log(
		`[Server Registry] Registered ${server.site} | ${server.jobId} | ${server.players}/${server.maxPlayers}`
	);

	res.json({
		success: true,
		server
	});
});

app.post("/api/servers/heartbeat", validateServerKey, (req, res) => {
	const {
		jobId,
		placeId,
		site,
		description,
		players,
		maxPlayers,
		region,
		startedAt
	} = req.body;

	if (!jobId) {
		return res.status(400).json({
			success: false,
			error: "Missing jobId"
		});
	}

	const existingServer = robloxServers.get(String(jobId));

	if (!existingServer) {
		return res.status(404).json({
			success: false,
			error: "Server is not registered"
		});
	}

	existingServer.placeId = String(placeId || existingServer.placeId);
	existingServer.site = String(site || existingServer.site);
	existingServer.description = String(
		description || existingServer.description
	);
	existingServer.players = Number(players) || 0;
	existingServer.maxPlayers =
		Number(maxPlayers) || existingServer.maxPlayers;
	existingServer.region = String(region || existingServer.region);
	existingServer.startedAt =
		Number(startedAt) || existingServer.startedAt;
	existingServer.lastHeartbeat = Date.now();
	existingServer.status = "online";

	robloxServers.set(existingServer.jobId, existingServer);

	res.json({
		success: true,
		server: existingServer
	});
});

app.post("/api/servers/unregister", validateServerKey, (req, res) => {
	const { jobId } = req.body;

	if (!jobId) {
		return res.status(400).json({
			success: false,
			error: "Missing jobId"
		});
	}

	const deleted = robloxServers.delete(String(jobId));

	if (deleted) {
		console.log(`[Server Registry] Server stopped: ${jobId}`);
	}

	res.json({
		success: true,
		removed: deleted
	});
});

app.get("/api/servers", (req, res) => {
	cleanServers();

	const servers = Array.from(robloxServers.values()).map(server => ({
		jobId: server.jobId,
		placeId: server.placeId,
		site: server.site,
		description: server.description,
		players: server.players,
		maxPlayers: server.maxPlayers,
		region: server.region,
		startedAt: server.startedAt,
		uptime: Math.max(
			0,
			Math.floor(Date.now() / 1000) - server.startedAt
		),
		status: server.status
	}));

	res.json({
		success: true,
		servers
	});
});



function updateLoginTime(req) {
	if (!req.session.currentLogin) {
		req.session.lastLogin =
			req.session.previousLogin || null

		req.session.currentLogin =
			new Date().toISOString()

		req.session.previousLogin =
			req.session.currentLogin

		return true
	}

	return false
}

app.use(
	express.static(
		path.join(__dirname, "public")
	)
)

function oauthError(res, message) {
	const params = new URLSearchParams({
		oauthError: message
	})

	return res.redirect(
		`/?${params.toString()}`
	)
}

app.get("/login/roblox", (req, res) => {
	const state =
		crypto.randomBytes(32).toString("hex")

	req.session.oauthState = state

	console.log(
		"[OAUTH] Starting Roblox authentication"
	)

	console.log(
		"[OAUTH] Session ID:",
		req.sessionID
	)

	console.log(
		"[OAUTH] State:",
		state
	)

	req.session.save((error) => {
		if (error) {
			console.error(
				"[OAUTH] Failed to save session:",
				error
			)

			return oauthError(
				res,
				"server_error"
			)
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

		console.log(
			"[OAUTH] Redirecting to Roblox"
		)

		res.redirect(authorizationUrl)
	})
})

app.get(
	"/oauth/callback",
	async (req, res) => {
		const {
			code,
			state,
			error,
			error_description
		} = req.query

		console.log(
			"[OAUTH] Roblox callback received"
		)

		console.log(
			"[OAUTH] Session ID:",
			req.sessionID
		)

		console.log(
			"[OAUTH] Error:",
			error || "none"
		)

		if (error) {
			console.error(
				"[OAUTH] Roblox authorization failed:",
				error,
				error_description || ""
			)

			if (error === "access_denied") {
				return oauthError(
					res,
					"cancelled"
				)
			}

			return oauthError(
				res,
				"authorization_failed"
			)
		}

		if (!code) {
			console.error(
				"[OAUTH] Missing authorization code"
			)

			return oauthError(
				res,
				"invalid_code"
			)
		}

		if (!state) {
			console.error(
				"[OAUTH] Missing OAuth state"
			)

			return oauthError(
				res,
				"invalid_session"
			)
		}

		if (!req.session.oauthState) {
			console.error(
				"[OAUTH] OAuth state missing from session"
			)

			return oauthError(
				res,
				"invalid_session"
			)
		}

		console.log(
			"[OAUTH] Expected state:",
			req.session.oauthState
		)

		console.log(
			"[OAUTH] Received state:",
			state
		)

		if (
			state !== req.session.oauthState
		) {
			console.error(
				"[OAUTH] OAuth state mismatch"
			)

			delete req.session.oauthState

			return oauthError(
				res,
				"invalid_session"
			)
		}

		delete req.session.oauthState

		try {
			console.log(
				"[OAUTH] Exchanging authorization code for token"
			)

			const tokenBody =
				new URLSearchParams({
					client_id:
						ROBLOX_CLIENT_ID,

					client_secret:
						ROBLOX_CLIENT_SECRET,

					grant_type:
						"authorization_code",

					code,

					redirect_uri:
						ROBLOX_REDIRECT_URI
				})

			const tokenResponse =
				await fetch(
					"https://apis.roblox.com/oauth/v1/token",
					{
						method: "POST",

						headers: {
							"Content-Type":
								"application/x-www-form-urlencoded"
						},

						body:
							tokenBody.toString()
					}
				)

			let tokens

			try {
				tokens =
					await tokenResponse.json()
			} catch {
				tokens = {}
			}

			if (!tokenResponse.ok) {
				console.error(
					"[OAUTH] Roblox token request failed"
				)

				console.error(
					"[OAUTH] Status:",
					tokenResponse.status
				)

				console.error(
					"[OAUTH] Response:",
					tokens
				)

				if (
					tokens.error ===
						"invalid_grant" ||
					tokens.error ===
						"invalid_request"
				) {
					return oauthError(
						res,
						"invalid_code"
					)
				}

				return oauthError(
					res,
					"token_failed"
				)
			}

			if (!tokens.access_token) {
				console.error(
					"[OAUTH] Roblox did not return an access token"
				)

				return oauthError(
					res,
					"token_failed"
				)
			}

			console.log(
				"[OAUTH] Access token received"
			)

			console.log(
				"[OAUTH] Requesting Roblox user information"
			)

			const userResponse =
				await fetch(
					"https://apis.roblox.com/oauth/v1/userinfo",
					{
						headers: {
							Authorization:
								`Bearer ${tokens.access_token}`
						}
					}
				)

			let user

			try {
				user =
					await userResponse.json()
			} catch {
				user = {}
			}

			if (!userResponse.ok) {
				console.error(
					"[OAUTH] Roblox userinfo request failed"
				)

				console.error(
					"[OAUTH] Status:",
					userResponse.status
				)

				console.error(
					"[OAUTH] Response:",
					user
				)

				return oauthError(
					res,
					"userinfo_failed"
				)
			}

			if (!user.sub) {
				console.error(
					"[OAUTH] Roblox userinfo did not contain a user ID"
				)

				return oauthError(
					res,
					"userinfo_failed"
				)
			}

			console.log(
				"[OAUTH] Roblox user ID:",
				user.sub
			)

			console.log(
				"[OAUTH] Roblox username:",
				user.preferred_username ||
					user.nickname ||
					user.name
			)

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

				avatar:
					user.picture || null
			}

			req.session.robloxAccessToken =
				tokens.access_token

			if (req.session.discord) {
				console.log(
					"[OAUTH] Discord account already authenticated"
				)

				try {
					await linkAccounts(
						req.session.roblox,
						req.session.discord
					)

					console.log(
						"[OAUTH] Roblox and Discord accounts linked"
					)
				} catch (error) {
					console.error(
						"[OAUTH] Failed to link accounts:",
						error
					)
				}
			}

			req.session.save((error) => {
				if (error) {
					console.error(
						"[OAUTH] Failed to save authenticated session:",
						error
					)

					return oauthError(
						res,
						"server_error"
					)
				}

				console.log(
					"[OAUTH] Authentication successful"
				)

				console.log(
					"[OAUTH] Session saved:",
					req.sessionID
				)

				res.redirect(
					"/Dashboard.html"
				)
			})
		} catch (error) {
			console.error(
				"[OAUTH] Unexpected Roblox OAuth error:",
				error
			)

			return oauthError(
				res,
				"server_error"
			)
		}
	}
)

app.get(
	"/api/account",
	async (req, res) => {
		console.log(
			"API account request. Session ID:",
			req.sessionID
		)

		console.log(
			"Session:",
			req.session
		)

		if (
			!req.session.roblox &&
			!req.session.discord
		) {
			return res.status(401).json({
				loggedIn: false,
				roblox: null,
				discord: null,
				lastLogin: null
			})
		}

		let discord =
			req.session.discord || null

		let roblox =
			req.session.roblox || null

		if (roblox) {
			try {
				const linkedAccount =
					await getLinkByRobloxId(
						roblox.id
					)

				if (linkedAccount) {
					if (
						!discord &&
						linkedAccount.discord
					) {
						discord =
							linkedAccount.discord
					}

					if (
						!roblox &&
						linkedAccount.roblox
					) {
						roblox =
							linkedAccount.roblox
					}
				}
			} catch (error) {
				console.error(
					"Failed to retrieve linked account:",
					error
				)
			}
		}

		const loginUpdated =
			updateLoginTime(req)

		if (loginUpdated) {
			console.log(
				"[LOGIN] New dashboard session detected."
			)

			console.log(
				"[LOGIN] Previous login:",
				req.session.lastLogin ||
					"None"
			)

			console.log(
				"[LOGIN] Current login:",
				req.session.currentLogin
			)

			req.session.save((err) => {
				if (err) {
					console.error(
						"[LOGIN] Failed to save login time:",
						err
					)
				}
			})
		}

		res.json({
			loggedIn: true,
			roblox,
			discord,
			lastLogin:
				req.session.lastLogin,

			currentLogin:
				req.session.currentLogin
		})
	}
)

app.get(
	"/logout",
	(req, res) => {
		req.session.destroy((err) => {
			if (err) {
				console.error(
					"Failed to destroy session:",
					err
				)

				return res
					.status(500)
					.send(
						"Failed to log out."
					)
			}

			res.clearCookie("spas.sid")

			res.redirect("/")
		})
	}
)

app.get(
	"/api/roblox/:playerId/discord",
	async (req, res) => {
		try {
			const account =
				await getLinkByRobloxId(
					req.params.playerId
				)

			if (
				!account ||
				!account.discord
			) {
				return res.status(404).json({
					linked: false
				})
			}

			res.json({
				linked: true,
				discord:
					account.discord
			})
		} catch (error) {
			console.error(error)

			res.status(500).json({
				error:
					"Internal server error."
			})
		}
	}
)

app.post(
	"/api/roblox/:playerId/send",
	async (req, res) => {
		if (
			req.headers["x-api-key"] !==
			API_KEY
		) {
			return res.status(401).json({
				error:
					"Invalid API key."
			})
		}

		try {
			const playerId =
				req.params.playerId

			const {
				content,
				embed
			} = req.body

			if (!content && !embed) {
				return res.status(400).json({
					error:
						"Message content or embed is required."
				})
			}

			const account =
				await getLinkByRobloxId(
					playerId
				)

			if (
				!account ||
				!account.discord
			) {
				return res.status(404).json({
					error:
						"No Discord account linked to this Roblox account."
				})
			}

			const discordMessage = {}

			if (content) {
				discordMessage.content =
					content
			}

			if (embed) {
				discordMessage.embeds = [
					embed
				]
			}

			await sendDirectMessage(
				account.discord.id,
				discordMessage
			)

			res.json({
				success: true
			})
		} catch (error) {
			console.error(
				"Discord API failed:",
				error
			)

			res.status(500).json({
				error:
					error.message ||
					"Failed to send Discord message."
			})
		}
	}
)

app.get(
	"/api/roblox/:userId/groups/:groupId/role",
	async (req, res) => {
		const {
			userId,
			groupId
		} = req.params

		console.log(
			"[GROUP] Request received"
		)

		console.log(
			"[GROUP] User ID:",
			userId
		)

		console.log(
			"[GROUP] Group ID:",
			groupId
		)

		if (
			!req.session.roblox &&
			!req.session.discord
		) {
			console.log(
				"[GROUP] Unauthorized request"
			)

			return res.status(401).json({
				error:
					"Not authenticated."
			})
		}

		try {
			console.log(
				`[GROUP] Fetching Roblox groups for ${userId}...`
			)

			const response =
				await fetch(
					`https://groups.roblox.com/v1/users/${userId}/groups/roles`
				)

			console.log(
				"[GROUP] Roblox response status:",
				response.status
			)

			let data

			try {
				data =
					await response.json()
			} catch {
				data = {}
			}

			if (!response.ok) {
				console.error(
					"[GROUP] Roblox API error:",
					data
				)

				return res
					.status(response.status)
					.json({
						error:
							"Failed to retrieve Roblox groups.",

						details: data
					})
			}

			console.log(
				`[GROUP] Retrieved ${data.data?.length || 0} groups`
			)

			const group =
				data.data?.find(
					entry =>
						String(
							entry.group.id
						) ===
						String(groupId)
				)

			if (!group) {
				console.log(
					`[GROUP] User is NOT in group ${groupId}`
				)

				return res.json({
					found: false,
					userId,
					groupId,
					role: null
				})
			}

			console.log(
				`[GROUP] Found role: ${group.role.name} (${group.role.rank})`
			)

			return res.json({
				found: true,

				userId,

				groupId,

				role: {
					id: group.role.id,
					name: group.role.name,
					rank: group.role.rank
				}
			})
		} catch (error) {
			console.error(
				"[GROUP] Request failed:",
				error
			)

			return res.status(500).json({
				error:
					"Internal server error."
			})
		}
	}
)


require("dotenv").config()

const path = require("path")
const crypto = require("crypto")
const express = require("express")
const session = require("express-session")
const pgSession = require("connect-pg-simple")(session)
const { Pool } = require("pg")

const discordConnect = require("./DiscordConnect")
const discordBot = require("./Discordbot")
const { getWarnings } = require("./personnelStore")
const { sendDirectMessage } = discordBot

const {
	linkAccounts,
	getLinkByRobloxId
} = require("./accountStore")

const app = express()

const PORT = process.env.PORT || 3000

const ROBLOX_GROUP_API_KEY =
	process.env.ROBLOX_GROUP_API_KEY

const ROBLOX_CLIENT_ID =
	process.env.ROBLOX_CLIENT_ID

const ROBLOX_CLIENT_SECRET =
	process.env.ROBLOX_CLIENT_SECRET

const SESSION_SECRET =
	process.env.SESSION_SECRET

const DATABASE_URL =
	process.env.DATABASE_URL

const ROBLOX_REDIRECT_URI =
	"https://scpf-vulcan-net20-production.up.railway.app/oauth/callback"

const API_KEY =
	process.env.ROBLOX_API_KEY

if (!ROBLOX_CLIENT_ID) {
	throw new Error(
		"ROBLOX_CLIENT_ID is not configured."
	)
}

if (!ROBLOX_CLIENT_SECRET) {
	throw new Error(
		"ROBLOX_CLIENT_SECRET is not configured."
	)
}

if (!SESSION_SECRET) {
	throw new Error(
		"SESSION_SECRET is not configured."
	)
}

if (!DATABASE_URL) {
	throw new Error(
		"DATABASE_URL is not configured."
	)
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

const MAIN_GROUP_ID =
    String(process.env.SCPF_MAIN_GROUP_ID || "14825724")


async function robloxRequest(url) {

    const response = await fetch(url)

    if (!response.ok) {
        const text = await response.text()

        throw new Error(
            `Roblox API ${response.status}: ${text}`
        )
    }

    return response.json()
}


async function getRobloxAvatar(userId) {

    try {

        const data = await robloxRequest(
            `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`
        )

        return data.data?.[0]?.imageUrl || null

    } catch {

        return null
    }
}


async function getGroupIcons(groups) {

    if (!groups.length) {
        return new Map()
    }

    const ids = groups
        .map(group => group.group.id)
        .join(",")

    try {

        const data = await robloxRequest(
            `https://thumbnails.roblox.com/v1/groups/icons?groupIds=${ids}&size=150x150&format=Png&isCircular=false`
        )

        const icons = new Map()

        for (const item of data.data || []) {

            icons.set(
                String(item.targetId),
                item.imageUrl
            )

        }

        return icons

    } catch {

        return new Map()
    }
}

async function getGroupAllies(groupId) {
    try {
        const response = await robloxRequest(
            `https://groups.roblox.com/v1/groups/${groupId}/relationships/allies?maxRows=100`
        )

        return (response.relatedGroups || []).map(group => ({
            id: group.id,
            name: group.name,
            description: group.description || "",
            memberCount: group.memberCount || 0,
            icon: null
        }))
    } catch (error) {
        console.error(
            `[PROFILE] Failed to retrieve allies for group ${groupId}:`,
            error
        )

        return []
    }
}


app.use(discordConnect)

app.get("/", (req, res) => {
	if (
		req.session.roblox ||
		req.session.discord
	) {
		return res.redirect("/Dashboard.html")
	}

	res.sendFile(
		path.join(
			__dirname,
			"public",
			"index.html"
		)
	)
})


const SERVER_API_KEY = process.env.SERVER_API_KEY || "CHANGE_THIS_API_KEY";
const SERVER_TIMEOUT = 45 * 1000;

const robloxServers = new Map();

function validateServerKey(req, res, next) {
	const key = req.headers["x-api-key"];

	if (!key || key !== SERVER_API_KEY) {
		return res.status(401).json({
			success: false,
			error: "Invalid API key"
		});
	}

	next();
}

function cleanServers() {
	const now = Date.now();

	for (const [jobId, server] of robloxServers.entries()) {
		if (now - server.lastHeartbeat > SERVER_TIMEOUT) {
			robloxServers.delete(jobId);
			console.log(`[Server Registry] Removed inactive server: ${jobId}`);
		}
	}
}

setInterval(cleanServers, 10000);

app.post("/api/servers/register", validateServerKey, (req, res) => {
	const {
		jobId,
		placeId,
		site,
		description,
		players,
		maxPlayers,
		region,
		startedAt
	} = req.body;

	if (!jobId || !placeId || !site) {
		return res.status(400).json({
			success: false,
			error: "Missing required fields"
		});
	}

	const now = Date.now();

	const server = {
		jobId: String(jobId),
		placeId: String(placeId),
		site: String(site),
		description: description ? String(description) : "",
		players: Number(players) || 0,
		maxPlayers: Number(maxPlayers) || 0,
		region: region ? String(region) : "Unknown",
		startedAt: Number(startedAt) || Math.floor(now / 1000),
		lastHeartbeat: now,
		status: "online"
	};

	robloxServers.set(server.jobId, server);

	console.log(
		`[Server Registry] Registered ${server.site} | ${server.jobId} | ${server.players}/${server.maxPlayers}`
	);

	res.json({
		success: true,
		server
	});
});

app.post("/api/servers/heartbeat", validateServerKey, (req, res) => {
	const {
		jobId,
		placeId,
		site,
		description,
		players,
		maxPlayers,
		region,
		startedAt
	} = req.body;

	if (!jobId) {
		return res.status(400).json({
			success: false,
			error: "Missing jobId"
		});
	}

	const existingServer = robloxServers.get(String(jobId));

	if (!existingServer) {
		return res.status(404).json({
			success: false,
			error: "Server is not registered"
		});
	}

	existingServer.placeId = String(placeId || existingServer.placeId);
	existingServer.site = String(site || existingServer.site);
	existingServer.description = String(
		description || existingServer.description
	);
	existingServer.players = Number(players) || 0;
	existingServer.maxPlayers =
		Number(maxPlayers) || existingServer.maxPlayers;
	existingServer.region = String(region || existingServer.region);
	existingServer.startedAt =
		Number(startedAt) || existingServer.startedAt;
	existingServer.lastHeartbeat = Date.now();
	existingServer.status = "online";

	robloxServers.set(existingServer.jobId, existingServer);

	res.json({
		success: true,
		server: existingServer
	});
});

app.post("/api/servers/unregister", validateServerKey, (req, res) => {
	const { jobId } = req.body;

	if (!jobId) {
		return res.status(400).json({
			success: false,
			error: "Missing jobId"
		});
	}

	const deleted = robloxServers.delete(String(jobId));

	if (deleted) {
		console.log(`[Server Registry] Server stopped: ${jobId}`);
	}

	res.json({
		success: true,
		removed: deleted
	});
});

app.get("/api/servers", (req, res) => {
	cleanServers();

	const servers = Array.from(robloxServers.values()).map(server => ({
		jobId: server.jobId,
		placeId: server.placeId,
		site: server.site,
		description: server.description,
		players: server.players,
		maxPlayers: server.maxPlayers,
		region: server.region,
		startedAt: server.startedAt,
		uptime: Math.max(
			0,
			Math.floor(Date.now() / 1000) - server.startedAt
		),
		status: server.status
	}));

	res.json({
		success: true,
		servers
	});
});



function updateLoginTime(req) {
	if (!req.session.currentLogin) {
		req.session.lastLogin =
			req.session.previousLogin || null

		req.session.currentLogin =
			new Date().toISOString()

		req.session.previousLogin =
			req.session.currentLogin

		return true
	}

	return false
}

app.use(
	express.static(
		path.join(__dirname, "public")
	)
)

function oauthError(res, message) {
	const params = new URLSearchParams({
		oauthError: message
	})

	return res.redirect(
		`/?${params.toString()}`
	)
}

app.get("/login/roblox", (req, res) => {
	const state =
		crypto.randomBytes(32).toString("hex")

	req.session.oauthState = state

	console.log(
		"[OAUTH] Starting Roblox authentication"
	)

	console.log(
		"[OAUTH] Session ID:",
		req.sessionID
	)

	console.log(
		"[OAUTH] State:",
		state
	)

	req.session.save((error) => {
		if (error) {
			console.error(
				"[OAUTH] Failed to save session:",
				error
			)

			return oauthError(
				res,
				"server_error"
			)
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

		console.log(
			"[OAUTH] Redirecting to Roblox"
		)

		res.redirect(authorizationUrl)
	})
})

app.get(
	"/oauth/callback",
	async (req, res) => {
		const {
			code,
			state,
			error,
			error_description
		} = req.query

		console.log(
			"[OAUTH] Roblox callback received"
		)

		console.log(
			"[OAUTH] Session ID:",
			req.sessionID
		)

		console.log(
			"[OAUTH] Error:",
			error || "none"
		)

		if (error) {
			console.error(
				"[OAUTH] Roblox authorization failed:",
				error,
				error_description || ""
			)

			if (error === "access_denied") {
				return oauthError(
					res,
					"cancelled"
				)
			}

			return oauthError(
				res,
				"authorization_failed"
			)
		}

		if (!code) {
			console.error(
				"[OAUTH] Missing authorization code"
			)

			return oauthError(
				res,
				"invalid_code"
			)
		}

		if (!state) {
			console.error(
				"[OAUTH] Missing OAuth state"
			)

			return oauthError(
				res,
				"invalid_session"
			)
		}

		if (!req.session.oauthState) {
			console.error(
				"[OAUTH] OAuth state missing from session"
			)

			return oauthError(
				res,
				"invalid_session"
			)
		}

		console.log(
			"[OAUTH] Expected state:",
			req.session.oauthState
		)

		console.log(
			"[OAUTH] Received state:",
			state
		)

		if (
			state !== req.session.oauthState
		) {
			console.error(
				"[OAUTH] OAuth state mismatch"
			)

			delete req.session.oauthState

			return oauthError(
				res,
				"invalid_session"
			)
		}

		delete req.session.oauthState

		try {
			console.log(
				"[OAUTH] Exchanging authorization code for token"
			)

			const tokenBody =
				new URLSearchParams({
					client_id:
						ROBLOX_CLIENT_ID,

					client_secret:
						ROBLOX_CLIENT_SECRET,

					grant_type:
						"authorization_code",

					code,

					redirect_uri:
						ROBLOX_REDIRECT_URI
				})

			const tokenResponse =
				await fetch(
					"https://apis.roblox.com/oauth/v1/token",
					{
						method: "POST",

						headers: {
							"Content-Type":
								"application/x-www-form-urlencoded"
						},

						body:
							tokenBody.toString()
					}
				)

			let tokens

			try {
				tokens =
					await tokenResponse.json()
			} catch {
				tokens = {}
			}

			if (!tokenResponse.ok) {
				console.error(
					"[OAUTH] Roblox token request failed"
				)

				console.error(
					"[OAUTH] Status:",
					tokenResponse.status
				)

				console.error(
					"[OAUTH] Response:",
					tokens
				)

				if (
					tokens.error ===
						"invalid_grant" ||
					tokens.error ===
						"invalid_request"
				) {
					return oauthError(
						res,
						"invalid_code"
					)
				}

				return oauthError(
					res,
					"token_failed"
				)
			}

			if (!tokens.access_token) {
				console.error(
					"[OAUTH] Roblox did not return an access token"
				)

				return oauthError(
					res,
					"token_failed"
				)
			}

			console.log(
				"[OAUTH] Access token received"
			)

			console.log(
				"[OAUTH] Requesting Roblox user information"
			)

			const userResponse =
				await fetch(
					"https://apis.roblox.com/oauth/v1/userinfo",
					{
						headers: {
							Authorization:
								`Bearer ${tokens.access_token}`
						}
					}
				)

			let user

			try {
				user =
					await userResponse.json()
			} catch {
				user = {}
			}

			if (!userResponse.ok) {
				console.error(
					"[OAUTH] Roblox userinfo request failed"
				)

				console.error(
					"[OAUTH] Status:",
					userResponse.status
				)

				console.error(
					"[OAUTH] Response:",
					user
				)

				return oauthError(
					res,
					"userinfo_failed"
				)
			}

			if (!user.sub) {
				console.error(
					"[OAUTH] Roblox userinfo did not contain a user ID"
				)

				return oauthError(
					res,
					"userinfo_failed"
				)
			}

			console.log(
				"[OAUTH] Roblox user ID:",
				user.sub
			)

			console.log(
				"[OAUTH] Roblox username:",
				user.preferred_username ||
					user.nickname ||
					user.name
			)

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

				avatar:
					user.picture || null
			}

			req.session.robloxAccessToken =
				tokens.access_token

			if (req.session.discord) {
				console.log(
					"[OAUTH] Discord account already authenticated"
				)

				try {
					await linkAccounts(
						req.session.roblox,
						req.session.discord
					)

					console.log(
						"[OAUTH] Roblox and Discord accounts linked"
					)
				} catch (error) {
					console.error(
						"[OAUTH] Failed to link accounts:",
						error
					)
				}
			}

			req.session.save((error) => {
				if (error) {
					console.error(
						"[OAUTH] Failed to save authenticated session:",
						error
					)

					return oauthError(
						res,
						"server_error"
					)
				}

				console.log(
					"[OAUTH] Authentication successful"
				)

				console.log(
					"[OAUTH] Session saved:",
					req.sessionID
				)

				res.redirect(
					"/Dashboard.html"
				)
			})
		} catch (error) {
			console.error(
				"[OAUTH] Unexpected Roblox OAuth error:",
				error
			)

			return oauthError(
				res,
				"server_error"
			)
		}
	}
)

app.get(
	"/api/account",
	async (req, res) => {
		console.log(
			"API account request. Session ID:",
			req.sessionID
		)

		console.log(
			"Session:",
			req.session
		)

		if (
			!req.session.roblox &&
			!req.session.discord
		) {
			return res.status(401).json({
				loggedIn: false,
				roblox: null,
				discord: null,
				lastLogin: null
			})
		}

		let discord =
			req.session.discord || null

		let roblox =
			req.session.roblox || null

		if (roblox) {
			try {
				const linkedAccount =
					await getLinkByRobloxId(
						roblox.id
					)

				if (linkedAccount) {
					if (
						!discord &&
						linkedAccount.discord
					) {
						discord =
							linkedAccount.discord
					}

					if (
						!roblox &&
						linkedAccount.roblox
					) {
						roblox =
							linkedAccount.roblox
					}
				}
			} catch (error) {
				console.error(
					"Failed to retrieve linked account:",
					error
				)
			}
		}

		const loginUpdated =
			updateLoginTime(req)

		if (loginUpdated) {
			console.log(
				"[LOGIN] New dashboard session detected."
			)

			console.log(
				"[LOGIN] Previous login:",
				req.session.lastLogin ||
					"None"
			)

			console.log(
				"[LOGIN] Current login:",
				req.session.currentLogin
			)

			req.session.save((err) => {
				if (err) {
					console.error(
						"[LOGIN] Failed to save login time:",
						err
					)
				}
			})
		}

		res.json({
			loggedIn: true,
			roblox,
			discord,
			lastLogin:
				req.session.lastLogin,

			currentLogin:
				req.session.currentLogin
		})
	}
)

app.get(
	"/logout",
	(req, res) => {
		req.session.destroy((err) => {
			if (err) {
				console.error(
					"Failed to destroy session:",
					err
				)

				return res
					.status(500)
					.send(
						"Failed to log out."
					)
			}

			res.clearCookie("spas.sid")

			res.redirect("/")
		})
	}
)

app.get(
	"/api/roblox/:playerId/discord",
	async (req, res) => {
		try {
			const account =
				await getLinkByRobloxId(
					req.params.playerId
				)

			if (
				!account ||
				!account.discord
			) {
				return res.status(404).json({
					linked: false
				})
			}

			res.json({
				linked: true,
				discord:
					account.discord
			})
		} catch (error) {
			console.error(error)

			res.status(500).json({
				error:
					"Internal server error."
			})
		}
	}
)

app.post(
	"/api/roblox/:playerId/send",
	async (req, res) => {
		if (
			req.headers["x-api-key"] !==
			API_KEY
		) {
			return res.status(401).json({
				error:
					"Invalid API key."
			})
		}

		try {
			const playerId =
				req.params.playerId

			const {
				content,
				embed
			} = req.body

			if (!content && !embed) {
				return res.status(400).json({
					error:
						"Message content or embed is required."
				})
			}

			const account =
				await getLinkByRobloxId(
					playerId
				)

			if (
				!account ||
				!account.discord
			) {
				return res.status(404).json({
					error:
						"No Discord account linked to this Roblox account."
				})
			}

			const discordMessage = {}

			if (content) {
				discordMessage.content =
					content
			}

			if (embed) {
				discordMessage.embeds = [
					embed
				]
			}

			await sendDirectMessage(
				account.discord.id,
				discordMessage
			)

			res.json({
				success: true
			})
		} catch (error) {
			console.error(
				"Discord API failed:",
				error
			)

			res.status(500).json({
				error:
					error.message ||
					"Failed to send Discord message."
			})
		}
	}
)

app.get(
	"/api/roblox/:userId/groups/:groupId/role",
	async (req, res) => {
		const {
			userId,
			groupId
		} = req.params

		console.log(
			"[GROUP] Request received"
		)

		console.log(
			"[GROUP] User ID:",
			userId
		)

		console.log(
			"[GROUP] Group ID:",
			groupId
		)

		if (
			!req.session.roblox &&
			!req.session.discord
		) {
			console.log(
				"[GROUP] Unauthorized request"
			)

			return res.status(401).json({
				error:
					"Not authenticated."
			})
		}

		try {
			console.log(
				`[GROUP] Fetching Roblox groups for ${userId}...`
			)

			const response =
				await fetch(
					`https://groups.roblox.com/v1/users/${userId}/groups/roles`
				)

			console.log(
				"[GROUP] Roblox response status:",
				response.status
			)

			let data

			try {
				data =
					await response.json()
			} catch {
				data = {}
			}

			if (!response.ok) {
				console.error(
					"[GROUP] Roblox API error:",
					data
				)

				return res
					.status(response.status)
					.json({
						error:
							"Failed to retrieve Roblox groups.",

						details: data
					})
			}

			console.log(
				`[GROUP] Retrieved ${data.data?.length || 0} groups`
			)

			const group =
				data.data?.find(
					entry =>
						String(
							entry.group.id
						) ===
						String(groupId)
				)

			if (!group) {
				console.log(
					`[GROUP] User is NOT in group ${groupId}`
				)

				return res.json({
					found: false,
					userId,
					groupId,
					role: null
				})
			}

			console.log(
				`[GROUP] Found role: ${group.role.name} (${group.role.rank})`
			)

			return res.json({
				found: true,

				userId,

				groupId,

				role: {
					id: group.role.id,
					name: group.role.name,
					rank: group.role.rank
				}
			})
		} catch (error) {
			console.error(
				"[GROUP] Request failed:",
				error
			)

			return res.status(500).json({
				error:
					"Internal server error."
			})
		}
	}
)


app.get("/api/profile", async (req, res) => {
    try {
        if (!req.session.roblox) {
            return res.status(401).json({
                error: "No Roblox account linked to this session"
            })
        }

        const robloxId = String(req.session.roblox.id)

        console.log("[PROFILE] Roblox user ID:", robloxId)

        const FOUNDATION_GROUP_ID = "14825724"

        const [
            userResponse,
            groupsResponse,
            allies
        ] = await Promise.all([
            fetch(
                `https://users.roblox.com/v1/users/${robloxId}`
            ),

            fetch(
                `https://groups.roblox.com/v1/users/${robloxId}/groups/roles`
            ),

            getGroupAllies(FOUNDATION_GROUP_ID)
        ])

        const userData = await userResponse.json()
        const groupsData = await groupsResponse.json()

        if (!userResponse.ok) {
            console.error(
                "[PROFILE] User API error:",
                userData
            )

            return res.status(userResponse.status).json({
                error: "Failed to retrieve Roblox user.",
                details: userData
            })
        }

        if (!groupsResponse.ok) {
            console.error(
                "[PROFILE] Groups API error:",
                groupsData
            )

            return res.status(groupsResponse.status).json({
                error: "Failed to retrieve Roblox groups.",
                details: groupsData
            })
        }

        const foundationGroup =
            groupsData.data.find(
                entry =>
                    String(entry.group.id) ===
                    FOUNDATION_GROUP_ID
            )
app.get("/api/profile", async (req, res) => {
    try {
        if (!req.session.roblox) {
            return res.status(401).json({
                error: "No Roblox account linked to this session"
            })
        }

        const robloxId = String(req.session.roblox.id)

        const configuredGroupIds = [
            ...new Set(
                String(process.env.SCPF_PROFILE_GROUP_IDS || "")
                    .split(",")
                    .map(id => id.trim())
                    .filter(id => /^\d+$/.test(id))
            )
        ]

        if (!configuredGroupIds.length) {
            return res.status(500).json({
                error: "No SCPF_PROFILE_GROUP_IDS configured."
            })
        }

        console.log("[PROFILE] Roblox user ID:", robloxId)
        console.log(
            "[PROFILE] Configured groups:",
            configuredGroupIds.join(", ")
        )

        const [
            userResponse,
            groupsResponse
        ] = await Promise.all([
            fetch(
                `https://users.roblox.com/v1/users/${robloxId}`
            ),

            fetch(
                `https://groups.roblox.com/v1/users/${robloxId}/groups/roles`
            )
        ])

        const userData = await userResponse.json()
        const groupsData = await groupsResponse.json()

        if (!userResponse.ok) {
            console.error(
                "[PROFILE] User API error:",
                userData
            )

            return res.status(userResponse.status).json({
                error: "Failed to retrieve Roblox user.",
                details: userData
            })
        }

        if (!groupsResponse.ok) {
            console.error(
                "[PROFILE] Groups API error:",
                groupsData
            )

            return res.status(groupsResponse.status).json({
                error: "Failed to retrieve Roblox groups.",
                details: groupsData
            })
        }

        const userGroups = groupsData.data || []

        const groups = await Promise.all(
            configuredGroupIds.map(async groupId => {
                try {
                    const groupResponse = await fetch(
                        `https://groups.roblox.com/v1/groups/${groupId}`
                    )

                    if (!groupResponse.ok) {
                        console.error(
                            `[PROFILE] Failed to retrieve group ${groupId}`
                        )

                        return {
                            id: Number(groupId),
                            name: "Unknown Group",
                            icon: null,
                            member: false,
                            role: null
                        }
                    }

                    const groupData =
                        await groupResponse.json()

                    const membership =
                        userGroups.find(
                            entry =>
                                String(entry.group.id) ===
                                String(groupId)
                        )

                    return {
                        id: groupData.id,
                        name: groupData.name,
                        description:
                            groupData.description || "",
                        member: !!membership,
                        role: membership
                            ? {
                                id: membership.role.id,
                                name: membership.role.name,
                                rank: membership.role.rank
                            }
                            : null,
                        memberCount:
                            groupData.memberCount || 0,
                        icon: null
                    }
                } catch (error) {
                    console.error(
                        `[PROFILE] Error retrieving group ${groupId}:`,
                        error
                    )

                    return {
                        id: Number(groupId),
                        name: "Unknown Group",
                        icon: null,
                        member: false,
                        role: null
                    }
                }
            })
        )

        const groupsWithIcons = await getGroupIcons(
            groups.map(group => ({
                group: {
                    id: group.id
                }
            }))
        )

        for (const group of groups) {
            group.icon =
                groupsWithIcons.get(String(group.id)) || null
        }

        const mainGroupId =
            configuredGroupIds[0]

        const mainGroup =
            groups.find(
                group =>
                    String(group.id) ===
                    String(mainGroupId)
            )

        let allies = []

        if (mainGroup) {
            allies =
                await getGroupAllies(mainGroup.id)

            const allyIcons =
                await getGroupIcons(
                    allies.map(group => ({
                        group: {
                            id: group.id
                        }
                    }))
                )

            for (const ally of allies) {
                ally.icon =
                    allyIcons.get(
                        String(ally.id)
                    ) || null
            }
        }

        const account =
            await getLinkByRobloxId(robloxId)

        res.json({
            success: true,

            user: {
                id: userData.id,
                username: userData.name,
                displayName: userData.displayName,
                avatar:
                    req.session.roblox.avatar || null
            },

            mainGroup: mainGroup || null,

            groups,

            allies,

            discord:
                account?.discord || null
        })

    } catch (error) {
        console.error(
            "[PROFILE] Error:",
            error
        )

        res.status(500).json({
            error: "Failed to load profile.",
            details: error.message
        })
    }
})



app.listen(PORT, () => {
	console.log(
		`SCPF Vulcan Net running on port ${PORT}`
	)
})


app.listen(PORT, () => {
	console.log(
		`SCPF Vulcan Net running on port ${PORT}`
	)
})
