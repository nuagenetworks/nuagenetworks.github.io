---
layout: post
title: LBaaS with Nuage Networks and HAProxy 
author: Christophe Gerard
callout_image: nuage-community-header.jpg
tags: LBaaS Load-Balancer OpenStack HAProxy
excerpt: OpenStack has a pluggable load-balancer framework, commonly referred to as LBaaS. While different implementations are available, this post covers how Nuage Networks VSP provides such integration based on a RedHat OSP 8 (Liberty) installation with HAProxy. 
---

# Introduction
OpenStack has a pluggable load-balancer framework, commonly referred to as LBaaS. Different implementations are available from both commercial vendors (Eg. F5, RADware, Citrix, AVI), but one can also make use of the opensource HA Proxy implementation.
This post will cover how Nuage Networks VSP provides such integration based on a RedHat OSP 8 (Liberty) installation.  As usual, the HA Proxy process runs on a network node in a particular namespace. 

Similar to other compute nodes, a Nuage VRS has to be installed on this node so that the load-balancer can be tied to the rest of the network. The below diagram shows the deployment architecture: 

![LBaaS Deployment Architecture][architecture]
  
All the installation steps can be automated of course. On this [link][postconfigfile], you could find a post install script that can be loaded into your OSPd 8 installation. 

# LBaaS Architecture
The OpenStack Neutron Networking service offers two load balancer implementation frameworks:

* LBaaS v1: introduced in Juno (deprecated in Liberty)
* LBaaS v2: introduced in Kilo

For its integration, the Nuage Networks VSP has focused on the LBaaS v2 reference architecture which allows you to configure multiple listener ports on a single load balancer IP address. Its concepts are:
 
![LBaaSv2 Concepts][lbaasconcepts]

* **Load balancer**:  The load balancer occupies a neutron network port and has an IP address assigned from a subnet.
* **Listener**:  Load balancers can listen for requests on multiple ports. Each one of those ports is specified by a listener.
* **Pool**:  A pool holds a list of members that serve content through the load balancer.
* **Member**: Members are servers that serve traffic behind a load balancer. Each member is specified by the IP address and port that it uses to serve traffic.
* **Health monitor**:  Members may go offline from time to time and health monitors divert traffic away from members that are not responding properly. Health monitors are associated with pools.

# OSP Controller LBaaS installation
Assuming that the Nuage Neutron Plugin is already installed, but OSP8 is installed without the LBaaS option.
Install `python-neutron-lbaas` on controller node:

    yum install python-neutron-lbaas 

Insert service providers section at the bottom of the `/etc/neutron/neutron.conf` (don’t use `lbaas_agent.ini`)

    [service_providers]
    service_provider=LOADBALANCERV2:Haproxy:neutron_lbaas.drivers.haproxy.plugin_driver.HaproxyOnHostPluginDriver:default

Add service plugin for LBaaS API v2 under default section of the `/etc/neutron/neutron.conf`

    [DEFAULT]
    ...

    service_plugins=neutron_lbaas.services.loadbalancer.plugin.LoadBalancerPluginv2

Run the update script to add LBaaS fields in the neutron database

    neutron-db-manage --service lbaas --config-file /etc/neutron/neutron.conf --config-file /etc/neutron/plugins/nuage/nuage_plugin.ini upgrade head

Restart the neutron-server service

    systemctl restart neutron-server

 
#  OSP Network Node LBaaS installation

## Install the Nuage VRS
Following the instructions from the Nuage VSP Install Guide computes:

Uninstall any pre-existing Neutron components

    systemctl stop openstack-nova-compute
    rpm -e openstack-neutron openstack-neutron-openvswitch
    ovs-vsctl show
    ovs-vsctl del-br br-int
    ovs-vsctl del-br br-tun
    rpm -e openvswitch python-openvswitch

Update `nova.conf`

    crudini --set /etc/nova/nova.conf DEFAULT network_api_class nova.network.neutronv2.api.API
    crudini --set /etc/nova/nova.conf DEFAULT libvirt_vif_driver nova.virt.libvirt.vif.LibvirtGenericVIFDriver
    crudini --set /etc/nova/nova.conf DEFAULT security_group_api neutron
    crudini --set /etc/nova/nova.conf DEFAULT firewall_driver nova.virt.firewall.NoopFirewallDriver
    crudini --set /etc/nova/nova.conf neutron ovs_bridge alubr0

