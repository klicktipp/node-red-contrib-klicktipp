# @klicktipp/node-red-contrib-klicktipp

## KlickTipp API Integration Nodes for Node-RED

This package provides a set of nodes for interacting with the KlickTipp API, allowing you to manage subscribers, tags, subscription processes, and more directly from Node-RED.
For more detailed information on the KlickTipp API, including available functions for managing subscribers, tags, fields, and more, please refer to the [official KlickTipp API client documentation](https://www.klicktipp.com/de/support/wissensdatenbank/application-programming-interface-api/).

---

## Table of Contents

- [Installation](#installation)
- [Nodes Overview](#nodes-overview)
    - [KlickTipp Config](#klicktipp-config)
    - [KlickTipp Login](#klicktipp-login)
    - [KlickTipp Logout](#klicktipp-logout)
    - [Subscription Process Nodes](#subscription-process-nodes)
    - [Tag Nodes](#tag-nodes)
    - [Subscriber Nodes](#subscriber-nodes)
    - [Sign-in/Sign-off Nodes](#sign-in-and-sign-off-nodes)
    - [Subscriber custom fields](#field-index-node)
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

### Subscription Process Nodes

- **Node Names:**
  - `klicktipp subscription process index`
  - `klicktipp subscription process get`
  - `klicktipp subscription process redirect`
- **Description:** These nodes are used to manage and interact with subscription processes (also referred to as lists) in KlickTipp.
  - `index`: Fetches all available subscription processes.
  - `get`: Fetches a specific subscription process by ID.
  - `redirect`: Retrieves the redirection URL for a given subscription process and subscriber.

### Tag Nodes

- **Node Names:**
  - `klicktipp tag index`
  - `klicktipp tag get`
  - `klicktipp tag create`
  - `klicktipp tag update`
  - `klicktipp tag delete`
  - `klicktipp tag email`
  - `klicktipp untag email`
- **Description:** These nodes allow you to manage and interact with tags within KlickTipp. You can create, update, and delete tags, as well as tag or untag subscribers by their email addresses.

### Subscriber Nodes

- **Node Names:**
  - `klicktipp subscribe`
  - `klicktipp unsubscribe`
  - `klicktipp subscriber index`
  - `klicktipp subscriber get`
  - `klicktipp subscriber search`
  - `klicktipp subscriber tagged`
  - `klicktipp subscriber update`
  - `klicktipp subscriber delete`
  - `klicktipp resend autoresponder`
- **Description:** These nodes allow you to manage subscribers, including retrieving, searching, updating, deleting subscriber data, and resend autoresponder for the subscribers email address.

### Sign-in and Sign-off Nodes

- **Node Names:**
  - `klicktipp signin`
  - `klicktipp signout`
  - `klicktipp signoff`
- **Description:** These nodes allow you to sign in or sign off a subscriber using their email or SMS number and an API key. You can also untag subscribers with these nodes.

### Field Index Node
- **Node Name**: `klicktipp field index`
- **Description:**  Retrieves all available contact fields for the subscriber. This includes information like first name, last name, email, phone numbers, and other relevant contact details.
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
