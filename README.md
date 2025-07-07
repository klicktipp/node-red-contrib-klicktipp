# @klicktipp/node-red-contrib-klicktipp

## KlickTipp API Integration Nodes for Node-RED

What is the KlickTipp Marketing Suite?

<a href="https://www.klicktipp.com/de?source=nodered" title="E-Mail-Marketing" target="_blank" rel="noopener noreferrer">KlickTipp Marketing Suite</a> is a digital marketing platform that empowers creators and small businesses to generate leads and turn them into passionate customers. It boosts growth with GDPR-compliant tools for email and SMS marketing, marketing automation, landing pages, and conversion rate optimization.

This package provides a set of nodes for interacting with the KlickTipp API, allowing you to manage contacts, tags, subscription processes, and more directly from Node-RED.
For more detailed information on the KlickTipp API, including available functions for managing contacts, tags, fields, and more, please refer to the <a href="https://www.klicktipp.com/de/support/wissensdatenbank/application-programming-interface-api?source=nodered" target="_blank" rel="noopener" title="E-Mail-Marketing API">official KlickTipp API client documentation</a>.

---

## Table of Contents

- [Installation](#installation)
- [Nodes Overview](#nodes-overview)
  - [KlickTipp config](#klicktipp-config)
  - [Contact](#contact)
  - [Contact Tagging](#contact-tagging)
  - [Data Field](#data-field)
  - [Opt-In Process](#opt-in-process)
  - [Tag](#tag)
  - [Triggers](#triggers)
- [Credentials](#credentials)
- [Error Handling](#error-handling)
- [License](#license)
- [Example Flows](#example-flows)

---

## Installation

To install the package, run the following command in your Node-RED directory:

```bash
npm install @klicktipp/node-red-contrib-klicktipp
```

## Nodes Overview

This package includes various nodes to interact with the KlickTipp API. Below is an overview of the available nodes and their functions:

### KlickTipp Config

- **Node Name:** `klicktipp-config`
- **Description:** This is a configuration node used to store your KlickTipp API credentials (username and password). You will use this node to authenticate other KlickTipp nodes.

### Contact

- **Node Names:**:
  - `Add or update contact`
  - `Delete contact`
  - `Get contact`
  - `Search contact id`
  - `List contacts`
  - `Search tagged contacts`
  - `Unsubscribe contact`
  - `Update contact`
- **Description**: Provides management capabilities for contacts, such as searching, updating, and deleting contact data.

### Contact Tagging

- **Node Names:**:
  - `Tag contact`
  - `Untag contact`
- **Description**: Provides management capabilities for contacts tagging.

### Data Field

- **Node Names:**:
  - `Get data field`
  - `List data fields`
- **Description**: Manages data fields, including retrieving all available data fields for contacts, and obtaining data field information.

### Opt-in Process

- **Node Names:**:
  - `Get opt-in process`
  - `Search redirect url`
  - `list opt in process`
- **Description**: Manages opt-in processes, including listing all processes, retrieving details of a specific process, and obtaining redirect URLs.

### Tag

- **Node Names:**:
  - `Create tag`
  - `Delete tag`
  - `Get tag`
  - `List tags`
  - `Update tag`
- **Description**: Manages tags within KlickTipp, enabling operations to list, create, update, and delete tags.

### Triggers

- **Node Name:**: `Watch new events`
- **Description**: Triggers on a new event.

---

## Credentials

To use the KlickTipp nodes, you need to configure your API credentials using the `klicktipp-config` node. The required credentials are:

- **Username**
- **Password**

Once configured, all requests made using other KlickTipp nodes will authenticate using this configuration.

---

## Error Handling

Each node in this package uses built-in error handling to capture issues with API requests. On failure, the following information will be provided in the message:

- `msg.error`: A description of the error that occurred.
- `msg.payload`: An object containing `success: false` if the request failed.

Nodes will continue to send output regardless of success or failure, allowing you to handle the error downstream.

---

## License

This package is licensed under the MIT License. See the `LICENSE` file for more details.

---

## Example Flows

For detailed examples, please refer to the `examples/node-red-contrib-klicktipp.json` file.
