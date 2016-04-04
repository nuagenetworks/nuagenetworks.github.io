---
layout: post
title: Demystifying the VSC - Part 2/3 Using VSC as an operational tool
author: Jonas Vermeulen
callout_image: nuage-community-header.jpg
tags: VSC, 7x50, SROS, Controller, OpenFlow, XMPP, BGP, Operations
excerpt: In this second post, we will further unravel the some of the operational tasks one cuold perform onthe Nuage Virtualized Services Controller as part of maintaining your virtual infrastructure.
---

Today’s post will unravel some of the operational tasks one could perform on the Nuage Virtualized Services Controller as part of maintaining your virtual infrastructure. It is a follow-up on last weeks’ post that covered some basic deployment and configuration aspects of the VSC. 
If you found that one interesting, keep reading if you like to see what low-level information the VSC can give you about the overlay network domain. As mentioned in last mail, the VSC is built on the Nokia 7750 SR OS system. As such, it is typically operated through CLI and it comes with a vast toolset of debug and show commands. In the context of the Nuage VSP solution though, these are tasks that are of particular interest I believe, and that we will cover command-by-command:

0.  Checking basic operational status of VSC
1.  Querying Nuage VSP network elements 
2.  Compiling an inventory of infrastructure elements
3.  Viewing the Routing Table for a domain
4.  Executing commands on a VRS

Note that the daily operational tasks on the VSC are actually quite limited since provisioning of logical networks is performed through the Nuage VSD and also alarms are aggregated at the VSD level. So the items above are more to get a sense on how to administrator the component at an advanced level and to get a sense for the networking toolset that the Nuage VSC provides.

# Overview of environment
This is the sample domain network model used throughout this post. VMs have been launched through OpenStack, but you will see on the output this environment also runs some other VMs launched out of ESXi.

![Domain network model][VSDScreenshot1]
 
The infrastructure topology that is hosting the VMs is controlled by a set of VSCs, with the Firewall VPort connected behind a pair of VSGs:
![Infrastructure topology][Slide1] 

All commands will be run from VSC43101 in following sections, but the same commands can be launched on any of the VSC/VSG elements:

# Task 0: Checking basic operational health of VSC

Before using VSC as an "operational tool", let us first make sure VSC has started up properly and has its protocols up and running to VSD and other VSCs. This can be checked with following commands:

    *A:VSC-43101# show vswitch-controller xmpp-server

    ===============================================================================
    XMPP Server Table
    ===============================================================================
    XMPP FQDN                       Last changed since State
     User Name
    -------------------------------------------------------------------------------
    xmpp.pod43.eu.nuagedemo.net     1d 22:01:07        Functional
     vsc-43101
    -------------------------------------------------------------------------------
    No. of XMPP server's: 1
    ===============================================================================

A "Functional" state means the XMPP protocol is up and running. Any other state implies a problem with either the VSC or VSD configuration. To check if all VSD servers of the cluster are available, you can use:

    *A:VSC-43101# show vswitch-controller vsd

    ===============================================================================
    Virtual Services Directory Table
    ===============================================================================
    User Name                       Uptime             Status
    -------------------------------------------------------------------------------
    cna@xmpp.pod43.eu.nuagedemo.ne* 1d 22:22:20        available
    cna@xmpp.pod43.eu.nuagedemo.ne* 1d 22:22:08        available
    cna@xmpp.pod43.eu.nuagedemo.ne* 1d 22:22:41        available
    -------------------------------------------------------------------------------
    No. of VSD's: 3
    ===============================================================================
    * indicates that the corresponding row element may have been truncated.

