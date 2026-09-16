const fs = require("fs")
const path = require("path")
const Database = require("better-sqlite3")

const dataDirectory = path.join(__dirname, "data")

fs.mkdirSync(dataDirectory, {
    recursive: true
})

const database = new Database(
    path.join(dataDirectory, "personnel.db")
)

database.exec(`
    CREATE TABLE IF NOT EXISTS warnings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        roblox_id TEXT NOT NULL,
        title TEXT NOT NULL,
        reason TEXT NOT NULL,
        issued_by TEXT,
        issued_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Active'
    );

    CREATE INDEX IF NOT EXISTS idx_warnings_roblox_id
    ON warnings(roblox_id);
`)


function getWarnings(robloxId) {

    return database
        .prepare(`
            SELECT
                id,
                roblox_id,
                title,
                reason,
                issued_by,
                issued_at,
                status
            FROM warnings
            WHERE roblox_id = ?
            AND status = 'Active'
            ORDER BY issued_at DESC
        `)
        .all(String(robloxId))
}


function addWarning(
    robloxId,
    title,
    reason,
    issuedBy
) {

    return database
        .prepare(`
            INSERT INTO warnings (
                roblox_id,
                title,
                reason,
                issued_by,
                issued_at,
                status
            )
            VALUES (?, ?, ?, ?, ?, 'Active')
        `)
        .run(
            String(robloxId),
            title,
            reason,
            issuedBy || "System",
            new Date().toISOString()
        )
}


function removeWarning(id) {

    return database
        .prepare(`
            UPDATE warnings
            SET status = 'Removed'
            WHERE id = ?
        `)
        .run(id)
}


module.exports = {
    getWarnings,
    addWarning,
    removeWarning
}
