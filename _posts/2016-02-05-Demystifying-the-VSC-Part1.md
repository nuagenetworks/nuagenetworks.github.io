---
layout: post
title: Demystifying the VSC - Part 1/3: The "Basics"
author: Jonas Vermeulen
callout_image: nuage-community-header.jpg
tags: VSC, 7x50, SROS, Controller, OpenFlow, XMPP, BGP
excerpt: The Nuage Networks Virtualized Services Controller (VSC) is a vital part of the Nuage solution that takes care of programming the data plane and advertizes the network loacation of each workload. This is a first post elaborating on the basics of the configuration and network connectivity.

---
# Introduction

This is a series of three posts about the core of the Nuage Networks system: the controller. While most or us don't touch this component during day-to-day operations, it is the vital part of the solution that takes care of programming the data plane and signaling out where every workload is residing.

This first post will be dealing with some of the basics of the configuration and network connectivity. The other posts will focus more on getting operational information out of VSC and giving you a tool to auto-deploy this component (you may already guess how).
 
So first things first – the basics. The VSC is built on the Nokia 7750 SR OS system and comes as a virtual appliance, packaged either in OVA (vCenter) or QCOW2 (KVM) formats. In terms of deployment practice, we always recommended to place different VSCs on different hypervisors, even in different racks, in order to reduce the possibility to affect the both VSCs simultaneously in a hypervisor problem or complete rack failure.

# Configuration parts
The configuration consists of a BOF (Boot-Options-File) part and a main configuration part. This split is inherited from its parent routing operating system, whereby the BOF is used to specify the basic out-of-band management information: eg the out-of-band mgmt. ip address, where to retrieve its code from, or where to read its config from. The config part itself is used to program the router functionality itself – in this case as a Virtual Services Controller.

# Network connectivity
The network diagram below shows a typical deployment for a VSC running on top of a Linux Hypervisor. It has a separate management (BOF) interface that is linked to the Linux bridge where also the hypervisor management IP is configured on. A secondary interface (control) is configured to carry all the Control Plane Protocols. Also a system IP could be configured. This system IP is then used as the default identifier of the VSC in routing protocols, or as an identifier in SNMP or other operational protocols.
 
![Network connectivity of VSC-VM in a Linux Hypervisor using separate IP interfaces][Slide1]

In some environments, it is not always possible to connect into multiple VLANs or subnets for the management and control network. In that case, one might just use the Control interface for all protocols. The IP address for the VSC Management Interface (inside the BOF part) is then left blank (note this is only possible for Nuage VSC 3.2r4+)

![Network connectivity of VSC-VM in a Linux Hypervisor using only the control interface][Slide2]
 
 
# Base Configuration
In its most basic configuration, the VSC contains following sections:

* System configuration (`/configure system`)
  * System-name
  * NTP
* Router (/configure router)
  * Control inferface addresses  -- this is the IP address used to initiate / terminate OpenFlow and OVSDB sessions
  * Optionally a system loopback IP interface for use by network protocols
  * Autonomous system, used by the routing protocols
  * Static route to reach other control or management plane subnets
  * BGP to establish a federation with other VSCs
* vSwitch Controller (`/configure vswitch-controller`)
  * OpenFlow
  * XMPP to VSD
As you can see from the above, there is no section dedicated for tenant-specific configuration. Such configuration is dynamically provisioned over the XMPP channel from VSD.

Two sections I will further comment on are the BGP part and the vSwitch Controller part. 

## BGP configuration
Multi-Protocol Border Gateway Protocol (MP-BGP) is used for distribution of MAC/IP reachability information for virtual machines between VSGs and VSCs. Such information is used to program forwarding information on each VRS. 

The configuration for BGP has to be applied on the VSC/VSG/DCGW itself. For smaller deployment this is in mesh (each VSC peers with each other), for bigger deployment we recommend deploying a route-reflector (typical: >8). An example is shown below:

|---|---|
| 

![BGP Federation across 4 VSC's in 2 Sites][Slide 3]

| Configuration on 172.16.1.1

    bgp
       rapid-update
       rapid-withdrawal
       min-route-advertisement 1
       outbound-route-filtering
         extended-community
        send-orf
          exit
       exit
       group "local site"
         family evpn
         type internal
         neighbour 172.16.1.2
         exit
       exit
       group “remote site”
         family evpn
         type external
         multihop 64
         peer-as 65001
         neighbour 172.16.2.1
         exit
         neighbour 172.16.2.1
         exit
       exit
    exit
|---|---|

At the start of such a BGP configuration you typically find some timer optimizations: these timer tweaks are used to improve the regular BGP convergence (standard hold-time is 90s) using following SROS features:

* Rapid Update: Route updates may be delayed up to a minimum route advertisement interval (MRAI) to allow for an efficient packing of BGP updates. This could be reduced to 1s to ensure a VMotion or new VM location gets advertised as soon as possible to the other controllers.
* Rapid withdrawal: This is to bypass any MRAI delay on sending BGP withdrawals and globally improve convergence. Withdrawals are sent at the time when virtual machine are shut down or moved away from a hypervisor.

These timer tweaks are used to ensure any reachability update is done quick enough so thatother part of the datacenter, or other sites, get notified quickly about a vMotion, or about a VM being removed.

The lines on `outbound-route-filtering` are increasing control plane scalability: they make sure VSCs only advertise information to other VSCs that is of interest to the other party. This effectively results in only advertizing reachability information for domains of which they have virtual machines. An easy example is in a deployment consisting of PODs or sites: no reachability information is advertized for domains that reside exclusively in a particular site.
 
## vSwitch Controller configuration
To make the VSC act as the SDN controller of the Nuage Networks overlay network, a relative simple piece of configuration is required. An example is given below:

    configure vswitch-controller
      xmpp-server "vsc01:password@xmpp-vsd.clouddomain.local"
      xmpp
      exit
      open-flow
      exit
    exit


By configuring XMPP, VSC will initiate a ejabber connection to the VSD server FQDN. Such connection is required to download policy information for new virtual machines, or to receive policy updates. OpenFlow on the other hand is required to start listening to any incoming OpenFlow connection from VRS. 

# Conclusion
Et voila, after reading through this, I hope you got some more insight in the basic configuration elements of the VSC. Please feel free to comment with further questions on VSC, or with specific questions on your own configuration. 

As said in the introduction, this is only the initial post on VSC - next posts will cover how you can use VSC to read out operational information, and how to deploy the VSC in a (semi-)automatic way.



[Slide1]: {{ site.baseurl}}/img/posts/demystifying-vsc-part1/Slide1.PNG
[Slide2]: {{ site.baseurl}}/img/posts/demystifying-vsc-part1/Slide2.PNG
[Slide3]: {{ site.baseurl}}/img/posts/demystifying-vsc-part1/Slide3.PNG