To check if all VSCs formed up a federation, you can check the status of the BGP protocol:

    *A:VSC-43101# show router bgp summary
    ===============================================================================
     BGP Router ID:10.167.43.181    AS:65000       Local AS:65000
    ===============================================================================
    BGP Admin State         : Up          BGP Oper State              : Up
    Total Peer Groups       : 5           Total Peers                 : 7
    Total BGP Paths         : 69          Total Path Memory           : 11392

    …
    <SNIP>
    …
    ===============================================================================
    BGP Summary
    ===============================================================================
    Neighbor
                       AS PktRcvd InQ  Up/Down   State|Rcv/Act/Sent (Addr Family)
                          PktSent OutQ
    -------------------------------------------------------------------------------
    10.2.43.186
                    65000   11152    0 23h01m43s Connect
                               80    0
    10.167.43.170
                    65000   42885    0 14d21h21m 0/0/0 (VpnIPv4)
                            43691    0           0/0/13 (RouteTarget)
                                                 0/0/39 (evpn)
    10.167.43.182
                    65000    5001    0 01d16h28m 0/0/0 (VpnIPv4)
                             5001    0           39/17/39 (evpn)
    17.100.43.91
                    65000    4870    0 01d16h30m 0/0/0 (VpnIPv4)
                             4943    0           2/2/39 (evpn)
    <SNIP>

The above output table relies on the built-in routing functionality of the Nokia 7750SR. Most important items to check up on are the BGP Admin and Operational state (both Up), and to check for every peer if has established a full BGP neighborship. If it does not show up as x/y/x in the last column, then the configuration on both sides should be checked. In the above example, the Neighbor `10.2.43.186` could not be reached and hence remains stuck in `Connect` state.


# Task 1: Querying Nuage VSP network elements 
Once you have verified VSC is up and running, you can use VSC to query all run-time information of elements that the VSC manages. All such information can be retrieved by issuing a `show vswitch-controller` command.
A first demonstration is querying for Nuage VSD Enterprises and Domains:

    *A:VSC-43101# show vswitch-controller enterprise

    ===============================================================================
    Enterprise Table
    ===============================================================================
    Enterprise Name                                   # of L3Domains # of L2Domains
    -------------------------------------------------------------------------------
    VSC-OPS                                           1              0
    Openstack_Org                                     1              0
    vSphere-Integration                               1              0
    -------------------------------------------------------------------------------
    Total No. of Enterprises: 3
    ===============================================================================

As a reminder, only enterprises that have Virtual Machines/Hosts/Bridges managed by this VSC are shown.
Enterprise "VSC-OPS" has one L3Domain. Let’s find out:

    *A:VSC-43101# show vswitch-controller enterprise "VSC-OPS" domain
    <domain-name>
     "AppInstance"
    detail

    *A:VSC-43101# show vswitch-controller enterprise "VSC-OPS" domain

    ===============================================================================
    Domain Table
    ===============================================================================
    Domain Name                                                      Svc. ID
    -------------------------------------------------------------------------------
    AppInstance                                                      20079
    -------------------------------------------------------------------------------
    Total No. of Domains: 1
    ===============================================================================
    *A:VSC-43101# show vswitch-controller enterprise "VSC-OPS" domain detail

    ===============================================================================
    Domain Table
    ===============================================================================
    Domain name       : AppInstance
    Enterprise name   : VSC-OPS
    No. of vports     : 4                   VNID               : 122950
    # of subnets      : 2                   Tunnel Type        : VXLAN
    DHCP Behavior     : consume
    DHCP Relay Server : n/a
    Max. ECMP Nhops   : 1
    GRT Leak Enabled  : False               Is Leakable Svc    : False

    -------------------------------------------------------------------------------

As shown in the previous command output, adding detail will give me all properties of the domain. This is similar information as what can be configured in the VSD Architect or what can be provisioned through API. 
By Pressing <kbd>Tab</kbd>, VSC will auto-complete the command. Playing around with this key, it appears I can further subnet information from within the domain.

    *A:VSC-43101# show vswitch-controller enterprise "VSC-OPS" domain "AppInstance" subnet "FE-Subnet1"

    ===============================================================================
    Subnet Table
    ===============================================================================
    Subnet Name                                                      Svc. ID
    -------------------------------------------------------------------------------
    FE-Subnet1                                                       20081
    -------------------------------------------------------------------------------
    Total No. of Subnets: 1
    ===============================================================================

# Task 2: Compiling an inventory of infrastructure elements
The Nuage VSC is a powerful tool that can be used as single point of operating a group of VRS, and analyzing forwarding behavior. At first we can look at how to compile an inventory. This is by the way another advantage over a native OpenStack environment where you have to iterate over each OVS/Linux Bridge.

