# Changelog

## Version 1.0.0 (2024-10-31)
- **Initial Release**:
  - Launched the node with core functionality, supporting essential operations and configurations.

## Version 1.0.1 (2024-11-12)
- **Improvements**:
  - Improved UI components.
- **Fixes**:
  - Fixed an issue with dropdown lists to ensure correct autocompletion when changing credentials.

## Version 1.0.2 (2024-11-19)
- **Fixes**
  - Fixed an issue in the Sign-in and Resend autoresponder nodes.
- **Improvements**
  - Updated the structure of the returned data across nodes to ensure consistency and better compatibility with downstream integrations.

## Version 1.0.3 (2024-12-10)
- **Improvements**
  - Added support for subscriptions with either email or phone number, ensuring better user flexibility.
  - Resolved an issue with updating subscribers to ensure seamless functionality.

## Version 1.0.4 (2024-12-18)
- **Feature**
  - Introduced the Field get node, enabling seamless access to custom field data for enhanced workflow capabilities.

## Version 1.0.5 (2025-01-24)
- **Changes**
  - Removed the Autoresponder node.

## Version 1.0.6 (2025-03-21)
- **New Features**
	- Added "KlickTipp Trigger" node. 
- **Changes**
	- Updated the wording in nodes: names, descriptions, parameters, placeholders, error handling.
	- Removed Sing-in, Sign-off and Sign-out nodes.

## Version 1.0.7 (2025-04-17)
- **New Features**
	- Added optional ID input instead of drop-downs.
  - Added search contact ID by email button.
- **Improvements**
  - Added sorting by label for options in drop-down.
  - Added help banner for "Add or Update Contact" node.
  - Added functionality of displaying error messages from KlickTipp API.

## Version 1.0.8 (2025-07-11)
- **New Features**
	- Added ability to update/delete/get contact by email.
- **Improvements**
  - Changed trigger description.

## Version 1.0.9 (2025-07-11)
- **New Features**
	- Added ability to filter data fields.
- **Improvements**
	- Made a selective addition of data fields.
  - Changed node names and descriptions.

## Version 1.0.10 (2025-07-23)
- **Security**
	- Updated axios to the latest version to address a vulnerability in form-data that used an unsafe random function for boundary generation.

## Version 1.0.11 (2025-08-05)
- **Improvements**
	- Made email as a default value for select in update/delete/get contact nodes.

## Version 1.0.12 (2025-09-08)
- **Improvements**
	- Improved the error handling logic for "Add or Update Contact" node.

## Version 1.0.13 (2025-09-10)
- **New Features**
	- Added the ability to create tags in the "Add or Update Contact" and "Tag contact" nodes.

## Version 1.0.14 (2025-10-16)
- **Bugfix**
	- Improved the error handling logic.

## Version 1.0.15 (2025-11-07)
- **Improvements**
	- Enrichment of requests.

## Version 1.0.16 (2025-11-10)
- **Documentation**
  - Fix README typos and formatting.

## Version 1.0.17 (2025-12-04)
- **Improvements**
  - Updated description for "Delete tag" node.

## Version 1.0.18 (2026-01-05)
- **New Features**
  - Added filtering options for "List Contacts" and "Search Tagged Contacts" nodes.

## Version 1.0.19 (2026-01-12)
- **Improvements**
	- Improved the error handling logic.
- **New Features**
	- Added connection test.