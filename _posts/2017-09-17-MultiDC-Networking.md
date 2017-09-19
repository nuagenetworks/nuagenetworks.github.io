---
layout: post
title: Stretching networks between datacenters
author: Burkhard Germer
callout_image: nuage-community-header.jpg
tags: nuage vsd vsc bgp federation dcgw 7750 sros
excerpt: With Nuage Networks you can create very flexible network designs that span multiple datacenters. This blog explains what design choices you have to interconnect datacenters while still providing a single layer-2 network context to end-users.
---


# Introduction

Quite often, it is desirable to deploy applications across datacenters. Those applications might be ok with a routed connectivity model, but there are also situations where a layer-2 connection model is desired. As an example:
- clustered applications might require a shared virtual IP
- Mobility of VMs is desired across DCs. Preservation of IP address and network context is required here. In the case of VMware estate, this is implemented through VMotion within a (Metro-)cluster, or even across clusters.
- Disaster-recovery situations where it is undesirable to restore the VM with a different IP

The examples above equally apply to virtual machines and to bare metals.

This blog explains a few ways how to interconnect various Data Centers, and also elaborates on how to interwork with 3rd Party Gateways (or generally Gateways which are not controlled by Nuage VSD, as it could also be a Nokia DC Gateway Router (Nokia Service Router).
The assumption is that each DC is built in a leaf-spine topology based on Nuage Networks VSG or 210WBX, with eBGP sessions running between leaf/spine.

A follow-up blog will then cover more specifically on how to dynamically configure a stretched service on Nokia SROS.


# DC Interconnection via VXLAN
To enable a stretched layer-2 context, the "fabric" of "underlay network" can be simply extended across 2 or more DCs. The most optimal way how to achieve connectivity between DCs may differ on size of DCs as well as fiber availability, and shall be described in further part of chapter. We distinguish basically between two cases, closely located DCs and remote DCs.

## Closely located DC
The most common example of this use case are _Twin DCs_. Twin DCs are defined as two datacenters that have been built close to each other, with the idea of providing geo-resilience while exposing them as 1 logical entity to the application owners.  The most cost effective way to interconnect such closely-located (large) Data Centers is to interconnect the Spine Layer via available fiber or DWDM transport. In that case the IP underlay is simply extended between two or more sites. An example is given in the following picture, in which the underlay network is designed using eBGP.

![DC underlay interconnect on Spine level][TwinDCUnderlay]

Note: the AS numbers given in the above pictures are pure examples.

eBGP sessions which are already used between Spine and Leaf layer in each DC are used as well between Spine layer between DCs.
eBGP is used to advertise the following information:
* System loopbacks
* Multichassis VTEP
* External networks connected to the fabric underlay

From an overlay perspective, the EVPN domain is simply extended across both DCs.

![DC interconnect overlay networking][TwinDCOverlay]

## Extension to Remote or Small DCs
For remote Data Centers the option of dedicated fiber connectivity or DWDM channel may not exist or is too costly. Therefore we would recommend to interconnect such remote DC by the use of a so-called "infrastructure" VPN on a IP-VPN backbone, which will provide the separated underlay transport over a potential global network. A schematic picture is shown below.

![Infrastructure VPN for remote DCs][RemoteDCUnderlay]
Note: picture above only shows connection into the 3rd DC, simply for better visibility. Likewise it would be for Duebendorf. As all connections are IP, routing happen on shortest path.

In this case the IP-fabric of the DCs get connected across the backbone in a dedicated transport IP VPN. Connectivity from the DC towards the backbone can either be realized by the use of the Border-Leaf switch as shown in the example in the main DC or directly from the Spine switch as shown in the remote DC.
In both cases some ports of Border-Leaf/Spine will be connected towards the CE router as pure IP/router ports (no VTEPs), thus extending the underlay IP connectivity. Whether to connect from border-leaf or from spine depends on the expected north-south traffic and horizontal scale-out desired. So some capacity planning is required here.

## Deployment of Nuage VSD in distributed DC environment

When it comes to distributed DC environments, one could
* Deploy a VSD cluster in each DC. This is typically done for very large or geographically dispersed DCs where each VSD Cluster programs its local VSCs and/or fabric elements.
* Deploy a single VSD cluster, with each DC just hosting a set of VSCs. IP reachability from the VSD servers to all DCs is assumed to program the VSCs and/or fabric elemenets. A standby VSD cluster could be deployed to get a geo-resilient management plane.
* Span a VSD cluster across multiple physical sites. This requires closely located datacenters (&ltsp; 10ms) so transcactions can be committed in a timely fashion.

In all three cases, a stretched overlay network is established through a BGP federation between VSCs and/or route-reflectors.

# Service handoff to a DC Gateway Router

This section shall explain the possibilities when non-Nokia routers are used as Enterprise Backbone Router, or if Nokia Routers are used, but not controlled via Nuage VSD. It is specifically targeted for Service handoff to the router to allow customer access to the DC services. Interconnection to Gateway router for extending the fabric has been discussed in previous chapter.

## Breakout from Nuage fabric to 3rd party Gateway Router

We assume that the Gateway Router will not be able to handle VXLAN-encapsulated traffic. As such we need a VTEP to terminate/initiate VXLAN tunnels, and that can be controlled by Nuage VSD. The natural instance is the Border Leaf Switch which can provide a plain Ethernet/VLAN/IP interface towards the Gateway Router per datacenter service.

![Service interworking to Gateway Router][DCGWInterworking]

From the border leaf switches there will be Virtual Tunnel Endpoints (VTEPs) towards the two routers connecting the DC. Multiple physical or logical (VLAN) interfaces may be used to hand over different VPNs in the DC towards the backbone. Those VPNs could be L3 or L2 VPNs.

### L3 Service breakout

For each Layer-3 Service the VTEP(s) on the Border-Leafs would need to have a kind of Inter-AS option A interworking towards the router. This means for each service a logical interface needs to be configured on both sides. Also routing has to be setup between the two entities: either via a BGP PE-CE configuration or via static-routing.

If the same L3 VPN is connected to the routers in multiple DCs, optimal routing from the outside back into the DC can be achieved by advertizing host routes from the gateway routers into the backbone. This is not always possible or desirable as the total number of endpoints could be rather high. As such, subnet-based advertizement could be considered. Suppression of host-routes could be configured dynamically out of Nuage VSD or manually on the gateway routers. The implication is obviously that inter-DC routing would happen in the overlay (VXLAN) domain, using the interconnectivity as described in previous section.

### L2 Service breakout

For each Layer-2 Service the VTEPs on the border leaf will provide a VLAN towards the Gateway Routers. No special communication protocol to advertise MAC-addresses is needed. MAC learning will be based on flood & learn just like in any Layer-2 network.

To ensure all links are used between border leafs and gateway routers, two Border-Leaf switches can be paired in an Multi-Chassis setup running a link-aggregated-group (LAG) combining links of both switches. LACP then can be configured as control plane protocol. Alternative mechanisms protocols could be considered, depending on support of the 3rd party gateway (eg BGP Multi-homing or EVPN multi-homing). Most important is to prevent loops.

If the Gateway does not support forwarding across multiple systems and/or across multiple links, only a single border leaf might be forwarding in the worst case across a multi-DC environment.

## Using Nokia Service Router as Datacenter Gateway

Using the Nokia Service Router as DC Gateway allows for the direct termination of VXLAN on the router, and to run BGP/EVPN to the Nuage VSC.
It has as advantage:
* Single interface provisioning between border leaf and DCGW to carry the VXLAN and BGP traffic
* Single BGP session to configure, to control and to monitor, instead of running a session per service
* Sub-optimatal traffic patterns due to loop prevention or unknown prefix location can quite easily be solved. At both L2 and L3 level, each Nokia 7750SR can act as independent forwarder. This stems from the fact that the information of the exact "position" of each endpoint (the Leaf switch or hypervisor) is known to the DCGW. It could then advertise host-routes or MAC-addresses into the backbone. Assuming proper routing policies, there would always be optimal routing into the backbone.
Furthermore, Nokia has implemented mechanisms so that all DC Gateways - even when geographically dispersed, can actively forward packets back into the DC in both L2 and L3 cases. This is very different from a traditional STP or L2/L3 mechanism where only a single device is active forwarder.

### Managing the Nokia Service Router out of VSD

When using Nokia 7750SR as datacenter gateway, provisioning can be further simplified by putting the SR under the management authority of the VSD. 
 
The complete service context for any new L2VPN or L3VPN in the DC can be automatically configured on the Nokia Service Router, including all interfaces which are needed from the Gateway to the outside world. This can happen as soon as a L2 or L3 domain is created in the VSD.

# Other DC Interconnection mechanisms

While EVPN/VXLAN is probably the easiest method to create a DC interconnection, some cloud providers prefer to model each DC independently, and even allow overlapping IP address space. In those environments, a BGP federation cannot be established across sites, and each VXLAN needs effective termination at the datacenter gateway. Within the backbone/core, MPLS or even plain routing in multiple VRFs can be used.

There are a number of techniques and best practices to follow in this model, but this is outside the scope of this blog.

# What's next ?

This blog has covered how you can setup networks that stretch multiple datacenters using the Nuage VSP solution. It primarily focused on using VXLAN as interconnection protocol, and how you can connect each DC to the outside world with a Nokia Service Router or with a third party datacenter gateway.

In the next blog, we will demonstrate what configuration is required on a Nokia Service Router to have it interact with Nuage VSC. It will also cover how you can use _dynamic service provisioning_ to automate such extension, tackling this both from a Nuage VSD UI perspective and by using Ansible playbooks.


[TwinDCUnderlay]: {{ site.baseurl}}/img/posts/MultiDCNetworking/TwinDCUnderlay.png
[TwinDCOverlay]: {{ site.baseurl}}/img/posts/MultiDCNetworking/TwinDCOverlay.png
[RemoteDCUnderlay]: {{ site.baseurl}}/img/posts/MultiDCNetworking/RemoteDCUnderlay.png
[DCGWInterworking]: {{ site.baseurl}}/img/posts/MultiDCNetworking/DCGWInterworking.png