To display the VRS’es managed by a VSC (one VRS per hypervisor) – we use again the show vswitch-controller command:

    *A:VSC-43101# show vswitch-controller vswitches

    ===============================================================================
    VSwitch Table
    ===============================================================================
    vswitch-instance               Personality Uptime        Num VM/hostIf/BridgeIf
    -------------------------------------------------------------------------------
    va-10.167.43.135/1             VRS         1d 01:21:16   1/0/0
    va-10.167.43.149/1             VRS         1d 02:28:51   0/0/0
    va-10.167.43.151/1             VRS         1d 01:23:40   1/0/0
    va-10.167.43.160/1             VRS         1d 01:21:21   0/0/0
    va-10.167.43.193/1             VRS         0d 21:11:50   7/0/0
    va-10.167.43.194/1             VRS         0d 21:11:49   1/0/0
    -------------------------------------------------------------------------------
    No. of virtual switches: 6
    ===============================================================================

Note the number of VMs, Host Interfaces and BridgeInterfaces are displayed on the right-most column.

VPorts can be of type VM, Host or Bridge. For each one you could take an inventory of the endpoints themselves, or drill down on the the VPort properties.

As an example, to display the virtual machines managed by this VSC (you can filter the results as explained in the following section):

    *A:VSC-43101# show vswitch-controller virtual-machines

    ===============================================================================
    Virtual Machine Table
    ===============================================================================
    vswitch-instance        VM Name          UUID
    -------------------------------------------------------------------------------
    va-10.167.43.135/1      a0dd9be0-7997-4* a0dd9be0-7997-48b7-b272-f12b9f4acf29
    va-10.167.43.151/1      PROD-WEB01       422c9578-5e95-68ca-7270-6e11e8b7384b
    va-10.167.43.193/1      instance-000000* 03cb3300-b34b-4666-ac41-8e72b5c6395d
    va-10.167.43.193/1      instance-000000* 3adcadde-1858-484c-877e-9eb44a63dc7e
    va-10.167.43.193/1      instance-000000* 8b571ded-4a20-4c8b-93f2-409a5c888413
    va-10.167.43.193/1      instance-000000* 94407324-6d7c-4520-87a8-826226706220
    va-10.167.43.193/1      instance-000000* 967e3bb3-7b53-41ff-896f-f9e007d28032
    va-10.167.43.193/1      instance-000000* dc2d224b-15b9-4158-855f-69ff59a4cac8
    va-10.167.43.193/1      instance-000000* ee840ea1-b4c1-45e8-8fb7-cf12b428f3cd
    va-10.167.43.194/1      PROD-DB01        422cbb07-1424-868c-ed6a-b01a8e7e2317
    -------------------------------------------------------------------------------
    No. of virtual machines: 10
    ===============================================================================

To display VM-type VPorts in this VSC:

    *A:VSC-43101# show vswitch-controller vports type vm

    ===============================================================================
    Virtual Port Table
    ===============================================================================
    VP Name                    VM Name                    VPRN    EVPN    Multicast
      VP IP Address              MacAddress                               Channel
                                                                          Map
    -------------------------------------------------------------------------------
    va-10.167.43.135/1/6       a0dd9be0-7997-48b7-b272-f* 20074   20077   Disabled
      10.10.20.100/24            fa:16:3e:c1:d5:f6
    va-10.167.43.151/1/1       PROD-WEB01                 20002   20004   Disabled
      10.10.10.10/24             00:50:56:ac:bf:3a
    va-10.167.43.193/1/16      instance-00000002          20074   20076   Disabled
      10.10.10.2/24              fa:16:3e:1b:1a:bc
    va-10.167.43.193/1/18      instance-00000004          20079   20081   Disabled
      10.119.121.2/24            fa:16:3e:fa:69:9a
    va-10.167.43.193/1/21      instance-00000007          20079   20082   Disabled
      10.121.30.3/24             fa:16:3e:3d:34:e4
    va-10.167.43.193/1/19      instance-00000005          20079   20081   Disabled
      10.119.121.3/24            fa:16:3e:0f:d4:34
    va-10.167.43.193/1/17      instance-00000003          20074   20078   Disabled
      192.168.1.2/24             fa:16:3e:09:d7:bb
    va-10.167.43.193/1/15      instance-00000001          20074   20076   Disabled
      10.10.10.3/24              fa:16:3e:e2:9e:77
    va-10.167.43.193/1/20      instance-00000006          20079   20082   Disabled
      10.121.30.2/24             fa:16:3e:a2:5b:53
    va-10.167.43.194/1/1       PROD-DB01                  20002   20005   Disabled
      10.10.20.10/24             00:50:56:ac:c1:0d
    -------------------------------------------------------------------------------
    No. of virtual ports: 10
    ===============================================================================
    * indicates that the corresponding row element may have been truncated.