Install the Nuage VRS
 
    yum install nuage-openvswitch

Configure the VRS and restart the Nuage VRS service

    echo ACTIVE_CONTROLLER=<VSC Active controller IP> >>/etc/default/openvswitch
    echo STANDBY_CONTROLLER=<VSC Standby controller IP>  >>/etc/default/openvswitch
    systemctl restart openvswitch

## Install the LBaaS Agent

Install the neutron-lbaas-agent package

    yum install openstack-neutron-lbaas

Install the Neutron plugin component of Nuage, or more specifically the `nuage-openstack-neutron` package

    yum install nuage-openstack-neutron


If not already installed, install HAproxy  on the Network node:

    yum install haproxy

Note that when the Network Node is deployed alongside the OpenStack HA set of of controllers, the `haproxy.cfg` file is already configured, and doesn’t need to be changed. 
In case HAProxy was not installed, make sure that the `haproxy` service  is starting correctly and is not trying to listen to a port that is already in use on the system (eg port 5000 by Keystone). Look in the `/etc/haprocy/haproxy.cfg` to be sure that the port used for binding is not used already. 

Add in the default section of the neutron.conf file the following

    [DEFAULT]
    ... 

    ovs_integration_bridge = alubr0

Update the default section of the `/etc/neutron/lbaas_agent.ini` file with the following:

    [DEFAULT]
    ovs_use_veth=False
    interface_driver=nuage_neutron.lbaas.agent.nuage_interface.NuageInterfaceDriver

Finally install the `iputils` packages, and restart the `neutron-server` and lbaas  agent

    yum install iputils
    service neutron-server restart
    service neutron-lbaasv2-agent restart

 
# Using LBaaS  in OSP
LBaaS can be used in both VSD-Managed or OpenStack Managed mode of operation.

Creation of the load-balancer:

    neutron net-list
    +--------------------------------------+-----------+-----------------------------------------------------+
    | id                                   | name      | subnets                                             |
    +--------------------------------------+-----------+-----------------------------------------------------+
    | b8dcb948-7392-49b4-a286-39569b6bb4b4 | lbaas     | 57001280-a44b-49c1-b02c-02a7079774c8 10.115.54.0/24 |
    | d8fe86d2-5f90-42cb-b0bf-a14191b47223 | webserver | 3d7829a9-6624-4344-a9d8-3fde42732760 10.93.48.0/24  |
    +--------------------------------------+-----------+-----------------------------------------------------+

    neutron lbaas-loadbalancer-create --name lb 57001280-a44b-49c1-b02c-02a7079774c8
    Created a new loadbalancer:
    +---------------------+--------------------------------------+
    | Field               | Value                                |
    +---------------------+--------------------------------------+
    | admin_state_up      | True                                 |
    | description         |                                      |
    | id                  | c3d947b7-5f3b-4a16-96f1-20b989451ec2 |
    | listeners           |                                      |
    | name                | lb                                   |
    | operating_status    | OFFLINE                              |
    | provider            | haproxy                              |
    | provisioning_status | PENDING_CREATE                       |
    | tenant_id           | 5a8eb8f5010747c5898ba2b583eef2c0     |
    | vip_address         | 10.115.54.7                          |
    | vip_port_id         | 818613a6-6bde-48e2-904e-c1ab0b51c812 |
    | vip_subnet_id       | 57001280-a44b-49c1-b02c-02a7079774c8 |
    +---------------------+--------------------------------------+

You can create a listener on port 80

    neutron lbaas-listener-create --loadbalancer lb --protocol HTTP --protocol-port 80 --name listenerlb
    Created a new listener:
    +--------------------------+------------------------------------------------+
    | Field                    | Value                                          |
    +--------------------------+------------------------------------------------+
    | admin_state_up           | True                                           |
    | connection_limit         | -1                                             |
    | default_pool_id          |                                                |
    | default_tls_container_id |                                                |
    | description              |                                                |
    | id                       | 9f2c6479-c6c5-46f9-abdb-a74cccb5dbcd           |
    | loadbalancers            | {"id": "c3d947b7-5f3b-4a16-96f1-20b989451ec2"} |
    | name                     | listenerlb                                    |
    | protocol                 | HTTP                                           |
    | protocol_port            | 80                                             |
    | sni_container_ids        |                                                |
    | tenant_id                | 5a8eb8f5010747c5898ba2b583eef2c0               |
    +--------------------------+------------------------------------------------+

