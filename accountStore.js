
const { Pool } = require("pg")

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	ssl: {
		rejectUnauthorized: false
	}
})

async function initializeDatabase() {
	await pool.query(`
		CREATE TABLE IF NOT EXISTS account_links (
			roblox_id TEXT PRIMARY KEY,
			roblox_username TEXT NOT NULL,
			discord_id TEXT NOT NULL UNIQUE,
			discord_username TEXT NOT NULL,
			linked_at TEXT NOT NULL
		)
	`)
}

async function linkAccounts(roblox, discord) {
	await pool.query(
		`
		INSERT INTO account_links (
			roblox_id,
			roblox_username,
			discord_id,
			discord_username,
			linked_at
		)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (roblox_id)
		DO UPDATE SET
			roblox_username = EXCLUDED.roblox_username,
			discord_id = EXCLUDED.discord_id,
			discord_username = EXCLUDED.discord_username,
			linked_at = EXCLUDED.linked_at
		`,
		[
			String(roblox.id),
			roblox.username,
			String(discord.id),
			discord.username,
			new Date().toISOString()
		]
	)
}

async function getLinkByRobloxId(robloxId) {
	const result = await pool.query(
		`
		SELECT
			roblox_id,
			roblox_username,
			discord_id,
			discord_username,
			linked_at
		FROM account_links
		WHERE roblox_id = $1
		`,
		[String(robloxId)]
	)

	if (result.rows.length === 0) {
		return null
	}

	const row = result.rows[0]

	return {
		roblox: {
			id: row.roblox_id,
			username: row.roblox_username
		},
		discord: {
			id: row.discord_id,
			username: row.discord_username
		},
		linkedAt: row.linked_at
	}
}

initializeDatabase().catch(error => {
	console.error(
		"Failed to initialize account database:",
		error
	)
})

module.exports = {
	linkAccounts,
	getLinkByRobloxId
}