The `VM name` and their associated MAC and IP addresses are also displayed. The hypervisor hosting them is also displayed within the `VP name`.

To filter the output, you can add qualifiers at the end (suggestions are given on the fly using <kbd>Tab</kbd> Key)

    *A:VSC-43101# show vswitch-controller vports type vm enterprise "VSC-OPS" domain "AppInstance" subnet "FE-Subnet1"

    ===============================================================================
    Virtual Port Table
    ===============================================================================
    VP Name                    VM Name                    VPRN    EVPN    Multicast
      VP IP Address              MacAddress                               Channel
                                                                          Map
    -------------------------------------------------------------------------------
    va-10.167.43.193/1/18      instance-00000004          20079   20081   Disabled
      10.119.121.2/24            fa:16:3e:fa:69:9a
    va-10.167.43.193/1/19      instance-00000005          20079   20081   Disabled
      10.119.121.3/24            fa:16:3e:0f:d4:34
    -------------------------------------------------------------------------------
    No. of virtual ports: 2
    ===============================================================================

Note that in all of the above outputs, you can only see the VPorts managed by this VSC. 

# Task 3: Viewing the Routing Table for a domain

MP BGP EVPN routes are interchanged between VSCs, VSGs and DC-GWs for each VPort. From the `show vswitch-controller` command tree, one can access the IP route table that will be applied for a domain, while still being able to filter on the network model names:

    *A:VSC-43101# show vswitch-controller ip-routes enterprise "VSC-OPS" domain "AppInstance"

    ===============================================================================
    VPRN Routes
    ===============================================================================

    -------------------------------------------------------------------------------
    Legend:
    Flag : P -> Primary, S -> Secondary, V -> Virtual Next Hop on NAT, I -> IPSEC
    -------------------------------------------------------------------------------
    Flag Prefix/                       NextHop                       Owner
         Prefix Length
    -------------------------------------------------------------------------------
    ---  0.0.0.0/0                                                   NVC_STATIC
    ---  10.119.121.0/24               10.167.43.193                 NVC_LOCAL
    ---  10.119.121.2/32               va-10.167.43.193/1/18         NVC
    ---  10.119.121.3/32               va-10.167.43.193/1/19         NVC
    ---  10.119.121.102/32             17.100.43.92                  BGP_VPN
    ---  10.121.30.0/24                10.167.43.193                 NVC_LOCAL
    ---  10.121.30.2/32                va-10.167.43.193/1/20         NVC
    ---  10.121.30.3/32                va-10.167.43.193/1/21         NVC
    -------------------------------------------------------------------------------
    No. of IP routes: 8
    -------------------------------------------------------------------------------
    ===============================================================================

You can also take a look at the mac-routes for one particular subnet:

    *A:VSC-43101# show vswitch-controller mac-routes enterprise "VSC-OPS" domain "AppInstance" subnet "BE-Subnet1"

    ===============================================================================
    EVPN Routes
    ===============================================================================
    MAC                     NextHop                           Owner
    -------------------------------------------------------------------------------
    fa:16:3e:3d:34:e4       va-10.167.43.193/1/21             NvcStaticEvpn
    fa:16:3e:a2:5b:53       va-10.167.43.193/1/20             NvcStaticEvpn
    -------------------------------------------------------------------------------
    No. of MAC routes: 2
    ===============================================================================

