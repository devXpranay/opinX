package logger

import (
    "log"
    "os"
)

// Logger is a custom logger
var Logger *log.Logger

// Init initializes the logger
func Init() {
    file, err := os.OpenFile("app.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
    if err != nil {
        log.Fatal(err)
    }

    Logger = log.New(file, "INFO: ", log.Ldate|log.Ltime|log.Lshortfile)
}

// Info logs an info message
func Info(msg string) {
    Logger.Println(msg)
}

// Error logs an error message
func Error(msg string) {
    Logger.Println("ERROR: " + msg)
}
