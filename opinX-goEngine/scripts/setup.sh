#!/bin/bash

# Install dependencies
go mod tidy

# Build the application
go build -o goEngine ./cmd/main.go

echo "Setup complete. You can run ./goEngine to start the application."