Based on those routes an ARP table can be created so VRS can locally ARP-proxy the VMs’ ARP_requests:

    *A:VSC-43101# show vswitch-controller arp-routes enterprise "VSC-OPS" domain "AppInstance" subnet "BE-Subnet1"

    ===============================================================================
    ARP Routes
    ===============================================================================
    SvcId               IP-Address          MAC                 Owner
    -------------------------------------------------------------------------------
    20082               10.121.30.2         fa:16:3e:a2:5b:53   NVC_STATIC
    20082               10.121.30.3         fa:16:3e:3d:34:e4   NVC_STATIC
    -------------------------------------------------------------------------------
    No. of ARP routes: 2
    ===============================================================================

Since VSC is based on Nokia's 7750SR, similar information can be retrieved through the `show router <vprn-id>` or `show service <SvcId>` commands.
The VPRN-ID is reported on quite some places, but the easiest is to take it from the output of `show vswitch-controller enterprise ENTERPRISE_NAME domain`  (see task 1)

    *A:VSC-43101# show router 20079 route-table

    ===============================================================================
    Route Table (Service: 20079)
    ===============================================================================
    Dest Prefix[Flags]                            Type    Proto    Age         Pref
          Next Hop[Interface Name]                                   Metric
    -------------------------------------------------------------------------------
    0.0.0.0/0                                     Remote  Static   00h01m35s   5
           17.100.43.92                                                 0
    10.119.121.0/24                               Local   NVC      00h11m13s   0
           10.167.43.193(to-evpn20081)                                  0
    10.119.121.2/32                               Local   NVC      00h11m13s   6
           10.167.43.193                                                0
    10.119.121.3/32                               Local   NVC      00h11m13s   6
           10.167.43.193                                                0
    10.119.121.102/32                             Remote  BGP VPN  00h10m55s   170
           17.100.43.92(to-backhaul-evpn20080)                          0
    10.121.30.0/24                                Local   NVC      00h11m13s   0
           10.167.43.193(to-evpn20082)                                  0
    10.121.30.2/32                                Local   NVC      00h11m13s   6
           10.167.43.193                                                0
    10.121.30.3/32                                Local   NVC      00h11m13s   6
           10.167.43.193                                                0
    -------------------------------------------------------------------------------
    No. of Routes: 8
    Flags: L = LFA nexthop available    B = BGP backup route available
           n = Number of times nexthop is repeated    * = Virtual Nexthop
    ===============================================================================

# Task 4: Executing commands on a VRS

Since VSC controls the policy on a large set of VRSs, one can query the VRS directly from VSC itself. 

This can be done by sending a specific shell command down the VRS, capturing the output, and displaying it on the controller. Examples are the `ip` commands, `ping` or other network related tools.

A useful command is to check the version that is deployed on VRS. This can be done through:

    *A:VSC-43101#  tools vswitch 10.167.43.193 command "ovs-appctl version"
    ovs-vswitchd (Open vSwitch) 3.2.6-232-nuage
    Compiled Jan 28 2016 19:16:34

The same tool “ovs-appctl”  can also be used to query Nuage Policy information as it is downloaded by each VRS. As an example, you could list out the VM’s scheduled in this compute-node:

    *A:VSC-43101# tools vswitch 10.167.43.193 command "ovs-appctl vm/show"
    Name: instance-00000003 UUID: 967e3bb3-7b53-41ff-896f-f9e007d28032
            State: running  Reason: booted   event_id: 0x9
            event_ts: 0x56bc9522
            no_of_nics: 1   flags: 0x0      xml_length: 318

    Name: instance-00000002 UUID: 03cb3300-b34b-4666-ac41-8e72b5c6395d
            State: running  Reason: booted   event_id: 0x6
            event_ts: 0x56bc94fc
            no_of_nics: 1   flags: 0x0      xml_length: 318

    Name: instance-00000005 UUID: 94407324-6d7c-4520-87a8-826226706220
            State: running  Reason: booted   event_id: 0xf
            event_ts: 0x56c1bc4e
            no_of_nics: 1   flags: 0x0      xml_length: 318

    Name: instance-00000004 UUID: 3adcadde-1858-484c-877e-9eb44a63dc7e
            State: running  Reason: booted   event_id: 0xc
            event_ts: 0x56c1bc4b
            no_of_nics: 1   flags: 0x0      xml_length: 318

    Name: instance-00000007 UUID: 8b571ded-4a20-4c8b-93f2-409a5c888413
            State: running  Reason: booted   event_id: 0x15
            event_ts: 0x56c1bc53
            no_of_nics: 1   flags: 0x0      xml_length: 318

    Name: instance-00000006 UUID: ee840ea1-b4c1-45e8-8fb7-cf12b428f3cd
            State: running  Reason: booted   event_id: 0x12
            event_ts: 0x56c1bc50
            no_of_nics: 1   flags: 0x0      xml_length: 318

    Name: instance-00000001 UUID: dc2d224b-15b9-4158-855f-69ff59a4cac8
            State: running  Reason: booted   event_id: 0x5
            event_ts: 0x56bc94fc
            no_of_nics: 1   flags: 0x0      xml_length: 318