At this stage you should see the LB inserted in your Nuage domain

![Nuage VSD view of the Load Balancer][vsdview]

And a namespace becomes available on your network node

    [root@openstack ~(keystone_admin)]# ip netns list
    qlbaas-edfacd79-e9ec-4811-8ffe-7cfb8a8b3b03
    [root@openstack ~(keystone_admin)]# ip netns exec qlbaas-edfacd79-e9ec-4811-8ffe-7cfb8a8b3b03 ip a
    1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN 
        link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
        inet 127.0.0.1/8 scope host lo
           valid_lft forever preferred_lft forever
        inet6 ::1/128 scope host 
           valid_lft forever preferred_lft forever
    15: tapa5d45f6c-4b: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UNKNOWN 
        link/ether fa:16:3e:86:40:d6 brd ff:ff:ff:ff:ff:ff
        inet 10.115.54.7/24 brd 10.115.54.255 scope global tapa5d45f6c-4b
           valid_lft forever preferred_lft forever
        inet6 fe80::f816:3eff:fe86:40d6/64 scope link 
           valid_lft forever preferred_lft forever

But also look to the vport created

    [root@openstack ~(keystone_admin)]# ovs-appctl vm/port-show
    Name: a5d45f6c-4bb3-4e12-a77c-11f9e10af982      UUID: a5d45f6c-4bb3-4e12-a77c-11f9e10af982
            port-UUID: 11e6e800-9db3-4e29-a16d-fe4f2de64d41 Name: tapa5d45f6c-4b    MAC: fa:16:3e:86:40:d6
            Bridge: alubr0  port: 8 flags: 0x0      stats-interval: 60
            vrf_id: 20001   evpn_id: 20003  flow_flags: 0x21664004  flood_gen_id: 0x1
            IP: 10.115.54.7 subnet: 255.255.255.0   GW: 10.115.54.1
            rate: 4294967295 kbit/s burst:4294967295 kB     class:0 mac_count: 1
            BUM rate: 4294967295 kbit/s     BUM peak: 4294967295 kbit/s     BUM burst: 4294967295 kB
            FIP rate: 4294967295 kbit/s     FIP peak: 4294967295 kbit/s     FIP burst: 4294967295 kB
            Trusted: false  Rewrite: false
            RX packets:11 errors:0 dropped:5 rl_dropped:0 
            TX packets:0 errors:0 dropped:0
            RX bytes:774      TX bytes:0
            policy group tags: 0x400000c 0x300000c 0x2000001
            route_id: 0x4

Now you can create a pool to your listener

    neutron lbaas-pool-create --lb-algorithm ROUND_ROBIN --listener listenerlb --protocol HTTP --name pool1
    Created a new pool:
    +---------------------+------------------------------------------------+
    | Field               | Value                                          |
    +---------------------+------------------------------------------------+
    | admin_state_up      | True                                           |
    | description         |                                                |
    | healthmonitor_id    |                                                |
    | id                  | 88c3081d-3f19-4e16-97ed-3dbfabf34963           |
    | lb_algorithm        | ROUND_ROBIN                                    |
    | listeners           | {"id": "8e913f9e-5f06-4be9-a155-179f6a423872"} |
    | members             |                                                |
    | name                | pool1                                          |
    | protocol            | HTTP                                           |
    | session_persistence |                                                |
    | tenant_id           | 5a8eb8f5010747c5898ba2b583eef2c0               |
    +---------------------+------------------------------------------------+

