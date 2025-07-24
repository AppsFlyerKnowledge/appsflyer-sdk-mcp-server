# MCP AppsFlyer SDK Server

A robust Model Context Protocol (MCP) server for integrating, testing, and validating the [AppsFlyer Android SDK](https://dev.appsflyer.com/hc/docs/android-sdk) in Android applications. This tool provides real-time log streaming, event detection, and automated validation to ensure your AppsFlyer integration is correct and reliable.

---

## Table of Contents

- [MCP AppsFlyer SDK Server](#mcp-appsflyer-sdk-server)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
    - [1. MCP Integration](#1-mcp-integration)
    - [2. Environment Variables](#2-environment-variables)
  - [Usage](#usage)
    - [Running the Server](#running-the-server)
    - [Available Tools \& Commands](#available-tools--commands)
      - [SDK Integration Tools](#sdk-integration-tools)
      - [Log Analysis Tools](#log-analysis-tools)
      - [Testing \& Validation Tools](#testing--validation-tools)
  - [Core Components](#core-components)
    - [SDK Integration](#sdk-integration)
    - [Log Analysis \& Event Validation](#log-analysis--event-validation)
    - [Testing \& Validation](#testing--validation)
  - [Troubleshooting](#troubleshooting)
    - [Common Issues](#common-issues)
  - [Contributing](#contributing)
    - [Development Setup](#development-setup)
  - [Support \& Reference](#support--reference)
    - [Documentation](#documentation)
    - [Getting Help](#getting-help)

---

## Features

* **Easy AppsFlyer SDK integration guidance**
* **Real-time logcat streaming and filtering** for AppsFlyer logs
* **Automated detection** of key events: conversion, launch, in-app, and deep links
* **Structured log output** for analysis and debugging
* **SDK validation**: test your integration and event logging
* **Error detection**: scan for common AppsFlyer SDK errors
* **Lightweight, modular, and scriptable**

---

## Prerequisites

* **Node.js** (v16+ recommended)
* **TypeScript** (`npx tsc` for build)
* **Android SDK** with `adb` installed and accessible
* At least one Android device (emulator or physical) connected via ADB
* [Model Context Protocol (MCP)](https://github.com/modelcontextprotocol) compatible IDE (e.g., Copilot, Cursor)

---

## Installation

1. **Clone the repository:**

   ```sh
   git clone <repo-url> && cd mcp-AppsFlyer-sdk
   ```
2. **Install dependencies:**

   ```sh
   npm install
   ```
3. **Build the project:**

   ```sh
   npx tsc
   ```

---

## Configuration

### 1. MCP Integration

Add the following to your `mcp.json` (in your IDE, e.g., Copilot/Cursor):

```json
{
  "AppsFlyer-mcp": {
    "command": "node",
    "args": ["ABSOLUTE/PATH/mcp-AppsFlyer-sdk/dist/server.js"],
    "cwd": ".",
    "env": {
      "DEV_KEY": "YOUR-DEV-KEY"
    }
  }
}
```

Replace `ABSOLUTE/PATH` with the absolute path to your project directory.

### 2. Environment Variables

* **DEV\_KEY**: Your AppsFlyer Dev Key (required for SDK validation)

  * Set in your environment or in your IDE's MCP configuration.

---

## Usage

### Running the Server

The server is designed to be launched by your MCP-compatible IDE. Once configured, it will start automatically when you invoke AppsFlyer-related commands or tools.

### Available Tools & Commands

The server exposes the following tools organized by functionality:

#### SDK Integration Tools

| Tool Name                 | Description                                                                                                                                                    |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `integrateAppsFlyerSdk`   | Step-by-step instructions and code for integrating the AppsFlyer SDK into your Android app. Prompts the user to choose whether to include a response listener. |
| `createAppsFlyerLogEvent` | Generates code instructions for logging an in-app event with AppsFlyer                                                                                         |

#### Log Analysis Tools

| Tool Name            | Description                                             |
| -------------------- | ------------------------------------------------------- |
| `fetchAppsflyerLogs` | Fetches recent logcat logs related to AppsFlyer         |
| `getConversionLogs`  | Extracts conversion/install event logs from logcat      |
| `getInAppLogs`       | Returns in-app event logs captured by AppsFlyer         |
| `getLaunchLogs`      | Parses app launch/session events from logcat            |
| `getDeepLinkLogs`    | Extracts deep link-related logs from logcat             |
| `getAppsflyerErrors` | Scans logcat for common AppsFlyer errors and exceptions |

#### Testing & Validation Tools

| Tool Name          | Description                                                                           |
| ------------------ | ------------------------------------------------------------------------------------- |
| `testAppsFlyerSdk` | Validates SDK integration by querying install data using appId, devKey, and device ID |
| `testInAppEvent`   | Validates if the in-app event was successfully triggered and logged                   |

---

## Core Components

### SDK Integration

The server provides comprehensive SDK integration support:

* **Step-by-step integration guides** with code examples
* **Supports listener configuration**: During integration, the tool asks whether you want to use a response listener and adjusts the steps accordingly.
* **Event logging templates** for common AppsFlyer events
* **Best practices** for SDK initialization and configuration
* **Code generation** for custom event implementations

**Example Flow:**

```
Ask: "How do I integrate AppsFlyer SDK?"
→ Get complete integration instructions with code examples
```

### Log Analysis & Event Validation

Advanced log processing and event detection capabilities:

* **Real-time log streaming** from connected Android devices
* **Intelligent filtering** for AppsFlyer-related entries
* **Event categorization** (conversion, in-app, launch, deep links)
* **Error pattern detection** for common SDK issues
* **Structured log output** for easy analysis

**Example Flow:**

```
Ask: "Show recent AppsFlyer logs"
→ Get filtered, real-time logcat output
```

### Testing & Validation

Comprehensive testing tools for SDK validation:

* **SDK integration validation** using AppsFlyer APIs
* **Event logging verification** with real-time feedback
* **Error detection and diagnosis** from log analysis
* **Performance monitoring** for SDK operations

**Example Flow:**

```
Ask: "Test AppsFlyer SDK"
→ Validate your integration against AppsFlyer services
```

---

## Troubleshooting

### Common Issues

**No devices found:**

* Ensure your Android device is connected and `adb devices` lists it
* Check USB debugging is enabled on your device

**ADB not found:**
Make sure the Android SDK is installed and `adb` is in the expected location:

* **macOS:** `~/Library/Android/sdk/platform-tools/adb`
* **Linux:** `~/Android/Sdk/platform-tools/adb`
* **Windows:** `%USERPROFILE%\AppData\Local\Android\Sdk\platform-tools\adb.exe`

**DEV\_KEY not set:**

* Set your AppsFlyer Dev Key in your environment or IDE configuration
* Verify the key is correctly formatted and active

**Multiple devices:**

* If more than one device is connected, specify the device ID when prompted
* Use `adb devices` to list available devices

**Log output is empty:**

* Make sure your app is running and generating AppsFlyer logs
* Check that AppsFlyer SDK is properly initialized in your app
* Verify log level settings in your app's AppsFlyer configuration

---

## Contributing

Pull requests and issues are welcome! Please open an issue to discuss your proposed changes or feature requests.

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

## Support & Reference

### Documentation

* [AppsFlyer Android SDK Docs](https://dev.appsflyer.com/hc/docs/android-sdk)
* [Model Context Protocol](https://github.com/modelcontextprotocol)

### Getting Help

* Create an issue for bug reports or feature requests
* Check the troubleshooting section above
* Review AppsFlyer's official documentation

---
