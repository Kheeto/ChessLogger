const fs = require("fs");
const path = require("path");
require("colors");

var logFilePath = "./logs/latest"; // Default log file path

function Info(text) {
    Write(text.white);
    WriteFile(logFilePath, text+"\n");
}

function Success(text) {
    Write(text.brightGreen);
    WriteFile(logFilePath, text+"\n");
}

function Warning(text) {
    Write(text.yellow);
    WriteFile(logFilePath, text+"\n");
}

function Error(text) {
    Write(text.brightRed);
    WriteFile(logFilePath, text+"\n");
}

function Write(text) {
    const d = new Date();
    var time = getTimestamp();
    console.log(`${time} ${text}`);
}

function WriteFile(path, content) {
    const timestamp = getTimestamp();
    const logEntry = `${timestamp} ${content}`;
    fs.appendFile(path, logEntry, function (err) {
        if (err) Error(`Failed to write to file: ${err}`);
    });
}

function StartNewLog() {
    const timestamp = getLongTimestamp();
    logFilePath = path.join(__dirname, "./../logs", `log_${timestamp}.txt`);

    // Create the logs directory if it doesn't exist
    if (!fs.existsSync(path.join(__dirname, "./../logs"))) {
        fs.mkdirSync(path.join(__dirname, "./../logs"));
    }

    // Initialize the new log file
    fs.writeFileSync(logFilePath, `Log started at ${timestamp}\n`, (err) => {
        if (err) Error(`Failed to start new log file: ${err}`);
    });

    console.log(`New log file created at: ${logFilePath}`);
}

function getTimestamp() {
    const d = new Date();
    return `[${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}]`;
}

function getLongTimestamp() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}-${String(d.getMinutes()).padStart(2, '0')}-${String(d.getSeconds()).padStart(2, '0')}`;
}

exports.Info = Info;
exports.Success = Success;
exports.Warning = Warning;
exports.Error = Error;
exports.StartNewLog = StartNewLog;