List the VMs and the subnet where they are connected
 
    nova list
    +--------------------------------------+------+--------+------------+-------------+----------------------+
    | ID                                   | Name | Status | Task State | Power State | Networks             |
    +--------------------------------------+------+--------+------------+-------------+----------------------+
    | bd590fb0-fb02-4f0e-b633-a4360815d6ef | web1 | ACTIVE | -          | Running     | webserver=10.93.48.2 |
    | 590c7005-c20f-4806-b7e2-37b8ddefcb8e | web2 | ACTIVE | -          | Running     | webserver=10.93.48.3 |
    +--------------------------------------+------+--------+------------+-------------+----------------------+
      neutron net-list
    +--------------------------------------+-----------+-----------------------------------------------------+
    | id                                   | name      | subnets                                             |
    +--------------------------------------+-----------+-----------------------------------------------------+
    | b8dcb948-7392-49b4-a286-39569b6bb4b4 | lbaas     | 57001280-a44b-49c1-b02c-02a7079774c8 10.115.54.0/24 |
    | d8fe86d2-5f90-42cb-b0bf-a14191b47223 | webserver | 3d7829a9-6624-4344-a9d8-3fde42732760 10.93.48.0/24  |
    +--------------------------------------+-----------+-----------------------------------------------------+

Add  the VMs to the pool:

    neutron lbaas-member-create --subnet 3d7829a9-6624-4344-a9d8-3fde42732760 --address 10.93.48.2 --protocol-port 80 pool1
    Created a new member:
    +----------------+--------------------------------------+
    | Field          | Value                                |
    +----------------+--------------------------------------+
    | address        | 10.93.48.2                           |
    | admin_state_up | True                                 |
    | id             | 6e6141a8-9774-4f43-b5c7-2743b4e8196b |
    | protocol_port  | 80                                   |
    | subnet_id      | 3d7829a9-6624-4344-a9d8-3fde42732760 |
    | tenant_id      | 5a8eb8f5010747c5898ba2b583eef2c0     |
    | weight         | 1                                    |
    +----------------+--------------------------------------+
    neutron lbaas-member-create --subnet 3d7829a9-6624-4344-a9d8-3fde42732760 --address 10.93.48.3 --protocol-port 80 pool1

    Created a new member:

    +----------------+--------------------------------------+
    | Field          | Value                                |
    +----------------+--------------------------------------+
    | address        | 10.93.48.3                           |
    | admin_state_up | True                                 |
    | id             | a2b3f195-dff1-484c-b8fb-0e42914bd895 |
    | protocol_port  | 80                                   |
    | subnet_id      | 3d7829a9-6624-4344-a9d8-3fde42732760 |
    | tenant_id      | 5a8eb8f5010747c5898ba2b583eef2c0     |
    | weight         | 1                                    |
    +----------------+--------------------------------------+

You can now look at the HAproxy  file built for the LBaas

    [root@openstack ~(keystone_admin)]# cat /var/lib/neutron/lbaas/v2/edfacd79-e9ec-4811-8ffe-7cfb8a8b3b03/haproxy.conf 
    # Configuration for lb
    global
        daemon
        user nobody
        group haproxy
        log /dev/log local0
        log /dev/log local1 notice
        stats socket /var/lib/neutron/lbaas/v2/edfacd79-e9ec-4811-8ffe-7cfb8a8b3b03/haproxy_stats.sock mode 0666 level user

    defaults
        log global
        retries 3
        option redispatch
        timeout connect 5000
        timeout client 50000
        timeout server 50000

    frontend 8e913f9e-5f06-4be9-a155-179f6a423872
        option tcplog
        option forwardfor
        bind 10.115.54.7:80
        mode http
        default_backend 88c3081d-3f19-4e16-97ed-3dbfabf34963

    backend 88c3081d-3f19-4e16-97ed-3dbfabf34963
        mode http
        balance roundrobin
        option forwardfor
        server a2b3f195-dff1-484c-b8fb-0e42914bd895 10.93.48.3:80 weight 1
        server 6e6141a8-9774-4f43-b5c7-2743b4e8196b 10.93.48.2:80 weight 1

[postconfigfile]: {{ site.baseurl }}/_static/lbaas-post-config-script.yaml
[architecture]: {{ site.baseurl }}/img/posts/lbaas-with-haproxy/lbaas-architecture.png
[lbaasconcepts]: {{ site.baseurl }}/img/posts/lbaas-with-haproxy/lbaas-openstackconcepts.png
[vsdview]: {{ site.baseurl }}/img/posts/lbaas-with-haproxy/lbaas-nuageview.png

