---
layout: page
title: Command Line Interface
callout_image: header-post.jpg
---

# Installation

1) CLI is available on Pypi. Simply install it in your environment using `pip`

    (vsd-env) $ pip install vsdcli

2) Make sure `vsd` command is available.

## Usage

Follow the CLI help menu:

    (vsd-env) $ vsd -h

Example:

    (vsd-env) $ vsd list enterprises --api https://vsd:8443 --username csproot --password csproot --enterprise csp --version 3.2


### Environment variables

To avoid passing all your VSD information everytime you are using the CLI, you can define following environments variables:

    `vsd_USERNAME user name`
    `vsd_PASSWORD user password`
    `vsd_API_URL API URL`
    `vsd_ENTERPRISE Enterprise name`

    (vsd-env) $ export VSD_PASSWORD=csproot
    (vsd-env) $ export VSD_USERNAME=csproot
    (vsd-env) $ export VSD_ENTERPRISE=csp
    (vsd-env) $ export VSD_API_VERSION=3.2
    (vsd-env) $ export VSD_API_URL=https://vsd:8443


### Examples

    (vsd-env) $ vsd list enterprises
    (vsd-env) $ vsd list enterprises -f "name == 'My Company'"
    (vsd-env) $ vsd list enterprises -x ID name   # List name and ID only
    (vsd-env) $ vsd list enterprises -x ALL       # List all fields
    (vsd-env) $ vsd list vports --in subnet a3db271b-b4ab-45a2-995e-971bf9e761bb
    (vsd-env) $ vsd show domain --id 04850601-bebb-4b9b-acac-a31b455595a4

    (vsd-env) $ vsd count vports --in subnet 67add3a4-5bd5-42a5-8231-b6710dac3546 -x name

    (vsd-env) $ vsd create zone --in domain dd960a1f-b555-4e6c-9bf5-f88832679b5e -p name='Test Zone' IPType=IPV4 numberOfHostsInSubnets=4 maintenanceMode=DISABLED
    (vsd-env) $ vsd create enterprise -p name='My Company'

    (vsd-env) $ vsd update enterprise -i 26f67b33-3601-4cdf-8ed0-fba7116d0200 -p name='Example'
    (vsd-env) $ vsd update zone -i c4e96631-cfbc-4dcd-a4c3-b2937e5eab13 -p name='Danger Zone'


    (vsd-env) $ vsd assign users --ids f30061e8-56dc-47cc-ab9e-cf0d30fe1563 e838617f-658d-41a2-af46-bc54da0055fe --to group 74fb343a-093b-4738-bd59-135dc9e1aa78
    (vsd-env) $ vsd unassign users --ids f30061e8-56dc-47cc-ab9e-cf0d30fe1563 e838617f-658d-41a2-af46-bc54da0055fe --from group 74fb343a-093b-4738-bd59-135dc9e1aa78
    (vsd-env) $ vsd reassign users --ids d7162530-6960-43bb-a400-db0dbdeea06e --to group 74fb343a-093b-4738-bd59-135dc9e1aa78
    (vsd-env) $ vsd reassign users --to group 74fb343a-093b-4738-bd59-135dc9e1aa78  # Remove all users assigned to the specified group

    (vsd-env) $ vsd objects                           # List all objects
    (vsd-env) $ vsd objects -f nsg                    # List all objects that contains word nsg
    (vsd-env) $ vsd objects -p enterprise             # List all objects that have an enterprise as parent
    (vsd-env) $ vsd objects -c domain                 # List all objects that have a domain as child
    (vsd-env) $ vsd objects -p enterprise -c domain   # List all objects that have an enterprise as parent and a domain as child

## Available commands

Here are a list of available commands:

* `list`
* `count`
* `show`
* `create`
* `update`
* `delete`
* `assign` : to add one or multiple assignations to existing ones
* `unassign`: to remove one or multiple assignations to existing ones
* `reassign`: to reset all assignation.
* `objects` will enable you to traverse VSD objects hierarchy