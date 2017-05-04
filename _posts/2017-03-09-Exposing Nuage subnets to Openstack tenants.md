---
layout: post
title: Exposing Nuage subnets in different Openstack tenants
author: Jonas Vermeulen
callout_image: nuage-community-header.jpg
tags: openstack neutron basic domain subnets vsd-managed
excerpt:  This blog describes how to expose subnets created in Nuage Networks VSD in an Openstack tenant of choice 
---

# Introduction

Within Nuage Networks VSD you get a lot of flexibility to design your network topology - using primitives such as enterprises, domains, zones and subnets. Using VSD gives you raw access to any network feature such as multicast, domain linking, QoS, etc. It is commonly referred to as "VSD-Managed Networking"

In the context of Openstack, it is not always possible to create a direct mapping between this network topology and the tenant structure. There could be multiple reasons:

1. **Tenants should only have access to particular subnets of a Nuage Networks domain.** In Openstack, a tenant user can create subnets and attach these to a router. It is not trivial though to link such router to another tenant's router and setup reachability between them.
2. **Virtual Machines (VMs) of tenant A need to route to VMs of tenant B**. Direct routing implies VMs are part of the same Nuage Networks L3 domain. However mapping this to a router in Openstack is not possible since a router is typically managed under a single tenant.
3. **Network Administrators like to use the Nuage Networks _Zones_ as part of your network design.** This could be done to segregate projects, security zones or create ACL policies on. There is no concept of grouping subnets in Openstack.

To accomodate this, you can expose Nuage subnets explicitly to a tenant by using the `--nuagenet` argument of the `neutron subnet-create` command.

Let us demonstrate this for the following VSD topology. A couple of domains is created with each a zone referring to different projects and a management zone. The idea is to expose this to multiple tenants in openstack that are linked to each project/management.

![VSD Domain Design][VSD-DomainDesign]

# Procedure 

## Install VSPK
VSPK is the name for the Python Nuage SDK, which includes the python library and a CLI library to VSD.
It can be installed and initialited with

```
[root@os-controller ~(keystone_admin)]# pip install vspk==4.0.5
[root@os-controller ~(keystone_admin)]# cat <<EOF >vspkrc
export VSD_PASSWORD=csproot
export VSD_USERNAME=csproot
export VSD_ENTERPRISE=csp
export VSD_API_VERSION=4.0
export VSD_API_URL=https://10.0.0.2:8443
[root@os-controller ~(keystone_admin)]# source vpskrc
```

## Getting the UUIDs of the Nuage Networks subnets in a zone
The UUID for a Nuage Networks subnet can be retrieved by using the _Inspect_ button in VSD Architect, or programmatically using Python or VSD CLI.
The following command shows how to immeditaly fetch all subnet IDs using the VSD CLI and matching on name on the zone.

```
[root@os-controller ~(keystone_admin)]# vsd list zones -x ID name -f "name == 'Project1'"
[Success] 1 zones have been retrieved
+--------------------------------------+----------+
| ID                                   | name     |
|--------------------------------------+----------|
| cfcf045c-a51b-46f4-a29a-27cdc41478b3 | Project1 |
+--------------------------------------+----------+
[root@os-controller ~(keystone_admin)]# vsd list subnets -x ID name subnet address --in zone cfcf045c-a51b-46f4-a29a-27cdc41478b3
[Success] 2 subnets have been retrieved
+--------------------------------------+-----------+--------------+
| ID                                   | name      | address      |
|--------------------------------------+-----------+--------------|
| fab5e1fc-2f85-4643-8c8b-9f7789b0a50b | Proj1-SN1 | 10.101.111.0 |
| caebe98b-8cc0-4bc2-8af8-7f04180b2cbe | Proj1-SN2 | 10.64.96.0   |
+--------------------------------------+-----------+--------------+

```

## Creating the Neutron Network and subnet

To expose the Nuage subnet to the Openstack tenant, the following commands can be used

```
[root@os-controller ~(keystone_admin)]# neutron net-create Proj1-NW2
Created a new network:
+-----------------------+--------------------------------------+
| Field                 | Value                                |
+-----------------------+--------------------------------------+
| admin_state_up        | True                                 |
| id                    | c7b3c4b8-2f0d-4b9a-a3a1-82f557c9c765 |
| name                  | Proj1-NW2                            |
| port_security_enabled | True                                 |
| router:external       | False                                |
| shared                | False                                |
| status                | ACTIVE                               |
| subnets               |                                      |
| tenant_id             | 447682e829284fe586c3cc44946713c1     |
+-----------------------+--------------------------------------+

[root@os-controller ~(keystone_admin)]# neutron subnet-create Proj1-NW2 10.64.96.0/24 --name Proj1-SN2 --nuagenet caebe98b-8cc0-4bc2-8af8-7f04180b2cbe
Created a new subnet:
+-------------------+------------------------------------------------+
| Field             | Value                                          |
+-------------------+------------------------------------------------+
| allocation_pools  | {"start": "10.64.96.2", "end": "10.64.96.254"} |
| cidr              | 10.64.96.0/24                                  |
| created_at        | 2017-03-09T12:55:57                            |
| description       |                                                |
| dns_nameservers   |                                                |
| enable_dhcp       | True                                           |
| gateway_ip        | 10.64.96.1                                     |
| host_routes       |                                                |
| id                | 753c14e4-b0dc-4c38-b48c-cfa32da63469           |
| ip_version        | 4                                              |
| ipv6_address_mode |                                                |
| ipv6_ra_mode      |                                                |
| name              | Proj1-SN2                                      |
| network_id        | c7b3c4b8-2f0d-4b9a-a3a1-82f557c9c765           |
| subnetpool_id     |                                                |
| tenant_id         | 447682e829284fe586c3cc44946713c1               |
| updated_at        | 2017-03-09T12:55:57                            |
+-------------------+------------------------------------------------+
```

When using the Openstack monolythic plugin the `net-partition` is also required as part of the `neutron subnet-create` command:
```
[root@os-controller ~(keystone_admin)]# neutron subnet-create Proj1-NW2 10.64.96.0/24 --name Proj1-SN2 --nuagenet caebe98b-8cc0-4bc2-8af8-7f04180b2cbe --net-partition OpenStack_default
```

# Verifying network exposure 

We can verify networks being mapped to their respective tenants in Horizon. This shows the admin view demonstrating a mapping exactly as desired:

![Openstack view on mapped subnets][Openstack-MappedSubnets]

Launching virtual machines works as usual, with users being able to launch VMs in the subnets exposed to them. 

# Final thoughts

The above steps show how to map networks to particular tenants in a semi-manual way. This can obviously automated through the use of `vspk` and `python-neutronclient`-libraries. 

There is also a full automation available for Nuage Networks 3.0/3.2 using VSD REST calls directly called `nuage-amp` (https://github.com/nuagecommunity/nuage-amp). This is currently being rewritten using `vspk` to support ML2 plugin and Newton release. Stay tuned !


[VSD-DomainDesign]: {{ site.baseurl}}/img/posts/exposing-nuage-subnets-in-openstack-tenants/VSD-DomainDesign.PNG
[Openstack-MappedSubnets]: {{ site.baseurl}}/img/posts/exposing-nuage-subnets-in-openstack-tenants/Openstack-MappedSubnets.png
