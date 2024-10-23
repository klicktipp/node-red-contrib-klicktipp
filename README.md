# @klicktipp/node-red-contrib-klicktipp

## KlickTipp API Integration Nodes for Node-RED

This package provides a set of nodes for interacting with the KlickTipp API, allowing you to manage subscribers, tags, subscription processes, and more directly from Node-RED.
For more detailed information on the KlickTipp API, including available functions for managing subscribers, tags, fields, and more, please refer to the [official KlickTipp API client documentation](https://www.klicktipp.com/de/support/wissensdatenbank/application-programming-interface-api/).

---

## Table of Contents

- [Installation](#installation)
- [Nodes Overview](#nodes-overview)
    - [KlickTipp config](#klicktipp-config)
    - [Opt-in process](#opt-in-process-nodes)
    - [Tag](#tag-nodes)
    - [Subscriber](#subscriber-nodes)
    - [Sign-out/Sign-off/Sign-in](#sign-out-sign-off-and-sign-in-nodes)
    - [Data fields](#field-index-node)
    - [Resend autoresponder](#resend-autoresponder-node)
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

### Opt-in process nodes

- **Node Names:**
  - `Opt-in process index`
  - `Opt-in process get`
  - `Opt-in process redirect URL`
- **Description:** These nodes are used to manage and interact with opt-in processes in KlickTipp.

### Tag nodes

- **Node Names:**
  - `Tag index`
  - `Tag get`
  - `Tag create`
  - `Tag update`
  - `Tag delete`
- **Description:** These nodes allow you to manage and interact with tags within KlickTipp. You can create, update, and delete tags.

### Subscriber nodes

- **Node Names:**
  - `Subscriber index`
  - `Subscriber search`
  - `Subscriber tagged`
  - `Subscriber get`
  - `Subscriber subscribe`
  - `Subscriber update`
  - `Subscriber tag`
  - `Subscriber untag`
  - `Subscriber unsubscribe`
  - `Subscriber delete`
- **Description:** These nodes allow you to manage subscribers, including retrieving, searching, updating, deleting subscriber data.

### Sign-out Sign-off and Sign-in nodes

- **Node Names:**
  - `Subscriber signout`
  - `Subscriber signoff`
  - `Subscriber signin`
- **Description:** These nodes allow you to sign in or sign off a subscriber using their email or SMS number and an API key. You can also untag subscribers with these nodes.

### Field index node
- **Node Name**: `Field index`
- **Description:**  Retrieves all available data fields for the subscriber.
---

### Resend autoresponder node
- **Node Name**: `Resend autoresponder`
- **Description:**  Resend an autoresponder to an email address.
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
