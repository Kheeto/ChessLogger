const Logger = require("./Logger");
const process = require("node:process");

function handleErrors()
{
    // Error handling (prevent the bot from crashing)
    process.on('unhandledRejection', async (reason, promise) => {
        if (reason instanceof Error) {
            Logger.Error(`[ERROR] Unhandled rejection at: \"${JSON.stringify(promise)}\", reason: \"${reason.stack}\"`);
        } else {
            Logger.Error(`[ERROR] Unhandled rejection at: \"${JSON.stringify(promise)}\", reason: \"${reason}\"`);
        }
    });
    process.on('uncaughtException', (err) => {
        Logger.Error(`[ERROR] Uncaught exception: \"${err}\"`);
    });
    process.on('uncaughtExceptionMonitor', (err, origin) => {
        Logger.Error(`[ERROR] Uncaught exception monitor: \"${err}\", origin: \"${origin}\"`);
    });
}

module.exports = { handleErrors };