And you can show a specific VM’s port, and associated MAC and IP address based on the UUID found before:

    *A:VSC-43101# tools vswitch 10.167.43.193 command "ovs-appctl vm/port-show dc2d224b-15b9-4158-855f-69ff59a4cac8"
    Name: instance-00000001 UUID: dc2d224b-15b9-4158-855f-69ff59a4cac8
            port-UUID: 969069ac-81ff-4e32-b3a1-842afde44186 Name: tap54123d79-61    MAC: fa:16:3e:e2:9e:77
            Bridge: alubr0  port: 5 flags: 0x0      stats-interval: 60
            vrf_id: 20074   evpn_id: 20076  flow_flags: 0x21664004  flood_gen_id: 0x5
            IP: 10.10.10.3  subnet: 255.255.255.0   GW: 10.10.10.1
            rate: 4294967295 kbit/s burst:4294967295 kB     class:0 mac_count: 1
            BUM rate: 4294967295 kbit/s     BUM peak: 4294967295 kbit/s     BUM burst: 4294967295 kB
            FIP rate: 4294967295 kbit/s     FIP peak: 4294967295 kbit/s     FIP burst: 4294967295 kB
            Trusted: false  Rewrite: false
            RX packets:249 errors:0 dropped:0 rl_dropped:0
            TX packets:327 errors:0 dropped:0
            RX bytes:31198      TX bytes:31317
            policy group tags: 0x400000c 0x300000b 0x100000b 0x2000001
            route_id: 0x2e

Or you could show the routing table corresponding to the domain/VRF you are investigating:

    *A:VSC-43101# tools vswitch 10.167.43.193 command "ovs-appctl vrf/list alubr0"
    vrfs: 20079 20074
    *A:VSC-43101# tools vswitch 10.167.43.193 command "ovs-appctl vrf/route-table 20079"
    -----------------+----------+--------+------------+------------+-------------------------------
              Routes | Duration | Cookie |  Pkt Count |  Pkt Bytes |  EVPN-Id or Local/remote Out port
    -----------------+----------+--------+------------+------------+-------------------------------
         10.121.30.3 |   15129s |    0x6 |          0 |          0 | 20082
        10.119.121.2 |   15137s |    0x6 |          0 |          0 | 20081
         10.121.30.2 |   15132s |    0x6 |          0 |          0 | 20082
      10.119.121.102 |   15135s |    0x6 |          0 |          0 | 20081    
        10.119.121.3 |   15134s |    0x6 |          0 |          0 | 20081
      10.121.30.0/24 |     593s |    0x6 |          0 |          0 | 20082
     10.119.121.0/24 |     593s |    0x6 |          0 |          0 | 20081
           0.0.0.0/0 |   15137s |    0x6 |          0 |          0 | 
    -----------------+----------+--------+------------+------------+-------------------------------



# Conclusion
So, by reaching this point, I hope you have a slightly better insight in the operational capabilities of the VSC. If you have further questions, or if you have another task you’d like to perform out of VSC, please let me know!
The last post will cover how you can simplify the deployment of a VSC significantly – Again, no theory, but a nice set of instructions building on your Linux / Tools skills. I hope you are as curious as I am ;-) 

[VSDScreenshot1]:  {{ site.baseurl}}/img/posts/demystifying-vsc-part2/VSC-OPS-Topology.PNG
[Slide1]: {{ site.baseurl}}/img/posts/demystifying-vsc-part2/VSC-OPS-Infrastructure.PNG

